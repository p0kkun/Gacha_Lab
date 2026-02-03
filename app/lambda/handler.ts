import { NextRequest } from 'next/server';
import { lambdaRouteManifest } from '../lib/lambda-route-manifest';

type LambdaEvent = {
  rawPath?: string;
  rawQueryString?: string;
  path?: string;
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
};

type LambdaResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
};

const moduleCache = new Map<string, any>();

const getHeader = (headers: Record<string, string | undefined> | undefined, key: string) => {
  if (!headers) {
    return undefined;
  }
  return headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
};

const buildUrl = (event: LambdaEvent) => {
  const path = event.rawPath ?? event.path ?? '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const host = getHeader(event.headers, 'host') ?? 'lambda.local';
  return `https://${host}${path}${query}`;
};

const decodeBody = (event: LambdaEvent) => {
  if (!event.body) {
    return undefined;
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64');
  }
  return event.body;
};

const matchRoute = (path: string) => {
  for (const entry of lambdaRouteManifest) {
    const match = entry.regex.exec(path);
    if (!match) {
      continue;
    }
    const params: Record<string, string> = {};
    entry.paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    return { entry, params };
  }
  return null;
};

const loadModule = async (modulePath: string) => {
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath);
  }
  const mod = await import(modulePath);
  moduleCache.set(modulePath, mod);
  return mod;
};

const toLambdaResponse = async (response: Response): Promise<LambdaResponse> => {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const cookies = (response.headers as any).getSetCookie?.() ?? (headers['set-cookie'] ? [headers['set-cookie']] : undefined);
  if (headers['set-cookie']) {
    delete headers['set-cookie'];
  }

  const body = await response.text();

  return {
    statusCode: response.status,
    headers,
    cookies,
    body,
    isBase64Encoded: false,
  };
};

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';
  const path = event.rawPath ?? event.path ?? '/';

  const matched = matchRoute(path);
  if (!matched) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  }

  const { entry, params } = matched;
  const mod = await loadModule(entry.modulePath);
  const routeHandler = mod[method];

  if (!routeHandler) {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const url = buildUrl(event);
  const body = decodeBody(event);
  const request = new NextRequest(url, {
    method,
    headers: event.headers as HeadersInit,
    body: body && method !== 'GET' && method !== 'HEAD' ? body : undefined,
  });

  const response = await routeHandler(request, { params });
  return toLambdaResponse(response);
};
