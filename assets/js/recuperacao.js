(function () {
    const mensagemIndisponivel = "Os servidores encontram-se em estado de erro, pedimos desculpas.";

    function mostrar(mensagem, sucesso) {
        const aviso = document.getElementById("form-message");
        aviso.textContent = mensagem;
        aviso.hidden = !mensagem;
        aviso.classList.toggle("alert-success", sucesso);
        aviso.classList.toggle("alert-danger", !sucesso);
    }

    async function enviar(url, dados) {
        const resposta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(dados),
            credentials: "same-origin",
        });
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(resposta.status >= 500 ? mensagemIndisponivel : (erro.erro || "Não foi possível concluir o pedido."));
        }
    }

    function ligar(id, tratar) {
        const formulario = document.getElementById(id);
        if (!formulario) return;
        formulario.addEventListener("submit", async function (evento) {
            evento.preventDefault();
            formulario.classList.add("was-validated");
            if (!formulario.checkValidity()) return;
            const botao = formulario.querySelector("button[type=submit]");
            botao.disabled = true;
            try {
                await tratar(formulario);
            } catch (erro) {
                if (window.OrbyMascot) window.OrbyMascot.error();
                mostrar(erro instanceof TypeError ? mensagemIndisponivel : erro.message, false);
                botao.disabled = false;
            }
        });
    }

    ligar("esqueci-senha", async function () {
        await enviar("/esqueci-senha", { email: document.getElementById("email").value });
        mostrar("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha em instantes.", true);
    });

    ligar("redefinir-senha", async function () {
        const nova = document.getElementById("nova").value;
        if (nova !== document.getElementById("confirmar").value) {
            throw new Error("As senhas não coincidem.");
        }
        await enviar("/redefinir-senha", { token: document.getElementById("token").value, nova: nova });
        mostrar("Senha alterada! Redirecionando para o login...", true);
        setTimeout(function () { window.location.assign("/login"); }, 1800);
    });
})();
