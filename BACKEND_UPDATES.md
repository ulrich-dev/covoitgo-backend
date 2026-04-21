# Mises à jour Backend — Suivi GPS et avis

## 1. Ajouter la route tracking dans `backend/server.js`

```js
const trackingRoutes = require('./routes/tracking')
// ...
app.use('/api/tracking', trackingRoutes)
```

## 2. Ajouter la migration dans `runMigrations()`

Dans `backend/server.js`, ajouter à la liste :

```js
const files = [
  // ... existing
  'migration_trip_tracking.sql',  // ← ajouter
]
```

## 3. Installer les dépendances

Aucune nouvelle dépendance nécessaire — tout utilise les packages existants.

## 4. Créer la route review pour le mid-trip

Dans `backend/routes/reviews.js`, ajouter :

```js
router.post('/mid-trip', requireAuth, async (req, res) => {
  try {
    const { bookingId, rating } = req.body
    // Sauvegarder si besoin, sinon juste noter le timestamp
    await query(`UPDATE bookings SET mid_trip_rating=$1 WHERE id=$2`, [rating, bookingId]).catch(() => {})
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false })
  }
})
```

Et migration :
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mid_trip_rating SMALLINT;
```

## 5. Créer la route `/api/trips/booking/:id`

Dans `backend/routes/trips.js`, ajouter :

```js
router.get('/booking/:id', requireAuth, async (req, res) => {
  try {
    const booking = await queryOne(
      `SELECT b.*, t.origin_city, t.destination_city, t.origin_lat, t.origin_lon,
              t.destination_lat, t.destination_lon, t.driver_id, t.departure_time
       FROM bookings b JOIN trips t ON t.id = b.trip_id
       WHERE b.id = $1 AND (b.passenger_id = $2 OR t.driver_id = $2)`,
      [req.params.id, req.session.userId]
    )
    if (!booking) return res.status(404).json({ success:false })
    res.json({ success: true, booking })
  } catch {
    res.status(500).json({ success: false })
  }
})
```
