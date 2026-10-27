package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	neturl "net/url"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/modelos"
	"orby/web/src/requisicoes"
	"orby/web/src/utils"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gorilla/mux"
)

// sessaoExpirada limpa o cookie e volta ao login quando a API recusa o token.
func sessaoExpirada(w http.ResponseWriter, r *http.Request, response *http.Response) bool {
	if response.StatusCode != http.StatusUnauthorized {
		return false
	}

	cookies.Deletar(w)
	http.Redirect(w, r, "/login?sessao=expirada", http.StatusSeeOther)
	return true
}

// paginaDeErroDaAPI traduz um status de erro da API em uma página de erro amigável
func paginaDeErroDaAPI(w http.ResponseWriter, response *http.Response) {
	switch response.StatusCode {
	case http.StatusNotFound:
		utils.PaginaDeErro(w, http.StatusNotFound, "Não encontramos isso", "O conteúdo que você procura não existe mais ou foi removido.")
	case http.StatusForbidden:
		utils.PaginaDeErro(w, http.StatusForbidden, "Acesso negado", "Você não tem permissão para acessar este conteúdo.")
	case http.StatusBadRequest:
		utils.PaginaDeErro(w, http.StatusBadRequest, "Pedido inválido", "Não foi possível entender o que você tentou abrir.")
	default:
		utils.ServidorIndisponivel(w)
	}
}

// CarregarTelaDeLogin vai renderizar a tela de login
func CarregarTelaDeLogin(w http.ResponseWriter, r *http.Request) {
	cookie, _ := cookies.Ler(r)
	if cookie["token"] != "" {
		http.Redirect(w, r, "/home", 302)
		return
	}

	utils.ExecutarTemplate(w, "login.html", nil)
}

// CarregarPaginaDeCadastroDeUsuario vai renderizar a pagina de cadastro de usuário
func CarregarPaginaDeCadastroDeUsuario(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "cadastro.html", nil)
}

// CarregarTermosDeUso e CarregarPoliticaDePrivacidade exibem os documentos legais (públicos)
func CarregarTermosDeUso(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "termos.html", nil)
}

func CarregarPoliticaDePrivacidade(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "privacidade.html", nil)
}

// CarregarPaginaHome exibe a pagina inicial.
func CarregarPaginaHome(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "home.html", nil)
}

// tamanhoDaPaginaDoFeed é a quantidade de publicações carregadas por vez no feed
const tamanhoDaPaginaDoFeed = 10

// DadosDoFeed são os dados usados para desenhar o feed (página inicial e "carregar mais")
type DadosDoFeed struct {
	Publicacoes   []modelos.Publicacao
	UsuarioID     uint64
	ProximaPagina int
	ProximaURL    string
	Busca         string
	Aviso         string
	Aba           string
	Ordem         string
}

// buscarFeed pede à API uma página do feed. A API é consultada com uma publicação a mais
// para descobrir se existe uma próxima página.
func buscarFeed(w http.ResponseWriter, r *http.Request, pagina int) (DadosDoFeed, bool) {
	aba, ordem := "seguindo", "recentes"
	if r.URL.Query().Get("aba") == "todos" {
		aba = "todos"
	}
	if r.URL.Query().Get("ordem") == "populares" {
		ordem = "populares"
	}
	feed, ok := buscarPublicacoes(w, r, pagina, fmt.Sprintf("/publicacoes?aba=%s&ordem=%s&", aba, ordem), func(proxima int) string {
		return fmt.Sprintf("/feed?pagina=%d&aba=%s&ordem=%s", proxima, aba, ordem)
	})
	feed.Aba, feed.Ordem = aba, ordem
	return feed, ok
}

// CarregarPaginaDeSalvos mostra as publicações salvas; com pagina >= 2 devolve só os itens
func CarregarPaginaDeSalvos(w http.ResponseWriter, r *http.Request) {
	pagina, _ := strconv.Atoi(r.URL.Query().Get("pagina"))
	if pagina < 1 {
		pagina = 1
	}
	feed, ok := buscarPublicacoes(w, r, pagina, "/publicacoes/salvas?", func(proxima int) string {
		return fmt.Sprintf("/salvos?pagina=%d", proxima)
	})
	if !ok {
		return
	}
	if pagina > 1 {
		utils.ExecutarTemplate(w, "feed-itens", feed)
		return
	}
	utils.ExecutarTemplate(w, "salvos.html", feed)
}

