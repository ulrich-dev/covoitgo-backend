// ════════════════════════════════════════════════════════════
//  Clando — Base de données des villes et villages du Cameroun
//  Organisée par région, triée par importance
// ════════════════════════════════════════════════════════════

export const CAMEROON_REGIONS = {
  'Littoral': {
    color: '#0EA5E9',
    cities: [
      'Douala', 'Nkongsamba', 'Edéa', 'Kumba', 'Loum',
      'Mbanga', 'Manjo', 'Melong', 'Ndom', 'Dizangué',
      'Mouanko', 'Yabassi', 'Pouma', 'Logbaba', 'Bonabéri',
      'Bassa', 'Deïdo', 'Akwa', 'Bonanjo', 'Makepe',
      'Ndokoti', 'Bonabéri', 'Nylon', 'Pk8', 'Pk14',
      'Pk19', 'Ngodi', 'Bonamoussadi', 'Kotto', 'Bépanda',
    ]
  },
  'Centre': {
    color: '#8B5CF6',
    cities: [
      'Yaoundé', 'Mbalmayo', 'Bafia', 'Nanga Eboko',
      'Mfou', 'Obala', 'Esse', 'Ngoumou', 'Mbankomo',
      'Monatélé', 'Saa', 'Ntui', 'Akonolinga', 'Évodoula',
      'Minta', 'Bélabo', 'Messondo', 'Ombessa',
      'Efoulan', 'Abong-Mbang', 'Ngog Mapubi', 'Edzendouan',
      'Awae', 'Nkolmesseng', 'Olembe', 'Bastos', 'Mvan',
      'Ekounou', 'Ngousso', 'Emana', 'Nkolbisson',
    ]
  },
  'Ouest': {
    color: '#F59E0B',
    cities: [
      'Bafoussam', 'Mbouda', 'Dschang', 'Foumban', 'Bangangté',
      'Foumbot', 'Bafang', 'Baham', 'Bandjoun', 'Koutaba',
      'Baleveng', 'Balengou', 'Bamendjou', 'Bangou', 'Bamougoum',
      'Bayangam', 'Penka-Michel', 'Galim', 'Massangam', 'Mbouda',
      'Santchou', 'Kekem', 'Batcham', 'Bandrefam', 'Babadjou',
      'Bamendou', 'Nkondjock', 'Kékem', 'Ndoungué', 'Tonga',
    ]
  },
  'Nord-Ouest': {
    color: '#10B981',
    cities: [
      'Bamenda', 'Kumbo', 'Mbengwi', 'Nkambe', 'Wum',
      'Fundong', 'Bali', 'Bafut', 'Santa', 'Ndop',
      'Ndu', 'Jakiri', 'Oku', 'Misaje', 'Mme-Bafumen',
      'Benakuma', 'Njinikom', 'Batibo', 'Balikumbat', 'Bangem',
      'Awing', 'Bova', 'Boyo', 'Sabga', 'Ngomerin',
    ]
  },
  'Sud-Ouest': {
    color: '#06B6D4',
    cities: [
      'Buea', 'Limbe', 'Kumba', 'Mamfe', 'Mundemba',
      'Tiko', 'Muyuka', 'Ekondo Titi', 'Nguti', 'Menji',
      'Tombel', 'Bangem', 'Nkwelle', 'Fontem', 'Eyumojock',
      'Akwaya', 'Bakassi', 'Isangele', 'Lobe', 'Mukonje',
      'Mutengene', 'Mbalangi', 'Lysoka', 'Bova', 'Tole',
    ]
  },
  'Nord': {
    color: '#EF4444',
    cities: [
      'Garoua', 'Ngaoundéré', 'Guider', 'Figuil', 'Poli',
      'Rey Bouba', 'Tchollire', 'Touboro', 'Bibemi', 'Pitoa',
      'Lagdo', 'Dembo', 'Bénoué', 'Mayo Dadi', 'Gashiga',
      'Touroua', 'Baïgom', 'Balkossa', 'Banda', 'Dourbeye',
      'Golombe', 'Hina', 'Namtari', 'Nassarao', 'Padama',
    ]
  },
  'Extrême-Nord': {
    color: '#F97316',
    cities: [
      'Maroua', 'Kousseri', 'Mora', 'Mokolo', 'Yagoua',
      'Kaélé', 'Meri', 'Mindif', 'Petté', 'Bogo',
      'Blangoua', 'Guidiguis', 'Hile Alifa', 'Kar-Hay', 'Kolofata',
      'Kousséri', 'Makary', 'Moulvoudaye', 'Ndoukoula', 'Tokombéré',
      'Waza', 'Zina', 'Bourha', 'Tcheboa', 'Guirvidig',
      'Doukoula', 'Gazawa', 'Moutourwa', 'Roua', 'Touloum',
    ]
  },
  'Adamaoua': {
    color: '#7C3AED',
    cities: [
      'Ngaoundéré', 'Meiganga', 'Banyo', 'Tibati', 'Tignère',
      'Nyambaka', 'Ngaoundal', 'Gounfan', 'Belel', 'Mbé',
      'Martap', 'Dir', 'Galim-Tignère', 'Kontcha', 'Djohong',
      'Mayo Baléo', 'Bagodo', 'Douroum', 'Homé', 'Nganha',
      'Mbi', 'Voukoum', 'Beka', 'Ngaïloum', 'Tello',
    ]
  },
  'Est': {
    color: '#84CC16',
    cities: [
      'Bertoua', 'Abong-Mbang', 'Batouri', 'Yokadouma',
      'Dimako', 'Belabo', 'Doumé', 'Bétaré Oya', 'Ndemba',
      'Lomié', 'Ndélélé', 'Moloundou', 'Ngoura', 'Garoua Boulaï',
      'Kenzou', 'Mbang', 'Messamena', 'Mindourou', 'Ndelele',
      'Diang', 'Mandjou', 'Ndokayo', 'Colomines', 'Gari Gombo',
    ]
  },
  'Sud': {
    color: '#EC4899',
    cities: [
      'Ebolowa', 'Kribi', 'Sangmélima', 'Ambam', 'Lolodorf',
      'Mvangué', 'Ma\'an', 'Akom II', 'Bipindi', 'Djoum',
      'Mintom', 'Meyomessala', 'Bengbis', 'Campo', 'Efoulan',
      'Biwong-Bané', 'Biwong-Bulu', 'Mvila', 'Nkouessong', 'Zoétélé',
      'Olamzé', 'Mengong', 'Ngoulemakong', 'Mvangan', 'Zoulabot',
    ]
  },

}

