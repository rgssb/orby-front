$('#nova-publicacao').on('submit', criarpublicacao);
$(document).on('click', '.curtir-publicacao', curtirPublicacao);

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

    $.ajax({
        url: `/publicacoes/${publicacaoId}/curtir`,
        method: "POST"
    }).done(function() {
        window.location = "/home";
    }).fail(function() {
        alert("Erro ao curtir");
    });
}