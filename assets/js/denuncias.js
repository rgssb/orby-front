(function () {
    const MOTIVOS = {
        spam: 'Spam ou propaganda',
        assedio: 'Assédio ou ofensa',
        falso: 'Perfil ou conteúdo falso',
        improprio: 'Conteúdo impróprio',
        outro: 'Outro motivo'
    };
    const NOMES = { perfil: 'este perfil', publicacao: 'esta publicação', comentario: 'este comentário' };
    const estados = new Map();
    const versoes = new Map();
    let avisoDeConsulta = false;
    let agendamento;

    function chave(tipo, id) { return tipo + ':' + id; }

    function marcar(botao, denunciado) {
        const elemento = $(botao);
        const tipo = elemento.attr('data-tipo');
        const descricao = NOMES[tipo] || 'este conteúdo';
        elemento.attr('data-status-denuncia', 'consultado')
            .attr('aria-label', denunciado ? 'Você já denunciou ' + descricao : 'Denunciar ' + descricao)
            .attr('title', denunciado ? 'Você já denunciou ' + descricao : 'Denunciar')
            .prop('disabled', denunciado)
            .toggleClass('is-denunciado', denunciado);
        elemento.find('i, svg').first().replaceWith(
            $('<i>').attr({ 'class': (denunciado ? 'fa-solid' : 'fa-regular') + ' fa-flag', 'aria-hidden': 'true' })
        );
        if (elemento.hasClass('denunciar-perfil')) {
            elemento.contents().filter(function () { return this.nodeType === 3; })
                .last().replaceWith(denunciado ? ' Denunciado' : ' Denunciar');
        }
    }

    function marcarAlvo(tipo, id) {
        const identificador = chave(tipo, id);
        versoes.set(identificador, (versoes.get(identificador) || 0) + 1);
        estados.set(identificador, true);
        $('.denunciar').each(function () {
            if ($(this).attr('data-tipo') === tipo && $(this).attr('data-id') === String(id)) marcar(this, true);
        });
    }

    function consultar(alvos) {
        return $.ajax({
            url: '/denuncias/consulta', method: 'POST', contentType: 'application/json',
            data: JSON.stringify({ alvos: alvos })
        });
    }

    function avisarFalhaConsulta() {
        if (!avisoDeConsulta) {
            avisoDeConsulta = true;
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Não foi possível verificar as denúncias anteriores.', showConfirmButton: false, timer: 5000 });
        }
    }

    function consultarNovos() {
        const pendentes = new Map();
        $('.denunciar:not([data-status-denuncia])').each(function () {
            const botao = $(this);
            const tipo = botao.attr('data-tipo');
            const id = Number(botao.attr('data-id'));
            const identificador = chave(tipo, id);
            if (estados.has(identificador)) {
                marcar(this, estados.get(identificador));
            } else {
                botao.attr('data-status-denuncia', 'verificando').prop('disabled', true);
                if (!pendentes.has(identificador)) pendentes.set(identificador, { tipo: tipo, alvoId: id });
            }
        });
        const alvos = Array.from(pendentes.values());
        for (let inicio = 0; inicio < alvos.length; inicio += 100) {
            const lote = alvos.slice(inicio, inicio + 100);
            consultar(lote).done(function (denunciados) {
                const encontrados = new Set(denunciados.map(function (alvo) { return chave(alvo.tipo, alvo.alvoId); }));
                lote.forEach(function (alvo) {
                    const identificador = chave(alvo.tipo, alvo.alvoId);
                    const denunciado = estados.get(identificador) === true || encontrados.has(identificador);
                    estados.set(identificador, denunciado);
                    $('.denunciar[data-status-denuncia="verificando"]').each(function () {
                        if (chave($(this).attr('data-tipo'), Number($(this).attr('data-id'))) === identificador) marcar(this, denunciado);
                    });
                });
            }).fail(function () {
                lote.forEach(function (alvo) {
                    $('.denunciar[data-status-denuncia="verificando"]').each(function () {
                        if (chave($(this).attr('data-tipo'), Number($(this).attr('data-id'))) === chave(alvo.tipo, alvo.alvoId)) {
                            $(this).attr('data-status-denuncia', 'erro').attr('title', 'Não foi possível verificar a denúncia').prop('disabled', false);
                        }
                    });
                });
                avisarFalhaConsulta();
            });
        }
    }

    function agendarConsulta() {
        clearTimeout(agendamento);
        agendamento = setTimeout(consultarNovos, 50);
    }

    const observador = new MutationObserver(function (alteracoes) {
        if (alteracoes.some(function (alteracao) {
            return Array.from(alteracao.addedNodes).some(function (no) {
                return no.nodeType === 1 && (no.matches('.denunciar') || no.querySelector('.denunciar'));
            });
        })) agendarConsulta();
    });
    observador.observe(document.body, { childList: true, subtree: true });
    agendarConsulta();

    function atualizarDenuncias() {
        if (document.hidden) return;
        const alvos = new Map();
        $('.denunciar.is-denunciado').each(function () {
            const tipo = $(this).attr('data-tipo');
            const alvoId = Number($(this).attr('data-id'));
            const identificador = chave(tipo, alvoId);
            if (!alvos.has(identificador)) {
                const versao = (versoes.get(identificador) || 0) + 1;
                versoes.set(identificador, versao);
                alvos.set(identificador, { tipo: tipo, alvoId: alvoId, versao: versao });
            }
        });
        const pendentes = Array.from(alvos.values());
        for (let inicio = 0; inicio < pendentes.length; inicio += 100) {
            const lote = pendentes.slice(inicio, inicio + 100);
            consultar(lote.map(function (alvo) { return { tipo: alvo.tipo, alvoId: alvo.alvoId }; })).done(function (denunciados) {
                const encontrados = new Set(denunciados.map(function (alvo) { return chave(alvo.tipo, alvo.alvoId); }));
                lote.forEach(function (alvo) {
                    const identificador = chave(alvo.tipo, alvo.alvoId);
                    if (versoes.get(identificador) !== alvo.versao) return;
                    const denunciado = encontrados.has(identificador);
                    estados.set(identificador, denunciado);
                    $('.denunciar').each(function () {
                        if (chave($(this).attr('data-tipo'), Number($(this).attr('data-id'))) === identificador) marcar(this, denunciado);
                    });
                });
            }).fail(avisarFalhaConsulta);
        }
    }

    window.addEventListener('focus', atualizarDenuncias);
    document.addEventListener('visibilitychange', atualizarDenuncias);
    setInterval(atualizarDenuncias, 60000);

    function oferecerOpcoes(usuarioId) {
        Swal.fire({
            icon: 'success',
            title: 'Denúncia enviada',
            text: 'Como deseja continuar em relação à pessoa denunciada? Bloquear encerra o seguimento e impede conversas. Silenciar esconde as publicações dessa pessoa do seu feed. Manter não altera sua visualização.',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Bloquear',
            denyButtonText: 'Silenciar',
            cancelButtonText: 'Manter como está'
        }).then(function (resultado) {
            const acao = resultado.isConfirmed ? 'bloquear' : resultado.isDenied ? 'silenciar' : '';
            if (!acao) return;
            $.post('/usuarios/' + usuarioId + '/' + acao).done(function () {
                Swal.fire({
                    icon: 'success',
                    title: acao === 'bloquear' ? 'Conta bloqueada' : 'Conta silenciada'
                }).then(function () { window.location.reload(); });
            }).fail(function (xhr) {
                const erro = xhr.responseJSON && xhr.responseJSON.erro;
                Swal.fire({ icon: 'error', title: 'Denúncia enviada, mas não foi possível ' + acao, text: erro || 'Tente novamente pelo perfil da pessoa.' });
            });
        });
    }

    $(document).on('click', '.denunciar', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const botao = $(this);
        const tipo = botao.attr('data-tipo');
        const alvoId = Number(botao.attr('data-id'));
        const usuarioId = Number(botao.attr('data-usuario'));
        Swal.fire({
            title: 'Denunciar ' + (NOMES[tipo] || 'conteúdo') + '?',
            text: 'A denúncia é anônima. Escolha o motivo.',
            input: 'select',
            inputOptions: MOTIVOS,
            inputPlaceholder: 'Selecione o motivo',
            inputValidator: function (valor) { return valor ? null : 'Escolha um motivo.'; },
            showCancelButton: true,
            confirmButtonText: 'Denunciar',
            cancelButtonText: 'Cancelar'
        }).then(function (r) {
            if (!r.isConfirmed) return;
            botao.prop('disabled', true);
            $.ajax({
                url: '/denuncias', method: 'POST', contentType: 'application/json',
                data: JSON.stringify({ tipo: tipo, alvoId: alvoId, motivo: r.value })
            }).done(function (dados) {
                marcarAlvo(tipo, alvoId);
                oferecerOpcoes(dados.usuarioId);
            }).fail(function (xhr) {
                if (xhr.status === 409) {
                    marcarAlvo(tipo, alvoId);
                    Swal.fire({ icon: 'info', title: 'Denúncia já registrada', text: 'Você já denunciou este conteúdo.' });
                    return;
                }
                consultar([{ tipo: tipo, alvoId: alvoId }]).done(function (denunciados) {
                    if (denunciados.length) {
                        marcarAlvo(tipo, alvoId);
                        oferecerOpcoes(usuarioId);
                    } else {
                        botao.prop('disabled', false);
                        const erro = xhr.responseJSON && xhr.responseJSON.erro;
                        Swal.fire({ icon: 'error', title: 'Não foi possível denunciar', text: erro || 'Tente novamente.' });
                    }
                }).fail(function () {
                    botao.prop('disabled', false);
                    Swal.fire({ icon: 'error', title: 'Não foi possível confirmar a denúncia', text: 'Verifique sua conexão e tente novamente.' });
                });
            });
        });
    });

    $(document).on('click', '.den-resolver', function () {
        const item = $(this).closest('.den-item');
        $.post('/admin/denuncias/' + item.data('usuario') + '/resolver').done(function () {
            item.remove();
            atualizarDenuncias();
        }).fail(function () {
            Swal.fire({ icon: 'error', title: 'Não foi possível arquivar' });
        });
    });
})();
