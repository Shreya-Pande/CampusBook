import mongoose from 'mongoose'
import { env } from '../src/config/env.js'
import connectDB from '../src/config/db.js'
import logger from '../src/utils/logger.js'
import User from '../src/models/User.js'
import Resource from '../src/models/Resource.js'
import Timetable from '../src/models/Timetable.js'
import BookingArchive from '../src/models/BookingArchive.js'
import WeeklyPortalWindow from '../src/models/WeeklyPortalWindow.js'
import { getDayOfWeek, formatLocalDate } from '../src/utils/timeUtils.js'

const HOD_SEED_PASSWORD = 'Hod@2025'
const SAMPLE_USER_PASSWORD = 'Sample@2025'

const seedSuperAdmin = async () => {
  const existing = await User.findOne({ adminType: 'super_admin' })
  if (existing) {
    logger.info('Super admin already exists, skipping')
    return existing
  }

  const superAdmin = await User.create({
    name: 'Super Admin',
    email: env.superAdmin.email,
    password: env.superAdmin.password,
    role: 'admin',
    adminType: 'super_admin',
    department: 'Administration',
    isApproved: true,
  })
  logger.info(`Super admin created: ${superAdmin.email}`)
  return superAdmin
}

const seedHODs = async () => {
  const hods = [
    { name: 'Dr. Ramesh Kulkarni', email: 'hod.cse@college.edu', department: 'CSE' },
    { name: 'Dr. Anjali Deshpande', email: 'hod.it@college.edu', department: 'IT' },
  ]

  const byDept = {}
  for (const hod of hods) {
    let doc = await User.findOne({ email: hod.email })
    if (doc) {
      logger.info(`HOD already exists: ${hod.email}, skipping`)
    } else {
      doc = await User.create({
        ...hod,
        password: HOD_SEED_PASSWORD,
        role: 'admin',
        adminType: 'hod',
        designation: 'HOD',
        isApproved: true,
      })
      logger.info(`HOD created: ${hod.email} (password: ${HOD_SEED_PASSWORD})`)
    }
    byDept[hod.department] = doc
  }
  return byDept
}

const seedSampleUsers = async () => {
  const samples = [
    { name: 'Priya Sharma', email: 'priya.sharma@college.edu', department: 'CSE', designation: 'CR' },
    {
      name: 'Rohan Mehta',
      email: 'rohan.mehta@college.edu',
      department: 'CSE',
      designation: 'TnP Officer',
    },
    { name: 'Ananya Iyer', email: 'ananya.iyer@college.edu', department: 'IT', designation: 'CR' },
    { name: 'Karan Verma', email: 'karan.verma@college.edu', department: 'IT', designation: 'Faculty' },
  ]

  const saved = []
  for (const sample of samples) {
    let doc = await User.findOne({ email: sample.email })
    if (!doc) {
      doc = await User.create({
        ...sample,
        password: SAMPLE_USER_PASSWORD,
        role: 'cr_faculty',
        adminType: null,
      })
    }
    saved.push(doc)
  }
  logger.info(`${saved.length} sample CR/Faculty users seeded`)
  return saved
}

