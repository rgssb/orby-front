
const formularioCadastro = document.getElementById("form-cadastro");
const senhaCadastro = document.getElementById("senha");
const confirmarSenhaCadastro = document.getElementById("confirmar-senha");
formularioCadastro.addEventListener("submit", criarUsuario);

function validarConfirmacaoSenha() {
    const senhasDiferentes = confirmarSenhaCadastro.value !== "" &&
        senhaCadastro.value !== confirmarSenhaCadastro.value;
    confirmarSenhaCadastro.setCustomValidity(senhasDiferentes ? "As senhas precisam ser iguais." : "");
}

senhaCadastro.addEventListener("input", validarConfirmacaoSenha);
confirmarSenhaCadastro.addEventListener("input", validarConfirmacaoSenha);

function mostrarMensagem(mensagem, sucesso) {
    const feedback = document.getElementById("form-message");
    feedback.textContent = mensagem;
    feedback.hidden = !mensagem;
    feedback.classList.toggle("alert-success", sucesso);
    feedback.classList.toggle("alert-danger", !sucesso);
}

async function criarUsuario(evento) {
    evento.preventDefault();

    validarConfirmacaoSenha();
    formularioCadastro.classList.add("was-validated");
    if (!formularioCadastro.checkValidity()) {
        window.OrbyMascot.error();
        formularioCadastro.querySelector(":invalid").focus();
        return;
    }

    const senha = senhaCadastro.value;
    const dados = new URLSearchParams({
        nome: document.getElementById("nome").value,
        senha: senha,
        email: document.getElementById("email").value,
        nick: document.getElementById("nick").value,
        aceitouTermos: document.getElementById("aceitou-termos").checked ? "true" : "false",
    });

    try {
        const resposta = await fetch("/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: dados,
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.erro || "Não foi possível cadastrar o usuário.");
        }

        window.OrbyMascot.success();
        mostrarMensagem("", true);
        Swal.fire({
            icon: "success",
            title: "Conta criada!",
            text: "Seu cadastro foi realizado com sucesso.",
            customClass: { popup: "swal-orby" },
        }).then(() => window.location.assign("/login"));
    } catch (erro) {
        window.OrbyMascot.error();
        mostrarMensagem(erro.message, false);
    }
}