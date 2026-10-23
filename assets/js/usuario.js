$(document).on('click', '#seguir', function () {
    alternarSeguir(this, 'seguir', 'Erro ao seguir o usuario');
});

$(document).on('click', '#parar-de-seguir', function () {
    alternarSeguir(this, 'parar-de-seguir', 'Erro ao parar de seguir o usuario');
});

$('#editar-usuario').on('submit', editar);

$('#atualizar-senha').on('submit', atualizarSenha);

function alternarSeguir(botao, acao, mensagemErro) {
    const usuarioId = $(botao).data('usuario');
    $(botao).prop('disabled', true);

    $.ajax({
        url: `/usuarios/${usuarioId}/${acao}`,
        method: "POST",
    }).done(function() {
        atualizarPerfil();
    }).fail(function() {
        Swal.fire("Ops...", mensagemErro, "error");
        $(botao).prop('disabled', false);
    });
}

// Atualiza só o cartão do perfil e a lista de seguidores, sem recarregar a página
function atualizarPerfil() {
    $.get(window.location.href).done(function(html) {
        const novo = $('<div>').append($.parseHTML(html));
        $('.profile-card').replaceWith(novo.find('.profile-card'));
        $('#modal-seguidores .modal-body').html(novo.find('#modal-seguidores .modal-body').html());
    }).fail(function() {
        window.location.reload();
    });
}

// Edita o perfil do usuário
function editar(evento) {
    evento.preventDefault();

    $.ajax({
        url: "/editar-usuario",
        method: "PUT",
        data: {
            nome: $('#nome').val(),
            email: $('#email').val(),
            nick: $('#nick').val(),
        }
    }).done(function() {
        Swal.fire("Sucesso", "Perfil atualizado com sucesso", "success")
            .then(function() {
                window.location.assign("/perfil");
            });
    }).fail(function(resposta) {
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        Swal.fire("Ops...", erro || "Erro ao atualizar o perfil", "error");
    });
}

// Atualiza a senha do usuario
function atualizarSenha(evento) {
    evento.preventDefault();

    if ($('#nova-senha').val() !== $('#confirmar-senha').val()) {
        Swal.fire("Ops...", "As senhas não coincidem!", "warning");
        return;
    }

    $.ajax({
        url: "/atualizar-senha",
        method: "POST",
        data: {
            atual: $('#senha-atual').val(),
            nova: $('#nova-senha').val(),
        }
    }).done(function() {
        Swal.fire("Sucesso", "Senha atualizada com sucesso", "success")
            .then(function() {
                window.location.assign("/perfil");
            });
    }).fail(function(resposta) {
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        Swal.fire("Ops...", erro || "Erro ao atualizar a senha", "error");
    });
}
