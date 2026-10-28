package router

import (
	"encoding/json"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestRecursosDoAppInstalavel(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	servidor := httptest.NewServer(Gerar())
	defer servidor.Close()

	worker, erro := http.Get(servidor.URL + "/service-worker.js")
	if erro != nil {
		t.Fatal(erro)
	}
	defer worker.Body.Close()
	if worker.StatusCode != http.StatusOK || !strings.Contains(worker.Header.Get("Content-Type"), "javascript") {
		t.Fatalf("service worker: status=%d tipo=%q", worker.StatusCode, worker.Header.Get("Content-Type"))
	}
	resposta, erro := http.Get(servidor.URL + "/assets/manifest.webmanifest")
	if erro != nil {
		t.Fatal(erro)
	}
	defer resposta.Body.Close()
	var manifest struct {
		StartURL string `json:"start_url"`
		Scope    string `json:"scope"`
		Icons    []struct {
			Src string `json:"src"`
		} `json:"icons"`
	}
	if erro = json.NewDecoder(resposta.Body).Decode(&manifest); erro != nil {
		t.Fatal(erro)
	}
	if manifest.StartURL != "/home" || manifest.Scope != "/" || len(manifest.Icons) != 2 {
		t.Fatalf("manifesto inválido: %+v", manifest)
	}
	for i, tamanho := range []int{192, 512} {
		icone, erro := http.Get(servidor.URL + manifest.Icons[i].Src)
		if erro != nil {
			t.Fatal(erro)
		}
		config, erro := png.DecodeConfig(icone.Body)
		icone.Body.Close()
		if erro != nil || config.Width != tamanho || config.Height != tamanho {
			t.Errorf("ícone %s: tamanho=%dx%d erro=%v", manifest.Icons[i].Src, config.Width, config.Height, erro)
		}
	}
}
