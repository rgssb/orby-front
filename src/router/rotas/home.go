package rotas

import (
	"net/http"
	"orby/web/src/controllers"
)

var rotaPaginaPrincipal = Rota{
	URI:                "/home",
	Metodo:             http.MethodGet,
	Funcao:             controllers.CarregarPaginaPrincipal,
	RequerAutenticacao: true,
}
