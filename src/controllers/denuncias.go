package controllers

import (
	"encoding/json"
	"net/http"
	"orby/web/src/config"
	"orby/web/src/requisicoes"
	"orby/web/src/utils"
	"time"
)

// Denunciar repassa a denúncia de um perfil, publicação ou comentário
func Denunciar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Tipo   string `json:"tipo"`
		AlvoID uint64 `json:"alvoId"`
		Motivo string `json:"motivo"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPost, "/denuncias")
}

// CarregarPaginaDeDenuncias mostra os perfis denunciados; quem não é administrador vê a página como inexistente
func CarregarPaginaDeDenuncias(w http.ResponseWriter, r *http.Request) {
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, config.ApiURL+"/admin/denuncias", nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		utils.PaginaDeErro(w, http.StatusNotFound, "Página não encontrada", "A página que você procura não existe.")
		return
	}
	var perfis []struct {
		UsuarioID   uint64         `json:"usuarioId"`
		Nick        string         `json:"nick"`
		Nome        string         `json:"nome"`
		Total       uint64         `json:"total"`
		Nivel       string         `json:"nivel"`
		Perfis      uint64         `json:"perfis"`
		Publicacoes uint64         `json:"publicacoes"`
		Comentarios uint64         `json:"comentarios"`
		Motivos     map[string]int `json:"motivos"`
		UltimaEm    time.Time      `json:"ultimaEm"`
	}
	if erro = json.NewDecoder(response.Body).Decode(&perfis); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	utils.ExecutarTemplate(w, "denuncias.html", perfis)
}
