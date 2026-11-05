const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/orby-egg.js'), 'utf8');

function ambiente(reduzido = true) {
    let tempo = 0;
    const animacoes = [];
    const eventosDocumento = {};
    const eventosJanela = {};
    const document = { activeElement: null };
    function elemento(tagName) {
        const eventos = {};
        const classes = new Set();
        const atributos = {};
        return {
            tagName, children: [], hidden: false, inert: false, isConnected: true,
            classList: {
                add(classe) { classes.add(classe); },
                remove(classe) { classes.delete(classe); },
                contains(classe) { return classes.has(classe); }
            },
            setAttribute(nome, valor) { atributos[nome] = valor; },
            getAttribute(nome) { return atributos[nome]; },
            removeAttribute(nome) { delete atributos[nome]; },
            addEventListener(tipo, funcao) { eventos[tipo] = funcao; },
            click() { eventos.click({ detail: 1 }); },
            focus() { document.activeElement = this; },
            append(...filhos) { this.children.push(...filhos); filhos.forEach(filho => { filho.parent = this; }); },
            appendChild(filho) { this.append(filho); },
            remove() { this.parent.children = this.parent.children.filter(filho => filho !== this); },
            getBoundingClientRect() { return { left: 0, top: 0, width: 80, height: 80 }; },
            querySelectorAll() { return []; },
            animate() {
                let concluir;
                const animacao = {
                    finished: new Promise(resolve => { concluir = resolve; }),
                    concluir() { concluir(); },
                    reverse() { this.finished = Promise.resolve(); },
                    cancel() {}
                };
                animacoes.push(animacao);
                return animacao;
            }
        };
    }
    const svg = elemento('svg');
    svg.cloneNode = () => {
        const clone = elemento('svg');
        const gradient = elemento('radialGradient');
        const stops = [elemento('stop'), elemento('stop'), elemento('stop')];
        gradient.querySelectorAll = () => stops;
        clone.querySelector = () => gradient;
        return clone;
    };
    const mascot = elemento('DIV');
    mascot.querySelector = () => svg;
    const outroMascot = elemento('SPAN');
    outroMascot.querySelector = () => svg;
    const main = elemento('MAIN');
    const tema = elemento('DIV');
    tema.inert = true;
    tema.hidden = true;
    const propriedades = { overflow: 'auto' };
    document.body = elemento('BODY');
    document.body.style = {
        getPropertyValue(nome) { return propriedades[nome] || ''; },
        getPropertyPriority() { return ''; },
        setProperty(nome, valor) { propriedades[nome] = valor; },
        removeProperty(nome) { delete propriedades[nome]; }
    };
    document.body.append(main, tema);
    document.querySelector = () => mascot;
    document.querySelectorAll = () => [mascot, outroMascot];
    document.createElement = tag => elemento(tag.toUpperCase());
    document.createElementNS = (_, tag) => elemento(tag);
    document.addEventListener = (tipo, funcao) => { eventosDocumento[tipo] = funcao; };
    document.removeEventListener = tipo => { delete eventosDocumento[tipo]; };
    const window = {
        innerWidth: 320, innerHeight: 800,
        matchMedia: () => ({ matches: reduzido }),
        addEventListener(tipo, funcao) { eventosJanela[tipo] = funcao; },
        removeEventListener(tipo) { delete eventosJanela[tipo]; }
    };
    vm.runInNewContext(codigo, { document, window, Date: { now: () => tempo }, Promise });
    return { document, mascot, outroMascot, main, tema, propriedades, eventosDocumento, eventosJanela, animacoes, avancar(ms) { tempo += ms; } };
}

test('trinta cliques rápidos engolem e devolvem a página sem alterar estados existentes', async () => {
    const a = ambiente();
    for (let i = 0; i < 29; i++) a.mascot.click();
    assert.equal(a.document.body.children.length, 2);
    a.avancar(12001);
    a.mascot.click();
    assert.equal(a.document.body.children.length, 2);
    for (let i = 0; i < 29; i++) a.mascot.click();
    await Promise.resolve();
    const layer = a.document.body.children[2];
    assert.equal(a.main.hidden, true);
    assert.equal(a.main.inert, true);
    assert.equal(a.mascot.classList.contains('orby-egg-source'), true);
    layer.children[0].click();
    assert.equal(a.document.body.children.length, 2);
    assert.equal(a.main.hidden, false);
    assert.equal(a.main.inert, false);
    assert.equal(a.tema.hidden, true);
    assert.equal(a.tema.inert, true);
    assert.equal(a.propriedades.overflow, 'auto');
    assert.equal(a.mascot.classList.contains('orby-egg-source'), false);
});

test('Escape devolve a página mesmo durante a abertura', async () => {
    const a = ambiente();
    for (let i = 0; i < 30; i++) a.mascot.click();
    let prevenido = false;
    a.eventosDocumento.keydown({ key: 'Escape', preventDefault() { prevenido = true; } });
    await Promise.resolve();
    assert.equal(prevenido, true);
    assert.equal(a.document.body.children.length, 2);
    assert.equal(a.main.inert, false);
    assert.equal(a.main.hidden, false);
});

test('a sequência pode ser feita em um ritmo de três cliques por segundo', () => {
    const a = ambiente();
    for (let i = 0; i < 29; i++) {
        a.mascot.click();
        a.avancar(333);
    }
    assert.equal(a.document.body.children.length, 2);
    a.mascot.click();
    assert.equal(a.document.body.children.length, 3);
});

test('cada mascote conta os cliques separadamente e não abre efeitos simultâneos', async () => {
    const a = ambiente();
    for (let i = 0; i < 20; i++) a.mascot.click();
    for (let i = 0; i < 10; i++) a.outroMascot.click();
    assert.equal(a.document.body.children.length, 2);
    for (let i = 0; i < 10; i++) a.mascot.click();
    await Promise.resolve();
    assert.equal(a.document.body.children.length, 3);
    for (let i = 0; i < 30; i++) a.outroMascot.click();
    assert.equal(a.document.body.children.length, 3);
    a.document.body.children[2].children[0].click();
    for (let i = 0; i < 19; i++) a.outroMascot.click();
    assert.equal(a.document.body.children.length, 2);
    a.outroMascot.click();
    assert.equal(a.document.body.children.length, 3);
});

test('cliques durante a animação não devolvem a página automaticamente', async () => {
    const a = ambiente(false);
    for (let i = 0; i < 30; i++) a.mascot.click();
    const botao = a.document.body.children[2].children[0];
    assert.equal(botao.getAttribute('aria-disabled'), 'true');
    botao.click();
    a.animacoes.forEach(animacao => animacao.concluir());
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(a.document.body.children.length, 3);
    assert.equal(botao.getAttribute('aria-disabled'), 'false');
    botao.click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(a.document.body.children.length, 2);
    assert.equal(a.main.inert, false);
});
