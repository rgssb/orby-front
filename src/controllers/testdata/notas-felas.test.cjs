const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/notas-felas.js'), 'utf8');

function iniciar(paginas, modeloAntigo = false) {
    function no(markup = '') {
        return { markup, children: [], events: {}, attrs: {}, hidden: false, textContent: '',
            addEventListener(tipo, fn) { this.events[tipo] = fn; } };
    }
    const ids = {};
    for (const id of ['notas-felas', 'notas-status', 'notas-configuracao', 'notas-ativas', 'notas-form',
        'notas-texto', 'notas-lista', 'notas-lista-esquerda', 'notas-lateral', 'notas-mais']) ids[id] = no();
    ids['notas-felas'].dataset = { perfil: '1', proprio: 'true' };
    ids['notas-texto'].value = '';
    ids['notas-form'].querySelector = () => no();
    const requisicoes = [];
    function envolver(elemento) {
        return {
            no: elemento,
            attr(chave, valor) { elemento.attrs[chave] = valor; return this; },
            text(valor) { elemento.textContent = valor; return this; },
            append(...filhos) {
                for (const filho of filhos) {
                    filho.no.parent = elemento;
                    elemento.children.push(filho.no);
                }
                return this;
            },
            empty() { elemento.children = []; return this; },
            on(tipo, fn) { elemento.events[tipo] = fn; return this; },
            prop(chave, valor) { elemento[chave] = valor; return this; },
            remove() {
                elemento.parent.children = elemento.parent.children.filter(item => item !== elemento);
                return this;
            }
        };
    }
    function $(valor) { return envolver(typeof valor === 'string' ? no(valor) : valor); }
    function sucesso(valor) {
        return {
            done(fn) { fn(valor); return this; },
            fail() { return this; },
            always(fn) { fn(); return this; }
        };
    }
    $.get = url => { requisicoes.push({ url }); return sucesso(paginas.shift()); };
    $.ajax = opcoes => { requisicoes.push(opcoes); return sucesso(); };
    vm.runInNewContext(codigo, { document: { getElementById: id =>
        modeloAntigo && (id === 'notas-lista-esquerda' || id === 'notas-lateral') ? null : ids[id] }, $ });
    return { ids, requisicoes };
}

function nota(id) {
    return { id, autorId: id, nome: '<Pessoa>', nick: 'pessoa', fotoVersao: 0, conteudo: '<elogio>', podeExcluir: true };
}

test('distribui notas e mantém a alternância ao carregar mais', () => {
    const tela = iniciar([
        { ativas: true, podeEscrever: false, notas: [nota(1), nota(2), nota(3)], proxima: 3 },
        { ativas: true, podeEscrever: false, notas: [nota(4), nota(5)], proxima: 0 }
    ]);
    const direita = tela.ids['notas-lista'];
    const esquerda = tela.ids['notas-lista-esquerda'];
    assert.equal(direita.children.length, 2);
    assert.equal(esquerda.children.length, 1);
    assert.equal(tela.ids['notas-lateral'].hidden, false);
    assert.equal(direita.children[0].children[1].textContent, '<elogio>');
    tela.ids['notas-mais'].events.click();
    assert.equal(tela.requisicoes[1].url, '/usuarios/1/notas-felas?antes=3');
    assert.equal(direita.children.length, 3);
    assert.equal(esquerda.children.length, 2);
    assert.equal(tela.ids['notas-mais'].hidden, true);
});

test('excluir a última nota de cada lado atualiza estados vazios', () => {
    const tela = iniciar([{ ativas: true, podeEscrever: false, notas: [nota(1), nota(2)], proxima: 0 }]);
    const direita = tela.ids['notas-lista'];
    const esquerda = tela.ids['notas-lista-esquerda'];
    direita.children[0].children[0].children[1].events.click();
    assert.equal(tela.ids['notas-status'].textContent, '');
    esquerda.children[0].children[0].children[1].events.click();
    assert.equal(tela.ids['notas-lateral'].hidden, true);
    assert.match(tela.ids['notas-status'].textContent, /Ainda não há notas/);
});

test('desativar limpa as duas laterais sem perder a configuração', () => {
    const tela = iniciar([
        { ativas: true, podeEscrever: false, notas: [nota(1), nota(2)], proxima: 0 },
        { ativas: false, podeEscrever: false, notas: [], proxima: 0 }
    ]);
    tela.ids['notas-ativas'].checked = false;
    tela.ids['notas-ativas'].events.change();
    assert.equal(tela.ids['notas-lista'].children.length, 0);
    assert.equal(tela.ids['notas-lista-esquerda'].children.length, 0);
    assert.equal(tela.ids['notas-lateral'].hidden, true);
    assert.match(tela.ids['notas-status'].textContent, /ocultas/);
});

test('mantém a lista funcional enquanto o servidor ainda usa o template anterior', () => {
    const tela = iniciar([{ ativas: true, podeEscrever: false, notas: [nota(1), nota(2)], proxima: 0 }], true);
    assert.equal(tela.ids['notas-lista'].children.length, 2);
    tela.ids['notas-lista'].children[0].children[0].children[1].events.click();
    assert.equal(tela.ids['notas-lista'].children.length, 1);
});
