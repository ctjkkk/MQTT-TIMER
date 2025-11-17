import { registerAs } from '@nestjs/config'
import { DATABASE_CONSTANTS } from '../shared/constants/database.constans'
export default registerAs('database', () => ({
  host: process.env.MONGO_HOST ?? '',
  options: {
    dbName: DATABASE_CONSTANTS.DB_NAME,
    ...DATABASE_CONSTANTS.CONNECTION_OPTIONS,
  },
}))
