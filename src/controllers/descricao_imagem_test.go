package controllers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

func TestUploadRepassaDescricao(t *testing.T) {
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()
	anterior := config.ApiURL
	t.Cleanup(func() { config.ApiURL = anterior })
	var descricao string
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		descricao = r.Header.Get("X-Orby-Descricao")
		w.WriteHeader(http.StatusNoContent)
	}))
	defer api.Close()
	config.ApiURL = api.URL
	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token")
	r := httptest.NewRequest(http.MethodPost, "/publicacoes/2/imagens", bytes.NewBufferString("imagem"))
	r = mux.SetURLVars(r, map[string]string{"publicacaoId": "2"})
	r.AddCookie(sessao.Result().Cookies()[0])
	r.Header.Set("X-Orby-Descricao", "Um%20c%C3%A3o")
	resposta := httptest.NewRecorder()
	SalvarImagemDaPublicacao(resposta, r)
	if resposta.Code != http.StatusNoContent || descricao != "Um%20c%C3%A3o" {
		t.Fatalf("status %d; descrição recebida %q", resposta.Code, descricao)
	}
}

func TestFeedRenderizaDescricaoEAlternativaParaImagemAntiga(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	resposta := httptest.NewRecorder()
	utils.ExecutarTemplate(resposta, "home.html", DadosDoFeed{Publicacoes: []modelos.Publicacao{{
		ID: 1, Imagens: 2, DescricoesImagens: []string{"Cão & gato", ""},
	}}})
	html := resposta.Body.String()
	for _, esperado := range []string{`alt="Cão &amp; gato"`, `alt="Imagem 2 da publicação"`} {
		if !strings.Contains(html, esperado) {
			t.Errorf("feed sem %q", esperado)
		}
	}
}
