// Grupos de conversa: lista, criação, mensagens em tempo real (SSE) e gestão de membros
(function () {
    const pagina = document.getElementById('grupos-pagina');
    if (!pagina || !window.OrbyMensagens) return;
    const { criar, api, hora, avatar, ouvintesDeEvento } = window.OrbyMensagens;

    const el = function (id) { return document.getElementById(id); };
    const estado = { aberto: null, ultimoId: 0, dialogo: null, escolhidos: [] };

    function erro(e) {
        Swal.fire('Ops...', (e && e.erro) || 'Algo deu errado.', 'error');
    }

    function confirmar(titulo, texto) {
        return Swal.fire({ title: titulo, text: texto, icon: 'warning', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar' })
            .then(function (r) { return r.isConfirmed; });
    }

    // ---------- busca de pessoas (a mesma sugestão usada nas menções) ----------
    function ligarBusca(campo, lista, aoEscolher, ignorar) {
        let timer = null;
        let pedido = 0;
        campo.addEventListener('input', function () {
            window.clearTimeout(timer);
            const q = campo.value.replace(/^@/, '').trim();
            if (!q) { lista.hidden = true; return; }
            timer = window.setTimeout(function () {
                const meu = ++pedido;
                api('/sugestoes-mencao?q=' + encodeURIComponent(q)).then(function (pessoas) {
                    if (meu !== pedido) return;
                    lista.replaceChildren();
                    (pessoas || []).filter(function (p) { return !ignorar(p.id); }).forEach(function (p) {
                        const li = criar('li');
                        const botao = criar('button', 'grp-resultado');
                        botao.type = 'button';
                        botao.appendChild(avatar(p.id, p.fotoVersao, 'user-avatar--sm'));
                        botao.appendChild(criar('span', '', '@' + p.nick));
                        botao.addEventListener('click', function () {
                            aoEscolher(p);
                            campo.value = '';
                            lista.hidden = true;
                        });
                        li.appendChild(botao);
                        lista.appendChild(li);
                    });
                    lista.hidden = !lista.children.length;
                }).catch(function () {});
            }, 200);
        });
    }

    // ---------- lista ----------
    function carregarLista() {
        return api('/grupos/lista').then(function (grupos) {
            const lista = el('grp-lista');
            lista.replaceChildren();
            if (!grupos.length) {
                lista.appendChild(criar('li', 'grp-sem-grupos', 'Você ainda não está em nenhum grupo.'));
                return;
            }
            grupos.forEach(function (g) {
                const li = criar('li');
                const botao = criar('button', 'grp-item' + (g.id === estado.aberto ? ' is-active' : ''));
                botao.type = 'button';
                const topo = criar('span', 'grp-item-topo');
                topo.appendChild(criar('strong', '', g.nome));
                if (g.naoLidas > 0 && g.id !== estado.aberto) {
                    topo.appendChild(criar('span', 'nav-badge', g.naoLidas > 99 ? '99+' : String(g.naoLidas)));
                }
                botao.appendChild(topo);
                botao.appendChild(criar('small', '', g.ultimaMensagem || (g.membros + ' membros')));
                botao.addEventListener('click', function () { abrir(g.id); });
                li.appendChild(botao);
                lista.appendChild(li);
            });
        }).catch(function () {});
    }

    // ---------- conversa ----------
    function desenharMensagem(m) {
        const caixa = criar('div', 'grp-msg' + (m.minha ? ' grp-msg--minha' : ''));
        caixa.dataset.id = m.id;
        if (!m.minha) caixa.appendChild(criar('span', 'grp-msg-autor', '@' + m.nick));
        caixa.appendChild(criar('span', 'grp-msg-texto', m.texto));
        caixa.appendChild(criar('time', 'grp-msg-hora', hora(m.criadoEm)));
        return caixa;
    }

    function acrescentar(mensagens) {
        const area = el('grp-mensagens');
        const noFim = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
        mensagens.forEach(function (m) {
            if (area.querySelector('[data-id="' + m.id + '"]')) return;
            area.appendChild(desenharMensagem(m));
            estado.ultimoId = Math.max(estado.ultimoId, m.id);
        });
        if (noFim || mensagens.some(function (m) { return m.minha; })) area.scrollTop = area.scrollHeight;
    }

    function desenharMembros(d) {
        const lista = el('grp-membros');
        lista.replaceChildren();
        d.listaDeMembros.forEach(function (m) {
            const li = criar('li', 'grp-membro');
            li.appendChild(avatar(m.id, m.fotoVersao, 'user-avatar--sm'));
            const nome = criar('span', 'grp-membro-nome', m.nome + ' (@' + m.nick + ')');
            li.appendChild(nome);
            if (m.criador) li.appendChild(criar('span', 'grp-selo', 'Criador'));
            else if (m.podeAdicionar) li.appendChild(criar('span', 'grp-selo', 'Pode adicionar'));
            if (d.euCriador && !m.criador) {
                const permissao = criar('button', 'btn btn-outline-secondary btn-sm', m.podeAdicionar ? 'Tirar permissão' : 'Deixar adicionar');
                permissao.type = 'button';
                permissao.addEventListener('click', function () {
                    api('/grupos/' + d.id + '/membros/' + m.id + '/permissao', 'PUT', { pode: !m.podeAdicionar })
                        .then(function () { abrir(d.id, true); }).catch(erro);
                });
                const remover = criar('button', 'btn btn-outline-danger btn-sm', 'Remover');
                remover.type = 'button';
                remover.addEventListener('click', function () {
                    confirmar('Remover @' + m.nick + '?', 'A pessoa deixa de ver o grupo.').then(function (ok) {
                        if (!ok) return;
                        api('/grupos/' + d.id + '/membros/' + m.id, 'DELETE').then(function () { abrir(d.id, true); }).catch(erro);
                    });
                });
                li.appendChild(permissao);
                li.appendChild(remover);
            }
            lista.appendChild(li);
        });
        el('grp-adicionar').hidden = !d.euPossoAdicionar;
    }

    function abrir(id, manterPainel) {
        return api('/grupos/' + id).then(function (d) {
            const trocou = estado.aberto !== id;
            estado.aberto = id;
            estado.dialogo = d;
            el('grp-vazio').hidden = true;
            el('grp-chat').hidden = false;
            el('grp-titulo').textContent = d.nome + ' · ' + d.membros + ' membros';
            desenharMembros(d);
            if (trocou) {
                el('grp-mensagens').replaceChildren();
                estado.ultimoId = 0;
                if (!manterPainel) el('grp-painel').hidden = true;
            }
            acrescentar(d.mensagensDoGrupo);
            carregarLista();
        }).catch(function (e) {
            if (e && e.status === 404) { fecharChat(); carregarLista(); return; }
            erro(e);
        });
    }

    function fecharChat() {
        estado.aberto = null;
        el('grp-chat').hidden = true;
        el('grp-vazio').hidden = false;
    }

    function buscarNovas() {
        if (!estado.aberto) return;
        const id = estado.aberto;
        api('/grupos/' + id + '?apos=' + estado.ultimoId).then(function (d) {
            if (estado.aberto !== id) return;
            estado.dialogo = d;
            el('grp-titulo').textContent = d.nome + ' · ' + d.membros + ' membros';
            desenharMembros(d);
            acrescentar(d.mensagensDoGrupo);
            carregarLista();
        }).catch(function (e) {
            if (e && e.status === 404) { fecharChat(); carregarLista(); }
        });
    }

    el('grp-enviar').addEventListener('submit', function (e) {
        e.preventDefault();
        const campo = el('grp-texto');
        const texto = campo.value.trim();
        if (!texto || !estado.aberto) return;
        campo.disabled = true;
        api('/grupos/' + estado.aberto + '/mensagens', 'POST', { texto: texto }).then(function (m) {
            campo.value = '';
            acrescentar([m]);
            carregarLista();
        }).catch(erro).then(function () {
            campo.disabled = false;
            campo.focus();
        });
    });

    el('grp-membros-botao').addEventListener('click', function () {
        const painel = el('grp-painel');
        painel.hidden = !painel.hidden;
        this.setAttribute('aria-expanded', String(!painel.hidden));
    });

    el('grp-sair').addEventListener('click', function () {
        const d = estado.dialogo;
        if (!d) return;
        confirmar('Sair do grupo?', 'Você deixa de receber as mensagens de "' + d.nome + '".').then(function (ok) {
            if (!ok) return;
            api('/grupos/' + d.id + '/membros/' + d.euId, 'DELETE').then(function () {
                fecharChat();
                carregarLista();
            }).catch(erro);
        });
    });

    ligarBusca(el('grp-add-pessoa'), el('grp-add-resultados'), function (p) {
        api('/grupos/' + estado.aberto + '/membros', 'POST', { usuarioId: p.id })
            .then(function () { abrir(estado.aberto, true); }).catch(erro);
    }, function (id) {
        return estado.dialogo && estado.dialogo.listaDeMembros.some(function (m) { return m.id === id; });
    });

    // ---------- novo grupo ----------
    function desenharEscolhidos() {
        const lista = el('grp-escolhidos');
        lista.replaceChildren();
        estado.escolhidos.forEach(function (p) {
            const chip = criar('li', 'grp-chip');
            chip.appendChild(criar('span', '', '@' + p.nick));
            const tirar = criar('button', 'grp-chip-x', '×');
            tirar.type = 'button';
            tirar.setAttribute('aria-label', 'Tirar @' + p.nick);
            tirar.addEventListener('click', function () {
                estado.escolhidos = estado.escolhidos.filter(function (x) { return x.id !== p.id; });
                desenharEscolhidos();
            });
            chip.appendChild(tirar);
            lista.appendChild(chip);
        });
    }

    function fecharForm() {
        el('grp-form').hidden = true;
        el('grp-form').reset();
        estado.escolhidos = [];
        desenharEscolhidos();
    }

    el('grp-novo').addEventListener('click', function () {
        el('grp-form').hidden = false;
        el('grp-nome').focus();
    });
    el('grp-cancelar').addEventListener('click', fecharForm);

    ligarBusca(el('grp-pessoa'), el('grp-resultados'), function (p) {
        estado.escolhidos.push(p);
        desenharEscolhidos();
    }, function (id) {
        return estado.escolhidos.some(function (x) { return x.id === id; });
    });

    el('grp-form').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!estado.escolhidos.length) {
            Swal.fire('Escolha pessoas', 'Adicione pelo menos uma pessoa ao grupo.', 'info');
            return;
        }
        api('/grupos', 'POST', {
            nome: el('grp-nome').value.trim(),
            membros: estado.escolhidos.map(function (p) { return p.id; })
        }).then(function (g) {
            fecharForm();
            return abrir(g.id);
        }).catch(erro);
    });

    // ---------- tempo real ----------
    ouvintesDeEvento.push(function (evento) {
        if (evento.tipo !== 'grupo') return;
        carregarLista();
        if (evento.de === estado.aberto) buscarNovas();
    });
    window.setInterval(function () { if (!document.hidden) { carregarLista(); buscarNovas(); } }, 30000);

    carregarLista();
})();