// ── Liste plate de toutes les villes (triée alphabétiquement) ─
export const ALL_CITIES = Object.values(CAMEROON_REGIONS)
  .flatMap(r => r.cities)
  .filter((v, i, a) => a.indexOf(v) === i) // dédoublonner
  .sort((a, b) => a.localeCompare(b, 'fr'))

// ── Villes principales (pour affichage rapide) ────────────────
export const MAJOR_CITIES = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua',
  'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi',
  'Limbe', 'Kumba', 'Edéa', 'Nkongsamba', 'Mbalmayo',
  'Buea', 'Foumban', 'Dschang', 'Mbouda', 'Bangangté',
]

// ── Trajets populaires au Cameroun ────────────────────────────
export const POPULAR_ROUTES = [
  { from: 'Douala',     to: 'Yaoundé',    price: 3500,  time: '2h30' },
  { from: 'Yaoundé',   to: 'Bafoussam',  price: 4000,  time: '3h'   },
  { from: 'Douala',     to: 'Bafoussam',  price: 4500,  time: '3h30' },
  { from: 'Yaoundé',   to: 'Bertoua',    price: 5000,  time: '4h'   },
  { from: 'Douala',     to: 'Kribi',      price: 3000,  time: '2h'   },
  { from: 'Bafoussam', to: 'Bamenda',    price: 2000,  time: '1h30' },
  { from: 'Douala',     to: 'Limbe',      price: 1500,  time: '1h'   },
  { from: 'Yaoundé',   to: 'Ebolowa',    price: 3000,  time: '2h30' },
  { from: 'Garoua',    to: 'Ngaoundéré', price: 3500,  time: '3h'   },
  { from: 'Douala',     to: 'Edéa',       price: 1500,  time: '1h'   },
  { from: 'Yaoundé',   to: 'Mbalmayo',   price: 1500,  time: '45min'},
  { from: 'Douala',     to: 'Nkongsamba', price: 3000,  time: '2h30' },
]

// ── Recherche de villes (avec fuzzy matching) ─────────────────
export function searchCities(query, limit = 10) {
  if (!query || query.length < 1) return MAJOR_CITIES.slice(0, limit)
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return ALL_CITIES
    .filter(city => {
      const c = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return c.startsWith(q) || c.includes(q)
    })
    .slice(0, limit)
}

// ── Formater le prix en FCFA ──────────────────────────────────
export const fmtFCFA = (n) => n
  ? `${Number(n).toLocaleString('fr-FR')} FCFA`
  : ''
export const CITIES_CM = ALL_CITIES
export const POPULAR_ROUTES_CM = [
  { from: "Douala", to: "Yaoundé", price: 5000 },
  { from: "Yaoundé", to: "Bafoussam", price: 6000 },
]

export function suggestPriceCM(distanceKm) {
  const pricePerKm = 50 // adjust for your market
  return Math.round(distanceKm * pricePerKm)
}