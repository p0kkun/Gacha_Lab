/**
 * 管理画面の認証ユーティリティ（DBセッション）
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/admin-crypto';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DAYS = 7;

export type AdminAuthContext = {
  adminUserId: number;
  roleName: string | null;
  exclusionLinks: string[];
};

function getCookieValue(request: NextRequest, name: string): string | null {
  if (request.cookies?.get) {
    const cookie = request.cookies.get(name);
    return cookie?.value ?? null;
  }
  const cookieHeader = request.headers?.get?.('cookie');
  if (!cookieHeader) return null;
  const parsed = parseCookieHeader(cookieHeader);
  return parsed[name] ?? null;
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers?.get?.('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export function getAdminSessionToken(request: NextRequest): string | null {
  return getBearerToken(request) ?? getCookieValue(request, ADMIN_SESSION_COOKIE);
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName) return acc;
    acc[rawName] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function formatCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    expires?: Date;
  }
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

export function setResponseCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    expires?: Date;
  }
) {
  if (response.cookies?.set) {
    response.cookies.set(name, value, options);
    return;
  }
  response.headers.append('Set-Cookie', formatCookie(name, value, options));
}

function isPathExcluded(pathname: string, exclusionLinks: string[]): boolean {
  if (!exclusionLinks.length) return false;
  return exclusionLinks.some((pattern) => {
    if (!pattern) return false;
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    }
    return pathname === pattern;
  });
}

export async function getAdminAuthContext(
  request: NextRequest
): Promise<AdminAuthContext | null> {
  const rawToken = getAdminSessionToken(request);
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      adminUser: {
        include: {
          role: {
            include: { exclusionLinks: true },
          },
        },
      },
    },
  });

  if (!session?.adminUser || !session.adminUser.isActive) return null;

  const exclusionLinks =
    session.adminUser.role?.exclusionLinks?.map((l) => l.link) ?? [];

  return {
    adminUserId: session.adminUser.id,
    roleName: session.adminUser.role?.name ?? null,
    exclusionLinks,
  };
}

export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const context = await getAdminAuthContext(request);
  if (!context) return false;

  const pathname = request.nextUrl?.pathname ?? '';
  if (pathname && isPathExcluded(pathname, context.exclusionLinks)) {
    return false;
  }

  return true;
}

export function withAdminAuth<T>(handler: (req: NextRequest) => Promise<T>) {
  return async (req: NextRequest): Promise<T | Response> => {
    if (!(await verifyAdminAuth(req))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as T;
    }
    return handler(req);
  };
}

export const ADMIN_SESSION_COOKIE_NAME = ADMIN_SESSION_COOKIE;
export const ADMIN_SESSION_TTL_DAYS = SESSION_DAYS;
