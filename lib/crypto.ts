// Utilities cho việc hash password và tạo salt

/**
 * Tạo salt ngẫu nhiên
 * @returns Chuỗi hex 32 ký tự
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash một chuỗi bằng SHA-256
 * @param message Chuỗi cần hash
 * @returns Promise<string> Chuỗi hex đã hash
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password với salt (double hash để tăng bảo mật)
 * @param password Mật khẩu gốc
 * @param salt Salt
 * @returns Promise<string> Password đã hash
 */
export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  // Double hash để tăng bảo mật
  const firstHash = await sha256(password + salt);
  const secondHash = await sha256(firstHash + salt);
  return secondHash;
}

/**
 * Xác minh password
 * @param inputHash Hash từ client gửi lên
 * @param storedHash Hash đã lưu trong database
 * @param salt Salt của user
 * @returns Promise<boolean> True nếu khớp
 */
export async function verifyPassword(
  inputHash: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  // Hash inputHash với salt giống như khi đăng ký
  const hashedInput = await hashPassword(inputHash, salt);

  // So sánh constant-time để chống timing attack
  if (hashedInput.length !== storedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < hashedInput.length; i++) {
    result |= hashedInput.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Hash password phía client (dùng email làm salt ban đầu)
 * Hàm này được sử dụng ở client trước khi gửi lên server
 * @param password Mật khẩu gốc
 * @param email Email làm salt
 * @returns Promise<string> Password đã hash
 */
export async function clientHashPassword(
  password: string,
  email: string
): Promise<string> {
  return hashPassword(password, email.toLowerCase());
}
