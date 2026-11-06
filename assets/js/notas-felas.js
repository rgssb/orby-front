(function () {
    const painel = document.getElementById('notas-felas');
    if (!painel) return;
    const perfil = painel.dataset.perfil;
    const proprio = painel.dataset.proprio === 'true';
    const status = document.getElementById('notas-status');
    const configuracao = document.getElementById('notas-configuracao');
    const ativas = document.getElementById('notas-ativas');
    const form = document.getElementById('notas-form');
    const texto = document.getElementById('notas-texto');
    const lista = document.getElementById('notas-lista');
    const listaEsquerda = document.getElementById('notas-lista-esquerda') || lista;
    const lateral = document.getElementById('notas-lateral');
    const mais = document.getElementById('notas-mais');
    let proxima = 0;
    let carregando = false;
    let quantidade = 0;

    function atualizarEstadoLista() {
        if (lateral) lateral.hidden = !listaEsquerda.children.length;
    }

    function erro(resposta, alternativa) {
        return resposta.responseJSON && resposta.responseJSON.erro || alternativa;
    }

    function adicionarNota(nota) {
        const item = $('<li class="profile-note">');
        const cabecalho = $('<div class="profile-note-header">');
        const pessoa = $('<a class="profile-note-person">').attr('href', '/usuarios/' + nota.autorId);
        const avatar = $('<span class="user-avatar" aria-hidden="true">');
        if (nota.fotoVersao) {
            avatar.append($('<img alt="" loading="lazy">').attr('src', '/usuarios/' + nota.autorId + '/foto?v=' + nota.fotoVersao));
        } else {
            avatar.append($('<i class="fa-solid fa-user" aria-hidden="true">'));
        }
        pessoa.append(avatar, $('<span class="profile-note-identity">').append($('<strong>').text(nota.nome), $('<small>').text('@' + nota.nick)));
        cabecalho.append(pessoa);
        if (nota.podeExcluir) {
            const remover = $('<button type="button" class="btn btn-outline-secondary btn-sm profile-note-delete">')
                .attr('aria-label', 'Excluir nota de ' + nota.nome)
                .attr('title', 'Excluir nota')
                .append($('<i class="fa-solid fa-trash-can" aria-hidden="true">'));
            remover.on('click', function () {
                remover.prop('disabled', true);
                $.ajax({ url: '/notas-felas/' + nota.id, method: 'DELETE' }).done(function () {
                    item.remove();
                    atualizarEstadoLista();
                    if (!lista.children.length && !listaEsquerda.children.length && !proxima) status.textContent = 'Ainda não há notas por aqui.';
                }).fail(function (resposta) {
                    remover.prop('disabled', false);
                    status.textContent = erro(resposta, 'Não foi possível excluir a nota.');
                });
            });
            cabecalho.append(remover);
        }
        item.append(cabecalho, $('<p>').text(nota.conteudo));
        $(quantidade++ % 2 === 0 ? lista : listaEsquerda).append(item);
    }

    function carregar(continuar) {
        if (carregando) return;
        carregando = true;
        mais.disabled = true;
        const url = '/usuarios/' + perfil + '/notas-felas' + (continuar ? '?antes=' + proxima : '');
        $.get(url).done(function (dados) {
            painel.hidden = false;
            configuracao.hidden = !proprio;
            ativas.checked = dados.ativas;
            form.hidden = !dados.podeEscrever;
            if (!continuar || !dados.ativas) {
                $(lista).empty();
                $(listaEsquerda).empty();
                quantidade = 0;
            }
            proxima = dados.proxima;
            if (dados.ativas) dados.notas.forEach(adicionarNota);
            atualizarEstadoLista();
            mais.hidden = !dados.ativas || !proxima;
            status.textContent = !dados.ativas ? (proprio ? 'As notas estão ocultas. Ative para exibi-las novamente.' : 'As notas estão desativadas neste perfil.') :
                (lista.children.length || listaEsquerda.children.length ? '' : 'Ainda não há notas por aqui.');
        }).fail(function (resposta) {
            if (!proprio && resposta.status === 404) {
                painel.hidden = true;
                if (lateral) lateral.hidden = true;
            } else {
                status.textContent = erro(resposta, 'Não foi possível carregar as notas. Recarregue a página.');
            }
        }).always(function () {
            carregando = false;
            mais.disabled = false;
        });
    }

    ativas.addEventListener('change', function () {
        const valor = ativas.checked;
        ativas.disabled = true;
        $.ajax({
            url: '/privacidade/notas-felas', method: 'PUT',
            contentType: 'application/json', data: JSON.stringify({ ativas: valor })
        }).done(function () {
            carregar(false);
        }).fail(function (resposta) {
            ativas.checked = !valor;
            status.textContent = erro(resposta, 'Não foi possível alterar a preferência.');
        }).always(function () { ativas.disabled = false; });
    });
    form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        const conteudo = texto.value.trim();
        if (!conteudo) {
            status.textContent = 'Escreva uma nota antes de publicar.';
            return;
        }
        const botao = form.querySelector('button');
        botao.disabled = true;
        $.ajax({
            url: '/usuarios/' + perfil + '/notas-felas', method: 'POST',
            contentType: 'application/json', data: JSON.stringify({ conteudo: conteudo })
        }).done(function () {
            texto.value = '';
            carregar(false);
        }).fail(function (resposta) {
            status.textContent = erro(resposta, 'Não foi possível publicar a nota.');
        }).always(function () { botao.disabled = false; });
    });
    mais.addEventListener('click', function () { if (proxima) carregar(true); });
    carregar(false);
})();
