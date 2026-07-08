import mongoose from 'mongoose'
import { env } from '../src/config/env.js'
import connectDB from '../src/config/db.js'
import logger from '../src/utils/logger.js'
import User from '../src/models/User.js'
import Resource from '../src/models/Resource.js'
import Timetable from '../src/models/Timetable.js'

const HOD_SEED_PASSWORD = 'Hod@2025'

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

  for (const hod of hods) {
    const existing = await User.findOne({ email: hod.email })
    if (existing) {
      logger.info(`HOD already exists: ${hod.email}, skipping`)
      continue
    }

    await User.create({
      ...hod,
      password: HOD_SEED_PASSWORD,
      role: 'admin',
      adminType: 'hod',
      designation: 'HOD',
      isApproved: true,
    })
    logger.info(`HOD created: ${hod.email} (password: ${HOD_SEED_PASSWORD})`)
  }
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

const run = async () => {
  await connectDB()

  const superAdmin = await seedSuperAdmin()
  await seedHODs()
  const resources = await seedResources(superAdmin._id)
  await seedTimetable(resources)

  logger.info('Seeding complete')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(async (err) => {
  logger.error(`Seeding failed: ${err.message}`)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
