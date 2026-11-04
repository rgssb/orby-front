package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
)

func TestBuscaComFiltrosPreservaPaginacao(t *testing.T) {
	diretorio, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err = os.Chdir("../.."); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()
	anterior := config.ApiURL
	t.Cleanup(func() { config.ApiURL = anterior })
	var consulta url.Values
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		consulta = r.URL.Query()
		itens := make([]map[string]interface{}, 11)
		for i := range itens {
			itens[i] = map[string]interface{}{"id": i + 1}
		}
		_ = json.NewEncoder(w).Encode(itens)
	}))
	defer api.Close()
	config.ApiURL = api.URL
	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token")
	req := httptest.NewRequest(http.MethodGet, "/buscar-publicacoes?q=%23go&autor=%40ana&inicio=2024-01-02&fim=2024-01-03", nil)
	req.AddCookie(sessao.Result().Cookies()[0])
	resposta := httptest.NewRecorder()
	CarregarPaginaDeBuscaDePublicacoes(resposta, req)
	if consulta.Get("q") != "#go" || consulta.Get("autor") != "ana" || consulta.Get("inicio") != "2024-01-02" || consulta.Get("fim") != "2024-01-03" {
		t.Fatalf("filtros não encaminhados: %v", consulta)
	}
	html := resposta.Body.String()
	for _, trecho := range []string{`id="carregar-mais"`, "pagina=2", "autor=ana", "inicio=2024-01-02", "fim=2024-01-03", "q=%23go"} {
		if !strings.Contains(html, trecho) {
			t.Errorf("resultado sem %q", trecho)
		}
	}
	consulta = nil
	req = httptest.NewRequest(http.MethodGet, "/buscar-publicacoes?inicio=2024-03-04&fim=2024-03-03", nil)
	resposta = httptest.NewRecorder()
	CarregarPaginaDeBuscaDePublicacoes(resposta, req)
	if consulta != nil || !strings.Contains(resposta.Body.String(), "A data inicial deve ser anterior") {
		t.Fatal("intervalo inválido deveria ser rejeitado antes da consulta")
	}
}
