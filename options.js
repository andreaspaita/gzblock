'use strict';

const api = globalThis.browser ?? globalThis.chrome;
const $ = (s) => document.querySelector(s);
const { t } = globalThis.gzI18n;

function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e[k] = v;
  }
  e.append(...enfants);
  return e;
}

async function afficher() {
  const nombre = (n) => n.toLocaleString(globalThis.gzI18n.locale());
  const { reglagesBloqueur = {}, etatListes, filtresPerso = {}, sitesDesactives = [] } =
    await api.storage.local.get(['reglagesBloqueur', 'etatListes', 'filtresPerso', 'sitesDesactives']);

  // Mode
  const mode = reglagesBloqueur.strict ? 'strict' : 'discret';
  for (const r of document.querySelectorAll('input[name=mode]')) r.checked = r.value === mode;

  // Listes
  const corps = $('#listes');
  corps.replaceChildren();
  for (const s of etatListes?.sources ?? []) {
    corps.append(el('tr', {},
      el('td', { textContent: s.nom }),
      el('td', { textContent: s.ok ? nombre(s.affichage) : '–' }),
      el('td', { textContent: s.ok ? nombre(s.reseau) : '–' }),
      el('td', { textContent: s.ok ? t('listOk') : t('listFailed'), title: s.ok ? '' : s.erreur, className: s.ok ? '' : 'attention' })));
  }
  if (!etatListes) corps.append(el('tr', {}, el('td', { colSpan: 4, className: 'vide', textContent: t('listsNotYet') })));
  $('#dateListes').textContent = etatListes
    ? t('listsLastUpdate', new Date(etatListes.date).toLocaleString(globalThis.gzI18n.locale()))
    : '';

  // Filtres perso
  const zoneFiltres = $('#filtres');
  zoneFiltres.replaceChildren();
  const domaines = Object.keys(filtresPerso).filter((d) => filtresPerso[d].length).sort();
  if (!domaines.length) zoneFiltres.append(el('p', { className: 'vide', textContent: t('none') }));
  else {
    const tableau = el('table', {}, el('thead', {}, el('tr', {}, el('th', { textContent: t('colSite') }), el('th', { textContent: t('colElement') }), el('th'))));
    const tb = el('tbody');
    for (const d of domaines) {
      for (const sel of filtresPerso[d]) {
        tb.append(el('tr', {},
          el('td', { textContent: d }),
          el('td', {}, el('code', { textContent: sel })),
          el('td', {}, el('button', { textContent: t('delete'), onclick: async () => {
            const { filtresPerso: f = {} } = await api.storage.local.get('filtresPerso');
            f[d] = (f[d] ?? []).filter((x) => x !== sel);
            if (!f[d].length) delete f[d];
            await api.storage.local.set({ filtresPerso: f });
            afficher();
          } }))));
      }
    }
    tableau.append(tb);
    zoneFiltres.append(tableau);
  }

  // Sites desactives
  const zoneSites = $('#sites');
  zoneSites.replaceChildren();
  if (!sitesDesactives.length) zoneSites.append(el('p', { className: 'vide', textContent: t('noDisabledSites') }));
  for (const h of [...sitesDesactives].sort()) {
    zoneSites.append(el('div', { className: 'ligne' }, el('span', { textContent: h }),
      el('button', { textContent: t('reactivate'), onclick: async () => {
        const { sitesDesactives: l = [] } = await api.storage.local.get('sitesDesactives');
        await api.storage.local.set({ sitesDesactives: l.filter((x) => x !== h) });
        afficher();
      } })));
  }
}

for (const r of document.querySelectorAll('input[name=mode]')) {
  r.addEventListener('change', async () => {
    const { reglagesBloqueur = {} } = await api.storage.local.get('reglagesBloqueur');
    await api.storage.local.set({ reglagesBloqueur: { ...reglagesBloqueur, strict: r.value === 'strict' } });
  });
}

$('#maj').addEventListener('click', async () => {
  const b = $('#maj');
  b.disabled = true;
  b.textContent = t('downloading');
  await api.runtime.sendMessage({ type: 'mettreAJourListes' });
  b.disabled = false;
  b.textContent = t('updateNow');
  afficher();
});

// Langue : changement -> la page se recharge dans la nouvelle langue.
$('#langue').addEventListener('change', async (e) => {
  await api.storage.local.set({ langue: e.target.value });
  location.reload();
});

(async () => {
  await globalThis.gzI18n.init();
  globalThis.gzI18n.traduirePage();
  document.title = t('optionsPageTitle');
  const { langue = 'auto' } = await api.storage.local.get('langue');
  $('#langue').value = langue;
  afficher();
})();
