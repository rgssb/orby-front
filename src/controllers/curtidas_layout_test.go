package controllers

import (
	"net/http/httptest"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
)

func TestPerfilCurtidasMostraListaOuPrivacidade(t *testing.T) {
	dir, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(dir) })
	utils.CarregarTemplates()
	for _, podeVer := range []bool{false, true} {
		dados := struct {
			Usuario                        modelos.Usuario
			UsuarioLogadoID                uint64
			Bloqueei, Bloqueado, Silenciei bool
			Curtidas                       modelos.CurtidasPerfil
			AbaCurtidas                    bool
		}{
			Usuario:         modelos.Usuario{ID: 2, Nick: "pessoa", PodeVerPublicacoes: true},
			UsuarioLogadoID: 1,
			Curtidas:        modelos.CurtidasPerfil{Total: 7, TotalVisivel: true, ListaPublica: podeVer, PodeVer: podeVer, Publicacoes: []modelos.Publicacao{{ID: 42, AutorID: 3, Conteudo: "publicação curtida"}}},
			AbaCurtidas:     true,
		}
		resposta := httptest.NewRecorder()
		utils.ExecutarTemplate(resposta, "usuario.html", dados)
		html := resposta.Body.String()
		icone := "fa-lock"
		estado := "privada"
		if podeVer {
			icone, estado = "fa-heart", "pública"
		}
		if !strings.Contains(html, `aria-label="7 curtidas recebidas"><i class="fa-solid fa-heart" aria-hidden="true"></i> 7</span>`) ||
			!strings.Contains(html, `aria-label="Publicações curtidas, lista `+estado+`"`) ||
			!strings.Contains(html, `profile-stat--curtidas" aria-label="Publicações curtidas, lista `+estado+`" title="Publicações curtidas · lista `+estado+`"><strong><i class="fa-solid `+icone+`"`) ||
			strings.Contains(html, "publicação curtida") != podeVer ||
			strings.Contains(html, "Curtidas privadas") == podeVer {
			t.Fatalf("perfil incorreto para podeVer=%v: %s", podeVer, html)
		}
	}
}

func TestMeuPerfilMostraPrivacidadeMesmoComAcessoDoDono(t *testing.T) {
	dir, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(dir) })
	utils.CarregarTemplates()
	for _, publica := range []bool{false, true} {
		dados := struct {
			Usuario         modelos.Usuario
			UsuarioLogadoID uint64
			Curtidas        modelos.CurtidasPerfil
			AbaCurtidas     bool
		}{
			Usuario:         modelos.Usuario{ID: 1},
			UsuarioLogadoID: 1,
			Curtidas:        modelos.CurtidasPerfil{Total: 4, TotalVisivel: true, PodeVer: true, ListaPublica: publica},
		}
		resposta := httptest.NewRecorder()
		utils.ExecutarTemplate(resposta, "perfil.html", dados)
		html := resposta.Body.String()
		estado := "privada"
		if publica {
			estado = "pública"
		}
		if !strings.Contains(html, `aria-label="4 curtidas recebidas"><i class="fa-solid fa-heart" aria-hidden="true"></i> 4</span>`) || !strings.Contains(html, `aria-label="Publicações curtidas, lista `+estado+`"`) {
			t.Fatalf("estado incorreto para publica=%v: %s", publica, html)
		}
	}
}
