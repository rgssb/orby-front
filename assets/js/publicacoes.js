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
    
    $.ajax({
        url: "/publicacoes",
        method: "POST",
        data: {
            titulo: $('#titulo-publicacao').val(),
            conteudo: $('#conteudo-publicacao').val()
        }
    }).done(function() {
        avisoRapido('Publicação criada com sucesso!').then(function() {
            window.location = "/home";
        });
    }).fail(function() {
        alertaErro('Não foi possível criar a publicação.');
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

    if (!$('#titulo').val().trim() || !$('#conteudo').val().trim()) {
        swalOrby.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Por favor, preencha o título e o conteúdo.'
        });
        return;
    }

    botaoAtualizar.prop('disabled', true);

    const publicacaoId = botaoAtualizar.data('publicacao-id');

    $.ajax({
        url: `/publicacoes/${publicacaoId}`,
        method: "PUT",
        data: {
            titulo: $('#titulo').val(),
            conteudo: $('#conteudo').val()
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

    $.get('/feed', { pagina: botao.data('pagina') }).done(function(html) {
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

// Menções: @nick vira link para a busca do usuário (o texto continua sendo inserido como texto, nunca como HTML)
function comMencoes(texto) {
    const fragmento = document.createDocumentFragment();
    const regex = /(^|[^\w@])@([A-Za-z0-9_]{1,50})/g;
    let ultimo = 0;
    let achado;
    while ((achado = regex.exec(texto)) !== null) {
        const inicio = achado.index + achado[1].length;
        fragmento.appendChild(document.createTextNode(texto.slice(ultimo, inicio)));
        const link = document.createElement('a');
        link.className = 'mention';
        link.href = '/mencoes/' + encodeURIComponent(achado[2]);
        link.textContent = '@' + achado[2];
        fragmento.appendChild(link);
        ultimo = inicio + achado[2].length + 1;
    }
    fragmento.appendChild(document.createTextNode(texto.slice(ultimo)));
    return fragmento;
}

function marcarMencoes(raiz) {
    $(raiz || document).find('.jumbotron .lead').each(function() {
        if (!this.dataset.mencoes) {
            this.dataset.mencoes = '1';
            const texto = this.textContent;
            this.textContent = '';
            this.appendChild(comMencoes(texto));
        }
    });
}
marcarMencoes();

// Comentários
function montarComentario(c, usuarioId, donoDaPublicacao) {
    const item = $('<li class="comment-item">').attr('data-comentario-id', c.id);
    const cabecalho = $('<div class="comment-head">');
    cabecalho.append($('<a>').attr('href', '/usuarios/' + c.autorId).text('@' + c.autorNick));
    if (c.criadoEm) {
        cabecalho.append($('<time>').text(new Date(c.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })));
    }
    if (c.editado) {
        cabecalho.append($('<span class="comment-edited">').text('(editado)'));
    }

    const acoes = $('<div class="comment-actions">');
    acoes.append(
        $('<button type="button" class="comment-like">')
            .toggleClass('is-liked', c.curtidoPorUsuario)
            .attr({ 'aria-pressed': String(c.curtidoPorUsuario), 'aria-label': c.curtidoPorUsuario ? 'Remover curtida' : 'Curtir comentário' })
            .append('<i class="fa-solid fa-heart" aria-hidden="true"></i>', $('<span class="comment-like-count">').text(c.curtidas || 0))
    );
    if (c.autorId === usuarioId) {
        acoes.append($('<button type="button" class="comment-edit" aria-label="Editar comentário" title="Editar comentário">').append('<i class="fa-solid fa-pen" aria-hidden="true"></i>'));
    }
    if (c.autorId === usuarioId || donoDaPublicacao) {
        acoes.append($('<button type="button" class="comment-delete" aria-label="Excluir comentário" title="Excluir comentário">').append('<i class="fa-solid fa-xmark" aria-hidden="true"></i>'));
    }
    cabecalho.append(acoes);

    const texto = $('<p class="comment-text">').attr('data-bruto', c.conteudo).append(comMencoes(c.conteudo));
    item.append(cabecalho, texto);
    return item;
}

// Vindo de uma notificação (?comentario=ID), destaca o comentário uma única vez
let comentarioAlvo = new URLSearchParams(window.location.search).get('comentario');

function destacarComentarioAlvo(lista) {
    if (!comentarioAlvo) return false;
    const item = lista.children().filter(function() {
        return String($(this).attr('data-comentario-id')) === comentarioAlvo;
    }).first();
    comentarioAlvo = null;
    if (!item.length) return false;

    item.addClass('is-destacado');
    item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
}

function carregarComentarios(artigo) {
    const lista = artigo.find('.comments-list');
    lista.attr('aria-busy', 'true').html('<li class="comment-skeleton"></li><li class="comment-skeleton"></li>');
    const publicacaoId = artigo.data('publicacao-id');

    return $.get(`/publicacoes/${publicacaoId}/comentarios`).done(function(dados) {
        const donoDaPublicacao = Number(artigo.data('autor-id')) === dados.usuarioId;
        lista.empty();
        (dados.comentarios || []).forEach(function(c) {
            lista.append(montarComentario(c, dados.usuarioId, donoDaPublicacao));
        });
        if (!lista.children().length) {
            lista.append('<li class="comment-empty"><i class="fa-regular fa-comments" aria-hidden="true"></i> Ainda não há comentários. Comece a conversa!</li>');
        }
        artigo.find('.comments-count').text((dados.comentarios || []).length);
        artigo.data('destacou', destacarComentarioAlvo(lista));
    }).fail(function() {
        lista.html('<li class="comment-empty">Não foi possível carregar os comentários.</li>');
    }).always(function() {
        lista.removeAttr('aria-busy');
    });
}

$(document).on('click', '.comments-toggle', function() {
    const botao = $(this);
    const artigo = botao.closest('[data-publicacao-id]');
    const area = artigo.find('.comments-area');
    const abrir = area.prop('hidden');

    area.prop('hidden', !abrir);
    botao.attr('aria-expanded', String(abrir));

    if (abrir && !area.data('carregado')) {
        area.data('carregado', true);
        carregarComentarios(artigo).always(function() {
            if (!artigo.data('destacou')) area.find('input').trigger('focus');
        });
    }
});

$(document).on('submit', '.comment-form', function(evento) {
    evento.preventDefault();
    const formulario = $(this);
    const artigo = formulario.closest('[data-publicacao-id]');
    const campo = formulario.find('input[name="conteudo"]');
    const conteudo = campo.val().trim();
    if (!conteudo) return;

    formulario.find('button').prop('disabled', true);
    $.ajax({
        url: `/publicacoes/${artigo.data('publicacao-id')}/comentarios`,
        method: 'POST',
        data: { conteudo: conteudo }
    }).done(function() {
        campo.val('');
        carregarComentarios(artigo);
    }).fail(function(resposta) {
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        if (resposta.status !== 401) alertaErro(erro || 'Não foi possível comentar.');
    }).always(function() {
        formulario.find('button').prop('disabled', false);
    });
});

$(document).on('click', '.comment-delete', function() {
    const item = $(this).closest('.comment-item');
    const artigo = item.closest('[data-publicacao-id]');

    swalOrby.fire({
        icon: 'warning',
        title: 'Excluir comentário?',
        text: 'Essa ação não pode ser desfeita.',
        showCancelButton: true,
        confirmButtonText: 'Excluir',
        cancelButtonText: 'Cancelar'
    }).then(function(confirmacao) {
        if (!confirmacao.isConfirmed) return;

        $.ajax({ url: `/comentarios/${item.data('comentario-id')}`, method: 'DELETE' }).done(function() {
            carregarComentarios(artigo);
        }).fail(function(resposta) {
            if (resposta.status !== 401) alertaErro('Não foi possível excluir o comentário.');
        });
    });
});

$(document).on('click', '.comment-like', function() {
    const botao = $(this);
    if (botao.prop('disabled')) return;
    const curtido = botao.attr('aria-pressed') === 'true';
    const contador = botao.find('.comment-like-count');
    const id = botao.closest('.comment-item').data('comentario-id');

    botao.prop('disabled', true);
    $.ajax({ url: `/comentarios/${id}/${curtido ? 'descurtir' : 'curtir'}`, method: 'POST' }).done(function() {
        contador.text(Math.max(0, parseInt(contador.text(), 10) + (curtido ? -1 : 1)));
        botao.toggleClass('is-liked', !curtido)
            .attr('aria-pressed', String(!curtido))
            .attr('aria-label', curtido ? 'Curtir comentário' : 'Remover curtida');
    }).fail(function(resposta) {
        if (resposta.status !== 401) alertaErro('Não foi possível curtir o comentário.');
    }).always(function() {
        botao.prop('disabled', false);
    });
});

$(document).on('click', '.comment-edit', function() {
    const item = $(this).closest('.comment-item');
    if (item.find('.comment-edit-form').length) return;

    const texto = item.find('.comment-text');
    const formulario = $('<form class="comment-edit-form">').append(
        $('<input type="text" class="form-control" maxlength="500" aria-label="Editar comentário" required>').val(texto.attr('data-bruto')),
        $('<button type="submit" class="btn btn-primary btn-sm">Salvar</button>'),
        $('<button type="button" class="btn btn-outline-secondary btn-sm comment-edit-cancel">Cancelar</button>')
    );
    texto.hide().after(formulario);
    formulario.find('input').trigger('focus');
});

$(document).on('click', '.comment-edit-cancel', function() {
    const item = $(this).closest('.comment-item');
    item.find('.comment-edit-form').remove();
    item.find('.comment-text').show();
});

$(document).on('submit', '.comment-edit-form', function(evento) {
    evento.preventDefault();
    const formulario = $(this);
    const item = formulario.closest('.comment-item');
    const artigo = item.closest('[data-publicacao-id]');
    const conteudo = formulario.find('input').val().trim();
    if (!conteudo) return;

    formulario.find('button').prop('disabled', true);
    $.ajax({ url: `/comentarios/${item.data('comentario-id')}`, method: 'PUT', data: { conteudo: conteudo } }).done(function() {
        carregarComentarios(artigo);
    }).fail(function(resposta) {
        formulario.find('button').prop('disabled', false);
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        if (resposta.status !== 401) alertaErro(erro || 'Não foi possível editar o comentário.');
    });
});

// Página de uma publicação (destino das notificações): já abre os comentários
$('.pagina-publicacao .comments-toggle').first().trigger('click');
