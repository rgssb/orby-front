$(document).on('click', '#seguir', function () {
    alternarSeguir(this, 'seguir', 'Erro ao seguir o usuario');
});

$(document).on('click', '#parar-de-seguir', function () {
    alternarSeguir(this, 'parar-de-seguir', 'Erro ao parar de seguir o usuario');
});

$(document).on('click', '#bloquear', function () {
    const botao = this;
    const usuarioId = $(botao).data('usuario');
    Swal.fire({
        title: 'Bloquear ' + $(botao).data('nome') + '?',
        text: 'Vocês deixam de se seguir e nenhum dos dois poderá seguir ou conversar com o outro. A pessoa só poderá enviar um pedido de desculpas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Bloquear',
        cancelButtonText: 'Cancelar'
    }).then(function (r) {
        if (r.isConfirmed) mudarBloqueio(botao, usuarioId, 'bloquear', 'Erro ao bloquear o usuário');
    });
});

$(document).on('click', '#desbloquear', function () {
    mudarBloqueio(this, $(this).data('usuario'), 'desbloquear', 'Erro ao desbloquear o usuário');
});

function mudarBloqueio(botao, usuarioId, acao, mensagemErro) {
    $(botao).prop('disabled', true);
    $.ajax({ url: `/usuarios/${usuarioId}/${acao}`, method: 'POST' }).done(function () {
        atualizarPerfil();
    }).fail(function () {
        Swal.fire('Ops...', mensagemErro, 'error');
        $(botao).prop('disabled', false);
    });
}

$('#editar-usuario').on('submit', editar);

$('#atualizar-senha').on('submit', atualizarSenha);

$(document).on('click', '#deletar-usuario', function (e) {
    e.preventDefault();
    deletarUsuario();
});

function alternarSeguir(botao, acao, mensagemErro) {
    const usuarioId = $(botao).data('usuario');
    $(botao).prop('disabled', true);

    $.ajax({
        url: `/usuarios/${usuarioId}/${acao}`,
        method: "POST",
    }).done(function() {
        atualizarPerfil();
    }).fail(function() {
        Swal.fire("Ops...", mensagemErro, "error");
        $(botao).prop('disabled', false);
    });
}

// Atualiza só o cartão do perfil e a lista de seguidores, sem recarregar a página
function atualizarPerfil() {
    $.get(window.location.href).done(function(html) {
        const novo = $('<div>').append($.parseHTML(html));
        $('.profile-card').replaceWith(novo.find('.profile-card'));
        $('#modal-seguidores .modal-count').text(novo.find('#modal-seguidores .modal-count').text());
        $('#modal-seguidores .modal-body').html(novo.find('#modal-seguidores .modal-body').html());
    }).fail(function() {
        window.location.reload();
    });
}

// Edita o perfil do usuário
function editar(evento) {
    evento.preventDefault();

    $.ajax({
        url: "/editar-usuario",
        method: "PUT",
        data: {
            nome: $('#nome').val(),
            email: $('#email').val(),
            nick: $('#nick').val(),
            bio: $('#bio').val(),
        }
    }).done(function() {
        Swal.fire("Sucesso", "Perfil atualizado com sucesso", "success")
            .then(function() {
                window.location.assign("/perfil");
            });
    }).fail(function(resposta) {
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        Swal.fire("Ops...", erro || "Erro ao atualizar o perfil", "error");
    });
}

// Atualiza a senha do usuario
function atualizarSenha(evento) {
    evento.preventDefault();

    if ($('#nova-senha').val() !== $('#confirmar-senha').val()) {
        Swal.fire("Ops...", "As senhas não coincidem!", "warning");
        return;
    }

    $.ajax({
        url: "/atualizar-senha",
        method: "POST",
        data: {
            atual: $('#senha-atual').val(),
            nova: $('#nova-senha').val(),
        }
    }).done(function() {
        Swal.fire("Sucesso", "Senha atualizada com sucesso", "success")
            .then(function() {
                window.location.assign("/perfil");
            });
    }).fail(function(resposta) {
        const erro = resposta.responseJSON && resposta.responseJSON.erro;
        Swal.fire("Ops...", erro || "Erro ao atualizar a senha", "error");
    });
}


