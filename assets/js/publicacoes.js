// Todas as chamadas AJAX levam este cabeçalho, assim o servidor responde 401 em JSON quando a sessão expira
$.ajaxSetup({ headers: { 'X-Requested-With': 'XMLHttpRequest' } });

let sessaoEncerrada = false;
$(document).ajaxError(function(evento, resposta) {
    if (resposta.status !== 401 || sessaoEncerrada || $('#login, #form-cadastro').length) {
        return;
    }
    sessaoEncerrada = true;
    Swal.fire({
        icon: 'info',
        title: 'Sessão expirada',
        text: 'Por segurança, entre novamente para continuar.',
        confirmButtonText: 'Entrar',
        allowOutsideClick: false
    }).then(function() {
        window.location.assign('/login?sessao=expirada');
    });
});

$('#nova-publicacao').on('submit', criarpublicacao);

$(document).on('click', '.curtir-publicacao', curtirPublicacao);

$('#atualizar').on('click', atualizarPublicacao);

$(document).on('click', '.navbar-logout', sairDaConta);

const swalOrby = Swal.mixin({
    customClass: { popup: 'swal-orby' }
});

function avisoRapido(mensagem) {
    return swalOrby.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: mensagem,
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true
    });
}

function alertaErro(mensagem) {
    return swalOrby.fire({
        icon: 'error',
        title: 'Erro',
        text: mensagem
    });
}

$(document).on('click', '.deletar-publicacao', deletarPublicacao);

function criarpublicacao(evento) {
    evento.preventDefault();

    const arquivo = ($('#imagem-publicacao')[0] || {}).files && $('#imagem-publicacao')[0].files[0];
    if (arquivo && !validarImagem(arquivo)) {
        return;
    }

    const botao = $('#nova-publicacao button[type="submit"]').prop('disabled', true);

    $.ajax({
        url: "/publicacoes",
        method: "POST",
        data: {
            titulo: $('#titulo-publicacao').val(),
            conteudo: $('#conteudo-publicacao').val()
        }
    }).done(function(criada) {
        const concluir = function() {
            avisoRapido('Publicação criada com sucesso!').then(function() {
                window.location = "/home";
            });
        };

        if (!arquivo || !criada || !criada.id) {
            concluir();
            return;
        }

        enviarImagem(criada.id, arquivo).done(concluir).fail(function() {
            // A publicação já existe; só a imagem falhou
            alertaErro('A publicação foi criada, mas a imagem não pôde ser enviada. Você pode adicioná-la ao editar.').then(function() {
                window.location = "/home";
            });
        });
    }).fail(function() {
        botao.prop('disabled', false);
        alertaErro('Não foi possível criar a publicação.');
    });

}

const TIPOS_DE_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LIMITE_DA_IMAGEM = 4 * 1024 * 1024;

function validarImagem(arquivo) {
    if (TIPOS_DE_IMAGEM.indexOf(arquivo.type) === -1) {
        alertaErro('Use uma imagem JPG, PNG, WEBP ou GIF.');
        return false;
    }
    if (arquivo.size > LIMITE_DA_IMAGEM) {
        alertaErro('A imagem deve ter no máximo 4 MB.');
        return false;
    }
    return true;
}

function enviarImagem(publicacaoId, arquivo) {
    return $.ajax({
        url: '/publicacoes/' + publicacaoId + '/imagem',
        method: 'POST',
        data: arquivo,
        processData: false,
        contentType: arquivo.type
    });
}

// Pré-visualização da imagem escolhida (composer e edição)
$(document).on('change', '#imagem-publicacao', function() {
    const arquivo = this.files && this.files[0];
    const previa = $('#imagem-previa');
    $('#imagem-nome').text(arquivo ? arquivo.name : 'Adicionar um arquivo');
    if (!arquivo) {
        previa.prop('hidden', true);
        return;
    }
    if (!validarImagem(arquivo)) {
        this.value = '';
        $('#imagem-nome').text('Adicionar um arquivo');
        previa.prop('hidden', true);
        return;
    }
    previa.find('img').attr('src', URL.createObjectURL(arquivo));
    previa.prop('hidden', false);
    $('#remover-imagem-atual').prop('checked', false);
});

$(document).on('click', '#limpar-imagem', function() {
    $('#imagem-publicacao').val('');
    $('#imagem-nome').text('Adicionar um arquivo');
    $('#imagem-previa').prop('hidden', true);
});

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
        alertaErro(estavaCurtida ? 'Não foi possível remover a curtida.' : 'Não foi possível curtir a publicação.');
    }).always(function() {
        elemento
            .data('curtindo', false)
            .prop('disabled', false)
            .removeClass('is-loading')
            .removeAttr('aria-busy');
    });
}

