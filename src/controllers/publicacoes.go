package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"webapp/src/config"
	"webapp/src/cookies"
	"webapp/src/respostas"
)

// CriarPublicacao chama a API para cadastrar uma publicacao no bd
func CriarPublicacao(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.JSON(w, http.StatusUnauthorized, respostas.ErroAPI{Erro: erro.Error()})
		return
	}

	if erro = r.ParseForm(); erro != nil {
		respostas.JSON(w, http.StatusBadRequest, respostas.ErroAPI{Erro: erro.Error()})
		return
	}

	publicacao, erro := json.Marshal(map[string]string{
		"titulo":   r.FormValue("titulo"),
		"conteudo": r.FormValue("conteudo"),
	})
	if erro != nil {
		respostas.JSON(w, http.StatusBadRequest, respostas.ErroAPI{Erro: erro.Error()})
		return
	}
	url := fmt.Sprintf("%s/publicacoes", config.ApiURL)
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodPost, url, bytes.NewBuffer(publicacao))
	if erro != nil {
		respostas.JSON(w, http.StatusInternalServerError, respostas.ErroAPI{Erro: erro.Error()})
		return
	}
	requisicao.Header.Set("Content-Type", "application/json")
	requisicao.Header.Set("Authorization", "Bearer "+dados["token"])
	response, erro := http.DefaultClient.Do(requisicao)
	if erro != nil {
		respostas.JSON(w, http.StatusInternalServerError, respostas.ErroAPI{Erro: erro.Error()})
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

//CurtirPublicacao chama a API para curtir uma publicação no bd
func CurtirPublicacao(w http.ResponseWriter, r *http.Request) {
	parametros : mux.Vars(r)
	publicacaoID, erro := strconv.ParseUint(parametros["publicacaoId"], 10, 64)
	if erro != nil {
		respostas.JSON(w, http.StatusBadRequest, respostas.ErroAPI{Erro: erro.Error()})
		return
	}

	url := fmt.Sprintf("%s/publicacoes/%d/curtir", config.ApiURL, publicacaoID)
	response, erro := requisicoes.FazerRequisicaoComAuthorization(r, http.MethodPost, url, nil)
	if erro != nil {
		
	}







}
