// "Masquer un element" : survoler, cliquer, confirmer. Comme le selecteur d'AdBlock.
// L'interface vit dans un Shadow DOM ferme (le site ne peut pas la lire) et
// disparait completement une fois le choix fait.
(() => {
  'use strict';
  if (window.__selecteurActif) return;
  window.__selecteurActif = true;
  const api = globalThis.browser ?? globalThis.chrome;
  // Textes fournis par l'extension dans la langue choisie (francais par defaut).
  const T = {
    pickerHint: "Cliquez sur l'élément à masquer · Échap pour annuler", pickerHide: 'Masquer :',
    pickerWider: 'Plus large', pickerWiderTitle: "Sélectionner le bloc qui contient l'élément",
    pickerConfirm: 'Masquer', pickerCancel: 'Annuler', ...(window.__gzTextes ?? {}),
  };
  const echapperHtml = (x) => String(x).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const hote = document.createElement('div');
  hote.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const ombre = hote.attachShadow({ mode: 'closed' });
  ombre.innerHTML = `
    <style>
      .cadre { position: fixed; border: 2px solid #d62828; background: rgba(214,40,40,.16);
               pointer-events: none; transition: all .05s; box-sizing: border-box; }
      .barre { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
               background: #1d1d1b; color: #fff; font: 13px/1.4 system-ui, sans-serif;
               padding: 10px 12px; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.35);
               pointer-events: auto; display: flex; gap: 8px; align-items: center; max-width: 92vw; }
      .msg { white-space: nowrap; }
      .sel { font-family: ui-monospace, monospace; font-size: 12px; color: #ffc9c9; min-width: 6ch;
             flex: 0 1 auto; max-width: 46vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      button { font: inherit; border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer;
               white-space: nowrap; flex: none; }
      .ok { background: #d62828; color: #fff; } .neutre { background: #3a3a37; color: #fff; }
      [hidden] { display: none !important; }
    </style>
    <div class="cadre" hidden></div>
    <div class="barre">
      <span class="msg">${echapperHtml(T.pickerHint)}</span>
      <span class="sel" hidden></span>
      <button class="neutre parent" hidden title="${echapperHtml(T.pickerWiderTitle)}">${echapperHtml(T.pickerWider)}</button>
      <button class="ok valider" hidden>${echapperHtml(T.pickerConfirm)}</button>
      <button class="neutre annuler">${echapperHtml(T.pickerCancel)}</button>
    </div>`;
  document.documentElement.appendChild(hote);
  const $ = (s) => ombre.querySelector(s);
  const cadre = $('.cadre');

  let survol = null;
  let choisi = null;

  // Noms generes automatiquement (changent a chaque visite) : inutilisables.
  const aleatoire = (n) => /\d{3,}|^css-|^sc-|^jsx-|^emotion-/i.test(n) ||
    // morceau d'au moins 6 caracteres melangeant lettres et chiffres (ex. "x8f3k2a1")
    n.split(/[-_]+/).some((m) => m.length >= 6 && /\d.*\d/.test(m) && /[a-z]/i.test(m));
  const echapper = (n) => (window.CSS?.escape ? CSS.escape(n) : n);

  function selecteur(el) {
    if (el.id && !aleatoire(el.id) && document.querySelectorAll('#' + echapper(el.id)).length === 1) {
      return '#' + echapper(el.id);
    }
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
      if (e.id && !aleatoire(e.id)) { parts.unshift('#' + echapper(e.id)); break; }
      let part = e.tagName.toLowerCase();
      const classes = [...e.classList].filter((c) => !aleatoire(c)).slice(0, 3);
      if (classes.length) part += '.' + classes.map(echapper).join('.');
      // Plusieurs freres correspondent encore : on precise la position.
      if (e.parentElement) {
        const freres = [...e.parentElement.children].filter((c) => { try { return c.matches(part); } catch (_) { return false; } });
        if (freres.length > 1) {
          const memeTag = [...e.parentElement.children].filter((c) => c.tagName === e.tagName);
          part += `:nth-of-type(${memeTag.indexOf(e) + 1})`;
        }
      }
      parts.unshift(part);
      const essai = parts.join(' > ');
      try { if (document.querySelectorAll(essai).length === 1) return essai; } catch (_) { /* continuer */ }
      if (e.tagName === 'BODY') break;
    }
    return parts.join(' > ');
  }

  function encadrer(el) {
    if (!el) { cadre.hidden = true; return; }
    const r = el.getBoundingClientRect();
    Object.assign(cadre.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    cadre.hidden = false;
  }

  function choisir(el) {
    choisi = el;
    encadrer(el);
    $('.msg').textContent = T.pickerHide;
    $('.sel').textContent = selecteur(el);
    for (const s of ['.sel', '.valider', '.parent']) $(s).hidden = false;
  }

  const estInterface = (e) => e.composedPath().includes(hote);
  function survoler(e) {
    if (choisi || estInterface(e)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== survol && el !== hote) { survol = el; encadrer(el); }
  }
  function cliquer(e) {
    if (estInterface(e)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (!choisi && survol) choisir(survol);
  }
  const bloquer = (e) => { if (!estInterface(e)) { e.preventDefault(); e.stopPropagation(); } };

  function fermer() {
    removeEventListener('mousemove', survoler, true);
    removeEventListener('click', cliquer, true);
    for (const t of ['mousedown', 'mouseup', 'pointerdown', 'pointerup']) removeEventListener(t, bloquer, true);
    removeEventListener('keydown', clavier, true);
    hote.remove();
    window.__selecteurActif = false;
  }
  function clavier(e) { if (e.key === 'Escape') { e.preventDefault(); fermer(); } }

  addEventListener('mousemove', survoler, true);
  addEventListener('click', cliquer, true);
  for (const t of ['mousedown', 'mouseup', 'pointerdown', 'pointerup']) addEventListener(t, bloquer, true);
  addEventListener('keydown', clavier, true);

  $('.annuler').addEventListener('click', fermer);
  $('.parent').addEventListener('click', () => {
    if (choisi?.parentElement && choisi.parentElement !== document.body) choisir(choisi.parentElement);
  });
  $('.valider').addEventListener('click', async () => {
    const sel = selecteur(choisi);
    choisi.style.setProperty('display', 'none', 'important'); // effet immediat
    fermer();
    try {
      await api.runtime.sendMessage({ type: 'ajouterFiltre', hote: location.hostname, selecteur: sel });
    } catch (_) { /* extension rechargee */ }
  });
})();
