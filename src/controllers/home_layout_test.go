package controllers

import (
	"net/http/httptest"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
)

func TestHomeRenderizaComposerEFeed(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	for _, dados := range []DadosDoFeed{
		{},
		{Publicacoes: []modelos.Publicacao{{ID: 1, AutorID: 2}, {ID: 2, AutorID: 3}}, ProximaPagina: 2, ProximaURL: "/feed?pagina=2"},
	} {
		resposta := httptest.NewRecorder()
		utils.ExecutarTemplate(resposta, "home.html", dados)
		html := resposta.Body.String()
		for _, texto := range []string{`aria-controls="nova-publicacao"`, `id="sugestoes-seguir"`, `id="sugestoes-lista"`, `aria-controls="sugestoes-lista"`, `/assets/js/home.js?v=2`} {
			if !strings.Contains(html, texto) {
				t.Errorf("home sem %q", texto)
			}
		}
		if len(dados.Publicacoes) > 0 && (!strings.Contains(html, `id="feed-lista"`) || !strings.Contains(html, `id="carregar-mais"`)) {
			t.Error("feed ou paginação ausente")
		}
		if len(dados.Publicacoes) == 0 && !strings.Contains(html, "Ainda não há publicações") {
			t.Error("estado vazio ausente")
		}
	}
}
