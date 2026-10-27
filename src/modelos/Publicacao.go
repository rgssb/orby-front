package modelos

import "time"

// Publicacao representa uma publicação feita por um usuário.
type Publicacao struct {
	ID                  uint64              `json:"id,omitempty"`
	Titulo              string              `json:"titulo,omitempty"`
	Conteudo            string              `json:"conteudo,omitempty"`
	AutorID             uint64              `json:"autorId,omitempty"`
	AutorNick           string              `json:"autorNick,omitempty"`
	AutorFotoVersao     uint64              `json:"autorFotoVersao"`
	Curtidas            uint64              `json:"curtidas"`
	Comentarios         uint64              `json:"comentarios"`
	CurtidoPorUsuario   bool                `json:"curtidoPorUsuario"`
	SalvoPorUsuario     bool                `json:"salvoPorUsuario"`
	CriadaEm            time.Time           `json:"criadaEm,omitempty"`
	Editado             bool                `json:"editado"`
	TemImagem           bool                `json:"temImagem"`
	Reposts             uint64              `json:"reposts"`
	RepostadoPorUsuario bool                `json:"repostadoPorUsuario"`
	RepostDe            *PublicacaoOriginal `json:"repostDe,omitempty"`
}

// PublicacaoOriginal é a publicação repostada; Indisponivel vale quando quem vê não tem acesso a ela.
type PublicacaoOriginal struct {
	ID              uint64    `json:"id"`
	AutorID         uint64    `json:"autorId"`
	AutorNick       string    `json:"autorNick"`
	AutorFotoVersao uint64    `json:"autorFotoVersao"`
	Titulo          string    `json:"titulo"`
	Conteudo        string    `json:"conteudo"`
	CriadaEm        time.Time `json:"criadaEm"`
	TemImagem       bool      `json:"temImagem"`
	Indisponivel    bool      `json:"indisponivel"`
}
