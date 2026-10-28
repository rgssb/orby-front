package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/modelos"
	"orby/web/src/utils"
	"os"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

func TestListaAdministrativaPaginacaoEBusca(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	config.HashKey = []byte("0123456789abcdef0123456789abcdef")
	config.BlockKey = []byte("0123456789abcdef")
	cookies.Configurar()

	var busca, deslocamento string
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		busca, deslocamento = r.URL.Query().Get("q"), r.URL.Query().Get("deslocamento")
		itens := make([]map[string]interface{}, 16)
		for i := range itens {
			itens[i] = map[string]interface{}{"id": i + 1, "usuarioId": i + 1, "nome": fmt.Sprintf("Nome %02d", i), "nick": "nick", "data": "2026-10-28T00:00:00Z", "total": i + 1, "suspenso": i == 1}
		}
		_ = json.NewEncoder(w).Encode(itens)
	}))
	defer api.Close()
	config.ApiURL = api.URL

	sessao := httptest.NewRecorder()
	cookies.Salvar(sessao, "1", "token")
	req := httptest.NewRequest(http.MethodGet, "/admin/lista/contas?q=nome+teste&pagina=2", nil)
	req.AddCookie(sessao.Result().Cookies()[0])
	req = mux.SetURLVars(req, map[string]string{"tipo": "contas"})
	resposta := httptest.NewRecorder()
	CarregarListaAdministrativa(resposta, req)
	html := resposta.Body.String()
	if resposta.Code != http.StatusOK || busca != "nome teste" || deslocamento != "15" {
		t.Fatalf("status=%d busca=%q deslocamento=%q", resposta.Code, busca, deslocamento)
	}
	if strings.Count(html, `class="den-item"`) != 15 || strings.Contains(html, "Nome 15") || !strings.Contains(html, "pagina=3") {
		t.Fatalf("paginação inesperada: %s", html)
	}
	mensagens, pesquisa := strings.Index(html, `data-nav="/mensagens"`), strings.Index(html, `navbar-search-item`)
	if mensagens < 0 || pesquisa < mensagens {
		t.Fatal("a busca deve aparecer depois das opções de navegação")
	}
	reqDenuncias := httptest.NewRequest(http.MethodGet, "/admin/lista/denunciadas", nil)
	reqDenuncias.AddCookie(sessao.Result().Cookies()[0])
	reqDenuncias = mux.SetURLVars(reqDenuncias, map[string]string{"tipo": "denunciadas"})
	listaDenuncias := httptest.NewRecorder()
	CarregarListaAdministrativa(listaDenuncias, reqDenuncias)
	htmlDenuncias := listaDenuncias.Body.String()
	for _, texto := range []string{"adm-denuncia-perfil", "Denúncias abertas", "1 pessoa denunciou", "2 pessoas denunciaram", "Arquivar denúncias", "Suspender conta", "Reativar conta"} {
		if !strings.Contains(htmlDenuncias, texto) {
			t.Errorf("lista de denúncias sem %q", texto)
		}
		for _, suspenso := range []bool{false, true} {
			pagina := httptest.NewRecorder()
			utils.ExecutarTemplate(pagina, "usuario.html", struct {
				Usuario                        modelos.Usuario
				UsuarioLogadoID                uint64
				Bloqueei, Bloqueado, Silenciei bool
			}{Usuario: modelos.Usuario{ID: 2, Suspenso: suspenso, PodeVerPublicacoes: true}, UsuarioLogadoID: 1})
			htmlPerfil := pagina.Body.String()
			if strings.Contains(htmlPerfil, "adm-suspender-perfil") == suspenso || strings.Contains(htmlPerfil, "adm-reativar-perfil") != suspenso {
				t.Errorf("ações de perfil incorretas para suspenso=%v", suspenso)
			}
		}
	}
	post := httptest.NewRecorder()
	utils.ExecutarTemplate(post, "publicacao-sem-permissao", modelos.Publicacao{ID: 1, AutorID: 2, AcessoModeracao: true})
	renderizado := post.Body.String()
	if !strings.Contains(renderizado, `data-moderacao="true"`) || strings.Contains(renderizado, `class="comment-form"`) || strings.Contains(renderizado, `curtir-publicacao`) {
		t.Fatalf("publicação de moderação com ações inadequadas: %s", renderizado)
	}
	if strings.Contains(renderizado, "deletar-publicacao") {
		t.Fatal("publicação de conta ativa não deve mostrar exclusão administrativa")
	}
	suspenso := httptest.NewRecorder()
	utils.ExecutarTemplate(suspenso, "publicacao-sem-permissao", modelos.Publicacao{ID: 1, AutorID: 2, AutorSuspenso: true})
	if !strings.Contains(suspenso.Body.String(), "deletar-publicacao") {
		t.Fatal("publicação de conta suspensa deveria manter a exclusão administrativa")
	}
}
