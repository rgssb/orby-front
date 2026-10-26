// Autocomplete de @menção: sugere só quem o usuário segue ou quem o segue.
// Qualquer nick pode ser digitado à mão; o autocomplete é apenas um atalho.
(function () {
    const CAMPOS = '.comment-form input[name="conteudo"], .comment-edit-form input, #conteudo-publicacao, #conteudo';
    const GATILHO = /(^|[^\w@])@([A-Za-z0-9_]{0,50})$/;

    let lista = null;
    let campo = null;
    let itens = [];
    let ativo = 0;
    let pedido = 0;
    let timer = null;

    function fechar() {
        window.clearTimeout(timer);
        pedido++;
        if (lista) lista.remove();
        lista = null;
        campo = null;
        itens = [];
    }

    function marcarAtivo() {
        Array.from(lista.children).forEach(function (li, i) {
            li.classList.toggle('is-ativo', i === ativo);
            li.setAttribute('aria-selected', String(i === ativo));
        });
    }

    function escolher(indice) {
        const sugestao = itens[indice];
        if (!sugestao || !campo) return;

        const alvo = campo;
        const posicao = alvo.selectionStart;
        const antes = alvo.value.slice(0, posicao).replace(GATILHO, function (_, prefixo) {
            return prefixo + '@' + sugestao.nick.replace(/\s+/g, '') + ' ';
        });
        alvo.value = antes + alvo.value.slice(posicao);
        alvo.setSelectionRange(antes.length, antes.length);
        fechar();
        alvo.dispatchEvent(new Event('input', { bubbles: true }));
        alvo.focus();
    }

    function mostrar(alvo, sugestoes) {
        if (!sugestoes.length) { fechar(); return; }

        if (!lista) {
            lista = document.createElement('ul');
            lista.className = 'mention-suggest';
            lista.setAttribute('role', 'listbox');
            lista.addEventListener('mousedown', function (evento) {
                evento.preventDefault();
                const li = evento.target.closest('li');
                if (li) escolher(Array.from(lista.children).indexOf(li));
            });
            document.body.appendChild(lista);
        }

        campo = alvo;
        itens = sugestoes;
        ativo = 0;
        lista.textContent = '';
        sugestoes.forEach(function (s) {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.textContent = '@' + s.nick.replace(/\s+/g, '');
            lista.appendChild(li);
        });

        const caixa = alvo.getBoundingClientRect();
        lista.style.left = (caixa.left + window.scrollX) + 'px';
        lista.style.top = (caixa.bottom + window.scrollY + 4) + 'px';
        lista.style.minWidth = Math.min(caixa.width, 280) + 'px';
        marcarAtivo();
    }

    document.addEventListener('input', function (evento) {
        const alvo = evento.target;
        if (!alvo.matches || !alvo.matches(CAMPOS)) return;

        const achado = GATILHO.exec(alvo.value.slice(0, alvo.selectionStart));
        if (!achado) { fechar(); return; }

        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
            const meu = ++pedido;
            $.get('/sugestoes-mencao', { q: achado[2] }).done(function (sugestoes) {
                if (meu === pedido) mostrar(alvo, sugestoes || []);
            });
        }, 150);
    });

    document.addEventListener('keydown', function (evento) {
        if (!lista || evento.target !== campo) return;

        if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            ativo = (ativo + (evento.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length;
            marcarAtivo();
        } else if (evento.key === 'Enter' || evento.key === 'Tab') {
            evento.preventDefault();
            escolher(ativo);
        } else if (evento.key === 'Escape') {
            evento.preventDefault();
            fechar();
        }
    }, true);

    document.addEventListener('focusout', function (evento) {
        if (evento.target === campo) fechar();
    });
})();
