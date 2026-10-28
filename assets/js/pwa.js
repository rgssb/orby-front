(function () {
    if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('/service-worker.js').catch(function (erro) {
            console.error('Não foi possível preparar a instalação do Orby:', erro);
        });
    }
})();
