import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EntitySchema } from 'typeorm';

type EntityClass = Function | string | EntitySchema;

// `database` is a required argument rather than a shared env var: that is what
// enforces database-per-service. Entities are explicit, never globbed.
export function postgresOptions(
  config: ConfigService,
  database: string,
  entities: EntityClass[],
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('POSTGRES_HOST'),
    port: Number(config.getOrThrow<string>('POSTGRES_PORT')),
    username: config.getOrThrow<string>('POSTGRES_USER'),
    password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
    database,
    entities,
    synchronize: config.get<string>('TYPEORM_SYNCHRONIZE') === 'true',
    logging: config.get<string>('TYPEORM_LOGGING') === 'true',
  };
}
