import mongoose from 'mongoose'
import { env } from './env.js'
import logger from '../utils/logger.js'

mongoose.set('strictQuery', true)

export const connectDB = async () => {
  const conn = await mongoose.connect(env.mongodbUri)
  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`)
  return conn
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected')
})

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`)
})

export default connectDB
