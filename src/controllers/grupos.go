package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/requisicoes"
	"orby/web/src/respostas"
	"strconv"
)

// IrParaGrupos leva ao lugar dos grupos: a aba Grupos das mensagens
func IrParaGrupos(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/mensagens?aba=grupos", http.StatusSeeOther)
}

// ListarCandidatosDeGrupo repassa as pessoas que podem entrar num grupo (?q= filtra)
func ListarCandidatosDeGrupo(w http.ResponseWriter, r *http.Request) {
	repassar(w, r, http.MethodGet, "/grupos/candidatos?q="+url.QueryEscape(r.URL.Query().Get("q")), nil)
}

// BuscarFotoDoGrupo repassa a foto do grupo (a URL carrega a versão em ?v=)
func BuscarFotoDoGrupo(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "grupoId")
	if !ok {
		return
	}
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, fmt.Sprintf("%s/grupos/%d/foto", config.ApiURL, id), nil)
	if erro != nil {
		http.Error(w, "indisponível", http.StatusServiceUnavailable)
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", response.Header.Get("Content-Type"))
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	io.Copy(w, response.Body)
}

// SalvarFotoDoGrupo envia a nova foto do grupo (corpo bruto da imagem)
func SalvarFotoDoGrupo(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "grupoId")
	if !ok {
		return
	}
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}
	imagem, erro := io.ReadAll(http.MaxBytesReader(w, r.Body, limiteDaFoto))
	if erro != nil {
		respostas.Erro(w, http.StatusRequestEntityTooLarge, "A foto deve ter no máximo 2 MB.")
		return
	}
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodPost, fmt.Sprintf("%s/grupos/%d/foto", config.ApiURL, id), bytes.NewReader(imagem))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, "Não foi possível enviar a foto.")
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

// repassarCorpo lê o JSON do navegador para o formato esperado (descartando campos desconhecidos) e o repassa à API
func repassarCorpo(w http.ResponseWriter, r *http.Request, destino any, metodo, caminho string) {
	r.Body = http.MaxBytesReader(w, r.Body, limiteDoCorpoDaMensagem)
	if erro := json.NewDecoder(r.Body).Decode(destino); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	dados, _ := json.Marshal(destino)
	repassar(w, r, metodo, caminho, bytes.NewReader(dados))
}

// CriarGrupo repassa a criação de um grupo
func CriarGrupo(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Nome    string   `json:"nome"`
		Membros []uint64 `json:"membros"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPost, "/grupos")
}

// BuscarGrupo repassa o grupo aberto (com ?apos=ID traz só as mensagens novas)
func BuscarGrupo(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "grupoId")
	if !ok {
		return
	}
	caminho := fmt.Sprintf("/grupos/%d", id)
	if apos, erro := strconv.ParseUint(r.URL.Query().Get("apos"), 10, 64); erro == nil {
		caminho += fmt.Sprintf("?apos=%d", apos)
	}
	repassar(w, r, http.MethodGet, caminho, nil)
}

// EnviarMensagemDeGrupo repassa uma mensagem ao grupo
func EnviarMensagemDeGrupo(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "grupoId")
	if !ok {
		return
	}
	var corpo struct {
		Texto string `json:"texto"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPost, fmt.Sprintf("/grupos/%d/mensagens", id))
}

// AdicionarAoGrupo repassa a inclusão de uma pessoa no grupo
func AdicionarAoGrupo(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "grupoId")
	if !ok {
		return
	}
	var corpo struct {
		UsuarioID uint64 `json:"usuarioId"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPost, fmt.Sprintf("/grupos/%d/membros", id))
}

// DefinirPermissaoNoGrupo repassa a permissão de adicionar pessoas
func DefinirPermissaoNoGrupo(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "grupoId")
	if !ok {
		return
	}
	alvo, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}
	var corpo struct {
		Pode bool `json:"pode"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPut, fmt.Sprintf("/grupos/%d/membros/%d/permissao", id, alvo))
}
