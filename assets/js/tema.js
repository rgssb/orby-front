(function () {
    const CHAVE = 'orby-tema';
    const TEMAS = [
        { id: 'completo', nome: 'Espaço' },
        { id: 'neutro', nome: 'Neutro' },
        { id: 'claro', nome: 'Claro' },
        { id: 'acolhedor', nome: 'Antigo' }
    ];

    function temaSalvo() {
        try {
            const valor = localStorage.getItem(CHAVE);
            return TEMAS.some(function (t) { return t.id === valor; }) ? valor : 'completo';
        } catch (e) {
            return 'completo';
        }
    }

    function aplicar(id) {
        document.documentElement.setAttribute('data-theme', id);
    }

    // Aplica antes da pintura para evitar flash do tema errado.
    aplicar(temaSalvo());

    function criarSeletor() {
        const seletor = document.createElement('div');
        seletor.className = 'tema-seletor';
        seletor.innerHTML =
            '<button type="button" class="tema-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Alterar aparência" title="Aparência">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                    '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H17a4 4 0 0 0 4-4c0-4.4-4-7.2-9-7.2Z"></path>' +
                    '<circle cx="7.5" cy="11" r="1"></circle><circle cx="10.5" cy="7.2" r="1"></circle><circle cx="15" cy="7.8" r="1"></circle>' +
                '</svg>' +
            '</button>' +
            '<div class="tema-menu" role="menu" aria-label="Aparência" hidden></div>';

        const botao = seletor.querySelector('.tema-toggle');
        const menu = seletor.querySelector('.tema-menu');

        TEMAS.forEach(function (tema) {
            const opcao = document.createElement('button');
            opcao.type = 'button';
            opcao.className = 'tema-opcao';
            opcao.setAttribute('role', 'menuitemradio');
            opcao.dataset.tema = tema.id;
            opcao.innerHTML = '<span class="tema-amostra tema-amostra--' + tema.id + '"></span>' + tema.nome;
            menu.appendChild(opcao);
        });

        function marcar() {
            const atual = document.documentElement.getAttribute('data-theme');
            menu.querySelectorAll('.tema-opcao').forEach(function (opcao) {
                opcao.setAttribute('aria-checked', String(opcao.dataset.tema === atual));
            });
        }

        function abrir(abrir) {
            menu.hidden = !abrir;
            botao.setAttribute('aria-expanded', String(abrir));
            if (abrir) {
                marcar();
            }
        }

        botao.addEventListener('click', function () {
            abrir(menu.hidden);
        });

        menu.addEventListener('click', function (evento) {
            const opcao = evento.target.closest('.tema-opcao');
            if (!opcao) {
                return;
            }
            aplicar(opcao.dataset.tema);
            try {
                localStorage.setItem(CHAVE, opcao.dataset.tema);
            } catch (e) { /* armazenamento indisponível: vale só nesta sessão */ }
            marcar();
            abrir(false);
            botao.focus();
        });

        document.addEventListener('click', function (evento) {
            if (!seletor.contains(evento.target)) {
                abrir(false);
            }
        });

        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !menu.hidden) {
                abrir(false);
                botao.focus();
            }
        });

        return seletor;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const seletor = criarSeletor();
        const sair = document.querySelector('.navbar-logout');

        if (sair) {
            sair.parentNode.insertBefore(seletor, sair);
        } else {
            seletor.classList.add('tema-seletor--flutuante');
            document.body.appendChild(seletor);
        }
    });
})();
