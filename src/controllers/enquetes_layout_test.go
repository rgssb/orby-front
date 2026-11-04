package controllers

import (
	"net/http/httptest"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
	"time"
)

func TestEnqueteRenderizaVotacaoEResultados(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	prazo := time.Date(2027, 1, 2, 15, 4, 0, 0, time.UTC)
	enquete := &modelos.Enquete{Titulo: "Qual passeio?", Opcoes: []modelos.OpcaoEnquete{{ID: 1, Texto: "Sim"}, {ID: 2, Texto: "Não"}}, EncerraEm: &prazo}
	feed := DadosDoFeed{UsuarioID: 2, Publicacoes: []modelos.Publicacao{{ID: 1, AutorID: 1, Enquete: enquete}}}
	resposta := httptest.NewRecorder()
	utils.ExecutarTemplate(resposta, "home.html", feed)
	if html := resposta.Body.String(); !strings.Contains(html, `class="enquete-voto"`) || !strings.Contains(html, `value="1"`) || !strings.Contains(html, `>Votar</button>`) {
		t.Fatal("enquete aberta não oferece opções e votação")
	}
	for _, trecho := range []string{`<legend>Qual passeio?</legend>`, `id="enquete-titulo"`, `data-unidade="segundos"`, `datetime="2027-01-02T15:04:00Z"`, `02/01/2027 15:04 UTC`, `href="/publicacoes/1"`} {
		if !strings.Contains(resposta.Body.String(), trecho) {
			t.Errorf("enquete sem %q", trecho)
		}
	}
	enquete.Votou = true
	enquete.Titulo = ""
	enquete.TotalVotos = 1
	enquete.Opcoes[0].Votos, enquete.Opcoes[0].Minha = 1, true
	resposta = httptest.NewRecorder()
	utils.ExecutarTemplate(resposta, "home.html", feed)
	if html := resposta.Body.String(); strings.Contains(html, `>Votar</button>`) || !strings.Contains(html, `1 voto(s)`) || !strings.Contains(html, `(seu voto)`) {
		t.Fatal("resultado deve mostrar o voto sem permitir troca")
	}
	if !strings.Contains(resposta.Body.String(), `<legend class="sr-only">Enquete</legend>`) {
		t.Fatal("uma enquete sem título deve preservar o nome acessível")
	}
}
