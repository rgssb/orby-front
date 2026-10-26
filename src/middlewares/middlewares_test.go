package middlewares

import (
	"encoding/base64"
	"fmt"
	"testing"
	"time"
)

func tokenComExp(exp int64) string {
	corpo := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"exp":%d}`, exp)))
	return "x." + corpo + ".y"
}

func TestTokenExpirado(t *testing.T) {
	agora := time.Unix(1000, 0)
	casos := map[string]bool{
		tokenComExp(999):  true,
		tokenComExp(1000): true,
		tokenComExp(1001): false,
		"lixo":            false,
		"a.%%%.c":         false,
	}
	for token, esperado := range casos {
		if TokenExpirado(token, agora) != esperado {
			t.Errorf("TokenExpirado(%q) != %v", token, esperado)
		}
	}
}
