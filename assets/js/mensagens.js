// Mensagens diretas: bloco na home (dock), página completa e contador no cabeçalho
(function () {
    const INTERVALO_CONTADOR = 20000;
    const INTERVALO_LISTA = 8000;
    const INTERVALO_CHAT = 4000;

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto) el.textContent = texto;
        return el;
    }

    function api(url, metodo, corpo) {
        const opcoes = { method: metodo || 'GET', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
        if (corpo !== undefined) {
            opcoes.headers['Content-Type'] = 'application/json';
            opcoes.body = JSON.stringify(corpo);
        }
        return fetch(url, opcoes).then(function (resposta) {
            if (resposta.status === 401) { window.location.href = '/login'; throw { status: 401 }; }
            if (resposta.status === 204) return null;
            return resposta.json().catch(function () { return {}; }).then(function (dados) {
                if (!resposta.ok) throw { status: resposta.status, erro: dados.erro || 'Algo deu errado.' };
                return dados;
            });
        });
    }

    function hora(iso) {
        const data = new Date(iso);
        const hoje = new Date();
        if (data.toDateString() === hoje.toDateString()) {
            return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function avatar(usuarioId, versao, classe) {
        const caixa = criar('span', 'user-avatar ' + (classe || ''));
        caixa.setAttribute('aria-hidden', 'true');
        if (versao) {
            const img = document.createElement('img');
            img.alt = '';
            img.src = '/usuarios/' + usuarioId + '/foto?v=' + versao;
            caixa.appendChild(img);
        } else {
            caixa.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
        return caixa;
    }

    function mostrarSelo(selo, total) {
        if (!selo) return;
        selo.hidden = total < 1;
        selo.textContent = total > 99 ? '99+' : String(total);
    }

    // ---------- contador (todas as páginas) ----------
    const seloCabecalho = document.getElementById('msg-badge');
    const ouvintesDoTotal = [];

    function buscarTotal() {
        if (document.hidden) return;
        api('/conversas/nao-lidas').then(function (dados) {
            mostrarSelo(seloCabecalho, dados.total || 0);
            const link = document.getElementById('msg-link');
            if (link) link.setAttribute('aria-label', dados.total > 0 ? 'Mensagens (' + dados.total + ' novas)' : 'Mensagens');
            ouvintesDoTotal.forEach(function (f) { f(dados); });
        }).catch(function () {});
    }

    if (seloCabecalho) {
        buscarTotal();
        window.setInterval(buscarTotal, INTERVALO_CONTADOR);
    }

    // ---------- aplicativo de conversa ----------
    function montar(raiz, modo, aoMudar) {
        const app = criar('div', 'msg-app msg-app--' + modo);
        app.dataset.view = 'lista';

        const colLista = criar('div', 'msg-lista-col');
        const abas = criar('div', 'msg-tabs');
        const abaConversas = criar('button', 'msg-tab is-active', 'Conversas');
        const abaPedidos = criar('button', 'msg-tab');
        abaConversas.type = abaPedidos.type = 'button';
        const textoPedidos = criar('span', '', 'Pedidos');
        const contagemPedidos = criar('span', 'msg-count');
        contagemPedidos.hidden = true;
        abaPedidos.append(textoPedidos, contagemPedidos);
        abas.append(abaConversas, abaPedidos);
        const lista = criar('ul', 'msg-lista');
        const vazio = criar('p', 'msg-vazio');
        colLista.append(abas, lista, vazio);

        const colChat = criar('div', 'msg-chat-col');
        const cabecalho = criar('div', 'msg-chat-head');
        const voltar = criar('button', 'msg-icon msg-voltar');
        voltar.type = 'button';
        voltar.setAttribute('aria-label', 'Voltar para as conversas');
        voltar.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
        const quem = criar('a', 'msg-quem');
        const abrirTela = criar('a', 'msg-icon msg-expandir');
        abrirTela.href = '/mensagens';
        abrirTela.title = abrirTela.ariaLabel = 'Abrir em tela cheia';
        abrirTela.innerHTML = '<i class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i>';
        const excluirConversa = criar('button', 'msg-icon');
        excluirConversa.type = 'button';
        excluirConversa.title = 'Apagar conversa';
        excluirConversa.setAttribute('aria-label', 'Apagar conversa');
        excluirConversa.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
        cabecalho.append(voltar, quem, excluirConversa);
        if (modo === 'dock') cabecalho.append(abrirTela);

        const aviso = criar('div', 'msg-aviso');
        aviso.hidden = true;
        const fluxo = criar('div', 'msg-fluxo');
        fluxo.setAttribute('role', 'log');
        fluxo.setAttribute('aria-live', 'polite');
        const formulario = criar('form', 'msg-form');
        const campo = criar('textarea', 'form-control msg-campo');
        campo.rows = 1;
        campo.maxLength = 1000;
        campo.placeholder = 'Escreva uma mensagem...';
        campo.setAttribute('aria-label', 'Mensagem');
        const enviar = criar('button', 'btn btn-primary msg-enviar');
        enviar.type = 'submit';
        enviar.setAttribute('aria-label', 'Enviar');
        enviar.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>';
        const erroEnvio = criar('p', 'msg-erro');
        erroEnvio.hidden = true;
        formulario.append(campo, enviar);
        const nenhuma = criar('p', 'msg-nenhuma', 'Escolha uma conversa para começar.');
        colChat.append(cabecalho, aviso, fluxo, erroEnvio, formulario, nenhuma);

        app.append(colLista, colChat);
        raiz.appendChild(app);

        const estado = { aba: 'conversas', conversas: [], aberta: null, ultimoId: 0, dialogo: null, timerChat: null, timerLista: null };

        function definirView(view) {
            app.dataset.view = view;
            if (aoMudar) aoMudar(estado);
        }

        function desenharLista() {
            const pedidos = estado.conversas.filter(function (c) { return c.solicitacao || c.desculpa; });
            const normais = estado.conversas.filter(function (c) { return !(c.solicitacao || c.desculpa); });
            const novosPedidos = pedidos.filter(function (c) { return c.naoLidas > 0; }).length;
            mostrarSelo(contagemPedidos, novosPedidos);
            abaConversas.classList.toggle('is-active', estado.aba === 'conversas');
            abaPedidos.classList.toggle('is-active', estado.aba === 'pedidos');

            const itens = estado.aba === 'pedidos' ? pedidos : normais;
            lista.textContent = '';
            vazio.hidden = itens.length > 0;
            vazio.textContent = estado.aba === 'pedidos' ? 'Nenhum pedido de conversa.' : 'Você ainda não tem conversas. Visite o perfil de alguém e envie uma mensagem.';

            itens.forEach(function (c) {
                const li = criar('li');
                const botao = criar('button', 'msg-item' + (estado.aberta === c.usuarioId ? ' is-active' : ''));
                botao.type = 'button';
                const corpo = criar('span', 'msg-item-corpo');
                const topo = criar('span', 'msg-item-topo');
                topo.append(criar('strong', 'msg-item-nome', c.nome), criar('time', 'msg-item-hora', hora(c.atualizadoEm)));
                const previa = (c.ultimaMinha ? 'Você: ' : '') + c.ultimaMensagem;
                corpo.append(topo, criar('span', 'msg-item-previa', c.desculpa ? 'Pedido de desculpas · ' + previa : (c.aguardando ? 'Aguardando resposta · ' + previa : previa)));
                botao.append(avatar(c.usuarioId, c.fotoVersao, 'msg-avatar'), corpo);
                if (c.naoLidas > 0) botao.append(criar('span', 'msg-ponto', String(c.naoLidas > 99 ? '99+' : c.naoLidas)));
                botao.addEventListener('click', function () { abrir(c.usuarioId); });
                li.appendChild(botao);
                lista.appendChild(li);
            });
        }

        function carregarLista() {
            if (document.hidden) return Promise.resolve();
            return api('/conversas').then(function (dados) {
                estado.conversas = dados || [];
                desenharLista();
            }).catch(function () {});
        }

        function criarBolha(m) {
            const bolha = criar('div', 'msg-bolha ' + (m.minha ? 'msg-bolha--minha' : 'msg-bolha--outra'));
            bolha.dataset.id = m.id;
            bolha.appendChild(criar('p', 'msg-texto', m.texto));
            const rodape = criar('span', 'msg-bolha-hora');
            rodape.appendChild(criar('time', '', hora(m.criadoEm)));
            if (m.minha) {
                const apagar = criar('button', 'msg-apagar');
                apagar.type = 'button';
                apagar.title = 'Apagar mensagem';
                apagar.setAttribute('aria-label', 'Apagar mensagem');
                apagar.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
                apagar.addEventListener('click', function () {
                    confirmar('Apagar esta mensagem?', 'Ela some para as duas pessoas.').then(function (ok) {
                        if (!ok) return;
                        api('/mensagens/' + m.id, 'DELETE').then(function () {
                            bolha.remove();
                            carregarLista();
                        }).catch(function (erro) { if (erro.erro) alertar(erro.erro); });
                    });
                });
                rodape.appendChild(apagar);
            }
            bolha.appendChild(rodape);
            return bolha;
        }

        function confirmar(titulo, texto) {
            if (window.Swal) {
                return Swal.fire({ title: titulo, text: texto, icon: 'warning', showCancelButton: true, confirmButtonText: 'Apagar', cancelButtonText: 'Cancelar' })
                    .then(function (r) { return r.isConfirmed; });
            }
            return Promise.resolve(window.confirm(titulo));
        }

        function alertar(texto) {
            if (window.Swal) Swal.fire('Ops...', texto, 'error'); else window.alert(texto);
        }

        function desenharAviso() {
            const d = estado.dialogo;
            aviso.textContent = '';
            const semCampo = !!(d && (d.solicitacao || (d.bloqueei && !d.desculpa)));
            aviso.hidden = !d || !(d.solicitacao || d.aguardando || d.bloqueei || d.bloqueado);
            formulario.hidden = semCampo;
            if (!d || aviso.hidden) return;

            if (d.bloqueei) {
                if (!d.desculpa) {
                    aviso.textContent = 'Você bloqueou ' + d.nome + '. Desbloqueie pelo perfil para voltar a conversar.';
                    return;
                }
                aviso.appendChild(criar('p', '', d.nome + ' pediu explicações por você tê-lo bloqueado. Você pode responder com quantas mensagens quiser ou excluir o pedido.'));
                const acoesPedido = criar('div', 'msg-aviso-acoes');
                const excluirPedido = criar('button', 'btn btn-outline-secondary btn-sm', 'Excluir pedido');
                excluirPedido.type = 'button';
                excluirPedido.addEventListener('click', function () { apagarConversa(true); });
                acoesPedido.appendChild(excluirPedido);
                aviso.appendChild(acoesPedido);
                return;
            }

            if (d.bloqueado) {
                aviso.textContent = d.nome + ' bloqueou você. Só é possível enviar um pedido de desculpas (até 3 mensagens, até a pessoa responder).';
                return;
            }

            if (d.aguardando) {
                aviso.textContent = d.nome + ' ainda não aceitou a conversa. Você pode enviar até 3 mensagens até ela responder ou aceitar.';
                return;
            }

            aviso.appendChild(criar('p', '', d.nome + ' quer conversar com você, mas vocês não se seguem mutuamente. Aceitar libera a conversa; recusar apaga as mensagens.'));
            const acoes = criar('div', 'msg-aviso-acoes');
            const aceitar = criar('button', 'btn btn-primary btn-sm', 'Aceitar');
            const recusar = criar('button', 'btn btn-outline-secondary btn-sm', 'Recusar');
            aceitar.type = recusar.type = 'button';
            aceitar.addEventListener('click', function () {
                aceitar.disabled = true;
                api('/conversas/' + d.usuarioId + '/aceitar', 'POST').then(function () {
                    return abrir(d.usuarioId);
                }).then(function () { carregarLista(); buscarTotal(); }).catch(function (erro) {
                    aceitar.disabled = false;
                    if (erro.erro) alertar(erro.erro);
                });
            });
            recusar.addEventListener('click', function () { apagarConversa(true); });
            acoes.append(aceitar, recusar);
            aviso.appendChild(acoes);
        }

        function rolarParaOFim() { fluxo.scrollTop = fluxo.scrollHeight; }

        function aplicarDialogo(d, completo) {
            const pertoDoFim = fluxo.scrollHeight - fluxo.scrollTop - fluxo.clientHeight < 80;
            estado.dialogo = d;
            if (completo) {
                fluxo.textContent = '';
                estado.ultimoId = 0;
            }
            d.mensagens.forEach(function (m) {
                if (fluxo.querySelector('[data-id="' + m.id + '"]')) return;
                fluxo.appendChild(criarBolha(m));
                if (m.id > estado.ultimoId) estado.ultimoId = m.id;
            });
            if (completo && !d.mensagens.length) fluxo.appendChild(criar('p', 'msg-inicio', 'Nenhuma mensagem ainda. Diga oi!'));
            else if (d.mensagens.length) {
                const inicio = fluxo.querySelector('.msg-inicio');
                if (inicio) inicio.remove();
            }
            desenharAviso();
            if (completo || (d.mensagens.length && pertoDoFim)) rolarParaOFim();
        }

        function abrir(usuarioId) {
            estado.aberta = usuarioId;
            window.clearInterval(estado.timerChat);
            return api('/conversas/' + usuarioId + '/mensagens').then(function (d) {
                quem.textContent = d.nome;
                quem.href = '/usuarios/' + d.usuarioId;
                quem.prepend(avatar(d.usuarioId, d.fotoVersao, 'msg-avatar'));
                abrirTela.href = '/mensagens?com=' + d.usuarioId;
                aplicarDialogo(d, true);
                app.classList.add('tem-chat');
                definirView('chat');
                desenharLista();
                buscarTotal();
                estado.timerChat = window.setInterval(atualizarChat, INTERVALO_CHAT);
                if (modo === 'pagina' && window.history && history.replaceState) history.replaceState(null, '', '/mensagens?com=' + usuarioId);
                campo.focus({ preventScroll: true });
            }).catch(function (erro) {
                if (erro.erro) alertar(erro.erro);
            });
        }

        function atualizarChat() {
            if (document.hidden || estado.aberta === null) return;
            const id = estado.aberta;
            api('/conversas/' + id + '/mensagens?apos=' + estado.ultimoId).then(function (d) {
                if (estado.aberta !== id) return;
                const chegou = d.mensagens.some(function (m) { return !m.minha; });
                aplicarDialogo(d, false);
                if (chegou) { carregarLista(); buscarTotal(); }
            }).catch(function () {});
        }

        function fecharChat() {
            window.clearInterval(estado.timerChat);
            estado.aberta = null;
            estado.dialogo = null;
            app.classList.remove('tem-chat');
            definirView('lista');
            if (modo === 'pagina' && window.history && history.replaceState) history.replaceState(null, '', '/mensagens');
            carregarLista();
        }

        function apagarConversa(semConfirmar) {
            const d = estado.dialogo;
            if (!d) return;
            const passo = semConfirmar ? Promise.resolve(true) : confirmar('Apagar a conversa com ' + d.nome + '?', 'Ela some só para você; a outra pessoa continua vendo a conversa.');
            passo.then(function (ok) {
                if (!ok) return;
                api('/conversas/' + d.usuarioId, 'DELETE').then(function () { fecharChat(); buscarTotal(); })
                    .catch(function (erro) { if (erro.erro) alertar(erro.erro); });
            });
        }

        abaConversas.addEventListener('click', function () { estado.aba = 'conversas'; desenharLista(); });
        abaPedidos.addEventListener('click', function () { estado.aba = 'pedidos'; desenharLista(); });
        voltar.addEventListener('click', fecharChat);
        excluirConversa.addEventListener('click', function () { apagarConversa(false); });

        campo.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter' && !evento.shiftKey) {
                evento.preventDefault();
                formulario.requestSubmit();
            }
        });
        campo.addEventListener('input', function () {
            campo.style.height = 'auto';
            campo.style.height = Math.min(campo.scrollHeight, 110) + 'px';
        });

        formulario.addEventListener('submit', function (evento) {
            evento.preventDefault();
            const texto = campo.value.trim();
            if (!texto || estado.aberta === null) return;
            enviar.disabled = true;
            erroEnvio.hidden = true;
            const id = estado.aberta;
            campo.value = '';
            campo.style.height = 'auto';
            api('/conversas/' + id + '/mensagens', 'POST', { texto: texto }).then(function (m) {
                aplicarDialogo({ ...estado.dialogo, mensagens: [m] }, false);
                rolarParaOFim();
                atualizarChat();
                carregarLista();
            }).catch(function (erro) {
                if (!campo.value) campo.value = texto;
                erroEnvio.textContent = erro.erro || 'Não foi possível enviar.';
                erroEnvio.hidden = false;
            }).finally(function () { enviar.disabled = false; campo.focus(); });
        });

        function iniciarLista() {
            carregarLista();
            window.clearInterval(estado.timerLista);
            estado.timerLista = window.setInterval(function () {
                if (app.offsetParent !== null) carregarLista();
            }, INTERVALO_LISTA);
        }

        return { abrir: abrir, iniciarLista: iniciarLista, recarregar: carregarLista, estado: estado, app: app, fecharChat: fecharChat };
    }

    // ---------- página completa ----------
    const pagina = document.getElementById('msg-pagina');
    if (pagina) {
        const interface_ = montar(pagina, 'pagina');
        interface_.iniciarLista();
        const com = Number(new URLSearchParams(window.location.search).get('com'));
        if (com > 0) interface_.abrir(com);
    }

    // ---------- botão flutuante na home ----------
    const dock = document.getElementById('msg-dock');
    if (dock) {
        const alternar = criar('button', 'msg-dock-toggle');
        alternar.type = 'button';
        alternar.title = 'Mensagens';
        alternar.setAttribute('aria-label', 'Mensagens');
        alternar.setAttribute('aria-expanded', 'false');
        alternar.setAttribute('aria-controls', 'msg-dock-corpo');
        alternar.innerHTML = '<i class="fa-solid fa-comments" aria-hidden="true"></i>';
        const seloDock = criar('span', 'msg-dock-badge');
        seloDock.hidden = true;
        alternar.appendChild(seloDock);

        const corpo = criar('div', 'msg-dock-corpo');
        corpo.id = 'msg-dock-corpo';
        corpo.hidden = true;
        const topo = criar('div', 'msg-dock-head');
        topo.appendChild(criar('strong', '', 'Mensagens'));
        const abrirPagina = criar('a', 'msg-icon msg-dock-expandir');
        abrirPagina.href = '/mensagens';
        abrirPagina.title = 'Abrir em tela cheia';
        abrirPagina.setAttribute('aria-label', 'Abrir mensagens em tela cheia');
        abrirPagina.innerHTML = '<i class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i>';
        const fechar = criar('button', 'msg-icon');
        fechar.type = 'button';
        fechar.title = 'Fechar';
        fechar.setAttribute('aria-label', 'Fechar mensagens');
        fechar.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        topo.append(abrirPagina, fechar);
        corpo.appendChild(topo);
        dock.append(corpo, alternar);

        const interface_ = montar(corpo, 'dock');
        ouvintesDoTotal.push(function (dados) { mostrarSelo(seloDock, dados.mensagens || 0); });

        let iniciou = false;
        function definir(abrir) {
            corpo.hidden = !abrir;
            dock.classList.toggle('is-open', abrir);
            document.body.classList.toggle('msg-dock-aberto', abrir);
            alternar.setAttribute('aria-expanded', String(abrir));
            if (abrir && !iniciou) { iniciou = true; interface_.iniciarLista(); } else if (abrir) interface_.recarregar();
        }
        alternar.addEventListener('click', function () { definir(corpo.hidden); });
        fechar.addEventListener('click', function () { definir(false); alternar.focus(); });
    }
})();
