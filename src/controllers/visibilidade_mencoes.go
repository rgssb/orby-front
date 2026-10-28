package controllers

import "net/http"

func VisibilidadeDasMencoes(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Nicks []string `json:"nicks"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPost, "/mencoes/visibilidade")
}
