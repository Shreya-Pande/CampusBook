import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import Joi from 'joi'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// .env lives at the project root (server/src/config -> ../../../.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true })

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),

  MONGODB_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .required(),
  REDIS_URL: Joi.string()
    .pattern(/^rediss?:\/\//)
    .required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRY: Joi.string().required(),
  JWT_REFRESH_EXPIRY: Joi.string().required(),

  RESEND_API_KEY: Joi.string().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  SUPER_ADMIN_EMAIL: Joi.string().email().required(),
  SUPER_ADMIN_PASSWORD: Joi.string().min(8).required(),

  CLIENT_URL: Joi.string().uri().required(),
  // Optional — won't exist until after the first Vercel deploy, so it can't
  // be required at boot. Once set, app.js's CORS config allows it too.
  CLIENT_URL_PROD: Joi.string().uri().optional().allow(''),
}).unknown(true)

const { error, value: validatedEnv } = envSchema.validate(process.env, {
  abortEarly: false,
})

if (error) {
  console.error('Invalid/missing environment variables:')
  error.details.forEach((detail) => console.error(`  - ${detail.message}`))
  process.exit(1)
}

export const env = {
  nodeEnv: validatedEnv.NODE_ENV,
  isProduction: validatedEnv.NODE_ENV === 'production',
  port: validatedEnv.PORT,

  mongodbUri: validatedEnv.MONGODB_URI,
  redisUrl: validatedEnv.REDIS_URL,

  jwt: {
    accessSecret: validatedEnv.JWT_ACCESS_SECRET,
    refreshSecret: validatedEnv.JWT_REFRESH_SECRET,
    accessExpiry: validatedEnv.JWT_ACCESS_EXPIRY,
    refreshExpiry: validatedEnv.JWT_REFRESH_EXPIRY,
  },

  resendApiKey: validatedEnv.RESEND_API_KEY,

  cloudinary: {
    cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: validatedEnv.CLOUDINARY_API_KEY,
    apiSecret: validatedEnv.CLOUDINARY_API_SECRET,
  },

  superAdmin: {
    email: validatedEnv.SUPER_ADMIN_EMAIL,
    password: validatedEnv.SUPER_ADMIN_PASSWORD,
  },

  clientUrl: validatedEnv.CLIENT_URL,
  clientUrlProd: validatedEnv.CLIENT_URL_PROD || null,
}

export default env
