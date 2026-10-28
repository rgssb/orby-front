package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"strings"
	"testing"
)

func TestRepassarDenuncias(t *testing.T) {
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token" {
			t.Error("token não encaminhado")
		}
		switch r.URL.Path {
		case "/denuncias/consulta":
			var corpo struct {
				Alvos []struct {
					Tipo   string `json:"tipo"`
					AlvoID uint64 `json:"alvoId"`
				} `json:"alvos"`
			}
			if json.NewDecoder(r.Body).Decode(&corpo) != nil || len(corpo.Alvos) != 1 || corpo.Alvos[0].AlvoID != 42 {
				t.Error("alvos não foram encaminhados")
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`[{"tipo":"comentario","alvoId":42}]`))
		case "/denuncias":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			_, _ = w.Write([]byte(`{"erro":"Você já denunciou este conteúdo"}`))
		default:
			t.Errorf("caminho inesperado: %s", r.URL.Path)
		}
	}))
	defer api.Close()
	config.ApiURL = api.URL
	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token")
	cookie := sessao.Result().Cookies()[0]

	req := httptest.NewRequest(http.MethodPost, "/denuncias/consulta", strings.NewReader(`{"alvos":[{"tipo":"comentario","alvoId":42}]}`))
	req.AddCookie(cookie)
	resposta := httptest.NewRecorder()
	ConsultarDenuncias(resposta, req)
	if resposta.Code != http.StatusOK || !strings.Contains(resposta.Body.String(), `"alvoId":42`) {
		t.Fatalf("consulta não encaminhada: %d %s", resposta.Code, resposta.Body)
	}
	req = httptest.NewRequest(http.MethodPost, "/denuncias", strings.NewReader(`{"tipo":"perfil","alvoId":42,"motivo":"spam"}`))
	req.AddCookie(cookie)
	resposta = httptest.NewRecorder()
	Denunciar(resposta, req)
	if resposta.Code != http.StatusConflict || !strings.Contains(resposta.Body.String(), "já denunciou") {
		t.Fatalf("conflito não encaminhado: %d %s", resposta.Code, resposta.Body)
	}
}
