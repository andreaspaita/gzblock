# Install GZBlock without the stores

🇫🇷 *Version française : [INSTALLATION.md](INSTALLATION.md)*

This guide explains how to install GZBlock straight from its files, without the
Chrome Web Store or the Firefox Add-ons site.

| Browser | File to use | Permanent install? |
|---|---|---|
| Chrome, Edge, Brave, Opera, Vivaldi | `gzblock-chrome-edge-1.4.0.zip` | ✅ Yes |
| Firefox (standard release) | `gzblock-firefox-1.4.0.zip` | ⚠️ Temporary (until restart) |
| Firefox Developer Edition, Nightly, ESR | `gzblock-firefox-1.4.0.xpi` | ✅ Yes |

The files are on the GitHub repository's **Releases** page.

---

## 1. Chrome

1. Download `gzblock-chrome-edge-1.4.0.zip` and **unzip it**. You get a `gzblock-chrome` folder.
2. Put this folder somewhere **permanent** (for example `Documents/Extensions/`).
   Chrome runs the extension straight from this folder: if it is deleted or moved,
   GZBlock disappears.
3. Open a new tab and go to `chrome://extensions`.
4. Top right, turn on **Developer mode**.
5. Click **Load unpacked**.
6. Pick the `gzblock-chrome` folder (the one that contains `manifest.json`), then **Select**.
7. Click the 🧩 icon in the toolbar, then the pin 📌 next to GZBlock to keep its icon visible.

> On Windows, Chrome may show a message about "developer mode extensions" at startup.
> This is normal for an extension installed outside the store: just close it, without
> turning GZBlock off.

## 2. Microsoft Edge

1. Unzip `gzblock-chrome-edge-1.4.0.zip` into a permanent folder (see Chrome, step 2).
2. Go to `edge://extensions`.
3. In the left-hand menu, turn on **Developer mode**.
4. Click **Load unpacked** and pick the `gzblock-chrome` folder.
5. Click the 🧩 icon, then the eye 👁 next to GZBlock to show it in the toolbar.

## 3. Brave, Opera, Vivaldi

Same file and same steps as Chrome, at these addresses:

| Browser | Address | Developer mode |
|---|---|---|
| Brave | `brave://extensions` | top right |
| Opera | `opera://extensions` | top right |
| Vivaldi | `vivaldi://extensions` | top right |

Then **Load unpacked** and pick the `gzblock-chrome` folder.

---

## 4. Firefox

Firefox only installs extensions **signed by Mozilla** permanently.
Depending on your Firefox, there are three ways:

### A. Temporary install (any Firefox)

Good for trying it out. GZBlock is removed when Firefox closes.

1. Unzip `gzblock-firefox-1.4.0.zip`: you get a `gzblock-firefox` folder.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**
4. Open the `gzblock-firefox` folder and pick the `manifest.json` file.
5. **Required step**: see [Allow access to websites](#allow-access-to-websites-firefox).

### B. Permanent install (Firefox Developer Edition, Nightly or ESR)

These versions accept unsigned extensions.

1. Go to `about:config` and accept the warning.
2. Search for `xpinstall.signatures.required` and set it to **false** (double-click).
3. Go to `about:addons`.
4. Click the gear ⚙ then **Install Add-on From File…**
5. Pick `gzblock-firefox-1.4.0.xpi` and confirm.
6. **Required step**: see [Allow access to websites](#allow-access-to-websites-firefox).

> This setting has no effect in standard Firefox: use option A or C.

### C. Permanent install on standard Firefox (private signing)

Mozilla can sign the extension **without publishing it** on its store ("unlisted"
distribution). You get a signed `.xpi` you can install on any Firefox.

1. Create a free account at <https://addons.mozilla.org/developers/>.
2. In **Tools > Manage API Keys**, generate a key (JWT issuer + secret).
3. In a terminal, from the `gzblock-firefox` folder:
   ```bash
   npx web-ext sign --channel=unlisted --api-key=YOUR_ISSUER --api-secret=YOUR_SECRET
   ```
4. The signed file appears in the `web-ext-artifacts/` subfolder. Install it as in
   option B, steps 3 to 5 (no need to change `about:config`).

Signing is automatic and usually takes a few minutes. The extension is not listed publicly.

### Allow access to websites (Firefox)

Firefox turns off extensions' access to websites by default. **Without this step,
GZBlock hides nothing.**

1. Go to `about:addons` and click **GZBlock**.
2. Open the **Permissions** tab (or **Permissions and data**, depending on the version).
3. Turn on **Access your data for all websites**.

---

## 5. Check that it works

1. The red **GZ** icon appears in the toolbar.
2. Open a site with ads: the number on the icon shows how many ads were hidden.
3. Right-click the icon > **Options** (or the **Options** button in the menu): after a few
   seconds, the EasyList and Liste FR lists show **✓ up to date**.

## 6. Update

**Chrome, Edge, Brave, Opera, Vivaldi**
1. Unzip the new version **over** the old one, in the same folder.
2. On the extensions page, click **↻ Reload** on the GZBlock card.

Your settings and hidden elements are kept.

**Firefox**: install the new file the same way as the first time.

## 7. Uninstall

- **Chrome / Edge / Brave / Opera / Vivaldi**: extensions page > **Remove** on GZBlock,
  then delete the folder.
- **Firefox**: `about:addons` > **…** next to GZBlock > **Remove**.

GZBlock then hands back to the browser the settings it managed (third-party cookies, etc.).

## 8. Common problems

| Problem | Fix |
|---|---|
| "Manifest file is missing or unreadable" | Wrong folder. Pick the one that directly contains `manifest.json` (often the folder *inside* the unzipped folder). |
| Firefox: "This add-on could not be installed because it has not been verified" | Standard Firefox: use option A or C. |
| Firefox: no ads hidden | Allow access to all websites (see above). |
| A site still says "disable your ad blocker" | In Options, check that **Discreet** mode is selected, turn off any other ad blocker (AdBlock, uBlock…), then reload the page. |
| A red "Errors" button appears on the extension card | Click it and open a GitHub issue with the message shown. |
| Extensions are blocked by your company | Your administrator has disabled extensions from outside the store: GZBlock can't be installed on that computer. |
