# Configuration Sécurité & mot de passe

## 1. Copier le fichier frontend

```
src/pages/MobileSecurity.jsx  ← nouveau
```

## 2. Ajouter la route dans src/App.jsx

Dans la section mobile, ajoutez :

```jsx
<Route path="/profile/security" element={<MobileSecurity />} />
```

Et importez :

```jsx
import MobileSecurity from './pages/MobileSecurity'
```

## 3. Ajouter la route backend

Dans `backend/routes/auth.js`, **avant** `module.exports = router`, ajoutez :

```js
const bcrypt = require('bcrypt')

router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.session.userId

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mots de passe requis' })
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop faible (8 car. min, 1 majuscule, 1 chiffre)' })
    }

    const user = await queryOne(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [userId]
    )
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' })

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' })

    const newHash = await bcrypt.hash(newPassword, 10)
    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHash, userId]
    )

    res.json({ success: true, message: 'Mot de passe modifié' })
  } catch (err) {
    console.error('password change:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})
```

Assurez-vous que `bcrypt`, `queryOne`, `requireAuth` sont déjà importés dans `auth.js` (en haut).

## 4. Push et redéploiement

```bash
git add backend/routes/auth.js src/pages/MobileSecurity.jsx src/App.jsx
git commit -m "feat: page sécurité et changement mot de passe"
git push
```

Le bouton "Sécurité & mot de passe" dans le profil mobile va maintenant mener à la nouvelle page.
