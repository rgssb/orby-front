# Orby Web

Front do Orby: servidor Go que entrega as páginas e faz proxy autenticado para a API (`orby-back`).

## Rodando

1. Suba a API (`orby-back`).
2. Copie `.env.example` para `.env` e preencha (`API_URL` aponta para a API).
3. `go run .`

## Testes

`go test ./...`
