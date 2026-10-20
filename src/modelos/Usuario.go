package modelos

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"webapp/src/config"
	"webapp/src/requisicoes"
)

// Usuario representa uma pessoa utilizando a rede social
type Usuario struct {
	ID          uint64       `json:"id"`
	Nome        string       `json:"nome"`
	Nick        string       `json:"nick"`
	Email       string       `json:"email"`
	CriadoEm    time.Time    `json:"criadoEm"`
	Seguidores  []Usuario    `json:"seguidores"`
	Seguindo    []Usuario    `json:"seguindo"`
	Publicacoes []Publicacao `json:"publicacoes"`
}

// BuscarUsuarioPorCompleto faz 4 requisicoes na api para montar o usuario
func BuscarUsuarioPorCompleto(usuarioID uint64, r *http.Request) (Usuario, error) {
	canalUsuario := make(chan Usuario)
	canalSeguidores := make(chan []Usuario)
	canalSeguindo := make(chan []Usuario)
	canalPublicacoes := make(chan []Publicacao)

	go BuscarDadosDoUsuario(canalUsuario, usuarioID, r)
	go BuscarSeguidores(canalSeguidores, usuarioID, r)
	go BuscarSeguindo(canalSeguindo, usuarioID, r)
	go BuscarPublicacoes(canalPublicacoes, usuarioID, r)

	usuario := <-canalUsuario
	usuario.Seguidores = <-canalSeguidores
	usuario.Seguindo = <-canalSeguindo
	usuario.Publicacoes = <-canalPublicacoes
	return usuario, nil
}

// BuscarDadosDoUsuario chama a api para buscar os dados base do usuario
func BuscarDadosDoUsuario(canal chan<- Usuario, usuarioID uint64, r *http.Request) {
	var usuario Usuario
	buscarNaAPI(r, fmt.Sprintf("%s/usuarios/%d", config.ApiURL, usuarioID), &usuario)
	canal <- usuario
}

// BuscarSeguidores chama a api para buscar os seguidores do usuario
func BuscarSeguidores(canal chan<- []Usuario, usuarioID uint64, r *http.Request) {
	var seguidores []Usuario
	buscarNaAPI(r, fmt.Sprintf("%s/usuarios/%d/seguidores", config.ApiURL, usuarioID), &seguidores)
	canal <- seguidores
}

// BuscarSeguindo chama a api para buscar quem o usuario segue
func BuscarSeguindo(canal chan<- []Usuario, usuarioID uint64, r *http.Request) {
	var seguindo []Usuario
	buscarNaAPI(r, fmt.Sprintf("%s/usuarios/%d/seguindo", config.ApiURL, usuarioID), &seguindo)
	canal <- seguindo
}

// BuscarPublicacoes chama a api para buscar as publicacoes do usuario
func BuscarPublicacoes(canal chan<- []Publicacao, usuarioID uint64, r *http.Request) {
	var publicacoes []Publicacao
	buscarNaAPI(r, fmt.Sprintf("%s/usuarios/%d/publicacoes", config.ApiURL, usuarioID), &publicacoes)
	canal <- publicacoes
}

// buscarNaAPI faz o GET autenticado e decodifica a resposta; em caso de falha mantem o destino zerado
func buscarNaAPI(r *http.Request, url string, destino interface{}) {
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		return
	}

	json.NewDecoder(response.Body).Decode(destino)
}
