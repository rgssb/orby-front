package controllers

import (
	"net/http"
	"webapp/src/cookies"
)

//FazerLogout remove os dados salvos no browser
func FazerLogout(w http.ResponseWriter, r *http.Request) {
	cookies.Deletar(w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}