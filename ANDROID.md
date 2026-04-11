# Clando — Guide de build Android (Capacitor)

## Prérequis à installer sur votre PC

### 1. Java Development Kit (JDK) 17
https://adoptium.net/fr/temurin/releases/?version=17
→ Téléchargez et installez JDK 17 (LTS)
→ Vérifiez : `java -version` → doit afficher "17.x.x"

### 2. Android Studio
https://developer.android.com/studio
→ Téléchargez et installez Android Studio
→ Au premier lancement, installez :
   - Android SDK (API 33 minimum)
   - Android Emulator
   - Intel HAXM (pour l'émulateur)

### 3. Variables d'environnement (Windows)
Ajoutez dans les variables système :
```
ANDROID_HOME = C:\Users\VOTRE_NOM\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot
```
Ajoutez dans PATH :
```
%ANDROID_HOME%\tools
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\build-tools\33.0.0
```

---

## Étapes de build (une seule fois)

### Étape 1 — Configurer votre backend en production
Avant de builder l'APK, votre backend doit être accessible sur Internet.
Options :
- Déployer sur Railway, Render, ou un VPS
- Utiliser ngrok temporairement pour les tests : `ngrok http 5000`

Puis dans `clando/.env` :
```
VITE_API_URL=https://votre-backend.railway.app
```

### Étape 2 — Initialiser le projet Android (1 seule fois)
```bash
cd clando
npm run android:init
```
→ Crée le dossier `android/` avec le projet Android Studio

### Étape 3 — Builder et synchroniser
```bash
npm run android:sync
```
→ Compile le React (dist/) et copie dans Android

### Étape 4 — Ouvrir dans Android Studio
```bash
npm run android:open
```
→ Android Studio s'ouvre avec votre projet

### Étape 5 — Lancer sur émulateur ou téléphone
Dans Android Studio :
- Créez un émulateur (AVD Manager → Create Virtual Device)
- Ou connectez votre téléphone Android en USB avec le mode développeur activé
- Cliquez sur ▶ Run

---

## Générer l'APK installable

### APK de test (debug)
```bash
npm run android:build
```
→ Fichier généré : `android/app/build/outputs/apk/debug/app-debug.apk`

Installez sur votre téléphone :
1. Envoyez l'APK par email ou WhatsApp
2. Sur le téléphone : Paramètres → Sécurité → Sources inconnues → Autoriser
3. Ouvrez le fichier APK → Installer

### APK de release (pour le Play Store)
Dans Android Studio :
1. Build → Generate Signed Bundle/APK
2. APK → Next
3. Créez un keystore (gardez-le précieusement !)
4. Remplissez les infos → Finish
5. → `android/app/release/app-release.apk`

---

## Personnalisation de l'app

### Nom de l'app
Dans `android/app/src/main/res/values/strings.xml` :
```xml
<string name="app_name">Clando</string>
```

### Icône de l'app
1. Dans Android Studio : File → New → Image Asset
2. Choisissez votre icône (logo192.svg ou PNG 512x512)
3. Android génère toutes les tailles automatiquement

### Couleur de la barre de statut
Déjà configuré dans `capacitor.config.ts` :
```
StatusBar: { backgroundColor: '#1A9E8A' }
```

### Splash screen
Déjà configuré : fond teal + 2 secondes au démarrage

---

## Mise à jour de l'app après modification du code

```bash
npm run android:sync    # rebuilder + sync
npm run android:open    # rouvrir Android Studio
# puis Run dans Android Studio
```

---

## Publier sur le Play Store

### Compte développeur Google
- Frais uniques : 25$ (~15 000 FCFA)
- https://play.google.com/console

### Étapes
1. Générer l'APK release signé (voir ci-dessus)
2. Créer votre app sur la Play Console
3. Remplir : description, captures d'écran, politique de confidentialité
4. Uploader l'APK
5. Soumettre pour review (1-3 jours)

---

## Flux de travail quotidien

```bash
# Modifier le code React normalement
npm run dev   # tester dans le navigateur

# Quand prêt pour l'app Android :
npm run android:sync   # build + sync
# Tester sur émulateur ou téléphone via Android Studio
```

---

## Fonctionnalités natives disponibles avec Capacitor

| Plugin | Usage |
|--------|-------|
| @capacitor/camera | Photo de profil depuis la caméra |
| @capacitor/geolocation | Position GPS du conducteur |
| @capacitor/push-notifications | Notifications push Android |
| @capacitor/share | Partager un trajet |
| @capacitor/haptics | Vibration au clic |
| @capacitor/local-notifications | Rappels locaux |

Installation : `npm install @capacitor/camera && npx cap sync`

---

## Dépannage fréquent

**"ANDROID_HOME not set"**
→ Vérifiez les variables d'environnement, redémarrez le terminal

**"SDK location not found"**
→ Dans Android Studio : File → Project Structure → SDK Location
→ Copiez le chemin dans ANDROID_HOME

**L'app ne se connecte pas au backend**
→ Vérifiez que VITE_API_URL pointe vers une URL accessible depuis Internet
→ L'app Android ne peut PAS appeler localhost

**Écran blanc au démarrage**
→ Vérifiez la console : `adb logcat | grep Clando`
→ Souvent une erreur d'URL API
