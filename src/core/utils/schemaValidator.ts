import { z, ZodSchema } from 'zod';
import { logger } from './logger';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validates data against a given Zod schema and provides structured assertion errors.
 */
export function validateSchema<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const formattedErrors = result.error.errors.map((err) => {
    const path = err.path.join('.') || 'root';
    return `[${path}]: ${err.message} (code: ${err.code})`;
  });

  return {
    success: false,
    errors: formattedErrors,
  };
}

/**
 * Asserts that data matches the Zod schema, throwing an AssertionError with diff details on failure.
 */
export function assertSchema<T>(schema: ZodSchema<T>, data: unknown, contextName = 'Schema'): T {
  const result = validateSchema(schema, data);

  if (!result.success) {
    const errorMessage = `${contextName} validation failed:\n  - ${result.errors?.join('\n  - ')}`;
    logger.error(errorMessage, { rawData: data });
    throw new Error(errorMessage);
  }

  return result.data!;
}
