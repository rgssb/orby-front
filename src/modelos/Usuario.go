package modelos

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"orby/web/src/config"
	"time"

	"orby/web/src/requisicoes"
)

// Usuario representa uma pessoa utilizando a rede social
type Usuario struct {
	ID           uint64       `json:"id"`
	Nome         string       `json:"nome"`
	Nick         string       `json:"nick"`
	Email        string       `json:"email"`
	Bio          string       `json:"bio"`
	FotoVersao   uint64       `json:"fotoVersao"`
	BannerPreset string       `json:"bannerPreset"`
	BannerVersao uint64       `json:"bannerVersao"`
	CriadoEm     time.Time    `json:"criadoEm"`
	Admin        bool         `json:"admin"`
	Suspenso     bool         `json:"suspenso"`
	Seguidores   []Usuario    `json:"seguidores"`
	Seguindo     []Usuario    `json:"seguindo"`
	Publicacoes  []Publicacao `json:"publicacoes"`
	// Privado esconde as publicações de quem não segue; os dois campos seguintes dependem de quem visita
	Privado            bool `json:"privado"`
	PodeVerPublicacoes bool `json:"podeVerPublicacoes"`
	PedidoEnviado      bool `json:"pedidoEnviado"`
	AcessoModeracao    bool `json:"acessoModeracao"`
}

// ErroUsuarioNaoEncontrado indica que a API não conhece o usuário pedido
var ErroUsuarioNaoEncontrado = errors.New("Erro ao buscar dados do usuário")

// BuscarUsuarioPorCompleto faz 4 requisicoes na api para montar o usuario
func BuscarUsuarioPorCompleto(usuarioID uint64, r *http.Request) (Usuario, error) {
	// Canais com buffer: se uma busca falhar e a função retornar cedo, as demais goroutines não ficam presas
	canalUsuario := make(chan Usuario, 1)
	canalSeguidores := make(chan []Usuario, 1)
	canalSeguindo := make(chan []Usuario, 1)
	canalPublicacoes := make(chan []Publicacao, 1)

	go BuscarDadosDoUsuario(canalUsuario, usuarioID, r)
	go BuscarSeguidores(canalSeguidores, usuarioID, r)
	go BuscarSeguindo(canalSeguindo, usuarioID, r)
	go BuscarPublicacoes(canalPublicacoes, usuarioID, r)

	var (
		usuario     Usuario
		seguidores  []Usuario
		seguindo    []Usuario
		publicacoes []Publicacao
	)

	for i := 0; i < 4; i++ {

		select {
		case usuarioCarregado := <-canalUsuario:
			if usuarioCarregado.ID == 0 {
				return Usuario{}, ErroUsuarioNaoEncontrado
			}
			usuario = usuarioCarregado

		case seguidoresCarregados := <-canalSeguidores:
			if seguidoresCarregados == nil {
				return Usuario{}, errors.New("Erro ao buscar os seguidores do usuário")
			}
			seguidores = seguidoresCarregados

		case seguindoCarregados := <-canalSeguindo:
			if seguindoCarregados == nil {
				return Usuario{}, errors.New("Erro ao buscar quer o usuário esta seguindo")
			}
			seguindo = seguindoCarregados

		case publicacoesCarregadas := <-canalPublicacoes:
			if publicacoesCarregadas == nil {
				return Usuario{}, errors.New("Erro ao buscar publicações do usuário")
			}
			publicacoes = publicacoesCarregadas

		}
	}

	usuario.Seguidores = seguidores
	usuario.Seguindo = seguindo
	usuario.Publicacoes = publicacoes

	return usuario, nil
}

// BuscarDadosDoUsuario chama a api para buscar os dados base do usuario
func BuscarDadosDoUsuario(canal chan<- Usuario, usuarioID uint64, r *http.Request) {
	url := fmt.Sprintf("%s/usuarios/%d", config.ApiURL, usuarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		canal <- Usuario{}
		return
	}
	defer response.Body.Close()

	var usuario Usuario
	if erro := json.NewDecoder(response.Body).Decode(&usuario); erro != nil {
		canal <- Usuario{}
		return
	}
	canal <- usuario
}

// BuscarSeguidores chama a api para buscar os seguidores do usuario
func BuscarSeguidores(canal chan<- []Usuario, usuarioID uint64, r *http.Request) {
	url := fmt.Sprintf("%s/usuarios/%d/seguidores", config.ApiURL, usuarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		canal <- nil
		return
	}
	defer response.Body.Close()

	var seguidores []Usuario
	if erro := json.NewDecoder(response.Body).Decode(&seguidores); erro != nil {
		canal <- nil
		return
	}

	if seguidores == nil {
		canal <- make([]Usuario, 0)
		return
	}

	canal <- seguidores

}

// BuscarSeguindo chama a api para buscar quem o usuario segue
func BuscarSeguindo(canal chan<- []Usuario, usuarioID uint64, r *http.Request) {
	url := fmt.Sprintf("%s/usuarios/%d/seguindo", config.ApiURL, usuarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		canal <- nil
		return
	}
	defer response.Body.Close()

	var seguindo []Usuario
	if erro := json.NewDecoder(response.Body).Decode(&seguindo); erro != nil {
		canal <- nil
		return
	}

	if seguindo == nil {
		canal <- make([]Usuario, 0)
		return
	}

	canal <- seguindo
}

// BuscarPublicacoes chama a api para buscar as publicacoes do usuario
func BuscarPublicacoes(canal chan<- []Publicacao, usuarioID uint64, r *http.Request) {
	url := fmt.Sprintf("%s/usuarios/%d/publicacoes", config.ApiURL, usuarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		canal <- nil
		return
	}
	defer response.Body.Close()

	var publicacoes []Publicacao
	if erro := json.NewDecoder(response.Body).Decode(&publicacoes); erro != nil {
		canal <- nil
		return
	}

	if publicacoes == nil {
		canal <- make([]Publicacao, 0)
		return
	}

	canal <- publicacoes
}
