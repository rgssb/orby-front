package middlewares

import (
	"log"
	"net/http"
	"strings"
	"webapp/src/utils"
)

// CabecalhosDeSeguranca adiciona cabeçalhos de proteção a todas as respostas
func CabecalhosDeSeguranca(proxima http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cabecalhos := w.Header()
		cabecalhos.Set("X-Content-Type-Options", "nosniff")
		cabecalhos.Set("X-Frame-Options", "DENY")
		cabecalhos.Set("Referrer-Policy", "same-origin")
		cabecalhos.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		cabecalhos.Set("Content-Security-Policy", politicaDeConteudo)

		// Páginas autenticadas não devem ficar em cache (botão "voltar" após o logout)
		if !strings.HasPrefix(r.URL.Path, "/assets/") {
			cabecalhos.Set("Cache-Control", "no-store")
		}

		proxima.ServeHTTP(w, r)
	})
}

const politicaDeConteudo = "default-src 'self'; " +
	"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://kit.fontawesome.com; " +
	"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://ka-f.fontawesome.com https://fonts.googleapis.com; " +
	"font-src 'self' data: https://ka-f.fontawesome.com https://fonts.gstatic.com; " +
	"img-src 'self' data: blob:; " +
	"connect-src 'self' https://ka-f.fontawesome.com; " +
	"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

// Recuperar evita que um erro inesperado derrube a conexão: mostra a página de erro 500
func Recuperar(proxima http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if falha := recover(); falha != nil {
				log.Printf("erro inesperado em %s %s: %v", r.Method, r.URL.Path, falha)
				utils.PaginaDeErro(w, http.StatusInternalServerError, "Algo deu errado", "Tivemos um problema inesperado. Tente novamente em instantes.")
			}
		}()

		proxima.ServeHTTP(w, r)
	})
}
