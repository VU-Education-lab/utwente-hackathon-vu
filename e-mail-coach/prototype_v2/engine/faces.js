// SVG face-templates voor de ontvanger-reacties.
// Eenmalig gedefinieerd en gedeeld tussen app.js (live reactie-scène)
// en admin.js (test-bench interpretatie-preview).

export const FACES = {
  frown: `<svg viewBox="0 0 200 200" class="face-svg">
    <circle cx="100" cy="100" r="85" fill="#F4ECE0"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#2A2520" stroke-width="3"/>
    <ellipse cx="72" cy="90" rx="6" ry="8" fill="#2A2520"/>
    <ellipse cx="128" cy="90" rx="6" ry="8" fill="#2A2520"/>
    <line x1="60" y1="72" x2="84" y2="78" stroke="#2A2520" stroke-width="3" stroke-linecap="round"/>
    <line x1="116" y1="78" x2="140" y2="72" stroke="#2A2520" stroke-width="3" stroke-linecap="round"/>
    <path d="M70 145 Q100 125 130 145" stroke="#2A2520" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`,

  puzzled: `<svg viewBox="0 0 200 200" class="face-svg">
    <circle cx="100" cy="100" r="85" fill="#F4ECE0"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#2A2520" stroke-width="3"/>
    <ellipse cx="72" cy="92" rx="6" ry="7" fill="#2A2520"/>
    <ellipse cx="128" cy="88" rx="6" ry="7" fill="#2A2520"/>
    <line x1="60" y1="76" x2="84" y2="78" stroke="#2A2520" stroke-width="3" stroke-linecap="round"/>
    <line x1="116" y1="72" x2="140" y2="80" stroke="#2A2520" stroke-width="3" stroke-linecap="round"/>
    <path d="M75 140 Q90 138 105 142 Q120 138 135 140" stroke="#2A2520" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`,

  pleased: `<svg viewBox="0 0 200 200" class="face-svg">
    <circle cx="100" cy="100" r="85" fill="#F4ECE0"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#2A2520" stroke-width="3"/>
    <path d="M62 92 Q72 84 82 92" stroke="#2A2520" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M118 92 Q128 84 138 92" stroke="#2A2520" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M70 130 Q100 155 130 130" stroke="#2A2520" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="65" cy="115" r="6" fill="#F4B5A0" opacity="0.6"/>
    <circle cx="135" cy="115" r="6" fill="#F4B5A0" opacity="0.6"/>
  </svg>`,

  amused: `<svg viewBox="0 0 200 200" class="face-svg">
    <circle cx="100" cy="100" r="85" fill="#F4ECE0"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#2A2520" stroke-width="3"/>
    <ellipse cx="72" cy="90" rx="5" ry="7" fill="#2A2520"/>
    <ellipse cx="128" cy="90" rx="5" ry="7" fill="#2A2520"/>
    <path d="M58 78 Q72 70 84 80" stroke="#2A2520" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M116 80 Q128 70 142 78" stroke="#2A2520" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M75 130 Q100 145 125 130 Q115 138 100 138 Q85 138 75 130" fill="#2A2520"/>
  </svg>`
};

export const FACE_LABELS = {
  frown:   'fronsend',
  puzzled: 'verbaasd',
  pleased: 'tevreden',
  amused:  'geamuseerd'
};
