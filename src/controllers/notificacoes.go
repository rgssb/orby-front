package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	neturl "net/url"
	"strconv"
	"webapp/src/config"
	"webapp/src/requisicoes"
	"webapp/src/respostas"

	"github.com/gorilla/mux"
)

// BuscarNotificacoes repassa a lista de notificações do usuário logado
func BuscarNotificacoes(w http.ResponseWriter, r *http.Request) {
	parametros := neturl.Values{}
	for _, nome := range []string{"limite", "deslocamento"} {
		if valor, erro := strconv.ParseUint(r.URL.Query().Get(nome), 10, 64); erro == nil {
			parametros.Set(nome, strconv.FormatUint(valor, 10))
		}
	}

	caminho := "/notificacoes"
	if len(parametros) > 0 {
		caminho += "?" + parametros.Encode()
	}
	repassarNotificacoes(w, r, http.MethodGet, caminho)
}

// ContarNotificacoesNaoLidas repassa o total de notificações ainda não vistas
func ContarNotificacoesNaoLidas(w http.ResponseWriter, r *http.Request) {
	repassarNotificacoes(w, r, http.MethodGet, "/notificacoes/nao-lidas")
}

// MarcarNotificacoesComoLidas pede à API para marcar tudo como lido
func MarcarNotificacoesComoLidas(w http.ResponseWriter, r *http.Request) {
	repassarNotificacoes(w, r, http.MethodPost, "/notificacoes/lidas")
}

// ExcluirNotificacao pede à API para apagar uma notificação
func ExcluirNotificacao(w http.ResponseWriter, r *http.Request) {
	notificacaoID, erro := strconv.ParseUint(mux.Vars(r)["notificacaoId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Notificação inválida.")
		return
	}

	repassarNotificacoes(w, r, http.MethodDelete, fmt.Sprintf("/notificacoes/%d", notificacaoID))
}

func repassarNotificacoes(w http.ResponseWriter, r *http.Request, metodo, caminho string) {
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, metodo, config.ApiURL+caminho, nil)
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

	var corpo json.RawMessage
	if erro = json.NewDecoder(response.Body).Decode(&corpo); erro != nil {
		respostas.Erro(w, http.StatusBadGateway, "Resposta inválida da API.")
		return
	}

	respostas.JSON(w, response.StatusCode, corpo)
}

// IrParaMencao leva ao perfil do usuário citado com @nick (ou à busca, se ele não existir mais)
func IrParaMencao(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]
	busca := "/buscar-usuarios?usuario=" + neturl.QueryEscape(nick)

	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, config.ApiURL+"/usuarios/nick/"+neturl.PathEscape(nick), nil)
	if erro != nil {
		http.Redirect(w, r, busca, http.StatusSeeOther)
		return
	}
	defer response.Body.Close()

	var usuario struct {
		ID uint64 `json:"id"`
	}
	if response.StatusCode != http.StatusOK || json.NewDecoder(response.Body).Decode(&usuario) != nil || usuario.ID == 0 {
		http.Redirect(w, r, busca, http.StatusSeeOther)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/usuarios/%d", usuario.ID), http.StatusSeeOther)
}

// SugerirMencoes repassa as sugestões do autocomplete de @menção (quem o usuário segue ou o segue)
func SugerirMencoes(w http.ResponseWriter, r *http.Request) {
	repassarNotificacoes(w, r, http.MethodGet, "/usuarios/relacionados?q="+neturl.QueryEscape(r.URL.Query().Get("q")))
}
