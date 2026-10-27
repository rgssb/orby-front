package cookies

import (
	"net/http"
	"time"
	"orby/web/src/config"

	"github.com/gorilla/securecookie"
)

var s *securecookie.SecureCookie

// duracaoDaSessao acompanha a validade do token da API (6 horas)
const duracaoDaSessao = 6 * time.Hour

// Configurar utiliza as variaveis de ambiente paraa criacao de SecureCookie
func Configurar() {
	s = securecookie.New(config.HashKey, config.BlockKey)
}

// Salvar registra as informações de autenticação
func Salvar(w http.ResponseWriter, ID, token string) error {
	dados := map[string]string{
		"id":    ID,
		"token": token,
	}

	dadosCodificados, erro := s.Encode("dados", dados)
	if erro != nil {
		return erro
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "dados",
		Value:    dadosCodificados,
		Path:     "/",
		HttpOnly: true,
		Secure:   config.CookieSeguro,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(duracaoDaSessao / time.Second),
	})

	return nil
}

//Ler retorna os valores armazenados no cookie
func Ler(r *http.Request) (map[string]string, error) {
	cookie, erro := r.Cookie("dados")
	if erro != nil {
		return nil, erro
	}


	valores := make(map[string]string)
	if erro = s.Decode("dados", cookie.Value, &valores); erro != nil{
		return nil, erro
	}

	return valores, nil
}

//Deletar deleta as informacoes de login do usuario de dentro do cookie
func Deletar(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "dados",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   config.CookieSeguro,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}