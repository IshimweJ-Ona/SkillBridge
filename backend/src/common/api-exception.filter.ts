import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.getMessage(exceptionResponse, exception);

    if (status >= 500) {
      const reason =
        exception instanceof Error ? exception.stack ?? exception.message : String(exception);
      this.logger.error(reason);
    }

    response.status(status).json({
      success: false,
      apiVersion: 'v1',
      message,
      errors: this.getErrors(exceptionResponse),
    });
  }

  private getMessage(response: unknown, exception: unknown) {
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message: unknown }).message;
      return Array.isArray(message) ? message[0] : String(message);
    }

    if (exception instanceof Error && !(exception instanceof HttpException)) {
      return 'Something went wrong. Please try again or contact support.';
    }

    return 'The request could not be completed.';
  }

  private getErrors(response: unknown) {
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message: unknown }).message;
      if (Array.isArray(message)) return { validation: message };
    }

    return undefined;
  }
}
