// Mock SF permit data — drives Dashboard, Submissions, Review demo views
// while the real backend is still catching up. Where backend data is available
// (useHistory, getStats, getClassificationFields) the page should prefer that
// and fall back to this only when the live source is empty.

export type DepartmentKey = 'Building' | 'Electrical' | 'Plumbing' | 'Zoning' | 'Other'

// Reviewer-facing pipeline states. The earlier model (extract / validate /
// classify) split the automated pipeline into stages that a reviewer can't
// distinguish or act on; they all happen in one server-side run, so we
// collapse them into a single `processing` state. Rejected is the bucket for
// gate-check failures — visible so the reviewer can re-upload, override, or
// dismiss them.
export type StageKey = 'processing' | 'ready' | 'rejected' | 'complete'

export interface PermitField {
  v: string | null
  c: number
}

export interface TimelineEvent {
  stage: string
  who: string
  at: string
  state: 'done' | 'active' | 'todo'
  note?: string
}

export interface Permit {
  id: string
  filename: string
  applicant: string
  address: string
  neighborhood: string
  parcel: string
  type: string
  department: DepartmentKey
  cost: number
  sqft: number | null
  received: string
  daysOpen: number
  stage: StageKey
  confidence: number
  flags: string[]
  pages: number
  fields?: Record<string, PermitField>
  timeline?: TimelineEvent[]
  // Populated when stage === 'rejected'. Human-readable reason from the
  // TF-IDF gate-check (e.g. "Not a recognized permit form").
  rejectReason?: string
}

