package modelos

import "time"
import "net/http"

//Usuario representa uma pessoa utilizando a rede social
type Usuario struct {
	ID       uint64 `json:"id"`
	Nome     string `json:"nome"`
	Nick     string `json:"nick"`
	Email    string `json:"email"`
	CriadoEm time.Time `json:"criadoEm"`
	Seguidores []Usuario `json:"seguidores"`
	Seguindo   []Usuario `json:"seguindo"`
	Publicacoes []Publicacao `json:"publicacoes"`

	go BuscarDadosDoUsuario(canalUsuario, ID, nil)
	go BuscarSeguidores(canalSeguidores, ID, nil)
	go BuscarSeguindo(canalSeguindo, ID, nil)
	go BuscarPublicacoes(canalPublicacoes, ID, nil)
}

//BuscarUsuarioPorCompleto faz 4 requisicoes na api para montar o usuario
func BuscarUsuarioPorCompleto(usuarioID uint64, r *http.Request) (Usuario, error) {
	canalUsuario := make(chan Usuario)
	canalSeguidores := make(chan []Usuario)
	canalSeguindo := make(chan []Usuario)
	canalPublicacoes := make(chan []Publicacao)
}

func BuscarDadosDoUsuario(canal <-chan Usuario, usuarioID uint64, r *http.Request) {

}

func BuscarSeguidores(canal <-chan []Usuario, usuarioID uint64, r *http.Request) {

}

func BuscarSeguindo(canal <-chan []Usuario, usuarioID uint64, r *http.Request) {

}

func BuscarPublicacoes(canal <-chan []Publicacao, usuarioID uint64, r *http.Request) {

}