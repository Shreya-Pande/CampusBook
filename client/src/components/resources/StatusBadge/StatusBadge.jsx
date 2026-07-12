import './StatusBadge.css'

const STATUS_META = {
  vacant: { label: 'Available', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  non_vacant: { label: 'Non-Vacant', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950' },
  occupied: { label: 'Booked', dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950' },
  maintenance: { label: 'Maintenance', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950' },
  under_approval: { label: 'Under Approval', dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  unselected: { label: 'Select time to check', dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
}

// status: 'vacant' | 'non_vacant' | 'occupied' | 'maintenance' | 'under_approval' | 'unselected'
const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.unselected

  return (
    <span
      className={`status-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.text}`}
    >
      <span className={`status-badge-dot h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default StatusBadge
