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

$('#felas-info').on('click', function () {
    const aberto = this.getAttribute('aria-expanded') !== 'true';
    this.setAttribute('aria-expanded', String(aberto));
    document.getElementById('felas-info-conteudo').hidden = !aberto;
});

$('#audiencia-publicacao').on('click', function () {
    const botao = $(this);
    const felas = botao.attr('aria-pressed') !== 'true';
    botao.attr('aria-pressed', String(felas));
    $('#nova-publicacao').trigger('input');
});

const formularioPublicacao = document.getElementById('nova-publicacao');
const paginaHome = document.querySelector('.home-page[data-usuario-id]');
const chaveRascunho = paginaHome && paginaHome.dataset.usuarioId ? 'orby-rascunho-' + paginaHome.dataset.usuarioId : '';
let publicacaoCriada = false;
let apagarRascunho = function () { return Promise.resolve(); };
let salvarImagensRascunho = function () {};
let rascunhoPendente = false;
let rascunhoComErro = false;

function atualizarOpcoesEnquete(valores) {
    const lista = $('#enquete-opcoes').empty();
    valores.forEach(function (valor, indice) {
        const campo = $('<div class="enquete-campo">');
        $('<span class="enquete-numero" aria-hidden="true">').text(indice + 1).appendTo(campo);
        $('<input type="text" class="form-control enquete-opcao-texto" maxlength="140">')
            .attr({ 'aria-label': 'Opção ' + (indice + 1), placeholder: 'Escreva a opção ' + (indice + 1) }).val(valor).appendTo(campo);
        if (valores.length > 2) {
            $('<button type="button" class="enquete-remover"><span aria-hidden="true">&times;</span></button>')
                .attr({ 'aria-label': 'Remover opção ' + (indice + 1), title: 'Remover opção' })
                .on('click', function () {
                    const atuais = textosEnquete();
                    atuais.splice(indice, 1);
                    atualizarOpcoesEnquete(atuais);
                    $('#nova-publicacao').trigger('input');
                    $('.enquete-opcao-texto').eq(Math.min(indice, atuais.length - 1)).trigger('focus');
                }).appendTo(campo);
        }
        lista.append(campo);
    });
    $('#enquete-adicionar').prop('disabled', valores.length >= 10);
    atualizarEnqueteAtiva();
}

function textosEnquete() {
    return $('.enquete-opcao-texto').map(function () { return this.value; }).get();
}

function atualizarEnqueteAtiva() {
    const ativa = $('#enquete-ativa').prop('checked');
    $('#enquete-ativa').attr('aria-expanded', String(ativa));
    $('#enquete-campos').prop('hidden', !ativa);
    $('.enquete-opcao-texto').prop('required', ativa);
}

if (formularioPublicacao) {
    atualizarOpcoesEnquete(['', '']);
    $('#enquete-ativa').on('change', atualizarEnqueteAtiva);
    $('#enquete-adicionar').on('click', function () {
        const atuais = textosEnquete();
        if (atuais.length >= 10) return;
        atuais.push('');
        atualizarOpcoesEnquete(atuais);
        $('#nova-publicacao').trigger('input');
        $('.enquete-opcao-texto').last().trigger('focus');
    });
    $('[data-enquete-horas]').on('click', function () {
        const horas = Number(this.dataset.enqueteHoras);
        const data = new Date(Math.ceil((Date.now() + horas * 3600000) / 60000) * 60000);
        const doisDigitos = function (valor) { return String(valor).padStart(2, '0'); };
        const valor = data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate()) +
            'T' + doisDigitos(data.getHours()) + ':' + doisDigitos(data.getMinutes());
        $('#enquete-prazo').val(valor).trigger('input');
    });
}

