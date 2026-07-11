# Apps natives iOS + Android (Capacitor) — runbook

L'app web (`/app/`) est empaquetée dans une app native via **Capacitor**. Le projet Capacitor
vit dans **`native/`** (isolé du déploiement web Cloudflare). L'app est **bundlée en local**
(fonctionne hors-ligne, meilleure validation en store) ; les mises à jour de contenu se font
soit par une nouvelle version en store, soit en OTA (Capgo, optionnel — voir plus bas).

> Déjà fait (par Claude) : `native/` scaffoldé — `package.json`, `capacitor.config.json`
> (appId **ch.naticoach.app**, appName **NatiCoach**, webDir **www**), `sync-web.sh`, `.gitignore`.
> Reste : installer les toolchains, ajouter les plateformes, générer icônes, builder, publier.

---

## 0. Prérequis (à ta charge — comptes payants + outils)

**Comptes développeurs**
- **Apple Developer Program** — 99 USD/an — https://developer.apple.com/programs/ (validation ~24-48 h).
- **Google Play Console** — 25 USD une fois — https://play.google.com/console/signup.

**Outils sur le Mac**
- **Xcode** (complet, ~7 Go) depuis le Mac App Store, puis :
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer && sudo xcodebuild -license accept`
- **CocoaPods** : `sudo gem install cocoapods` (ou `brew install cocoapods`).
- **Android Studio** : https://developer.android.com/studio (inclut le SDK Android).
- **JDK 17** : installé avec Android Studio, ou `brew install openjdk@17`.
  Puis renseigner `ANDROID_HOME` (souvent `~/Library/Android/sdk`).

Node/npm sont déjà installés. ✅

---

## 1. Ajouter les plateformes natives (une seule fois)

```bash
cd native
./sync-web.sh                 # recopie ../app dans www
npx cap add ios               # nécessite Xcode + CocoaPods
npx cap add android           # nécessite Android Studio + SDK
```

Ensuite, **à chaque mise à jour du contenu web** :
```bash
cd native
./sync-web.sh                 # recopie www + cap copy
# (si tu as changé de plugins) : npx cap sync
```

---

## 2. Icônes & écran de démarrage

Génère-les depuis l'edelweiss (`app/icon.png`, idéalement une source **1024×1024**) :
```bash
cd native
npm i -D @capacitor/assets
# place une icône 1024 dans native/assets/icon.png (fond brique #C8442E)
npx capacitor-assets generate --iconBackgroundColor '#C8442E' --splashBackgroundColor '#F6F1E7'
```

---

## 3. iOS — build & soumission

```bash
cd native && npx cap open ios     # ouvre le projet dans Xcode
```
Dans Xcode :
1. Cible **App** → onglet **Signing & Capabilities** : coche *Automatically manage signing*,
   choisis ton **Team** (compte Apple Developer). Bundle ID = **ch.naticoach.app**.
2. Renseigne **Display Name** = NatiCoach, version 1.0.0, build 1.
3. Sélectionne un appareil « Any iOS Device (arm64) » → **Product ▸ Archive**.
4. **Distribute App ▸ App Store Connect** → upload.
5. Sur **App Store Connect** (https://appstoreconnect.apple.com) : crée la fiche app
   (nom, sous-titre, description, mots-clés, captures — tu en as dans `screenshots/` et je peux
   t'en générer d'autres), **URL de politique de confidentialité** (voir §5), catégorie
   *Éducation*, classification d'âge. Ajoute le build à **TestFlight** pour tester, puis
   **Soumettre pour examen**.
6. **Dons iOS = achats intégrés obligatoires** (règle Apple 3.1.1) → suis **`IAP-SETUP.md`**
   (produits consommables support_5/10/20 + RevenueCat). Le code est déjà branché
   (`startDonation` → `iosTip` quand `Capacitor.getPlatform()==="ios"`).

---

## 4. Android — build & soumission

```bash
cd native && npx cap open android   # ouvre le projet dans Android Studio
```
Dans Android Studio :
1. `applicationId` = **ch.naticoach.app** (dans `android/app/build.gradle`), versionName 1.0.0.
2. Crée une **clé de signature** (keystore) : *Build ▸ Generate Signed Bundle/APK ▸ Android App Bundle*
   → garde le fichier `.jks` + les mots de passe **en lieu sûr** (perte = plus de mises à jour).
3. Produis un **.aab** (Android App Bundle) signé (release).
4. Sur **Play Console** : crée l'app, remplis la fiche (description, captures, icône), la
   **politique de confidentialité** (§5), le questionnaire *Data safety*, la classification de
   contenu → **test interne** d'abord, puis production.
5. **Dons Android** : ✅ tranché — **don Stripe ouvert dans le navigateur système**
   (plugin `@capacitor/browser`, `donateOpen` dans app.js). Conforme à Google Play car
   c'est un **don réel qui ne débloque aucune fonctionnalité** (app 100 % gratuite),
   traité hors de l'app. Garder le vocabulaire « don / soutenir » (jamais « premium » /
   « débloquer »). Ne PAS passer par Play Billing (réservé au contenu numérique).

---

## 5. À préparer pour les deux stores

- **Politique de confidentialité en ligne (URL publique obligatoire)** : l'app a un écran
  interne, mais les stores exigent une **page web**. À publier (ex. `naticoach.ch/confidentialite`).
  Bon point : l'app **ne collecte rien** (données en localStorage, aucun traceur) → étiquettes
  « Aucune donnée collectée » simples (sauf iOS IAP via RevenueCat → déclarer l'achat).
- **Captures d'écran** par taille d'appareil (iPhone 6.7"/6.5", iPad ; téléphone/tablette Android).
  On en a dans `screenshots/` ; je peux en régénérer aux bons formats via Puppeteer.
- **Textes** : nom, sous-titre, description (FR + langues visées), mots-clés.
- **Classification d'âge**, catégorie **Éducation**, coordonnées de support (`contact@naticoach.ch`).
- **Marque** : ne pas utiliser la croix suisse (LPAP) — l'edelweiss est l'identité. Éviter tout
  terme « officiel » (déjà respecté dans l'app).

---

## 6. Mises à jour de contenu sans re-soumettre (optionnel, plus tard)

Comme l'app est bundlée, une correction de contenu = nouvelle version en store. Pour éviter
la re-review à chaque petite MAJ, on peut brancher **Capgo** (OTA) :
`npm i @capgo/capacitor-updater` + compte Capgo. À évaluer une fois les apps publiées.

---

## Récap de la chaîne de commandes (une fois les outils installés)

```bash
cd native
./sync-web.sh
npx cap add ios && npx cap add android      # 1re fois
npx cap open ios       # → Xcode : signer, archiver, upload
npx cap open android   # → Android Studio : signer, .aab, upload
```
