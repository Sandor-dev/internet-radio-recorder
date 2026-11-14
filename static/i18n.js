// Simple i18n for Internet Radio Recorder
let currentLang = localStorage.getItem('irr-lang') || 'en';
let translations = {};

async function loadTranslations(lang) {
  try {
    const res = await fetch(`/static/locales/${lang}.json`);
    if (!res.ok) throw new Error('Failed to load');
    translations = await res.json();
    applyTranslations();
    document.documentElement.lang = lang;
    localStorage.setItem('irr-lang', lang);
    const sel = document.getElementById('langSelect');
    if (sel) sel.value = lang;
  } catch (e) {
    console.error('i18n load error', e);
    if (lang !== 'en') loadTranslations('en');
  }
}

function t(key, vars = {}) {
  let str = translations[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return str;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // Re-render dynamic parts if functions exist
  if (typeof render === 'function') render();
  if (typeof renderToday === 'function') renderToday();
  if (typeof renderCalendar === 'function') renderCalendar();
}

function setLanguage(lang) {
  loadTranslations(lang);
}

// Expose globally
window.t = t;
window.setLanguage = setLanguage;
window.currentLang = () => currentLang;

// Auto-load on start
document.addEventListener('DOMContentLoaded', () => {
  loadTranslations(currentLang);
});
