const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/notificacoes.js'), 'utf8');

test('o contador tenta novamente após falha e ao retornar para a página', () => {
    let tentativas = 0;
    let intervalo;
    let resposta;
    const eventos = {};
    const botao = { addEventListener() {}, setAttribute() {} };
    const painel = { hidden: true };
    const selo = { hidden: true, textContent: '' };
    const document = {
        hidden: false,
        getElementById(id) {
            return { 'notif-toggle': botao, 'notif-painel': painel, 'notif-badge': selo }[id] || {};
        },
        addEventListener(tipo, funcao) { eventos[tipo] = funcao; }
    };
    const $ = {
        get() {
            tentativas++;
            return {
                done(funcao) { if (resposta) funcao(resposta); return this; },
                fail(funcao) { if (!resposta) funcao(); return this; }
            };
        }
    };
    vm.runInNewContext(codigo, {
        document, $, console: { error() {} },
        window: { setInterval(funcao) { intervalo = funcao; } }
    });

    assert.equal(tentativas, 1);
    resposta = { total: 3 };
    intervalo();
    assert.equal(tentativas, 2);
    assert.equal(selo.textContent, '3');
    assert.equal(selo.hidden, false);

    document.hidden = true;
    intervalo();
    assert.equal(tentativas, 2);
    document.hidden = false;
    eventos.visibilitychange();
    assert.equal(tentativas, 3);
});
