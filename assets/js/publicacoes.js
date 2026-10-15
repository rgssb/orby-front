$('#nova-publicacao').on('submit', criarpublicacao);

$(document).on('click', '.curtir-publicacao', curtirPublicacao);

$('#atualizar').on('click', atualizarPublicacao);

$(document).on('click', '.deletar-publicacao', deletarPublicacao);

function criarpublicacao(evento) {
    evento.preventDefault();
    
    $.ajax({
        url: "/publicacoes",
        method: "POST",
        data: {
            titulo: $('#titulo-publicacao').val(),
            conteudo: $('#conteudo-publicacao').val()
        }
    }).done(function() {
        window.location = "/home";
    }).fail(function() {
        alert("Erro ao criar publicação!");
    });

}

function curtirPublicacao(evento) {
    evento.preventDefault();

    const elemento = $(evento.currentTarget);
    const publicacaoId = elemento.closest('[data-publicacao-id]').data('publicacao-id');
    const estavaCurtida = elemento.attr('aria-pressed') === 'true';

    if (elemento.data('curtindo')) {
        return;
    }

    elemento
        .data('curtindo', true)
        .prop('disabled', true)
        .addClass('is-loading')
        .attr('aria-busy', 'true');

    $.ajax({
        url: `/publicacoes/${publicacaoId}/${estavaCurtida ? "descurtir" : "curtir"}`,
        method: "POST"
    }).done(function() {
        const contadorDeCurtidas = elemento.next('.like-count');
        const quantidadeDeCurtidas = parseInt(contadorDeCurtidas.text(), 10);
        contadorDeCurtidas.text(quantidadeDeCurtidas + (estavaCurtida ? -1 : 1));

        elemento
            .removeClass('is-loading')
            .toggleClass('is-liked', !estavaCurtida)
            .attr('aria-pressed', String(!estavaCurtida))
            .attr('aria-label', estavaCurtida ? 'Curtir publicação' : 'Remover curtida');

        elemento.attr('title', estavaCurtida ? 'Curtir publicação' : 'Remover curtida');

        if (!estavaCurtida) {
            elemento.addClass('like-pop');
            window.setTimeout(function() {
                elemento.removeClass('like-pop');
            }, 400);
        }
    }).fail(function() {
        alert(estavaCurtida ? "Erro ao remover curtida" : "Erro ao curtir");
    }).always(function() {
        elemento
            .data('curtindo', false)
            .prop('disabled', false)
            .removeClass('is-loading')
            .removeAttr('aria-busy');
    });
}

function atualizarPublicacao() {
    $(this).prop('disabled', true);
    
    const publicacaoId = $(this).data('publicacao-id');
    console.log(publicacaoId);

    $.ajax({
        url: `/publicacoes/${publicacaoId}`,
        method: "PUT",
        data: {
            titulo: $('#titulo').val(),
            conteudo: $('#conteudo').val()
        }
    }).done(function(){
        alert("Publicação atualizada com sucesso!");
    }).fail(function() {
        alert("Erro ao atualizar publicação!");
    }).always(function() {
        $(this).prop('disabled', false);
    });

}

function deletarPublicacao(evento) {
    evento.preventDefault();

    const elemento = $(evento.currentTarget);
    const publicacao = elemento.closest('[data-publicacao-id]');
    const publicacaoId = publicacao.data('publicacao-id');

    if (elemento.data('deletando')) {
        return;
    }

    elemento.data('deletando', true);
    elemento.prop('disabled', true);

    $.ajax({
        url: `/publicacoes/${publicacaoId}`,
        method: "DELETE"
    }).done(function() {
        publicacao.fadeOut("slow", function() {
            $(this).remove();
        });
    }).fail(function() {
        alert("Erro ao deletar publicação!");
        elemento
            .data('deletando', false)
            .prop('disabled', false);
    });
}
