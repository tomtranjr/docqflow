import { useHistory } from './useHistory'
import { PERMITS } from '@/lib/permitData'

// Mirrors Submissions.tsx: PERMITS (demo set) plus any live history entries.
export function useSubmissionsCount(): number {
  const { entries } = useHistory()
  return entries.length === 0 ? PERMITS.length : entries.length + PERMITS.length
}
