# Pourboires iOS (IAP consommables) — runbook

Sur l'App Store, un « don » qui soutient le développeur **doit** passer par l'achat
intégré Apple (règle 3.1.1). On implémente donc des **pourboires via IAP
consommables**. Web + Android continuent d'utiliser Stripe (voir `DONATE` dans `app.js`).

Le code est déjà prêt côté app : détection `PLATFORM` + `startDonation()` → `iosTip()`
(dans `app.js`). Il ne reste qu'à créer les produits et brancher RevenueCat.

## 1. App Store Connect — créer 3 produits
Type **Consommable** (ne débloque rien, rachetable), sur les paliers de prix Apple ≈ CHF :

| Identifiant produit | Prix ≈ | Réf. dans `app.js` (`IAP_TIPS`) |
|---|---|---|
| `support_5`  | 5 CHF  | `"5"`  |
| `support_10` | 10 CHF | `"10"` |
| `support_20` | 20 CHF | `"20"` |

- Renseigner **coordonnées bancaires + fiscalité** (Agreements, Tax, and Banking) sinon les IAP ne s'activent pas.
- S'inscrire au **Small Business Program** → commission 15 % au lieu de 30 % (< 1 M$/an).

## 2. RevenueCat
- Créer un projet, y lier l'app iOS, importer les 3 produits.
- Récupérer la **clé API publique iOS**.

## 3. Dans le projet Capacitor
```bash
npm i @revenuecat/purchases-capacitor
npx cap sync ios
```
Configurer le SDK **au démarrage** (une fois), p. ex. dans un petit script chargé avant `app.js`
uniquement en natif :
```js
if (window.Capacitor?.getPlatform?.() === "ios") {
  window.Capacitor.Plugins.Purchases.configure({ apiKey: "APPL_xxx" });
}
```

## 4. Finaliser le point d'intégration
Dans `app.js`, fonction `iosTip(amount)` — le bloc `getProducts` → `purchaseStoreProduct`
est déjà écrit ; vérifier les signatures avec la version installée de RevenueCat et ajuster
si besoin. En cas de succès : toast « Merci ! » + `state.donated = true`.

## Notes
- **Pas de montant libre** en IAP → l'option « Autre » est automatiquement masquée sur iOS
  (`IS_IOS` dans `openSupport` / `openDonSheet`).
- **Ne jamais** ouvrir Stripe ni mentionner un paiement externe sur iOS (anti-steering).
- L'argent iOS arrive via **Apple → banque** (payout mensuel), séparé de Stripe.
