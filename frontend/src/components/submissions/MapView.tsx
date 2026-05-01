import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_POINTS, type Permit } from '@/lib/permitData'

interface MapViewProps {
  permits: Permit[]
}

interface NeighborhoodEntry {
  perm: string
  applicant: string
}

// Real SF map via Leaflet + CARTO light tiles. Each permit shows up as a dot;
// click a dot or the side-list item to jump into Review.
export function MapView({ permits }: MapViewProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [37.7649, -122.4394],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    MAP_POINTS.forEach((m) => {
      const p = permits.find((x) => x.id === m.perm)
      if (!p) return
      const isWarn = p.flags.length > 0
      const color = isWarn ? '#B45309' : '#1E63E8'
      const icon = L.divIcon({
        className: 'sf-pin',
        html: `<span style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid #fff;display:block;box-shadow:0 0 0 1.5px ${color}55,0 2px 6px rgba(0,0,0,.25);"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map)
      marker.bindPopup(
        `<div style="font-family:var(--font-sans);min-width:200px">
          <div style="font-family:var(--font-mono);font-size:11px;color:#5A6781">${p.id}</div>
          <div style="font-size:13px;font-weight:700;margin-top:2px;color:#0B1530">${p.applicant}</div>
          <div style="font-size:11px;color:#5A6781;margin-top:2px">${p.address}</div>
          <div style="font-size:11px;color:#5A6781;margin-top:2px">${m.n} · ${p.department}</div>
          <button id="popup-go-${p.id}" style="margin-top:8px;padding:5px 10px;background:#1E63E8;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer">Open review →</button>
        </div>`,
      )
      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-go-${p.id}`)
        if (btn) btn.onclick = () => navigate(`/app/review/${p.id}`)
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [permits, navigate])

  const byNeighborhood = MAP_POINTS.reduce<Record<string, NeighborhoodEntry[]>>((acc, m) => {
    const p = permits.find((x) => x.id === m.perm)
    if (!p) return acc
    ;(acc[m.n] = acc[m.n] || []).push({ perm: p.id, applicant: p.applicant })
    return acc
  }, {})

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, height: 600 }}>
      <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--r)' }} />
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 500,
            background: 'var(--surface-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>San Francisco · Permit map</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Click any pin to open review</div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 500,
            background: 'var(--surface-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: 11,
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div className="label-eyebrow">Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E63E8' }} />
            Active permit
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B45309' }} />
            Needs attention
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>By neighborhood</h3>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 0' }}>Click an item to open</p>
        </div>
        {Object.entries(byNeighborhood).map(([nbh, ps]) => (
          <div key={nbh} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{nbh}</span>
              <span className="mono tabular" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {ps.length}
              </span>
            </div>
            {ps.map((entry) => (
              <button
                key={entry.perm}
                type="button"
                onClick={() => navigate(`/app/review/${entry.perm}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '6px 0',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <span className="mono">{entry.perm}</span>
                <span>{entry.applicant}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
