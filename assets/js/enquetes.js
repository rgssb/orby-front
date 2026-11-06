(function () {
    const ativas = new Map();
    let intervalo = null;   

    function atualizar() {
        const agora = Date.now();
        ativas.forEach(function (prazo, elemento) {
            if (!elemento.isConnected) {
                ativas.delete(elemento);
                return;
            }
            const segundos = Math.max(0, Math.ceil((prazo - agora) / 1000));
            const valores = {
                dias: Math.floor(segundos / 86400),
                horas: Math.floor(segundos % 86400 / 3600),
                minutos: Math.floor(segundos % 3600 / 60),
                segundos: segundos % 60
            };
            Object.keys(valores).forEach(function (unidade) {
                elemento.querySelector('[data-unidade="' + unidade + '"]').textContent = String(valores[unidade]).padStart(2, '0');
            });
            elemento.querySelector('.enquete-relogio').setAttribute('aria-label',
                'Tempo restante: ' + valores.dias + ' dias, ' + valores.horas + ' horas, ' +
                valores.minutos + ' minutos e ' + valores.segundos + ' segundos');
            if (segundos === 0) {
                if (elemento.dataset.encerrada !== 'true') elemento.querySelector('.enquete-prazo-expirou').hidden = false;
                ativas.delete(elemento);
            }
        });
        if (ativas.size === 0 && intervalo !== null) {
            clearInterval(intervalo);
            intervalo = null;
        }
    }

    function iniciar() {
        document.querySelectorAll('.enquete-prazo:not([data-relogio-iniciado])').forEach(function (elemento) {
            const tempo = elemento.querySelector('time[data-enquete-prazo]');
            const prazo = new Date(tempo.getAttribute('datetime'));
            if (isNaN(prazo.getTime())) {
                console.error('Data de encerramento da enquete inválida.');
                return;
            }
            elemento.dataset.relogioIniciado = 'true';
            tempo.textContent = prazo.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            elemento.querySelector('.enquete-prazo-contagem').hidden = false;
            ativas.set(elemento, elemento.dataset.encerrada === 'true' ? 0 : prazo.getTime());
        });
        atualizar();
        if (ativas.size && intervalo === null) intervalo = setInterval(atualizar, 1000);
    }

    window.OrbyEnquetes = { iniciar: iniciar };
    iniciar();
})();
