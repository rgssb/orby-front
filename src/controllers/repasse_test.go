package controllers

import (
	"net/http"
	"net/http/httptest"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"testing"

	"github.com/gorilla/mux"
)

func TestRepassarMontaCaminhoEEnviaToken(t *testing.T) {
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()

	var metodo, caminho, autorizacao string
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		metodo, caminho, autorizacao = r.Method, r.URL.Path, r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true}`))
	}))
	defer api.Close()
	config.ApiURL = api.URL

	roteador := mux.NewRouter()
	roteador.HandleFunc("/conversas/{usuarioId}/aceitar", Repassar(http.MethodPost, "/conversas/{usuarioId}/aceitar")).Methods(http.MethodPost)

	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token-do-usuario")

	chamar := func(uri string, comSessao bool) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, uri, nil)
		if comSessao {
			r.AddCookie(sessao.Result().Cookies()[0])
		}
		resposta := httptest.NewRecorder()
		roteador.ServeHTTP(resposta, r)
		return resposta
	}

	if resposta := chamar("/conversas/7/aceitar", true); resposta.Code != http.StatusOK {
		t.Fatalf("status = %d", resposta.Code)
	}
	if metodo != http.MethodPost || caminho != "/conversas/7/aceitar" || autorizacao != "Bearer token-do-usuario" {
		t.Fatalf("API recebeu %s %s com %q", metodo, caminho, autorizacao)
	}

	caminho = ""
	if resposta := chamar("/conversas/abc/aceitar", true); resposta.Code != http.StatusBadRequest || caminho != "" {
		t.Fatalf("id inválido deveria ser barrado antes da API: status %d, caminho %q", resposta.Code, caminho)
	}
	if resposta := chamar("/conversas/7/aceitar", false); resposta.Code != http.StatusServiceUnavailable || caminho != "" {
		t.Fatalf("sem sessão a API não pode ser chamada: status %d", resposta.Code)
	}
}
