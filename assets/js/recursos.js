// Salvar e compartilhar publicações, privacidade do perfil e pedidos para seguir

$(document).on('click', '.salvar-publicacao', function () {
    const botao = $(this);
    const id = botao.closest('[data-publicacao-id]').data('publicacao-id');
    const salvar = !botao.hasClass('is-saved');
    botao.prop('disabled', true);

    $.ajax({ url: '/publicacoes/' + id + '/salvar', method: salvar ? 'POST' : 'DELETE' }).done(function () {
        botao.toggleClass('is-saved', salvar).attr('aria-pressed', salvar)
            .attr('aria-label', salvar ? 'Remover dos salvos' : 'Salvar publicação')
            .attr('title', salvar ? 'Remover dos salvos' : 'Salvar publicação');
        // O kit do FontAwesome troca <i> por <svg>, então o ícone inteiro é recriado
        botao.html('<i class="' + (salvar ? 'fa-solid fa-circle-check' : 'fa-regular fa-bookmark') + '" aria-hidden="true"></i>');
        // Na página de salvos, a publicação some ao ser removida
        if (!salvar && window.location.pathname === '/salvos') {
            botao.closest('.jumbotron').fadeOut(180, function () { $(this).remove(); });
        }
    }).fail(function () {
        Swal.fire('Ops...', 'Não foi possível atualizar seus salvos.', 'error');
    }).always(function () {
        botao.prop('disabled', false);
    });
});

$(document).on('click', '.compartilhar-publicacao', function () {
    const id = $(this).closest('[data-publicacao-id]').data('publicacao-id');
    const link = window.location.origin + '/publicacoes/' + id;
    const avisar = function () {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Link copiado!', showConfirmButton: false, timer: 1800 });
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(avisar, function () { window.prompt('Copie o link:', link); });
        return;
    }
    const campo = $('<textarea readonly>').css({ position: 'fixed', opacity: 0 }).val(link).appendTo('body');
    campo[0].select();
    try { document.execCommand('copy'); avisar(); } catch (e) { window.prompt('Copie o link:', link); }
    campo.remove();
});

$(document).on('change', '#perfil-privado', function () {
    const campo = $(this);
    const privado = campo.is(':checked');
    campo.prop('disabled', true);

    $.ajax({
        url: '/perfil/privacidade',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ privado: privado })
    }).done(function () {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', showConfirmButton: false, timer: 2200,
            title: privado ? 'Seu perfil agora é privado' : 'Seu perfil agora é público' });
    }).fail(function () {
        campo.prop('checked', !privado);
        Swal.fire('Ops...', 'Não foi possível alterar a privacidade.', 'error');
    }).always(function () {
        campo.prop('disabled', false);
    });
});

function escaparHtml(texto) {
    return $('<div>').text(texto).html();
}

function desenharPedidos(pedidos) {
    if (!pedidos.length) return '<p class="pedidos-vazio">Nenhum pedido no momento.</p>';
    return '<ul class="pedidos-lista">' + pedidos.map(function (p) {
        const foto = p.fotoVersao
            ? '<img src="/usuarios/' + p.id + '/foto?v=' + p.fotoVersao + '" alt="">'
            : '<i class="fa-solid fa-user"></i>';
        return '<li data-id="' + p.id + '">' +
            '<a class="pedido-pessoa" href="/usuarios/' + p.id + '"><span class="user-avatar">' + foto + '</span>' +
            '<span><strong>' + escaparHtml(p.nome) + '</strong><small>@' + escaparHtml(p.nick) + '</small></span></a>' +
            '<span class="pedido-acoes">' +
            '<button type="button" class="btn btn-primary btn-sm" data-acao="aceitar">Aceitar</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" data-acao="recusar">Recusar</button></span></li>';
    }).join('') + '</ul>';
}

function carregarPedidos(aoCarregar) {
    return $.get('/pedidos-seguir').done(function (pedidos) {
        const total = $('#pedidos-total');
        total.text(pedidos.length).prop('hidden', pedidos.length === 0);
        if (aoCarregar) aoCarregar(pedidos);
    });
}

$(function () {
    if ($('#abrir-pedidos').length) carregarPedidos();
});

$(document).on('click', '#abrir-pedidos', function () {
    carregarPedidos(function (pedidos) {
        Swal.fire({
            title: 'Pedidos para seguir',
            html: '<div id="pedidos-conteudo">' + desenharPedidos(pedidos) + '</div>',
            showConfirmButton: false,
            showCloseButton: true,
            didClose: function () { window.location.reload(); }
        });
    });
});

$(document).on('click', '.pedidos-lista [data-acao]', function () {
    const botao = $(this);
    const id = botao.closest('li').data('id');
    botao.closest('.pedido-acoes').find('button').prop('disabled', true);

    $.post('/pedidos-seguir/' + id + '/' + botao.data('acao')).done(function () {
        carregarPedidos(function (pedidos) {
            $('#pedidos-conteudo').html(desenharPedidos(pedidos));
        });
    }).fail(function () {
        Swal.showValidationMessage('Não foi possível responder ao pedido.');
        botao.closest('.pedido-acoes').find('button').prop('disabled', false);
    });
});

