(() => {
  const root = document.documentElement;
  const themeKey = 'theme';
  let savedTheme = 'light';

  try {
    const stored = localStorage.getItem(themeKey);
    if (stored === 'light' || stored === 'dark') savedTheme = stored;
  } catch (_) {
    // Storage can be unavailable in private or restricted browsing contexts.
  }

  const syncButtons = (theme) => {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const targetLabel = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
      button.setAttribute('aria-label', targetLabel);
      button.setAttribute('title', targetLabel);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  };

  const applyTheme = (theme, persist = false) => {
    root.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(themeKey, theme); } catch (_) {}
    }
    syncButtons(theme);
  };

  // Apply the saved theme before stylesheets paint, avoiding a light-to-dark flash.
  root.setAttribute('data-theme', savedTheme);

  // 如果页面自己没有放带 data-theme-toggle 的按钮，就自动挂一个悬浮按钮。
  // 这样任何页面只要引入 theme-toggle.js 就能用，不需要改动各自的 HTML 结构。
  if (!document.querySelector('[data-theme-toggle]')) {
    const style = document.createElement('style');
    style.textContent = [
      '.theme-fab{position:fixed;top:84px;right:24px;z-index:9999;width:40px;height:40px;',
      'display:grid;place-items:center;cursor:pointer;border-radius:50%;color:#334155;',
      'border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.72);',
      'backdrop-filter:blur(10px);box-shadow:0 2px 12px rgba(15,23,42,.10);',
      'transition:transform .18s ease,background .18s ease;}',
      '.theme-fab:hover{transform:scale(1.08);}',
      '.theme-fab:active{transform:scale(.96);}',
      '.theme-fab .ti{width:18px;height:18px;stroke:currentColor;fill:none;',
      'stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}',
      '.theme-fab .ti--sun{display:none;}',
      '[data-theme="dark"] .theme-fab{background:rgba(30,36,56,.72);',
      'border-color:rgba(255,255,255,.14);color:#e8eaf6;}',
      '[data-theme="dark"] .theme-fab .ti--moon{display:none;}',
      '[data-theme="dark"] .theme-fab .ti--sun{display:block;}',
    ].join('');
    document.head.appendChild(style);

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'theme-fab';
    fab.setAttribute('data-theme-toggle', '');
    fab.innerHTML =
      '<svg class="ti ti--moon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z"/></svg>' +
      '<svg class="ti ti--sun" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3.7"/>' +
      '<path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56m11.02 11.02 1.56 1.56' +
      'M2 12h2.2m15.6 0H22M4.93 19.07l-1.56 1.56M17.51 6.49l1.56-1.56"/></svg>';
    if (document.body) {
      document.body.appendChild(fab);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(fab), { once: true });
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-theme-toggle]') : null;
    if (!target) return;
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncButtons(savedTheme), { once: true });
  } else {
    syncButtons(savedTheme);
  }
})();