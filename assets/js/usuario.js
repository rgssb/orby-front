$(document).on('click', '#seguir', function () {
    alternarSeguir(this, 'seguir', 'Erro ao seguir o usuario');
});

$(document).on('click', '#parar-de-seguir', function () {
    alternarSeguir(this, 'parar-de-seguir', 'Erro ao parar de seguir o usuario');
});

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
