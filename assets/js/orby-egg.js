(function () {
  var active = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.orby-mascot').forEach(function (mascot) {
    var clicks = [];
    mascot.removeAttribute('aria-hidden');
    mascot.setAttribute('role', 'button');
    mascot.setAttribute('tabindex', '0');
    mascot.setAttribute('aria-label', 'Interagir com o mascote Orby');
    mascot.setAttribute('data-orby-surpresa', '');

    mascot.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      mascot.click();
    });

    mascot.addEventListener('click', function (event) {
      if (active) return;
      var now = Date.now();
      clicks = clicks.filter(function (time) { return now - time <= 12000; });
      clicks.push(now);
      if (clicks.length < 30) return;
      clicks = [];
      start(mascot, event.detail === 0);
    });
  });

  function start(mascot, keyboard) {
    active = true;
    var previousFocus = document.activeElement;
    var originalOverflow = document.body.style.getPropertyValue('overflow');
    var overflowPriority = document.body.style.getPropertyPriority('overflow');
    var elements = Array.from(document.body.children).filter(function (element) {
      return element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE';
    });
    var previousInert = elements.map(function (element) { return element.inert; });
    var previousHidden = elements.map(function (element) { return element.hidden; });
    var bounds = mascot.getBoundingClientRect();
    var layer = document.createElement('div');
    layer.className = 'orby-egg';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', 'Surpresa do mascote');
    if (keyboard) layer.classList.add('orby-egg--keyboard');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'orby-egg-mascot';
    button.setAttribute('aria-label', 'Devolver a página');
    button.setAttribute('aria-disabled', 'true');
    var svg = mascot.querySelector('svg').cloneNode(true);
    svg.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
    svg.querySelectorAll('.orby-ring').forEach(function (ring) {
      var angle = ring.style.transform.match(/rotate\(([-.\d]+)deg\)/);
      if (angle) ring.style.setProperty('--orby-egg-start-angle', angle[1] + 'deg');
    });
    svg.setAttribute('aria-hidden', 'true');
    var gradient = svg.querySelector('radialGradient');
    gradient.setAttribute('id', 'orby-egg-body-gradient');
    ['#f44848', '#a31329', '#380913'].forEach(function (color, index) {
      gradient.querySelectorAll('stop')[index].setAttribute('stop-color', color);
    });
    var defs = svg.querySelector('defs');
    svg.querySelectorAll('.orby-eye').forEach(function (eye, index) {
      var clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      var shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var id = 'orby-egg-eye-' + index;
      clip.setAttribute('id', id);
      shape.setAttribute('d', index === 0 ?
        'M 36 52 L 57 59 L 57 72 L 36 72 Z' :
        'M 63 59 L 84 52 L 84 72 L 63 72 Z');
      clip.appendChild(shape);
      defs.appendChild(clip);
      eye.setAttribute('clip-path', 'url(#' + id + ')');
    });
    button.appendChild(svg);
    layer.appendChild(button);
    document.body.appendChild(layer);

    mascot.classList.add('orby-egg-source');
    elements.forEach(function (element) { element.inert = true; });
    document.body.style.setProperty('overflow', 'hidden');
    button.focus();

    var phase = 'intro';
    var restoreRequested = false;
    var animations = [];
    var finished = false;

    function cleanup() {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('pagehide', cleanup);
      animations.forEach(function (animation) { animation.cancel(); });
      elements.forEach(function (element, index) {
        element.inert = previousInert[index];
        if (reducedMotion) element.hidden = previousHidden[index];
      });
      if (originalOverflow) document.body.style.setProperty('overflow', originalOverflow, overflowPriority);
      else document.body.style.removeProperty('overflow');
      layer.remove();
      mascot.classList.remove('orby-egg-source');
      active = false;
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        restore();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        layer.classList.add('orby-egg--keyboard');
        button.focus();
      }
    }

    function restore() {
      if (phase === 'intro') {
        restoreRequested = true;
        return;
      }
      if (phase !== 'swallowed') return;
      phase = 'outro';
      button.setAttribute('aria-disabled', 'true');
      if (reducedMotion) {
        cleanup();
        return;
      }
      animations.forEach(function (animation) { animation.reverse(); });
      whenAnimationsFinish().then(cleanup);
    }

    function whenAnimationsFinish() {
      return Promise.all(animations.map(function (animation) {
        return animation.finished.catch(function (error) {
          if (error.name !== 'AbortError') throw error;
        });
      }));
    }

    document.addEventListener('keydown', onKeydown);
    window.addEventListener('pagehide', cleanup);
    layer.addEventListener('pointerdown', function () { layer.classList.remove('orby-egg--keyboard'); });
    button.addEventListener('click', function () {
      if (phase === 'swallowed') restore();
    });

    if (!reducedMotion) {
      var destination = button.getBoundingClientRect();
      var targetX = destination.left + destination.width / 2;
      var targetY = destination.top + destination.height / 2;
      var dx = bounds.left + bounds.width / 2 - targetX;
      var dy = bounds.top + bounds.height / 2 - targetY;
      var timing = { duration: 3600, easing: 'linear', fill: 'both' };
      animations.push(button.animate([
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + bounds.width / destination.width + ')', offset: 0, easing: 'ease-in-out' },
        { transform: 'translate(0, 0) scale(1.16)', offset: .4, easing: 'ease-in-out' },
        { transform: 'translate(0, 0) scale(1)', offset: .48 },
        { transform: 'translate(0, 0) scale(1)', offset: 1 }
      ], timing));
      animations.push(layer.animate([
        { backgroundColor: 'rgba(7, 7, 12, 0)', offset: 0 },
        { backgroundColor: 'rgba(7, 7, 12, 0)', offset: .88 },
        { backgroundColor: 'rgba(7, 7, 12, .98)', offset: 1 }
      ], timing));
      elements.forEach(function (element) {
        var rect = element.getBoundingClientRect();
        var x = targetX - rect.left;
        var y = targetY - rect.top;
        var origin = x + 'px ' + y + 'px';
        var frames = [
          { transformOrigin: origin, transform: 'scale(1)', opacity: 1, offset: 0 },
          { transformOrigin: origin, transform: 'scale(1)', opacity: 1, offset: .5 }
        ];
        for (var i = 1; i <= 32; i++) {
          var progress = i / 32;
          var pull = Math.pow(progress * progress * (3 - 2 * progress), .7);
          var horizontal = 1 - .96 * pull;
          var vertical = 1 - .96 * pull * pull * pull;
          var twist = 6 * Math.sin(Math.PI * progress);
          var fade = Math.max(0, Math.min(1, (progress - .84) / .16));
          frames.push({
            transformOrigin: origin,
            transform: 'scale(' + horizontal + ', ' + vertical + ') skewX(' + twist + 'deg)',
            opacity: 1 - fade * fade * (3 - 2 * fade),
            offset: .5 + .46 * progress
          });
        }
        frames.push({ transformOrigin: origin, transform: 'scale(.04)', opacity: 0, offset: 1 });
        animations.push(element.animate(frames, timing));
      });
    } else {
      layer.classList.add('orby-egg--static');
      elements.forEach(function (element) { element.hidden = true; });
    }

    whenAnimationsFinish().then(function () {
      if (finished) return;
      phase = 'swallowed';
      button.setAttribute('aria-disabled', 'false');
      if (restoreRequested) restore();
    });
  }
})();
