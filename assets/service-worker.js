self.addEventListener('fetch', function (evento) {
    if (evento.request.mode === 'navigate') evento.respondWith(fetch(evento.request));
});
