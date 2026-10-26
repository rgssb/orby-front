package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"webapp/src/config"
	"webapp/src/cookies"
	"webapp/src/requisicoes"
	"webapp/src/respostas"

	"github.com/gorilla/mux"
)

// comentariosPorPagina é quantos comentários aparecem por vez
const comentariosPorPagina = 10

// BuscarComentarios devolve os comentários de uma publicação, junto com o ID de quem está logado
func BuscarComentarios(w http.ResponseWriter, r *http.Request) {
	publicacaoID, erro := strconv.ParseUint(mux.Vars(r)["publicacaoId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Publicação inválida.")
		return
	}

	// A API é consultada com um comentário a mais para descobrir se existem outros depois
	limite, _ := strconv.Atoi(r.URL.Query().Get("limite"))
	if limite < 1 {
		limite = comentariosPorPagina
	}
	if limite > 499 {
		limite = 499
	}
	deslocamento, _ := strconv.Atoi(r.URL.Query().Get("deslocamento"))
	if deslocamento < 0 {
		deslocamento = 0
	}

	url := fmt.Sprintf("%s/publicacoes/%d/comentarios?limite=%d&deslocamento=%d", config.ApiURL, publicacaoID, limite+1, deslocamento)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	var comentarios []json.RawMessage
	if erro = json.NewDecoder(response.Body).Decode(&comentarios); erro != nil {
		respostas.Erro(w, http.StatusBadGateway, "Resposta inválida da API.")
		return
	}

	temMais := len(comentarios) > limite
	if temMais {
		comentarios = comentarios[:limite]
	}

	dados, _ := cookies.Ler(r)
	usuarioID, _ := strconv.ParseUint(dados["id"], 10, 64)

	respostas.JSON(w, http.StatusOK, struct {
		UsuarioID   uint64            `json:"usuarioId"`
		Comentarios []json.RawMessage `json:"comentarios"`
		TemMais     bool              `json:"temMais"`
	}{usuarioID, comentarios, temMais})
}

