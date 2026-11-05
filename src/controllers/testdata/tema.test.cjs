const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/tema.js'), 'utf8');

function carregar(storage) {
    const eventos = {};
    const atributos = {};
    const opcoes = [];
    const document = {
        documentElement: {
            setAttribute(nome, valor) { atributos[nome] = valor; },
            getAttribute(nome) { return atributos[nome]; }
        },
        body: { appendChild(elemento) { document.seletor = elemento; } },
        addEventListener(tipo, funcao) { eventos[tipo] = funcao; },
        querySelector() { return null; },
        createElement(tag) {
            const elemento = {
                tag, dataset: {}, atributos: {}, eventos: {},
                classList: { add() {} },
                setAttribute(nome, valor) { this.atributos[nome] = valor; },
                addEventListener(tipo, funcao) { this.eventos[tipo] = funcao; },
                focus() { document.activeElement = this; }
            };
            if (tag === 'div') {
                const botao = document.createElement('button');
                const menu = document.createElement('menu');
                menu.hidden = true;
                menu.appendChild = opcao => opcoes.push(opcao);
                menu.querySelectorAll = () => opcoes;
                menu.querySelector = () => opcoes.find(opcao => opcao.atributos['aria-checked'] === 'true');
                elemento.querySelector = seletor => seletor === '.tema-toggle' ? botao : menu;
                elemento.botao = botao;
                elemento.menu = menu;
            }
            return elemento;
        }
    };
    vm.runInNewContext(codigo, { document, localStorage: storage });
    eventos.DOMContentLoaded();
    return { document, opcoes, ...document.seletor };
}

test('tema Nerd pode ser selecionado e permanece após recarregar', () => {
    const valores = new Map();
    const storage = {
        getItem(chave) { return valores.get(chave) || null; },
        setItem(chave, valor) { valores.set(chave, valor); }
    };
    const pagina = carregar(storage);
    const nerd = pagina.opcoes.find(opcao => opcao.dataset.tema === 'nerd');
    assert.ok(nerd);
    assert.match(nerd.innerHTML, /tema-amostra--nerd.*Nerd/);

    pagina.botao.eventos.click();
    let impediuPadrao = false;
    pagina.menu.eventos.keydown({ key: 'End', preventDefault() { impediuPadrao = true; } });
    assert.equal(impediuPadrao, true);
    assert.equal(pagina.document.activeElement, nerd);
    pagina.menu.eventos.click({ target: { closest() { return nerd; } } });

    assert.equal(pagina.document.documentElement.getAttribute('data-theme'), 'nerd');
    assert.equal(nerd.atributos['aria-checked'], 'true');
    assert.equal(pagina.menu.hidden, true);
    assert.equal(pagina.document.activeElement, pagina.botao);
    assert.equal(valores.get('orby-tema'), 'nerd');

    const recarregada = carregar(storage);
    assert.equal(recarregada.document.documentElement.getAttribute('data-theme'), 'nerd');
    recarregada.botao.eventos.click();
    assert.equal(recarregada.document.activeElement.dataset.tema, 'nerd');
});
