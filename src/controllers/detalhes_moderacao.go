package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/requisicoes"
	"orby/web/src/utils"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

func CarregarDetalhesDeDenuncias(w http.ResponseWriter, r *http.Request) {
	alvo, erro := strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)
	if erro != nil || alvo == 0 {
		utils.PaginaNaoEncontrada(w, r)
		return
	}
	pagina := 1
	if valor := r.URL.Query().Get("pagina"); valor != "" {
		pagina, erro = strconv.Atoi(valor)
		if erro != nil || pagina < 1 || pagina > 100000 {
			utils.PaginaDeErro(w, http.StatusBadRequest, "Página inválida", "O endereço informado não é válido.")
			return
		}
	}
	destino := fmt.Sprintf("%s/admin/usuarios/%d/denuncias?deslocamento=%d", config.ApiURL, alvo, (pagina-1)*15)
	resposta, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, destino, nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer resposta.Body.Close()
	if sessaoExpirada(w, r, resposta) {
		return
	}
	if resposta.StatusCode != http.StatusOK {
		paginaDeErroDaAPI(w, resposta)
		return
	}
	var dados struct {
		UsuarioID uint64
		Denuncias []struct {
			Tipo         string
			AlvoID       uint64
			PublicacaoID uint64
			Motivo       string
			Resolvida    bool
			Total        uint64
			UltimaEm     time.Time
		}
		Acoes []struct {
			Acao, Admin string
			Data        time.Time
		}
		Proxima, Anterior string
	}
	if erro = json.NewDecoder(resposta.Body).Decode(&dados); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	dados.UsuarioID = alvo
	if len(dados.Denuncias) > 15 {
		dados.Denuncias = dados.Denuncias[:15]
		dados.Proxima = fmt.Sprintf("/admin/usuarios/%d/denuncias?pagina=%d", alvo, pagina+1)
	}
	if pagina > 1 {
		dados.Anterior = fmt.Sprintf("/admin/usuarios/%d/denuncias?pagina=%d", alvo, pagina-1)
	}
	utils.ExecutarTemplate(w, "detalhes-denuncias.html", dados)
}
