import type { QueuedResult } from '@/lib/types'
import { QueueThumbnail } from './QueueThumbnail'

interface QueueGridProps {
  items: QueuedResult[]
}

export function QueueGrid({ items }: QueueGridProps) {
  return (
    <ul
      role="list"
      aria-label="Classification queue"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((item) => (
        <li key={item.result.id} className="min-w-0">
          <QueueThumbnail filename={item.filename} result={item.result} />
        </li>
      ))}
    </ul>
  )
}
