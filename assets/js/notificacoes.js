// Notificações: sino na barra de navegação com contador e lista das interações recentes
(function () {
    const botao = document.getElementById('notif-toggle');
    if (!botao) return;

    const painel = document.getElementById('notif-painel');
    const lista = document.getElementById('notif-lista');
    const selo = document.getElementById('notif-badge');
    const INTERVALO = 45000;
    let timer = null;

    const MENSAGENS = {
        curtida_publicacao: 'curtiu sua publicação',
        comentario: 'comentou na sua publicação',
        curtida_comentario: 'curtiu seu comentário',
        mencao: 'mencionou você'
    };
    const ICONES = {
        curtida_publicacao: 'fa-heart',
        comentario: 'fa-comment',
        curtida_comentario: 'fa-heart',
        mencao: 'fa-at'
    };

    function mostrarTotal(total) {
        selo.hidden = total < 1;
        selo.textContent = total > 99 ? '99+' : String(total);
        botao.setAttribute('aria-label', total > 0 ? 'Notificações (' + total + ' novas)' : 'Notificações');
    }

    function buscarTotal() {
        return $.get('/notificacoes/nao-lidas').done(function (dados) {
            mostrarTotal(dados.total || 0);
        }).fail(function () {
            window.clearInterval(timer);
        });
    }

    function tempoRelativo(iso) {
        const segundos = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        if (segundos < 60) return 'agora';
        if (segundos < 3600) return Math.floor(segundos / 60) + ' min';
        if (segundos < 86400) return Math.floor(segundos / 3600) + ' h';
        if (segundos < 604800) return Math.floor(segundos / 86400) + ' d';
        return new Date(iso).toLocaleDateString('pt-BR');
    }

    function mensagem(n) {
        if (n.tipo === 'mencao') {
            return n.comentarioId ? 'mencionou você em um comentário' : 'mencionou você em uma publicação';
        }
        return MENSAGENS[n.tipo] || 'interagiu com você';
    }

    function montarItem(n) {
        let destino = '/publicacoes/' + n.publicacaoId;
        if (n.comentarioId) destino += '?comentario=' + n.comentarioId;

        const texto = $('<span class="notif-texto">')
            .append($('<strong>').text('@' + n.atorNick))
            .append(document.createTextNode(' ' + mensagem(n)));
        const titulo = $('<span class="notif-titulo">').text(n.publicacaoTitulo);
        const quando = $('<time class="notif-tempo">').text(tempoRelativo(n.criadaEm));
        const icone = $('<span class="notif-icone" aria-hidden="true">')
            .addClass('notif-icone--' + n.tipo)
            .append($('<i class="fa-solid">').addClass(ICONES[n.tipo] || 'fa-bell'));

        const excluir = $('<button type="button" class="notif-excluir">')
            .attr('aria-label', 'Excluir notificação').attr('title', 'Excluir notificação')
            .append('<i class="fa-solid fa-xmark" aria-hidden="true"></i>')
            .on('click', function () { excluirNotificacao(n.id, excluir.closest('li')); });

        return $('<li class="notif-linha">').append(
            $('<a class="notif-item">').attr('href', destino).toggleClass('is-nova', !n.lida)
                .append(icone, $('<span class="notif-corpo">').append(texto, titulo, quando)),
            excluir
        );
    }

    function mostrarVazio() {
        $(lista).html('<li class="notif-vazia"><i class="fa-regular fa-bell" aria-hidden="true"></i> Nenhuma notificação por enquanto.</li>');
    }

    function excluirNotificacao(id, linha) {
        linha.find('.notif-excluir').prop('disabled', true);
        $.ajax({ url: '/notificacoes/' + id, method: 'DELETE' }).done(function () {
            linha.remove();
            if (!lista.children.length) mostrarVazio();
            botao.focus();
        }).fail(function () {
            linha.find('.notif-excluir').prop('disabled', false);
        });
    }

    function carregarLista() {
        lista.setAttribute('aria-busy', 'true');
        return $.get('/notificacoes').done(function (itens) {
            $(lista).empty();
            if (!itens.length) {
                mostrarVazio();
                return;
            }
            itens.forEach(function (n) { $(lista).append(montarItem(n)); });
            if (itens.some(function (n) { return !n.lida; })) {
                $.post('/notificacoes/lidas').done(function () { mostrarTotal(0); });
            }
        }).fail(function () {
            $(lista).html('<li class="notif-vazia">Não foi possível carregar as notificações.</li>');
        }).always(function () {
            lista.removeAttribute('aria-busy');
        });
    }

    function abrir(aberto) {
        painel.hidden = !aberto;
        botao.setAttribute('aria-expanded', String(aberto));
        if (aberto) carregarLista();
    }

    botao.addEventListener('click', function () { abrir(painel.hidden); });

    document.addEventListener('click', function (evento) {
        // composedPath resiste ao Font Awesome trocar o <i> por <svg> durante o clique
        const caminho = evento.composedPath();
        if (!painel.hidden && !caminho.includes(painel) && !caminho.includes(botao)) abrir(false);
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && !painel.hidden) {
            abrir(false);
            botao.focus();
        }
    });

    buscarTotal();
    timer = window.setInterval(function () {
        if (!document.hidden && painel.hidden) buscarTotal();
    }, INTERVALO);
})();
