package rotas

import "net/http"
import "webapp/src/controllers"

var rotasUsuarios = []Rota{
	{
	URI: "/criar-usuario",
	Metodo: http.MethodGet,
	Funcao: controllers.CarregarPaginaDeCadastroDeUsuario,
	RequerAutenticacao: false,
	},
	{
	URI: "/usuarios",
	Metodo: http.MethodPost,
	Funcao: controllers.CriarUsuario,
	RequerAutenticacao: false,
	},
	{
	URI: "/buscar-usuarios",
	Metodo: http.MethodGet,
	Funcao: controllers.CarregarPaginaDeUsuarios,
	RequerAutenticacao: false,
	},
	{
		URI: "/usuarios/{usuarioId}",
		Metodo: http.MethodGet,
		Funcao: controllers.CarregarPerfilDoUsuario,
		RequerAutenticacao: false,
	},
}