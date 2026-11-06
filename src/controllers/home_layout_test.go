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
		for _, texto := range []string{`<h1 id="feed-title">Publicações</h1>`, `<h2 id="compose-title">Nova publicação</h2>`, `aria-controls="nova-publicacao"`, `id="sugestoes-seguir"`, `id="sugestoes-lista"`, `aria-controls="sugestoes-lista"`, `/assets/js/home.js?v=3`, `/assets/js/tutorial.js?v=3`, `aria-controls="enquete-campos"`, `id="enquete-prazo"`, `aria-controls="felas-info-conteudo"`, `id="felas-info-conteudo" hidden`, `aria-label="Saiba mais sobre Felas"`, `id="rascunho-status"`} {
			if !strings.Contains(html, texto) {
				t.Errorf("home sem %q", texto)
			}
		}
		if strings.Contains(html, `id="tutorial-reiniciar"`) || strings.Contains(html, `Conhecer o Orby`) {
			t.Error("o botão de reiniciar o tutorial não deve aparecer no feed")
		}
		if strings.Contains(html, `Peça a opinião da sua turma`) || strings.Contains(html, `image-field-title`) ||
			!strings.Contains(html, `class="sr-only" for="titulo-publicacao">Título (opcional)</label>`) ||
			!strings.Contains(html, `placeholder="Título (opcional)"`) ||
			!strings.Contains(html, `class="sr-only" for="conteudo-publicacao">Conteúdo</label>`) ||
			!strings.Contains(html, `placeholder="Conteúdo"`) ||
			!strings.Contains(html, `id="imagem-nome">Adicionar imagens</span> <small class="text-muted" title="Até 4 MB por imagem">Até 4`) {
			t.Error("o compositor deve evitar textos repetidos sem esconder os limites")
		}
		if !strings.Contains(html, `id="audiencia-publicacao" aria-label="Publicar somente para Felas" aria-pressed="false"`) {
			t.Error("botão de Felas ausente ou não inicia desmarcado")
		}
		if !strings.Contains(html, `<p class="rascunho-status" id="rascunho-status" role="status"></p>`) ||
			strings.Contains(html, `id="audiencia-explicacao"`) {
			t.Error("o compositor não deve mostrar legendas permanentes de audiência ou rascunho")
		}
		if len(dados.Publicacoes) > 0 && (!strings.Contains(html, `id="feed-lista"`) || !strings.Contains(html, `id="carregar-mais"`)) {
			t.Error("feed ou paginação ausente")
		}
		if len(dados.Publicacoes) == 0 && !strings.Contains(html, "Ainda não há publicações") {
			t.Error("estado vazio ausente")
		}
		if !strings.Contains(html, `<a class="navbar-brand-link" href="/home">Orby</a>`) {
			t.Error("a marca deve manter o link para a página inicial separado do mascote interativo")
		}
	}
}

func TestPerfilExibeAjudaDosFelasRecolhida(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()
	resposta := httptest.NewRecorder()
	utils.ExecutarTemplate(resposta, "perfil.html", struct {
		Usuario         modelos.Usuario
		UsuarioLogadoID uint64
		Curtidas        modelos.CurtidasPerfil
		AbaCurtidas     bool
	}{Usuario: modelos.Usuario{ID: 1, Privado: true}, UsuarioLogadoID: 1})
	html := resposta.Body.String()
	for _, texto := range []string{`<details class="profile-felas">`, `<summary class="profile-felas-resumo">`, `Gerenciar minha lista privada`, `aria-label="Saiba mais sobre Felas" aria-expanded="false" aria-controls="felas-info-conteudo"`, `id="felas-info-conteudo" hidden`, `id="abrir-pedidos"`, `profile-card--own`, `aria-labelledby="modal-seguidores-titulo"`, `id="modal-seguidores-titulo"`, `aria-labelledby="modal-seguindo-titulo"`, `id="modal-seguindo-titulo"`} {
		if !strings.Contains(html, texto) {
			t.Errorf("perfil sem %q", texto)
		}
	}
	if strings.Contains(html, `Como funcionam os Felas?`) {
		t.Error("a explicação não deve aparecer como legenda no perfil")
	}
}

func TestPublicacoesFelasSaoIdentificadasNoFeedEPerfil(t *testing.T) {
	diretorio, erro := os.Getwd()
	if erro != nil {
		t.Fatal(erro)
	}
	if erro = os.Chdir("../.."); erro != nil {
		t.Fatal(erro)
	}
	t.Cleanup(func() { _ = os.Chdir(diretorio) })
	utils.CarregarTemplates()

	publicacoes := []modelos.Publicacao{
		{ID: 1, AutorID: 1, Conteudo: "Normal"},
		{ID: 2, AutorID: 1, Conteudo: "Felas do dono", Felas: true},
		{ID: 3, AutorID: 2, Conteudo: "Felas de outra pessoa", Felas: true},
	}
	paginas := []struct {
		nome  string
		dados interface{}
	}{
		{"home.html", DadosDoFeed{UsuarioID: 1, Publicacoes: publicacoes}},
		{"perfil.html", struct {
			Usuario         modelos.Usuario
			UsuarioLogadoID uint64
			Curtidas        modelos.CurtidasPerfil
			AbaCurtidas     bool
		}{Usuario: modelos.Usuario{ID: 1, Publicacoes: publicacoes[:2]}, UsuarioLogadoID: 1}},
	}
	for _, pagina := range paginas {
		t.Run(pagina.nome, func(t *testing.T) {
			resposta := httptest.NewRecorder()
			utils.ExecutarTemplate(resposta, pagina.nome, pagina.dados)
			html := resposta.Body.String()
			if !strings.Contains(html, `class="jumbotron publicacao" data-publicacao-id="1"`) ||
				!strings.Contains(html, `class="jumbotron publicacao publicacao--felas" data-publicacao-id="2"`) ||
				!strings.Contains(html, `class="publicacao-felas-selo"><i class="fa-solid fa-star" aria-hidden="true"></i> Publicação para Felas`) {
				t.Error("publicações comuns e Felas devem ter identificação distinta")
			}
			if pagina.nome == "home.html" && !strings.Contains(html, `class="jumbotron publicacao publicacao--felas" data-publicacao-id="3"`) {
				t.Error("publicações de outras pessoas para Felas também devem ser identificadas")
			}
			if strings.Count(html, `class="action-icon repostar-publicacao`) != 1 {
				t.Error("apenas a publicação comum deve permitir repost")
			}
			if pagina.nome == "perfil.html" && strings.Index(html, `data-publicacao-id="1"`) > strings.Index(html, `data-publicacao-id="2"`) {
				t.Error("publicações comuns e Felas devem manter a ordem recebida no perfil")
			}
		})
	}
}
