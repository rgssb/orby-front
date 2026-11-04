package modelos

import "time"

// Publicacao representa uma publicação feita por um usuário.
type Publicacao struct {
	ID                  uint64              `json:"id,omitempty"`
	Titulo              string              `json:"titulo,omitempty"`
	Conteudo            string              `json:"conteudo,omitempty"`
	AutorID             uint64              `json:"autorId,omitempty"`
	AutorNick           string              `json:"autorNick,omitempty"`
	AutorSuspenso       bool                `json:"autorSuspenso"`
	AutorFotoVersao     uint64              `json:"autorFotoVersao"`
	Curtidas            uint64              `json:"curtidas"`
	Comentarios         uint64              `json:"comentarios"`
	CurtidoPorUsuario   bool                `json:"curtidoPorUsuario"`
	SalvoPorUsuario     bool                `json:"salvoPorUsuario"`
	CriadaEm            time.Time           `json:"criadaEm,omitempty"`
	Editado             bool                `json:"editado"`
	Imagens             int                 `json:"imagens"`
	DescricoesImagens   []string            `json:"descricoesImagens,omitempty"`
	Reposts             uint64              `json:"reposts"`
	RepostadoPorUsuario bool                `json:"repostadoPorUsuario"`
	RepostDe            *PublicacaoOriginal `json:"repostDe,omitempty"`
	AcessoModeracao     bool                `json:"acessoModeracao"`
	Felas               bool                `json:"felas"`
	Enquete             *Enquete            `json:"enquete,omitempty"`
}

type Enquete struct {
	Titulo     string         `json:"titulo,omitempty"`
	Opcoes     []OpcaoEnquete `json:"opcoes"`
	EncerraEm  *time.Time     `json:"encerraEm,omitempty"`
	Encerrada  bool           `json:"encerrada"`
	Votou      bool           `json:"votou"`
	TotalVotos uint64         `json:"totalVotos"`
}

type OpcaoEnquete struct {
	ID    uint64 `json:"id"`
	Texto string `json:"texto"`
	Votos uint64 `json:"votos"`
	Minha bool   `json:"minha"`
}

// PublicacaoOriginal é a publicação repostada; Indisponivel vale quando quem vê não tem acesso a ela.
type PublicacaoOriginal struct {
	ID                uint64    `json:"id"`
	AutorID           uint64    `json:"autorId"`
	AutorNick         string    `json:"autorNick"`
	AutorFotoVersao   uint64    `json:"autorFotoVersao"`
	Titulo            string    `json:"titulo"`
	Conteudo          string    `json:"conteudo"`
	CriadaEm          time.Time `json:"criadaEm"`
	Imagens           int       `json:"imagens"`
	DescricoesImagens []string  `json:"descricoesImagens,omitempty"`
	Indisponivel      bool      `json:"indisponivel"`
}
