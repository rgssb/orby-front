$(document).on('click', '#seguir', function () {
    alternarSeguir(this, 'seguir', 'Erro ao seguir o usuario');
});

$(document).on('click', '#parar-de-seguir', function () {
    alternarSeguir(this, 'parar-de-seguir', 'Erro ao parar de seguir o usuario');
});

$('#editar-usuario').on('submit', editar);

$('#atualizar-senha').on('submit', atualizarSenha);

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


// Contador da bio
(function () {
    const bio = document.getElementById('bio');
    const contador = document.getElementById('contador-bio');
    if (!bio || !contador) return;
    const atualizar = function () { contador.textContent = bio.value.length + ' / ' + bio.maxLength; };
    bio.addEventListener('input', atualizar);
    atualizar();
})();

// Foto de perfil: o navegador reduz a imagem (máx. 512px, JPEG) antes de enviar
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

    function reduzir(file) {
        return new Promise(function (resolve, reject) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(url);
                const lado = Math.min(img.width, img.height);
                const tamanho = Math.min(512, lado);
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = tamanho;
                canvas.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, tamanho, tamanho);
                canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(); }, 'image/jpeg', 0.85);
            };
            img.onerror = function () { URL.revokeObjectURL(url); reject(); };
            img.src = url;
        });
    }

    escolher.addEventListener('click', function () { arquivo.click(); });

    arquivo.addEventListener('change', function () {
        const file = arquivo.files[0];
        arquivo.value = '';
        if (!file) return;

        escolher.disabled = true;
        reduzir(file).then(function (blob) {
            return fetch('/perfil/foto', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Requested-With': 'XMLHttpRequest' }, body: blob, credentials: 'same-origin' })
                .then(function (resposta) {
                    if (!resposta.ok) throw resposta;
                    mostrarFoto(URL.createObjectURL(blob));
                    remover.hidden = false;
                    Swal.fire({ icon: 'success', title: 'Foto atualizada!', timer: 1600, showConfirmButton: false });
                });
        }).catch(function (erro) {
            if (erro && erro.status === 401) return;
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
