import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Theater,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useDarkMode } from '../../hooks/useDarkMode'
import PortalStatusBanner from '../../components/portal/PortalStatusBanner/PortalStatusBanner'
import heroImg from '../../assets/hero.png'
import './LandingPage.css'

const RESOURCE_TYPES = [
  {
    type: 'classroom',
    label: 'Smart Classrooms',
    description: 'Timetable-aware rooms with live vacancy status',
    icon: GraduationCap,
    large: true,
  },
  {
    type: 'lab',
    label: 'Specialized Labs',
    description: 'Equipment-ready labs for practical sessions',
    icon: FlaskConical,
  },
  {
    type: 'auditorium',
    label: 'Auditoriums',
    description: 'Large venues for events and seminars',
    icon: Theater,
  },
  {
    type: 'sports_court',
    label: 'Sports Facilities',
    description: 'Courts and grounds for every team',
    icon: Dumbbell,
  },
]

const FEATURES = [
  {
    title: 'Conflict-free Booking',
    description: 'Transaction-safe reservations guarantee no two people ever double-book the same slot.',
    icon: ShieldCheck,
  },
  {
    title: 'Live Availability',
    description: 'Every room is classified vacant, timetable-occupied, or booked — updated in real time.',
    icon: Zap,
  },
  {
    title: 'Calendar Sync',
    description: 'Approved bookings and timetables sync into one campus-wide weekly calendar.',
    icon: CalendarCheck2,
  },
]

const STEPS = [
  { step: 1, title: 'Browse', description: 'Explore resources and see live availability for the week.' },
  { step: 2, title: 'Book', description: 'Instantly reserve a vacant slot or submit a request.' },
  { step: 3, title: 'Approve', description: 'Requests route automatically to the right department admin.' },
  { step: 4, title: 'Use', description: 'Show up — your slot is confirmed and conflict-free.' },
]

const FOOTER_LINKS = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Campus Map', href: '#' },
  { label: 'Contact Support', href: 'mailto:support@campusbook.edu' },
]

const LandingPage = () => {
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="landing-page min-h-full bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="landing-navbar sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">C</span>
            CampusBook
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex dark:text-gray-300">
            <a href="#top" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Home
            </a>
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="theme-toggle rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Login
            </Link>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Toggle navigation"
              onClick={() => setMobileNavOpen((prev) => !prev)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav className="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 text-sm font-medium md:hidden dark:border-gray-800">
            <a href="#top" className="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              Home
            </a>
            <a href="#features" className="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              Features
            </a>
            <a href="#how-it-works" className="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              How It Works
            </a>
          </nav>
        )}
      </header>

      <PortalStatusBanner />

      <main id="top">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Smart Campus Resource Booking</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              A timetable-aware booking platform that ends double-bookings, unfair allocation, and the guessing
              game around which room is actually free.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="hero-cta inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                View Demo
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="avatar-group flex -space-x-2">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <span
                    key={letter}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-xs font-semibold text-indigo-700 dark:border-gray-950 dark:bg-indigo-900 dark:text-indigo-200"
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Trusted by 500+ Universities</p>
            </div>
          </div>

          <div className="hero-image-wrap relative">
            <img src={heroImg} alt="Campus" className="hero-image w-full rounded-2xl object-cover shadow-xl" />
            <div className="booking-confirmed-card absolute -bottom-6 -left-6 flex items-center gap-3 rounded-xl bg-white p-4 shadow-lg dark:bg-gray-900">
              <CheckCircle2 className="text-emerald-500" size={28} />
              <div>
                <p className="text-sm font-semibold">Booking Confirmed</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Room 204 · 10:00 – 11:00 AM</p>
              </div>
            </div>
          </div>
        </section>

        {/* Resource types */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Engineered for Every Resource</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RESOURCE_TYPES.map(({ type, label, description, icon: Icon, large }) => (
              <Link
                key={type}
                to={`/resources?type=${type}`}
                className={`resource-type-card group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900 ${
                  large ? 'sm:col-span-2 sm:row-span-1' : ''
                }`}
              >
                <Icon className="text-indigo-600 dark:text-indigo-400" size={32} />
                <h3 className="mt-4 text-lg font-semibold">{label}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ title, description, icon: Icon }) => (
              <div key={title} className="feature-card rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
                <Icon className="text-indigo-600 dark:text-indigo-400" size={28} />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How It Works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="step-number mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="cta-band bg-indigo-950 px-4 py-16 text-center text-white sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to transform your campus?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-200">
            Join hundreds of departments already booking smarter with CampusBook.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-indigo-950 hover:bg-indigo-100"
            >
              Get Started Now
            </Link>
            <a
              href="mailto:support@campusbook.edu"
              className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Contact Support
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 px-4 py-10 sm:px-6 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
              C
            </span>
            CampusBook
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
