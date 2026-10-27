package controllers

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/requisicoes"
	"orby/web/src/respostas"
)

// limiteDaImagemDeMensagem é o tamanho máximo da imagem de uma mensagem (a API também confere)
const limiteDaImagemDeMensagem = 4 << 20

// ReagirAMensagem repassa a reação com emoji a uma mensagem
func ReagirAMensagem(w http.ResponseWriter, r *http.Request) {
	mensagemID, ok := idDaRota(w, r, "mensagemId")
	if !ok {
		return
	}
	var corpo struct {
		Emoji string `json:"emoji"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
	if erro := json.NewDecoder(r.Body).Decode(&corpo); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Reação inválida.")
		return
	}
	dados, _ := json.Marshal(corpo)
	repassar(w, r, http.MethodPost, fmt.Sprintf("/mensagens/%d/reacao", mensagemID), bytes.NewReader(dados))
}

// EnviarImagemDeMensagem envia a imagem (corpo bruto) de uma mensagem para a API
func EnviarImagemDeMensagem(w http.ResponseWriter, r *http.Request) {
	mensagemID, ok := idDaRota(w, r, "mensagemId")
	if !ok {
		return
	}
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}
	imagem, erro := io.ReadAll(http.MaxBytesReader(w, r.Body, limiteDaImagemDeMensagem))
	if erro != nil {
		respostas.Erro(w, http.StatusRequestEntityTooLarge, "A imagem deve ter no máximo 4 MB.")
		return
	}

	url := fmt.Sprintf("%s/mensagens/%d/imagem", config.ApiURL, mensagemID)
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodPost, url, bytes.NewReader(imagem))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, "Não foi possível enviar a imagem.")
		return
	}
	requisicao.Header.Set("Authorization", "Bearer "+dados["token"])
	requisicao.Header.Set("Content-Type", r.Header.Get("Content-Type"))

	response, erro := http.DefaultClient.Do(requisicao)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()
	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}
	respostas.JSON(w, response.StatusCode, nil)
}

// BuscarImagemDeMensagem repassa a imagem de uma mensagem (o navegador não conhece o token)
func BuscarImagemDeMensagem(w http.ResponseWriter, r *http.Request) {
	mensagemID, ok := idDaRota(w, r, "mensagemId")
	if !ok {
		return
	}
	url := fmt.Sprintf("%s/mensagens/%d/imagem", config.ApiURL, mensagemID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		http.Error(w, "indisponível", http.StatusServiceUnavailable)
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		http.NotFound(w, r)
		return
	}
	imagem, erro := io.ReadAll(io.LimitReader(response.Body, limiteDaImagemDeMensagem+1))
	if erro != nil {
		http.Error(w, "indisponível", http.StatusBadGateway)
		return
	}

	soma := sha1.Sum(imagem)
	etag := `"` + hex.EncodeToString(soma[:8]) + `"`
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "private, no-cache")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", response.Header.Get("Content-Type"))
	w.WriteHeader(http.StatusOK)
	w.Write(imagem)
}

// Eventos repassa o fluxo de eventos em tempo real (SSE) da API até o navegador
func Eventos(w http.ResponseWriter, r *http.Request) {
	enviador, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming não suportado", http.StatusInternalServerError)
		return
	}
	dados, erro := cookies.Ler(r)
	if erro != nil {
		http.Error(w, "sessão expirada", http.StatusUnauthorized)
		return
	}
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodGet, config.ApiURL+"/eventos", nil)
	if erro != nil {
		http.Error(w, "indisponível", http.StatusInternalServerError)
		return
	}
	requisicao.Header.Set("Authorization", "Bearer "+dados["token"])

	response, erro := http.DefaultClient.Do(requisicao)
	if erro != nil || response.StatusCode != http.StatusOK {
		if response != nil {
			response.Body.Close()
		}
		http.Error(w, "indisponível", http.StatusServiceUnavailable)
		return
	}
	defer response.Body.Close()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	enviador.Flush()

	buffer := make([]byte, 2048)
	for {
		n, erro := response.Body.Read(buffer)
		if n > 0 {
			w.Write(buffer[:n])
			enviador.Flush()
		}
		if erro != nil {
			return
		}
	}
}

// DefinirPrivacidade repassa a troca entre perfil público e privado do usuário logado
func DefinirPrivacidade(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}
	var corpo struct {
		Privado bool `json:"privado"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
	if erro = json.NewDecoder(r.Body).Decode(&corpo); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	json, _ := json.Marshal(corpo)
	repassar(w, r, http.MethodPut, fmt.Sprintf("/usuarios/%s/privacidade", dados["id"]), bytes.NewReader(json))
}
