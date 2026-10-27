// Comentários e menções das publicações (usa os helpers de publicacoes.js)
// Menções e hashtags: @nick vira link para o perfil e #tag para a busca (o texto é sempre inserido como texto, nunca como HTML)
function comMencoes(texto) {
    const fragmento = document.createDocumentFragment();
    const regex = /(^|[^\p{L}\p{N}_@#])(?:@([A-Za-z0-9_]{1,50})|#([\p{L}\p{N}_]{1,50}))/gu;
    let ultimo = 0;
    let achado;
    while ((achado = regex.exec(texto)) !== null) {
        const inicio = achado.index + achado[1].length;
        const nome = achado[2] || achado[3];
        fragmento.appendChild(document.createTextNode(texto.slice(ultimo, inicio)));
        const link = document.createElement('a');
        if (achado[2]) {
            link.className = 'mention';
            link.href = '/mencoes/' + encodeURIComponent(nome);
            link.textContent = '@' + nome;
        } else {
            link.className = 'hashtag';
            link.href = '/hashtags/' + encodeURIComponent(nome);
            link.textContent = '#' + nome;
        }
        fragmento.appendChild(link);
        ultimo = inicio + nome.length + 1;
    }
    fragmento.appendChild(document.createTextNode(texto.slice(ultimo)));
    return fragmento;
}

function marcarMencoes(raiz) {
    $(raiz || document).find('.jumbotron .lead, .jumbotron .repost-text').each(function() {
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
function montarComentario(c, usuarioId, donoDaPublicacao, ehResposta) {
    const item = $('<li class="comment-item">').attr('data-comentario-id', c.id).toggleClass('comment-reply', !!ehResposta);
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
    acoes.append($('<button type="button" class="comment-reply-button" aria-label="Responder comentário" title="Responder">').append('<i class="fa-solid fa-reply" aria-hidden="true"></i>'));
    if (c.autorId === usuarioId) {
        acoes.append($('<button type="button" class="comment-edit" aria-label="Editar comentário" title="Editar comentário">').append('<i class="fa-solid fa-pen" aria-hidden="true"></i>'));
    }
    if (c.autorId !== usuarioId) {
        acoes.append($('<button type="button" class="comment-report denunciar" aria-label="Denunciar comentário" title="Denunciar">').attr({ 'data-tipo': 'comentario', 'data-id': c.id }).append('<i class="fa-regular fa-flag" aria-hidden="true"></i>'));
    }
    if (c.autorId === usuarioId || donoDaPublicacao) {
        acoes.append($('<button type="button" class="comment-delete" aria-label="Excluir comentário" title="Excluir comentário">').append('<i class="fa-solid fa-xmark" aria-hidden="true"></i>'));
    }
    cabecalho.append(acoes);

    const texto = $('<p class="comment-text">').attr('data-bruto', c.conteudo).append(comMencoes(c.conteudo));
    item.append(cabecalho, texto);
    item.attr({ 'data-respostas': c.respostas || 0, 'data-total': c.totalRespostas || 0 });
    item.append($('<ul class="comment-replies list-unstyled" hidden>'));
    if (c.respostas) item.append(botaoVerRespostas(c.respostas));
    return item;
}

function textoRespostas(quantidade) {
    return quantidade === 1 ? 'Ver 1 resposta' : 'Ver ' + quantidade + ' respostas';
}

function botaoVerRespostas(quantidade) {
    return $('<button type="button" class="comment-replies-toggle" aria-expanded="false">').text(textoRespostas(quantidade));
}

// Carrega (ou recarrega) as respostas de um comentário principal
function carregarRespostas(item, artigo) {
    const lista = item.children('.comment-replies');
    return $.get(`/comentarios/${item.data('comentario-id')}/respostas`, { limite: 100 }).done(function(dados) {
        const donoDaPublicacao = Number(artigo.data('autor-id')) === dados.usuarioId;
        lista.empty();
        (dados.comentarios || []).forEach(function(c) {
            lista.append(montarComentario(c, dados.usuarioId, donoDaPublicacao, true));
        });
        lista.prop('hidden', false);
        const quantidade = (dados.comentarios || []).length;
        item.attr('data-respostas', quantidade);
        let toggle = item.children('.comment-replies-toggle');
        if (!toggle.length && quantidade) {
            toggle = botaoVerRespostas(quantidade).insertAfter(lista);
        }
        toggle.attr('aria-expanded', 'true').text('Ocultar respostas');
        if (!quantidade) toggle.remove();
    }).fail(function(resposta) {
        if (resposta.status !== 401) alertaErro('Não foi possível carregar as respostas.');
    });
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

const COMENTARIOS_POR_VEZ = 10;

function botaoVerMaisComentarios() {
    return $('<li class="comment-more">').append(
        $('<button type="button" class="btn btn-sm btn-outline-secondary comments-more-button">').text('Ver mais comentários')
    );
}

// Carrega os comentários de uma publicação. "quantidade" é quantos devem ficar visíveis (os já abertos são recarregados)
function carregarComentarios(artigo, quantidade) {
    const lista = artigo.find('.comments-list');
    lista.attr('aria-busy', 'true').html('<li class="comment-skeleton"></li><li class="comment-skeleton"></li>');
    const publicacaoId = artigo.data('publicacao-id');
    const alvo = new URLSearchParams(window.location.search).get('comentario');
    const limite = quantidade || (alvo ? 100 : COMENTARIOS_POR_VEZ);

    return $.get(`/publicacoes/${publicacaoId}/comentarios`, { limite: limite }).done(function(dados) {
        const donoDaPublicacao = Number(artigo.data('autor-id')) === dados.usuarioId;
        const comentarios = dados.comentarios || [];
        lista.empty();
        comentarios.forEach(function(c) {
            lista.append(montarComentario(c, dados.usuarioId, donoDaPublicacao));
        });
        if (!comentarios.length) {
            lista.append('<li class="comment-empty"><i class="fa-regular fa-comments" aria-hidden="true"></i> Ainda não há comentários.</li>');
        }
        artigo.data('comentarios-exibidos', comentarios.length);
        artigo.data('comentarios-usuario', dados.usuarioId);
        if (dados.temMais) {
            lista.append(botaoVerMaisComentarios());
        } else {
            artigo.find('.comments-count').text(totalDeComentarios(comentarios));
        }
        artigo.data('destacou', destacarComentarioAlvo(lista));
    }).fail(function() {
        lista.html('<li class="comment-empty">Não foi possível carregar os comentários.</li>');
    }).always(function() {
        lista.removeAttr('aria-busy');
    });
}

// Recarrega mantendo a mesma quantidade de comentários visíveis (+ delta)
function recarregarComentarios(artigo, delta) {
    const exibidos = Number(artigo.data('comentarios-exibidos')) || 0;
    return carregarComentarios(artigo, Math.max(COMENTARIOS_POR_VEZ, exibidos + (delta || 0)));
}

// O contador da publicação inclui as respostas
function totalDeComentarios(comentarios) {
    return comentarios.reduce(function(total, c) { return total + 1 + (c.totalRespostas || 0); }, 0);
}

// Mantém o total de respostas dos comentários acima de "item" (inclusive ele) em dia
function ajustarTotais(item, delta) {
    item.parents('.comment-item').addBack().each(function() {
        const atual = Number($(this).attr('data-total')) || 0;
        $(this).attr('data-total', Math.max(0, atual + delta));
    });
}

function ajustarContagemDeComentarios(artigo, delta) {
    const contador = artigo.find('.comments-count');
    contador.text(Math.max(0, (parseInt(contador.text(), 10) || 0) + delta));
}

$(document).on('click', '.comments-more-button', function() {
    const botao = $(this).prop('disabled', true);
    const artigo = botao.closest('[data-publicacao-id]');
    const lista = artigo.find('.comments-list');
    const exibidos = Number(artigo.data('comentarios-exibidos')) || 0;
    const usuarioId = artigo.data('comentarios-usuario');
    const donoDaPublicacao = Number(artigo.data('autor-id')) === usuarioId;

    $.get(`/publicacoes/${artigo.data('publicacao-id')}/comentarios`, { limite: COMENTARIOS_POR_VEZ, deslocamento: exibidos }).done(function(dados) {
        const comentarios = dados.comentarios || [];
        const linhaDoBotao = botao.closest('.comment-more');
        comentarios.forEach(function(c) {
            linhaDoBotao.before(montarComentario(c, dados.usuarioId, donoDaPublicacao));
        });
        artigo.data('comentarios-exibidos', exibidos + comentarios.length);
        if (dados.temMais) {
            botao.prop('disabled', false);
        } else {
            linhaDoBotao.remove();
            const contador = artigo.find('.comments-count');
            contador.text(totalDeComentarios(artigo.find('.comments-list > .comment-item').map(function() {
                return { totalRespostas: Number($(this).attr('data-total')) || 0 };
            }).get()));
        }
    }).fail(function(resposta) {
        botao.prop('disabled', false);
        if (resposta.status !== 401) alertaErro('Não foi possível carregar mais comentários.');
    });
});

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

    const principal = formulario.closest('.comment-item');
    const respondendo = principal.length > 0;
    formulario.find('button').prop('disabled', true);
    $.ajax({
        url: `/publicacoes/${artigo.data('publicacao-id')}/comentarios`,
        method: 'POST',
        data: respondendo ? { conteudo: conteudo, parentId: principal.data('comentario-id') } : { conteudo: conteudo }
    }).done(function() {
        campo.val('');
        ajustarContagemDeComentarios(artigo, 1);
        if (respondendo) {
            formulario.remove();
            ajustarTotais(principal, 1);
            carregarRespostas(principal, artigo);
            return;
        }
        recarregarComentarios(artigo, 1);
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
            const removidos = 1 + (Number(item.attr('data-total')) || 0);
            ajustarContagemDeComentarios(artigo, -removidos);
            const principal = item.parent().closest('.comment-item');
            if (principal.length) {
                ajustarTotais(principal, -removidos);
                carregarRespostas(principal, artigo);
                return;
            }
            recarregarComentarios(artigo);
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
    if (item.children('.comment-edit-form').length) return;

    const texto = item.children('.comment-text');
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
    item.children('.comment-edit-form').remove();
    item.children('.comment-text').show();
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
        const principal = item.parent().closest('.comment-item');
        if (principal.length) {
            carregarRespostas(principal, artigo);
        } else {
            recarregarComentarios(artigo);
        }
    }).fail(function(resposta) {
        formulario.find('button').prop('disabled', false);
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        if (resposta.status !== 401) alertaErro(erro || 'Não foi possível editar o comentário.');
    });
});

$(document).on('click', '.comment-replies-toggle', function() {
    const botao = $(this);
    const item = botao.closest('.comment-item');
    const lista = item.children('.comment-replies');
    if (botao.attr('aria-expanded') === 'true') {
        lista.prop('hidden', true);
        botao.attr('aria-expanded', 'false').text(textoRespostas(Number(item.attr('data-respostas')) || 0));
        return;
    }
    carregarRespostas(item, botao.closest('[data-publicacao-id]'));
});

$(document).on('click', '.comment-reply-button', function() {
    const principal = $(this).closest('.comment-item');
    const item = principal;
    $('.comment-reply-form').remove();

    const nick = item.children('.comment-head').find('a').first().text();
    const formulario = $('<form class="comment-form comment-reply-form">').append(
        $('<input type="text" name="conteudo" class="form-control" maxlength="500" autocomplete="off" aria-label="Responder comentário" required>').val(nick + ' '),
        $('<button type="submit" class="btn btn-primary btn-sm">Responder</button>'),
        $('<button type="button" class="btn btn-outline-secondary btn-sm comment-reply-cancel">Cancelar</button>')
    );
    principal.append(formulario);
    const campo = formulario.find('input');
    campo.trigger('focus');
    campo[0].setSelectionRange(campo.val().length, campo.val().length);
});

$(document).on('click', '.comment-reply-cancel', function() {
    $(this).closest('.comment-form').remove();
});

// Página de uma publicação (destino das notificações): já abre os comentários
$('.pagina-publicacao .comments-toggle').first().trigger('click');
