package controllers

import (
	"net/http/httptest"
	"orby/web/src/utils"
	"os"
	"testing"

	"golang.org/x/net/html"
)

func TestPaginasDeAutenticacaoTemConteudoPrincipal(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}

	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()

	for _, pagina := range []string{"login.html", "cadastro.html"} {
		t.Run(pagina, func(t *testing.T) {
			resposta := httptest.NewRecorder()
			utils.ExecutarTemplate(resposta, pagina, nil)
			documento, erro := html.Parse(resposta.Body)
			if erro != nil {
				t.Fatal(erro)
			}
			idioma := false
			conteudo := false
			var visitar func(*html.Node, bool)
			visitar = func(no *html.Node, noPrincipal bool) {
				if no.Type == html.ElementNode {
					if no.Data == "html" {
						for _, atributo := range no.Attr {
							if atributo.Key == "lang" && atributo.Val == "pt-BR" {
								idioma = true
							}
						}

					}
					noPrincipal = noPrincipal || no.Data == "main"
					if noPrincipal && no.Data == "form" {
						conteudo = true
					}
				}
				for filho := no.FirstChild; filho != nil; filho = filho.NextSibling {
					visitar(filho, noPrincipal)
				}
			}
			visitar(documento, false)
			if !idioma || !conteudo {
				t.Error("a página deve informar o idioma e manter o formulário no conteúdo principal")
			}
		})
	}
}
