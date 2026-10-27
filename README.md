# Orby Web

Front do **Orby**: servidor Go que entrega as páginas (jQuery + JS puro) e faz proxy autenticado para a API ([`orby-back`](https://github.com/rgssb/orby-back)).

## Rodando com Docker

O `docker-compose.yml` fica no `orby-back` e sobe MySQL + API + front juntos. Veja o README de lá.

## Rodando sem Docker

1. Suba a API (`orby-back`).
2. Copie `.env.example` para `.env` e preencha (`API_URL` aponta para a API).
3. `go run .`

## Testes

`go test ./...`
