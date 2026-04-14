// shell.js — runs inside app.html. Reads ?step= from the URL,
// loads the right sub-app in the iframe, manages the progress
// dots and "Next step →" button, and listens for postMessage
// hints from sub-apps so they can mark themselves complete.

(function () {
  'use strict';

  // ───────── step registry ─────────
  // Each step says: which sub-app URL to load, what to show in the
  // header, and which step comes next in the journey.

  const STEPS = {
    email: {
      // Served from the same Python http.server that serves the shell.
      // Path is relative to the shell folder.
      url: '../e-mail-coach/prototype_v2/index.html',
      title: 'Write the email',
      eyebrow: 'Step 1 of 3',
      next: 'call',
      index: 0,
    },
    call: {
      url: '../bel-angst/index.html',
      title: 'Make the call',
      eyebrow: 'Step 2 of 3',
      next: 'sim',
      index: 1,
    },
    sim: {
      // social-sim-claude runs on its own Vite dev server. The team
      // member working on it just runs `npm run dev` in that folder
      // and we point an iframe at it. If you've built it for prod
      // instead, change this to '../social-sim-claude/dist/index.html'.
      url: 'http://localhost:5173/',
      title: 'Step into the room',
      eyebrow: 'Step 3 of 3',
      next: null,
      index: 2,
    },
  };

  // ───────── load step from URL ─────────

  const params = new URLSearchParams(window.location.search);
  const requestedStep = params.get('step');
  const step = STEPS[requestedStep] || STEPS.email;

  // Header bits
  document.getElementById('shell-step-title').textContent = step.title;
  document.getElementById('shell-step-eyebrow').textContent = step.eyebrow;
  document.getElementById('shell-loading-name').textContent = step.title;
  document.title = `SpeakEasy · ${step.title}`;

  // Progress dots
  const dots = document.querySelectorAll('.shell-dot');
  dots.forEach((dot) => {
    const stepKey = dot.dataset.step;
    const stepDef = STEPS[stepKey];
    if (!stepDef) return;
    if (stepDef.index < step.index) {
      dot.classList.add('done');
    } else if (stepDef.index === step.index) {
      dot.classList.add('active');
    }
  });

  // Next-step button (hidden until the sub-app says it's done, or
  // unhidden as a low-stakes "skip ahead" link if there's a next)
  const nextBtn = document.getElementById('shell-next');
  if (step.next) {
    nextBtn.href = `app.html?step=${step.next}`;
    nextBtn.hidden = false;
    // Until the sub-app reports completion, the button is a soft "skip"
    // — visually de-emphasized so users don't feel rushed.
    nextBtn.classList.add('shell-next--ghost');
    nextBtn.firstChild.nodeValue = 'Skip to next ';
  } else {
    nextBtn.href = './';
    nextBtn.hidden = false;
    nextBtn.firstChild.nodeValue = 'Back to overview ';
    nextBtn.classList.add('shell-next--ghost');
  }

  // ───────── load the iframe ─────────

  const frame = document.getElementById('shell-frame');
  const loading = document.getElementById('shell-loading');

  frame.addEventListener('load', () => {
    // Small delay so the spinner doesn't flash for cached loads
    setTimeout(() => { loading.hidden = true; }, 120);
  });

  frame.addEventListener('error', () => {
    loading.querySelector('.shell-frame-loading-inner').innerHTML =
      '<div style="text-align:center;max-width:340px">' +
      '<strong>Couldn\'t load this step.</strong><br/>' +
      'If this is the social scene, make sure the Vite dev server is running ' +
      '(<code>npm run dev</code> in <code>social-sim-claude/</code>).' +
      '</div>';
  });

  frame.src = step.url;

  // ───────── postMessage hooks ─────────
  // Sub-apps can opt in to journey navigation by posting a message
  // when their main task finishes. We accept any origin because the
  // sub-apps are loaded from various ports (8000, 5173) during dev,
  // and the message itself carries no privileged action — at most it
  // promotes the "Next step →" button visually.

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'speakeasy:step-complete' || msg.type === 'step-complete') {
      // Promote the Next button from ghost → primary
      if (step.next && !nextBtn.hidden) {
        nextBtn.classList.remove('shell-next--ghost');
        nextBtn.firstChild.nodeValue = 'Next step ';
      }
    }

    if (msg.type === 'speakeasy:back' || msg.type === 'back') {
      window.location.href = './';
    }
  });
})();
