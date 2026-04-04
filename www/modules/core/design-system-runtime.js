/**
 * Go Mission - Design System Runtime
 * Global facade for design tokens/theme and language APIs.
 */

const DesignSystem = {
  VERSION: '2026.02.16',

  init() {
    document.documentElement.setAttribute('data-design-system', 'go-mission');
    this.translate(document);
  },

  /**
   * Read a CSS token value from the active theme.
   */
  token(name, fallback = '') {
    const key = String(name || '').replace(/^--/, '');
    if (!key || !document.body) return fallback;
    const value = getComputedStyle(document.body).getPropertyValue(`--${key}`).trim();
    return value || fallback;
  },

  getTheme() {
    return window.Theme?.getTheme?.() || 'light';
  },

  setTheme(theme) {
    if (!window.Theme?.setTheme) return Promise.resolve();
    return window.Theme.setTheme(theme);
  },

  toggleTheme() {
    if (!window.Theme?.toggle) return;
    window.Theme.toggle();
  },

  getLanguage() {
    return window.i18n?.getLang?.() || localStorage.getItem('goMission_language') || 'tl';
  },

  setLanguage(lang) {
    if (!window.i18n?.setLang) return Promise.resolve();
    return window.i18n.setLang(lang);
  },

  toggleLanguage() {
    if (!window.i18n?.toggle) return;
    window.i18n.toggle();
  },

  t(key) {
    return window.i18n?.t?.(key) || key;
  },

  translate(root = document) {
    if (!window.i18n?.applyTranslations) return;
    window.i18n.applyTranslations(root);
  }
};

window.DesignSystem = DesignSystem;
window.GoMissionSystem = {
  design: {
    init: () => DesignSystem.init(),
    token: (name, fallback = '') => DesignSystem.token(name, fallback),
    getTheme: () => DesignSystem.getTheme(),
    setTheme: (theme) => DesignSystem.setTheme(theme),
    toggleTheme: () => DesignSystem.toggleTheme()
  },
  language: {
    get: () => DesignSystem.getLanguage(),
    set: (lang) => DesignSystem.setLanguage(lang),
    toggle: () => DesignSystem.toggleLanguage(),
    t: (key) => DesignSystem.t(key),
    apply: (root = document) => DesignSystem.translate(root)
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DesignSystem.init());
} else {
  DesignSystem.init();
}
