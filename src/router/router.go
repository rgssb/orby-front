package router

import (
	"net/http"
	"webapp/src/middlewares"
	"webapp/src/router/rotas"
	"webapp/src/utils"

	"github.com/gorilla/mux"
)

// Gerar retorna um router com todas as rotas configuradas.
func Gerar() *mux.Router {
	router := mux.NewRouter()
	router.Use(middlewares.CabecalhosDeSeguranca, middlewares.Recuperar)
	router.NotFoundHandler = http.HandlerFunc(utils.PaginaNaoEncontrada)
	router.MethodNotAllowedHandler = http.HandlerFunc(utils.MetodoNaoPermitido)

	return rotas.Configurar(router)
}
