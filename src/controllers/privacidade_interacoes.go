package controllers

import "net/http"

func SalvarPrivacidadeInteracoes(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Mensagens   string `json:"mensagens"`
		Mencoes     string `json:"mencoes"`
		Comentarios string `json:"comentarios"`
	}

	repassarCorpo(w, r, &corpo, http.MethodPut, "/privacidade/interacoes")
}
