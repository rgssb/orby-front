(function () {
    function carregarBotao() {
        const botao = document.getElementById('felas-alternar');
        if (!botao) return;
        const id = botao.dataset.usuario;
        $.get('/felas/' + id).done(function (dados) {
            if (!botao.isConnected) return;
            botao.dataset.fela = String(dados.fela);
            botao.querySelector('span').textContent = dados.fela ? 'Remover dos Felas' : 'Adicionar aos Felas';
            botao.setAttribute('aria-pressed', String(dados.fela));
            botao.hidden = !dados.fela && !dados.podeAdicionar;
            botao.disabled = false;
        }).fail(function () {
            botao.hidden = true;
            console.error('Não foi possível carregar a lista de Felas.');
        });
    }

    carregarBotao();
    document.addEventListener('perfil-atualizado', carregarBotao);
    $(document).on('click', '#felas-alternar', function () {
        const botao = this;
        const membro = botao.dataset.fela === 'true';
        botao.disabled = true;
        $.ajax({ url: '/felas/' + botao.dataset.usuario, method: membro ? 'DELETE' : 'PUT' }).done(carregarBotao).fail(function (resposta) {
            botao.disabled = false;
            Swal.fire('Não foi possível atualizar os Felas', resposta.responseJSON && resposta.responseJSON.erro || 'Tente novamente.', 'error');
            carregarBotao();
        });
    });

    const lista = document.getElementById('felas-lista');
    if (!lista) return;
    const status = document.getElementById('felas-status');
    function carregar() {
        $.get('/felas').done(function (pessoas) {
            $(lista).empty();
            status.textContent = pessoas.length ? '' : 'Você ainda não adicionou ninguém aos Felas.';
            pessoas.forEach(function (pessoa) {
                const item = $('<li>');
                const perfil = $('<a>').attr('href', '/usuarios/' + pessoa.id).text(pessoa.nome + ' @' + pessoa.nick);
                const remover = $('<button type="button" class="btn btn-outline-secondary btn-sm">').text('Remover');
                remover.on('click', function () {
                    remover.prop('disabled', true);
                    $.ajax({ url: '/felas/' + pessoa.id, method: 'DELETE' }).done(carregar).fail(function () {
                        remover.prop('disabled', false);
                        status.textContent = 'Não foi possível remover esta pessoa. Tente novamente.';
                    });
                });
                item.append(perfil, remover);
                $(lista).append(item);
            });
        }).fail(function () { status.textContent = 'Não foi possível carregar seus Felas. Recarregue a página.'; });
    }
    carregar();
})();
