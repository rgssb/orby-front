const formularioLogin = document.getElementById("login");
const mensagemServidorIndisponivel = "Nossos servidores estão temporariamente indisponíveis. Pedimos desculpas pelo transtorno.";
const botaoReenviar = document.getElementById("reenviar-confirmacao");
formularioLogin.addEventListener("submit", realizarLogin);

botaoReenviar.addEventListener("click", async function () {
    botaoReenviar.disabled = true;
    try {
        const resposta = await fetch("/reenviar-confirmacao", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ email: document.getElementById("email").value }),
        });
        const corpo = await resposta.json().catch(() => ({}));
        mostrarMensagem(resposta.ok ? corpo.mensagem : (corpo.erro || mensagemServidorIndisponivel), resposta.ok);
    } catch (erro) {
        mostrarMensagem(mensagemServidorIndisponivel, false);
    }
    botaoReenviar.disabled = false;
});

if (new URLSearchParams(window.location.search).get("sessao") === "expirada") {
    mostrarMensagem("Sua sessão expirou. Entre novamente para continuar.", false);
}

function mostrarMensagem(mensagem, sucesso) {
    const feedback = document.getElementById("form-message");
    feedback.textContent = mensagem;
    feedback.hidden = !mensagem;
    feedback.classList.toggle("alert-success", sucesso);
    feedback.classList.toggle("alert-danger", !sucesso);
}

async function realizarLogin(evento) {
    evento.preventDefault();

    formularioLogin.classList.add("was-validated");
    if (!formularioLogin.checkValidity()) {
        window.OrbyMascot.error();
        formularioLogin.querySelector(":invalid").focus();
        return;
    }

    botaoReenviar.hidden = true;
    const dados = new URLSearchParams({
        email: document.getElementById("email").value,
        senha: document.getElementById("senha").value,
    });

    try {
        const resposta = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: dados,
            credentials: "same-origin",
        });

        if (!resposta.ok) {
            if (resposta.status >= 500) {
                throw new Error(mensagemServidorIndisponivel);
            }

            const erro = await resposta.json().catch(() => ({}));
            botaoReenviar.hidden = resposta.status !== 403;
            throw new Error(erro.erro || "E-mail ou senha incorretos.");
        }

        window.OrbyMascot.success();
        window.location.assign("/home");
    } catch (erro) {
        window.OrbyMascot.error();
        const mensagem = erro instanceof TypeError
            ? mensagemServidorIndisponivel
            : erro.message;
        mostrarMensagem(mensagem, false);
    }
}
