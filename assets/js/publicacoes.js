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

    const arquivos = imagensEscolhidas.slice();

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

        if (!arquivos.length || !criada || !criada.id) {
            concluir();
            return;
        }

        enviarImagens(criada.id, arquivos).done(concluir).fail(function() {
            // A publicação já existe; só as imagens falharam
            alertaErro('A publicação foi criada, mas nem todas as imagens puderam ser enviadas. Você pode adicioná-las ao editar.').then(function() {
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

const MAXIMO_DE_IMAGENS = 4;
let imagensEscolhidas = [];

function enviarImagem(publicacaoId, arquivo) {
    return $.ajax({
        url: '/publicacoes/' + publicacaoId + '/imagens',
        method: 'POST',
        data: arquivo,
        processData: false,
        contentType: arquivo.type
    });
}

// Envia uma por vez, para manter a ordem escolhida
function enviarImagens(publicacaoId, arquivos) {
    return arquivos.reduce(function(anterior, arquivo) {
        return anterior.then(function() { return enviarImagem(publicacaoId, arquivo); });
    }, $.Deferred().resolve());
}

function espacoParaImagens() {
    return MAXIMO_DE_IMAGENS - $('.remover-imagem-atual:not(:checked)').length;
}

function desenharPrevias() {
    const previa = $('#imagem-previa').empty();
    imagensEscolhidas.forEach(function(arquivo, i) {
        const item = $('<div class="image-thumb">');
        item.append($('<img>').attr({ src: URL.createObjectURL(arquivo), alt: 'Pré-visualização de ' + arquivo.name }));
        item.append($('<button type="button" class="remover-previa" aria-label="Remover imagem">').attr('data-indice', i).html('&times;'));
        previa.append(item);
    });
    previa.prop('hidden', imagensEscolhidas.length === 0);
    $('#imagem-nome').text(imagensEscolhidas.length
        ? imagensEscolhidas.length + (imagensEscolhidas.length === 1 ? ' imagem selecionada' : ' imagens selecionadas')
        : 'Adicionar imagens');
}

// Escolha das imagens (composer e edição); acumula entre escolhas, até o limite
$(document).on('change', '#imagem-publicacao', function() {
    const novas = Array.from(this.files || []);
    this.value = '';
    for (const arquivo of novas) {
        if (!validarImagem(arquivo)) {
            continue;
        }
        if (imagensEscolhidas.length >= espacoParaImagens()) {
            alertaErro('Uma publicação pode ter no máximo ' + MAXIMO_DE_IMAGENS + ' imagens.');
            break;
        }
        imagensEscolhidas.push(arquivo);
    }
    desenharPrevias();
});

$(document).on('click', '.remover-previa', function() {
    imagensEscolhidas.splice($(this).data('indice'), 1);
    desenharPrevias();
});

// Marcar imagens atuais para remoção libera espaço; descarta o que passar do limite
$(document).on('change', '.remover-imagem-atual', function() {
    imagensEscolhidas = imagensEscolhidas.slice(0, Math.max(espacoParaImagens(), 0));
    desenharPrevias();
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
    const arquivos = imagensEscolhidas.slice();
    // da última para a primeira, porque as seguintes sobem uma posição a cada remoção
    const posicoesRemovidas = $('.remover-imagem-atual:checked').map(function() { return $(this).data('posicao'); }).get().sort(function(a, b) { return b - a; });

    $.ajax({
        url: `/publicacoes/${publicacaoId}`,
        method: "PUT",
        data: {
            titulo: $('#titulo').val(),
            conteudo: $('#conteudo').val()
        }
    }).then(function() {
        return posicoesRemovidas.reduce(function(anterior, posicao) {
            return anterior.then(function() {
                return $.ajax({ url: `/publicacoes/${publicacaoId}/imagens/${posicao}`, method: 'DELETE' });
            });
        }, $.Deferred().resolve());
    }).then(function() {
        return enviarImagens(publicacaoId, arquivos);
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


// Scroll infinito: clica sozinho no botão quando ele se aproxima da tela (o botão continua como alternativa)
const observadorDoFeed = 'IntersectionObserver' in window ? new IntersectionObserver(function(entradas) {
    entradas.forEach(function(entrada) {
        if (entrada.isIntersecting) {
            observadorDoFeed.unobserve(entrada.target);
            if (!entrada.target.disabled) {
                entrada.target.click();
            }
        }
    });
}, { rootMargin: '400px' }) : null;

function observarCarregarMais() {
    const botao = document.getElementById('carregar-mais');
    if (observadorDoFeed && botao) {
        observadorDoFeed.observe(botao);
    }
}

$(observarCarregarMais);

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
        observarCarregarMais();
    }).fail(function() {
        botao.prop('disabled', false).removeAttr('aria-busy');
        alertaErro('Não foi possível carregar mais publicações.');
    });
});
