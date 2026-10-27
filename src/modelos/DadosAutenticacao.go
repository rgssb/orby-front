package modelos

// DadosAutenticacao contem o id e o token do usuario autenticado
type DadosAutenticacao struct {
	ID    string `json:"id"`
	Token string `json:"token"`
}
