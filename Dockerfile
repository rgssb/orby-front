FROM golang:1.26-alpine AS build
ENV GOTOOLCHAIN=auto CGO_ENABLED=0
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /orby-web .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 orby
WORKDIR /app
COPY --from=build /orby-web .
COPY assets ./assets
COPY views ./views
USER orby
EXPOSE 3000
CMD ["./orby-web"]
