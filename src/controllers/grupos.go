package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"orby/web/src/respostas"
	"orby/web/src/utils"
	"strconv"
)

// CarregarPaginaDeGrupos mostra a página de grupos; lista e conversas são carregadas pelo JavaScript
func CarregarPaginaDeGrupos(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "grupos.html", nil)
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