export const PERMITS: Permit[] = [
  {
    id: 'BLD-26-04812',
    filename: 'permit_202604089128.pdf',
    applicant: 'Aiden Patel',
    address: '2130 Harrison St #9',
    neighborhood: 'Mission',
    parcel: '3573/056',
    type: 'Building Permit — Addition',
    department: 'Building',
    cost: 70000,
    sqft: null,
    received: 'Apr 22, 2026',
    daysOpen: 3,
    stage: 'ready',
    confidence: 0.94,
    flags: ['missing_contractor', 'missing_sqft'],
    pages: 2,
    fields: {
      applicant_name: { v: 'Aiden Patel', c: 0.98 },
      address: { v: '2130 Harrison St #9', c: 0.97 },
      permit_type: { v: 'Building Permit — Addition', c: 0.96 },
      parcel_number: { v: '3573/056', c: 0.95 },
      project_address: { v: '2130 Harrison St #9', c: 0.96 },
      contractor_name: { v: null, c: 0 },
      license_number: { v: 'CSLB 561902', c: 0.93 },
      estimated_cost: { v: '$70,000', c: 0.91 },
      square_footage: { v: null, c: 0 },
    },
    timeline: [
      { stage: 'Submitted', who: 'Citizen portal', at: 'Apr 22 · 09:14', state: 'done' },
      { stage: 'Auto-extracted', who: 'DocQ AI', at: 'Apr 22 · 09:14', state: 'done' },
      { stage: 'Validated', who: 'DocQ AI', at: 'Apr 22 · 09:15', state: 'done', note: '2 fields missing' },
      { stage: 'Classified', who: 'DocQ AI', at: 'Apr 22 · 09:15', state: 'done', note: 'Building · 96%' },
      { stage: 'Reviewer assigned', who: 'Alex Smith', at: 'Apr 22 · 14:02', state: 'done' },
      { stage: 'In review', who: 'Alex Smith', at: 'Apr 25 · 11:23', state: 'active' },
      { stage: 'Complete', who: '—', at: '—', state: 'todo' },
    ],
  },
  {
    id: 'ELE-26-01997',
    filename: 'permit_chen_kitchen_rewire.pdf',
    applicant: 'Mei Chen',
    address: '748 Clipper St',
    neighborhood: 'Noe Valley',
    parcel: '6582/014',
    type: 'Electrical — Service Upgrade',
    department: 'Electrical',
    cost: 18500,
    sqft: 1200,
    received: 'Apr 24, 2026',
    daysOpen: 1,
    stage: 'processing',
    confidence: 0.88,
    flags: [],
    pages: 4,
  },
  {
    id: 'PLM-26-00831',
    filename: 'permit_robles_bathroom.pdf',
    applicant: 'Diego Robles',
    address: '415 Eddy St',
    neighborhood: 'Tenderloin',
    parcel: '0337/008',
    type: 'Plumbing — Bathroom Remodel',
    department: 'Plumbing',
    cost: 24200,
    sqft: 220,
    received: 'Apr 25, 2026',
    daysOpen: 0,
    stage: 'processing',
    confidence: 0.72,
    flags: ['low_confidence'],
    pages: 3,
  },
  {
    id: 'BLD-26-04795',
    filename: 'permit_obrien_garage.pdf',
    applicant: "Saoirse O'Brien",
    address: '1502 Broderick St',
    neighborhood: 'Lower Pacific Heights',
    parcel: '1062/041',
    type: 'Building — Garage Conversion',
    department: 'Building',
    cost: 142000,
    sqft: 480,
    received: 'Apr 19, 2026',
    daysOpen: 6,
    stage: 'ready',
    confidence: 0.96,
    flags: [],
    pages: 8,
  },
  {
    id: 'ZON-26-00227',
    filename: 'permit_marisol_signage.pdf',
    applicant: 'Marisol Vega',
    address: '3251 Mission St',
    neighborhood: 'Mission',
    parcel: '6573/021',
    type: 'Zoning — Storefront Signage',
    department: 'Zoning',
    cost: 4800,
    sqft: 32,
    received: 'Apr 21, 2026',
    daysOpen: 4,
    stage: 'processing',
    confidence: 0.62,
    flags: ['low_confidence', 'missing_address'],
    pages: 2,
  },
  {
    id: 'BLD-26-04701',
    filename: 'permit_yoon_solar_array.pdf',
    applicant: 'Joon Yoon',
    address: '8 Sea Cliff Ave',
    neighborhood: 'Sea Cliff',
    parcel: '1303/004',
    type: 'Building — Solar Array',
    department: 'Building',
    cost: 38000,
    sqft: 600,
    received: 'Apr 16, 2026',
    daysOpen: 9,
    stage: 'complete',
    confidence: 0.99,
    flags: [],
    pages: 5,
  },
  {
    id: 'ELE-26-02041',
    filename: 'permit_nguyen_panel.pdf',
    applicant: 'Linh Nguyen',
    address: '3920 Geary Blvd',
    neighborhood: 'Inner Richmond',
    parcel: '1551/032',
    type: 'Electrical — Panel Replacement',
    department: 'Electrical',
    cost: 7200,
    sqft: 0,
    received: 'Apr 24, 2026',
    daysOpen: 1,
    stage: 'ready',
    confidence: 0.91,
    flags: [],
    pages: 3,
  },
  {
    id: 'PLM-26-00845',
    filename: 'permit_kowalski_water_heater.pdf',
    applicant: 'Tom Kowalski',
    address: '2299 Market St #2',
    neighborhood: 'Castro',
    parcel: '3582/019',
    type: 'Plumbing — Water Heater',
    department: 'Plumbing',
    cost: 3400,
    sqft: 0,
    received: 'Apr 23, 2026',
    daysOpen: 2,
    stage: 'complete',
    confidence: 0.97,
    flags: [],
    pages: 2,
  },
  {
    id: 'BLD-26-04860',
    filename: 'permit_huang_deck.pdf',
    applicant: 'Wei Huang',
    address: '97 Castenada Ave',
    neighborhood: 'Forest Hill',
    parcel: '2895/021',
    type: 'Building — Deck Addition',
    department: 'Building',
    cost: 22000,
    sqft: 320,
    received: 'Apr 25, 2026',
    daysOpen: 0,
    stage: 'processing',
    confidence: 0.81,
    flags: [],
    pages: 4,
  },
  {
    id: 'ZON-26-00231',
    filename: 'permit_oconnell_awning.pdf',
    applicant: "Niamh O'Connell",
    address: '660 Valencia St',
    neighborhood: 'Mission',
    parcel: '3589/015',
    type: 'Zoning — Awning Permit',
    department: 'Zoning',
    cost: 2100,
    sqft: 60,
    received: 'Apr 24, 2026',
    daysOpen: 1,
    stage: 'processing',
    confidence: 0.78,
    flags: [],
    pages: 2,
  },
  {
    id: 'BLD-26-04722',
    filename: 'permit_garcia_adu.pdf',
    applicant: 'Sofia García',
    address: '1788 24th Ave',
    neighborhood: 'Sunset',
    parcel: '2207/032',
    type: 'Building — ADU Construction',
    department: 'Building',
    cost: 285000,
    sqft: 720,
    received: 'Apr 17, 2026',
    daysOpen: 8,
    stage: 'ready',
    confidence: 0.93,
    flags: [],
    pages: 14,
  },
  {
    id: 'BLD-26-04880',
    filename: 'permit_anonymous_dropbox.pdf',
    applicant: '—',
    address: '—',
    neighborhood: '—',
    parcel: '—',
    type: 'Unclassified',
    department: 'Other',
    cost: 0,
    sqft: 0,
    received: 'Apr 25, 2026',
    daysOpen: 0,
    stage: 'rejected',
    confidence: 0.31,
    flags: ['low_confidence', 'missing_address', 'needs_human'],
    pages: 1,
    rejectReason: 'Gate check: document does not match any known permit form template.',
  },
  {
    id: 'OTH-26-00112',
    filename: 'site_photos_unsigned.pdf',
    applicant: 'Hye-Jin Park',
    address: '—',
    neighborhood: '—',
    parcel: '—',
    type: 'Unclassified',
    department: 'Other',
    cost: 0,
    sqft: 0,
    received: 'Apr 26, 2026',
    daysOpen: 0,
    stage: 'rejected',
    confidence: 0.18,
    flags: ['gate_check_failed'],
    pages: 6,
    rejectReason: 'Gate check: detected as photo set, not a permit application.',
  },
]