// buscarPublicacoes consulta a API (rota e filtros em caminho, que já termina com "?" ou "&") e monta a página pedida
func buscarPublicacoes(w http.ResponseWriter, r *http.Request, pagina int, caminho string, urlDaProxima func(int) string) (DadosDoFeed, bool) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return DadosDoFeed{}, false
	}

	usuarioID, erro := strconv.ParseUint(dados["id"], 10, 64)
	if erro != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return DadosDoFeed{}, false
	}

	url := fmt.Sprintf("%s%slimite=%d&deslocamento=%d", config.ApiURL, caminho, tamanhoDaPaginaDoFeed+1, (pagina-1)*tamanhoDaPaginaDoFeed)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return DadosDoFeed{}, false
	}
	defer response.Body.Close()

	if sessaoExpirada(w, r, response) {
		return DadosDoFeed{}, false
	}

	if response.StatusCode >= http.StatusBadRequest {
		paginaDeErroDaAPI(w, response)
		return DadosDoFeed{}, false
	}

	var publicacoes []modelos.Publicacao
	if erro = json.NewDecoder(response.Body).Decode(&publicacoes); erro != nil {
		utils.ServidorIndisponivel(w)
		return DadosDoFeed{}, false
	}

	feed := DadosDoFeed{UsuarioID: usuarioID}
	if len(publicacoes) > tamanhoDaPaginaDoFeed {
		publicacoes = publicacoes[:tamanhoDaPaginaDoFeed]
		feed.ProximaPagina = pagina + 1
		feed.ProximaURL = urlDaProxima(pagina + 1)
	}
	feed.Publicacoes = publicacoes

	return feed, true
}

var expressaoDeHashtag = regexp.MustCompile(`^#[\p{L}\p{N}_]{1,50}$`)

// validarBuscaDePublicacoes devolve o aviso a mostrar quando a busca não pode ser feita
func validarBuscaDePublicacoes(termo string) string {
	if strings.HasPrefix(termo, "#") {
		if !expressaoDeHashtag.MatchString(termo) {
			return "Use apenas letras, números e _ na hashtag."
		}
		return ""
	}

	if tamanho := utf8.RuneCountInString(termo); tamanho < 2 || tamanho > 100 {
		return "Digite de 2 a 100 caracteres para buscar."
	}
	return ""
}

// CarregarPaginaDeBuscaDePublicacoes mostra os resultados da busca de publicações (texto ou #hashtag).
// Com pagina >= 2 devolve só os itens, para o botão "carregar mais".
func CarregarPaginaDeBuscaDePublicacoes(w http.ResponseWriter, r *http.Request) {
	termo := strings.TrimSpace(r.URL.Query().Get("q"))
	pagina, _ := strconv.Atoi(r.URL.Query().Get("pagina"))
	if pagina < 1 {
		pagina = 1
	}

	if termo == "" {
		utils.ExecutarTemplate(w, "buscar-publicacoes.html", DadosDoFeed{})
		return
	}

	if aviso := validarBuscaDePublicacoes(termo); aviso != "" {
		utils.ExecutarTemplate(w, "buscar-publicacoes.html", DadosDoFeed{Busca: termo, Aviso: aviso})
		return
	}

	consulta := "/publicacoes/busca?q=" + neturl.QueryEscape(termo) + "&"
	feed, ok := buscarPublicacoes(w, r, pagina, consulta, func(proxima int) string {
		return fmt.Sprintf("/buscar-publicacoes?q=%s&pagina=%d", neturl.QueryEscape(termo), proxima)
	})
	if !ok {
		return
	}
	feed.Busca = termo

	if pagina > 1 {
		utils.ExecutarTemplate(w, "feed-itens", feed)
		return
	}
	utils.ExecutarTemplate(w, "buscar-publicacoes.html", feed)
}