// Contador da bio conta os caracteres digitados
(function () {
    const bio = document.getElementById('bio');
    const contador = document.getElementById('contador-bio');
    if (!bio || !contador) return;
    const atualizar = function () { contador.textContent = bio.value.length + ' / ' + bio.maxLength; };
    bio.addEventListener('input', atualizar);
    atualizar();
})();

// Foto de perfil: a pessoa ajusta o recorte (arrasta e dá zoom), vê o resultado e só então envia (512px, JPEG)
(function () {
    const escolher = document.getElementById('foto-escolher');
    if (!escolher) return;

    const arquivo = document.getElementById('foto-arquivo');
    const remover = document.getElementById('foto-remover');
    const avatar = document.getElementById('foto-atual');

    function mostrarFoto(url) {
        avatar.textContent = '';
        if (!url) {
            const icone = document.createElement('i');
            icone.className = 'fa-solid fa-user';
            avatar.appendChild(icone);
            return;
        }
        const img = document.createElement('img');
        img.alt = '';
        img.src = url;
        avatar.appendChild(img);
    }

    escolher.addEventListener('click', function () { arquivo.click(); });

    arquivo.addEventListener('change', function () {
        const file = arquivo.files[0];
        arquivo.value = '';
        if (!file) return;

        escolher.disabled = true;
        window.OrbyRecorte.abrir(file, { proporcao: 1, saidaLargura: 512, titulo: 'Ajustar foto de perfil', redondo: true }).then(function (blob) {
            return fetch('/perfil/foto', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Requested-With': 'XMLHttpRequest' }, body: blob, credentials: 'same-origin' })
                .then(function (resposta) {
                    if (!resposta.ok) throw resposta;
                    mostrarFoto(URL.createObjectURL(blob));
                    remover.hidden = false;
                    Swal.fire({ icon: 'success', title: 'Foto atualizada!', timer: 1600, showConfirmButton: false });
                });
        }).catch(function (erro) {
            if (erro === null || (erro && erro.status === 401)) return;
            Swal.fire('Ops...', 'Não foi possível enviar a foto. Tente outra imagem.', 'error');
        }).finally(function () { escolher.disabled = false; });
    });

    remover.addEventListener('click', function () {
        $.ajax({ url: '/perfil/foto', method: 'DELETE' }).done(function () {
            mostrarFoto(null);
            remover.hidden = true;
            Swal.fire({ icon: 'success', title: 'Foto removida', timer: 1400, showConfirmButton: false });
        }).fail(function () {
            Swal.fire('Ops...', 'Não foi possível remover a foto.', 'error');
        });
    });
})();

// Banner: tema pronto ou imagem própria recortada; nada é salvo até clicar em "Salvar banner"
(function () {
    const previa = document.getElementById('banner-previa');
    if (!previa) return;

    const arquivo = document.getElementById('banner-arquivo');
    const botaoSalvar = document.getElementById('banner-salvar');
    const botaoCancelar = document.getElementById('banner-cancelar');
    const botaoEnviar = document.getElementById('banner-enviar');
    const temas = Array.prototype.slice.call(document.querySelectorAll('.banner-tema'));
    const TEMAS = temas.map(function (t) { return t.dataset.tema; });

    const inicial = { tipo: previa.dataset.imagem ? 'imagem' : (previa.dataset.tema ? 'tema' : 'padrao'), tema: previa.dataset.tema || '', imagem: previa.dataset.imagem || '' };
    let atual = { tipo: inicial.tipo, tema: inicial.tema, imagem: inicial.imagem, blob: null };
    let urlTemporaria = null;

    function mostrar() {
        TEMAS.forEach(function (t) { previa.classList.remove('banner-' + t); });
        previa.classList.toggle('has-image', atual.tipo === 'imagem');
        previa.textContent = '';
        if (atual.tipo === 'tema') previa.classList.add('banner-' + atual.tema);
        if (atual.tipo === 'imagem') {
            const img = document.createElement('img');
            img.className = 'profile-banner-img';
            img.alt = '';
            img.src = atual.imagem;
            previa.appendChild(img);
        }
        temas.forEach(function (botao) {
            const ativo = atual.tipo === 'tema' && atual.tema === botao.dataset.tema;
            botao.classList.toggle('is-active', ativo);
            botao.setAttribute('aria-pressed', String(ativo));
        });
        document.getElementById('banner-padrao').classList.toggle('is-active', atual.tipo === 'padrao');
        const mudou = atual.tipo !== inicial.tipo || atual.tema !== inicial.tema || !!atual.blob;
        botaoSalvar.hidden = botaoCancelar.hidden = !mudou;
    }

    temas.forEach(function (botao) {
        botao.addEventListener('click', function () {
            atual = { tipo: 'tema', tema: botao.dataset.tema, imagem: '', blob: null };
            mostrar();
        });
    });

    document.getElementById('banner-padrao').addEventListener('click', function () {
        atual = { tipo: 'padrao', tema: '', imagem: '', blob: null };
        mostrar();
    });

    botaoEnviar.addEventListener('click', function () { arquivo.click(); });

    arquivo.addEventListener('change', function () {
        const file = arquivo.files[0];
        arquivo.value = '';
        if (!file) return;
        window.OrbyRecorte.abrir(file, { proporcao: 3, saidaLargura: 1200, titulo: 'Ajustar banner' }).then(function (blob) {
            if (urlTemporaria) URL.revokeObjectURL(urlTemporaria);
            urlTemporaria = URL.createObjectURL(blob);
            atual = { tipo: 'imagem', tema: '', imagem: urlTemporaria, blob: blob };
            mostrar();
        }).catch(function (erro) {
            if (erro !== null) Swal.fire('Ops...', 'Não foi possível abrir essa imagem. Tente outra.', 'error');
        });
    });

    botaoCancelar.addEventListener('click', function () {
        atual = { tipo: inicial.tipo, tema: inicial.tema, imagem: inicial.imagem, blob: null };
        mostrar();
    });

    function requisicao(url, metodo, corpo, tipo) {
        const cabecalhos = { 'X-Requested-With': 'XMLHttpRequest' };
        if (tipo) cabecalhos['Content-Type'] = tipo;
        return fetch(url, { method: metodo, headers: cabecalhos, body: corpo, credentials: 'same-origin' }).then(function (resposta) {
            if (!resposta.ok) throw resposta;
        });
    }

    botaoSalvar.addEventListener('click', function () {
        botaoSalvar.disabled = true;
        let envio;
        if (atual.tipo === 'imagem' && atual.blob) envio = requisicao('/perfil/banner', 'POST', atual.blob, 'image/jpeg');
        else if (atual.tipo === 'tema') envio = requisicao('/perfil/banner/tema', 'POST', JSON.stringify({ preset: atual.tema }), 'application/json');
        else envio = requisicao('/perfil/banner', 'DELETE');

        envio.then(function () {
            inicial.tipo = atual.tipo;
            inicial.tema = atual.tema;
            inicial.imagem = atual.imagem;
            atual.blob = null;
            mostrar();
            Swal.fire({ icon: 'success', title: 'Banner atualizado!', timer: 1600, showConfirmButton: false });
        }).catch(function (erro) {
            if (erro && erro.status === 401) return;
            Swal.fire('Ops...', 'Não foi possível salvar o banner.', 'error');
        }).finally(function () { botaoSalvar.disabled = false; });
    });

    mostrar();
})();

function deletarUsuario() {
    Swal.fire({
        icon: 'warning',
        title: 'Tem certeza?',
        text: 'Esta ação não pode ser desfeita. Todos os seus dados (publicações, comentários, foto e seguidores) serão apagados. Digite sua senha para confirmar.',
        input: 'password',
        inputPlaceholder: 'Sua senha',
        inputAttributes: { autocomplete: 'current-password' },
        showCancelButton: true,
        confirmButtonText: 'Sim, deletar',
        cancelButtonText: 'Cancelar',
        preConfirm: function (senha) {
            if (!senha) {
                Swal.showValidationMessage('Informe sua senha');
            }
            return senha;
        }
    }).then(function (confirmacao) {
        if (!confirmacao.isConfirmed) {
            return;
        }
        $.ajax({
            url: '/deletar-usuario',
            method: 'DELETE',
            contentType: 'application/json',
            data: JSON.stringify({ senha: confirmacao.value })
        }).done(function () {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Usuário deletado com sucesso.', timer: 1600, showConfirmButton: false }).then(function () {
                window.location.href = '/logout';
            });
        }).fail(function (xhr) {
            var msg = xhr.status === 403 ? 'Senha incorreta.' : 'Ocorreu um erro ao tentar deletar o usuário. Tente novamente mais tarde.';
            Swal.fire('Ops...', msg, 'error');
        });
    });
}
