# Configuration Google SSO — Android Natif

## Pourquoi l'ancien système ne marchait pas

Sur Android Capacitor, l'app tourne dans un WebView avec l'origine `https://localhost`.
Le flux OAuth classique (redirection navigateur → callback → cookie de session) ne fonctionne pas
car les cookies de session Railway ne sont pas partagés avec le WebView.

## La nouvelle architecture

```
[Android]           [Backend Railway]         [Google]
   │                      │                      │
   ├─ GoogleAuth.signIn() ──────────────────────►│
   │                      │             Compte sélectionné
   │◄─── idToken ─────────────────────────────── │
   │                      │                      │
   ├─ POST /api/auth/google-token (idToken) ─────►│
   │                VerifyIdToken()               │
   │◄─── JWT Clando ──────│                      │
   │                      │                      │
   └─ saveToken(jwt) → connecté ✓
```

## Étape 1 — Installer le plugin

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync android
```

## Étape 2 — Créer un Client ID Android dans Google Console

1. Allez sur https://console.cloud.google.com
2. Sélectionnez votre projet Clando
3. APIs & Services → Identifiants → + Créer des identifiants → ID client OAuth 2.0
4. Type d'application : **Android**
5. Nom du package : `cm.clando.app`
6. Empreinte SHA-1 : récupérez-la avec :

```bash
# En debug (développement)
cd android
./gradlew signingReport
# Cherchez la ligne SHA1 sous "Variant: debug"

# Exemple : SHA1: AA:BB:CC:DD:...
```

7. Cliquez Créer → notez le **Client ID Android** (format : `XXX.apps.googleusercontent.com`)

## Étape 3 — Variables d'environnement

### Frontend `.env`
```
VITE_GOOGLE_CLIENT_ID=XXX.apps.googleusercontent.com
```
(Client ID Web OU Android — les deux fonctionnent)

### Backend Railway → Variables
```
GOOGLE_CLIENT_ID=XXX-web.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=XXX-android.apps.googleusercontent.com
```

## Étape 4 — Ajouter la route dans backend/server.js

Dans `backend/server.js`, ajoutez :

```js
const googleTokenRoute = require('./routes/google-token')
// ...
app.use('/api/auth/google-token', googleTokenRoute)
```

## Étape 5 — Installer la dépendance backend

```bash
cd backend
npm install google-auth-library
git add .
git commit -m "feat: Google SSO natif Android"
git push
```

## Étape 6 — Configurer capacitor.config.ts

Dans `capacitor.config.ts`, ajoutez dans `plugins` :

```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: 'VOTRE_CLIENT_ID_WEB.apps.googleusercontent.com',
  forceCodeForRefreshToken: true,
},
```

## Étape 7 — AndroidManifest.xml

Pas de modification nécessaire — le plugin gère tout automatiquement.

## Étape 8 — Rebuilder

```bash
npm run build
npx cap sync android
npx cap open android
# Build → Run dans Android Studio
```

## Test

Cliquez "Continuer avec Google" dans l'app Android.
Un sélecteur de compte natif Google doit apparaître.
Après sélection → connecté automatiquement.
