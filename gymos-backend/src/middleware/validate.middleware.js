const { errorResponse } = require('../utils/ApiResponse');

/**
 * Validate request body/query/params against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return errorResponse(res, 'Validation failed', errors, 400);
    }

    // Replace with parsed/coerced data
    req[source] = result.data;
    next();
  };
};

module.exports = { validate };
