export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', fieldErrors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  static badRequest(message, code = 'BAD_REQUEST', fieldErrors = null) {
    return new AppError(message, 400, code, fieldErrors);
  }

  static validationError(message = 'Data yang dikirim tidak valid.', fieldErrors = null, code = 'VALIDATION_ERROR') {
    return new AppError(message, 400, code, fieldErrors);
  }

  static unauthorized(message = 'Autentikasi diperlukan.', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Akses ditolak.', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Sumber daya tidak ditemukan.', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  static unprocessable(message, code = 'UNPROCESSABLE_ENTITY') {
    return new AppError(message, 422, code);
  }
}
