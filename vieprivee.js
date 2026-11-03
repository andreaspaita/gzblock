// Protection de la vie privee : cookies publicitaires, pistage, signal "ne pas me suivre".
//
// Discretion : rien n'est bloque. Les requetes vers les regies partent normalement
// (le site ne voit aucune erreur), mais SANS cookie : la regie ne peut plus relier
// la visite a votre profil, les pubs deviennent anonymes.
'use strict';

globalThis.viePrivee = (() => {
  const api = globalThis.browser ?? globalThis.chrome;

  // Regies et traqueurs purs : on retire les cookies partout, cadres compris.
  const REGIES = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adservice.google.com',
    'google-analytics.com', 'googletagmanager.com', 'amazon-adsystem.com', 'adnxs.com',
    'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'smartadserver.com', 'teads.tv',
    'pubmatic.com', 'rubiconproject.com', 'openx.net', 'casalemedia.com', 'adform.net',
    'adsrvr.org', 'yieldlove.com', 'media.net', '3lift.com', 'sharethrough.com', 'moatads.com',
    'seedtag.com', 'ogury.io', 'adyoulike.com', 'aniview.com', 'connatix.com', 'primis.tech',
    'vidazoo.com', 'invibes.com', 'missena.io', 'sublime.xyz', 'bidswitch.net', 'quantserve.com',
    'scorecardresearch.com', 'demdex.net', 'everesttech.net', 'bluekai.com', 'krxd.net',
    'mathtag.com', 'tapad.com', 'agkn.com', 'rlcdn.com', 'id5-sync.com', 'liadm.com',
    'hotjar.com', 'clarity.ms', 'bat.bing.com', 'ads-twitter.com', 'analytics.tiktok.com',
    'ads.linkedin.com', 'px.ads.linkedin.com', 'snap.licdn.com', 'ct.pinterest.com',
    'sc-static.net', 'tr.snapchat.com', 'mediarithmics.com', 'weborama.fr', 'weborama.com',
  ];

  // Reseaux sociaux : on retire les cookies seulement sur leurs PIXELS de pistage
  // (images, scripts, requetes), pas sur leurs cadres (bouton "J'aime", connexion,
  // commentaires) qui restent fonctionnels.
  const SOCIAUX = ['facebook.com', 'facebook.net', 'connect.facebook.net', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'pinterest.com', 'snapchat.com'];

  // Cookies publicitaires/de pistage deposes sur le site lui-meme (1re partie).
  const COOKIES_PISTAGE = [
    /^__gads$/, /^__gpi$/, /^__eoi$/, /^_gcl_/, /^_ga$/, /^_ga_/, /^_gid$/, /^_gat/,
    /^_fbp$/, /^_fbc$/, /^_uetsid$/, /^_uetvid$/, /^_ttp$/, /^_tt_enable_cookie$/,
    /^_pin_unauth$/, /^_pinterest_ct/, /^_rdt_uuid$/, /^_scid/, /^li_fat_id$/, /^_hj/,
    /^_clck$/, /^_clsk$/, /^IDE$/, /^test_cookie$/, /^_cc_/, /^criteo/i, /^cto_/,
  ];

  // Parametres de pistage ajoutes aux liens (pubs, newsletters, reseaux sociaux).
  const PARAMS_PISTAGE = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'gbraid', 'wbraid', 'dclid', 'fbclid', 'msclkid', 'yclid', 'twclid', 'ttclid',
    'igshid', 'mc_eid', '_hsenc', '_hsmi', 'mkt_tok', 'li_fat_id', 'srsltid',
  ];

  const REGLAGES_DEFAUT = {
    cookiesPub: true,      // retirer / supprimer les cookies publicitaires
    cookiesTiers: true,    // bloquer tous les cookies tiers du navigateur
    gpc: true,             // envoyer le signal "ne pas vendre / partager mes donnees"
    liensPropres: true,    // retirer utm_*, gclid, fbclid... des adresses
  };

  const TYPES_SANS_CADRE = ['script', 'image', 'xmlhttprequest', 'ping', 'media', 'other', 'websocket'];
  const ID = { regies: 1001, sociaux: 1002, gpc: 1004, liens: 1100 }; // liens : 1100, 1101, ...

  function regles(r) {
    const liste = [];
    const sansCookies = {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'cookie', operation: 'remove' }],
      responseHeaders: [{ header: 'set-cookie', operation: 'remove' }],
    };
    if (r.cookiesPub) {
      liste.push({ id: ID.regies, priority: 1, action: sansCookies,
        condition: { requestDomains: REGIES, domainType: 'thirdParty',
          resourceTypes: [...TYPES_SANS_CADRE, 'sub_frame'] } });
      liste.push({ id: ID.sociaux, priority: 1, action: sansCookies,
        condition: { requestDomains: SOCIAUX, domainType: 'thirdParty',
          resourceTypes: TYPES_SANS_CADRE } });
    }
    if (r.liensPropres) {
      // Une regle par parametre, avec un simple urlFilter (pas d'expression reguliere :
      // Chrome refuse les regexFilter qui depassent 2 Ko une fois compilees).
      // "^" = separateur (? ou &) devant le nom, "=" juste apres : on ne declenche
      // la redirection que si le parametre est vraiment present dans l'adresse.
      const retirer = { type: 'redirect', redirect: { transform: { queryTransform: { removeParams: PARAMS_PISTAGE } } } };
      PARAMS_PISTAGE.forEach((param, i) => liste.push({
        id: ID.liens + i, priority: 1, action: retirer,
        condition: { resourceTypes: ['main_frame'], urlFilter: `^${param}=` },
      }));
    }
    if (r.gpc) {
      liste.push({ id: ID.gpc, priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [{ header: 'sec-gpc', operation: 'set', value: '1' }] },
        condition: { resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script'] } });
    }
    return liste;
  }

  async function lireReglages() {
    const { reglagesVP = {} } = await api.storage.local.get('reglagesVP');
    return { ...REGLAGES_DEFAUT, ...reglagesVP };
  }

  // Reglages du navigateur lui-meme (API privacy), selon ce que le navigateur propose.
  async function reglerNavigateur(r) {
    const w = api.privacy?.websites;
    if (!w) return;
    // Option active : l'extension impose la valeur protectrice.
    // Option desactivee : on rend la main (le reglage du navigateur redevient celui
    // de l'utilisateur) au lieu de forcer l'inverse.
    const imposer = async (setting, actif, valeurProtectrice) => {
      if (!setting) return; // reglage absent de ce navigateur
      try {
        if (actif) await setting.set({ value: valeurProtectrice });
        else await setting.clear({});
      } catch (_) { /* reglage verrouille par une politique d'entreprise */ }
    };
    // Chrome / Edge / Brave : refuser tous les cookies tiers
    await imposer(w.thirdPartyCookiesAllowed, r.cookiesTiers, false);
    // Firefox : refuser les traqueurs et isoler les autres cookies tiers par site
    await imposer(w.cookieConfig, r.cookiesTiers, { behavior: 'reject_trackers_and_partition_foreign' });
    // Profilage publicitaire integre au navigateur (Privacy Sandbox de Chrome)
    await imposer(w.topicsEnabled, r.cookiesPub, false);
    await imposer(w.fledgeEnabled, r.cookiesPub, false);
    await imposer(w.adMeasurementEnabled, r.cookiesPub, false);
    // <a ping="..."> : signale chaque clic a un serveur de suivi
    await imposer(w.hyperlinkAuditingEnabled, r.cookiesPub, false);
  }

  function estCookiePistage(c) {
    const domaine = c.domain.replace(/^\./, '');
    const surRegie = [...REGIES, ...SOCIAUX.filter((d) => d !== 'x.com')]
      .some((d) => domaine === d || domaine.endsWith('.' + d));
    // Sur les reseaux sociaux, on ne touche qu'aux cookies de pistage connus
    // (sinon on vous deconnecterait de Facebook, LinkedIn...).
    const social = SOCIAUX.some((d) => domaine === d || domaine.endsWith('.' + d));
    // "fr" = cookie publicitaire de Facebook ("datr", lie a la securite du compte, est garde).
    if (social) return COOKIES_PISTAGE.some((re) => re.test(c.name)) || (c.name === 'fr' && /facebook\.com$/.test(domaine));
    return surRegie || COOKIES_PISTAGE.some((re) => re.test(c.name));
  }

  let aCompter = 0;
  let comptagePrevu = false;
  function compter(n) {
    aCompter += n;
    if (comptagePrevu) return;
    comptagePrevu = true;
    setTimeout(async () => {
      comptagePrevu = false;
      const { cookiesSupprimes = 0 } = await api.storage.local.get('cookiesSupprimes');
      await api.storage.local.set({ cookiesSupprimes: cookiesSupprimes + aCompter });
      aCompter = 0;
    }, 1000);
  }

  async function supprimer(c) {
    const url = `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
    const details = { url, name: c.name, storeId: c.storeId };
    if (c.partitionKey) details.partitionKey = c.partitionKey;
    try {
      if (await api.cookies.remove(details)) compter(1);
    } catch (_) { /* cookie deja parti */ }
  }

  async function nettoyerTout() {
    if (!(await lireReglages()).cookiesPub || !api.cookies) return;
    let tous = [];
    try { tous = await api.cookies.getAll({}); } catch (_) { return; }
    // Cookies tiers "partitionnes" (CHIPS) : Chrome les liste a part.
    try { tous = tous.concat(await api.cookies.getAll({ partitionKey: {} })); } catch (_) { /* non gere */ }
    for (const c of tous) if (estCookiePistage(c)) await supprimer(c);
  }

  async function appliquer() {
    const r = await lireReglages();
    // Seulement nos regles (1001 a 1999) : les regles des listes (>= 2000) restent.
    const existantes = (await api.declarativeNetRequest.getDynamicRules())
      .map((x) => x.id).filter((id) => id >= 1000 && id < 2000);
    await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existantes, addRules: [] });
    // Regles ajoutees une par une : si le navigateur en refuse une, les autres
    // protections restent actives (et l'erreur est indiquee dans la console).
    for (const regle of regles(r)) {
      try {
        await api.declarativeNetRequest.updateDynamicRules({ addRules: [regle] });
      } catch (e) {
        console.warn(`Regle ${regle.id} refusee par le navigateur :`, e?.message ?? e);
      }
    }
    try { await reglerNavigateur(r); } catch (e) { console.warn('Reglages navigateur :', e?.message ?? e); }
    if (r.cookiesPub) await nettoyerTout();
  }

  // Supprime les cookies de pistage des qu'un site ou une regie les depose.
  api.cookies?.onChanged.addListener(async ({ removed, cookie }) => {
    if (removed || !estCookiePistage(cookie)) return;
    if (!(await lireReglages()).cookiesPub) return;
    supprimer(cookie);
  });

  return { appliquer, nettoyerTout, REGLAGES_DEFAUT, estCookiePistage, regles };
})();
