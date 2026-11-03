# Installer GZBlock sans passer par les boutiques

🇬🇧 *English version: [INSTALL.md](INSTALL.md)*

Ce guide explique comment installer GZBlock directement depuis ses fichiers, sans le
Chrome Web Store ni le site des modules Firefox.

| Navigateur | Fichier à prendre | Installation permanente ? |
|---|---|---|
| Chrome, Edge, Brave, Opera, Vivaldi | `gzblock-chrome-edge-1.4.0.zip` | ✅ Oui |
| Firefox (édition standard) | `gzblock-firefox-1.4.0.zip` | ⚠️ Temporaire (jusqu'au redémarrage) |
| Firefox Developer Edition, Nightly, ESR | `gzblock-firefox-1.4.0.xpi` | ✅ Oui |

Les fichiers sont dans la page **Releases** du dépôt GitHub.

---

## 1. Chrome

1. Téléchargez `gzblock-chrome-edge-1.4.0.zip` et **décompressez-le**. Vous obtenez un
   dossier `gzblock-chrome`.
2. Rangez ce dossier à un endroit **définitif** (par exemple `Documents/Extensions/`).
   Chrome lit l'extension directement dans ce dossier : s'il est supprimé ou déplacé,
   GZBlock disparaît.
3. Ouvrez un nouvel onglet et allez à l'adresse `chrome://extensions`.
4. En haut à droite, activez le **Mode développeur**.
5. Cliquez sur **Charger l'extension non empaquetée**.
6. Choisissez le dossier `gzblock-chrome` (celui qui contient `manifest.json`), puis **Sélectionner**.
7. Cliquez sur l'icône 🧩 de la barre d'outils, puis sur la punaise 📌 à côté de GZBlock
   pour garder son icône visible.

> Sous Windows, Chrome peut afficher au démarrage un message sur les « extensions en mode
> développeur ». C'est normal pour une extension installée hors boutique : fermez-le
> simplement, sans désactiver GZBlock.

## 2. Microsoft Edge

1. Décompressez `gzblock-chrome-edge-1.4.0.zip` dans un dossier définitif (voir Chrome, étape 2).
2. Allez à l'adresse `edge://extensions`.
3. Dans le menu de gauche, activez le **Mode développeur**.
4. Cliquez sur **Charger l'extension décompressée** et choisissez le dossier `gzblock-chrome`.
5. Cliquez sur l'icône 🧩, puis sur l'œil 👁 à côté de GZBlock pour l'afficher dans la barre.

## 3. Brave, Opera, Vivaldi

Même fichier et mêmes étapes que Chrome, à ces adresses :

| Navigateur | Adresse | Mode développeur |
|---|---|---|
| Brave | `brave://extensions` | en haut à droite |
| Opera | `opera://extensions` | en haut à droite |
| Vivaldi | `vivaldi://extensions` | en haut à droite |

Puis **Charger l'extension non empaquetée** et choisir le dossier `gzblock-chrome`.

---

## 4. Firefox

Firefox n'installe de façon permanente que les extensions **signées par Mozilla**.
Selon votre version de Firefox, trois possibilités :

### A. Installation temporaire (toutes les versions de Firefox)

Idéal pour essayer. GZBlock est retiré à la fermeture de Firefox.

1. Décompressez `gzblock-firefox-1.4.0.zip` : vous obtenez un dossier `gzblock-firefox`.
2. Allez à l'adresse `about:debugging#/runtime/this-firefox`.
3. Cliquez sur **Charger un module complémentaire temporaire…**
4. Ouvrez le dossier `gzblock-firefox` et choisissez le fichier `manifest.json`.
5. **Étape indispensable**, voir [Autoriser l'accès aux sites](#autoriser-laccès-aux-sites-firefox).

### B. Installation permanente (Firefox Developer Edition, Nightly ou ESR)

Ces versions acceptent les extensions non signées.

1. Allez à l'adresse `about:config` et acceptez l'avertissement.
2. Cherchez `xpinstall.signatures.required` et mettez-le à **false** (double-clic).
3. Allez à l'adresse `about:addons`.
4. Cliquez sur la roue ⚙ puis **Installer un module depuis un fichier…**
5. Choisissez `gzblock-firefox-1.4.0.xpi` et confirmez.
6. **Étape indispensable**, voir [Autoriser l'accès aux sites](#autoriser-laccès-aux-sites-firefox).

> Ce réglage n'a aucun effet dans le Firefox standard : il faut l'option A ou C.

### C. Installation permanente sur le Firefox standard (signature privée)

Mozilla peut signer l'extension **sans la publier** dans sa boutique (distribution
« non listée »). Vous obtenez un `.xpi` signé, installable sur tous vos Firefox.

1. Créez un compte gratuit sur <https://addons.mozilla.org/developers/>.
2. Dans **Outils > Gérer les clés d'API**, générez une clé (identifiant JWT + secret).
3. Dans un terminal, depuis le dossier `gzblock-firefox` :
   ```bash
   npx web-ext sign --channel=unlisted --api-key=VOTRE_IDENTIFIANT --api-secret=VOTRE_SECRET
   ```
4. Le fichier signé apparaît dans le sous-dossier `web-ext-artifacts/`. Installez-le
   comme à l'option B, étapes 3 à 5 (pas besoin de modifier `about:config`).

La signature est automatique et prend en général quelques minutes. L'extension n'est
pas visible publiquement.

### Autoriser l'accès aux sites (Firefox)

Firefox désactive par défaut l'accès des extensions aux sites web. **Sans cette étape,
GZBlock ne masque rien.**

1. Allez à l'adresse `about:addons` et cliquez sur **GZBlock**.
2. Ouvrez l'onglet **Permissions** (ou **Permissions et données** selon la version).
3. Activez **Accéder à vos données pour tous les sites web**.

---

## 5. Vérifier que tout fonctionne

1. L'icône rouge **GZ** apparaît dans la barre d'outils.
2. Ouvrez un site avec des publicités : le chiffre sur l'icône indique le nombre de pubs masquées.
3. Clic droit sur l'icône > **Options** (ou bouton **Options** du menu) : après quelques
   secondes, les listes EasyList et Liste FR affichent **✓ à jour**.

## 6. Mettre à jour

**Chrome, Edge, Brave, Opera, Vivaldi**
1. Décompressez la nouvelle version **à la place** de l'ancienne, dans le même dossier.
2. Dans la page des extensions, cliquez sur **↻ Recharger** sur la carte GZBlock.

Vos réglages et éléments masqués sont conservés.

**Firefox** : réinstallez le nouveau fichier de la même façon que la première fois.

## 7. Désinstaller

- **Chrome / Edge / Brave / Opera / Vivaldi** : page des extensions > **Supprimer** sur
  GZBlock, puis supprimez le dossier.
- **Firefox** : `about:addons` > **…** à côté de GZBlock > **Supprimer**.

GZBlock rend alors au navigateur les réglages qu'il gérait (cookies tiers, etc.).

## 8. Problèmes fréquents

| Problème | Solution |
|---|---|
| « Fichier manifeste manquant ou illisible » | Vous avez choisi le mauvais dossier. Prenez celui qui contient directement `manifest.json` (souvent le dossier *dans* le dossier décompressé). |
| Firefox : « Ce module n'a pas pu être installé car il n'a pas été vérifié » | Firefox standard : utilisez l'option A ou C. |
| Firefox : aucune pub masquée | Autorisez l'accès à tous les sites (voir plus haut). |
| Un site dit encore « désactivez votre bloqueur » | Vérifiez dans les Options que le mode **Discret** est choisi, désactivez tout autre bloqueur (AdBlock, uBlock…), puis rechargez la page. |
| Un bouton rouge « Erreurs » apparaît sur la carte de l'extension | Cliquez dessus et ouvrez une *issue* sur GitHub avec le message affiché. |
| Les extensions sont bloquées par votre entreprise | Votre administrateur a interdit les extensions hors boutique : GZBlock ne peut pas être installé sur ce poste. |
