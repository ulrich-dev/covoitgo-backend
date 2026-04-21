# Clando — Build Android (Guide complet)

## Prérequis

| Outil | Version | Lien |
|-------|---------|------|
| Node.js | 18+ | https://nodejs.org |
| JDK | 17 (LTS) | https://adoptium.net |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |

---

## 1. Variables d'environnement (Windows)

Ajoutez dans les variables système :

```
ANDROID_HOME = C:\Users\VOTRE_NOM\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot
```

Ajoutez dans PATH :
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\build-tools\34.0.0
%JAVA_HOME%\bin
```

Vérification :
```bash
java -version   # → "17.x.x"
adb --version   # → "Android Debug Bridge"
```

---

## 2. Étapes de build

### Étape 1 — Configurer le backend
Dans `.env` à la racine :
```
VITE_API_URL=https://votre-backend.railway.app
```

### Étape 2 — Initialiser Android (1 seule fois)
```bash
npm install
npm run android:init
```

### Étape 3 — Configurer les permissions
Dans `android/app/src/main/AndroidManifest.xml` :
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### Étape 4 — Builder
```bash
npm run android:sync   # build React + sync Android
npm run android:open   # ouvrir Android Studio
```

Dans Android Studio → cliquez ▶ Run

---

## 3. Générer l'APK

### APK debug (test)
```bash
npm run android:build
```
Fichier : `android/app/build/outputs/apk/debug/app-debug.apk`

### APK release (Play Store)
```bash
# 1. Créer le keystore (1 seule fois)
keytool -genkey -v -keystore clando.keystore -alias clando -keyalg RSA -keysize 2048 -validity 10000

# 2. Configurer android/app/build.gradle (voir section 5 du guide)

# 3. Builder
npm run android:release
```
Fichier : `android/app/build/outputs/apk/release/app-release.apk`

### AAB pour Play Store (recommandé)
```bash
npm run android:bundle
```
Fichier : `android/app/build/outputs/bundle/release/app-release.aab`

---

## 4. Icône et Splash Screen

- Android Studio → File → New → Image Asset → source : `public/icon-512.svg`
- Splash screen : fond `#1A9E8A`, 2 secondes, plein écran (déjà configuré)

---

## 5. Publier sur le Play Store

- Compte développeur : 25$ unique sur https://play.google.com/console
- Catégorie : Transport & Logistique
- Uploadez l'AAB release

---

## 6. Dépannage

| Erreur | Solution |
|--------|----------|
| ANDROID_HOME not set | Vérifiez les variables système |
| Écran blanc | `adb logcat grep Clando` — vérifiez VITE_API_URL |
| Micro bloqué | Paramètres → Apps → Clando → Permissions → Micro |
| Connexion échouée | VITE_API_URL doit pointer vers Railway (pas localhost) |
