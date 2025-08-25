import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

export const PostgresDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  username: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  synchronize: false,
  logging: true,
  entities: ['src/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [],
});
