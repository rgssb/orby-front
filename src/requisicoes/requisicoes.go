package requisicoes

import (
	"io"
	"net/http"
	"orby/web/src/cookies"
)

// FazerRequisicaoComAutenticacao encaminha uma requisição à API usando o token do cookie.
func FazerRequisicaoComAutenticacao(r *http.Request, metodo, url string, corpo io.Reader) (*http.Response, error) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		return nil, erro
	}

	requisicao, erro := http.NewRequestWithContext(r.Context(), metodo, url, corpo)
	if erro != nil {
		return nil, erro
	}
	requisicao.Header.Set("Authorization", "Bearer "+dados["token"])
	if corpo != nil {
		requisicao.Header.Set("Content-Type", "application/json")
	}

	return http.DefaultClient.Do(requisicao)
}
