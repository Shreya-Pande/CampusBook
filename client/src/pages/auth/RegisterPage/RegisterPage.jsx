import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAdmin, registerCR } from '../../../api/auth.api'
import { useAuthStore } from '../../../store/authStore'
import './RegisterPage.css'

const DESIGNATIONS = ['CR', 'Club Head', 'Event Head', 'TnP Officer', 'Faculty']
const ADMIN_TYPES = [
  { value: 'hod', label: 'HOD' },
  { value: 'department_admin', label: 'Department Admin' },
]

const initialCrForm = { name: '', email: '', password: '', department: '', designation: DESIGNATIONS[0] }
const initialAdminForm = { name: '', email: '', password: '', department: '', adminType: ADMIN_TYPES[0].value }

const RegisterPage = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [activeTab, setActiveTab] = useState('cr')
  const [crForm, setCrForm] = useState(initialCrForm)
  const [adminForm, setAdminForm] = useState(initialAdminForm)
  const [error, setError] = useState('')
  const [adminSuccessMessage, setAdminSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectTab = (tab) => {
    setActiveTab(tab)
    setError('')
    setAdminSuccessMessage('')
  }

  const handleCrChange = (event) => {
    const { name, value } = event.target
    setCrForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAdminChange = (event) => {
    const { name, value } = event.target
    setAdminForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCrSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { data } = await registerCR(crForm)
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdminSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setAdminSuccessMessage('')
    setIsSubmitting(true)

    try {
      const { message } = await registerAdmin(adminForm)
      setAdminSuccessMessage(message || 'Account pending super admin approval')
      setAdminForm(initialAdminForm)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register-page flex min-h-svh items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="register-card w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <Link to="/" className="flex items-center justify-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">C</span>
          CampusBook
        </Link>
        <h1 className="mt-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Create an account</h1>

        <div className="register-tabs mt-6 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => selectTab('cr')}
            className={`rounded-md py-2 text-sm font-semibold transition ${
              activeTab === 'cr'
                ? 'bg-white text-indigo-600 shadow dark:bg-gray-900 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            CR / Faculty
          </button>
          <button
            type="button"
            onClick={() => selectTab('admin')}
            className={`rounded-md py-2 text-sm font-semibold transition ${
              activeTab === 'admin'
                ? 'bg-white text-indigo-600 shadow dark:bg-gray-900 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {activeTab === 'cr' ? (
          <form className="mt-5 space-y-4" onSubmit={handleCrSubmit}>
            <div>
              <label htmlFor="cr-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                id="cr-name"
                name="name"
                required
                value={crForm.name}
                onChange={handleCrChange}
                className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label htmlFor="cr-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                College email
              </label>
              <input
                id="cr-email"
                name="email"
                type="email"
                required
                value={crForm.email}
                onChange={handleCrChange}
                className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="you@college.edu"
              />
            </div>

            <div>
              <label htmlFor="cr-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="cr-password"
                name="password"
                type="password"
                required
                minLength={8}
                value={crForm.password}
                onChange={handleCrChange}
                className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cr-department"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Department
                </label>
                <input
                  id="cr-department"
                  name="department"
                  required
                  value={crForm.department}
                  onChange={handleCrChange}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="CSE"
                />
              </div>

              <div>
                <label
                  htmlFor="cr-designation"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Designation
                </label>
                <select
                  id="cr-designation"
                  name="designation"
                  value={crForm.designation}
                  onChange={handleCrChange}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {DESIGNATIONS.map((designation) => (
                    <option key={designation} value={designation}>
                      {designation}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="register-submit w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleAdminSubmit}>
            {adminSuccessMessage && (
              <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {adminSuccessMessage}
              </div>
            )}

            <div>
              <label
                htmlFor="admin-name"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <input
                id="admin-name"
                name="name"
                required
                value={adminForm.name}
                onChange={handleAdminChange}
                className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="admin-email"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                College email
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                required
                value={adminForm.email}
                onChange={handleAdminChange}
                className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="you@college.edu"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                minLength={8}
                value={adminForm.password}
                onChange={handleAdminChange}
                className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="admin-department"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Department
                </label>
                <input
                  id="admin-department"
                  name="department"
                  required
                  value={adminForm.department}
                  onChange={handleAdminChange}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="CSE"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-type"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Admin type
                </label>
                <select
                  id="admin-type"
                  name="adminType"
                  value={adminForm.adminType}
                  onChange={handleAdminChange}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {ADMIN_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="register-submit w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Request admin account'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
