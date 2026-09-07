import { Logger } from '@nestjs/common';
import { SagaEventEnvelope, SagaEventPattern } from '../events';

export class SagaLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  published(pattern: SagaEventPattern, event: SagaEventEnvelope, detail?: Record<string, unknown>): void {
    this.logger.log(this.line('PUBLISH  ', pattern, event, detail));
  }

  received(pattern: SagaEventPattern, event: SagaEventEnvelope, detail?: Record<string, unknown>): void {
    this.logger.log(this.line('RECEIVE  ', pattern, event, detail));
  }

  skipped(pattern: SagaEventPattern, event: SagaEventEnvelope): void {
    this.logger.warn(
      this.line('DUPLICATE', pattern, event, { action: 'skipped, state unchanged' }),
    );
  }

  compensating(pattern: SagaEventPattern, event: SagaEventEnvelope, detail?: Record<string, unknown>): void {
    this.logger.warn(this.line('COMPENSATE', pattern, event, detail));
  }

  stateChanged(
    entity: string,
    id: string,
    from: string,
    to: string,
    correlationId: string,
  ): void {
    this.logger.log(
      `STATE     ${entity}(${id}) ${from} -> ${to} [correlationId=${correlationId}]`,
    );
  }

  rejected(reason: string, correlationId: string, detail?: Record<string, unknown>): void {
    this.logger.warn(
      `REJECT    ${reason} [correlationId=${correlationId}]${this.format(detail)}`,
    );
  }

  private line(
    verb: string,
    pattern: SagaEventPattern,
    event: SagaEventEnvelope,
    detail?: Record<string, unknown>,
  ): string {
    return `${verb} ${pattern} [correlationId=${event.correlationId}] [eventId=${event.eventId}]${this.format(detail)}`;
  }

  private format(detail?: Record<string, unknown>): string {
    if (!detail || Object.keys(detail).length === 0) {
      return '';
    }
    const pairs = Object.entries(detail)
      .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join(' ');
    return ` ${pairs}`;
  }
}
