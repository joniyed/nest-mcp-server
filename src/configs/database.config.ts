import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Pool } from 'pg';
import { envConfig } from '../constatns/global.constant.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- Shared PG Config ---------- */
const isSSL = envConfig.DB_SSL === 'true';
const rejectUnauthorized = envConfig.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

export const commonDbOptions = {
  host: envConfig.DB_HOST,
  port: +envConfig.DB_PORT,
  user: envConfig.DB_USERNAME,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_NAME,
  max: 30, // pool size
  idleTimeoutMillis: 30000,
  ...(isSSL && {
    ssl: {
      rejectUnauthorized,
    },
  }),
};

/* ---------- TypeORM Config ---------- */
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: commonDbOptions.host,
  port: +commonDbOptions.port,
  username: commonDbOptions.user,
  password: commonDbOptions.password,
  database: commonDbOptions.database,
  synchronize: process.env.NODE_ENV !== 'production',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  extra: {
    max: commonDbOptions.max,
    idleTimeoutMillis: commonDbOptions.idleTimeoutMillis,
    ...(isSSL && {
      ssl: {
        rejectUnauthorized,
      },
    }),
  },
};

/* ---------- Utility to Set Initial Sequences ---------- */
export const setInitialSequenceValues = async (): Promise<void> => {
  const pool = new Pool(commonDbOptions);

  try {
    const { rows: sequences } = await pool.query(`
      SELECT pg_get_serial_sequence(table_name, column_name) AS sequence_name
      FROM information_schema.columns
      WHERE column_default LIKE 'nextval%'
        AND table_schema = 'public';
    `);

    for (const row of sequences) {
      const sequenceName = row.sequence_name;
      if (!sequenceName) continue;

      try {
        const { rows: currentValRows } = await pool.query(
          `SELECT last_value
           FROM ${sequenceName};`,
        );
        const currentVal = Number(currentValRows[0]?.last_value);

        if (currentVal < 100) {
          await pool.query(`ALTER SEQUENCE ${sequenceName} RESTART WITH 101;`);
          console.log(`✅ Sequence ${sequenceName} restarted at 101`);
        } else {
          console.log(`⏩ Sequence ${sequenceName} is already >= 100`);
        }
      } catch (err) {
        console.error(`❌ Error processing sequence ${sequenceName}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error fetching sequences:', err);
  } finally {
    await pool.end();
  }
};
