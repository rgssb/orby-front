// Mensagens diretas: bloco na home (dock) e página completa (usa mensagens-base.js)
(function () {
    const { INTERVALO_LISTA, INTERVALO_CHAT, EMOJIS, LIMITE_IMAGEM, criar, api, hora, avatar, mostrarSelo, buscarTotal, ouvintesDeEvento, ouvintesDoTotal } = window.OrbyMensagens;

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
        const contagemGrupos = criar('span', 'msg-count');
        contagemGrupos.hidden = true;
        const abaGrupos = criar('button', 'msg-tab');
        abaGrupos.type = 'button';
        abaGrupos.append(criar('span', '', 'Grupos'), contagemGrupos);
        abas.append(abaConversas, abaPedidos, abaGrupos);
        let grupos = null;
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
        const silenciar = criar('button', 'msg-icon msg-silenciar');
        silenciar.type = 'button';
        cabecalho.append(voltar, quem, silenciar, excluirConversa);
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
        const clipe = criar('button', 'msg-icon msg-clipe');
        clipe.type = 'button';
        clipe.title = 'Enviar imagem';
        clipe.setAttribute('aria-label', 'Enviar imagem');
        clipe.innerHTML = '<i class="fa-regular fa-image" aria-hidden="true"></i>';
        const arquivo = document.createElement('input');
        arquivo.type = 'file';
        arquivo.accept = 'image/jpeg,image/png,image/webp,image/gif';
        arquivo.hidden = true;
        formulario.append(clipe, campo, enviar, arquivo);
        const barraResposta = criar('div', 'msg-barra msg-resposta');
        barraResposta.hidden = true;
        const barraAnexo = criar('div', 'msg-barra msg-anexo');
        barraAnexo.hidden = true;
        const digitando = criar('p', 'msg-digitando', 'digitando…');
        digitando.hidden = true;
        const nenhuma = criar('p', 'msg-nenhuma', 'Escolha uma conversa para começar.');
        colChat.append(cabecalho, aviso, fluxo, digitando, erroEnvio, barraResposta, barraAnexo, formulario, nenhuma);

        app.append(colLista, colChat);
        raiz.appendChild(app);
        if (window.OrbyGrupos) {
            grupos = window.OrbyGrupos.montar(colLista, colChat, app, function (total) { mostrarSelo(contagemGrupos, total); });
        }

        const estado = { aba: 'conversas', conversas: [], aberta: null, ultimoId: 0, dialogo: null, timerChat: null, timerLista: null, respondendo: null, imagem: null, temMais: false, ultimoAviso: 0, timerDigitando: null };

        function definirView(view) {
            app.dataset.view = view;
            if (aoMudar) aoMudar(estado);
        }

        function desenharLista() {
            const emGrupos = estado.aba === 'grupos';
            app.classList.toggle('is-grupos', emGrupos);
            abaGrupos.classList.toggle('is-active', emGrupos);
            const pedidos = estado.conversas.filter(function (c) { return c.solicitacao || c.desculpa; });
            const normais = estado.conversas.filter(function (c) { return !(c.solicitacao || c.desculpa); });
            const novosPedidos = pedidos.filter(function (c) { return c.naoLidas > 0; }).length;
            mostrarSelo(contagemPedidos, novosPedidos);
            abaConversas.classList.toggle('is-active', estado.aba === 'conversas');
            abaPedidos.classList.toggle('is-active', estado.aba === 'pedidos');
            if (emGrupos) return;

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
                if (c.silenciada) topo.append(criar('i', 'fa-solid fa-bell-slash msg-item-mudo'));
                corpo.append(topo, criar('span', 'msg-item-previa', c.desculpa ? 'Pedido de desculpas · ' + previa : (c.aguardando ? 'Aguardando resposta · ' + previa : previa)));
                botao.append(avatar(c.usuarioId, c.fotoVersao, 'msg-avatar'), corpo);
                if (c.naoLidas > 0) botao.append(criar('span', 'msg-ponto' + (c.silenciada ? ' is-muted' : ''), String(c.naoLidas > 99 ? '99+' : c.naoLidas)));
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

        function assinatura(m) {
            return JSON.stringify([m.lida, m.temImagem, m.reacoes]);
        }

        function nomeDe(minha) {
            return minha ? 'Você' : (estado.dialogo ? estado.dialogo.nome : '');
        }

        function criarBolha(m) {
            const bolha = criar('div', 'msg-bolha ' + (m.minha ? 'msg-bolha--minha' : 'msg-bolha--outra'));
            bolha.dataset.id = m.id;
            bolha.dataset.lida = m.lida ? '1' : '0';
            bolha.dataset.assinatura = assinatura(m);

            if (m.respondeA) {
                const citacao = criar('button', 'msg-citacao');
                citacao.type = 'button';
                citacao.append(criar('strong', '', nomeDe(m.respondeA.minha)), criar('span', '', m.respondeA.texto || '📷 Imagem'));
                citacao.addEventListener('click', function () {
                    const alvo = fluxo.querySelector('[data-id="' + m.respondeA.id + '"]');
                    if (!alvo) return;
                    alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    alvo.classList.add('msg-destaque');
                    window.setTimeout(function () { alvo.classList.remove('msg-destaque'); }, 1400);
                });
                bolha.appendChild(citacao);
            }
            if (m.temImagem) {
                const link = criar('a', 'msg-imagem-link');
                link.href = '/mensagens/' + m.id + '/imagem';
                link.target = '_blank';
                link.rel = 'noopener';
                const img = document.createElement('img');
                img.className = 'msg-imagem';
                img.alt = 'Imagem enviada';
                img.loading = 'lazy';
                img.src = '/mensagens/' + m.id + '/imagem';
                img.addEventListener('load', function () { if (estado.noFim) rolarParaOFim(); });
                link.appendChild(img);
                bolha.appendChild(link);
            }
            if (m.texto) bolha.appendChild(criar('p', 'msg-texto', m.texto));

            if (m.reacoes && m.reacoes.length) {
                const grupo = criar('div', 'msg-reacoes');
                m.reacoes.forEach(function (r) {
                    const chip = criar('button', 'msg-reacao' + (r.minha ? ' is-mine' : ''), r.emoji + (r.total > 1 ? ' ' + r.total : ''));
                    chip.type = 'button';
                    chip.title = r.minha ? 'Remover sua reação' : 'Reagir';
                    chip.addEventListener('click', function () { reagir(m.id, r.emoji); });
                    grupo.appendChild(chip);
                });
                bolha.appendChild(grupo);
            }

            const rodape = criar('span', 'msg-bolha-hora');
            rodape.appendChild(criar('time', '', hora(m.criadoEm)));
            const acoes = criar('span', 'msg-acoes');
            acoes.append(
                botaoAcao('fa-reply', 'Responder', function () { responderA(m); }),
                botaoAcao('fa-face-smile', 'Reagir', function () { abrirSeletor(bolha, m); })
            );
            if (m.minha) {
                acoes.appendChild(botaoAcao('fa-trash', 'Apagar mensagem', function () {
                    confirmar('Apagar esta mensagem?', 'Ela some para as duas pessoas.').then(function (ok) {
                        if (!ok) return;
                        api('/mensagens/' + m.id, 'DELETE').then(function () {
                            bolha.remove();
                            atualizarVisto();
                            carregarLista();
                        }).catch(function (erro) { if (erro.erro) alertar(erro.erro); });
                    });
                }));
            }
            rodape.appendChild(acoes);
            bolha.appendChild(rodape);
            return bolha;
        }

        function botaoAcao(icone, titulo, aoClicar) {
            const botao = criar('button', 'msg-apagar');
            botao.type = 'button';
            botao.title = titulo;
            botao.setAttribute('aria-label', titulo);
            botao.innerHTML = '<i class="fa-solid ' + icone + '" aria-hidden="true"></i>';
            botao.addEventListener('click', aoClicar);
            return botao;
        }

        function abrirSeletor(bolha, m) {
            const aberto = bolha.querySelector('.msg-seletor');
            fluxo.querySelectorAll('.msg-seletor').forEach(function (el) { el.remove(); });
            if (aberto) return;
            const seletor = criar('div', 'msg-seletor');
            EMOJIS.forEach(function (emoji) {
                const botao = criar('button', '', emoji);
                botao.type = 'button';
                botao.addEventListener('click', function () { seletor.remove(); reagir(m.id, emoji); });
                seletor.appendChild(botao);
            });
            bolha.appendChild(seletor);
        }

        function reagir(id, emoji) {
            api('/mensagens/' + id + '/reacao', 'POST', { emoji: emoji }).then(atualizarChat)
                .catch(function (erro) { if (erro.erro) alertar(erro.erro); });
        }

        function responderA(m) {
            estado.respondendo = { id: m.id, texto: m.texto || '📷 Imagem', minha: m.minha };
            barraResposta.textContent = '';
            const texto = criar('span', 'msg-barra-texto');
            texto.append(criar('strong', '', 'Respondendo a ' + nomeDe(m.minha)), criar('span', '', estado.respondendo.texto));
            barraResposta.append(texto, botaoFechar('Cancelar resposta', function () { limparResposta(); }));
            barraResposta.hidden = false;
            campo.focus({ preventScroll: true });
        }

        function limparResposta() {
            estado.respondendo = null;
            barraResposta.hidden = true;
        }

        function botaoFechar(titulo, aoClicar) {
            const botao = criar('button', 'msg-icon');
            botao.type = 'button';
            botao.title = titulo;
            botao.setAttribute('aria-label', titulo);
            botao.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
            botao.addEventListener('click', aoClicar);
            return botao;
        }

        function definirImagem(arq) {
            limparImagem();
            if (!arq) return;
            if (arq.size > LIMITE_IMAGEM) { alertar('A imagem deve ter no máximo 4 MB.'); return; }
            estado.imagem = arq;
            const mini = document.createElement('img');
            mini.alt = '';
            mini.src = URL.createObjectURL(arq);
            barraAnexo.textContent = '';
            barraAnexo.append(mini, criar('span', 'msg-barra-texto', arq.name), botaoFechar('Remover imagem', limparImagem));
            barraAnexo.hidden = false;
        }

        function limparImagem() {
            const mini = barraAnexo.querySelector('img');
            if (mini) URL.revokeObjectURL(mini.src);
            estado.imagem = null;
            arquivo.value = '';
            barraAnexo.hidden = true;
        }

        // "Visto" aparece só sob a minha última mensagem, quando a outra pessoa já leu
        function atualizarVisto() {
            fluxo.querySelectorAll('.msg-visto').forEach(function (el) { el.remove(); });
            const minhas = fluxo.querySelectorAll('.msg-bolha--minha');
            const ultima = minhas[minhas.length - 1];
            if (ultima && ultima.dataset.lida === '1') {
                ultima.querySelector('.msg-bolha-hora').appendChild(criar('span', 'msg-visto', 'Visto'));
            }
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

        // modo: 'completo' (troca tudo), 'janela' (reconcilia as últimas mensagens) ou 'incremental' (só acrescenta)
        function aplicarDialogo(d, modo) {
            estado.noFim = fluxo.scrollHeight - fluxo.scrollTop - fluxo.clientHeight < 80;
            const pertoDoFim = estado.noFim;
            estado.dialogo = d;
            let chegouDeFora = false;

            if (modo === 'completo') {
                fluxo.textContent = '';
                estado.ultimoId = 0;
                estado.temMais = d.temMais;
                if (d.temMais) fluxo.appendChild(botaoAnteriores());
            }

            if (modo === 'janela') {
                const ids = {};
                d.mensagens.forEach(function (m) { ids[m.id] = true; });
                const primeiro = d.mensagens.length ? d.mensagens[0].id : 0;
                fluxo.querySelectorAll('.msg-bolha').forEach(function (el) {
                    if (Number(el.dataset.id) >= primeiro && !ids[el.dataset.id]) el.remove();
                });
            }

            d.mensagens.forEach(function (m) {
                const existente = fluxo.querySelector('.msg-bolha[data-id="' + m.id + '"]');
                if (existente) {
                    if (existente.dataset.assinatura !== assinatura(m)) existente.replaceWith(criarBolha(m));
                    return;
                }
                fluxo.appendChild(criarBolha(m));
                if (!m.minha) chegouDeFora = true;
                if (m.id > estado.ultimoId) estado.ultimoId = m.id;
            });

            const inicio = fluxo.querySelector('.msg-inicio');
            if (!fluxo.querySelector('.msg-bolha')) {
                if (!inicio) fluxo.appendChild(criar('p', 'msg-inicio', 'Nenhuma mensagem ainda. Diga oi!'));
            } else if (inicio) inicio.remove();

            if (chegouDeFora) digitando.hidden = true;
            atualizarVisto();
            desenharSilencio();
            desenharAviso();
            if (modo === 'completo' || (chegouDeFora && pertoDoFim)) rolarParaOFim();
            return chegouDeFora;
        }

        function botaoAnteriores() {
            const botao = criar('button', 'btn btn-outline-secondary btn-sm msg-mais', 'Carregar mensagens anteriores');
            botao.type = 'button';
            botao.addEventListener('click', function () {
                const primeiro = fluxo.querySelector('.msg-bolha');
                if (!primeiro || estado.aberta === null) return;
                const id = estado.aberta;
                botao.disabled = true;
                api('/conversas/' + id + '/mensagens?antes=' + primeiro.dataset.id).then(function (d) {
                    if (estado.aberta !== id) return;
                    const altura = fluxo.scrollHeight;
                    d.mensagens.forEach(function (m) { fluxo.insertBefore(criarBolha(m), primeiro); });
                    if (d.temMais) botao.disabled = false; else botao.remove();
                    fluxo.scrollTop += fluxo.scrollHeight - altura;
                }).catch(function () { botao.disabled = false; });
            });
            return botao;
        }

        function desenharSilencio() {
            const mudo = !!(estado.dialogo && estado.dialogo.silenciada);
            silenciar.title = mudo ? 'Reativar notificações' : 'Silenciar conversa';
            silenciar.setAttribute('aria-label', silenciar.title);
            silenciar.classList.toggle('is-on', mudo);
            silenciar.innerHTML = '<i class="fa-solid ' + (mudo ? 'fa-bell-slash' : 'fa-bell') + '" aria-hidden="true"></i>';
        }

        function abrir(usuarioId) {
            estado.aberta = usuarioId;
            window.clearInterval(estado.timerChat);
            limparResposta();
            limparImagem();
            digitando.hidden = true;
            return api('/conversas/' + usuarioId + '/mensagens').then(function (d) {
                quem.textContent = d.nome;
                if (d.admin) quem.appendChild(criar('span', 'admin-badge', '🛡 Administrador'));
                quem.href = '/usuarios/' + d.usuarioId;
                quem.prepend(avatar(d.usuarioId, d.fotoVersao, 'msg-avatar'));
                abrirTela.href = '/mensagens?com=' + d.usuarioId;
                aplicarDialogo(d, 'completo');
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
            if (document.hidden || estado.aberta === null) return Promise.resolve();
            const id = estado.aberta;
            return api('/conversas/' + id + '/mensagens').then(function (d) {
                if (estado.aberta !== id) return;
                if (aplicarDialogo(d, 'janela')) { carregarLista(); buscarTotal(); }
            }).catch(function () {});
        }

        ouvintesDeEvento.push(function (evento) {
            if (modo === 'dock' && app.offsetParent === null) return;
            if (evento.tipo === 'digitando') {
                if (evento.de !== estado.aberta) return;
                digitando.hidden = false;
                window.clearTimeout(estado.timerDigitando);
                estado.timerDigitando = window.setTimeout(function () { digitando.hidden = true; }, 4000);
                return;
            }
            carregarLista();
            if (estado.aberta !== null && (!evento.de || evento.de === estado.aberta)) atualizarChat();
        });

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

        function trocarAba(aba) {
            const saindoDosGrupos = estado.aba === 'grupos';
            estado.aba = aba;
            if (grupos) grupos.definirAtivo(aba === 'grupos');
            if (saindoDosGrupos) {
                app.classList.toggle('tem-chat', estado.aberta !== null);
                app.dataset.view = 'lista';
            }
            desenharLista();
        }
        abaConversas.addEventListener('click', function () { trocarAba('conversas'); });
        abaPedidos.addEventListener('click', function () { trocarAba('pedidos'); });
        if (grupos) abaGrupos.addEventListener('click', function () { trocarAba('grupos'); });
        voltar.addEventListener('click', fecharChat);
        silenciar.addEventListener('click', function () {
            const d = estado.dialogo;
            if (!d) return;
            const mudo = !d.silenciada;
            api('/conversas/' + d.usuarioId + '/silenciar', mudo ? 'POST' : 'DELETE').then(function () {
                d.silenciada = mudo;
                desenharSilencio();
                carregarLista();
                buscarTotal();
            }).catch(function (erro) { if (erro.erro) alertar(erro.erro); });
        });
        clipe.addEventListener('click', function () { arquivo.click(); });
        arquivo.addEventListener('change', function () { definirImagem(arquivo.files[0]); });
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
            const agora = Date.now();
            if (campo.value && estado.aberta !== null && agora - estado.ultimoAviso > 2500) {
                estado.ultimoAviso = agora;
                api('/conversas/' + estado.aberta + '/digitando', 'POST').catch(function () {});
            }
        });

        formulario.addEventListener('submit', function (evento) {
            evento.preventDefault();
            const texto = campo.value.trim();
            const imagem = estado.imagem;
            if ((!texto && !imagem) || estado.aberta === null) return;
            enviar.disabled = true;
            erroEnvio.hidden = true;
            const id = estado.aberta;
            const corpo = { texto: texto, respondeA: estado.respondendo ? estado.respondendo.id : 0, comImagem: !!imagem };
            campo.value = '';
            campo.style.height = 'auto';
            api('/conversas/' + id + '/mensagens', 'POST', corpo).then(function (m) {
                if (!imagem) return m;
                return fetch('/mensagens/' + m.id + '/imagem', {
                    method: 'POST', credentials: 'same-origin', body: imagem,
                    headers: { 'Content-Type': imagem.type, 'X-Requested-With': 'XMLHttpRequest' }
                }).then(function (resposta) {
                    if (resposta.ok) return m;
                    return resposta.json().catch(function () { return {}; }).then(function (dados) {
                        return api('/mensagens/' + m.id, 'DELETE').catch(function () {}).then(function () {
                            throw { erro: dados.erro || 'Não foi possível enviar a imagem.' };
                        });
                    });
                });
            }).then(function (m) {
                limparResposta();
                limparImagem();
                aplicarDialogo({ ...estado.dialogo, mensagens: [m] }, 'incremental');
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

        return { abrir: abrir, iniciarLista: iniciarLista, recarregar: carregarLista, irParaGrupos: function () { if (grupos) trocarAba('grupos'); }, estado: estado, app: app, fecharChat: fecharChat };
    }

    // ---------- página completa ----------
    const pagina = document.getElementById('msg-pagina');
    if (pagina) {
        const interface_ = montar(pagina, 'pagina');
        interface_.iniciarLista();
        const com = Number(new URLSearchParams(window.location.search).get('com'));
        if (com > 0) interface_.abrir(com);
        if (new URLSearchParams(window.location.search).get('aba') === 'grupos') interface_.irParaGrupos();
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
        ouvintesDoTotal.push(function (dados) { mostrarSelo(seloDock, (dados.mensagens || 0) + (dados.grupos || 0)); });

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
