import {
  User,
  MapPin,
  FileText,
  Hash,
  Building,
  Briefcase,
  BadgeCheck,
  DollarSign,
  Square,
  type LucideIcon,
} from 'lucide-react'
import type { FieldName, Department } from '@/lib/types'

export const FIELD_META: Record<FieldName, { icon: LucideIcon; label: string }> = {
  applicant_name: { icon: User, label: 'Applicant Name' },
  address: { icon: MapPin, label: 'Address' },
  permit_type: { icon: FileText, label: 'Permit Type' },
  parcel_number: { icon: Hash, label: 'Parcel Number' },
  project_address: { icon: Building, label: 'Project Address' },
  contractor_name: { icon: Briefcase, label: 'Contractor Name' },
  license_number: { icon: BadgeCheck, label: 'License Number' },
  estimated_cost: { icon: DollarSign, label: 'Estimated Cost' },
  square_footage: { icon: Square, label: 'Square Footage' },
}

export const FIELD_ORDER: readonly FieldName[] = [
  'applicant_name',
  'address',
  'permit_type',
  'parcel_number',
  'project_address',
  'contractor_name',
  'license_number',
  'estimated_cost',
  'square_footage',
]

export const DEPARTMENT_LABELS: Record<Department, string> = {
  building: 'Building Department',
  electrical: 'Electrical Department',
  plumbing: 'Plumbing Department',
  zoning: 'Zoning Department',
  other: 'Other',
}
