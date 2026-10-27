// Base das mensagens diretas: utilitários, contador do cabeçalho e conexão em tempo real (SSE)
(function () {
    // Com a conexão em tempo real (SSE) estes intervalos são só uma garantia caso ela caia
    const INTERVALO_CONTADOR = 30000;
    const INTERVALO_LISTA = 20000;
    const INTERVALO_CHAT = 15000;
    const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const LIMITE_IMAGEM = 4 * 1024 * 1024;

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto) el.textContent = texto;
        return el;
    }

    function api(url, metodo, corpo) {
        const opcoes = { method: metodo || 'GET', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
        if (corpo !== undefined) {
            opcoes.headers['Content-Type'] = 'application/json';
            opcoes.body = JSON.stringify(corpo);
        }
        return fetch(url, opcoes).then(function (resposta) {
            if (resposta.status === 401) { window.location.href = '/login'; throw { status: 401 }; }
            if (resposta.status === 204) return null;
            return resposta.json().catch(function () { return {}; }).then(function (dados) {
                if (!resposta.ok) throw { status: resposta.status, erro: dados.erro || 'Algo deu errado.' };
                return dados;
            });
        });
    }

    function hora(iso) {
        const data = new Date(iso);
        const hoje = new Date();
        if (data.toDateString() === hoje.toDateString()) {
            return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function avatar(usuarioId, versao, classe) {
        const caixa = criar('span', 'user-avatar ' + (classe || ''));
        caixa.setAttribute('aria-hidden', 'true');
        if (versao) {
            const img = document.createElement('img');
            img.alt = '';
            img.src = '/usuarios/' + usuarioId + '/foto?v=' + versao;
            caixa.appendChild(img);
        } else {
            caixa.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
        return caixa;
    }

    function mostrarSelo(selo, total) {
        if (!selo) return;
        selo.hidden = total < 1;
        selo.textContent = total > 99 ? '99+' : String(total);
    }

    // ---------- contador (todas as páginas) ----------
    const seloCabecalho = document.getElementById('msg-badge');
    const ouvintesDoTotal = [];

    function buscarTotal() {
        if (document.hidden) return;
        api('/conversas/nao-lidas').then(function (dados) {
            mostrarSelo(seloCabecalho, dados.total || 0);
            const link = document.getElementById('msg-link');
            if (link) link.setAttribute('aria-label', dados.total > 0 ? 'Mensagens (' + dados.total + ' novas)' : 'Mensagens');
            ouvintesDoTotal.forEach(function (f) { f(dados); });
        }).catch(function () {});
    }

    // ---------- tempo real (Server-Sent Events) ----------
    const ouvintesDeEvento = [];

    function iniciarEventos() {
        if (!window.EventSource) return;
        const fonte = new EventSource('/eventos');
        fonte.onmessage = function (evento) {
            let dados;
            try { dados = JSON.parse(evento.data); } catch (e) { return; }
            if (dados.tipo === 'mensagem' || dados.tipo === 'lido') buscarTotal();
            ouvintesDeEvento.forEach(function (f) { f(dados); });
        };
    }

    if (seloCabecalho) {
        buscarTotal();
        window.setInterval(buscarTotal, INTERVALO_CONTADOR);
        iniciarEventos();
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) return;
            buscarTotal();
            ouvintesDeEvento.forEach(function (f) { f({ tipo: 'mensagem' }); });
        });
    }

    window.OrbyMensagens = {
        INTERVALO_LISTA, INTERVALO_CHAT, EMOJIS, LIMITE_IMAGEM,
        criar, api, hora, avatar, mostrarSelo, buscarTotal, ouvintesDeEvento, ouvintesDoTotal,
    };
})();