// CarregarPaginaPrincipal carrega a pagina principal com as publicacoes
func CarregarPaginaPrincipal(w http.ResponseWriter, r *http.Request) {
	feed, ok := buscarFeed(w, r, 1)
	if !ok {
		return
	}

	utils.ExecutarTemplate(w, "home.html", feed)
}

// CarregarMaisPublicacoes devolve apenas os itens de uma página do feed (botão "carregar mais")
func CarregarMaisPublicacoes(w http.ResponseWriter, r *http.Request) {
	pagina, erro := strconv.Atoi(r.URL.Query().Get("pagina"))
	if erro != nil || pagina < 2 {
		utils.PaginaDeErro(w, http.StatusBadRequest, "Endereço inválido", "O endereço que você tentou abrir não está correto.")
		return
	}

	feed, ok := buscarFeed(w, r, pagina)
	if !ok {
		return
	}

	utils.ExecutarTemplate(w, "feed-itens", feed)
}

// CarregarPaginaDeAtualizacaoDePublicacao carrega a pagina de edição de uma publicação existente.
func CarregarPaginaDeAtualizacaoDePublicacao(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	publicacaoID, erro := strconv.ParseUint(parametros["publicacaoId"], 10, 64)
	if erro != nil {
		utils.PaginaDeErro(w, http.StatusBadRequest, "Endereço inválido", "O endereço que você tentou abrir não está correto.")
		return
	}

	url := fmt.Sprintf("%s/publicacoes/%d", config.ApiURL, publicacaoID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer response.Body.Close()

	if sessaoExpirada(w, r, response) {
		return
	}

	if response.StatusCode >= http.StatusBadRequest {
		paginaDeErroDaAPI(w, response)
		return
	}

	var publicacao modelos.Publicacao
	if erro = json.NewDecoder(response.Body).Decode(&publicacao); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}

	utils.ExecutarTemplate(w, "atualizar-publicacao.html", publicacao)
}

// DadosDaPublicacao são os dados da página de uma única publicação (destino das notificações)
type DadosDaPublicacao struct {
	Publicacao modelos.Publicacao
	UsuarioID  uint64
}

// CarregarPaginaDePublicacao mostra uma publicação com os comentários já abertos
func CarregarPaginaDePublicacao(w http.ResponseWriter, r *http.Request) {
	publicacaoID, erro := strconv.ParseUint(mux.Vars(r)["publicacaoId"], 10, 64)
	if erro != nil {
		utils.PaginaDeErro(w, http.StatusBadRequest, "Endereço inválido", "O endereço que você tentou abrir não está correto.")
		return
	}

	dadosCookie, erro := cookies.Ler(r)
	if erro != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	usuarioID, _ := strconv.ParseUint(dadosCookie["id"], 10, 64)

	url := fmt.Sprintf("%s/publicacoes/%d", config.ApiURL, publicacaoID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer response.Body.Close()

	if sessaoExpirada(w, r, response) {
		return
	}

	if response.StatusCode == http.StatusNotFound {
		utils.PaginaDeErro(w, http.StatusNotFound, "Publicação não encontrada", "Ela pode ter sido excluída pelo autor.")
		return
	}

	if response.StatusCode >= http.StatusBadRequest {
		paginaDeErroDaAPI(w, response)
		return
	}

	var publicacao modelos.Publicacao
	if erro = json.NewDecoder(response.Body).Decode(&publicacao); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}

	utils.ExecutarTemplate(w, "publicacao.html", DadosDaPublicacao{Publicacao: publicacao, UsuarioID: usuarioID})
}

// CarregarPaginaDeUsuarios carrega a pagina que atende o filtro de usuarios
func CarregarPaginaDeUsuarios(w http.ResponseWriter, r *http.Request) {
	nomeOuNick := strings.ToLower(r.URL.Query().Get("usuario"))
	url := fmt.Sprintf("%s/usuarios?usuario=%s", config.ApiURL, neturl.QueryEscape(nomeOuNick))

	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer response.Body.Close()

	if sessaoExpirada(w, r, response) {
		return
	}

	if response.StatusCode >= 400 {
		paginaDeErroDaAPI(w, response)
		return
	}

	var usuarios []modelos.Usuario
	if erro = json.NewDecoder(response.Body).Decode(&usuarios); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}

	utils.ExecutarTemplate(w, "usuarios.html", usuarios)
}

