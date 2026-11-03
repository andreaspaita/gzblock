'use strict';

const api = globalThis.browser ?? globalThis.chrome;
const { t } = globalThis.gzI18n;

document.getElementById('options').addEventListener('click', () => api.runtime.openOptionsPage());

const REGLAGES_DEFAUT = { cookiesPub: true, cookiesTiers: true, gpc: true, liensPropres: true };

// La page est traduite avant tout le reste.
const pret = globalThis.gzI18n.init().then(() => globalThis.gzI18n.traduirePage());

// Section "Vie privee" : independante du site courant.
(async () => {
  await pret;
  const { reglagesVP = {}, cookiesSupprimes = 0 } = await api.storage.local.get(['reglagesVP', 'cookiesSupprimes']);
  const reglages = { ...REGLAGES_DEFAUT, ...reglagesVP };
  const compteur = document.getElementById('cookies');
  compteur.textContent = t('privacyDeleted', cookiesSupprimes);
  for (const caseOption of document.querySelectorAll('[data-reglage]')) {
    const cle = caseOption.dataset.reglage;
    caseOption.checked = reglages[cle];
    caseOption.addEventListener('change', async () => {
      reglages[cle] = caseOption.checked;
      await api.storage.local.set({ reglagesVP: reglages });
    });
  }
  const bouton = document.getElementById('nettoyer');
  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    bouton.textContent = t('cleaning');
    await api.runtime.sendMessage({ type: 'nettoyerCookies' });
    setTimeout(async () => {
      const { cookiesSupprimes: n = 0 } = await api.storage.local.get('cookiesSupprimes');
      compteur.textContent = t('privacyDeleted', n);
      bouton.textContent = t('done');
    }, 1200);
  });
})();

(async () => {
  await pret;
  const [onglet] = await api.tabs.query({ active: true, currentWindow: true });
  const caseActif = document.getElementById('actif');
  const boutonRecharger = document.getElementById('recharger');

  let hote = '';
  try {
    const url = new URL(onglet?.url ?? '');
    if (url.protocol === 'http:' || url.protocol === 'https:') hote = url.hostname.replace(/^www\./, '');
  } catch (_) { /* page interne du navigateur */ }

  document.getElementById('site').textContent = hote || t('popupUnsupported');
  const boutonSelecteur = document.getElementById('selecteur');
  if (!hote) {
    caseActif.disabled = true;
    boutonSelecteur.disabled = true;
    return;
  }

  boutonSelecteur.addEventListener('click', async () => {
    const r = await api.runtime.sendMessage({ type: 'selecteurElement', tabId: onglet.id });
    if (r?.ok) window.close();
    else boutonSelecteur.textContent = t('popupPickerFailed');
  });

  const { sitesDesactives = [] } = await api.storage.local.get('sitesDesactives');
  caseActif.checked = !sitesDesactives.includes(hote);

  try {
    const { nombre } = await api.runtime.sendMessage({ type: 'lireCompteur', tabId: onglet.id });
    document.getElementById('nombre').textContent = nombre ?? 0;
  } catch (_) { /* compteur indisponible */ }

  caseActif.addEventListener('change', async () => {
    const { sitesDesactives: liste = [] } = await api.storage.local.get('sitesDesactives');
    const nouvelle = caseActif.checked
      ? liste.filter((h) => h !== hote)
      : [...new Set([...liste, hote])];
    await api.storage.local.set({ sitesDesactives: nouvelle });
    boutonRecharger.style.display = 'block';
  });

  boutonRecharger.addEventListener('click', () => {
    api.tabs.reload(onglet.id);
    window.close();
  });
})();
