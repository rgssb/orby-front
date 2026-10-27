(async function () {
    const aviso = document.getElementById("form-message");
    function mostrar(mensagem, sucesso) {
        aviso.textContent = mensagem;
        aviso.classList.toggle("alert-success", sucesso);
        aviso.classList.toggle("alert-danger", !sucesso);
        if (window.OrbyMascot) sucesso ? window.OrbyMascot.success() : window.OrbyMascot.error();
    }

    const token = document.getElementById("token").value;
    if (!token) {
        mostrar("Link de confirmação inválido.", false);
        return;
    }

    try {
        const resposta = await fetch("/confirmar-email", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: token }),
        });
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(resposta.status >= 500 ? "Os servidores encontram-se em estado de erro, pedimos desculpas." : (erro.erro || "Link de confirmação inválido."));
        }
        mostrar("E-mail confirmado! Redirecionando para o login...", true);
        setTimeout(function () { window.location.assign("/login"); }, 1800);
    } catch (erro) {
        mostrar(erro instanceof TypeError ? "Os servidores encontram-se em estado de erro, pedimos desculpas." : erro.message, false);
    }
})();
