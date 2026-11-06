package controllers

import (
	"net/http/httptest"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"
)

func TestNotasNosPerfis(t *testing.T) {
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err = os.Chdir("../.."); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(dir) })
	utils.CarregarTemplates()
	for _, caso := range []struct {
		template string
		proprio  string
	}{
		{"perfil.html", "true"},
		{"usuario.html", "false"},
	} {
		rec := httptest.NewRecorder()
		utils.ExecutarTemplate(rec, caso.template, struct {
			Usuario                                     modelos.Usuario
			UsuarioLogadoID                             uint64
			Curtidas                                    modelos.CurtidasPerfil
			AbaCurtidas, Bloqueei, Bloqueado, Silenciei bool
		}{Usuario: modelos.Usuario{ID: 2, PodeVerPublicacoes: true}, UsuarioLogadoID: func() uint64 {
			if caso.proprio == "true" {
				return 2
			}
			return 1
		}()})
		html := rec.Body.String()
		for _, texto := range []string{
			`id="notas-felas" data-perfil="2" data-proprio="` + caso.proprio + `"`,
			`id="notas-configuracao" hidden`, `id="notas-form" hidden`,
			`id="notas-texto"`, `id="notas-mais"`, `id="notas-lateral"`, `id="notas-lista-esquerda"`,
			`/assets/js/notas-felas.js?v=2`,
		} {
			if !strings.Contains(html, texto) {
				t.Errorf("%s sem %s", caso.template, texto)
			}
		}
	}
}
