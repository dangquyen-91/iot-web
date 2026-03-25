// JWT-like token utilities

import type { TokenPayload, User, AuthUser } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

/**
 * Tạo HMAC signature (simple version for mockapi)
 */
async function createSignature(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tạo token từ user
 * @param user User object
 * @returns Token string
 */
export async function createToken(user: User | AuthUser): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 giờ
  };

  const base64Header = base64UrlEncode(JSON.stringify(header));
  const base64Payload = base64UrlEncode(JSON.stringify(payload));

  const signature = await createSignature(`${base64Header}.${base64Payload}`);

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify và decode token
 * @param token Token string
 * @returns TokenPayload hoặc null nếu không hợp lệ
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;

    // Verify signature
    const expectedSignature = await createSignature(`${header}.${payload}`);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const decodedPayload: TokenPayload = JSON.parse(base64UrlDecode(payload));

    // Check expiration
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
}

/**
 * Decode token mà không verify (dùng cho middleware)
 * @param token Token string
 * @returns TokenPayload hoặc null
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Lấy AuthUser từ token payload
 */
export function getAuthUserFromPayload(payload: TokenPayload): AuthUser {
  return {
    id: payload.userId,
    email: payload.email,
    name: '', // Sẽ được fetch từ API nếu cần
    role: payload.role,
  };
}
