(function () {
    const emojis = [
        ['👍', 'Gostei'], ['❤️', 'Amei'], ['😂', 'Engraçado'],
        ['😮', 'Surpresa'], ['😢', 'Triste'], ['🙏', 'Agradecimento']
    ];

    function iniciar(area) {
        if (area.dataset.reacoesIniciadas || area.closest('[data-moderacao="true"]')) return;
        const tipo = area.dataset.reacoesTipo;
        const id = area.dataset.reacoesId;
        if (!['publicacoes', 'comentarios'].includes(tipo) || !/^[1-9]\d*$/.test(id)) return;
        area.dataset.reacoesIniciadas = '1';
        const url = '/' + tipo + '/' + encodeURIComponent(id) + '/reacoes';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'reacoes-toggle';
        toggle.textContent = 'Reagir';
        toggle.setAttribute('aria-label', tipo === 'publicacoes' ? 'Reagir à publicação' : 'Reagir ao comentário');
        toggle.setAttribute('aria-expanded', 'false');
        const lista = document.createElement('div');
        lista.className = 'reacoes-lista';
        lista.hidden = true;
        const resumo = document.createElement('div');
        resumo.className = 'reacoes-resumo';
        const aviso = document.createElement('span');
        aviso.className = 'reacoes-aviso';
        aviso.setAttribute('role', 'status');
        const acoes = tipo === 'publicacoes' && area.previousElementSibling;
        if (acoes && acoes.classList.contains('publication-actions')) {
            acoes.insertBefore(toggle, acoes.querySelector('.repost-action, .salvar-publicacao'));
        } else {
            area.appendChild(toggle);
        }
        area.append(resumo, lista, aviso);
        let dados = [];
        let carregado = false;
        let pendente = false;

        function desenhar() {
            lista.replaceChildren();
            resumo.replaceChildren();
            emojis.forEach(function (item) {
                const atual = dados.find(function (r) { return r.emoji === item[0]; });
                const criar = function () {
                    const botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'reacao-item';
                    botao.textContent = item[0] + (atual ? ' ' + atual.total : '');
                    botao.setAttribute('aria-label', item[1] + (atual ? ', ' + atual.total + ' reação(ões)' : ''));
                    botao.setAttribute('aria-pressed', String(!!(atual && atual.minha)));
                    botao.disabled = pendente || !carregado;
                    botao.addEventListener('click', function () {
                        if (pendente) return;
                        if (!lista.hidden) {
                            lista.hidden = true;
                            resumo.hidden = false;
                            toggle.setAttribute('aria-expanded', 'false');
                            toggle.focus();
                        }
                        pendente = true;
                        desenhar();
                        fetch(url, {
                            method: 'PUT', credentials: 'same-origin',
                            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                            body: JSON.stringify({ emoji: item[0], ativa: !(atual && atual.minha) })
                        }).then(function (resposta) {
                            if (!resposta.ok) throw new Error('Não foi possível registrar a reação.');
                            return carregar();
                        }).catch(function (erro) {
                            carregado = false;
                            aviso.textContent = erro.message;
                            console.error('Reações:', erro);
                        }).finally(function () {
                            pendente = false;
                            desenhar();
                        });
                    });
                    return botao;
                };
                lista.appendChild(criar());
                if (atual && atual.total > 0) resumo.appendChild(criar());
            });
        }

        function carregar() {
            return fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(function (resposta) {
                    if (!resposta.ok) throw new Error('Não foi possível carregar as reações.');
                    return resposta.json();
                }).then(function (resultado) {
                    dados = resultado;
                    carregado = true;
                    aviso.textContent = '';
                    desenhar();
                });
        }

        toggle.addEventListener('click', function () {
            lista.hidden = !lista.hidden;
            resumo.hidden = !lista.hidden;
            toggle.setAttribute('aria-expanded', String(!lista.hidden));
            if (!lista.hidden && !carregado) carregar().catch(function (erro) {
                aviso.textContent = erro.message;
                console.error('Reações:', erro);
            });
        });
        desenhar();
        const alvoObservacao = tipo === 'publicacoes' ? toggle : area;
        alvoObservacao.buscarReacoes = buscarInicial;
        if (window.IntersectionObserver) {
            observador.observe(alvoObservacao);
        } else {
            buscarInicial();
        }

        function buscarInicial() {
            carregar().catch(function (erro) {
                aviso.textContent = erro.message;
                console.error('Reações:', erro);
            });
        }
    }

    function iniciarNa(raiz) {
        if (raiz.matches && raiz.matches('[data-reacoes-tipo]')) iniciar(raiz);
        if (raiz.querySelectorAll) raiz.querySelectorAll('[data-reacoes-tipo]').forEach(iniciar);
    }

    const observador = window.IntersectionObserver && new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
            if (!entrada.isIntersecting) return;
            observador.unobserve(entrada.target);
            entrada.target.buscarReacoes();
        });
    }, { rootMargin: '200px' });
    iniciarNa(document);
    new MutationObserver(function (mutacoes) {
        mutacoes.forEach(function (mutacao) {
            mutacao.addedNodes.forEach(function (no) { if (no.nodeType === 1) iniciarNa(no); });
        });
    }).observe(document.body, { childList: true, subtree: true });
})();
