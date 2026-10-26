// Recorte de imagens: o usuário arrasta e dá zoom na imagem, vê exatamente como vai ficar e só então salva
(function () {
    const MAXIMO_DO_ZOOM = 4;

    // abrir(arquivo, { proporcao, saidaLargura, titulo, redondo }) devolve uma Promise com o Blob (JPEG) recortado;
    // a Promise é rejeitada com null quando a pessoa cancela
    function abrir(arquivo, opcoes) {
        return new Promise(function (resolve, reject) {
            const url = URL.createObjectURL(arquivo);
            const img = new Image();
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
            img.onload = function () { montar(img, url, opcoes, resolve, reject); };
            img.src = url;
        });
    }

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto) el.textContent = texto;
        return el;
    }

    function montar(img, url, opcoes, resolve, reject) {
        const proporcao = opcoes.proporcao || 1;
        const saidaLargura = opcoes.saidaLargura || 512;
        const saidaAltura = Math.round(saidaLargura / proporcao);
        const anteriorFoco = document.activeElement;

        const fundo = criar('div', 'crop-backdrop');
        const caixa = criar('div', 'crop-dialog');
        caixa.setAttribute('role', 'dialog');
        caixa.setAttribute('aria-modal', 'true');
        caixa.setAttribute('aria-label', opcoes.titulo || 'Ajustar imagem');

        const titulo = criar('h2', 'crop-title', opcoes.titulo || 'Ajustar imagem');
        const palco = criar('div', 'crop-stage' + (opcoes.redondo ? ' crop-stage--round' : ''));
        palco.style.aspectRatio = String(proporcao);
        palco.style.maxWidth = proporcao >= 1 ? '100%' : 'min(100%, ' + Math.round(360 * proporcao) + 'px)';
        const imagem = criar('img', 'crop-image');
        imagem.alt = '';
        imagem.draggable = false;
        imagem.src = url;
        palco.appendChild(imagem);

        const dica = criar('p', 'crop-hint', 'Arraste a imagem para posicionar e use o zoom para ajustar.');
        const linhaZoom = criar('label', 'crop-zoom');
        linhaZoom.appendChild(criar('span', '', 'Zoom'));
        const zoom = criar('input');
        zoom.type = 'range';
        zoom.min = '1';
        zoom.max = String(MAXIMO_DO_ZOOM);
        zoom.step = '0.01';
        zoom.value = '1';
        linhaZoom.appendChild(zoom);

        const acoes = criar('div', 'crop-actions');
        const cancelar = criar('button', 'btn btn-outline-secondary', 'Cancelar');
        cancelar.type = 'button';
        const salvar = criar('button', 'btn btn-primary', 'Salvar');
        salvar.type = 'button';
        acoes.append(cancelar, salvar);

        caixa.append(titulo, palco, dica, linhaZoom, acoes);
        fundo.appendChild(caixa);
        document.body.appendChild(fundo);
        document.body.classList.add('crop-aberto');

        let L = 0;
        let A = 0;
        let escalaBase = 1;
        let escala = 1;
        let x = 0;
        let y = 0;

        function limitar() {
            x = Math.min(0, Math.max(L - img.naturalWidth * escala, x));
            y = Math.min(0, Math.max(A - img.naturalHeight * escala, y));
        }

        function desenhar() {
            limitar();
            imagem.style.width = img.naturalWidth * escala + 'px';
            imagem.style.height = img.naturalHeight * escala + 'px';
            imagem.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        }

        function medir() {
            const retangulo = palco.getBoundingClientRect();
            const novoL = retangulo.width;
            const novoA = retangulo.height;
            if (!L) {
                L = novoL;
                A = novoA;
                escalaBase = Math.max(L / img.naturalWidth, A / img.naturalHeight);
                escala = escalaBase;
                x = (L - img.naturalWidth * escala) / 2;
                y = (A - img.naturalHeight * escala) / 2;
            } else {
                L = novoL;
                A = novoA;
            }
            desenhar();
        }

        // O zoom mantém o centro do recorte parado
        zoom.addEventListener('input', function () {
            const centroX = (L / 2 - x) / escala;
            const centroY = (A / 2 - y) / escala;
            escala = escalaBase * Number(zoom.value);
            x = L / 2 - centroX * escala;
            y = A / 2 - centroY * escala;
            desenhar();
        });

        let arrastando = null;
        palco.addEventListener('pointerdown', function (evento) {
            arrastando = { px: evento.clientX, py: evento.clientY, x: x, y: y };
            palco.setPointerCapture(evento.pointerId);
            palco.classList.add('is-dragging');
        });
        palco.addEventListener('pointermove', function (evento) {
            if (!arrastando) return;
            x = arrastando.x + evento.clientX - arrastando.px;
            y = arrastando.y + evento.clientY - arrastando.py;
            desenhar();
        });
        function soltar() {
            arrastando = null;
            palco.classList.remove('is-dragging');
        }
        palco.addEventListener('pointerup', soltar);
        palco.addEventListener('pointercancel', soltar);

        palco.addEventListener('wheel', function (evento) {
            evento.preventDefault();
            zoom.value = String(Math.min(MAXIMO_DO_ZOOM, Math.max(1, Number(zoom.value) - evento.deltaY * 0.002)));
            zoom.dispatchEvent(new Event('input'));
        }, { passive: false });

        function fechar() {
            window.removeEventListener('keydown', teclado, true);
            window.removeEventListener('resize', medir);
            fundo.remove();
            document.body.classList.remove('crop-aberto');
            URL.revokeObjectURL(url);
            if (anteriorFoco && anteriorFoco.focus) anteriorFoco.focus();
        }

        function teclado(evento) {
            if (evento.key === 'Escape') {
                evento.stopPropagation();
                fechar();
                reject(null);
            }
        }

        cancelar.addEventListener('click', function () { fechar(); reject(null); });
        fundo.addEventListener('mousedown', function (evento) {
            if (evento.target === fundo) { fechar(); reject(null); }
        });

        salvar.addEventListener('click', function () {
            const canvas = document.createElement('canvas');
            canvas.width = saidaLargura;
            canvas.height = saidaAltura;
            const contexto = canvas.getContext('2d');
            const k = saidaLargura / L;
            contexto.fillStyle = '#000';
            contexto.fillRect(0, 0, canvas.width, canvas.height);
            contexto.drawImage(img, x * k, y * k, img.naturalWidth * escala * k, img.naturalHeight * escala * k);
            canvas.toBlob(function (blob) {
                fechar();
                blob ? resolve(blob) : reject(new Error('falha ao gerar a imagem'));
            }, 'image/jpeg', 0.88);
        });

        window.addEventListener('keydown', teclado, true);
        window.addEventListener('resize', medir);
        if (imagem.complete) medir(); else imagem.onload = medir;
        requestAnimationFrame(medir);
        salvar.focus();
    }

    window.OrbyRecorte = { abrir: abrir };
})();