function atualizarPublicacao() {
    const botaoAtualizar = $(this);

    if (!$('#conteudo').val().trim()) {
        swalOrby.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Por favor, preencha o título e o conteúdo.'
        });
        return;
    }

    botaoAtualizar.prop('disabled', true);

    const publicacaoId = botaoAtualizar.data('publicacao-id');
    const arquivo = $('#imagem-publicacao')[0].files[0];
    if (arquivo && !validarImagem(arquivo)) {
        botaoAtualizar.prop('disabled', false);
        return;
    }
    const removerImagem = $('#remover-imagem-atual').prop('checked');

    $.ajax({
        url: `/publicacoes/${publicacaoId}`,
        method: "PUT",
        data: {
            titulo: $('#titulo').val(),
            conteudo: $('#conteudo').val()
        }
    }).then(function() {
        if (arquivo) {
            return enviarImagem(publicacaoId, arquivo);
        }
        if (removerImagem) {
            return $.ajax({ url: `/publicacoes/${publicacaoId}/imagem`, method: 'DELETE' });
        }
    }).done(function(){
        swalOrby.fire({
            icon: 'success',
            title: 'Sucesso',
            text: 'Publicação atualizada com sucesso!'
        }).then(function() {
            window.location = "/home";
        });
    }).fail(function() {
        alertaErro('Erro ao atualizar publicação!');
    }).always(function() {
        botaoAtualizar.prop('disabled', false);
    });

}

function deletarPublicacao(evento) {
    evento.preventDefault();

    const elemento = $(evento.currentTarget);
    if (elemento.data('deletando')) {
        return;
    }

    const publicacao = elemento.closest('[data-publicacao-id]');
    const publicacaoId = publicacao.data('publicacao-id');
    elemento.data('deletando', true);

    swalOrby.fire({
        icon: 'warning',
        title: 'ESPERE',
        text: 'Tem certeza que deseja deletar esta publicação? Essa ação não pode ser desfeita!',
        showCancelButton: true,
        confirmButtonText: 'Sim',
        cancelButtonText: 'Não'
    }).then(function(confirmacao) {
        if (!confirmacao.isConfirmed) {
            elemento.data('deletando', false);
            return;
        }

        elemento.prop('disabled', true);

        $.ajax({
            url: `/publicacoes/${publicacaoId}`,
            method: "DELETE"
        }).done(function() {
            if ($('.pagina-publicacao').length) {
                avisoRapido('Publicação excluída com sucesso!').then(function() {
                    window.location = '/home';
                });
                return;
            }

            publicacao.fadeOut("slow", function() {
                $(this).remove();
            });
            avisoRapido('Publicação excluída com sucesso!');
        }).fail(function() {
            elemento
                .data('deletando', false)
                .prop('disabled', false);

            alertaErro('Erro ao deletar publicação!');
        });
    });

}


function sairDaConta(evento) {
    evento.preventDefault();
    const logoutURL = evento.currentTarget.href;

    swalOrby.fire({
        icon: 'question',
        title: 'Sair da conta',
        text: 'Deseja realmente sair do Orby?',
        showCancelButton: true,
        confirmButtonText: 'Sair',
        cancelButtonText: 'Cancelar'
    }).then(function(confirmacao) {
        if (!confirmacao.isConfirmed) {
            return;
        }

        swalOrby.fire({
            title: 'Até a próxima!',
            showConfirmButton: false,
            allowOutsideClick: false,
            timer: 2000
        }).then(function() {
            window.location.assign(logoutURL);
        });
    });
}


// Carregar mais publicações (paginação do feed)
$(document).on('click', '#carregar-mais', function() {
    const botao = $(this);
    botao.prop('disabled', true).attr('aria-busy', 'true');

    $.get(botao.data('url') || '/feed?pagina=' + botao.data('pagina')).done(function(html) {
        const novo = $('<div>').append($.parseHTML(html));
        const container = botao.closest('.feed-more');
        container.replaceWith(novo.children());
        window.OrbyUI && window.OrbyUI.datasRelativas(document.getElementById('feed-lista'));
        marcarMencoes(document.getElementById('feed-lista'));
    }).fail(function() {
        botao.prop('disabled', false).removeAttr('aria-busy');
        alertaErro('Não foi possível carregar mais publicações.');
    });
});
