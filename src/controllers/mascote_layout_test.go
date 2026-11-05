package controllers

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPaginasComMascoteCarregamEasterEgg(t *testing.T) {
	paginas, erro := filepath.Glob("../../views/*.html")
	if erro != nil {
		t.Fatal(erro)
	}
	scripts, erro := os.ReadFile("../../views/templates/scripts.html")
	if erro != nil {
		t.Fatal(erro)
	}
	if !strings.Contains(string(scripts), "/assets/js/orby-egg.js") {
		t.Fatal("scripts compartilhados não carregam o easter egg")
	}
	for _, pagina := range paginas {
		conteudo, erro := os.ReadFile(pagina)
		if erro != nil {
			t.Fatal(erro)
		}
		html := string(conteudo)
		if !strings.Contains(html, "/assets/css/mascote.css") {
			continue
		}
		if !strings.Contains(html, "/assets/css/orby-egg.css") ||
			(!strings.Contains(html, "/assets/js/orby-egg.js") && !strings.Contains(html, `{{template "scripts"`)) {
			t.Errorf("%s não carrega os recursos do easter egg", pagina)
		}
	}
}
