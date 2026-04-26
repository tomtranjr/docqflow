import { useEffect, useState } from 'react'
import type { ExtractionState } from '@/lib/types'

export function usePlaceholderExtraction(_classificationId: string): ExtractionState {
  const [state, setState] = useState<ExtractionState>({ kind: 'loading' })
  useEffect(() => {
    const t = setTimeout(() => {
      setState({
        kind: 'ok',
        result: {
          fields: {
            applicant_name: {
              value: 'John Doe',
              source_text: 'Applicant Name: John Doe',
            },
            address: {
              value: '123 Main St, Riverview, CA 94501',
              source_text: 'Address: 123 Main St, Riverview, CA 94501',
            },
            permit_type: {
              value: 'Building Permit - Addition',
              source_text: 'Permit Type: Building Permit - Addition',
            },
            parcel_number: {
              value: 'RIV-012-345-678',
              source_text: 'Parcel Number: RIV-012-345-678',
            },
            project_address: {
              value: '123 Main St, Riverview, CA 94501',
              source_text: 'Project Address: 123 Main St, Riverview, CA 94501',
            },
            contractor_name: {
              value: 'Doe Construction',
              source_text: 'Contractor Name: Doe Construction',
            },
            license_number: {
              value: 'CSLB 987654',
              source_text: 'License Number: CSLB 987654',
            },
            estimated_cost: { value: null, source_text: null },
            square_footage: { value: null, source_text: null },
          },
          department: 'building',
          department_confidence: 0.96,
          model: 'placeholder',
          prompt_version: 0,
        },
      })
    }, 600)
    return () => clearTimeout(t)
  }, [_classificationId])
  return state
}
