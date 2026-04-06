# 🚗 Covoitgo — Clone BlaBlaCar

Application de covoiturage construite avec React + Vite + React Router.

---

## 📁 Structure du projet

```
covoitgo/
├── index.html                    ← Point d'entrée HTML
├── vite.config.js                ← Config Vite
├── package.json                  ← Dépendances
│
└── src/
    ├── main.jsx                  ← Bootstrap React + Router
    ├── App.jsx                   ← Routes de l'application
    ├── index.css                 ← Styles globaux + design tokens
    │
    ├── context/
    │   └── AuthContext.jsx       ← État global d'authentification
    │
    ├── components/
    │   └── layout/
    │       ├── Navbar.jsx        ← Barre de navigation fixe
    │       └── Footer.jsx        ← Pied de page
    │
    └── pages/
        ├── Home.jsx              ← Page d'accueil + recherche
        ├── Login.jsx             ← Page de connexion
        ├── Register.jsx          ← Inscription en 3 étapes
        └── NotFound.jsx          ← Page 404
```

---

## 🚀 Installation et lancement en local

### Prérequis
- **Node.js** v18 ou supérieur → https://nodejs.org
- **npm** (inclus avec Node.js)

### Étapes

**1. Vérifier que Node.js est installé**
```bash
node --version    # doit afficher v18.x.x ou +
npm --version     # doit afficher 9.x.x ou +
```

**2. Cloner / télécharger le projet**

Si vous avez Git :
```bash
git clone <url-du-repo>
cd covoitgo
```

Ou simplement placer le dossier `covoitgo/` quelque part sur votre machine.

**3. Installer les dépendances**
```bash
cd covoitgo
npm install
```
> ⏳ Cette étape peut prendre 30-60 secondes. Elle télécharge React, Vite, React Router, etc.

**4. Lancer le serveur de développement**
```bash
npm run dev
```

**5. Ouvrir dans le navigateur**
```
http://localhost:5173
```

---

## 📦 Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement (hot reload) |
| `npm run build` | Compile le projet pour la production |
| `npm run preview` | Prévisualise le build de production |

---

## 🗺️ Pages disponibles

| URL | Page |
|-----|------|
| `/` | Accueil — recherche de trajets |
| `/login` | Connexion |
| `/register` | Inscription (3 étapes) |
| `/*` | Page 404 |

---

## 🔮 Prochaines étapes

- [ ] `/publish` — Publier un trajet
- [ ] `/trip/:id` — Détail d'un trajet
- [ ] `/profile` — Profil utilisateur
- [ ] `/messages` — Messagerie
- [ ] Backend Node.js + API REST
- [ ] Base de données PostgreSQL
- [ ] Paiement Stripe
