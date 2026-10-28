// Grupos de conversa: aba "Grupos" da página de mensagens (usa mensagens-base.js)
(function () {
    if (!window.OrbyMensagens) return;
    const { criar, api, hora, avatar, ouvintesDeEvento, buscarTotal } = window.OrbyMensagens;
    const LIMITE_MEMBROS = 67;
    const LIMITE_FOTO = 2 * 1024 * 1024;

    function icone(classe) {
        const i = document.createElement('i');
        i.className = classe;
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    function botao(classe, texto, aoClicar) {
        const b = criar('button', classe, texto);
        b.type = 'button';
        if (aoClicar) b.addEventListener('click', aoClicar);
        return b;
    }

    function avatarDoGrupo(id, versao, classe) {
        const caixa = criar('span', 'user-avatar grp-avatar ' + (classe || ''));
        caixa.setAttribute('aria-hidden', 'true');
        if (versao) {
            const img = document.createElement('img');
            img.alt = '';
            img.src = '/grupos/' + id + '/foto?v=' + versao;
            caixa.appendChild(img);
        } else {
            caixa.appendChild(icone('fa-solid fa-user-group'));
        }
        return caixa;
    }

    function erro(e) {
        Swal.fire('Ops...', (e && e.erro) || 'Algo deu errado.', 'error');
    }

    function confirmar(titulo, texto) {
        return Swal.fire({ title: titulo, text: texto, icon: 'warning', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar' })
            .then(function (r) { return r.isConfirmed; });
    }

    function enviarFoto(grupoId, arquivo) {
        return fetch('/grupos/' + grupoId + '/foto', {
            method: 'POST', credentials: 'same-origin', body: arquivo,
            headers: { 'Content-Type': arquivo.type, 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (resposta) {
            if (resposta.ok) return;
            return resposta.json().catch(function () { return {}; }).then(function (d) {
                throw { erro: d.erro || 'Não foi possível enviar a foto.' };
            });
        });
    }

    function validarFoto(arquivo) {
        if (!arquivo) return false;
        if (!/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type)) { erro({ erro: 'Escolha uma imagem JPG, PNG, WEBP ou GIF.' }); return false; }
        if (arquivo.size > LIMITE_FOTO) { erro({ erro: 'A foto deve ter no máximo 2 MB.' }); return false; }
        return true;
    }

    // Linha de pessoa: avatar, nome e @nick, com um complemento (caixa de seleção, botão, selos)
    function linhaDePessoa(p, complemento) {
        const li = criar('li', 'grp-pessoa');
        li.appendChild(avatar(p.id, p.fotoVersao, 'msg-avatar'));
        const texto = criar('span', 'grp-pessoa-texto');
        texto.append(criar('strong', '', p.nome), criar('small', '', '@' + p.nick));
        li.appendChild(texto);
        if (complemento) li.appendChild(complemento);
        return li;
    }

    function montar(colLista, colChat, app, aoMudarNaoLidas) {
        const estado = { grupos: [], aberto: null, ultimoId: 0, dialogo: null, vista: 'vazio', escolhidos: new Set(), candidatos: [], foto: null, ativo: false };

        // ---------- lista ----------
        const painelLista = criar('div', 'grp-lista-painel');
        const novo = criar('button', 'btn btn-primary btn-sm grp-novo');
        novo.type = 'button';
        novo.append(icone('fa-solid fa-plus'), ' Novo grupo');
        const lista = criar('ul', 'msg-lista');
        const vazioLista = criar('p', 'msg-vazio', 'Você ainda não está em nenhum grupo.');
        vazioLista.hidden = true;
        painelLista.append(novo, lista, vazioLista);
        colLista.appendChild(painelLista);

        // ---------- painel da direita ----------
        const painel = criar('div', 'grp-chat-painel');
        const vistaVazia = criar('p', 'grp-nenhuma', 'Escolha um grupo ou crie um novo.');
        const vistaNovo = criar('form', 'grp-vista grp-novo-form');
        const vistaChat = criar('div', 'grp-vista grp-chat');
        painel.append(vistaVazia, vistaNovo, vistaChat);
        colChat.appendChild(painel);

        function mostrar(vista) {
            estado.vista = vista;
            vistaVazia.hidden = vista !== 'vazio';
            vistaNovo.hidden = vista !== 'novo';
            vistaChat.hidden = vista !== 'chat';
            app.classList.toggle('tem-chat', vista !== 'vazio');
            app.dataset.view = vista === 'vazio' ? 'lista' : 'chat';
        }

        function voltar() {
            estado.aberto = null;
            estado.dialogo = null;
            mostrar('vazio');
            desenharLista();
        }

        function botaoVoltar() {
            const b = botao('msg-icon grp-voltar-btn', '', voltar);
            b.setAttribute('aria-label', 'Voltar para os grupos');
            b.appendChild(icone('fa-solid fa-arrow-left'));
            return b;
        }

        function totalNaoLidas() {
            return estado.grupos.reduce(function (t, g) { return t + (g.id === estado.aberto && estado.ativo ? 0 : g.naoLidas); }, 0);
        }

        function desenharLista() {
            lista.replaceChildren();
            vazioLista.hidden = estado.grupos.length > 0;
            estado.grupos.forEach(function (g) {
                const li = criar('li');
                const b = criar('button', 'msg-item' + (g.id === estado.aberto ? ' is-active' : ''));
                b.type = 'button';
                const corpo = criar('span', 'msg-item-corpo');
                const topo = criar('span', 'msg-item-topo');
                topo.appendChild(criar('strong', 'msg-item-nome', g.nome));
                if (g.ultimaEm) topo.appendChild(criar('time', 'msg-item-hora', hora(g.ultimaEm)));
                corpo.append(topo, criar('span', 'msg-item-previa', g.ultimaMensagem || g.membros + ' participantes'));
                b.append(avatarDoGrupo(g.id, g.fotoVersao, 'msg-avatar'), corpo);
                if (g.naoLidas > 0 && g.id !== estado.aberto) b.appendChild(criar('span', 'msg-ponto', g.naoLidas > 99 ? '99+' : String(g.naoLidas)));
                b.addEventListener('click', function () { abrir(g.id); });
                li.appendChild(b);
                lista.appendChild(li);
            });
            aoMudarNaoLidas(totalNaoLidas());
        }

        function carregarLista() {
            return api('/grupos/lista').then(function (grupos) {
                estado.grupos = grupos || [];
                desenharLista();
                buscarTotal();
            }).catch(function () {});
        }

        // ---------- novo grupo ----------
        function abrirNovo() {
            estado.escolhidos = new Set();
            estado.foto = null;
            estado.aberto = null;
            desenharLista();
            vistaNovo.replaceChildren();

            const topo = criar('div', 'grp-topo');
            topo.append(botaoVoltar(), criar('strong', '', 'Novo grupo'));

            const arquivo = document.createElement('input');
            arquivo.type = 'file';
            arquivo.accept = 'image/jpeg,image/png,image/webp,image/gif';
            arquivo.hidden = true;
            const previa = botao('grp-foto-escolher', '');
            previa.setAttribute('aria-label', 'Escolher foto do grupo');
            const desenharPrevia = function () {
                previa.replaceChildren();
                if (estado.foto) {
                    const img = document.createElement('img');
                    img.alt = '';
                    img.src = URL.createObjectURL(estado.foto);
                    previa.appendChild(img);
                } else {
                    previa.append(icone('fa-solid fa-camera'));
                }
            };
            desenharPrevia();
            previa.addEventListener('click', function () { arquivo.click(); });
            arquivo.addEventListener('change', function () {
                if (validarFoto(arquivo.files[0])) { estado.foto = arquivo.files[0]; desenharPrevia(); }
            });

            const nome = criar('input', 'form-control grp-nome');
            nome.maxLength = 60;
            nome.placeholder = 'Nome do grupo';
            nome.setAttribute('aria-label', 'Nome do grupo');
            const identidade = criar('div', 'grp-identidade');
            identidade.append(previa, nome, arquivo);

            const busca = criar('input', 'form-control');
            busca.type = 'search';
            busca.placeholder = 'Buscar entre as pessoas que você segue';
            busca.setAttribute('aria-label', 'Buscar pessoas');
            const contagem = criar('p', 'grp-contagem');
            const pessoas = criar('ul', 'grp-pessoas');
            const criarBotao = criar('button', 'btn btn-primary btn-sm', 'Criar grupo');
            criarBotao.type = 'submit';

            const atualizar = function () {
                const total = estado.escolhidos.size;
                contagem.textContent = total ? total + ' de ' + (LIMITE_MEMBROS - 1) + ' pessoas escolhidas' : 'Escolha as pessoas do grupo';
                criarBotao.disabled = !total || !nome.value.trim();
            };
            const desenharPessoas = function () {
                const termo = busca.value.trim().replace(/^@/, '').toLowerCase();
                pessoas.replaceChildren();
                const visiveis = estado.candidatos.filter(function (p) {
                    return !termo || p.nick.toLowerCase().indexOf(termo) === 0 || p.nome.toLowerCase().indexOf(termo) >= 0;
                });
                if (!visiveis.length) {
                    pessoas.appendChild(criar('li', 'msg-vazio', estado.candidatos.length ? 'Ninguém encontrado.' : 'Siga pessoas para poder colocá-las em um grupo.'));
                    return;
                }
                visiveis.forEach(function (p) {
                    const caixa = document.createElement('input');
                    caixa.type = 'checkbox';
                    caixa.checked = estado.escolhidos.has(p.id);
                    caixa.setAttribute('aria-label', 'Escolher @' + p.nick);
                    caixa.addEventListener('change', function () {
                        if (caixa.checked && estado.escolhidos.size >= LIMITE_MEMBROS - 1) { caixa.checked = false; return; }
                        if (caixa.checked) estado.escolhidos.add(p.id); else estado.escolhidos.delete(p.id);
                        atualizar();
                    });
                    const li = linhaDePessoa(p, caixa);
                    li.classList.add('grp-pessoa--escolha');
                    li.addEventListener('click', function (e) { if (e.target !== caixa) caixa.click(); });
                    pessoas.appendChild(li);
                });
            };
            busca.addEventListener('input', desenharPessoas);
            nome.addEventListener('input', atualizar);

            const acoes = criar('div', 'grp-acoes');
            acoes.append(criarBotao, botao('btn btn-outline-secondary btn-sm', 'Cancelar', voltar));
            vistaNovo.append(topo, identidade, busca, contagem, pessoas, acoes);
            atualizar();
            mostrar('novo');
            nome.focus();

            api('/grupos/candidatos').then(function (c) { estado.candidatos = c || []; desenharPessoas(); }).catch(function () {
                pessoas.replaceChildren(criar('li', 'msg-vazio', 'Não foi possível carregar as pessoas.'));
            });

            vistaNovo.onsubmit = function (e) {
                e.preventDefault();
                criarBotao.disabled = true;
                api('/grupos', 'POST', { nome: nome.value.trim(), membros: Array.from(estado.escolhidos) }).then(function (g) {
                    const foto = estado.foto;
                    estado.foto = null;
                    return (foto ? enviarFoto(g.id, foto).catch(erro) : Promise.resolve()).then(function () { return abrir(g.id); });
                }).catch(function (e2) { erro(e2); atualizar(); });
            };
        }

        // ---------- conversa ----------
        function desenharMensagem(m) {
            const caixa = criar('div', 'grp-msg' + (m.minha ? ' grp-msg--minha' : ''));
            caixa.dataset.id = m.id;
            if (!m.minha) {
                const autor = criar('span', 'grp-msg-autor', m.nome);
                if (m.admin) autor.appendChild(criar('span', 'admin-badge', '🛡 Administrador'));
                caixa.appendChild(autor);
            }
            caixa.append(criar('span', 'grp-msg-texto', m.texto), criar('time', 'grp-msg-hora', hora(m.criadoEm)));
            return caixa;
        }

        function acrescentar(fluxo, mensagens) {
            const noFim = fluxo.scrollHeight - fluxo.scrollTop - fluxo.clientHeight < 80;
            let novas = false;
            mensagens.forEach(function (m) {
                if (fluxo.querySelector('[data-id="' + m.id + '"]')) return;
                fluxo.appendChild(desenharMensagem(m));
                estado.ultimoId = Math.max(estado.ultimoId, m.id);
                novas = novas || m.minha;
            });
            if (noFim || novas) fluxo.scrollTop = fluxo.scrollHeight;
        }

        let fluxoAtual = null;
        let infoAberta = false;

        function desenharChat(d) {
            vistaChat.replaceChildren();
            const topo = criar('div', 'grp-topo');
            const titulo = criar('button', 'grp-titulo');
            titulo.type = 'button';
            titulo.setAttribute('aria-label', 'Detalhes do grupo');
            const textos = criar('span', 'grp-titulo-texto');
            textos.append(criar('strong', '', d.nome), criar('small', '', d.membros + ' participantes'));
            titulo.append(avatarDoGrupo(d.id, d.fotoVersao, 'msg-avatar'), textos);
            titulo.addEventListener('click', function () { infoAberta = true; desenharInfo(d); });
            const detalhes = botao('msg-icon', '', function () { infoAberta = true; desenharInfo(d); });
            detalhes.setAttribute('aria-label', 'Detalhes do grupo');
            detalhes.appendChild(icone('fa-solid fa-circle-info'));
            topo.append(botaoVoltar(), titulo, detalhes);

            const fluxo = criar('div', 'grp-fluxo');
            fluxo.setAttribute('role', 'log');
            fluxo.setAttribute('aria-live', 'polite');
            fluxoAtual = fluxo;

            const form = criar('form', 'grp-enviar');
            const campo = criar('textarea', 'form-control msg-campo');
            campo.rows = 1;
            campo.maxLength = 1000;
            campo.placeholder = 'Escreva uma mensagem...';
            campo.setAttribute('aria-label', 'Mensagem');
            const enviar = criar('button', 'btn btn-primary msg-enviar');
            enviar.type = 'submit';
            enviar.setAttribute('aria-label', 'Enviar');
            enviar.appendChild(icone('fa-solid fa-paper-plane'));
            form.append(campo, enviar);
            campo.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
            });
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const texto = campo.value.trim();
                if (!texto || estado.aberto === null) return;
                enviar.disabled = true;
                api('/grupos/' + estado.aberto + '/mensagens', 'POST', { texto: texto }).then(function (m) {
                    campo.value = '';
                    acrescentar(fluxo, [m]);
                    carregarLista();
                }).catch(erro).then(function () { enviar.disabled = false; campo.focus(); });
            });

            vistaChat.append(topo, fluxo, form);
            acrescentar(fluxo, d.mensagensDoGrupo);
            fluxo.scrollTop = fluxo.scrollHeight;
        }

        // ---------- detalhes do grupo ----------
        function desenharInfo(d) {
            vistaChat.replaceChildren();
            const topo = criar('div', 'grp-topo');
            const fechar = botao('msg-icon', '', function () { infoAberta = false; abrir(d.id); });
            fechar.setAttribute('aria-label', 'Voltar para a conversa');
            fechar.appendChild(icone('fa-solid fa-arrow-left'));
            topo.append(fechar, criar('strong', '', 'Detalhes do grupo'));

            const corpo = criar('div', 'grp-info');
            const capa = criar('div', 'grp-info-capa');
            capa.append(avatarDoGrupo(d.id, d.fotoVersao, 'grp-avatar--grande'), criar('h2', 'grp-info-nome', d.nome), criar('p', 'grp-info-sub', d.membros + ' de ' + LIMITE_MEMBROS + ' participantes'));
            if (d.euPossoAdicionar) {
                const arquivo = document.createElement('input');
                arquivo.type = 'file';
                arquivo.accept = 'image/jpeg,image/png,image/webp,image/gif';
                arquivo.hidden = true;
                arquivo.addEventListener('change', function () {
                    if (!validarFoto(arquivo.files[0])) return;
                    enviarFoto(d.id, arquivo.files[0]).then(function () { return recarregarInfo(d.id); }).catch(erro);
                });
                const acoesFoto = criar('div', 'grp-info-acoes');
                acoesFoto.appendChild(botao('btn btn-outline-secondary btn-sm', d.fotoVersao ? 'Trocar foto' : 'Adicionar foto', function () { arquivo.click(); }));
                if (d.fotoVersao) {
                    acoesFoto.appendChild(botao('btn btn-outline-secondary btn-sm', 'Remover foto', function () {
                        api('/grupos/' + d.id + '/foto', 'DELETE').then(function () { return recarregarInfo(d.id); }).catch(erro);
                    }));
                }
                capa.append(acoesFoto, arquivo);
            }
            corpo.appendChild(capa);

            if (d.euPossoAdicionar) corpo.appendChild(secaoAdicionar(d));

            const titulo = criar('h3', 'grp-secao', 'Participantes');
            const membros = criar('ul', 'grp-pessoas');
            d.listaDeMembros.forEach(function (m) {
                const extras = criar('span', 'grp-pessoa-extras');
                if (m.criador) extras.appendChild(criar('span', 'grp-selo', 'Criador'));
                else if (m.podeAdicionar) extras.appendChild(criar('span', 'grp-selo', 'Organizador'));
                if (d.euCriador && !m.criador) {
                    extras.appendChild(botao('btn btn-outline-secondary btn-sm', m.podeAdicionar ? 'Remover organizador' : 'Adicionar organizador', function () {
                        api('/grupos/' + d.id + '/membros/' + m.id + '/permissao', 'PUT', { pode: !m.podeAdicionar })
                            .then(function () { return recarregarInfo(d.id); }).catch(erro);
                    }));
                    extras.appendChild(botao('btn btn-outline-danger btn-sm', 'Remover', function () {
                        confirmar('Remover @' + m.nick + '?', 'A pessoa deixa de ver o grupo.').then(function (ok) {
                            if (ok) api('/grupos/' + d.id + '/membros/' + m.id, 'DELETE').then(function () { return recarregarInfo(d.id); }).catch(erro);
                        });
                    }));
                }
                membros.appendChild(linhaDePessoa(m, extras));
            });
            corpo.append(titulo, membros);

            corpo.appendChild(botao('btn btn-outline-danger btn-sm grp-sair', 'Sair do grupo', function () {
                confirmar('Sair do grupo?', 'Você deixa de receber as mensagens de "' + d.nome + '".').then(function (ok) {
                    if (!ok) return;
                    api('/grupos/' + d.id + '/membros/' + d.euId, 'DELETE').then(function () {
                        infoAberta = false;
                        voltar();
                        carregarLista();
                    }).catch(erro);
                });
            }));
            vistaChat.append(topo, corpo);
        }

        function secaoAdicionar(d) {
            const secao = criar('div', 'grp-adicionar');
            secao.appendChild(criar('h3', 'grp-secao', 'Adicionar pessoas'));
            const busca = criar('input', 'form-control');
            busca.type = 'search';
            busca.placeholder = 'Buscar entre as pessoas que você segue';
            busca.setAttribute('aria-label', 'Buscar pessoas');
            const lista_ = criar('ul', 'grp-pessoas grp-pessoas--curta');
            secao.append(busca, lista_);
            let candidatos = [];
            const desenhar = function () {
                const termo = busca.value.trim().replace(/^@/, '').toLowerCase();
                const jaNoGrupo = new Set(d.listaDeMembros.map(function (m) { return m.id; }));
                lista_.replaceChildren();
                const visiveis = candidatos.filter(function (p) {
                    return !jaNoGrupo.has(p.id) && (!termo || p.nick.toLowerCase().indexOf(termo) === 0 || p.nome.toLowerCase().indexOf(termo) >= 0);
                });
                if (!visiveis.length) lista_.appendChild(criar('li', 'msg-vazio', 'Ninguém para adicionar.'));
                visiveis.forEach(function (p) {
                    const b = botao('btn btn-primary btn-sm', 'Adicionar', function () {
                        b.disabled = true;
                        api('/grupos/' + d.id + '/membros', 'POST', { usuarioId: p.id }).then(function () { return recarregarInfo(d.id); }).catch(function (e) { b.disabled = false; erro(e); });
                    });
                    lista_.appendChild(linhaDePessoa(p, b));
                });
            };
            busca.addEventListener('input', desenhar);
            api('/grupos/candidatos').then(function (c) { candidatos = c || []; desenhar(); }).catch(function () {});
            return secao;
        }

        function recarregarInfo(id) {
            return api('/grupos/' + id).then(function (d) {
                estado.dialogo = d;
                if (infoAberta) desenharInfo(d);
                carregarLista();
            });
        }

        function abrir(id) {
            return api('/grupos/' + id + '?apos=0').then(function (d) {
                estado.aberto = id;
                estado.dialogo = d;
                estado.ultimoId = 0;
                infoAberta = false;
                desenharChat(d);
                mostrar('chat');
                carregarLista();
            }).catch(function (e) {
                if (e && e.status === 404) { voltar(); carregarLista(); return; }
                erro(e);
            });
        }

        function buscarNovas() {
            if (estado.aberto === null || document.hidden || !estado.ativo) return;
            const id = estado.aberto;
            api('/grupos/' + id + '?apos=' + estado.ultimoId).then(function (d) {
                if (estado.aberto !== id) return;
                const mudou = !estado.dialogo || estado.dialogo.membros !== d.membros || estado.dialogo.nome !== d.nome || estado.dialogo.fotoVersao !== d.fotoVersao || estado.dialogo.euPossoAdicionar !== d.euPossoAdicionar;
                estado.dialogo = d;
                if (infoAberta) { desenharInfo(d); return; }
                if (mudou) return abrir(id);
                if (fluxoAtual) acrescentar(fluxoAtual, d.mensagensDoGrupo);
                carregarLista();
            }).catch(function (e) {
                if (e && e.status === 404) { voltar(); carregarLista(); }
            });
        }

        novo.addEventListener('click', abrirNovo);

        ouvintesDeEvento.push(function (evento) {
            if (evento.tipo !== 'grupo') return;
            carregarLista();
            if (evento.de === estado.aberto) buscarNovas();
        });
        window.setInterval(function () {
            if (document.hidden) return;
            carregarLista();
            buscarNovas();
        }, 30000);

        mostrar('vazio');
        carregarLista();

        return {
            // chamada quando a aba Grupos é aberta ou fechada
            definirAtivo: function (ativo) {
                estado.ativo = ativo;
                if (ativo) {
                    app.classList.toggle('tem-chat', estado.vista !== 'vazio');
                    desenharLista();
                    carregarLista();
                    buscarNovas();
                } else {
                    aoMudarNaoLidas(totalNaoLidas());
                }
            },
            abrir: abrir
        };
    }

    window.OrbyGrupos = { montar: montar };
})();
