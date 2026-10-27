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

// limiteDoCorpoDaMensagem cobre 1000 caracteres (até 4 bytes cada) mais o JSON
const limiteDoCorpoDaMensagem = 8 << 10

// CarregarPaginaDeMensagens mostra a página de mensagens; a lista e as conversas são carregadas pelo JavaScript
func CarregarPaginaDeMensagens(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "mensagens.html", nil)
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
	} else if antes, erro := strconv.ParseUint(r.URL.Query().Get("antes"), 10, 64); erro == nil {
		caminho += fmt.Sprintf("?antes=%d", antes)
	}
	repassar(w, r, http.MethodGet, caminho, nil)
}

// EnviarMensagem repassa uma nova mensagem direta
func EnviarMensagem(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := idDaRota(w, r, "usuarioId")
	if !ok {
		return
	}

	var corpo struct {
		Texto     string `json:"texto"`
		RespondeA uint64 `json:"respondeA"`
		ComImagem bool   `json:"comImagem"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, limiteDoCorpoDaMensagem)
	if erro := json.NewDecoder(r.Body).Decode(&corpo); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Mensagem inválida.")
		return
	}

	dados, _ := json.Marshal(corpo)
	repassar(w, r, http.MethodPost, fmt.Sprintf("/conversas/%d/mensagens", usuarioID), bytes.NewReader(dados))
}
