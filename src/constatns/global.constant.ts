import * as dotenv from 'dotenv';
import * as process from 'node:process';

// Load environment variables from the .env file
dotenv.config();

// Export the environment variables
export const envConfig = {
  SERVER_PORT: process.env.SERVER_PORT,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT || 3452,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_SSL: process.env.DB_SSL,
  DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
  ADMIN_USER_NAME: process.env.ADMIN_USER_NAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  PRIVATE_SECRET: process.env.PRIVATE_SECRET,
  TCC_DATA_API_URL: process.env.TCC_DATA_API_URL,
  TCC_X_API_KEY: process.env.TCC_X_API_KEY,
};
