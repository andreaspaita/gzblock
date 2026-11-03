// Coeur de l'extension :
//  - masquage des pubs sur tous les sites (sauf ceux desactives) ;
//  - listes de filtres EasyList + Liste FR (mise a jour quotidienne) ;
//  - mode strict (blocage reseau, comme AdBlock) ;
//  - filtres perso ("Masquer un element") ;
//  - compteur de pubs par onglet ; vie privee (vieprivee.js).
'use strict';

const SCRIPT_ID = 'masquage-pubs';
const api = globalThis.browser ?? globalThis.chrome;

// Chrome (service worker) charge les modules ici ; Firefox les charge via le manifeste.
if (typeof importScripts === 'function') {
  if (!globalThis.viePrivee) importScripts('vieprivee.js');
  if (!globalThis.listes) importScripts('listes.js');
  if (!globalThis.gzI18n) importScripts('i18n.js');
}

const avertir = (quoi) => (e) => console.warn(`${quoi} :`, e?.message ?? e);

async function reglages() {
  const { reglagesBloqueur = {}, sitesDesactives = [], filtresPerso = {} } =
    await api.storage.local.get(['reglagesBloqueur', 'sitesDesactives', 'filtresPerso']);
  return { strict: false, ...reglagesBloqueur, sitesDesactives, filtresPerso };
}

async function enregistrer() {
  const { sitesDesactives } = await reglages();
  // "*://*.exemple.com/*" couvre exemple.com ET tous ses sous-domaines.
  const exclus = sitesDesactives.map((h) => `*://*.${h}/*`);
  try {
    await api.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  } catch (_) { /* pas encore enregistre */ }
  await api.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches: ['<all_urls>'],
    excludeMatches: exclus,
    css: ['hide.css'],          // feuille d'extension : invisible dans document.styleSheets
    js: ['content.js'],          // monde isole : le site ne voit ni variables ni fonctions
    runAt: 'document_start',
    allFrames: true,
    persistAcrossSessions: true,
  }]);
}

// Regles reseau des listes (mode strict uniquement). Identifiants >= 2000 :
// on ne touche pas aux regles "vie privee" (1001 a 1199).
async function appliquerReseau() {
  const r = await reglages();
  const anciennes = (await api.declarativeNetRequest.getDynamicRules())
    .map((x) => x.id).filter((id) => id >= globalThis.listes.ID_RESEAU);
  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: anciennes });
  if (!r.strict) return;
  const index = await globalThis.listes.index();
  for (const regle of globalThis.listes.reglesReseau(index, r.sitesDesactives)) {
    try {
      await api.declarativeNetRequest.updateDynamicRules({ addRules: [regle] });
    } catch (e) { avertir(`Regle reseau ${regle.id}`)(e); }
  }
}

async function mettreAJourListes() {
  await globalThis.listes.mettreAJour();
  await appliquerReseau();
}

async function demarrer() {
  // Etapes independantes : un probleme dans l'une ne bloque pas les autres.
  await enregistrer().catch(avertir('Masquage des pubs'));
  await globalThis.viePrivee.appliquer().catch(avertir('Vie privee'));
  const { etatListes } = await api.storage.local.get('etatListes');
  if (!etatListes || Date.now() - etatListes.date > 24 * 3600e3) await mettreAJourListes().catch(avertir('Listes'));
  else await appliquerReseau().catch(avertir('Blocage reseau'));
  api.alarms.create('majListes', { periodInMinutes: 24 * 60 });
}
api.runtime.onInstalled.addListener(demarrer);
api.runtime.onStartup.addListener(demarrer);
api.alarms.onAlarm.addListener((a) => {
  if (a.name === 'majListes') mettreAJourListes().catch(avertir('Listes'));
});

api.storage.onChanged.addListener((changes, zone) => {
  if (zone !== 'local') return;
  if (changes.sitesDesactives) {
    enregistrer().catch(avertir('Masquage des pubs'));
    appliquerReseau().catch(avertir('Blocage reseau'));
  }
  if (changes.reglagesBloqueur) appliquerReseau().catch(avertir('Blocage reseau'));
  if (changes.reglagesVP) globalThis.viePrivee.appliquer().catch(avertir('Vie privee'));
});

