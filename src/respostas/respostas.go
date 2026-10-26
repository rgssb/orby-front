package respostas

import (
	"encoding/json"
	"log"
	"net/http"
	"webapp/src/cookies"
)

// ErroAPI representa uma resposta de erro da API.
type ErroAPI struct {
	Erro string `json:"erro"`
}

// JSON retorna uma resposta em formato JSON para a requisição.
func JSON(w http.ResponseWriter, statusCode int, dados interface{}) {
	// Sem corpo não há Content-Type: o jQuery tentaria interpretar um JSON vazio e acusaria erro
	if dados == nil {
		w.WriteHeader(statusCode)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if erro := json.NewEncoder(w).Encode(dados); erro != nil {
		log.Printf("erro ao codificar resposta JSON: %v", erro)
	}
}

// Erro retorna uma mensagem de erro em formato JSON.
func Erro(w http.ResponseWriter, statusCode int, mensagem string) {
	JSON(w, statusCode, ErroAPI{Erro: mensagem})
}

// TratarStatusCodeDeErro encaminha erros recebidos da API como JSON.
func TratarStatusCodeDeErro(w http.ResponseWriter, resposta *http.Response) {
	if resposta.StatusCode < http.StatusBadRequest {
		return
	}

	// Token recusado pela API: a sessão acabou, então o cookie não serve mais
	if resposta.StatusCode == http.StatusUnauthorized {
		cookies.Deletar(w)
	}

	var erro ErroAPI
	if falha := json.NewDecoder(resposta.Body).Decode(&erro); falha != nil {
		log.Printf("erro ao decodificar resposta de erro da API: %v", falha)
		Erro(w, http.StatusBadGateway, "Resposta inválida da API.")
		return
	}

	JSON(w, resposta.StatusCode, erro)
}
