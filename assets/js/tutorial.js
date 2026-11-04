(function () {
    const pagina = document.querySelector('.home-page[data-usuario-id]');
    if (!pagina || !pagina.dataset.usuarioId) return;

    const chave = 'orby-tutorial-' + pagina.dataset.usuarioId;
    const passos = [
        { alvo: '.composer-card', titulo: 'Compartilhe no Orby', texto: 'Escreva uma publicação e, se quiser, adicione até quatro imagens.' },
        { alvo: '#audiencia-publicacao', titulo: 'Escolha seu público', texto: 'Ative Felas para compartilhar com sua rodinha. Toque no ícone de informação ao lado para conhecer melhor essa opção.', composer: true },
        { alvo: '.feed-tabs', titulo: 'Encontre publicações', texto: 'Veja as pessoas que segue, suas publicações para Felas ou descubra novidades em Explorar. Você também pode escolher entre recentes e em alta.' },
        { alvo: '.navbar-search-toggle', alternativa: '.navbar-toggler', titulo: 'Pesquise', texto: 'Use a pesquisa para encontrar pessoas ou publicações. No celular, abra primeiro o menu de navegação.' },
        { alvo: '[data-nav="/perfil"]', alternativa: '.navbar-toggler', titulo: 'Seu perfil e suas configurações', texto: 'No menu, acesse Meu Perfil para editar seus dados, gerenciar Felas e ver pedidos para seguir.' },
        { alvo: '[data-nav="/mensagens"]', alternativa: '.navbar-toggler', titulo: 'Converse e acompanhe novidades', texto: 'Acesse Mensagens para conversar e use o sino para acompanhar suas notificações.' }
    ];
    let indice = 0;
    let alvoAtual = null;
    let anterior = null;
    let painel = null;

    function visivel(elemento) {
        return elemento && elemento.getClientRects().length > 0;
    }

    function encerrar() {
        if (alvoAtual) alvoAtual.classList.remove('tutorial-destaque');
        if (painel) painel.remove();
        painel = null;
        try { localStorage.setItem(chave, 'concluido'); }
        catch (erro) { console.error('Não foi possível guardar a conclusão do tutorial:', erro); }
        document.removeEventListener('keydown', aoTeclar);
        if (anterior && anterior.isConnected) anterior.focus();
    }

    function aoTeclar(evento) {
        if (evento.key === 'Escape') {
            evento.preventDefault();
            encerrar();
        } else if (evento.key === 'Tab' && painel) {
            const botoes = Array.from(painel.querySelectorAll('button:not([disabled])'));
            if (evento.shiftKey && document.activeElement === botoes[0]) {
                evento.preventDefault();
                botoes[botoes.length - 1].focus();
            } else if (!evento.shiftKey && document.activeElement === botoes[botoes.length - 1]) {
                evento.preventDefault();
                botoes[0].focus();
            }
        }
    }

    function mostrar() {
        if (alvoAtual) alvoAtual.classList.remove('tutorial-destaque');
        const passo = passos[indice];
        if (passo.composer) {
            const toggle = document.querySelector('.composer-toggle');
            if (visivel(toggle) && toggle.getAttribute('aria-expanded') === 'false') toggle.click();
        }
        alvoAtual = document.querySelector(passo.alvo);
        if (!visivel(alvoAtual)) alvoAtual = document.querySelector(passo.alternativa || passo.alvo);
        if (visivel(alvoAtual)) {
            alvoAtual.classList.add('tutorial-destaque');
            alvoAtual.scrollIntoView({ block: 'center', behavior: 'auto' });
            painel.classList.toggle('is-top', alvoAtual.getBoundingClientRect().top > window.innerHeight / 2);
        }
        painel.querySelector('#tutorial-progresso').textContent = 'Passo ' + (indice + 1) + ' de ' + passos.length;
        painel.querySelector('#tutorial-titulo').textContent = passo.titulo;
        painel.querySelector('#tutorial-texto').textContent = passo.texto;
        painel.querySelector('#tutorial-voltar').disabled = indice === 0;
        painel.querySelector('#tutorial-proximo').textContent = indice === passos.length - 1 ? 'Concluir' : 'Próximo';
        painel.querySelector('#tutorial-proximo').focus({ preventScroll: true });
    }

    function iniciar() {
        if (painel) return;
        anterior = document.activeElement;
        indice = 0;
        painel = document.createElement('section');
        painel.className = 'tutorial-painel';
        painel.setAttribute('role', 'dialog');
        painel.setAttribute('aria-labelledby', 'tutorial-titulo');
        painel.setAttribute('aria-describedby', 'tutorial-texto');
        painel.innerHTML = '<p id="tutorial-progresso" class="tutorial-progresso"></p><h2 id="tutorial-titulo"></h2><p id="tutorial-texto"></p>' +
            '<div class="tutorial-acoes"><button type="button" id="tutorial-pular">Pular tutorial</button><button type="button" id="tutorial-voltar">Voltar</button><button type="button" id="tutorial-proximo">Próximo</button></div>';
        document.body.appendChild(painel);
        painel.querySelector('#tutorial-pular').addEventListener('click', encerrar);
        painel.querySelector('#tutorial-voltar').addEventListener('click', function () { if (indice > 0) { indice--; mostrar(); } });
        painel.querySelector('#tutorial-proximo').addEventListener('click', function () {
            if (indice === passos.length - 1) encerrar();
            else { indice++; mostrar(); }
        });
        document.addEventListener('keydown', aoTeclar);
        mostrar();
    }

    try { if (!localStorage.getItem(chave)) iniciar(); }
    catch (erro) {
        console.error('Não foi possível verificar o tutorial:', erro);
        iniciar();
    }
})();
