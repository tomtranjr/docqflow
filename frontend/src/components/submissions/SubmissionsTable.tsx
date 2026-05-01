import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/brand/icons'
import { ConfMini } from '@/components/dashboard/ConfMini'
import type { Permit } from '@/lib/permitData'
import { StagePill } from './StagePill'

interface SubmissionsTableProps {
  permits: Permit[]
}

export function SubmissionsTable({ permits }: SubmissionsTableProps) {
  const navigate = useNavigate()
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <input type="checkbox" aria-label="Select all" />
            </th>
            <th>Permit ID</th>
            <th>Applicant</th>
            <th>Address</th>
            <th>Dept.</th>
            <th>Stage</th>
            <th>Confidence</th>
            <th>Received</th>
            <th>Days</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {permits.map((p) => (
            <tr key={p.id} onClick={() => navigate(`/app/review/${p.id}`)} style={{ cursor: 'pointer' }}>
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" aria-label={`Select ${p.id}`} />
              </td>
              <td>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {p.id}
                </span>
              </td>
              <td>{p.applicant}</td>
              <td style={{ color: 'var(--ink-3)' }}>{p.address}</td>
              <td>
                <span className="pill" style={{ height: 22 }}>
                  {p.department}
                </span>
              </td>
              <td>
                <StagePill stage={p.stage} />
              </td>
              <td>
                <ConfMini value={p.confidence} />
              </td>
              <td className="tabular" style={{ color: 'var(--ink-3)' }}>
                {p.received}
              </td>
              <td className="tabular mono" style={{ color: p.daysOpen >= 7 ? 'var(--warn)' : 'var(--ink-3)' }}>
                {p.daysOpen}d
              </td>
              <td>
                <ChevronRightIcon size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
