(function () {
    // Campo de conteúdo cresce junto com o texto.
    var campo = document.getElementById('conteudo-publicacao');
    if (campo) {
        var ajustar = function () {
            campo.style.height = 'auto';
            campo.style.height = campo.scrollHeight + 2 + 'px';
        };
        campo.addEventListener('input', ajustar);
        if (campo.value) ajustar();
    }

    // Botão Publicar só habilita com título e conteúdo preenchidos; contador de caracteres.
    var formulario = document.getElementById('nova-publicacao');
    if (formulario) {
        var titulo = document.getElementById('titulo-publicacao');
        var botao = formulario.querySelector('button[type="submit"]');
        var contador = document.getElementById('contador-conteudo');
        var atualizar = function () {
            var n = campo.value.length;
            botao.disabled = !titulo.value.trim() || !campo.value.trim();
            contador.textContent = n + (n === 1 ? ' caractere' : ' caracteres');
        };
        formulario.addEventListener('input', atualizar);
        formulario.addEventListener('reset', function () { setTimeout(atualizar, 0); });
        atualizar();
    }

    // Datas relativas; o texto completo continua no title e como fallback sem JS.
    function relativa(data) {
        var segundos = Math.round((Date.now() - data.getTime()) / 1000);
        if (segundos < 0) return null;
        var unidades = [
            [60, 'agora mesmo', null],
            [3600, 'há %n min', 60],
            [86400, 'há %n h', 3600],
            [604800, 'há %n d', 86400],
            [2629800, 'há %n sem', 604800],
            [31557600, 'há %n mês', 2629800]
        ];
        for (var i = 0; i < unidades.length; i++) {
            if (segundos < unidades[i][0]) {
                return unidades[i][2] ? unidades[i][1].replace('%n', Math.floor(segundos / unidades[i][2])) : unidades[i][1];
            }
        }
        var anos = Math.floor(segundos / 31557600);
        return 'há ' + anos + (anos === 1 ? ' ano' : ' anos');
    }

    document.querySelectorAll('time[data-relativo]').forEach(function (el) {
        var data = new Date(el.getAttribute('datetime'));
        if (isNaN(data.getTime())) return;
        var texto = relativa(data);
        if (!texto) return;
        el.setAttribute('title', el.textContent.trim());
        el.textContent = texto;
    });
})();
