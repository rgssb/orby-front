package controllers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/requisicoes"
	"orby/web/src/respostas"
	"regexp"
	"strconv"

	"github.com/gorilla/mux"
)

var variavelDeRota = regexp.MustCompile(`\{(\w+)\}`)

// Repassar devolve um handler que chama a API sem corpo. Cada {variavel} do modelo vem da rota
// e precisa ser um número, então nada além de IDs chega ao caminho da API.
func Repassar(metodo, modelo string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		caminho, ok := montarCaminho(w, r, modelo)
		if !ok {
			return
		}
		repassar(w, r, metodo, caminho, nil)
	}
}

func montarCaminho(w http.ResponseWriter, r *http.Request, modelo string) (string, bool) {
	valido := true
	vars := mux.Vars(r)
	caminho := variavelDeRota.ReplaceAllStringFunc(modelo, func(trecho string) string {
		nome := variavelDeRota.FindStringSubmatch(trecho)[1]
		id, erro := strconv.ParseUint(vars[nome], 10, 64)
		if erro != nil {
			valido = false
			return ""
		}
		return strconv.FormatUint(id, 10)
	})
	if !valido {
		respostas.Erro(w, http.StatusBadRequest, "Identificador inválido.")
	}
	return caminho, valido
}

func idDaRota(w http.ResponseWriter, r *http.Request, nome string) (uint64, bool) {
	id, erro := strconv.ParseUint(mux.Vars(r)[nome], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Identificador inválido.")
		return 0, false
	}
	return id, true
}

// repassar chama a API com o token do usuário e devolve o JSON da resposta ao navegador
func repassar(w http.ResponseWriter, r *http.Request, metodo, caminho string, corpo io.Reader) {
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

// RepostarPublicacao repassa o repost com o comentário opcional
func RepostarPublicacao(w http.ResponseWriter, r *http.Request) {
	id, ok := idDaRota(w, r, "publicacaoId")
	if !ok {
		return
	}
	if erro := r.ParseForm(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Formulário inválido.")
		return
	}
	corpo, _ := json.Marshal(map[string]string{"conteudo": r.FormValue("conteudo")})
	repassar(w, r, http.MethodPost, "/publicacoes/"+strconv.FormatUint(id, 10)+"/repostar", bytes.NewReader(corpo))
}
