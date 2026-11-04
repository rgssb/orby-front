// Salvar e compartilhar publicações, privacidade do perfil e pedidos para seguir

$(document).on('click', '.salvar-publicacao', function () {
    const botao = $(this);
    const id = botao.closest('[data-publicacao-id]').data('publicacao-id');
    if (botao.hasClass('is-saved')) {
        organizarPublicacao(botao, id);
        return;
    }
    botao.prop('disabled', true);
    $.ajax({ url: '/publicacoes/' + encodeURIComponent(id) + '/salvar', method: 'POST' })
        .done(function () {
            atualizarBotaoSalvo(botao, true);
            organizarPublicacao(botao, id);
        }).fail(function () {
            Swal.fire('Ops...', 'Não foi possível salvar esta publicação.', 'error');
            botao.prop('disabled', false);
        });
});

function atualizarBotaoSalvo(botao, salvo) {
    const texto = salvo ? 'Organizar publicação salva' : 'Salvar publicação';
    botao.toggleClass('is-saved', salvo).attr({ 'aria-pressed': String(salvo), 'aria-label': texto, title: texto });
    botao.html('<i class="' + (salvo ? 'fa-solid fa-circle-check' : 'fa-regular fa-bookmark') + '" aria-hidden="true"></i>');
}

function requisicaoPastas(url, metodo, corpo) {
    return $.ajax({
        url: url, method: metodo,
        contentType: 'application/json',
        data: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
}

function editarNomePasta(pasta) {
    Swal.fire({
        title: 'Renomear pasta',
        input: 'text',
        inputValue: pasta.nome,
        inputAttributes: { maxlength: '80', 'aria-label': 'Nome da pasta' },
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        preConfirm: function (valor) {
            const nome = valor.trim();
            if (!nome || Array.from(nome).length > 80) {
                Swal.showValidationMessage('Use um nome de 1 a 80 caracteres.');
                return false;
            }
            return requisicaoPastas('/pastas/' + pasta.id, 'PUT', { nome: nome })
                .then(function () { return true; }, function () {
                    Swal.showValidationMessage('Não foi possível salvar a pasta.');
                    return false;
                });
        },
        allowOutsideClick: function () { return !Swal.isLoading(); }
    }).then(function (resultado) {
        if (resultado.isConfirmed) carregarPastas();
    });
}

function carregarPastas() {
    const area = $('#pastas-lista');
    if (!area.length) return;
    const atual = String($('.pastas-salvos').data('pasta-atual'));
    area.empty().append($('<p>').text('Carregando pastas...'));
    requisicaoPastas('/pastas', 'GET').done(function (pastas) {
        area.empty();
        const todas = $('<a class="pasta-todas">').attr('href', '/salvos')
            .append('<i class="fa-regular fa-bookmark" aria-hidden="true"></i> ', document.createTextNode('Todos os salvos'));
        if (atual === '0') todas.attr('aria-current', 'page');
        area.append(todas);
        pastas.forEach(function (pasta) {
            const linha = $('<div class="pasta-item">');
            const link = $('<a class="pasta-link">').attr('href', '/salvos?pasta=' + encodeURIComponent(pasta.id))
                .append('<i class="fa-regular fa-folder" aria-hidden="true"></i> ', $('<span>').text(pasta.nome));
            if (atual === String(pasta.id)) link.attr('aria-current', 'page');
            linha.append(link);
            $('<button type="button" class="pasta-acao">Renomear</button>')
                .attr('aria-label', 'Renomear pasta ' + pasta.nome)
                .on('click', function () { editarNomePasta(pasta); }).appendTo(linha);
            $('<button type="button" class="pasta-acao">Excluir</button>')
                .attr('aria-label', 'Excluir pasta ' + pasta.nome)
                .on('click', function () {
                    Swal.fire({
                        title: 'Excluir pasta?',
                        text: 'As publicações continuarão nos seus salvos e nas outras pastas.',
                        icon: 'warning', showCancelButton: true,
                        confirmButtonText: 'Excluir', cancelButtonText: 'Cancelar'
                    }).then(function (resultado) {
                        if (!resultado.isConfirmed) return;
                        requisicaoPastas('/pastas/' + pasta.id, 'DELETE').done(function () {
                            if (atual === String(pasta.id)) window.location.assign('/salvos');
                            else carregarPastas();
                        }).fail(function () { Swal.fire('Ops...', 'Não foi possível excluir a pasta.', 'error'); });
                    });
                }).appendTo(linha);
            area.append(linha);
        });
        if (!pastas.length) area.append($('<p class="pastas-vazio">').text('Ao salvar uma publicação, você pode criar sua primeira pasta.'));
    }).fail(function () {
        area.empty().append($('<p>').text('Não foi possível carregar suas pastas.'));
        $('<button type="button" class="btn btn-outline-secondary">Tentar novamente</button>').on('click', carregarPastas).appendTo(area);
    });
}

carregarPastas();

function organizarPublicacao(botao, id) {
    botao.prop('disabled', true);
    requisicaoPastas('/publicacoes/' + encodeURIComponent(id) + '/pastas', 'GET').done(function (pastas) {
        const lista = document.createElement('div');
        lista.className = 'pastas-escolha';
        const explicacao = document.createElement('p');
        explicacao.textContent = 'Esta publicação já está nos seus salvos. Se quiser, escolha uma pasta.';
        lista.appendChild(explicacao);
        pastas.forEach(function (pasta) {
            const label = document.createElement('label');
            const caixa = document.createElement('input');
            caixa.type = 'checkbox';
            caixa.value = pasta.id;
            caixa.checked = pasta.incluida;
            label.append(caixa, document.createTextNode(' ' + pasta.nome));
            lista.appendChild(label);
        });
        const rotulo = document.createElement('label');
        rotulo.className = 'pasta-nova';
        rotulo.textContent = 'Criar uma pasta';
        const nome = document.createElement('input');
        nome.type = 'text';
        nome.className = 'form-control';
        nome.maxLength = 80;
        nome.placeholder = 'Nome da nova pasta (opcional)';
        rotulo.appendChild(nome);
        lista.appendChild(rotulo);
        Swal.fire({
            title: 'Guardar publicação', html: lista,
            showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar',
            showDenyButton: true, denyButtonText: 'Remover dos salvos',
            showLoaderOnConfirm: true,
            preConfirm: function () {
                const escolhidas = Array.from(lista.querySelectorAll('input:checked')).map(function (caixa) { return Number(caixa.value); });
                const nomePasta = nome.value.trim();
                if (Array.from(nomePasta).length > 80) {
                    Swal.showValidationMessage('Use um nome de até 80 caracteres.');
                    return false;
                }
                return requisicaoPastas('/publicacoes/' + encodeURIComponent(id) + '/pastas', 'PUT', { pastas: escolhidas })
                    .then(function () {
                        if (!nomePasta) return true;
                        return requisicaoPastas('/publicacoes/' + encodeURIComponent(id) + '/pastas', 'POST', { nome: nomePasta })
                            .then(function () { return true; }, function () {
                                Swal.showValidationMessage('As pastas escolhidas foram salvas, mas não foi possível criar a nova pasta.');
                                return false;
                            });
                    }, function () {
                        Swal.showValidationMessage('Não foi possível atualizar as pastas. Confira se a publicação ainda está salva.');
                        return false;
                    });
            },
            allowOutsideClick: function () { return !Swal.isLoading(); }
        }).then(function (resultado) {
            if (resultado.isDenied) {
                botao.prop('disabled', true);
                $.ajax({ url: '/publicacoes/' + encodeURIComponent(id) + '/salvar', method: 'DELETE' })
                    .done(function () {
                        atualizarBotaoSalvo(botao, false);
                        if (window.location.pathname === '/salvos') botao.closest('.jumbotron').fadeOut(180, function () { $(this).remove(); });
                    }).fail(function () { Swal.fire('Ops...', 'Não foi possível remover dos salvos.', 'error'); })
                    .always(function () { botao.prop('disabled', false); });
                return;
            }
            if (resultado.isConfirmed && window.location.pathname === '/salvos' && new URLSearchParams(window.location.search).has('pasta')) {
                window.location.reload();
            } else if (resultado.isConfirmed && window.location.pathname === '/salvos') {
                carregarPastas();
            }
        });
    }).fail(function () {
        Swal.fire('Ops...', 'A publicação continua salva, mas não conseguimos carregar suas pastas.', 'error');
    }).always(function () { botao.prop('disabled', false); });
}

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
        $('#abrir-pedidos').toggleClass('has-pedidos', pedidos.length > 0)
            .attr('aria-label', 'Pedidos para seguir' + (pedidos.length ? ': ' + pedidos.length + ' pendente(s)' : ''));
        if (aoCarregar) aoCarregar(pedidos);
    }).fail(function () {
        $('#abrir-pedidos').attr('title', 'Não foi possível carregar os pedidos. Clique para tentar novamente.');
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
    }).fail(function () {
        Swal.fire('Não foi possível carregar os pedidos', 'Verifique sua conexão e tente novamente.', 'error');
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
    if (!p.emComum) {
        if (p.motivo === 'interesses') return 'Interesses em comum';
        if (p.motivo === 'interacoes') return 'Você interagiu com publicações';
        return 'Popular no Orby';
    }
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

// Aviso em tempo real de novas publicações no feed da home
$(function () {
    const abas = $('.feed-tabs').first();
    if (!abas.length || !window.OrbyMensagens) return;
    let total = 0;
    const aviso = $('<button type="button" class="feed-new-posts" hidden></button>').insertAfter(abas);
    window.OrbyMensagens.ouvintesDeEvento.push(function (evento) {
        if (evento.tipo !== 'publicacao') return;
        total++;
        aviso.text(total === 1 ? '1 nova publicação — clique para ver' : total + ' novas publicações — clique para ver').prop('hidden', false);
    });
    aviso.on('click', function () {
        window.scrollTo(0, 0);
        window.location.reload();
    });
});