// CriarComentario envia um novo comentário à API
func CriarComentario(w http.ResponseWriter, r *http.Request) {
	publicacaoID, erro := strconv.ParseUint(mux.Vars(r)["publicacaoId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Publicação inválida.")
		return
	}

	if erro = r.ParseForm(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Formulário inválido.")
		return
	}

	corpo, _ := json.Marshal(map[string]string{"conteudo": r.FormValue("conteudo")})
	url := fmt.Sprintf("%s/publicacoes/%d/comentarios", config.ApiURL, publicacaoID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodPost, url, bytes.NewBuffer(corpo))
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// DeletarComentario pede à API a exclusão de um comentário
func DeletarComentario(w http.ResponseWriter, r *http.Request) {
	comentarioID, erro := strconv.ParseUint(mux.Vars(r)["comentarioId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Comentário inválido.")
		return
	}

	url := fmt.Sprintf("%s/comentarios/%d", config.ApiURL, comentarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodDelete, url, nil)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// AtualizarComentario envia o texto editado de um comentário à API
func AtualizarComentario(w http.ResponseWriter, r *http.Request) {
	comentarioID, erro := strconv.ParseUint(mux.Vars(r)["comentarioId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Comentário inválido.")
		return
	}

	if erro = r.ParseForm(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Formulário inválido.")
		return
	}

	corpo, _ := json.Marshal(map[string]string{"conteudo": r.FormValue("conteudo")})
	repassarComentario(w, r, http.MethodPut, fmt.Sprintf("/comentarios/%d", comentarioID), bytes.NewBuffer(corpo))
}

// CurtirComentario curte um comentário
func CurtirComentario(w http.ResponseWriter, r *http.Request) {
	comentarioID, erro := strconv.ParseUint(mux.Vars(r)["comentarioId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Comentário inválido.")
		return
	}
	repassarComentario(w, r, http.MethodPost, fmt.Sprintf("/comentarios/%d/curtir", comentarioID), nil)
}

// DescurtirComentario remove a curtida de um comentário
func DescurtirComentario(w http.ResponseWriter, r *http.Request) {
	comentarioID, erro := strconv.ParseUint(mux.Vars(r)["comentarioId"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Comentário inválido.")
		return
	}
	repassarComentario(w, r, http.MethodPost, fmt.Sprintf("/comentarios/%d/descurtir", comentarioID), nil)
}

func repassarComentario(w http.ResponseWriter, r *http.Request, metodo, caminho string, corpo io.Reader) {
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, metodo, config.ApiURL+caminho, corpo)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// limiteDaFoto é o tamanho máximo da foto de perfil aceito (a API também confere)
const limiteDaFoto = 2 << 20

// BuscarFotoDoUsuario repassa a foto de perfil guardada na API (o navegador não conhece o token)
func BuscarFotoDoUsuario(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)
	if erro != nil {
		http.NotFound(w, r)
		return
	}

	url := fmt.Sprintf("%s/usuarios/%d/foto", config.ApiURL, usuarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		http.Error(w, "indisponível", http.StatusServiceUnavailable)
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", response.Header.Get("Content-Type"))
	// A URL carrega a versão da foto (?v=), então o navegador pode guardar a imagem
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.WriteHeader(http.StatusOK)
	io.Copy(w, response.Body)
}

// SalvarFotoDoUsuario envia a nova foto de perfil (corpo bruto da imagem) para a API
func SalvarFotoDoUsuario(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	imagem, erro := io.ReadAll(http.MaxBytesReader(w, r.Body, limiteDaFoto))
	if erro != nil {
		respostas.Erro(w, http.StatusRequestEntityTooLarge, "A foto deve ter no máximo 2 MB.")
		return
	}

	url := fmt.Sprintf("%s/usuarios/%s/foto", config.ApiURL, dados["id"])
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodPost, url, bytes.NewReader(imagem))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, "Não foi possível enviar a foto.")
		return
	}
	requisicao.Header.Set("Authorization", "Bearer "+dados["token"])
	requisicao.Header.Set("Content-Type", r.Header.Get("Content-Type"))

	response, erro := http.DefaultClient.Do(requisicao)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// RemoverFotoDoUsuario apaga a foto de perfil de quem está logado
func RemoverFotoDoUsuario(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	url := fmt.Sprintf("%s/usuarios/%s/foto", config.ApiURL, dados["id"])
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodDelete, url, nil)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// BuscarBannerDoUsuario repassa o banner guardado na API (o navegador não conhece o token)
func BuscarBannerDoUsuario(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)
	if erro != nil {
		http.NotFound(w, r)
		return
	}

	url := fmt.Sprintf("%s/usuarios/%d/banner", config.ApiURL, usuarioID)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, url, nil)
	if erro != nil {
		http.Error(w, "indisponível", http.StatusServiceUnavailable)
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", response.Header.Get("Content-Type"))
	// A URL carrega a versão do banner (?v=), então o navegador pode guardar a imagem
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.WriteHeader(http.StatusOK)
	io.Copy(w, response.Body)
}

// SalvarBannerDoUsuario envia o novo banner (corpo bruto da imagem) para a API
func SalvarBannerDoUsuario(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	imagem, erro := io.ReadAll(http.MaxBytesReader(w, r.Body, limiteDaFoto))
	if erro != nil {
		respostas.Erro(w, http.StatusRequestEntityTooLarge, "O banner deve ter no máximo 2 MB.")
		return
	}

	url := fmt.Sprintf("%s/usuarios/%s/banner", config.ApiURL, dados["id"])
	requisicao, erro := http.NewRequestWithContext(r.Context(), http.MethodPost, url, bytes.NewReader(imagem))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, "Não foi possível enviar o banner.")
		return
	}
	requisicao.Header.Set("Authorization", "Bearer "+dados["token"])
	requisicao.Header.Set("Content-Type", r.Header.Get("Content-Type"))

	response, erro := http.DefaultClient.Do(requisicao)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// RemoverBannerDoUsuario apaga a banner de quem está logado
func RemoverBannerDoUsuario(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	url := fmt.Sprintf("%s/usuarios/%s/banner", config.ApiURL, dados["id"])
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodDelete, url, nil)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}

// DefinirTemaDoBanner escolhe um dos temas prontos do banner (corpo JSON {"preset": "..."})
func DefinirTemaDoBanner(w http.ResponseWriter, r *http.Request) {
	dados, erro := cookies.Ler(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, "Sua sessão expirou. Entre novamente.")
		return
	}

	corpo, erro := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<10))
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}

	url := fmt.Sprintf("%s/usuarios/%s/banner/tema", config.ApiURL, dados["id"])
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodPost, url, bytes.NewReader(corpo))
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, "Servidores indisponíveis.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		respostas.TratarStatusCodeDeErro(w, response)
		return
	}

	respostas.JSON(w, response.StatusCode, nil)
}
