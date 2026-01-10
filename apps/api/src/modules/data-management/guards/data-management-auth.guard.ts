import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * DataManagementAuthGuard
 *
 * - In non-production: allow requests (developer-friendly)
 * - In production: require either `x-user-id` (dev-style) or `Authorization` header
 *
 * TODO: Replace with real auth (e.g. Clerk) when integrated.
 */
@Injectable()
export class DataManagementAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'production') return true;

    const req = context
      .switchToHttp()
      .getRequest<{ headers?: Record<string, unknown> }>();

    const headers = req?.headers ?? {};
    const userId = headers['x-user-id'];
    const auth = headers['authorization'];

    const hasUserId = typeof userId === 'string' && userId.trim().length > 0;
    const hasAuth = typeof auth === 'string' && auth.trim().length > 0;

    if (hasUserId || hasAuth) return true;

    throw new UnauthorizedException(
      'Missing authentication: provide `x-user-id` or `Authorization` header'
    );
  }
}

