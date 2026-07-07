import path from 'path'
import { fileURLToPath } from 'url'
import winston from 'winston'
import { env } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.resolve(__dirname, '../../logs')

const { combine, timestamp, errors, json, colorize, printf } = winston.format

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => `${ts} ${level}: ${stack || message}`),
)

const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: 'campusbook-server' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
})

logger.add(
  new winston.transports.Console({
    format: env.isProduction ? json() : consoleFormat,
  }),
)

export default logger