const seedResources = async (createdBy) => {
  const resources = [
    {
      name: 'Classroom 101',
      type: 'classroom',
      department: 'CSE',
      building: 'A Block',
      floor: '1',
      capacity: 60,
      amenities: ['projector', 'whiteboard'],
      requiresApprovalAlways: false,
    },
    {
      name: 'Classroom 202',
      type: 'classroom',
      department: 'IT',
      building: 'B Block',
      floor: '2',
      capacity: 50,
      amenities: ['projector', 'whiteboard', 'ac'],
      requiresApprovalAlways: false,
    },
    {
      name: 'Networks Lab',
      type: 'lab',
      department: 'CSE',
      building: 'A Block',
      floor: '3',
      capacity: 30,
      amenities: ['computers', 'projector', 'ac'],
      requiresApprovalAlways: true,
    },
    {
      name: 'Main Auditorium',
      type: 'auditorium',
      department: 'Administration',
      building: 'Main Block',
      floor: 'Ground',
      capacity: 300,
      amenities: ['stage', 'sound_system', 'projector', 'ac'],
      requiresApprovalAlways: true,
    },
  ]

  const saved = []
  for (const resource of resources) {
    const doc = await Resource.findOneAndUpdate(
      { name: resource.name },
      { ...resource, createdBy },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
    saved.push(doc)
  }
  logger.info(`${saved.length} resources seeded`)
  return saved
}

const seedTimetable = async (resources) => {
  const byName = Object.fromEntries(resources.map((r) => [r.name, r._id]))
  const academicYear = '2025-26'
  const effectiveFrom = new Date('2025-08-01')

  // One entry per weekday per resource — full Monday-Friday coverage on
  // each of the 4 seeded resources.
  const entries = [
    // Classroom 101 (CSE)
    { resourceId: byName['Classroom 101'], dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', subject: 'Data Structures', classSection: 'CSE-2A', facultyName: 'Dr. Sharma', semester: 3 },
    { resourceId: byName['Classroom 101'], dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:00', subject: 'Algorithms', classSection: 'CSE-2A', facultyName: 'Dr. Verma', semester: 3 },
    { resourceId: byName['Classroom 101'], dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00', subject: 'DBMS', classSection: 'CSE-2B', facultyName: 'Dr. Rao', semester: 3 },
    { resourceId: byName['Classroom 101'], dayOfWeek: 'Thursday', startTime: '09:00', endTime: '10:00', subject: 'Operating Systems', classSection: 'CSE-2A', facultyName: 'Dr. Sharma', semester: 3 },
    { resourceId: byName['Classroom 101'], dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:00', subject: 'Discrete Maths', classSection: 'CSE-2B', facultyName: 'Dr. Iyer', semester: 3 },

    // Classroom 202 (IT)
    { resourceId: byName['Classroom 202'], dayOfWeek: 'Monday', startTime: '10:00', endTime: '11:00', subject: 'Java Programming', classSection: 'IT-2A', facultyName: 'Prof. Iyer', semester: 3 },
    { resourceId: byName['Classroom 202'], dayOfWeek: 'Tuesday', startTime: '11:00', endTime: '12:00', subject: 'Operating Systems', classSection: 'IT-2A', facultyName: 'Prof. Nair', semester: 3 },
    { resourceId: byName['Classroom 202'], dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '11:00', subject: 'Data Communication', classSection: 'IT-2B', facultyName: 'Prof. Menon', semester: 3 },
    { resourceId: byName['Classroom 202'], dayOfWeek: 'Thursday', startTime: '10:00', endTime: '11:00', subject: 'Computer Networks', classSection: 'IT-3A', facultyName: 'Prof. Menon', semester: 5 },
    { resourceId: byName['Classroom 202'], dayOfWeek: 'Friday', startTime: '11:00', endTime: '12:00', subject: 'Software Engineering', classSection: 'IT-3A', facultyName: 'Prof. Nair', semester: 5 },

    // Networks Lab (CSE)
    { resourceId: byName['Networks Lab'], dayOfWeek: 'Monday', startTime: '14:00', endTime: '16:00', subject: 'Networks Lab', classSection: 'CSE-3A', facultyName: 'Dr. Sharma', semester: 5 },
    { resourceId: byName['Networks Lab'], dayOfWeek: 'Tuesday', startTime: '14:00', endTime: '16:00', subject: 'OS Lab', classSection: 'CSE-2A', facultyName: 'Dr. Rao', semester: 3 },
    { resourceId: byName['Networks Lab'], dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '16:00', subject: 'DBMS Lab', classSection: 'CSE-2A', facultyName: 'Dr. Rao', semester: 3 },
    { resourceId: byName['Networks Lab'], dayOfWeek: 'Thursday', startTime: '14:00', endTime: '16:00', subject: 'Java Lab', classSection: 'CSE-2B', facultyName: 'Dr. Verma', semester: 3 },
    { resourceId: byName['Networks Lab'], dayOfWeek: 'Friday', startTime: '14:00', endTime: '16:00', subject: 'Project Lab', classSection: 'CSE-3A', facultyName: 'Dr. Sharma', semester: 5 },

    // Main Auditorium (Administration)
    { resourceId: byName['Main Auditorium'], dayOfWeek: 'Monday', startTime: '15:00', endTime: '17:00', subject: 'Orientation Session', classSection: 'All', facultyName: 'Dr. Gupta', semester: 0 },
    { resourceId: byName['Main Auditorium'], dayOfWeek: 'Tuesday', startTime: '15:00', endTime: '17:00', subject: 'Workshop', classSection: 'All', facultyName: 'Dr. Gupta', semester: 0 },
    { resourceId: byName['Main Auditorium'], dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '12:00', subject: 'Seminar', classSection: 'All', facultyName: 'Dr. Gupta', semester: 0 },
    { resourceId: byName['Main Auditorium'], dayOfWeek: 'Thursday', startTime: '15:00', endTime: '17:00', subject: 'Guest Lecture', classSection: 'All', facultyName: 'Dr. Gupta', semester: 0 },
    { resourceId: byName['Main Auditorium'], dayOfWeek: 'Friday', startTime: '10:00', endTime: '12:00', subject: 'Tech Fest Rehearsal', classSection: 'All', facultyName: 'Dr. Gupta', semester: 0 },
  ]

  // Reset to the canonical seed set each run rather than accumulating
  // upserts across re-seeds with a changing entry list.
  await Timetable.deleteMany({ resourceId: { $in: Object.values(byName) } })
  await Timetable.insertMany(entries.map((entry) => ({ ...entry, academicYear, effectiveFrom, isActive: true })))

  logger.info(`${entries.length} timetable entries seeded`)
}

// Weekdays only, walking back from yesterday — guarantees every date lands
// on a valid Booking/BookingArchive dayOfWeek and stays within the last ~30
// calendar days (20 weekdays span about 4 weeks once weekends are skipped).
const weekdayDatesGoingBack = (count) => {
  const dates = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - 1)

  while (dates.length < count) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return dates.reverse()
}

const mondayOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

// 20 historical BookingArchive documents spanning the last 30 days, across
// every seeded department/resource/status combination, so Phase 9 analytics
// (utilization, peak hours, department breakdown, portal rush, HOD response
// time) all have real data to aggregate instead of returning empty arrays.
const seedBookingArchive = async (resources, sampleUsers, hodsByDept) => {
  const byName = Object.fromEntries(resources.map((r) => [r.name, r]))
  const dates = weekdayDatesGoingBack(20)

  const RESOURCE_NAMES = ['Classroom 101', 'Classroom 202', 'Networks Lab', 'Main Auditorium']
  const TIME_SLOTS = [
    ['09:00', '10:00'],
    ['10:00', '11:00'],
    ['11:00', '12:00'],
    ['14:00', '16:00'],
    ['15:00', '17:00'],
  ]
  const INSTANT_STATUSES = ['approved', 'approved', 'completed', 'cancelled']
  const APPROVAL_STATUSES = ['approved', 'rejected', 'completed']

  // Group dates by the Monday of their week so each archived booking ties
  // back to a synthetic WeeklyPortalWindow, mirroring how the real Friday
  // 5:05 PM archive cron associates archived bookings with their window.
  const weekGroups = new Map()
  for (const date of dates) {
    const key = formatLocalDate(mondayOfWeek(date))
    if (!weekGroups.has(key)) weekGroups.set(key, [])
    weekGroups.get(key).push(date)
  }

  const windowByWeek = new Map()
  for (const [weekKey, weekDates] of weekGroups.entries()) {
    const weekStartDate = new Date(weekKey)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 4)
    weekEndDate.setHours(17, 0, 0, 0)

    const window = await WeeklyPortalWindow.findOneAndUpdate(
      { weekStartDate },
      {
        weekStartDate,
        weekEndDate,
        portalOpensAt: weekStartDate,
        portalClosesAt: weekEndDate,
        status: 'archived',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
    windowByWeek.set(weekKey, { window, dates: weekDates })
  }

  const entries = dates.map((date, index) => {
    const resource = byName[RESOURCE_NAMES[index % RESOURCE_NAMES.length]]
    const user = sampleUsers[index % sampleUsers.length]
    const [startTime, endTime] = TIME_SLOTS[index % TIME_SLOTS.length]
    const isApproval = index % 3 === 0
    const bookingType = isApproval ? 'approval_required' : 'instant'
    const status = isApproval
      ? APPROVAL_STATUSES[index % APPROVAL_STATUSES.length]
      : INSTANT_STATUSES[index % INSTANT_STATUSES.length]
    const approver = hodsByDept[resource.department] || hodsByDept.CSE
    const weekKey = formatLocalDate(mondayOfWeek(date))
    const { window } = windowByWeek.get(weekKey)

    return {
      portalWindowId: window._id,
      resourceIds: [resource._id],
      userId: user._id,
      date,
      dayOfWeek: getDayOfWeek(date),
      startTime,
      endTime,
      bookingType,
      status,
      assignedApproverId: isApproval ? approver._id : undefined,
      approvedBy: ['approved', 'completed'].includes(status) ? approver._id : undefined,
      rejectedBy: status === 'rejected' ? approver._id : undefined,
      rejectionReason:
        status === 'rejected' ? 'Resource already committed to a prior departmental event.' : undefined,
      formData: { eventName: `${resource.name} session`, priority: 'medium' },
      archivedAt: new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000),
      archiveReason: 'week_closed',
    }
  })

  // Reset to the canonical seed set each run, same convention as seedTimetable.
  await BookingArchive.deleteMany({ userId: { $in: sampleUsers.map((u) => u._id) } })
  await BookingArchive.insertMany(entries)

  // Backfill window stats so the portal-rush analytics endpoint has real
  // numbers too, approximating what the Friday close cron would have
  // computed live that week.
  for (const { window, dates: weekDates } of windowByWeek.values()) {
    const weekKeys = new Set(weekDates.map((d) => formatLocalDate(d)))
    const weekEntries = entries.filter((e) => weekKeys.has(formatLocalDate(e.date)))
    const totalBookingsMade = weekEntries.filter((e) => e.bookingType === 'instant').length
    const totalRequests = weekEntries.filter((e) => e.bookingType === 'approval_required').length
    const approvedRequests = weekEntries.filter(
      (e) => e.bookingType === 'approval_required' && e.status === 'approved',
    ).length
    const rejectedRequests = weekEntries.filter((e) => e.status === 'rejected').length

    await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
      'stats.totalBookingsMade': totalBookingsMade,
      'stats.bookingsInFirst30Min': Math.round(totalBookingsMade * 0.4),
      'stats.totalRequests': totalRequests,
      'stats.approvedRequests': approvedRequests,
      'stats.rejectedRequests': rejectedRequests,
    })
  }

  logger.info(`${entries.length} BookingArchive documents seeded across ${windowByWeek.size} archived weeks`)
}

const run = async () => {
  await connectDB()

  const superAdmin = await seedSuperAdmin()
  const hodsByDept = await seedHODs()
  const resources = await seedResources(superAdmin._id)
  await seedTimetable(resources)
  const sampleUsers = await seedSampleUsers()
  await seedBookingArchive(resources, sampleUsers, hodsByDept)

  logger.info('Seeding complete')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(async (err) => {
  logger.error(`Seeding failed: ${err.message}`)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
