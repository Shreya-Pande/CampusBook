import mongoose from 'mongoose'
import { env } from '../../src/config/env.js'

const TEST_DB_NAME = 'campusbook_test'

// Redirects the env-configured Mongo URI to a dedicated test database (same
// host/replica set — required for the transactional booking code — just a
// different db name) so test runs never read/write dev or prod data.
export const connectTestDB = async () => {
  const testUri = env.mongodbUri.replace(/\/([^/?]+)(\?|$)/, `/${TEST_DB_NAME}$2`)
  return mongoose.connect(testUri)
}

export default connectTestDB
