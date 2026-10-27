package controllers

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/requisicoes"
	"orby/web/src/respostas"
	"strconv"

	"github.com/gorilla/mux"
)

// limiteDaImagemDePublicacao é o tamanho máximo da imagem anexada a uma publicação (a API também confere)
const limiteDaImagemDePublicacao = 4 << 20

// BuscarImagemDaPublicacao repassa a imagem guardada na API (o navegador não conhece o token)
func BuscarImagemDaPublicacao(w http.ResponseWriter, r *http.Request) {
	publicacaoID, erro := strconv.ParseUint(mux.Vars(r)["publicacaoId"], 10, 64)
	if erro != nil {
		http.NotFound(w, r)
		return
	}

	url := fmt.Sprintf("%s/publicacoes/%d/imagem", config.ApiURL, publicacaoID)
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

	imagem, erro := io.ReadAll(io.LimitReader(response.Body, limiteDaImagemDePublicacao+1))
	if erro != nil {
		http.Error(w, "indisponível", http.StatusBadGateway)
		return
	}

	// O ETag permite que o navegador reaproveite a imagem sem ficar com uma versão antiga após a troca
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

// SalvarImagemDaPublicacao envia a imagem (corpo bruto) de uma publicação para a API
func SalvarImagemDaPublicacao(w http.ResponseWriter, r *http.Request) {
	publicacaoID, erro := strconv.ParseUint(mux.Vars(r)["publicacaoId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Publicação inválida.")
		return
	}

	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	imagem, erro := io.ReadAll(http.MaxBytesReader(w, r.Body, limiteDaImagemDePublicacao))
	if erro != nil {
		respostas.Erro(w, http.StatusRequestEntityTooLarge, "A imagem deve ter no máximo 4 MB.")
		return
	}

	url := fmt.Sprintf("%s/publicacoes/%d/imagem", config.ApiURL, publicacaoID)
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

// RemoverImagemDaPublicacao pede à API para apagar a imagem de uma publicação
func RemoverImagemDaPublicacao(w http.ResponseWriter, r *http.Request) {
	publicacaoID, erro := strconv.ParseUint(mux.Vars(r)["publicacaoId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Publicação inválida.")
		return
	}

	url := fmt.Sprintf("%s/publicacoes/%d/imagem", config.ApiURL, publicacaoID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodDelete, url, nil)
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