// Injecte dans un cadre les filtres des listes + filtres perso de son site.
// Origine "USER" : prioritaire sur le CSS du site et invisible pour son JavaScript.
async function injecterCss(tabId, frameId, url) {
  let hote;
  try { hote = new URL(url).hostname; } catch (_) { return; }
  const r = await reglages();
  const perso = [];
  for (const d of globalThis.listes.parents(hote)) perso.push(...(r.filtresPerso[d] ?? []));
  const index = await globalThis.listes.index();
  const { css } = globalThis.listes.cssPour(index, hote, r.strict, perso);
  if (!css) return;
  await api.scripting.insertCSS({ target: { tabId, frameIds: [frameId] }, css, origin: 'USER' });
}

async function ajouterFiltre(hote, selecteur) {
  const domaine = hote.replace(/^www\./, '').toLowerCase();
  const { filtresPerso = {} } = await api.storage.local.get('filtresPerso');
  filtresPerso[domaine] = [...new Set([...(filtresPerso[domaine] ?? []), selecteur])];
  await api.storage.local.set({ filtresPerso });
}

// Selecteur d'element : on lui passe d'abord ses textes dans la langue choisie
// (une page web ne peut pas lire les fichiers de traduction de l'extension).
async function lancerSelecteur(tabId) {
  const i = globalThis.gzI18n;
  await i.init();
  const textes = Object.fromEntries(['pickerHint', 'pickerHide', 'pickerWider', 'pickerWiderTitle', 'pickerConfirm', 'pickerCancel']
    .map((k) => [k, i.t(k)]));
  await api.scripting.executeScript({ target: { tabId }, func: (tx) => { window.__gzTextes = tx; }, args: [textes] });
  await api.scripting.executeScript({ target: { tabId }, files: ['picker.js'] });
}

// Compteur par onglet = somme des compteurs de chaque cadre (page + iframes).
const compteurs = new Map(); // tabId -> Map(frameId -> nombre)

function total(tabId) {
  let n = 0;
  for (const v of (compteurs.get(tabId) ?? new Map()).values()) n += v;
  return n;
}

api.runtime.onMessage.addListener((msg, sender, repondre) => {
  const tabId = sender.tab?.id;
  switch (msg?.type) {
    case 'compteur': {
      if (tabId === undefined) return;
      if (!compteurs.has(tabId)) compteurs.set(tabId, new Map());
      compteurs.get(tabId).set(sender.frameId ?? 0, msg.nombre);
      const n = total(tabId);
      api.action.setBadgeBackgroundColor({ tabId, color: '#d62828' });
      api.action.setBadgeText({ tabId, text: n ? String(n) : '' });
      return;
    }
    case 'cssSite':
      if (tabId !== undefined) injecterCss(tabId, sender.frameId ?? 0, sender.url).catch(avertir('Filtres du site'));
      return;
    case 'ajouterFiltre':
      ajouterFiltre(msg.hote, msg.selecteur).then(() => repondre({ ok: true }), avertir('Filtre perso'));
      return true;
    case 'lireCompteur':
      repondre({ nombre: total(msg.tabId) });
      return;
    case 'nettoyerCookies':
      globalThis.viePrivee.nettoyerTout().then(() => repondre({ ok: true }));
      return true;
    case 'mettreAJourListes':
      mettreAJourListes().then(() => repondre({ ok: true }), (e) => repondre({ ok: false, erreur: String(e) }));
      return true;
    case 'selecteurElement':
      lancerSelecteur(msg.tabId)
        .then(() => repondre({ ok: true }), (e) => repondre({ ok: false, erreur: String(e?.message ?? e) }));
      return true;
    default:
  }
});

api.tabs.onRemoved.addListener((tabId) => compteurs.delete(tabId));
api.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') {
    compteurs.delete(tabId);
    api.action.setBadgeText({ tabId, text: '' });
  }
});
