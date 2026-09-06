import { Logger } from '@nestjs/common';
import { SagaEventEnvelope, SagaEventPattern } from '../events';

/**
 * Structured logging for saga traffic.
 *
 * Every line carries the correlationId, so one saga can be followed across
 * three separate service consoles by grepping a single value. The fixed-width
 * verb column makes the interleaved output of three services readable when
 * they are tailed side by side.
 */
export class SagaLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  /** An event this service is putting on the bus. */
  published(pattern: SagaEventPattern, event: SagaEventEnvelope, detail?: Record<string, unknown>): void {
    this.logger.log(this.line('PUBLISH  ', pattern, event, detail));
  }

  /** An event this service has just consumed. */
  received(pattern: SagaEventPattern, event: SagaEventEnvelope, detail?: Record<string, unknown>): void {
    this.logger.log(this.line('RECEIVE  ', pattern, event, detail));
  }

  /** A duplicate suppressed by the idempotency guard. */
  skipped(pattern: SagaEventPattern, event: SagaEventEnvelope): void {
    this.logger.warn(
      this.line('DUPLICATE', pattern, event, { action: 'skipped, state unchanged' }),
    );
  }

  /** A compensating transaction being applied. */
  compensating(pattern: SagaEventPattern, event: SagaEventEnvelope, detail?: Record<string, unknown>): void {
    this.logger.warn(this.line('COMPENSATE', pattern, event, detail));
  }

  /** A persisted state transition. */
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

  /** A business rule rejecting the saga (out of stock, card declined). */
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
