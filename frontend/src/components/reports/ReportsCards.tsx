import { FileBarChart, Calendar } from 'lucide-react'
import { StatCard } from '@/components/common/StatCard'

interface ReportsCardsProps {
  total: number
  recent7d: number
}

export function ReportsCards({ total, recent7d }: ReportsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        icon={<FileBarChart className="h-5 w-5" />}
        label="Total Classified"
        value={total}
      />
      <StatCard
        icon={<Calendar className="h-5 w-5" />}
        label="Last 7 Days"
        value={recent7d}
      />
    </div>
  )
}
