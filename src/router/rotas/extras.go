package rotas

import (
	"net/http"
	"orby/web/src/controllers"
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
	{URI: "/notificacoes/nao-lidas", Metodo: http.MethodGet, Funcao: controllers.Repassar(http.MethodGet, "/notificacoes/nao-lidas"), RequerAutenticacao: true},
	{URI: "/notificacoes/lidas", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/notificacoes/lidas"), RequerAutenticacao: true},
	{URI: "/notificacoes/{notificacaoId}", Metodo: http.MethodDelete, Funcao: controllers.Repassar(http.MethodDelete, "/notificacoes/{notificacaoId}"), RequerAutenticacao: true},
	{URI: "/sugestoes-mencao", Metodo: http.MethodGet, Funcao: controllers.SugerirMencoes, RequerAutenticacao: true},
	{URI: "/mencoes/{nick}", Metodo: http.MethodGet, Funcao: controllers.IrParaMencao, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaDePublicacao, RequerAutenticacao: true},

	{URI: "/mensagens", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaDeMensagens, RequerAutenticacao: true},
	{URI: "/conversas", Metodo: http.MethodGet, Funcao: controllers.Repassar(http.MethodGet, "/conversas"), RequerAutenticacao: true},
	{URI: "/conversas/nao-lidas", Metodo: http.MethodGet, Funcao: controllers.Repassar(http.MethodGet, "/conversas/nao-lidas"), RequerAutenticacao: true},
	{URI: "/conversas/{usuarioId}/mensagens", Metodo: http.MethodGet, Funcao: controllers.BuscarMensagens, RequerAutenticacao: true},
	{URI: "/conversas/{usuarioId}/mensagens", Metodo: http.MethodPost, Funcao: controllers.EnviarMensagem, RequerAutenticacao: true},
	{URI: "/conversas/{usuarioId}/aceitar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/conversas/{usuarioId}/aceitar"), RequerAutenticacao: true},
	{URI: "/conversas/{usuarioId}", Metodo: http.MethodDelete, Funcao: controllers.Repassar(http.MethodDelete, "/conversas/{usuarioId}"), RequerAutenticacao: true},
	{URI: "/usuarios/{usuarioId}/bloquear", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/usuarios/{usuarioId}/bloquear"), RequerAutenticacao: true},
	{URI: "/usuarios/{usuarioId}/silenciar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/usuarios/{usuarioId}/silenciar"), RequerAutenticacao: true},
	{URI: "/usuarios/{usuarioId}/dessilenciar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/usuarios/{usuarioId}/dessilenciar"), RequerAutenticacao: true},
	{URI: "/usuarios/{usuarioId}/desbloquear", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/usuarios/{usuarioId}/desbloquear"), RequerAutenticacao: true},
	{URI: "/mensagens/{mensagemId}", Metodo: http.MethodDelete, Funcao: controllers.Repassar(http.MethodDelete, "/mensagens/{mensagemId}"), RequerAutenticacao: true},

	{URI: "/conversas/{usuarioId}/silenciar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/conversas/{usuarioId}/silenciar"), RequerAutenticacao: true},
	{URI: "/conversas/{usuarioId}/silenciar", Metodo: http.MethodDelete, Funcao: controllers.Repassar(http.MethodDelete, "/conversas/{usuarioId}/silenciar"), RequerAutenticacao: true},
	{URI: "/conversas/{usuarioId}/digitando", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/conversas/{usuarioId}/digitando"), RequerAutenticacao: true},
	{URI: "/mensagens/{mensagemId}/reacao", Metodo: http.MethodPost, Funcao: controllers.ReagirAMensagem, RequerAutenticacao: true},
	{URI: "/mensagens/{mensagemId}/imagem", Metodo: http.MethodPost, Funcao: controllers.EnviarImagemDeMensagem, RequerAutenticacao: true},
	{URI: "/mensagens/{mensagemId}/imagem", Metodo: http.MethodGet, Funcao: controllers.BuscarImagemDeMensagem, RequerAutenticacao: true},
	{URI: "/eventos", Metodo: http.MethodGet, Funcao: controllers.Eventos, RequerAutenticacao: true},

	{URI: "/salvos", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaDeSalvos, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}/salvar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/publicacoes/{publicacaoId}/salvar"), RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}/salvar", Metodo: http.MethodDelete, Funcao: controllers.Repassar(http.MethodDelete, "/publicacoes/{publicacaoId}/salvar"), RequerAutenticacao: true},
	{URI: "/perfil/privacidade", Metodo: http.MethodPut, Funcao: controllers.DefinirPrivacidade, RequerAutenticacao: true},
	{URI: "/pedidos-seguir", Metodo: http.MethodGet, Funcao: controllers.Repassar(http.MethodGet, "/usuarios/pedidos"), RequerAutenticacao: true},
	{URI: "/pedidos-seguir/{usuarioId}/aceitar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/usuarios/{usuarioId}/pedido/aceitar"), RequerAutenticacao: true},
	{URI: "/pedidos-seguir/{usuarioId}/recusar", Metodo: http.MethodPost, Funcao: controllers.Repassar(http.MethodPost, "/usuarios/{usuarioId}/pedido/recusar"), RequerAutenticacao: true},

	{URI: "/buscar-publicacoes", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaDeBuscaDePublicacoes, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}/imagem", Metodo: http.MethodGet, Funcao: controllers.BuscarImagemDaPublicacao, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}/imagem", Metodo: http.MethodPost, Funcao: controllers.SalvarImagemDaPublicacao, RequerAutenticacao: true},
	{URI: "/publicacoes/{publicacaoId}/imagem", Metodo: http.MethodDelete, Funcao: controllers.RemoverImagemDaPublicacao, RequerAutenticacao: true},

	{URI: "/usuarios/{usuarioId}/foto", Metodo: http.MethodGet, Funcao: controllers.BuscarFotoDoUsuario, RequerAutenticacao: true},
	{URI: "/perfil/foto", Metodo: http.MethodPost, Funcao: controllers.SalvarFotoDoUsuario, RequerAutenticacao: true},
	{URI: "/usuarios/{usuarioId}/banner", Metodo: http.MethodGet, Funcao: controllers.BuscarBannerDoUsuario, RequerAutenticacao: true},
	{URI: "/perfil/banner", Metodo: http.MethodPost, Funcao: controllers.SalvarBannerDoUsuario, RequerAutenticacao: true},
	{URI: "/perfil/banner/tema", Metodo: http.MethodPost, Funcao: controllers.DefinirTemaDoBanner, RequerAutenticacao: true},
	{URI: "/perfil/banner", Metodo: http.MethodDelete, Funcao: controllers.RemoverBannerDoUsuario, RequerAutenticacao: true},
	{URI: "/perfil/foto", Metodo: http.MethodDelete, Funcao: controllers.RemoverFotoDoUsuario, RequerAutenticacao: true},

	{URI: "/confirmar-email", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaConfirmarEmail, RequerAutenticacao: false},
	{URI: "/confirmar-email", Metodo: http.MethodPost, Funcao: controllers.ConfirmarEmail, RequerAutenticacao: false},
	{URI: "/reenviar-confirmacao", Metodo: http.MethodPost, Funcao: controllers.ReenviarConfirmacao, RequerAutenticacao: false},
	{URI: "/esqueci-senha", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaEsqueciSenha, RequerAutenticacao: false},
	{URI: "/esqueci-senha", Metodo: http.MethodPost, Funcao: controllers.EsqueciSenha, RequerAutenticacao: false},
	{URI: "/redefinir-senha", Metodo: http.MethodGet, Funcao: controllers.CarregarPaginaRedefinirSenha, RequerAutenticacao: false},
	{URI: "/redefinir-senha", Metodo: http.MethodPost, Funcao: controllers.RedefinirSenha, RequerAutenticacao: false},
}
