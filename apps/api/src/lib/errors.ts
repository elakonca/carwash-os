export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "ERROR",
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message: string, code = "UNPROCESSABLE_ENTITY", details?: unknown) {
    super(422, message, code, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, code = "CONFLICT", details?: unknown) {
    super(409, message, code, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message, "NOT_FOUND");
  }
}
