package utils

import (
	"html/template"
	"log"
	"net/http"
)

var templates *template.Template

// CarregarTemplates insere os templates html na variavel templates.
// Usa html/template, que escapa automaticamente o conteúdo dos usuários (proteção contra XSS).
func CarregarTemplates() {
	templates = template.Must(template.New("").Funcs(template.FuncMap{"intervalo": intervalo, "inc": func(n int) int { return n + 1 }}).ParseGlob("views/*.html"))
	templates = template.Must(templates.ParseGlob("views/templates/*.html"))
}

// intervalo devolve 0..n-1, para repetir um trecho do template n vezes
func intervalo(n int) []int {
	valores := make([]int, n)
	for i := range valores {
		valores[i] = i
	}
	return valores
}

// ExecutarTemplate renderiza uma pagina html na tela
func ExecutarTemplate(w http.ResponseWriter, template string, dados interface{}) {
	if erro := templates.ExecuteTemplate(w, template, dados); erro != nil {
		log.Printf("erro ao renderizar %s: %v", template, erro)
	}
}

// DadosDaPaginaDeErro são os textos exibidos pela página de erro
type DadosDaPaginaDeErro struct {
	Status   int
	Titulo   string
	Mensagem string
}

// PaginaDeErro renderiza a página de erro amigável com o status HTTP informado
func PaginaDeErro(w http.ResponseWriter, status int, titulo, mensagem string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	ExecutarTemplate(w, "erro.html", DadosDaPaginaDeErro{Status: status, Titulo: titulo, Mensagem: mensagem})
}

// PaginaNaoEncontrada renderiza o erro 404
func PaginaNaoEncontrada(w http.ResponseWriter, r *http.Request) {
	PaginaDeErro(w, http.StatusNotFound, "Página não encontrada", "O endereço que você tentou abrir não existe ou foi movido.")
}

// MetodoNaoPermitido renderiza o erro 405
func MetodoNaoPermitido(w http.ResponseWriter, r *http.Request) {
	PaginaDeErro(w, http.StatusMethodNotAllowed, "Ação não permitida", "Não foi possível concluir essa ação por este caminho.")
}

// ServidorIndisponivel renderiza o erro 503 quando a API não responde
func ServidorIndisponivel(w http.ResponseWriter) {
	PaginaDeErro(w, http.StatusServiceUnavailable, "Servidores indisponíveis", "Os servidores encontram-se em estado de erro. Pedimos desculpas, tente novamente em instantes.")
}
