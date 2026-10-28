(function () {
    const coluna = document.querySelector('.home-page .compose-column');
    const card = coluna.querySelector('.composer-card');
    const botao = card.querySelector('.composer-toggle');
    const formulario = document.getElementById('nova-publicacao');
    const sugestoes = document.getElementById('sugestoes-seguir');
    const pessoas = document.getElementById('sugestoes-lista');
    const maisPessoas = sugestoes.querySelector('.suggest-more');
    const feed = document.querySelector('.home-page .feed-column');
    const lista = document.getElementById('feed-lista');
    const celular = window.matchMedia('(max-width: 991.98px)');

    function atualizarFormulario() {
        const aberto = botao.getAttribute('aria-expanded') === 'true';
        card.classList.toggle('composer-mobile', celular.matches);
        card.classList.toggle('composer-collapsed', celular.matches && !aberto);
    }

    botao.hidden = false;
    botao.addEventListener('click', function () {
        const aberto = botao.getAttribute('aria-expanded') !== 'true';
        botao.setAttribute('aria-expanded', String(aberto));
        atualizarFormulario();
        if (aberto) formulario.querySelector('#conteudo-publicacao').focus();
    });

    function posicionarSugestoes() {
        if (!celular.matches) {
            if (sugestoes.parentNode !== coluna) coluna.appendChild(sugestoes);
            return;
        }
        const primeira = lista && lista.querySelector(':scope > [data-publicacao-id]');
        if (primeira) {
            if (primeira.nextElementSibling !== sugestoes) primeira.after(sugestoes);
        } else if (sugestoes.parentNode !== feed) {
            feed.appendChild(sugestoes);
        }
    }

    function atualizarPessoas() {
        const itens = pessoas.querySelectorAll(':scope > li');
        const expandido = maisPessoas.getAttribute('aria-expanded') === 'true';
        itens.forEach(function (item, indice) {
            item.hidden = !expandido && indice >= 2;
        });
        maisPessoas.hidden = itens.length <= 2;
        maisPessoas.textContent = expandido ? 'Mostrar menos' : 'Mostrar mais pessoas';
    }

    maisPessoas.addEventListener('click', function () {
        const expandido = maisPessoas.getAttribute('aria-expanded') !== 'true';
        maisPessoas.setAttribute('aria-expanded', String(expandido));
        atualizarPessoas();
    });

    function atualizarLayout() {
        atualizarFormulario();
        posicionarSugestoes();
        atualizarPessoas();
    }

    celular.addEventListener('change', atualizarLayout);
    if (lista) new MutationObserver(posicionarSugestoes).observe(lista, { childList: true });
    new MutationObserver(atualizarPessoas).observe(pessoas, { childList: true });
    atualizarLayout();
})();
