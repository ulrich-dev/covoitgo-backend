# Fix erreur gradlew

La commande `npm run android:run` doit être lancée depuis le bon dossier.

## Solution

Dans PowerShell, lancez ces commandes dans l'ordre :

```powershell
# 1. Aller dans le dossier android
cd android

# 2. Donner les droits d'exécution à gradlew
git update-index --chmod=+x gradlew

# 3. Revenir à la racine
cd ..

# 4. Rebuilder le projet
npm run build
npx cap sync android

# 5. Ouvrir dans Android Studio (recommandé)
npx cap open android
```

Dans Android Studio :
- Menu Build → Build Bundle(s) / APK(s) → Build APK(s)
- L'APK sera dans android/app/build/outputs/apk/debug/

## Si gradlew.bat est manquant

```powershell
cd android
# Vérifier que gradlew.bat existe
dir gradlew*
```

Si absent, recréez le dossier android :
```powershell
cd ..
Remove-Item -Recurse -Force android
npx cap add android
npx cap sync android
```
