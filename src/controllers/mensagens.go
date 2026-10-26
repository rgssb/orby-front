package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"webapp/src/config"
	"webapp/src/requisicoes"
	"webapp/src/respostas"
	"webapp/src/utils"

	"github.com/gorilla/mux"
)

// limiteDoCorpoDaMensagem cobre 1000 caracteres (até 4 bytes cada) mais o JSON
const limiteDoCorpoDaMensagem = 8 << 10

// CarregarPaginaDeMensagens mostra a página de mensagens; a lista e as conversas são carregadas pelo JavaScript
func CarregarPaginaDeMensagens(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "mensagens.html", nil)
}

// ListarConversas repassa a lista de conversas e pedidos de conversa
func ListarConversas(w http.ResponseWriter, r *http.Request) {
	repassarMensagens(w, r, http.MethodGet, "/conversas", nil)
}

// ContarMensagensNaoLidas repassa o total de mensagens e pedidos novos
func ContarMensagensNaoLidas(w http.ResponseWriter, r *http.Request) {
	repassarMensagens(w, r, http.MethodGet, "/conversas/nao-lidas", nil)
}

// BuscarMensagens repassa a conversa com uma pessoa (com ?apos=ID traz só as novas)
func BuscarMensagens(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}

	caminho := fmt.Sprintf("/conversas/%d/mensagens", usuarioID)
	if apos, erro := strconv.ParseUint(r.URL.Query().Get("apos"), 10, 64); erro == nil {
		caminho += fmt.Sprintf("?apos=%d", apos)
	}
	repassarMensagens(w, r, http.MethodGet, caminho, nil)
}

// EnviarMensagem repassa uma nova mensagem direta
func EnviarMensagem(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}

	var corpo struct {
		Texto string `json:"texto"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, limiteDoCorpoDaMensagem)
	if erro := json.NewDecoder(r.Body).Decode(&corpo); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Mensagem inválida.")
		return
	}

	dados, _ := json.Marshal(corpo)
	repassarMensagens(w, r, http.MethodPost, fmt.Sprintf("/conversas/%d/mensagens", usuarioID), bytes.NewReader(dados))
}

// AceitarConversa repassa a aceitação de um pedido de conversa
func AceitarConversa(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}
	repassarMensagens(w, r, http.MethodPost, fmt.Sprintf("/conversas/%d/aceitar", usuarioID), nil)
}

// ExcluirConversa repassa a exclusão (ou recusa) de uma conversa
func ExcluirConversa(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}
	repassarMensagens(w, r, http.MethodDelete, fmt.Sprintf("/conversas/%d", usuarioID), nil)
}

// BloquearUsuario repassa o bloqueio de um usuário
func BloquearUsuario(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}
	repassarMensagens(w, r, http.MethodPost, fmt.Sprintf("/usuarios/%d/bloquear", usuarioID), nil)
}

// DesbloquearUsuario repassa o desbloqueio de um usuário
func DesbloquearUsuario(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}
	repassarMensagens(w, r, http.MethodPost, fmt.Sprintf("/usuarios/%d/desbloquear", usuarioID), nil)
}

// ExcluirMensagem repassa a exclusão de uma mensagem enviada pelo usuário
func ExcluirMensagem(w http.ResponseWriter, r *http.Request) {
	mensagemID, ok := idDaRota(w, r, "mensagemId")
	if !ok {
		return
	}
	repassarMensagens(w, r, http.MethodDelete, fmt.Sprintf("/mensagens/%d", mensagemID), nil)
}

func idDaRota(w http.ResponseWriter, r *http.Request, nome string) (uint64, bool) {
	id, erro := strconv.ParseUint(mux.Vars(r)[nome], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Identificador inválido.")
		return 0, false
	}
	return id, true
}

func repassarMensagens(w http.ResponseWriter, r *http.Request, metodo, caminho string, corpo io.Reader) {
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, metodo, config.ApiURL+caminho, corpo)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	if response.StatusCode == http.StatusNoContent {
		respostas.JSON(w, http.StatusNoContent, nil)
		return
	}

	var dados json.RawMessage
	if erro = json.NewDecoder(response.Body).Decode(&dados); erro != nil {
		respostas.Erro(w, http.StatusBadGateway, "Resposta inválida da API.")
		return
	}
	respostas.JSON(w, response.StatusCode, dados)
}
