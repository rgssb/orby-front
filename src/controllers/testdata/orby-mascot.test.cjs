const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/orby-mascot.js'), 'utf8');

test('o mascote volta a aparecer ao retornar a uma página restaurada', () => {
    const classes = new Set();
    const eventosJanela = {};
    let clicarLink;
    const link = { href: '/privacidade', addEventListener(tipo, funcao) { clicarLink = funcao; } };
    const form = {
        querySelectorAll(seletor) { return seletor === 'a[href]' ? [link] : []; },
        addEventListener() {},
        contains() { return false; }
    };
    const mascot = {
        classList: {
            add(classe) { classes.add(classe); },
            remove(classe) { classes.delete(classe); },
            contains(classe) { return classes.has(classe); }
        },
        closest() { return form; },
        querySelectorAll() { return []; },
        querySelector() { return {}; },
        getAttribute() { return 'default'; },
        setAttribute() {},
        contains() { return false; }
    };
    const document = {
        querySelectorAll() { return [mascot]; },
        addEventListener() {}
    };
    const window = {
        matchMedia() { return { matches: true }; },
        addEventListener(tipo, funcao) { eventosJanela[tipo] = funcao; },
        location: { assign() {} }
    };
    vm.runInNewContext(codigo, {
        document, window, Date, Math, setTimeout() {}, setInterval() {}, clearTimeout() {}
    });

    let impediuNavegacao = false;
    clicarLink({ button: 0, preventDefault() { impediuNavegacao = true; } });
    assert.equal(impediuNavegacao, true);
    assert.equal(classes.has('is-leaving'), true);

    eventosJanela.pageshow({ persisted: true });
    assert.equal(classes.has('is-leaving'), false);
});
