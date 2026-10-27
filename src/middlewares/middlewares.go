package middlewares

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
	"orby/web/src/cookies"
	"orby/web/src/respostas"
)

// Logger escreve as informacoes no terminal
func Logger(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("\n %s %s %s", r.Method, r.RequestURI, r.Host)
		proximaFuncao(w, r)
	}
}

// Autenticar verifica a existencia de cookies e se o token ainda não expirou
func Autenticar(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		valores, erro := cookies.Ler(r)
		if erro != nil ||
			strings.TrimSpace(valores["id"]) == "" ||
			strings.TrimSpace(valores["token"]) == "" {
			encaminharParaLogin(w, r, false)
			return
		}

		if TokenExpirado(valores["token"], time.Now()) {
			cookies.Deletar(w)
			encaminharParaLogin(w, r, true)
			return
		}

		proximaFuncao(w, r)
	}
}

// encaminharParaLogin redireciona páginas ao login e responde 401 às chamadas AJAX
func encaminharParaLogin(w http.ResponseWriter, r *http.Request, expirada bool) {
	if r.Header.Get("X-Requested-With") == "XMLHttpRequest" {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	destino := "/login"
	if expirada {
		destino += "?sessao=expirada"
	}
	http.Redirect(w, r, destino, http.StatusFound)
}

// TokenExpirado lê o campo exp do JWT (sem validar a assinatura, que é papel da API)
func TokenExpirado(token string, agora time.Time) bool {
	partes := strings.Split(token, ".")
	if len(partes) != 3 {
		return false
	}

	corpo, erro := base64.RawURLEncoding.DecodeString(strings.TrimRight(partes[1], "="))
	if erro != nil {
		return false
	}

	var claims struct {
		Exp float64 `json:"exp"`
	}
	if erro = json.Unmarshal(corpo, &claims); erro != nil || claims.Exp == 0 {
		return false
	}

	return agora.Unix() >= int64(claims.Exp)
}
