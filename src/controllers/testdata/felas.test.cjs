const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../../../assets/js/felas.js'), 'utf8');

function iniciar(pessoas) {
    const lista = { filhos: [] };
    const status = { textContent: '' };
    const requisicoes = [];
    let falharRemocao = false;

    function elemento(markup) {
        return { markup, atributos: {}, filhos: [], eventos: {}, texto: '' };
    }
    function envolver(no) {
        return {
            attr(chave, valor) { no.atributos[chave] = valor; return this; },
            text(valor) { no.texto = valor; return this; },
            append(...filhos) { no.filhos.push(...filhos.map(filho => filho.no)); return this; },
            empty() { no.filhos = []; return this; },
            on(tipo, funcao) { no.eventos[tipo] = funcao; return this; },
            prop(chave, valor) { no[chave] = valor; return this; },
            no
        };
    }
    const document = {
        getElementById(id) { return { 'felas-lista': lista, 'felas-status': status }[id] || null; },
        addEventListener() {}
    };
    function $(valor) {
        if (valor === document) return { on() {} };
        return envolver(typeof valor === 'string' ? elemento(valor) : valor);
    }
    $.get = function () {
        return {
            done(funcao) { funcao(pessoas); return this; },
            fail() { return this; }
        };
    };
    $.ajax = function (opcoes) {
        requisicoes.push(opcoes);
        return {
            done(funcao) { if (!falharRemocao) funcao(); return this; },
            fail(funcao) { if (falharRemocao) funcao(); return this; }
        };
    };
    vm.runInNewContext(codigo, { document, $, console });
    return { lista, status, requisicoes, falharRemocao() { falharRemocao = true; } };
}

test('lista exibe foto, nome e usuário, com alternativa para quem não tem foto', () => {
    const tela = iniciar([
        { id: 7, nome: '<Nome>', nick: 'pessoa', fotoVersao: 12 },
        { id: 8, nome: 'Outra pessoa', nick: 'outra', fotoVersao: 0 }
    ]);
    const [primeira, segunda] = tela.lista.filhos;
    const [perfil, remover] = primeira.filhos;
    assert.equal(perfil.atributos.href, '/usuarios/7');
    assert.equal(perfil.filhos[0].filhos[0].atributos.src, '/usuarios/7/foto?v=12');
    assert.equal(perfil.filhos[1].filhos[0].texto, '<Nome>');
    assert.equal(perfil.filhos[1].filhos[1].texto, '@pessoa');
    assert.equal(remover.atributos['aria-label'], 'Remover <Nome> (@pessoa) dos Felas');
    assert.match(segunda.filhos[0].filhos[0].filhos[0].markup, /fa-user/);
    assert.equal(tela.status.textContent, '');
});

test('remoção preserva a atualização da lista e informa falhas', () => {
    const pessoas = [{ id: 7, nome: 'Pessoa', nick: 'pessoa', fotoVersao: 1 }];
    const tela = iniciar(pessoas);
    const botao = tela.lista.filhos[0].filhos[1];
    tela.falharRemocao();
    botao.eventos.click();
    assert.equal(tela.requisicoes[0].url, '/felas/7');
    assert.equal(tela.requisicoes[0].method, 'DELETE');
    assert.equal(botao.disabled, false);
    assert.match(tela.status.textContent, /Não foi possível remover/);

    const sucesso = iniciar(pessoas);
    pessoas.splice(0, 1);
    sucesso.lista.filhos[0].filhos[1].eventos.click();
    assert.equal(sucesso.lista.filhos.length, 0);
    assert.match(sucesso.status.textContent, /ainda não adicionou/);
});
