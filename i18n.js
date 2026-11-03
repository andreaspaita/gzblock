// Traductions FR / EN. Langue : choix de l'utilisateur (Options) ou, par defaut,
// celle du navigateur (francais si le navigateur est en francais, sinon anglais).
'use strict';

globalThis.gzI18n = (() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const LANGUES = ['fr', 'en'];
  let dico = {};
  let langue = 'en';

  function langueNavigateur() {
    const l = (api.i18n?.getUILanguage?.() || globalThis.navigator?.language || 'en').toLowerCase();
    return l.startsWith('fr') ? 'fr' : 'en';
  }

  async function init() {
    let choix = 'auto';
    try { ({ langue: choix = 'auto' } = await api.storage.local.get('langue')); } catch (_) { /* defaut */ }
    langue = LANGUES.includes(choix) ? choix : langueNavigateur();
    try {
      const r = await fetch(api.runtime.getURL(`_locales/${langue}/messages.json`));
      const brut = await r.json();
      dico = Object.fromEntries(Object.entries(brut).map(([k, v]) => [k, v.message]));
    } catch (_) {
      dico = {};
    }
    return langue;
  }

  // t('cle', 'valeur1', ...) : remplace $1, $2... par les valeurs.
  function t(cle, ...valeurs) {
    let s = dico[cle] ?? cle;
    valeurs.forEach((v, i) => { s = s.split(`$${i + 1}`).join(String(v)); });
    return s;
  }

  // Traduit tous les elements marques data-i18n / data-i18n-title.
  function traduirePage(racine = document) {
    for (const e of racine.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
    for (const e of racine.querySelectorAll('[data-i18n-title]')) e.title = t(e.dataset.i18nTitle);
    if (racine === document) document.documentElement.lang = langue;
  }

  // Formats de dates et nombres dans la langue choisie.
  const locale = () => (langue === 'fr' ? 'fr-FR' : 'en-GB');

  return { init, t, traduirePage, locale, get langue() { return langue; } };
})();
