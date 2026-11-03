# GZBlock

Bloqueur de pubs discret.

Extension Chrome / Edge / Brave / Firefox qui masque les publicités avec `display: none`.

## Installation

**Chrome, Edge, Brave**
1. Décompresser le dossier `gzblock`.
2. Ouvrir `chrome://extensions` (ou `edge://extensions`).
3. Activer le **Mode développeur** (en haut à droite).
4. Cliquer **Charger l'extension non empaquetée** et choisir le dossier `gzblock`.

**Firefox (128 ou plus récent)**
0. Dans le dossier, renommer `manifest.json` en `manifest-chrome.json`, puis
   `manifest-firefox.json` en `manifest.json` (Firefox n'accepte pas le
   `service_worker` de Chrome, et Chrome refuse le `scripts` de Firefox).
1. Ouvrir `about:debugging#/runtime/this-firefox`.
2. **Charger un module complémentaire temporaire** et choisir `manifest.json`.
3. Dans `about:addons` > l'extension > **Permissions**, autoriser l'accès à tous les sites.
   (Firefox désactive cet accès par défaut ; sans lui, rien n'est masqué.)
   Un module temporaire disparaît au redémarrage de Firefox.

## Utilisation

- Le badge de l'icône indique le nombre de pubs masquées sur la page.
- Clic sur l'icône : désactiver ou réactiver le bloqueur pour le site courant, puis **Recharger la page**.

## Langue

GZBlock suit la langue du navigateur (français si le navigateur est en français, anglais sinon).
Pour forcer une langue : **Options** > **Langue** > Automatique / Français / English.
(English version: `README.md`.)

## Fonctions (comme AdBlock)

| Fonction | Où |
|---|---|
| Listes **EasyList** + **Liste FR** (celles d'AdBlock / Adblock Plus), mises à jour toutes les 24 h | automatique · état dans **Options** |
| **Masquer un élément** : survoler, cliquer, « Masquer » (« Plus large » pour prendre le bloc parent, Échap pour annuler) | menu de l'icône |
| Liste de vos éléments masqués, suppression | **Options** |
| Désactiver / réactiver par site | menu de l'icône · **Options** |
| Compteur de pubs par page | badge de l'icône |
| Mode **Discret** (défaut) ou **Strict** (blocage réseau comme AdBlock) | **Options** |
| Pubs vidéo passées sans casser le lecteur | automatique |
| Cookies publicitaires, pistage, liens nettoyés | menu de l'icône |

### Pourquoi le mode Discret par défaut

Les messages « Impossible de lire cette vidéo, désactivez votre bloqueur » apparaissent
quand le lecteur n'arrive pas à charger sa pub (requête bloquée, kit vidéo masqué).
En mode Discret, rien n'est bloqué : la pub se charge, mais elle est **muette,
invisible et accélérée jusqu'à la fin** ; le lecteur la considère comme vue et lance
la vraie vidéo. Les filtres des listes sont limités à ceux écrits pour chaque site
(ils visent de vraies pubs, pas les « appâts » qui servent à détecter les bloqueurs).

Le mode Strict bloque en plus les requêtes publicitaires et applique tous les filtres
génériques : pages plus légères, mais certains sites détecteront le bloqueur.

## Fonctionnement

1. `hide.css` masque dès le chargement les emplacements des régies connues
   (Google AdSense / Ad Manager, Amazon, Criteo, Taboola, Outbrain, Teads, etc.).
2. `content.js` surveille la page (les pubs arrivent souvent après coup), repère les
   cadres servis par une régie ou au format publicitaire standard dans un bloc « pub »,
   et masque tout le bloc (libellé « Publicité » compris) pour ne pas laisser de trou.

3. Pubs vidéo : la vidéo publicitaire (cadre Google IMA, régie vidéo, fichier 2mdn.net…)
   est rendue muette, invisible et accélérée jusqu'à la fin ; le lecteur du site n'est
   pas touché et lance ensuite la vraie vidéo. Une fenêtre vidéo flottante (collée dans
   un coin de l'écran) qui affiche « Publicité » est retirée entièrement. Même chose pour les fenêtres des régies vidéo (Aniview,
   Connatix, Primis, Vidazoo, Teads…). Cette règle est désactivée sur les sites où la
   vidéo est le contenu (YouTube, Twitch, Netflix, Dailymotion, TF1, France TV…).
4. Plan B : si `display: none` n'a pas d'effet ou si le site le retire (au moins deux
   fois), la pub et son bloc sont réduits à **1 px**, transparents et non cliquables.
   Si un site se bat sans fin, le bloqueur abandonne ce bloc après 50 essais pour ne
   pas ralentir la page ; la pub elle-même reste alors réduite à 1 px.

## Vie privée (réglages dans le popup, valables pour tous les sites)

| Option (activée par défaut) | Effet |
|---|---|
| Cookies publicitaires | Les requêtes vers ~70 régies et traqueurs partent **sans cookie** (pubs anonymes, rien ne casse). Les cookies de pistage déjà présents sont supprimés, et ceux déposés ensuite le sont aussitôt (`_ga`, `__gads`, `_fbp`, `IDE`, Criteo…). Désactive aussi le profilage publicitaire intégré à Chrome (Topics, Protected Audience, mesure pub) et le suivi des clics `<a ping>`. |
| Bloquer les cookies tiers | Réglage du navigateur : plus aucun cookie tiers (Chrome) ; traqueurs refusés et cookies isolés par site (Firefox). Peut gêner un bouton « Se connecter avec… » intégré : décochez si besoin. |
| Signal « Ne pas me suivre » (GPC) | Envoie `Sec-GPC: 1` : refus légal de vente/partage de vos données (reconnu en Californie, au Colorado, etc.). |
| Nettoyer les liens | Retire `utm_*`, `gclid`, `fbclid`, `msclkid`… des adresses visitées. |

Conservés volontairement : cookies de session, de panier, de connexion (Facebook, LinkedIn,
Google…), et le cookie de sécurité `datr` de Facebook. Décocher une option rend le réglage
correspondant au navigateur (l'extension ne force pas l'inverse).

## Discrétion

- Aucun blocage réseau : les scripts publicitaires se chargent normalement.
- Aucune classe ni attribut ajouté aux éléments de la page.
- Les « appâts » anti-adblock (blocs vides `.ads`, `.adsbox`, `.ad-banner`…) ne sont jamais masqués.
- Feuille de style et script d'extension invisibles pour le JavaScript du site.

Limites : aucun bloqueur n'est indétectable à 100 %. Un site peut mesurer qu'un
emplacement de pub a une hauteur nulle, ou exiger un retour de la régie publicitaire.
Les pubs intégrées dans les vidéos YouTube / Twitch ne sont pas concernées.
Si un site détecte encore le bloqueur : vérifiez que le mode Discret est choisi et
qu'aucun autre bloqueur (AdBlock, uBlock…) n'est actif, puis rechargez la page.