// CarregarPerfilDoUsuario carrega o perfil do usuario
func CarregarPerfilDoUsuario(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	usuarioID, erro := strconv.ParseUint(parametros["usuarioId"], 10, 64)
	if erro != nil {
		utils.PaginaDeErro(w, http.StatusBadRequest, "Endereço inválido", "O endereço que você tentou abrir não está correto.")
		return
	}

	cookie, _ := cookies.Ler(r)
	usuarioLogadoID, _ := strconv.ParseUint(cookie["id"], 10, 64)

	if usuarioID == usuarioLogadoID {
		http.Redirect(w, r, "/perfil", 302)
		return
	}

	usuario, erro := modelos.BuscarUsuarioPorCompleto(usuarioID, r)
	if errors.Is(erro, modelos.ErroUsuarioNaoEncontrado) {
		utils.PaginaDeErro(w, http.StatusNotFound, "Usuário não encontrado", "Não existe nenhum perfil com esse endereço.")
		return
	}
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}

	var bloqueio struct {
		Bloqueei  bool `json:"bloqueei"`
		Bloqueado bool `json:"bloqueado"`
		Silenciei bool `json:"silenciei"`
	}
	if resposta, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, fmt.Sprintf("%s/usuarios/%d/bloqueio", config.ApiURL, usuarioID), nil); erro == nil {
		defer resposta.Body.Close()
		if resposta.StatusCode < http.StatusBadRequest {
			json.NewDecoder(resposta.Body).Decode(&bloqueio)
		}
	}

	utils.ExecutarTemplate(w, "usuario.html", struct {
		Usuario         modelos.Usuario
		UsuarioLogadoID uint64
		Bloqueei        bool
		Bloqueado       bool
		Silenciei       bool
	}{
		Usuario:         usuario,
		UsuarioLogadoID: usuarioLogadoID,
		Bloqueei:        bloqueio.Bloqueei,
		Bloqueado:       bloqueio.Bloqueado,
		Silenciei:       bloqueio.Silenciei,
	})
}

// CarregarPerfilDoUsuarioLogado carrega o perfil do usuario
func CarregarPerfilDoUsuarioLogado(w http.ResponseWriter, r *http.Request) {
	cookie, _ := cookies.Ler(r)
	usuarioID, _ := strconv.ParseUint(cookie["id"], 10, 64)

	usuario, erro := modelos.BuscarUsuarioPorCompleto(usuarioID, r)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}

	utils.ExecutarTemplate(w, "perfil.html", struct {
		Usuario         modelos.Usuario
		UsuarioLogadoID uint64
	}{
		Usuario:         usuario,
		UsuarioLogadoID: usuarioID,
	})
}

// CarregarPerfilDeEdicaoDeUsuario carrega a pagina de edicao do perfil do usuario logado
func CarregarPerfilDeEdicaoDeUsuario(w http.ResponseWriter, r *http.Request) {
	cookie, _ := cookies.Ler(r)
	usuarioID, _ := strconv.ParseUint(cookie["id"], 10, 64)

	canal := make(chan modelos.Usuario)
	go modelos.BuscarDadosDoUsuario(canal, usuarioID, r)
	usuario := <-canal

	if usuario.ID == 0 {
		utils.ServidorIndisponivel(w)
		return
	}

	utils.ExecutarTemplate(w, "editar-usuario.html", usuario)
}

// CarregarPaginaDeAtualizacaoDeSenha carrega a pagina de atualizacao de senha do usuario logado
func CarregarPaginaDeAtualizacaoDeSenha(w http.ResponseWriter, r *http.Request) {
	utils.ExecutarTemplate(w, "atualizar-senha.html", nil)
}
