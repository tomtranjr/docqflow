import { SFSeal } from '@/components/brand/SFSeal'
import type { Permit } from '@/lib/permitData'

interface PdfMockPreviewProps {
  permit: Permit
  activeField: string | null
  zoom: number
}

interface FieldRect {
  left: string
  top: string
  width: string
  height: string
}

const FIELD_RECTS: Record<string, FieldRect> = {
  applicant_name: { left: '8%', top: '23%', width: '40%', height: '5%' },
  address: { left: '8%', top: '30%', width: '60%', height: '5%' },
  project_address: { left: '8%', top: '30%', width: '60%', height: '5%' },
  permit_type: { left: '8%', top: '44%', width: '40%', height: '5%' },
  parcel_number: { left: '52%', top: '44%', width: '30%', height: '5%' },
  estimated_cost: { left: '60%', top: '57%', width: '26%', height: '4%' },
  contractor_name: { left: '8%', top: '65%', width: '40%', height: '5%' },
  license_number: { left: '52%', top: '65%', width: '30%', height: '5%' },
  square_footage: { left: '60%', top: '70%', width: '26%', height: '4%' },
}

interface FieldRowProps {
  label: string
  value: string
  missing?: boolean
  multi?: boolean
}

function FieldRow({ label, value, missing = false, multi = false }: FieldRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ fontSize: 7, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div
        style={{
          borderBottom: '1px solid #999',
          paddingBottom: 1,
          minHeight: multi ? 26 : 13,
          fontSize: 10,
          fontFamily: 'Georgia, serif',
          color: missing ? '#fff' : '#222',
        }}
      >
        {value || ' '}
      </div>
    </div>
  )
}

// Synthetic SF Building Permit form. Used when the live PDF endpoint is
// unavailable or the route was opened with a mock permit ID. Field overlays
// highlight the row that's hovered in FieldsPanel.
export function PdfMockPreview({ permit, activeField, zoom }: PdfMockPreviewProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: 540 * zoom,
        minHeight: 700 * zoom,
        background: '#fff',
        boxShadow: 'var(--shadow-2)',
        transformOrigin: 'top center',
        color: '#222',
        padding: 28 * zoom,
        fontSize: 9 * zoom,
        lineHeight: 1.4,
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1.5px solid #222' }}>
          <SFSeal size={26} color="#222" />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
              CITY AND COUNTY OF SAN FRANCISCO
            </div>
            <div style={{ fontSize: 9, fontWeight: 600 }}>DEPARTMENT OF BUILDING INSPECTION</div>
            <div style={{ fontSize: 9, marginTop: 2 }}>APPLICATION FOR BUILDING PERMIT — ADDITIONS, ALTERATIONS OR REPAIRS</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
            <div>BLDG. FORM 3/8</div>
            <div>APP # {permit.id}</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>APPLICANT INFORMATION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FieldRow label="Applicant Name" value={permit.applicant} />
            <FieldRow label="Phone" value="(415) 555-0142" />
          </div>
          <FieldRow label="Address" value={permit.address} />
          <FieldRow label="Email" value="aiden.patel@example.com" />

          <div style={{ fontSize: 9, fontWeight: 700, margin: '14px 0 4px' }}>PROJECT INFORMATION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FieldRow label="Permit Type" value={permit.type} />
            <FieldRow label="Parcel Number" value={permit.parcel} />
          </div>
          <FieldRow label="Project Address" value={permit.address} />
          <FieldRow
            label="Description of Work"
            value="Remodel existing bathroom in apartment unit. Replace shower, vanity, toilet, tiles. Minor electrical and plumbing work. New waterproofing."
            multi
          />

          <div style={{ fontSize: 9, fontWeight: 700, margin: '14px 0 4px' }}>COST &amp; SCOPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <FieldRow label="Estimated Cost" value={`$${(permit.cost || 0).toLocaleString()}`} />
            <FieldRow label="Square Footage" value="" missing />
            <FieldRow label="# Stories" value="2" />
          </div>

          <div style={{ fontSize: 9, fontWeight: 700, margin: '14px 0 4px' }}>CONTRACTOR INFORMATION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FieldRow label="Contractor Name" value="" missing />
            <FieldRow label="License Number" value="CSLB 561902" />
          </div>
          <FieldRow label="Address" value="2712 Sutter Street, San Francisco" />

          <div
            style={{
              marginTop: 18,
              paddingTop: 8,
              borderTop: '1px solid #ccc',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12 }}>{permit.applicant}</div>
            <div style={{ fontSize: 9 }}>{permit.received}</div>
          </div>
        </div>

        {Object.entries(FIELD_RECTS).map(([k, r]) => (
          <div key={k} className={`pdf-highlight ${activeField === k ? 'active' : ''}`} style={{ ...r }} />
        ))}
      </div>
    </div>
  )
}
