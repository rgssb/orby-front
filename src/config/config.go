package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

var (
	//ApiURL contem a URL para a comunicação com a API
	ApiURL = "http://localhost:8080"
	//Porta onde a aplicacao web esta rodando
	Porta = "8081"
	//HashKey é utilizada para autenticar o cookie
	HashKey []byte
	//BlockKey é utilizada para criptografar os dados do cookie
	BlockKey []byte
	//CookieSeguro marca o cookie como Secure (só enviado por HTTPS). Ative com COOKIE_SECURE=true em produção.
	CookieSeguro bool
)

// Carregar inicializa as variaveis de ambiente
func Carregar() {
	var erro error

	// Em contêiner as variáveis vêm do ambiente, então o .env é opcional
	if erro = godotenv.Load(); erro != nil && !os.IsNotExist(erro) {
		log.Fatal(erro)
	}

	_, erro = strconv.Atoi(os.Getenv("APP_PORT"))
	if erro != nil {
		log.Fatal(erro)
	}
	Porta = os.Getenv("APP_PORT")

	ApiURL = os.Getenv("API_URL")
	HashKey = []byte(os.Getenv("HASH_KEY"))
	BlockKey = []byte(os.Getenv("BLOCK_KEY"))
	CookieSeguro = os.Getenv("COOKIE_SECURE") == "true"

}
