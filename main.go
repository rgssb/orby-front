package main

import (
	"fmt"
	"log"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/cookies"
	"orby/web/src/router"
	"orby/web/src/utils"
)

func main() {
	config.Carregar()
	cookies.Configurar()
	utils.CarregarTemplates()
	r := router.Gerar()

	fmt.Printf("Rodando na Porta %s\n", config.Porta)
	log.Fatal(http.ListenAndServe(":"+config.Porta, r))
}