// Ampliar imagens no centro da tela, com o fundo desfocado
(function () {
    const alvos = '.post-image-link, .msg-imagem-link, .profile-avatar';
    let fundo = null;

    function fechar() {
        if (!fundo) return;
        const el = fundo;
        fundo = null;
        el.classList.remove('is-open');
        document.removeEventListener('keydown', aoTeclar);
        window.setTimeout(function () { el.remove(); }, 180);
    }

    function aoTeclar(evento) { if (evento.key === 'Escape') fechar(); }

    function abrir(src, alt) {
        fechar();
        fundo = document.createElement('div');
        fundo.className = 'lightbox';
        fundo.setAttribute('role', 'dialog');
        fundo.setAttribute('aria-modal', 'true');
        fundo.setAttribute('aria-label', 'Imagem ampliada');
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt || '';
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'lightbox-fechar';
        botao.setAttribute('aria-label', 'Fechar');
        botao.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        fundo.append(img, botao);
        fundo.addEventListener('click', fechar);
        document.body.appendChild(fundo);
        document.addEventListener('keydown', aoTeclar);
        window.requestAnimationFrame(function () { fundo.classList.add('is-open'); });
        botao.focus();
    }

    document.addEventListener('click', function (evento) {
        const alvo = evento.target.closest(alvos);
        if (!alvo) return;
        const img = alvo.tagName === 'IMG' ? alvo : alvo.querySelector('img');
        if (!img || !img.getAttribute('src')) return;
        evento.preventDefault();
        evento.stopPropagation();
        abrir(img.currentSrc || img.src, img.alt);
    }, true);
})();

// Repostar: com um comentário opcional (citação) ou sem; clicar de novo desfaz o repost simples
$(document).on('click', '.repostar-publicacao', function () {
    const botao = $(this);
    const id = botao.closest('[data-publicacao-id]').data('publicacao-id');
    const url = '/publicacoes/' + id + '/repostar';
    if (botao.prop('disabled')) return;

    const atualizar = function (feito) {
        const contador = botao.nextAll('.repost-count').first();
        contador.text(Math.max(0, (parseInt(contador.text(), 10) || 0) + (feito ? 1 : -1)));
        botao.toggleClass('is-reposted', feito).attr('aria-pressed', feito)
            .attr('title', feito ? 'Desfazer repost' : 'Repostar');
    };
    const falhou = function (resposta) {
        if (resposta.status === 401) return;
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        alertaErro(erro || 'Não foi possível repostar.');
    };

    if (botao.hasClass('is-reposted')) {
        botao.prop('disabled', true);
        $.ajax({ url: url, method: 'DELETE' }).done(function () {
            atualizar(false);
            avisoRapido('Repost desfeito');
        }).fail(falhou).always(function () { botao.prop('disabled', false); });
        return;
    }

    swalOrby.fire({
        title: 'Repostar',
        input: 'textarea',
        inputPlaceholder: 'Adicione um comentário (opcional)',
        inputAttributes: { maxlength: 500, 'aria-label': 'Comentário do repost' },
        showCancelButton: true,
        confirmButtonText: 'Repostar',
        cancelButtonText: 'Cancelar'
    }).then(function (resultado) {
        if (!resultado.isConfirmed) return;
        const comentario = (resultado.value || '').trim();
        botao.prop('disabled', true);
        $.ajax({ url: url, method: 'POST', data: { conteudo: comentario } }).done(function () {
            // uma citação não marca o botão: ela é uma publicação própria e o repost simples continua possível
            if (!comentario) atualizar(true); else botao.nextAll('.repost-count').first().text(function (_, t) { return (parseInt(t, 10) || 0) + 1; });
            avisoRapido(comentario ? 'Publicado com seu comentário' : 'Repostado no seu perfil');
        }).fail(falhou).always(function () { botao.prop('disabled', false); });
    });
});

function textoDeSugestao(p) {
    if (!p.emComum) return 'Popular no Orby';
    if (p.emComum === 1) return '@' + escaparHtml(p.via) + ', que você segue, segue';
    return p.emComum + ' pessoas que você segue seguem';
}

function desenharSugestoes(sugestoes) {
    return sugestoes.map(function (p) {
        const foto = p.fotoVersao
            ? '<img src="/usuarios/' + p.id + '/foto?v=' + p.fotoVersao + '" alt="">'
            : '<i class="fa-solid fa-user"></i>';
        return '<li data-id="' + p.id + '" data-privado="' + p.privado + '">' +
            '<a class="pedido-pessoa" href="/usuarios/' + p.id + '"><span class="user-avatar">' + foto + '</span>' +
            '<span><strong>' + escaparHtml(p.nome) + '</strong><small>@' + escaparHtml(p.nick) + '</small>' +
            '<small class="suggest-why">' + textoDeSugestao(p) + '</small></span></a>' +
            '<button type="button" class="btn btn-primary btn-sm" data-seguir-sugestao>' + (p.privado ? 'Solicitar' : 'Seguir') + '</button></li>';
    }).join('');
}

$(function () {
    if (!$('#sugestoes-seguir').length) return;
    $.get('/sugestoes-seguir').done(function (sugestoes) {
        if (!sugestoes.length) return;
        $('#sugestoes-lista').html(desenharSugestoes(sugestoes));
        $('#sugestoes-seguir').prop('hidden', false);
    });
});

$(document).on('click', '[data-seguir-sugestao]', function () {
    const botao = $(this).prop('disabled', true);
    const item = botao.closest('li');
    $.post('/usuarios/' + item.data('id') + '/seguir').done(function () {
        botao.removeClass('btn-primary').addClass('btn-outline-secondary')
            .text(item.data('privado') ? 'Pedido enviado' : 'Seguindo');
    }).fail(function () {
        botao.prop('disabled', false);
        Swal.fire('Ops...', 'Não foi possível seguir esta pessoa.', 'error');
    });
});
