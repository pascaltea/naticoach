# 🇨🇭 NatiCoach — entraînement à la naturalisation suisse

Web-app (PWA) moderne pour s'entraîner au test de naturalisation, avec **explications de
contexte illustrées** et **suivi de la progression du score**. Fonctionne sur iPhone et
Android, s'installe sur l'écran d'accueil et marche **hors-ligne**.

## ✨ Fonctionnalités
- Quiz d'entraînement (10 questions aléatoires) ou révision par thème
- Feedback immédiat + **explication pédagogique** avec **illustration** quand c'est utile
- Suivi de progression : anneau de préparation, meilleur score, série de jours, **courbe d'évolution**
- Maîtrise par thème (Histoire, Géographie, Institutions, Société, Symboles)
- Emplacement **Premium « Questions communales 2026 »** prêt pour la monétisation
- 100 % local (aucune donnée envoyée), installable, hors-ligne

## ▶️ Lancer l'app

### Sur l'ordinateur
```bash
cd ~/Naturalisation
python3 -m http.server 4173
```
Puis ouvrir http://localhost:4173

### Sur ton iPhone / Android (recommandé)
Pour l'installer comme une vraie app, il faut la servir en HTTPS. Le plus simple :
1. Va sur https://app.netlify.com/drop
2. Glisse-dépose le dossier `Naturalisation` entier
3. Ouvre l'URL fournie sur ton téléphone
4. **iPhone** : bouton Partager → « Sur l'écran d'accueil ».
   **Android** : menu ⋮ → « Installer l'application ».

> Alternative gratuite équivalente : GitHub Pages, Vercel, Cloudflare Pages.

## 🧩 Ajouter / modifier des questions
Tout est dans [`questions.js`](questions.js). Chaque question :
```js
{
  id: "h6", cat: "histoire",
  q: "Ta question ?",
  options: ["A", "B", "C", "D"],
  answer: 1,                 // index de la bonne réponse
  explanation: "Le contexte à retenir…",
  illustration: "drapeau",   // clé d'un SVG dans illustrations.js, ou null
}
```
Les illustrations SVG sont dans [`illustrations.js`](illustrations.js) (aucune image externe).

## 💰 Passer aux stores et monétiser (étape suivante)
Cette PWA est le socle. Deux voies pour l'App Store / Play Store :

1. **Capacitor** (le plus rapide, réutilise ce code tel quel)
   ```bash
   npm i -g @capacitor/cli
   npx cap init NatiCoach ch.naticoach.app
   npx cap add ios && npx cap add android
   ```
   → publiable sur les deux stores, avec **achats intégrés** (plugin `@capacitor/in-app-purchase`).

2. **Réécriture Expo / React Native** si tu veux du 100 % natif à terme.

Le bouton d'achat (`btnBuy` dans [`app.js`](app.js)) est déjà le point d'accroche pour brancher
l'achat de la banque **« Questions communales 2026 »** (déblocage de la catégorie premium).

## 📁 Structure
```
index.html            interface + écrans
styles.css            design (rouge suisse, cartes, anneaux)
app.js                logique quiz + persistance + graphiques
questions.js          banque de questions + catégories
illustrations.js      illustrations SVG intégrées
manifest.webmanifest  configuration PWA (installation)
sw.js                 service worker (hors-ligne)
icon.svg / icon.png   icône de l'app
```

> ⚠️ Le contenu des questions est fourni à titre d'entraînement pédagogique. Avant une
> publication commerciale, fais valider les questions officielles auprès de ta commune / canton.
