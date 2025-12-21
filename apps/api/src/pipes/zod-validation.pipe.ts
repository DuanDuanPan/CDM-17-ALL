import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) { }

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Validate request bodies and query objects; skip path params/custom by default.
    // For 'body' we additionally support raw JSON strings (missing Content-Type).
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    // Accept raw JSON strings (e.g., when Content-Type header is missing)
    let parsedValue = value;
    if (metadata.type === 'body' && typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch (err) {
        throw new BadRequestException({
          message: 'Invalid JSON body',
          issues: [{ path: '', message: 'Body is not valid JSON' }],
        });
      }
    }

    const result = this.schema.safeParse(parsedValue);
    if (!result.success) {
      throw new BadRequestException(this.formatErrors(result.error));
    }
    return result.data;
  }

  private formatErrors(error: ZodError) {
    return {
      message: 'Validation failed',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
}
