package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"orby/web/src/config"
	"orby/web/src/requisicoes"
	"orby/web/src/utils"
	"strconv"
	"time"

	"github.com/gorilla/mux"
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

// ConsultarDenuncias encaminha a consulta dos alvos já denunciados.
func ConsultarDenuncias(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Alvos []struct {
			Tipo   string `json:"tipo"`
			AlvoID uint64 `json:"alvoId"`
		} `json:"alvos"`
	}
	repassarCorpo(w, r, &corpo, http.MethodPost, "/denuncias/consulta")
}

// CarregarPaginaDeDenuncias mostra o painel da administração; quem não é administrador vê a página como inexistente
func CarregarPaginaDeDenuncias(w http.ResponseWriter, r *http.Request) {
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, config.ApiURL+"/admin/painel", nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer response.Body.Close()

	if sessaoExpirada(w, r, response) {
		return
	}
	if response.StatusCode != http.StatusOK {
		utils.PaginaDeErro(w, http.StatusNotFound, "Página não encontrada", "A página que você procura não existe.")
		return
	}
	var painel struct {
		Denunciados []struct {
			UsuarioID   uint64         `json:"usuarioId"`
			Nick        string         `json:"nick"`
			Nome        string         `json:"nome"`
			Total       uint64         `json:"total"`
			Nivel       string         `json:"nivel"`
			Suspenso    bool           `json:"suspenso"`
			Perfis      uint64         `json:"perfis"`
			Publicacoes uint64         `json:"publicacoes"`
			Comentarios uint64         `json:"comentarios"`
			Motivos     map[string]int `json:"motivos"`
			UltimaEm    time.Time      `json:"ultimaEm"`
		} `json:"denunciados"`
		Suspensos []struct {
			UsuarioID  uint64    `json:"usuarioId"`
			Nome       string    `json:"nome"`
			Nick       string    `json:"nick"`
			SuspensaEm time.Time `json:"suspensaEm"`
		} `json:"suspensos"`
		Estatisticas struct {
			Usuarios          uint64 `json:"usuarios"`
			Publicacoes       uint64 `json:"publicacoes"`
			Comentarios       uint64 `json:"comentarios"`
			Suspensos         uint64 `json:"suspensos"`
			PerfisDenunciados uint64 `json:"perfisDenunciados"`
			NovosNaSemana     uint64 `json:"novosNaSemana"`
		} `json:"estatisticas"`
	}
	if erro = json.NewDecoder(response.Body).Decode(&painel); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	utils.ExecutarTemplate(w, "denuncias.html", painel)
}

// CarregarListaAdministrativa exibe uma página da listagem escolhida.
func CarregarListaAdministrativa(w http.ResponseWriter, r *http.Request) {
	tipo := mux.Vars(r)["tipo"]
	titulos := map[string]string{
		"contas": "Contas", "novas": "Contas novas dessa semana",
		"publicacoes": "Publicações", "comentarios": "Comentários",
		"denunciadas": "Contas com denúncias", "suspensas": "Contas suspensas",
	}
	titulo, existe := titulos[tipo]
	if !existe {
		utils.PaginaNaoEncontrada(w, r)
		return
	}
	pagina := 1
	if valor := r.URL.Query().Get("pagina"); valor != "" {
		n, erro := strconv.Atoi(valor)
		if erro != nil || n < 1 || n > 100000 {
			utils.PaginaDeErro(w, http.StatusBadRequest, "Página inválida", "O endereço informado não é válido.")
			return
		}
		pagina = n
	}
	busca := r.URL.Query().Get("q")
	endereco := fmt.Sprintf("%s/admin/lista/%s?q=%s&deslocamento=%d", config.ApiURL, tipo, url.QueryEscape(busca), (pagina-1)*15)
	response, erro := requisicoes.FazerRequisicaoComAutenticacao(r, http.MethodGet, endereco, nil)
	if erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	defer response.Body.Close()
	if sessaoExpirada(w, r, response) {
		return
	}
	if response.StatusCode != http.StatusOK {
		paginaDeErroDaAPI(w, response)
		return
	}
	type itemAdministrativo struct {
		ID, UsuarioID                uint64
		Nome, Nick, Titulo, Conteudo string
		Data                         time.Time
		Total                        uint64
		Suspenso                     bool
	}
	var itens []itemAdministrativo
	if erro = json.NewDecoder(response.Body).Decode(&itens); erro != nil {
		utils.ServidorIndisponivel(w)
		return
	}
	temMais := len(itens) > 15
	if temMais {
		itens = itens[:15]
	}
	dados := struct {
		Tipo, Titulo, Busca string
		Itens               []itemAdministrativo
		Proxima             string
	}{Tipo: tipo, Titulo: titulo, Busca: busca, Itens: itens}
	if temMais {
		dados.Proxima = fmt.Sprintf("/admin/lista/%s?q=%s&pagina=%d", tipo, url.QueryEscape(busca), pagina+1)
	}
	utils.ExecutarTemplate(w, "admin-lista.html", dados)
}
