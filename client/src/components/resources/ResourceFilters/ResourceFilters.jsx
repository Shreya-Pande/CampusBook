import './ResourceFilters.css'

// The 8 real backend resource types (server/src/models/Resource.js). "Lecture
// Hall" appears in some design notes but isn't a real type in this schema,
// so it's intentionally left out rather than shipping a filter that can
// never match anything.
const RESOURCE_TYPES = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'lab', label: 'Lab' },
  { value: 'study_room', label: 'Study Room' },
  { value: 'studio', label: 'Studio' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'conference_room', label: 'Conference Room' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'sports_court', label: 'Sports Court' },
]

const AMENITIES = [
  { value: 'projector', label: 'Projector' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'ac', label: 'AC' },
  { value: 'computers', label: 'Computers' },
  { value: 'power_outlets', label: 'Power Outlets' },
]

const MIN_CAPACITY = 1
const MAX_CAPACITY = 200

const ResourceFilters = ({ filters, onChange, buildings = [], departments = [] }) => {
  const toggleListValue = (key, value) => {
    const current = filters[key] || []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onChange({ [key]: next })
  }

  return (
    <div className="resource-filters space-y-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resource Type</h3>
        <div className="mt-3 space-y-2">
          {RESOURCE_TYPES.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={(filters.types || []).includes(value)}
                onChange={() => toggleListValue('types', value)}
                className="filter-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="filter-building" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Building
        </label>
        <select
          id="filter-building"
          value={filters.building || ''}
          onChange={(event) => onChange({ building: event.target.value })}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All buildings</option>
          {buildings.map((building) => (
            <option key={building} value={building}>
              {building}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-department" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Department
        </label>
        <select
          id="filter-department"
          value={filters.department || ''}
          onChange={(event) => onChange({ department: event.target.value })}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="filter-capacity" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Capacity
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">{filters.minCapacity || MIN_CAPACITY}+</span>
        </div>
        <input
          id="filter-capacity"
          type="range"
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          value={filters.minCapacity || MIN_CAPACITY}
          onChange={(event) => onChange({ minCapacity: Number(event.target.value) })}
          className="capacity-slider mt-3 w-full accent-indigo-600"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amenities</h3>
        <div className="mt-3 space-y-2">
          {AMENITIES.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={(filters.amenities || []).includes(value)}
                onChange={() => toggleListValue('amenities', value)}
                className="filter-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ResourceFilters
