// Controla as expressões/animações do mascote Orby.
(function () {
  function anyFieldFocused(form) {
    return form.contains(document.activeElement) &&
      (document.activeElement.tagName === 'INPUT');
  }

  function initMascot(mascot) {
    var form = mascot.closest('form');

    var pupils = mascot.querySelectorAll('.orby-pupil');
    var rings = mascot.querySelectorAll('.orby-ring');
    var inner = mascot.querySelector('.orby-inner');
    var textInputs = form ? form.querySelectorAll('input[type="text"], input[type="email"]') : [];
    var passwordInputs = form ? form.querySelectorAll('input[type="password"]') : [];
    var pointerTimeout;
    var pointerFrame;
    var latestPointer;
    var lastActivity = Date.now();
    var tapTimeout;
    var ringAngle = 0;
    var ringSpeed = 26;
    var ringFrameTime;
    var ringBoostUntil = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setState(state) {
      mascot.classList.remove('is-blinking');
      mascot.setAttribute('data-state', state);
    }

    function markActivity() {
      lastActivity = Date.now();
      mascot.classList.remove('is-idle');
    }

    function animateRings(timestamp) {
      if (reducedMotion) return;

      var elapsed = ringFrameTime ? Math.min((timestamp - ringFrameTime) / 1000, 0.05) : 0;
      ringFrameTime = timestamp;

      var state = mascot.getAttribute('data-state');
      var targetSpeed = state === 'loading' ? 300 :
        mascot.classList.contains('is-hovered') ? 105 :
          mascot.classList.contains('is-idle') ? 16 : 26;
      if (timestamp < ringBoostUntil) targetSpeed = Math.max(targetSpeed, 80);

      ringSpeed += (targetSpeed - ringSpeed) * (1 - Math.exp(-elapsed / 0.75));
      ringAngle = (ringAngle + ringSpeed * elapsed) % 360;

      var scale = 1;
      if (timestamp < ringBoostUntil) {
        var progress = 1 - (ringBoostUntil - timestamp) / 1450;
        scale += 0.05 * Math.sin(Math.PI * progress);
      }
      rings.forEach(function (ring) {
        ring.style.transform = 'rotate(' + ringAngle.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      });
      window.requestAnimationFrame(animateRings);
    }

    if (!reducedMotion) window.requestAnimationFrame(animateRings);

    // Move os olhos levemente de acordo com o quanto o usuário já digitou,
    // dando a impressão de que o Orby está "acompanhando" o texto.
    function trackEyes(input) {
      var value = input.value || '';
      var ratio = Math.min(value.length / 24, 1); // 0 -> 1
      var offsetX = (ratio - 0.5) * 6; // -3px .. 3px
      pupils.forEach(function (pupil) {
        pupil.style.transform = 'translateX(' + offsetX.toFixed(1) + 'px)';
      });
    }

    function resetEyes() {
      pupils.forEach(function (pupil) { pupil.style.transform = ''; });
    }

    function followPointer(event) {
      var state = mascot.getAttribute('data-state');
      if (state !== 'default' && state !== 'typing-email') return;

      markActivity();
      latestPointer = event;
      if (!pointerFrame) {
        pointerFrame = window.requestAnimationFrame(updatePointer);
      }
    }

    function updatePointer() {
      pointerFrame = undefined;
      if (!latestPointer) return;

      var bounds = mascot.getBoundingClientRect();
      var relativeX = ((latestPointer.clientX - bounds.left) / bounds.width - 0.5) * 2;
      var relativeY = ((latestPointer.clientY - bounds.top) / bounds.height - 0.5) * 2;
      var offsetX = Math.max(-3.2, Math.min(3.2, relativeX * 3.2));
      var offsetY = Math.max(-1.8, Math.min(1.8, relativeY * 1.8));

      pupils.forEach(function (pupil) {
        pupil.style.transform = 'translate(' + offsetX.toFixed(1) + 'px, ' + offsetY.toFixed(1) + 'px)';
      });
      if (!mascot.classList.contains('orby-mascot--nav')) {
        mascot.style.setProperty('--mouse-tilt', (relativeX * 3).toFixed(1) + 'deg');
        mascot.classList.add('is-hovered');
      }
      clearTimeout(pointerTimeout);
      pointerTimeout = setTimeout(resetPointer, 320);
    }

    function resetPointer() {
      mascot.classList.remove('is-hovered');
      mascot.style.removeProperty('--mouse-tilt');
      var state = mascot.getAttribute('data-state');
      if (state === 'default' || state === 'typing-email') resetEyes();
    }

    function reactToTap() {
      clearTimeout(tapTimeout);
      mascot.classList.remove('is-tapped');
      void mascot.offsetWidth;
      mascot.classList.add('is-tapped');
      ringBoostUntil = performance.now() + 1450;
      inner.animate([
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(-6deg) scale(1.05)', offset: 0.3 },
        { transform: 'rotate(6deg) scale(1.05)', offset: 0.7 },
        { transform: 'rotate(0deg) scale(1)' }
      ], {
        duration: 1500,
        easing: 'ease-in-out'
      });
      tapTimeout = setTimeout(function () { mascot.classList.remove('is-tapped'); }, 1600);
    }

    // Quando ninguém interage com o form, o Orby dá uma olhadinha para o
    // lado de vez em quando, sozinho, para não ficar "estático demais".
    function scheduleIdleGlance() {
      var delay = 5000 + Math.random() * 4000;
      setTimeout(function () {
        if (mascot.getAttribute('data-state') === 'default') {
          var dirX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
          var dirY = (Math.random() - 0.5) * 2;
          pupils.forEach(function (pupil) {
            pupil.style.transform = 'translate(' + dirX.toFixed(1) + 'px, ' + dirY.toFixed(1) + 'px)';
          });
          setTimeout(function () {
            if (mascot.getAttribute('data-state') === 'default') resetEyes();
          }, 500);
        }
        scheduleIdleGlance();
      }, delay);
    }
    scheduleIdleGlance();

    function blink() {
      var state = mascot.getAttribute('data-state');
      if (state !== 'default' && state !== 'typing-email') return;

      mascot.classList.add('is-blinking');
      setTimeout(function () {
        mascot.classList.remove('is-blinking');
      }, 150);
    }

    function scheduleBlink() {
      var delay = 2800 + Math.random() * 3000;
      setTimeout(function () {
        blink();
        scheduleBlink();
      }, delay);
    }
    scheduleBlink();
    document.addEventListener('pointermove', followPointer);
    document.addEventListener('click', function (event) {
      if (mascot.contains(event.target)) reactToTap();
    });
    window.addEventListener('blur', resetPointer);
    if (form) {
      form.addEventListener('focusin', function () {
        markActivity();
        mascot.classList.add('is-form-focused');
      });
      form.addEventListener('focusout', function () {
        setTimeout(function () {
          if (!anyFieldFocused(form)) mascot.classList.remove('is-form-focused');
        }, 0);
      });
    }
    setInterval(function () {
      if (mascot.getAttribute('data-state') === 'default' && Date.now() - lastActivity > 12000) {
        mascot.classList.add('is-idle');
      }
    }, 1000);
    (form ? form.querySelectorAll('a[href]') : []).forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        mascot.classList.add('is-leaving');
        setTimeout(function () { window.location.assign(link.href); }, 300);
      });
    });

    textInputs.forEach(function (input) {
      input.addEventListener('focus', function () {
        markActivity();
        setState('typing-email');
        trackEyes(input);
      });
      input.addEventListener('input', function () {
        trackEyes(input);
      });
      input.addEventListener('blur', function () {
        resetEyes();
        if (!anyFieldFocused(form)) setState('default');
      });
    });

    passwordInputs.forEach(function (input) {
      input.addEventListener('focus', function () {
        markActivity();
        setState('password');
      });
      input.addEventListener('blur', function () {
        if (!anyFieldFocused(form)) setState('default');
      });
    });

    if (form) {
      form.addEventListener('submit', function () {
        setState('loading');
      });
    }

    // API por instância, útil quando há mais de um mascote na página.
    mascot.orby = {
      setState: setState,
      success: function () {
        setState('success');
        setTimeout(function () { setState('default'); }, 2200);
      },
      error: function () {
        setState('error');
        setTimeout(function () { setState('default'); }, 1200);
      }
    };
  }

  var mascots = document.querySelectorAll('.orby-mascot');
  mascots.forEach(initMascot);
  mascots.forEach(function (mascot) {
    mascot.classList.add(new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'theme-day' : 'theme-night');
    if (mascot.classList.contains('orby-mascot--nav')) return;
    mascot.classList.add('is-welcoming');
    setTimeout(function () { mascot.classList.remove('is-welcoming'); }, 900);
  });

  // API global aciona o mascote da página atual.
  window.OrbyMascot = {
    success: function () { mascots.forEach(function (m) { m.orby.success(); }); },
    error: function () { mascots.forEach(function (m) { m.orby.error(); }); },
    setState: function (state) { mascots.forEach(function (m) { m.orby.setState(state); }); }
  };
})();
