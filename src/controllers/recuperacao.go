package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"webapp/src/config"
	"webapp/src/respostas"
	"webapp/src/utils"
)

// CarregarPaginaEsqueciSenha exibe o formulário que pede o e-mail para recuperar a senha
func CarregarPaginaEsqueciSenha(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "esqueci-senha.html", nil)
}

// CarregarPaginaRedefinirSenha exibe o formulário de nova senha (link recebido por e-mail)
func CarregarPaginaRedefinirSenha(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "redefinir-senha.html", struct{ Token string }{Token: r.URL.Query().Get("token")})
}

// EsqueciSenha pede à API o envio do link de recuperação
func EsqueciSenha(w http.ResponseWriter, r *http.Request) {
	if erro := r.ParseForm(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Formulário inválido.")
		return
	}

	corpo, _ := json.Marshal(map[string]string{"email": strings.TrimSpace(r.FormValue("email"))})
	repassarParaAPI(w, r, "/esqueci-senha", corpo)
}

// RedefinirSenha envia o token e a nova senha para a API
func RedefinirSenha(w http.ResponseWriter, r *http.Request) {
	if erro := r.ParseForm(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Formulário inválido.")
		return
	}

	corpo, _ := json.Marshal(map[string]string{
		"token": r.FormValue("token"),
		"nova":  r.FormValue("nova"),
	})
	repassarParaAPI(w, r, "/redefinir-senha", corpo)
}

// repassarParaAPI faz um POST sem autenticação (rotas públicas) e devolve o resultado ao navegador
func repassarParaAPI(w http.ResponseWriter, r *http.Request, caminho string, corpo []byte) {
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodPost, config.ApiURL+caminho, bytes.NewReader(corpo))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, "Não foi possível concluir o pedido.")
		return
	}
	requisicao.Header.Set("Content-Type", "application/json")

	response, erro := http.DefaultClient.Do(requisicao)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Os servidores encontram-se em estado de erro, pedimos desculpas.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}
