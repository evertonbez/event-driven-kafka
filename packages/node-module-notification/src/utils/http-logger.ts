import { logger } from "./logger";
import type { Context, MiddlewareHandler } from "hono";

type RequestHeaderReader = {
  header: (name: string) => string | undefined;
};

export type RequestTrace = {
  requestId: string;
  cfRay?: string;
};

export function getRequestTrace(request: RequestHeaderReader): RequestTrace {
  const cfRay = request.header("cf-ray") ?? undefined;
  const requestId =
    request.header("x-request-id") ?? cfRay ?? crypto.randomUUID();

  return { requestId, cfRay };
}

export const httpLogger = (): MiddlewareHandler => {
  return async (context: Context, next) => {
    const start = process.hrtime.bigint();

    const method = context.req.method;
    const url = context.req.url;
    const path = new URL(url).pathname;
    const { requestId, cfRay } = getRequestTrace(context.req);

    logger.info(`${method} ${path} - incoming request`, {
      requestId,
      cfRay,
    });

    await next();

    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
    const statusCode = context.res.status;

    logger.info(
      `${method} ${path} ${statusCode} - completed in ${duration.toFixed(2)}ms`,
      {
        requestId,
        cfRay,
      },
    );
  };
};
