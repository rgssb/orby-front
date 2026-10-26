package rotas

import (
	"net/http"
	"webapp/src/controllers"
)

var rotasExtras = []Rota{
	{URI: "/feed", Metodo: http.MethodGet, Funcao: controllers.CarregarMaisPublicacoes, RequerAutenticacao: true},

	{URI: "/publicacoes/{publicacaoId}/comentarios", Metodo: http.MethodGet, Funcao: controllers.BuscarComentarios, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}/comentarios", Metodo: http.MethodPost, Funcao: controllers.CriarComentario, RequerAutenticacao: true},
	{URI: "/comentarios/{comentarioId}", Metodo: http.MethodDelete, Funcao: controllers.DeletarComentario, RequerAutenticacao: true},

	{URI: "/comentarios/{comentarioId}", Metodo: http.MethodPut, Funcao: controllers.AtualizarComentario, RequerAutenticacao: true},
	{URI: "/comentarios/{comentarioId}/curtir", Metodo: http.MethodPost, Funcao: controllers.CurtirComentario, RequerAutenticacao: true},
	{URI: "/comentarios/{comentarioId}/descurtir", Metodo: http.MethodPost, Funcao: controllers.DescurtirComentario, RequerAutenticacao: true},

	{URI: "/notificacoes", Metodo: http.MethodGet, Funcao: controllers.BuscarNotificacoes, RequerAutenticacao: true},
	{URI: "/notificacoes/nao-lidas", Metodo: http.MethodGet, Funcao: controllers.ContarNotificacoesNaoLidas, RequerAutenticacao: true},
	{URI: "/notificacoes/lidas", Metodo: http.MethodPost, Funcao: controllers.MarcarNotificacoesComoLidas, RequerAutenticacao: true},
	{URI: "/notificacoes/{notificacaoId}", Metodo: http.MethodDelete, Funcao: controllers.ExcluirNotificacao, RequerAutenticacao: true},
	{URI: "/sugestoes-mencao", Metodo: http.MethodGet, Funcao: controllers.SugerirMencoes, RequerAutenticacao: true},
	{URI: "/mencoes/{nick}", Metodo: http.MethodGet, Funcao: controllers.IrParaMencao, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaDePublicacao, RequerAutenticacao: true},

	{URI: "/usuarios/{usuarioId}/foto", Metodo: http.MethodGet, Funcao: controllers.BuscarFotoDoUsuario, RequerAutenticacao: true},
	{URI: "/perfil/foto", Metodo: http.MethodPost, Funcao: controllers.SalvarFotoDoUsuario, RequerAutenticacao: true},
	{URI: "/perfil/foto", Metodo: http.MethodDelete, Funcao: controllers.RemoverFotoDoUsuario, RequerAutenticacao: true},

	{URI: "/esqueci-senha", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaEsqueciSenha, RequerAutenticacao: false},
	{URI: "/esqueci-senha", Metodo: http.MethodPost, Funcao: controllers.EsqueciSenha, RequerAutenticacao: false},
	{URI: "/redefinir-senha", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaRedefinirSenha, RequerAutenticacao: false},
	{URI: "/redefinir-senha", Metodo: http.MethodPost, Funcao: controllers.RedefinirSenha, RequerAutenticacao: false},
}
