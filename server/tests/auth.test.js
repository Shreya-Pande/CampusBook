import { jest } from '@jest/globals'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import redis from '../src/config/redis.js'
import User from '../src/models/User.js'
import { connectTestDB } from './helpers/testConnection.js'

jest.setTimeout(30000)

describe('Auth flow', () => {
  const suffix = Date.now()
  const crEmail = `auth.cr.${suffix}@college.edu`
  const crPassword = 'Password@123'
  const adminEmail = `auth.admin.${suffix}@college.edu`
  const adminPassword = 'Password@123'

  let crUserId
  let adminUserId

  beforeAll(async () => {
    await connectTestDB()
  })

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [crEmail, adminEmail] } })
    await redis.del(`refresh:${crUserId}`, `refresh:${adminUserId}`)
    await mongoose.connection.close()
    await redis.quit()
  })

  describe('POST /api/auth/register/cr', () => {
    it('creates a user with isApproved true and returns tokens', async () => {
      const res = await request(app).post('/api/auth/register/cr').send({
        name: 'Auth CR',
        email: crEmail,
        password: crPassword,
        department: 'CSE',
        designation: 'CR',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.user.isApproved).toBe(true)
      expect(res.body.data.user.password).toBeUndefined()
      expect(res.body.data.accessToken).toEqual(expect.any(String))
      expect(res.body.data.refreshToken).toEqual(expect.any(String))

      crUserId = res.body.data.user._id
    })

    it('returns 409 for a duplicate email', async () => {
      const res = await request(app).post('/api/auth/register/cr').send({
        name: 'Auth CR Duplicate',
        email: crEmail,
        password: crPassword,
        department: 'CSE',
        designation: 'CR',
      })

      expect(res.status).toBe(409)
    })
  })

  describe('POST /api/auth/register/admin', () => {
    it('creates a user with isApproved false and returns no tokens', async () => {
      const res = await request(app).post('/api/auth/register/admin').send({
        name: 'Auth Admin',
        email: adminEmail,
        password: adminPassword,
        department: 'CSE',
        adminType: 'hod',
      })

      expect(res.status).toBe(201)
      expect(res.body.data).toBeNull()

      const created = await User.findOne({ email: adminEmail })
      expect(created).not.toBeNull()
      expect(created.role).toBe('admin')
      expect(created.isApproved).toBe(false)
      adminUserId = created._id.toString()
    })
  })

  describe('POST /api/auth/login', () => {
    it('returns tokens for correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: crEmail, password: crPassword })

      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toEqual(expect.any(String))
      expect(res.body.data.refreshToken).toEqual(expect.any(String))
    })

    it('returns 401 for a wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: crEmail, password: 'WrongPassword@999' })

      expect(res.status).toBe(401)
    })

    it('returns 403 for an unapproved admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: adminPassword })

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/auth/me', () => {
    let accessToken

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: crEmail, password: crPassword })
      accessToken = res.body.data.accessToken
    })

    it('returns the user without the password field for a valid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe(crEmail)
      expect(res.body.data.user.password).toBeUndefined()
    })

    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/auth/me')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/refresh and POST /api/auth/logout', () => {
    let accessToken
    let refreshToken

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: crEmail, password: crPassword })
      accessToken = res.body.data.accessToken
      refreshToken = res.body.data.refreshToken

      // JWTs are deterministic given identical payload + secret, and `iat`
      // only has second-level precision — refreshing within the same
      // wall-clock second as login would reissue a byte-identical token,
      // making it impossible to tell old from new. A >1s gap guarantees a
      // genuinely distinct token so rotation is actually observable below.
      await new Promise((resolve) => setTimeout(resolve, 1100))
    })

    it('rotates tokens and rejects reuse of the old refresh token', async () => {
      const first = await request(app).post('/api/auth/refresh').send({ refreshToken })

      expect(first.status).toBe(200)
      expect(first.body.data.refreshToken).toEqual(expect.any(String))
      expect(first.body.data.refreshToken).not.toBe(refreshToken)

      const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken })
      expect(reuse.status).toBe(401)

      accessToken = first.body.data.accessToken
    })

    it('logout invalidates the session', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)

      const stored = await redis.get(`refresh:${crUserId}`)
      expect(stored).toBeNull()
    })
  })
})
