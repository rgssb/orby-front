package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

func TestAtualizarDescricaoRepassaTexto(t *testing.T) {
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()
	anterior := config.ApiURL
	t.Cleanup(func() { config.ApiURL = anterior })
	var caminho string
	var corpo struct {
		Descricao string `json:"descricao"`
	}
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caminho = r.URL.Path
		if erro := json.NewDecoder(r.Body).Decode(&corpo); erro != nil {
			t.Error(erro)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer api.Close()
	config.ApiURL = api.URL
	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token")
	formulario := url.Values{"descricao": {"Um cão & uma flor"}}
	r := httptest.NewRequest(http.MethodPut, "/publicacoes/2/imagens/1/descricao", strings.NewReader(formulario.Encode()))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	r = mux.SetURLVars(r, map[string]string{"publicacaoId": "2", "posicao": "1"})
	r.AddCookie(sessao.Result().Cookies()[0])
	resposta := httptest.NewRecorder()
	AtualizarDescricaoDaImagem(resposta, r)
	if resposta.Code != http.StatusNoContent || caminho != "/publicacoes/2/imagens/1/descricao" || corpo.Descricao != "Um cão & uma flor" {
		t.Fatalf("status %d; caminho %q; descrição %q", resposta.Code, caminho, corpo.Descricao)
	}
}
