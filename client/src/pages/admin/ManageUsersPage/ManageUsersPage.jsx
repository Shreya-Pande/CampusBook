import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Search, UserX } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { getAllUsers, approveAdminAccount } from '../../../api/admin.api'
import Button from '../../../components/ui/Button/Button'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './ManageUsersPage.css'

const ManageUsersPage = () => {
  const adminType = useAuthStore((state) => state.adminType)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', 'all'],
    queryFn: () => getAllUsers({ limit: 200 }),
    select: (res) => res.data?.users ?? [],
  })

  const approveMutation = useMutation({
    mutationFn: (id) => approveAdminAccount(id),
    onSuccess: () => {
      toast.success('Admin account approved')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not approve account'),
  })

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (user) => user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query),
    )
  }, [users, search])

  if (adminType !== 'super_admin') return <Navigate to="/dashboard" replace />

  return (
    <div className="manage-users-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Users</h1>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email…"
            className="w-64 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <UserX size={32} />
            <p className="text-sm">No users match your search.</p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {['Name', 'Email', 'Role', 'Designation', 'Department', 'Status', ''].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user._id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.email}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {user.role === 'admin' ? user.adminType?.replace('_', ' ') || 'admin' : 'CR / Faculty'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.designation || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.isApproved
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {user.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role === 'admin' && !user.isApproved && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approveMutation.mutate(user._id)}
                        disabled={approveMutation.isPending}
                        className="!bg-emerald-600 hover:!bg-emerald-700"
                      >
                        Approve Account
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ManageUsersPage
