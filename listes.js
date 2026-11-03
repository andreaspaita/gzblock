// Listes de filtres (les memes qu'AdBlock / Adblock Plus) : EasyList + Liste FR.
// Telechargees par l'extension, mises a jour toutes les 24 h.
//
// Deux modes :
//  - DISCRET (defaut) : seuls les filtres d'affichage propres a chaque site
//    ("site.fr##.pub") sont appliques. Ils visent de vraies pubs, pas les
//    "appats" generiques que les sites utilisent pour detecter un bloqueur.
//    Aucune requete bloquee -> le site ne voit aucune erreur reseau.
//  - STRICT (comme AdBlock) : en plus, filtres d'affichage generiques et
//    blocage reseau des domaines publicitaires. Plus efficace, mais detectable.
'use strict';

globalThis.listes = (() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const SOURCES = [
    { nom: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt' },
    { nom: 'Liste FR', url: 'https://easylist-downloads.adblockplus.org/liste_fr.txt' },
  ];

  // Syntaxes etendues propres a AdBlock/uBlock : non comprises par le CSS standard.
  const NON_CSS = /:-abp-|:has-text|:contains\(|:xpath|:style\(|:remove\(|:upward|:matches-|:min-text-length|:watch-attr|:others\(|:if\(|:nth-ancestor/;

  // Types de requetes AdBlock -> types declarativeNetRequest.
  const TYPES = {
    script: 'script', image: 'image', stylesheet: 'stylesheet', object: 'object',
    xmlhttprequest: 'xmlhttprequest', xhr: 'xmlhttprequest', subdocument: 'sub_frame',
    frame: 'sub_frame', ping: 'ping', media: 'media', font: 'font', websocket: 'websocket',
    other: 'other',
  };
  const TOUS_TYPES = ['script', 'image', 'stylesheet', 'object', 'xmlhttprequest', 'sub_frame',
    'ping', 'media', 'font', 'websocket', 'other']; // jamais main_frame : on ne bloque pas une page

  const ajouter = (obj, cle, val) => { (obj[cle] ??= []).push(val); };

  // Analyse d'une liste au format Adblock Plus.
  function analyser(texte, res = nouvelIndex()) {
    for (let ligne of texte.split('\n')) {
      ligne = ligne.trim();
      if (!ligne || ligne[0] === '!' || ligne[0] === '[') continue;

      // ---- Filtres d'affichage : "domaines##selecteur" / exceptions "domaines#@#selecteur"
      const iCos = ligne.search(/#@?#/);
      if (iCos !== -1 && !/#[?$%]#/.test(ligne)) {
        const exception = ligne[iCos + 1] === '@';
        const domaines = ligne.slice(0, iCos);
        const sel = ligne.slice(iCos + (exception ? 3 : 2)).trim();
        if (!sel || NON_CSS.test(sel) || sel.startsWith('+js(') || sel.includes('{')) continue;
        const positifs = domaines.split(',').map((d) => d.trim().toLowerCase()).filter((d) => d && d[0] !== '~');
        if (exception) {
          if (positifs.length) for (const d of positifs) ajouter(res.exceptions, d, sel);
          else res.exceptionsGenerales.push(sel);
        } else if (positifs.length) {
          for (const d of positifs) ajouter(res.specifiques, d, sel);
        } else if (!domaines) {
          res.generiques.push(sel);
        }
        res.compte.affichage++;
        continue;
      }
      if (iCos !== -1) continue; // regles de script (#$#, #?#) : non gerees

      // ---- Filtres reseau simples : "||domaine^" et "@@||domaine^", options limitees
      const m = /^(@@)?\|\|([a-z0-9.-]+\.[a-z]{2,})\^(?:\$(.+))?$/i.exec(ligne);
      if (!m) continue;
      const [, autorise, domaine, options = ''] = m;
      let tiers = false;
      const types = [];
      let gerable = true;
      for (const opt of options ? options.split(',') : []) {
        const o = opt.trim().toLowerCase();
        if (o === 'third-party' || o === '3p') tiers = true;
        else if (TYPES[o]) types.push(TYPES[o]);
        else { gerable = false; break; } // domain=, ~type, popup, csp, redirect... : ignores
      }
      if (!gerable) continue;
      const cle = `${tiers ? 'tiers' : 'tous'}|${types.sort().join('+') || '*'}`;
      ajouter(autorise ? res.autoriser : res.bloquer, cle, domaine.toLowerCase());
      res.compte.reseau++;
    }
    return res;
  }

  function nouvelIndex() {
    return {
      specifiques: {}, exceptions: {}, generiques: [], exceptionsGenerales: [],
      bloquer: {}, autoriser: {}, compte: { affichage: 0, reseau: 0 },
    };
  }

  // Domaines a tester pour un hote : a.b.exemple.fr -> a.b.exemple.fr, b.exemple.fr, exemple.fr
  function parents(hote) {
    const p = hote.toLowerCase().replace(/^www\./, '').split('.');
    const out = [];
    for (let i = 0; i < p.length - 1; i++) out.push(p.slice(i).join('.'));
    if (hote.startsWith('www.')) out.unshift(hote.toLowerCase());
    return out;
  }

  // CSS a injecter sur un site : une regle par selecteur (un selecteur invalide
  // est alors simplement ignore par le navigateur, sans annuler les autres).
  function cssPour(index, hote, strict, perso = []) {
    const doms = parents(hote);
    const exclus = new Set(index.exceptionsGenerales);
    for (const d of doms) for (const s of index.exceptions[d] ?? []) exclus.add(s);
    const sels = new Set(perso);
    for (const d of doms) for (const s of index.specifiques[d] ?? []) if (!exclus.has(s)) sels.add(s);
    if (strict) for (const s of index.generiques) if (!exclus.has(s)) sels.add(s);
    let css = '';
    for (const s of sels) css += `${s}{display:none!important}\n`;
    return { css, nombre: sels.size };
  }

  // Regles reseau (mode strict) : domaines regroupes par type -> peu de regles.
  const ID_RESEAU = 2000;
  function reglesReseau(index, sitesDesactives = []) {
    const regles = [];
    let id = ID_RESEAU;
    const bloc = 4000;
    const conv = (cle, action, priorite) => {
      const [portee, types] = cle.split('|');
      return (domaines) => ({
        id: id++, priority: priorite, action: { type: action },
        condition: {
          requestDomains: domaines,
          resourceTypes: types === '*' ? TOUS_TYPES : types.split('+'),
          ...(portee === 'tiers' ? { domainType: 'thirdParty' } : {}),
        },
      });
    };
    for (const [quoi, action, prio] of [['bloquer', 'block', 1], ['autoriser', 'allow', 2]]) {
      for (const [cle, doms] of Object.entries(index[quoi])) {
        const uniques = [...new Set(doms)];
        const faire = conv(cle, action, prio);
        for (let i = 0; i < uniques.length; i += bloc) regles.push(faire(uniques.slice(i, i + bloc)));
      }
    }
    // Sites ou l'utilisateur a desactive le bloqueur : tout est autorise.
    if (sitesDesactives.length) {
      regles.push({ id: id++, priority: 10, action: { type: 'allowAllRequests' },
        condition: { requestDomains: sitesDesactives, resourceTypes: ['main_frame', 'sub_frame'] } });
    }
    return regles;
  }

  // ---- Stockage / mise a jour --------------------------------------------
  let cache = null;

  async function index() {
    if (cache) return cache;
    const { indexListes } = await api.storage.local.get('indexListes');
    cache = indexListes ?? nouvelIndex();
    return cache;
  }

  async function mettreAJour() {
    const res = nouvelIndex();
    const etat = [];
    for (const src of SOURCES) {
      try {
        const r = await fetch(src.url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const avant = { ...res.compte };
        analyser(await r.text(), res);
        etat.push({ nom: src.nom, ok: true,
          affichage: res.compte.affichage - avant.affichage, reseau: res.compte.reseau - avant.reseau });
      } catch (e) {
        etat.push({ nom: src.nom, ok: false, erreur: String(e?.message ?? e) });
      }
    }
    if (etat.some((e) => e.ok)) {
      cache = res;
      await api.storage.local.set({ indexListes: res });
    }
    await api.storage.local.set({ etatListes: { date: Date.now(), sources: etat } });
    return etat;
  }

  return { SOURCES, analyser, nouvelIndex, cssPour, reglesReseau, index, mettreAJour, parents, ID_RESEAU };
})();