export interface Stage {
  key: StageKey
  label: string
  sub: string
}

// Order matches the visual progression a reviewer sees in the Inbox filter
// chips. `rejected` sits beside `complete` because both are terminal states
// from the reviewer's perspective (no further automated action).
export const STAGES: Stage[] = [
  { key: 'processing', label: 'Processing', sub: 'Gate check + extraction' },
  { key: 'ready', label: 'Ready', sub: 'Human verification' },
  { key: 'rejected', label: 'Rejected', sub: 'Gate check failed' },
  { key: 'complete', label: 'Complete', sub: 'Approved & filed' },
]

export interface DepartmentMeta {
  key: DepartmentKey
  icon: 'building' | 'bolt' | 'drop' | 'map' | 'doc'
  count: number
  accent: string
}

export const DEPARTMENTS: DepartmentMeta[] = [
  { key: 'Building', icon: 'building', count: 5, accent: 'var(--blue-500)' },
  { key: 'Electrical', icon: 'bolt', count: 2, accent: '#D97706' },
  { key: 'Plumbing', icon: 'drop', count: 2, accent: '#0EA5E9' },
  { key: 'Zoning', icon: 'map', count: 2, accent: '#7C3AED' },
]

export interface DemoNotification {
  id: number
  kind: 'warn' | 'info' | 'ok'
  title: string
  body: string
  time: string
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  { id: 1, kind: 'warn', title: 'Low-confidence extraction', body: 'BLD-26-04880 needs human review', time: '2m ago' },
  { id: 2, kind: 'info', title: '5 permits assigned to you', body: 'Your queue refreshed at 9:00am', time: '12m ago' },
  { id: 3, kind: 'ok', title: 'ELE-26-02041 approved', body: 'Auto-routed to Electrical', time: '1h ago' },
]

