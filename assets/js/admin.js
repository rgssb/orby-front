// Opções exclusivas de administradores: o servidor confere a permissão em cada ação; aqui só se mostra a interface
(function () {
    window.OrbyEhAdmin = false;

    function erro(xhr, titulo) {
        const mensagem = xhr && xhr.responseJSON && xhr.responseJSON.erro;
        Swal.fire({ icon: 'error', title: titulo, text: mensagem || 'Tente novamente.' });
    }

    function suspender(id, nome, depois) {
        Swal.fire({
            title: 'Suspender ' + (nome || 'esta conta') + '?',
            text: 'A pessoa será desconectada e não conseguirá entrar até ser reativada. O conteúdo dela é mantido.',
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Suspender', cancelButtonText: 'Cancelar'
        }).then(function (r) {
            if (!r.isConfirmed) return;
            $.post('/admin/usuarios/' + id + '/suspender').done(depois).fail(function (xhr) { erro(xhr, 'Não foi possível suspender'); });
        });
    }

    function reativar(id, nome) {
        Swal.fire({
            title: 'Reativar ' + (nome || 'esta conta') + '?',
            text: 'A conta poderá acessar o Orby novamente e as denúncias abertas contra ela serão arquivadas.',
            icon: 'question', showCancelButton: true, confirmButtonText: 'Reativar', cancelButtonText: 'Cancelar'
        }).then(function (r) {
            if (!r.isConfirmed) return;
            $.post('/admin/usuarios/' + id + '/reativar')
                .done(function () { window.location.reload(); })
                .fail(function (xhr) { erro(xhr, 'Não foi possível reativar'); });
        });
    }

    $(document).on('click', '.adm-suspender', function () {
        const item = $(this).closest('.den-item');
        suspender(item.data('usuario'), item.data('nome'), function () { window.location.reload(); });
    });
    $(document).on('click', '.adm-suspender-perfil', function () {
        const botao = $(this);
        suspender(botao.data('usuario'), botao.data('nome'), function () {
            Swal.fire({ icon: 'success', title: 'Conta suspensa' }).then(function () { window.location.reload(); });
        });
    });
    $(document).on('click', '.adm-reativar', function () {
        const item = $(this).closest('.den-item');
        reativar(item.data('usuario'), item.data('nome'));
    });
    $(document).on('click', '.adm-reativar-perfil', function () {
        reativar($(this).data('usuario'), $(this).data('nome'));
    });

    $.get('/admin/eu').done(function (dados) {
        if (!dados || !dados.admin) return;
        window.OrbyEhAdmin = true;
        document.body.classList.add('is-admin');
        const menu = document.querySelector('.navbar-nav');
        if (menu && !menu.querySelector('[data-nav="/admin/denuncias"]')) {
            $('<li class="nav-item" data-nav="/admin/denuncias"><a class="nav-link" href="/admin/denuncias"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Administração</a></li>').insertBefore($(menu).find('.navbar-search-item'));
        }
    });
})();

$(function () {
    $(document).on('click', '#adm-mais', function (e) {
        e.preventDefault();
        const botao = $(this);
        if (botao.attr('aria-disabled') === 'true') return;
        botao.attr('aria-disabled', 'true').text('Carregando...');
        $.get(botao.attr('href')).done(function (html) {
            const pagina = $('<div>').append($.parseHTML(html, document, false));
            $('#adm-resultados').append(pagina.find('#adm-resultados').children());
            const proximo = pagina.find('#adm-mais');
            if (proximo.length) botao.attr('href', proximo.attr('href')).removeAttr('aria-disabled').text('Mostrar mais');
            else botao.remove();
        }).fail(function () {
            botao.removeAttr('aria-disabled').text('Mostrar mais');
            Swal.fire({ icon: 'error', title: 'Não foi possível carregar mais resultados', text: 'Tente novamente.' });
        });
    });
    $(document).on('click', '.perfil-mais-toggle', function (e) {
        e.stopPropagation();
        const caixa = $(this).closest('.perfil-mais').toggleClass('is-aberto');
        $(this).attr('aria-expanded', caixa.hasClass('is-aberto'));
    });
    $(document).on('click', function (e) {
        if ($(e.target).closest('.perfil-mais-menu').length && !$(e.target).closest('.btn').length) return;
        $('.perfil-mais.is-aberto').removeClass('is-aberto').find('.perfil-mais-toggle').attr('aria-expanded', 'false');
    });
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') $('.perfil-mais.is-aberto').removeClass('is-aberto');
    });
});
