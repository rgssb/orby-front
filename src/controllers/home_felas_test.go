package controllers

import (
	"net/http/httptest"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
)

func TestHomeExplicaFelasApenasNaAbaVazia(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	for _, teste := range []struct {
		dados   DadosDoFeed
		mostrar bool
	}{
		{DadosDoFeed{Aba: "felas"}, true},
		{DadosDoFeed{Aba: "seguindo"}, false},
		{DadosDoFeed{Aba: "felas", Publicacoes: []modelos.Publicacao{{ID: 1}}}, false},
	} {
		resposta := httptest.NewRecorder()
		utils.ExecutarTemplate(resposta, "home.html", teste.dados)
		html := resposta.Body.String()
		if strings.Contains(html, "Monte sua lista privada") != teste.mostrar {
			t.Errorf("explicação de Felas incorreta para aba %s", teste.dados.Aba)
		}
		if strings.Contains(html, "Administradores podem visualizar para moderação") {
			t.Error("aviso ainda aparece no formulário")
		}
	}
}
