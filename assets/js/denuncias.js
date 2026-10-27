// Denúncias: o ícone de bandeira discreto abre a escolha do motivo; a revisão da administração arquiva por aqui
(function () {
    const MOTIVOS = {
        spam: 'Spam ou propaganda',
        assedio: 'Assédio ou ofensa',
        falso: 'Perfil ou conteúdo falso',
        improprio: 'Conteúdo impróprio',
        outro: 'Outro motivo'
    };
    const NOMES = { perfil: 'este perfil', publicacao: 'esta publicação', comentario: 'este comentário' };

    $(document).on('click', '.denunciar', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const tipo = $(this).data('tipo');
        const alvoId = Number($(this).data('id'));
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
            $.ajax({
                url: '/denuncias', method: 'POST', contentType: 'application/json',
                data: JSON.stringify({ tipo: tipo, alvoId: alvoId, motivo: r.value })
            }).done(function () {
                Swal.fire({ icon: 'success', title: 'Denúncia enviada', text: 'Obrigado por ajudar a manter o Orby seguro.' });
            }).fail(function (xhr) {
                const erro = xhr.responseJSON && xhr.responseJSON.erro;
                Swal.fire({ icon: 'error', title: 'Não foi possível denunciar', text: erro || 'Tente novamente.' });
            });
        });
    });

    $(document).on('click', '.den-resolver', function () {
        const item = $(this).closest('.den-item');
        $.post('/admin/denuncias/' + item.data('usuario') + '/resolver').done(function () {
            item.remove();
        }).fail(function () {
            Swal.fire({ icon: 'error', title: 'Não foi possível arquivar' });
        });
    });
})();
