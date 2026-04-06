# 🛠️ Guide d'installation complet — Covoitgo

## Ce que vous allez installer

| Outil | Rôle |
|-------|------|
| **Node.js** | Fait tourner le serveur backend et le frontend React |
| **PostgreSQL** | Base de données relationnelle |
| **npm** | Gestionnaire de paquets (inclus avec Node.js) |

---

## ÉTAPE 1 — Installer Node.js

1. Allez sur **https://nodejs.org**
2. Téléchargez la version **LTS** (Long Term Support) — ex: 20.x
3. Lancez l'installeur, cliquez "Suivant" jusqu'à la fin
4. Vérifiez l'installation :
   ```bash
   node --version   # doit afficher v20.x.x
   npm --version    # doit afficher 10.x.x
   ```

---

## ÉTAPE 2 — Installer PostgreSQL

### Sur Windows
1. Allez sur **https://www.postgresql.org/download/windows/**
2. Cliquez sur **"Download the installer"** (EnterpriseDB)
3. Téléchargez la dernière version (ex: 16.x)
4. Lancez l'installeur :
   - Composants à cocher : `PostgreSQL Server`, `pgAdmin 4`, `Command Line Tools`
   - **Port** : laissez `5432` (par défaut)
   - **Mot de passe** : choisissez un mot de passe pour l'utilisateur `postgres` — **notez-le !**
   - Laissez tout le reste par défaut
5. Terminez l'installation

### Sur Mac
```bash
# Avec Homebrew (recommandé)
brew install postgresql@16
brew services start postgresql@16

# Ou téléchargez depuis : https://postgresapp.com/
```

### Sur Ubuntu / Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## ÉTAPE 3 — Créer la base de données

### Option A — Via pgAdmin 4 (interface graphique, recommandé pour débutants)

1. Ouvrez **pgAdmin 4** (installé avec PostgreSQL)
2. Dans le panneau gauche, clic droit sur **Servers > PostgreSQL 16 > Databases**
3. Cliquez **"Create > Database..."**
4. Nom de la base : `covoitgo`
5. Cliquez **Save**
6. Clic droit sur la base `covoitgo` > **"Query Tool"**
7. Dans l'éditeur, collez le contenu du fichier `backend/db/schema.sql`
8. Cliquez le bouton **▶ Exécuter** (ou F5)
9. Vous devriez voir "Query returned successfully"

### Option B — Via le terminal

```bash
# Windows (ouvrez "SQL Shell (psql)" dans le menu Démarrer)
# Mac / Linux
psql -U postgres

# Créez la base
CREATE DATABASE covoitgo;
\q

# Appliquez le schéma
psql -U postgres -d covoitgo -f /chemin/vers/covoitgo/backend/db/schema.sql
```

---

## ÉTAPE 4 — Configurer le backend

```bash
# 1. Naviguez dans le dossier backend
cd covoitgo/backend

# 2. Installez les dépendances
npm install

# 3. Créez le fichier .env à partir de l'exemple
cp .env.example .env
```

4. Ouvrez le fichier `.env` dans votre éditeur et remplissez :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=covoitgo
DB_USER=postgres
DB_PASSWORD=VOTRE_MOT_DE_PASSE_POSTGRESQL   ← remplacez ici

PORT=5000
NODE_ENV=development

# Générez une clé secrète avec cette commande :
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=collez_votre_cle_generee_ici

CLIENT_URL=http://localhost:5173
```

---

## ÉTAPE 5 — Configurer le frontend

```bash
# Depuis la racine du projet (dossier covoitgo/)
cp .env.example .env
```

Le fichier `.env` du frontend doit contenir :
```env
VITE_API_URL=http://localhost:5000
```

---

## ÉTAPE 6 — Installer les dépendances frontend

```bash
# Depuis la racine du projet covoitgo/
npm install
```

---

## ÉTAPE 7 — Lancer le projet

Vous avez besoin de **2 terminaux** ouverts en même temps :

### Terminal 1 — Backend
```bash
cd covoitgo/backend
npm run dev
```
Vous devez voir :
```
  🚗  Covoitgo API
  🌐  http://localhost:5000
  ✅  Connecté à PostgreSQL — base: covoitgo
```

### Terminal 2 — Frontend
```bash
cd covoitgo
npm run dev
```
Vous devez voir :
```
  ➜  Local:   http://localhost:5173/
```

### Ouvrez votre navigateur sur : **http://localhost:5173**

---

## Vérifier que tout fonctionne

```bash
# Test de santé de l'API (dans un nouveau terminal)
curl http://localhost:5000/api/health
# Doit retourner : {"status":"ok","server":"Covoitgo API",...}
```

Ou ouvrez directement : **http://localhost:5000/api/health** dans votre navigateur.

---

## Structure finale du projet

```
covoitgo/
├── .env                    ← Variables frontend (VITE_API_URL)
├── .env.example
├── index.html
├── vite.config.js
├── package.json            ← Dépendances frontend
│
├── backend/
│   ├── .env                ← Variables backend (DB, SESSION_SECRET...)
│   ├── .env.example
│   ├── server.js           ← Serveur Express principal
│   ├── package.json        ← Dépendances backend
│   ├── db/
│   │   ├── index.js        ← Pool PostgreSQL
│   │   └── schema.sql      ← Toutes les tables SQL
│   ├── routes/
│   │   ├── auth.js         ← /api/auth/login, register, logout, me
│   │   └── trips.js        ← /api/trips/search, create, book
│   └── middleware/
│       └── auth.js         ← Protection des routes privées
│
└── src/
    ├── context/
    │   └── AuthContext.jsx ← Connexion à l'API réelle avec cookies
    └── pages/
        ├── Login.jsx
        └── Register.jsx
```

---

## Commandes utiles

| Commande | Depuis | Description |
|----------|--------|-------------|
| `npm run dev` | `covoitgo/` | Lance le frontend React |
| `npm run dev` | `covoitgo/backend/` | Lance le backend Express |
| `npm run build` | `covoitgo/` | Compile le frontend pour la prod |

---

## En cas de problème

**"ECONNREFUSED" dans le frontend**
→ Le backend ne tourne pas. Lancez `npm run dev` dans `covoitgo/backend/`

**"password authentication failed for user postgres"**
→ Le mot de passe dans `.env` ne correspond pas à celui choisi lors de l'installation PostgreSQL

**"relation 'session' does not exist"**
→ Le schéma SQL n'a pas été appliqué. Relancez `schema.sql` dans pgAdmin

**Port 5000 déjà utilisé (Mac)**
→ Sur Mac, le port 5000 est parfois pris par AirPlay. Changez `PORT=5001` dans `backend/.env` et `VITE_API_URL=http://localhost:5001` dans `covoitgo/.env`
