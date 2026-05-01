import type { Completeness } from './types'

export function buildPassNotification(classificationId: number, filename: string) {
  return {
    kind: 'pass' as const,
    classificationId,
    filename,
    message: 'All required fields present — ready for review.',
  }
}

export function buildFailNotification(
  classificationId: number,
  filename: string,
  completeness: Completeness,
) {
  const summary =
    completeness.missing.length === 1
      ? `Missing field: ${completeness.missing[0]}`
      : `Missing ${completeness.missing.length} required fields`
  return {
    kind: 'fail' as const,
    classificationId,
    filename,
    message: summary,
  }
}
