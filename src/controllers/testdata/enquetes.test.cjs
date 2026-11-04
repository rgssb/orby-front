const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/enquetes.js'), 'utf8');

function criarPrazo(instante, encerrada = false) {
    const unidades = Object.fromEntries(['dias', 'horas', 'minutos', 'segundos'].map((nome) => [nome, { textContent: '' }]));
    const relogio = { setAttribute(nome, valor) { this[nome] = valor; } };
    const data = { textContent: '', getAttribute() { return instante; } };
    const contagem = { hidden: true };
    const aviso = { hidden: true };
    const elemento = {
        dataset: { encerrada: String(encerrada) },
        isConnected: true,
        querySelector(seletor) {
            if (seletor.startsWith('[data-unidade=')) return unidades[seletor.split('"')[1]];
            return {
                'time[data-enquete-prazo]': data,
                '.enquete-relogio': relogio,
                '.enquete-prazo-contagem': contagem,
                '.enquete-prazo-expirou': aviso
            }[seletor];
        }
    };
    return { elemento, unidades, relogio, data, contagem, aviso };
}

function ambiente(elementos, inicio) {
    let agora = inicio;
    let callback = null;
    let intervalos = 0;
    class Data extends Date {
        static now() { return agora; }
    }
    const window = {};
    vm.runInNewContext(codigo, {
        window, Date: Data, console, Map,
        document: { querySelectorAll: () => elementos.filter((item) => !item.dataset.relogioIniciado) },
        setInterval(fn) { callback = fn; intervalos++; return intervalos; },
        clearInterval() { callback = null; }
    });
    return {
        window,
        avancar(ms) { agora += ms; if (callback) callback(); },
        get ativo() { return callback !== null; },
        get intervalos() { return intervalos; }
    };
}

test('contagem diminui até zero, mostra data local e para no encerramento', () => {
    const inicio = Date.parse('2026-01-02T10:00:00Z');
    const prazo = criarPrazo('2026-01-03T11:01:02Z');
    const ctx = ambiente([prazo.elemento], inicio);
    assert.equal(prazo.contagem.hidden, false);
    assert.deepEqual(Object.values(prazo.unidades).map((u) => u.textContent), ['01', '01', '01', '02']);
    assert.notEqual(prazo.data.textContent, '');
    ctx.avancar(1000);
    assert.equal(prazo.unidades.segundos.textContent, '01');
    ctx.avancar(90061000);
    assert.deepEqual(Object.values(prazo.unidades).map((u) => u.textContent), ['00', '00', '00', '00']);
    assert.equal(prazo.aviso.hidden, false);
    assert.equal(ctx.ativo, false);
});

test('itens carregados depois iniciam e enquetes já encerradas ficam zeradas', () => {
    const inicio = Date.parse('2026-01-02T10:00:00Z');
    const elementos = [];
    const ctx = ambiente(elementos, inicio);
    const nova = criarPrazo('2026-01-02T10:00:03Z');
    const fechada = criarPrazo('2026-01-03T10:00:00Z', true);
    elementos.push(nova.elemento, fechada.elemento);
    ctx.window.OrbyEnquetes.iniciar();
    assert.equal(nova.unidades.segundos.textContent, '03');
    assert.equal(fechada.unidades.dias.textContent, '00');
    assert.equal(fechada.aviso.hidden, true);
    ctx.window.OrbyEnquetes.iniciar();
    assert.equal(ctx.intervalos, 1);
    ctx.avancar(3000);
    assert.equal(nova.unidades.segundos.textContent, '00');
    assert.equal(ctx.ativo, false);
});
