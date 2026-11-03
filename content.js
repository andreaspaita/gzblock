// Detecte les publicites et masque leur emplacement avec display: none.
//
// Discretion :
//  - aucun blocage reseau : les scripts publicitaires se chargent normalement, donc
//    les tests "le script de pub a-t-il charge ?" ne voient rien d'anormal ;
//  - aucun attribut ni classe ajoute (rien a reperer avec un MutationObserver
//    sur les attributs data-* / class) ;
//  - les "appats" anti-adblock (blocs vides nommes .ads, .adsbox...) ne sont
//    JAMAIS masques : on ne masque un bloc que s'il contient une vraie pub ;
//  - ce script tourne dans un monde isole : le site ne voit pas ses variables.
(() => {
  'use strict';
  if (window.__bloqueurPubsCharge) return;
  window.__bloqueurPubsCharge = true; // invisible pour le site (monde isole)

  const api = globalThis.browser ?? globalThis.chrome;

  // Filtres des listes (EasyList, Liste FR) et filtres perso pour ce site :
  // injectes par l'extension en feuille "utilisateur", invisible pour le site
  // et prioritaire sur ses propres styles.
  try { api.runtime.sendMessage({ type: 'cssSite' }); } catch (_) { /* extension rechargee */ }

  // Regies publicitaires (domaine exact ou sous-domaine).
  const DOMAINES_PUB = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adservice.google.com', 'amazon-adsystem.com', 'adnxs.com', 'criteo.com',
    'criteo.net', 'taboola.com', 'outbrain.com', 'smartadserver.com', 'teads.tv',
    'pubmatic.com', 'rubiconproject.com', 'openx.net', 'casalemedia.com',
    'adform.net', 'adsrvr.org', 'yieldlove.com', 'media.net', '3lift.com',
    'sharethrough.com', 'moatads.com', 'seedtag.com', 'ogury.io', 'adyoulike.com',
    // Pubs video (lecteurs flottants, "outstream", pre-roll)
    // (imasdk.googleapis.com, le kit video de Google, n'est PAS masque : le cacher
    //  fait planter le lecteur, qui affiche alors "desactivez votre bloqueur".)
    '2mdn.net', 'aniview.com', 'connatix.com', 'primis.tech',
    'vidazoo.com', 'ex.co', 'viously.com', 'invibes.com', 'missena.io',
    'sublime.xyz', 'spotxchange.com', 'springserve.com', 'freewheel.tv', 'stickyadstv.com',
  ];

  // Sites dont la video EST le contenu : on n'y applique pas la detection
  // "texte Publicite dans un lecteur video" (sinon on masquerait le lecteur entier).
  const SITES_VIDEO = [
    'youtube.com', 'youtu.be', 'youtube-nocookie.com', 'twitch.tv', 'dailymotion.com',
    'vimeo.com', 'netflix.com', 'primevideo.com', 'disneyplus.com', 'canalplus.com',
    'mycanal.fr', 'tf1.fr', 'france.tv', 'arte.tv', '6play.fr', 'm6.fr', 'molotov.tv',
    'tiktok.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com',
    'spotify.com', 'deezer.com', 'kick.com',
  ];
  const SITE_VIDEO = SITES_VIDEO.some((d) => location.hostname === d || location.hostname.endsWith('.' + d));

  // Texte affiche par les lecteurs video pendant une pub ("Publicite - Fin dans 3s"...).
  const TEXTE_PUB_VIDEO = /(publicit[ée]|advertisement|annonce publicitaire|sponsoris[ée]|skip ad|passer (la )?pub|ad\s*[·•:]\s*\d)/i;

  // Selecteurs fiables (memes que hide.css) : vrais emplacements de regies.
  const SELECTEURS = [
    'ins.adsbygoogle[data-ad-client]', 'ins.adsbygoogle[data-ad-slot]',
    'div[id^="div-gpt-ad-"]', 'div[id^="google_ads_iframe_"]', 'div[data-google-query-id]',
    'div[id^="taboola-"]', '.trc_rbox_container', '.OUTBRAIN', 'div[id^="outbrain_widget"]',
    'amp-ad', 'amp-sticky-ad',
  ].join(',');

  // Formats publicitaires standard (IAB), en pixels.
  const FORMATS = [
    [300, 250], [336, 280], [728, 90], [970, 90], [970, 250], [160, 600],
    [120, 600], [300, 600], [320, 50], [320, 100], [300, 50], [468, 60], [250, 250],
  ];

  // Noms de blocs qui evoquent une pub (seulement en COMPLEMENT d'une vraie pub).
  const NOM_PUB = /(^|[\s_-])(ad|ads|adv|advert|advertisement|pub|publicite|dfp|gpt|banner|sponsor|sponsored|sponsorise)([\s_-]|\d|$)/i;
  const LIBELLE_PUB = /^(publicit[ée]|advertisement|annonce|sponsoris[ée]|sponsored|pub)$/i;

  const masques = new WeakSet();
  let nombre = 0;

  function estDomainePub(url) {
    if (!url) return false;
    try {
      const h = new URL(url, location.href).hostname;
      return DOMAINES_PUB.some((d) => h === d || h.endsWith('.' + d));
    } catch (_) {
      return false;
    }
  }

  function taille(el) {
    const r = el.getBoundingClientRect();
    return [
      Math.round(r.width) || parseInt(el.getAttribute('width'), 10) || 0,
      Math.round(r.height) || parseInt(el.getAttribute('height'), 10) || 0,
    ];
  }

  function formatPub(el) {
    const [w, h] = taille(el);
    return FORMATS.some(([fw, fh]) => Math.abs(w - fw) <= 2 && Math.abs(h - fh) <= 2);
  }

  function nomEvoquePub(el) {
    const nom = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;
    return NOM_PUB.test(nom);
  }

  function ancetreNommePub(el, niveaux = 4) {
    for (let e = el.parentElement, i = 0; e && i < niveaux; e = e.parentElement, i++) {
      if (nomEvoquePub(e)) return true;
    }
    return false;
  }

  // Une vraie pub = cadre d'une regie, ou cadre vide au format standard place
  // dans un bloc nomme comme une pub (les regies chargent souvent un about:blank).
  function estCadrePub(iframe) {
    if (estDomainePub(iframe.src)) return true;
    if (/^google_ads_iframe/.test(iframe.id)) return true;
    const vide = !iframe.getAttribute('src') || iframe.src === 'about:blank';
    return vide && formatPub(iframe) && ancetreNommePub(iframe);
  }

  // Appat anti-adblock : bloc vide, sans cadre ni image, tout petit ou invisible.
  function estAppat(el) {
    if (el.querySelector('iframe, img, video, ins[data-ad-client]')) return false;
    if (el.textContent.trim()) return false;
    const [w, h] = taille(el);
    return w * h < 2500;
  }

  // Remonte jusqu'au bloc qui ne contient QUE la pub (et eventuellement son
  // libelle "Publicite"), pour ne pas laisser un grand trou vide dans la page.
  function conteneur(el) {
    let cible = el;
    for (let i = 0; i < 4; i++) {
      const parent = cible.parentElement;
      if (!parent || /^(BODY|HTML|MAIN|ARTICLE)$/.test(parent.tagName)) break;
      const autres = [...parent.children].filter((c) => c !== cible);
      const seulementLibelles = autres.every((c) =>
        LIBELLE_PUB.test(c.textContent.trim()) ||
        (!c.textContent.trim() && !c.querySelector('img, video, iframe, a')));
      if (!seulementLibelles) break;
      cible = parent;
    }
    return cible;
  }

  // Plan B : si display:none ne tient pas (le site le retire ou l'ecrase),
  // la pub est reduite a 1 px, transparente et non cliquable. Le bloc garde
  // une taille non nulle, ce qui trompe aussi les tests "hauteur === 0".
  const STYLE_1PX = [
    ['width', '1px'], ['height', '1px'], ['min-width', '0'], ['min-height', '0'],
    ['max-width', '1px'], ['max-height', '1px'], ['padding', '0'], ['margin', '0'],
    ['border', '0'], ['overflow', 'hidden'], ['opacity', '0'], ['pointer-events', 'none'],
    // Les pubs "collantes" (position: fixed) sortiraient du cadre de 1 px.
    ['position', 'static'], ['transform', 'none'], ['animation', 'none'],
  ];
  const cibleVersPub = new WeakMap(); // bloc masque -> element publicitaire d'origine

  function estCache(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return true;
    const r = el.getBoundingClientRect();
    const reduit = (r.width <= 1 && r.height <= 1) ||
      (parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1);
    return reduit && cs.opacity === '0';
  }

  function reduireA1px(el) {
    for (const [p, v] of STYLE_1PX) el.style.setProperty(p, v, 'important');
  }

  const mode1px = new WeakSet();      // blocs ou display:none a echoue
  const retouches = new WeakMap();    // bloc -> nombre de fois ou le site a defait le masquage
  const RETOUCHES_AVANT_1PX = 2;      // le site retire display:none 2 fois -> on passe a 1 px
  const RETOUCHES_MAX = 50;           // au-dela on abandonne ce bloc (evite une boucle infinie)

  function passerEn1px(cible) {
    mode1px.add(cible);
    // On retire display:none : c'est ce que le site combat (et ce qu'il detecte).
    cible.style.removeProperty('display');
    reduireA1px(cible);
    const pub = cibleVersPub.get(cible);
    if (pub && pub !== cible) reduireA1px(pub);
    for (const f of cible.querySelectorAll('iframe, img, video, ins')) reduireA1px(f);
  }

  function appliquer(cible) {
    if (mode1px.has(cible)) { passerEn1px(cible); return; }
    cible.style.setProperty('display', 'none', 'important');
    // display:none sans effet (ecrase par le site) : plan B immediat.
    if (!estCache(cible)) passerEn1px(cible);
  }

  // Le site peut defaire le masquage apres coup (anti-adblock) : on le refait,
  // et s'il insiste, on passe en mode 1 px.
  const gardien = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const cible = m.target;
      if (!masques.has(cible) || estCache(cible)) continue;
      const n = (retouches.get(cible) ?? 0) + 1;
      retouches.set(cible, n);
      if (n > RETOUCHES_MAX) continue;
      if (n >= RETOUCHES_AVANT_1PX) passerEn1px(cible);
      else appliquer(cible);
    }
  });

  function dejaMasque(el) {
    for (let e = el; e; e = e.parentElement) if (masques.has(e)) return true;
    return false;
  }

  // Une video masquee continue de jouer : on coupe le son.
  function couperSon(cible) {
    const videos = cible.tagName === 'VIDEO' ? [cible] : cible.querySelectorAll('video');
    for (const v of videos) { try { v.muted = true; } catch (_) { /* ignore */ } }
  }

  function masquer(el, cibleForcee) {
    const cible = cibleForcee ?? conteneur(el);
    if (masques.has(cible)) return;
    masques.add(cible);
    masques.add(el);
    cibleVersPub.set(cible, el);
    couperSon(cible);
    appliquer(cible);
    gardien.observe(cible, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    nombre++;
    signaler();
  }

  function analyser(racine) {
    if (!(racine instanceof Element)) return;
    const cadres = racine.tagName === 'IFRAME' ? [racine] : racine.querySelectorAll('iframe');
    for (const f of cadres) if (!masques.has(f) && estCadrePub(f)) masquer(f);

    const blocs = racine.matches(SELECTEURS) ? [racine] : racine.querySelectorAll(SELECTEURS);
    for (const b of blocs) if (!masques.has(b) && !estAppat(b)) masquer(b);
  }

  // --- Pubs video : lecteurs flottants et pre-roll -------------------------
  //
  // Principe anti-detection : on ne casse JAMAIS le chargement de la pub (c'est ce
  // que les lecteurs verifient pour afficher "desactivez votre bloqueur"). La pub
  // se charge et "joue", mais sans son, invisible et acceleree jusqu'a la fin :
  // le lecteur la considere comme vue et lance la vraie video.

  // Ce cadre est-il un lecteur de pub (Google IMA, regie video...) ?
  const CADRE_PUB = estDomainePub(location.href) ||
    /(^|\.)imasdk\.googleapis\.com$/.test(location.hostname);

  function passerPub(v) {
    try {
      v.muted = true;
      v.style.setProperty('opacity', '0', 'important');
      if (v.playbackRate < 16) v.playbackRate = 16;
      if (Number.isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.5) {
        v.currentTime = v.duration - 0.1;
      }
    } catch (_) { /* video pas encore prete : on reessaiera */ }
  }

  if (CADRE_PUB) {
    // Toute video de ce cadre est une pub.
    const surVideo = (e) => { if (e.target instanceof HTMLVideoElement) passerPub(e.target); };
    for (const evt of ['play', 'playing', 'loadedmetadata', 'durationchange', 'timeupdate']) {
      document.addEventListener(evt, surVideo, true);
    }
  }

  // Remonte depuis la video jusqu'au lecteur (bloc court, sans le texte de l'article).
  function racineLecteur(el) {
    let r = el;
    for (let i = 0; i < 6; i++) {
      const p = r.parentElement;
      if (!p || /^(BODY|HTML|MAIN|ARTICLE)$/.test(p.tagName)) break;
      if ((p.innerText ?? p.textContent ?? '').length > 400) break;
      r = p;
    }
    return r;
  }

  // Fenetre flottante (position fixed/sticky) qui contient le lecteur, si elle existe.
  function fenetreFlottante(el) {
    for (let e = el, i = 0; e && i < 8; e = e.parentElement, i++) {
      if (/^(BODY|HTML)$/.test(e.tagName)) break;
      const pos = getComputedStyle(e).position;
      if (pos === 'fixed' || pos === 'sticky') {
        const r = e.getBoundingClientRect();
        // Pas un element plein ecran (menu, fond de page...).
        if (r.width * r.height < innerWidth * innerHeight * 0.6) return e;
      }
    }
    return null;
  }

  function analyserVideos() {
    if (CADRE_PUB) {
      for (const v of document.querySelectorAll('video')) passerPub(v);
      return;
    }
    // 1) Lecteur qui affiche "Publicite", "Advertisement", "Fin dans 3s"...
    if (!SITE_VIDEO) {
      for (const v of document.querySelectorAll('video')) {
        if (dejaMasque(v)) continue;
        // Video servie par une regie (ex. 2mdn.net) : pub certaine -> on la passe.
        if (estDomainePub(v.currentSrc || v.src)) { passerPub(v); continue; }
        const lecteur = racineLecteur(v);
        const texte = lecteur.innerText ?? lecteur.textContent ?? '';
        if (!TEXTE_PUB_VIDEO.test(texte)) continue;
        // Fenetre video flottante (coin de l'ecran) : retiree entierement.
        // Lecteur dans la page : on n'y touche pas (c'est le contenu) ; la pub,
        // jouee dans le cadre de la regie, y est deja passee par ce meme script.
        const flottante = fenetreFlottante(lecteur);
        if (flottante) masquer(v, flottante);
      }
    }
    // 2) Cadre d'une regie video dans une fenetre flottante : on retire toute la fenetre
    //    (titre et bouton fermer compris), pas seulement le cadre.
    for (const f of document.querySelectorAll('iframe')) {
      if (!estDomainePub(f.src)) continue;
      const flottante = fenetreFlottante(f);
      if (flottante && !masques.has(flottante)) masquer(f, flottante);
    }
  }
  // Le texte "Publicite - Fin dans 3s" change sans cesse : verification reguliere,
  // limitee aux videos et cadres (peu couteuse).
  setInterval(analyserVideos, 1000);

  // Envoi du compteur au badge de l'icone, regroupe pour limiter les messages.
  let envoiPrevu = false;
  function signaler() {
    if (envoiPrevu) return;
    envoiPrevu = true;
    setTimeout(() => {
      envoiPrevu = false;
      try { api.runtime.sendMessage({ type: 'compteur', nombre }); } catch (_) { /* extension rechargee */ }
    }, 300);
  }

  // Les pubs arrivent souvent apres le chargement : on surveille la page.
  const enAttente = new Set();
  let traitementPrevu = false;
  function planifier(el) {
    enAttente.add(el);
    if (traitementPrevu) return;
    traitementPrevu = true;
    setTimeout(() => {
      traitementPrevu = false;
      const lot = [...enAttente];
      enAttente.clear();
      for (const e of lot) if (e.isConnected) analyser(e);
    }, 150);
  }

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes') planifier(m.target);
      for (const n of m.addedNodes) if (n.nodeType === 1) planifier(n);
    }
  }).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'id'],
  });

  const premierPassage = () => { analyser(document.documentElement); analyserVideos(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', premierPassage, { once: true });
  } else {
    premierPassage();
  }
  // Les cadres vides ne prennent leur taille qu'apres la mise en page.
  window.addEventListener('load', () => setTimeout(premierPassage, 1500), { once: true });
})();
