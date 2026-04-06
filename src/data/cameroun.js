// ══════════════════════════════════════════════════════════════
//  Données Cameroun — villes, coordonnées, trajets populaires
// ══════════════════════════════════════════════════════════════

export const CITIES_CM = [
  // Grandes villes
  { name: 'Douala',        lat: 4.0511,  lng: 9.7679,  region: 'Littoral',       pop: 4 },
  { name: 'Yaoundé',       lat: 3.8480,  lng: 11.5021, region: 'Centre',         pop: 4 },
  { name: 'Bafoussam',     lat: 5.4737,  lng: 10.4179, region: 'Ouest',          pop: 3 },
  { name: 'Bamenda',       lat: 5.9597,  lng: 10.1460, region: 'Nord-Ouest',     pop: 3 },
  { name: 'Garoua',        lat: 9.3017,  lng: 13.3972, region: 'Nord',           pop: 3 },
  { name: 'Ngaoundéré',    lat: 7.3261,  lng: 13.5841, region: 'Adamaoua',       pop: 3 },
  { name: 'Bertoua',       lat: 4.5778,  lng: 13.6855, region: 'Est',            pop: 2 },
  { name: 'Ebolowa',       lat: 2.9000,  lng: 11.1500, region: 'Sud',            pop: 2 },
  { name: 'Kribi',         lat: 2.9394,  lng: 9.9073,  region: 'Sud',            pop: 2 },
  { name: 'Buea',          lat: 4.1527,  lng: 9.2432,  region: 'Sud-Ouest',      pop: 2 },
  { name: 'Limbe',         lat: 4.0167,  lng: 9.2000,  region: 'Sud-Ouest',      pop: 2 },
  { name: 'Kumba',         lat: 4.6366,  lng: 9.4467,  region: 'Sud-Ouest',      pop: 2 },
  { name: 'Edéa',          lat: 3.8000,  lng: 10.1333, region: 'Littoral',       pop: 2 },
  { name: 'Nkongsamba',    lat: 4.9500,  lng: 9.9333,  region: 'Littoral',       pop: 2 },
  { name: 'Maroua',        lat: 10.5910, lng: 14.3163, region: 'Extrême-Nord',   pop: 3 },
  { name: 'Kousséri',      lat: 12.0775, lng: 15.0314, region: 'Extrême-Nord',   pop: 2 },
  { name: 'Meiganga',      lat: 6.5200,  lng: 14.2987, region: 'Adamaoua',       pop: 1 },
  { name: 'Tibati',        lat: 6.4667,  lng: 12.6167, region: 'Adamaoua',       pop: 1 },
  { name: 'Sangmélima',    lat: 2.9333,  lng: 11.9833, region: 'Sud',            pop: 1 },
  { name: 'Mbalmayo',      lat: 3.5197,  lng: 11.5006, region: 'Centre',         pop: 1 },
  { name: 'Obala',         lat: 4.1667,  lng: 11.5333, region: 'Centre',         pop: 1 },
  { name: 'Bafia',         lat: 4.7333,  lng: 11.2333, region: 'Centre',         pop: 1 },
  { name: 'Dschang',       lat: 5.4500,  lng: 10.0667, region: 'Ouest',          pop: 2 },
  { name: 'Foumban',       lat: 5.7197,  lng: 10.9057, region: 'Ouest',          pop: 2 },
  { name: 'Mbouda',        lat: 5.6333,  lng: 10.2500, region: 'Ouest',          pop: 1 },
  { name: 'Wum',           lat: 6.3833,  lng: 10.0667, region: 'Nord-Ouest',     pop: 1 },
  { name: 'Kumbo',         lat: 6.2000,  lng: 10.6667, region: 'Nord-Ouest',     pop: 1 },
  { name: 'Mbengwi',       lat: 6.0000,  lng: 10.0000, region: 'Nord-Ouest',     pop: 1 },
  { name: 'Ndu',           lat: 6.5833,  lng: 10.9667, region: 'Nord-Ouest',     pop: 1 },
  { name: 'Tchollire',     lat: 8.4000,  lng: 14.1667, region: 'Nord',           pop: 1 },
  { name: 'Poli',          lat: 8.4667,  lng: 13.2333, region: 'Nord',           pop: 1 },
  { name: 'Guider',        lat: 9.9333,  lng: 13.9500, region: 'Nord',           pop: 1 },
  { name: 'Kaélé',         lat: 10.1000, lng: 14.4500, region: 'Extrême-Nord',   pop: 1 },
  { name: 'Mora',          lat: 11.0456, lng: 14.1477, region: 'Extrême-Nord',   pop: 1 },
  { name: 'Yokadouma',     lat: 3.5194,  lng: 15.0553, region: 'Est',            pop: 1 },
  { name: 'Batouri',       lat: 4.4333,  lng: 14.3667, region: 'Est',            pop: 1 },
  { name: 'Abong-Mbang',   lat: 3.9833,  lng: 13.1833, region: 'Est',            pop: 1 },
]