export interface ThroughputPoint {
  d: string
  in: number
  out: number
}

export const THROUGHPUT: ThroughputPoint[] = [
  { d: 'Apr 12', in: 14, out: 11 },
  { d: 'Apr 13', in: 18, out: 13 },
  { d: 'Apr 14', in: 22, out: 17 },
  { d: 'Apr 15', in: 19, out: 21 },
  { d: 'Apr 16', in: 24, out: 20 },
  { d: 'Apr 17', in: 28, out: 23 },
  { d: 'Apr 18', in: 12, out: 14 },
  { d: 'Apr 19', in: 9, out: 11 },
  { d: 'Apr 20', in: 26, out: 22 },
  { d: 'Apr 21', in: 31, out: 25 },
  { d: 'Apr 22', in: 27, out: 29 },
  { d: 'Apr 23', in: 23, out: 26 },
  { d: 'Apr 24', in: 25, out: 22 },
  { d: 'Apr 25', in: 18, out: 17 },
]

export interface ConfBucket {
  range: string
  count: number
  color: string
}

export const CONF_BUCKETS: ConfBucket[] = [
  { range: '<60%', count: 4, color: 'var(--danger)' },
  { range: '60-70%', count: 9, color: 'var(--danger)' },
  { range: '70-80%', count: 18, color: 'var(--warn)' },
  { range: '80-90%', count: 41, color: 'var(--blue-500)' },
  { range: '90-95%', count: 67, color: 'var(--ok)' },
  { range: '>95%', count: 124, color: 'var(--ok)' },
]

export interface MapPoint {
  lat: number
  lng: number
  perm: string
  n: string
}

export const MAP_POINTS: MapPoint[] = [
  { lat: 37.7599, lng: -122.4148, perm: 'BLD-26-04812', n: 'Mission' },
  { lat: 37.7649, lng: -122.4194, perm: 'ZON-26-00227', n: 'Mission' },
  { lat: 37.7549, lng: -122.4180, perm: 'ZON-26-00231', n: 'Mission' },
  { lat: 37.7505, lng: -122.4339, perm: 'ELE-26-01997', n: 'Noe Valley' },
  { lat: 37.7843, lng: -122.4156, perm: 'PLM-26-00831', n: 'Tenderloin' },
  { lat: 37.7894, lng: -122.4361, perm: 'BLD-26-04795', n: 'Lower Pac Heights' },
  { lat: 37.7841, lng: -122.4910, perm: 'BLD-26-04701', n: 'Sea Cliff' },
  { lat: 37.7799, lng: -122.4644, perm: 'ELE-26-02041', n: 'Inner Richmond' },
  { lat: 37.7609, lng: -122.4350, perm: 'PLM-26-00845', n: 'Castro' },
  { lat: 37.7456, lng: -122.4582, perm: 'BLD-26-04860', n: 'Forest Hill' },
  { lat: 37.7434, lng: -122.4892, perm: 'BLD-26-04722', n: 'Sunset' },
  { lat: 37.7689, lng: -122.4486, perm: 'OTH-26-00112', n: 'Western Addition' },
]

export const REVIEWER = {
  name: 'Alex Smith',
  role: 'Plan Reviewer · DBI',
  initials: 'AS',
}

export function permitDepartment(label: string | undefined): DepartmentKey {
  switch ((label || '').toLowerCase()) {
    case 'building':
      return 'Building'
    case 'electrical':
      return 'Electrical'
    case 'plumbing':
      return 'Plumbing'
    case 'zoning':
      return 'Zoning'
    default:
      return 'Other'
  }
}
