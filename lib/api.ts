// MockAPI Client - Giao tiếp với mockapi.io

import type {
  User,
  Session,
  CreateUserData,
  CreateSessionData,
} from '@/types/auth';

const MOCKAPI_BASE_URL =
  process.env.MOCKAPI_URL || 'https://YOUR_PROJECT_ID.mockapi.io/api/v1';

// ==================== USER OPERATIONS ====================

/**
 * Lấy user theo email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const response = await fetch(
      `${MOCKAPI_BASE_URL}/users?email=${encodeURIComponent(email)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    const users: User[] = await response.json();
    return users[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

/**
 * Lấy user theo ID
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/users/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return null;
  }
}

/**
 * Lấy tất cả users (cho admin)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/users`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

/**
 * Tạo user mới
 */
export async function createUser(userData: CreateUserData): Promise<User | null> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

/**
 * Cập nhật user
 */
export async function updateUser(
  id: string,
  userData: Partial<User>
): Promise<User | null> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

/**
 * Xóa user
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/users/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

// ==================== SESSION OPERATIONS ====================

/**
 * Tạo session mới
 */
export async function createSession(
  sessionData: CreateSessionData
): Promise<Session | null> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Lấy session theo token
 */
export async function getSessionByToken(token: string): Promise<Session | null> {
  try {
    const response = await fetch(
      `${MOCKAPI_BASE_URL}/sessions?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    const sessions: Session[] = await response.json();
    return sessions[0] || null;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Xóa session (logout)
 */
export async function deleteSession(token: string): Promise<boolean> {
  try {
    // Tìm session theo token
    const session = await getSessionByToken(token);

    if (!session) {
      return true; // Coi như đã xóa
    }

    const response = await fetch(`${MOCKAPI_BASE_URL}/sessions/${session.id}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Xóa tất cả sessions của user (khi đổi password, etc.)
 */
export async function deleteAllUserSessions(userId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${MOCKAPI_BASE_URL}/sessions?userId=${userId}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return false;
    }

    const sessions: Session[] = await response.json();

    // Xóa từng session
    await Promise.all(
      sessions.map((session) =>
        fetch(`${MOCKAPI_BASE_URL}/sessions/${session.id}`, {
          method: 'DELETE',
        })
      )
    );

    return true;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    return false;
  }
}

// ==================== RATE LIMITING ====================

// In-memory rate limiting (reset khi server restart)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

/**
 * Kiểm tra rate limit
 * @param identifier IP hoặc email
 * @returns true nếu được phép, false nếu bị block
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);

  // Reset nếu đã quá thời gian
  if (!attempt || now > attempt.resetTime) {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: now + 15 * 60 * 1000, // 15 phút
    });
    return true;
  }

  // Block nếu quá 5 lần
  if (attempt.count >= 5) {
    return false;
  }

  attempt.count++;
  return true;
}

/**
 * Reset rate limit cho identifier
 */
export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}
