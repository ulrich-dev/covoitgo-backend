import { useState, useRef, useEffect } from 'react'
import { CITIES_CM } from '../data/cameroun'

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Ville',
  icon = '📍',
  label,
  id,
  style = {},
  inputStyle = {},
}) {
  const [query,    setQuery]    = useState(value || '')
  const [open,     setOpen]     = useState(false)
  const [focused,  setFocused]  = useState(false)
  const [highlight,setHighlight]= useState(0)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  // Sync external value
  useEffect(() => { setQuery(value || '') }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = query.length >= 1
    ? CITIES_CM
        .filter(c => c.name.toLowerCase().startsWith(query.toLowerCase()))
        .concat(
          CITIES_CM.filter(c =>
            !c.name.toLowerCase().startsWith(query.toLowerCase()) &&
            c.name.toLowerCase().includes(query.toLowerCase())
          )
        )
        .slice(0, 8)
    : []

  const select = (city) => {
    setQuery(city.name)
    onChange(city.name)
    setOpen(false)
    setHighlight(0)
  }

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); if (suggestions[highlight]) select(suggestions[highlight]) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    setOpen(true)
    setHighlight(0)
  }

  const showDropdown = open && focused && suggestions.length > 0

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      {label && (
        <label htmlFor={id}
          style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '.04em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {/* Icon — toujours absolu par rapport au wrapper */}
        <span style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 13, pointerEvents: 'none',
          opacity: .5, zIndex: 1, lineHeight: 1,
        }}>
          {icon}
        </span>

        <input
          id={id}
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => { setFocused(true); if (query.length >= 1) setOpen(true) }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 32px 11px 28px',
            border: `1.5px solid ${focused ? 'rgba(26,158,138,.45)' : 'rgba(0,0,0,.12)'}`,
            borderRadius: 10, fontSize: 14, fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#1A1A1A', background: '#fff', outline: 'none',
            transition: 'border-color .18s, box-shadow .18s',
            boxShadow: focused ? '0 0 0 3px rgba(26,158,138,.1)' : 'none',
            ...inputStyle,
          }}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onChange(''); inputRef.current?.focus() }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14, padding: 2, lineHeight: 1 }}>
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid rgba(0,0,0,.1)', borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,.12)', zIndex: 999,
          overflow: 'hidden', animation: 'acDrop .15s ease both',
        }}>
          <style>{`
            @keyframes acDrop { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
            .ac-item { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; transition:background .12s; border:none; background:none; width:100%; text-align:left; font-family:'Plus Jakarta Sans',sans-serif; }
            .ac-item:hover,.ac-item.hl { background:rgba(26,158,138,.07); }
          `}</style>
          {suggestions.map((city, i) => (
            <button
              key={city.name}
              type="button"
              className={`ac-item${i === highlight ? ' hl' : ''}`}
              onMouseDown={() => select(city)}
              onMouseEnter={() => setHighlight(i)}>
              {/* Pin icon */}
              <span style={{ fontSize: 16, flexShrink: 0 }}>
                {city.pop >= 3 ? '🏙️' : city.pop >= 2 ? '🏘️' : '📍'}
              </span>
              <div>
                {/* Highlight matching part */}
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                  <span style={{ color: '#1A9E8A' }}>{city.name.slice(0, query.length)}</span>
                  {city.name.slice(query.length)}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                  {city.region} · Cameroun
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
