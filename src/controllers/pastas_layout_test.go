package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
)

func TestSalvosPreservaPastaNaPaginacao(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()
	anterior := config.ApiURL
	t.Cleanup(func() { config.ApiURL = anterior })
	pastaRecebida := ""
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		pastaRecebida = r.URL.Query().Get("pasta")
		itens := make([]map[string]interface{}, 11)
		for i := range itens {
			itens[i] = map[string]interface{}{"id": i + 1, "salvoPorUsuario": true}
		}
		_ = json.NewEncoder(w).Encode(itens)
	}))
	defer api.Close()
	config.ApiURL = api.URL
	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token")
	req := httptest.NewRequest(http.MethodGet, "/salvos?pasta=7", nil)
	req.AddCookie(sessao.Result().Cookies()[0])
	resposta := httptest.NewRecorder()
	CarregarPaginaDeSalvos(resposta, req)
	html := resposta.Body.String()
	for _, trecho := range []string{`data-pasta-atual="7"`, `salvar-publicacao`, `pasta=7`, `pagina=2`} {
		if !strings.Contains(html, trecho) {
			t.Errorf("página sem %q", trecho)
		}
		if strings.Contains(html, `id="criar-pasta"`) || strings.Contains(html, `organizar-pastas`) {
			t.Error("pastas devem ser criadas pelo botão de salvar")
		}
	}
	if pastaRecebida != "7" {
		t.Fatalf("pasta não encaminhada à API: %q", pastaRecebida)
	}
}
