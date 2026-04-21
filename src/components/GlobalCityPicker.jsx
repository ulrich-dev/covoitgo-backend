import { useState, useRef, useEffect } from 'react'

// ══════════════════════════════════════════════════════════════
//  GlobalCityPicker — Autocomplétion mondiale via Nominatim
//  Gratuit, illimité, couvre toutes les villes du monde
// ══════════════════════════════════════════════════════════════

export default function GlobalCityPicker({ value, onChange, placeholder = 'Ville', exclude = '', style = {} }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  // Suggestions populaires Cameroun au démarrage
  useEffect(() => {
    setSuggestions([
      { name:'Douala',     country:'Cameroun', lat:4.0511,  lon:9.7679  },
      { name:'Yaoundé',    country:'Cameroun', lat:3.848,   lon:11.5021 },
      { name:'Bafoussam',  country:'Cameroun', lat:5.4737,  lon:10.4179 },
      { name:'Bamenda',    country:'Cameroun', lat:5.9631,  lon:10.1591 },
      { name:'Garoua',     country:'Cameroun', lat:9.3013,  lon:13.3932 },
      { name:'Kribi',      country:'Cameroun', lat:2.9404,  lon:9.9096  },
      { name:'Limbe',      country:'Cameroun', lat:4.0222,  lon:9.1946  },
      { name:'Paris',      country:'France',   lat:48.8566, lon:2.3522  },
      { name:'Lyon',       country:'France',   lat:45.7640, lon:4.8357  },
      { name:'Londres',    country:'Royaume-Uni', lat:51.5074, lon:-0.1278 },
    ])
  }, [])

  // Recherche Nominatim avec debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=15&featuretype=city&accept-language=fr`,
          { headers: { 'User-Agent': 'Clando-App/1.0' } }
        )
        const data = await res.json()
        const cities = data
          .filter(r => ['city','town','village','municipality','suburb'].includes(r.type) || r.class === 'place')
          .map(r => {
            const addr = r.address || {}
            return {
              name:    addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || r.display_name.split(',')[0],
              country: addr.country || '',
              state:   addr.state || addr.region || '',
              lat:     parseFloat(r.lat),
              lon:     parseFloat(r.lon),
              type:    r.type,
            }
          })
          .filter(c => c.name && c.name !== exclude)
          .filter((c, i, arr) => arr.findIndex(x => x.name === c.name && x.country === c.country) === i)
          .slice(0, 10)
        setResults(cities)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(timerRef.current)
  }, [query, exclude])

  const select = (city) => {
    onChange({
      name: city.name,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
      display: city.country ? `${city.name}, ${city.country}` : city.name,
    })
    setQuery('')
    setOpen(false)
  }

  const displayValue = value?.display || value?.name || (typeof value === 'string' ? value : '')
  const displayList = query.length >= 2 ? results : suggestions.filter(s => s.name !== exclude)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ display:'flex', alignItems:'center', gap:8, width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit', textAlign:'left', ...style }}>
        <span style={{ fontSize: displayValue ? 15 : 15, fontWeight: displayValue ? 700 : 400, color: displayValue ? '#111827' : '#9CA3AF', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {displayValue || placeholder}
        </span>
        {displayValue && (
          <span onClick={e => { e.stopPropagation(); onChange(null) }}
            style={{ fontSize:16, color:'#D1D5DB', cursor:'pointer', padding:'0 2px' }}>✕</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => { setOpen(false); setQuery('') }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9000 }}/>
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9001, background:'#fff', borderRadius:'24px 24px 0 0', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' }}>

            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#E5E7EB' }}/>
            </div>

            <div style={{ padding:'12px 16px 0' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h3 style={{ fontSize:18, fontWeight:900, margin:0, color:'#111827' }}>{placeholder}</h3>
                <button onClick={() => { setOpen(false); setQuery('') }}
                  style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF', padding:0 }}>✕</button>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10, background:'#F2F3F7', borderRadius:14, padding:'10px 14px' }}>
                <span style={{ fontSize:16 }}>🔍</span>
                <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Ville, pays…"
                  style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:15, fontFamily:'inherit', color:'#111827' }}/>
                {loading && <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid #E5E7EB', borderTopColor:'#1A9E8A', animation:'spin .8s linear infinite' }}/>}
                {!loading && query && <button onClick={() => setQuery('')} style={{ background:'none', border:'none', fontSize:14, color:'#9CA3AF', cursor:'pointer' }}>✕</button>}
              </div>

              <p style={{ fontSize:11, color:'#9CA3AF', margin:'8px 0 0', fontWeight:600 }}>
                {query.length >= 2
                  ? `${results.length} ville${results.length > 1 ? 's' : ''} trouvée${results.length > 1 ? 's' : ''}`
                  : '🇨🇲 Villes populaires'}
              </p>
            </div>

            <div style={{ overflowY:'auto', flex:1, padding:'8px 0 24px' }}>
              {displayList.map((city, i) => (
                <button key={i} onClick={() => select(city)}
                  style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'14px 16px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', textAlign:'left', borderBottom:'1px solid #F3F4F6' }}>
                  <span style={{ fontSize:18 }}>📍</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{city.name}</div>
                    <div style={{ fontSize:12, color:'#9CA3AF', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {[city.state, city.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </button>
              ))}

              {query.length >= 2 && !loading && results.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 20px' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🗺️</div>
                  <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>Aucune ville trouvée</p>
                  <p style={{ fontSize:13, color:'#9CA3AF' }}>Essayez avec plus de caractères</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
