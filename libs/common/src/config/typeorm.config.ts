import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EntitySchema } from 'typeorm';

type EntityClass = Function | string | EntitySchema;

/**
 * Postgres connection options for one service.
 *
 * `database` is a required argument rather than being read from a single env
 * var, which is what enforces database-per-service: each service passes its
 * own database name and has no way to reach another service's tables.
 *
 * Entities are passed explicitly rather than discovered by glob. Globs
 * resolve against the build output and would happily pick up another
 * service's entities if the directory layout ever shifted.
 */
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
