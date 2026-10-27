package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	neturl "net/url"
	"orby/web/src/config"
	"orby/web/src/requisicoes"
	"strconv"

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
	repassar(w, r, http.MethodGet, caminho, nil)
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
	repassar(w, r, http.MethodGet, "/usuarios/relacionados?q="+neturl.QueryEscape(r.URL.Query().Get("q")), nil)
}
