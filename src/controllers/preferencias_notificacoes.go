package controllers

import (
	"net/http"
)

func SalvarPreferenciasDeNotificacao(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Silenciados []string `json:"silenciados"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPut, "/notificacoes/preferencias")
}
