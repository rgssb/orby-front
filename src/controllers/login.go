package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/modelos"
	"orby/web/src/respostas"
	"strings"
)

// RealizarLogin utiliza o email e a senha para autenticar a aplicacao
func RealizarLogin(w http.ResponseWriter, r *http.Request) {
	usuario, erro := json.Marshal(map[string]string{
		"email": r.FormValue("email"),
		"senha": r.FormValue("senha"),
	})
	if erro != nil {
		respostas.JSON(w, http.StatusBadRequest, respostas.ErroAPI{Erro: erro.Error()})
		return
	}
	url := fmt.Sprintf("%s/login", config.ApiURL)
	response, erro := http.Post(url, "application/json", bytes.NewBuffer(usuario))
	if erro != nil {
		respostas.JSON(w, http.StatusInternalServerError, respostas.ErroAPI{Erro: erro.Error()})
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	var dadosAutenticacao modelos.DadosAutenticacao
	if erro = json.NewDecoder(response.Body).Decode(&dadosAutenticacao); erro != nil {
		respostas.JSON(w, http.StatusUnprocessableEntity, respostas.ErroAPI{Erro: erro.Error()})
		return
	}

	if strings.TrimSpace(dadosAutenticacao.ID) == "" || strings.TrimSpace(dadosAutenticacao.Token) == "" {
		respostas.JSON(w, http.StatusBadGateway, respostas.ErroAPI{Erro: "A API não retornou o ID e o token de autenticação."})
		return
	}

	if erro = cookies.Salvar(w, dadosAutenticacao.ID, dadosAutenticacao.Token); erro != nil {
		respostas.JSON(w, http.StatusUnprocessableEntity, respostas.ErroAPI{Erro: erro.Error()})
		return
	}

	respostas.JSON(w, http.StatusOK, nil)
}