$(document).on('submit', '.enquete-voto', function (evento) {
    evento.preventDefault();
    const form = $(this);
    const opcao = form.find('input[name="opcao"]:checked').val();
    const publicacao = form.closest('[data-publicacao-id]').attr('data-publicacao-id');
    if (!opcao || form.data('enviando')) return;
    Swal.fire({
        title: 'Confirmar voto?',
        text: 'Depois de votar, não será possível trocar sua escolha.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar voto',
        cancelButtonText: 'Cancelar'
    }).then(function (resultado) {
        if (!resultado.isConfirmed || form.data('enviando')) return;
        form.data('enviando', true).find('button').prop('disabled', true);
        $.ajax({ url: '/publicacoes/' + encodeURIComponent(publicacao) + '/enquete/' + encodeURIComponent(opcao) + '/votar', method: 'POST' })
            .done(function () { window.location.reload(); })
            .fail(function (resposta) {
                form.data('enviando', false).find('button').prop('disabled', false);
                alertaErro(resposta.status === 409
                    ? 'A enquete pode ter encerrado ou seu voto já foi registrado. Atualize a página para conferir.'
                    : 'Não foi possível registrar seu voto. Atualize a página antes de tentar novamente.');
            });
    });
});

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
    if (publicacaoCriada || $('#nova-publicacao').data('enviando')) return;

    const arquivos = imagensEscolhidas.slice();
    let enquete = '';
    if ($('#enquete-ativa').prop('checked')) {
        const opcoes = textosEnquete().map(function (texto) { return texto.trim(); });
        if (opcoes.some(function (texto) { return !texto; }) ||
            new Set(opcoes.map(function (texto) { return texto.toLowerCase(); })).size !== opcoes.length) {
            alertaErro('Preencha opções diferentes para sua enquete.');
            return;
        }
        const prazo = $('#enquete-prazo').val();
        const data = prazo ? new Date(prazo) : null;
        if (data && (isNaN(data.getTime()) || data.getTime() <= Date.now())) {
            alertaErro('Escolha uma data futura para encerrar a enquete.');
            return;
        }
        enquete = JSON.stringify({ titulo: $('#enquete-titulo').val().trim(), opcoes: opcoes.map(function (texto) { return { texto: texto }; }), encerraEm: data ? data.toISOString() : null });
    }

    $('#nova-publicacao').data('enviando', true);
    const botao = $('#nova-publicacao button[type="submit"]').prop('disabled', true);

    $.ajax({
        url: "/publicacoes",
        method: "POST",
        data: {
            titulo: $('#titulo-publicacao').val(),
            conteudo: $('#conteudo-publicacao').val(),
            felas: $('#audiencia-publicacao').attr('aria-pressed') === 'true',
            enquete: enquete
        }
    }).done(function(criada) {
        publicacaoCriada = true;
        const concluir = function() {
            apagarRascunho().then(function () {
                return avisoRapido('Publicação criada com sucesso!');
            }).then(function () {
                window.location = '/home';
            });
        };

        if (!arquivos.length || !criada || !criada.id) {
            concluir();
            return;
        }

        enviarImagens(criada.id, arquivos).done(concluir).fail(function() {
            // A publicação já existe; só as imagens falharam
            apagarRascunho().then(function () {
                return alertaErro('A publicação foi criada, mas nem todas as imagens puderam ser enviadas. Na edição, confira as imagens já enviadas e adicione as que faltam.');
            }).then(function() {
                window.location = '/publicacoes/' + criada.id + '/atualizar';
            });
        });
    }).fail(function(resposta) {
        $('#nova-publicacao').data('enviando', false);
        botao.prop('disabled', false);
        const mensagem = resposta.status === 0 || resposta.status >= 500
            ? 'Não foi possível confirmar se a publicação foi criada. Confira o feed antes de tentar novamente para evitar duplicatas. Seu texto e as imagens continuam aqui.'
            : 'Não foi possível criar a publicação. Seu texto e as imagens selecionadas continuam aqui para você tentar novamente.';
        alertaErro(mensagem);
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

window.addEventListener('beforeunload', function (evento) {
    if (!formularioPublicacao || publicacaoCriada || (!rascunhoPendente && !rascunhoComErro)) return;
    evento.preventDefault();
    evento.returnValue = '';
});

function enviarImagem(publicacaoId, imagem) {
    return $.ajax({
        url: '/publicacoes/' + publicacaoId + '/imagens',
        method: 'POST',
        data: imagem.arquivo,
        processData: false,
        contentType: imagem.arquivo.type,
        headers: { 'X-Orby-Descricao': encodeURIComponent(imagem.descricao) }
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
    const previa = $('#imagem-previa');
    previa.find('img').each(function () { if (this.src.startsWith('blob:')) URL.revokeObjectURL(this.src); });
    previa.empty();
    imagensEscolhidas.forEach(function(imagem, i) {
        const item = $('<div class="image-preview-item">');
        const miniatura = $('<div class="image-thumb">');
        miniatura.append($('<img>').attr({ src: URL.createObjectURL(imagem.arquivo), alt: 'Pré-visualização de ' + imagem.arquivo.name }));
        miniatura.append($('<button type="button" class="remover-previa" aria-label="Remover imagem">').attr('data-indice', i).html('&times;'));
        const campo = $('<div class="image-description">');
        const id = 'descricao-imagem-' + i;
        campo.append($('<label>').attr('for', id).text('Descrição da imagem ' + (i + 1) + ' (opcional)'));
        campo.append($('<textarea class="form-control descricao-imagem" maxlength="500" rows="2">')
            .attr({ id: id, 'data-indice': i, placeholder: 'Conte o que aparece na imagem' }).val(imagem.descricao));
        item.append(miniatura, campo);
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
        imagensEscolhidas.push({ arquivo: arquivo, descricao: '' });
    }
    desenharPrevias();
    $('#nova-publicacao').trigger('input');
    salvarImagensRascunho();
});

$(document).on('click', '.remover-previa', function() {
    imagensEscolhidas.splice($(this).data('indice'), 1);
    desenharPrevias();
    $('#nova-publicacao').trigger('input');
    salvarImagensRascunho();
});

$(document).on('input', '.descricao-imagem', function () {
    const imagem = imagensEscolhidas[Number(this.dataset.indice)];
    if (imagem) imagem.descricao = this.value;
    salvarImagensRascunho();
});

// Marcar imagens atuais para remoção libera espaço; descarta o que passar do limite
$(document).on('change', '.remover-imagem-atual', function() {
    imagensEscolhidas = imagensEscolhidas.slice(0, Math.max(espacoParaImagens(), 0));
    desenharPrevias();
});

function iniciarRascunho() {
    if (!formularioPublicacao || !chaveRascunho) return;
    const campos = Array.from(formularioPublicacao.querySelectorAll('input, textarea, button'));
    const estados = campos.map(function (campo) { return campo.disabled; });
    campos.forEach(function (campo) { campo.disabled = true; });
    formularioPublicacao.setAttribute('aria-busy', 'true');
    let dados = null;
    let banco = null;
    let temporizador = null;
    let gravacoes = 0;
    let faltamImagens = false;
    let versaoImagens = '';
    let falhaTexto = '';
    let falhaImagens = '';
    const aviso = $('#rascunho-status');

    function atualizarAviso() {
        rascunhoComErro = !!(falhaTexto || falhaImagens);
        aviso.text(falhaTexto || falhaImagens);
    }

    function informarErro(texto, erro, tipo) {
        if (tipo === 'texto') falhaTexto = texto;
        else falhaImagens = texto;
        console.error(texto, erro);
        atualizarAviso();
    }

    try {
        dados = JSON.parse(localStorage.getItem(chaveRascunho) || sessionStorage.getItem(chaveRascunho) || 'null');
        if (dados && typeof dados.titulo === 'string' && typeof dados.conteudo === 'string') {
            $('#titulo-publicacao').val(dados.titulo);
            $('#conteudo-publicacao').val(dados.conteudo);
            $('#audiencia-publicacao').attr('aria-pressed', String(dados.felas === true));
            faltamImagens = dados.tinhaImagens === true;
            versaoImagens = typeof dados.versaoImagens === 'string' ? dados.versaoImagens : '';
            if (dados.enquete && Array.isArray(dados.enquete.opcoes) &&
                dados.enquete.opcoes.length >= 2 && dados.enquete.opcoes.length <= 10 &&
                dados.enquete.opcoes.every(function (texto) { return typeof texto === 'string'; })) {
                $('#enquete-ativa').prop('checked', dados.enquete.ativa === true);
                $('#enquete-titulo').val(typeof dados.enquete.titulo === 'string' ? dados.enquete.titulo : '');
                $('#enquete-prazo').val(typeof dados.enquete.prazo === 'string' ? dados.enquete.prazo : '');
                atualizarOpcoesEnquete(dados.enquete.opcoes);
            }
        }
    } catch (erro) {
        informarErro('Não conseguimos recuperar seu rascunho neste navegador.', erro, 'texto');
    }

    function transacao(acao, valor) {
        return new Promise(function (resolve, reject) {
            if (!banco) { reject(new Error('Armazenamento de imagens indisponível')); return; }
            const tx = banco.transaction('imagens', acao === 'get' ? 'readonly' : 'readwrite');
            const store = tx.objectStore('imagens');
            const pedido = acao === 'get' ? store.get(chaveRascunho) : acao === 'delete'
                ? store.delete(chaveRascunho) : store.put(valor, chaveRascunho);
            tx.oncomplete = function () { resolve(pedido.result); };
            tx.onerror = function () { reject(tx.error); };
            tx.onabort = function () { reject(tx.error || new Error('Transação cancelada')); };
        });
    }

    function salvarTexto() {
        if (publicacaoCriada) return;
        try {
            const rascunho = {
                titulo: $('#titulo-publicacao').val(),
                conteudo: $('#conteudo-publicacao').val(),
                felas: $('#audiencia-publicacao').attr('aria-pressed') === 'true',
                enquete: { ativa: $('#enquete-ativa').prop('checked'), titulo: $('#enquete-titulo').val(), opcoes: textosEnquete(), prazo: $('#enquete-prazo').val() },
                tinhaImagens: faltamImagens || imagensEscolhidas.length > 0,
                versaoImagens: versaoImagens
            };
            const temRascunho = !!(rascunho.titulo || rascunho.conteudo || rascunho.felas || rascunho.tinhaImagens || rascunho.enquete.ativa || rascunho.enquete.titulo || rascunho.enquete.opcoes.some(Boolean) || rascunho.enquete.prazo);
            $('#descartar-rascunho').prop('hidden', !temRascunho);
            if (temRascunho) localStorage.setItem(chaveRascunho, JSON.stringify(rascunho));
            else {
                localStorage.removeItem(chaveRascunho);
                sessionStorage.removeItem(chaveRascunho);
            }
            falhaTexto = '';
            atualizarAviso();
        } catch (erro) {
            informarErro('Não conseguimos guardar seu rascunho neste navegador. Copie seu texto antes de sair.', erro, 'texto');
        }
    }

    salvarImagensRascunho = function () {
        if (publicacaoCriada) return;
        clearTimeout(temporizador);
        versaoImagens = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        salvarTexto();
        rascunhoPendente = true;
        temporizador = setTimeout(function () {
            temporizador = null;
            gravacoes++;
            const versao = versaoImagens;
            const imagens = imagensEscolhidas.map(function (imagem) {
                return { arquivo: imagem.arquivo, descricao: imagem.descricao };
            });
            transacao('put', { versao: versao, imagens: imagens }).then(function () {
                if (versao !== versaoImagens) return;
                faltamImagens = false;
                falhaImagens = '';
                atualizarAviso();
                salvarTexto();
            }).catch(function (erro) {
                if (versao === versaoImagens) informarErro('Não conseguimos guardar as imagens do rascunho neste navegador.', erro);
            }).finally(function () {
                gravacoes--;
                rascunhoPendente = gravacoes > 0 || temporizador !== null;
            });
        }, 300);
    };

    apagarRascunho = function () {
        clearTimeout(temporizador);
        temporizador = null;
        let erroRemocao = null;
        const removerImagens = banco ? transacao('delete') : Promise.resolve();
        return removerImagens.catch(function (erro) {
            erroRemocao = erro;
        }).then(function () {
            try {
                localStorage.removeItem(chaveRascunho);
                sessionStorage.removeItem(chaveRascunho);
            } catch (erro) {
                erroRemocao = erro;
            }
            if (erroRemocao) {
                console.error('Não foi possível apagar o rascunho:', erroRemocao);
                return Swal.fire('Rascunho não removido', 'Parte do rascunho pode continuar salva neste navegador.', 'warning').then(function () { return false; });
            }
            return true;
        });
    };

    $('#descartar-rascunho').on('click', function () {
        Swal.fire({
            title: 'Descartar rascunho?',
            text: 'Seu texto, enquete e imagens selecionadas serão removidos deste navegador.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Descartar',
            cancelButtonText: 'Continuar escrevendo'
        }).then(function (resultado) {
            if (!resultado.isConfirmed) return;
            const controles = Array.from(formularioPublicacao.querySelectorAll('input, textarea, button'));
            const desabilitados = controles.map(function (campo) { return campo.disabled; });
            controles.forEach(function (campo) { campo.disabled = true; });
            apagarRascunho().then(function (removido) {
                if (!removido) return;
                $('#titulo-publicacao, #conteudo-publicacao').val('');
                $('#audiencia-publicacao').attr('aria-pressed', 'false');
                $('#enquete-ativa').prop('checked', false);
                $('#enquete-titulo').val('');
                $('#enquete-prazo').val('');
                atualizarOpcoesEnquete(['', '']);
                imagensEscolhidas = [];
                faltamImagens = false;
                versaoImagens = '';
                falhaTexto = '';
                falhaImagens = '';
                atualizarAviso();
                desenharPrevias();
            }).finally(function () {
                controles.forEach(function (campo, i) { campo.disabled = desabilitados[i]; });
                $('#enquete-adicionar').prop('disabled', textosEnquete().length >= 10);
                formularioPublicacao.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    });

    const abrir = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error('IndexedDB indisponível')); return; }
        const pedido = indexedDB.open('orby-rascunhos', 1);
        pedido.onupgradeneeded = function () { pedido.result.createObjectStore('imagens'); };
        pedido.onsuccess = function () { banco = pedido.result; resolve(); };
        pedido.onerror = function () { reject(pedido.error); };
        pedido.onblocked = function () { reject(new Error('Armazenamento bloqueado')); };
    });

    abrir.then(function () { return transacao('get'); }).then(function (registro) {
        if (!faltamImagens) return;
        const imagens = Array.isArray(registro) && !versaoImagens ? registro : registro && registro.versao === versaoImagens && registro.imagens;
        if (!Array.isArray(imagens) || imagens.length === 0 ||
            imagens.length > MAXIMO_DE_IMAGENS ||
            imagens.some(function (imagem) { return !(imagem.arquivo instanceof Blob) || typeof imagem.descricao !== 'string'; })) {
            throw new Error('Imagens do rascunho não encontradas');
        }
        imagensEscolhidas = imagens;
        faltamImagens = false;
        desenharPrevias();
    }).catch(function (erro) {
        if (faltamImagens) {
            informarErro('Não conseguimos recuperar as imagens do rascunho. Selecione-as novamente antes de publicar.', erro);
        } else {
            informarErro('Não conseguimos guardar as imagens para recuperar depois. Você ainda pode publicar.', erro);
        }
    }).finally(function () {
        campos.forEach(function (campo, i) { campo.disabled = estados[i]; });
        $('#enquete-adicionar').prop('disabled', textosEnquete().length >= 10);
        formularioPublicacao.removeAttribute('aria-busy');
        formularioPublicacao.dispatchEvent(new Event('input', { bubbles: true }));
        $(formularioPublicacao).on('input', salvarTexto);
        const temRascunho = !!($('#titulo-publicacao').val() || $('#conteudo-publicacao').val() ||
            $('#audiencia-publicacao').attr('aria-pressed') === 'true' || $('#enquete-ativa').prop('checked') ||
            $('#enquete-titulo').val() || textosEnquete().some(Boolean) || $('#enquete-prazo').val() || faltamImagens || imagensEscolhidas.length);
        $('#descartar-rascunho').prop('hidden', !temRascunho);
    });
}

iniciarRascunho();

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
        return $('.descricao-imagem-atual').get().reduce(function (anterior, campo) {
            return anterior.then(function () {
                if (posicoesRemovidas.indexOf(Number(campo.dataset.posicao)) !== -1) return;
                return $.ajax({
                    url: `/publicacoes/${publicacaoId}/imagens/${campo.dataset.posicao}/descricao`,
                    method: 'PUT',
                    data: { descricao: campo.value }
                });
            });
        }, $.Deferred().resolve());
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
        window.OrbyEnquetes && window.OrbyEnquetes.iniciar();
        marcarMencoes(document.getElementById('feed-lista'));
        observarCarregarMais();
    }).fail(function() {
        botao.prop('disabled', false).removeAttr('aria-busy');
        alertaErro('Não foi possível carregar mais publicações.');
    });
});