// ── Trajets populaires au Cameroun ────────────────────────────
export const POPULAR_ROUTES_CM = [
  { from: 'Douala',    to: 'Yaoundé',    emoji: '🏙️', trips: '2 400', price: 3500  },
  { from: 'Yaoundé',  to: 'Bafoussam',  emoji: '🌄', trips: '980',   price: 4000  },
  { from: 'Douala',   to: 'Bafoussam',  emoji: '🏔️', trips: '870',   price: 4500  },
  { from: 'Yaoundé',  to: 'Kribi',      emoji: '🏖️', trips: '650',   price: 3000  },
  { from: 'Douala',   to: 'Limbe',      emoji: '🌊', trips: '540',   price: 1500  },
  { from: 'Bafoussam',to: 'Bamenda',    emoji: '⛰️', trips: '430',   price: 2000  },
]

// ── Distances réelles en km + durée en minutes ────────────────
// Format : [km, minutes]
export const DISTANCES_CM = {
  'Douala-Yaoundé':     [244, 240], 'Yaoundé-Douala':     [244, 240],
  'Douala-Bafoussam':   [242, 210], 'Bafoussam-Douala':   [242, 210],
  'Douala-Buea':         [68,  60], 'Buea-Douala':         [68,  60],
  'Douala-Limbe':        [72,  65], 'Limbe-Douala':        [72,  65],
  'Douala-Kumba':       [115, 120], 'Kumba-Douala':       [115, 120],
  'Douala-Edéa':         [60,  55], 'Edéa-Douala':         [60,  55],
  'Douala-Nkongsamba':  [153, 150], 'Nkongsamba-Douala':  [153, 150],
  'Douala-Kribi':       [170, 150], 'Kribi-Douala':       [170, 150],
  'Yaoundé-Bafoussam':  [299, 180], 'Bafoussam-Yaoundé':  [299, 180],
  'Yaoundé-Kribi':      [190, 180], 'Kribi-Yaoundé':      [190, 180],
  'Yaoundé-Ebolowa':    [155, 150], 'Ebolowa-Yaoundé':    [155, 150],
  'Yaoundé-Bertoua':    [355, 300], 'Bertoua-Yaoundé':    [355, 300],
  'Yaoundé-Ngaoundéré': [524, 480], 'Ngaoundéré-Yaoundé': [524, 480],
  'Yaoundé-Mbalmayo':    [45,  50], 'Mbalmayo-Yaoundé':    [45,  50],
  'Bafoussam-Bamenda':   [88,  90], 'Bamenda-Bafoussam':   [88,  90],
  'Bafoussam-Dschang':   [45,  50], 'Dschang-Bafoussam':   [45,  50],
  'Bafoussam-Foumban':   [72,  80], 'Foumban-Bafoussam':   [72,  80],
  'Ngaoundéré-Garoua':  [228, 240], 'Garoua-Ngaoundéré':  [228, 240],
  'Garoua-Maroua':      [200, 180], 'Maroua-Garoua':      [200, 180],
}

// ── Calcule distance à vol d'oiseau entre deux villes (km) ────
export const haversineKm = (fromName, toName) => {
  const a = CITIES_CM.find(c => c.name === fromName)
  const b = CITIES_CM.find(c => c.name === toName)
  if (!a || !b) return null
  const R   = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const sin2 = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.asin(Math.sqrt(sin2)))
}

// ── Formater un prix en FCFA ──────────────────────────────────
export const fmtFCFA = (amount) => {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

// ── Suggérer un prix de trajet ────────────────────────────────
export const suggestPriceCM = (from, to) => {
  const key  = `${from}-${to}`
  const data = DISTANCES_CM[key]
  if (data) return Math.round(data[0] * 16 / 100) * 100  // ~16 FCFA/km arrondi
  return 3000
}

export const estimateDurationCM = (from, to) => {
  const key  = `${from}-${to}`
  const data = DISTANCES_CM[key]
  const mins = data ? data[1] : 120
  const h    = Math.floor(mins / 60)
  const m    = mins % 60
  return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h00`
}

export const getRouteKm = (from, to) => {
  const key  = `${from}-${to}`
  const data = DISTANCES_CM[key]
  if (data) return data[0]
  return null
}
