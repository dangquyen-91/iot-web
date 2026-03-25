// Script tạo tài khoản admin mặc định
// Chạy: npx tsx scripts/seed-admin.ts

const MOCKAPI_BASE_URL = process.env.MOCKAPI_URL || 'https://67cfedab823da0212a83da2c.mockapi.io';

// Thông tin tài khoản admin mặc định
const ADMIN_EMAIL = 'admin@smartfarm.vn';
const ADMIN_PASSWORD = 'Admin@123'; // Mật khẩu mặc định - nên đổi sau khi đăng nhập
const ADMIN_NAME = 'Quản trị viên';

/**
 * Tạo salt ngẫu nhiên
 */
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash password với SHA-256
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Double hash password với salt
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const firstHash = await sha256(password + salt);
  const secondHash = await sha256(firstHash + salt);
  return secondHash;
}

/**
 * Hash password phía client (dùng email làm salt ban đầu)
 */
async function clientHashPassword(password: string, email: string): Promise<string> {
  return hashPassword(password, email.toLowerCase());
}

/**
 * Kiểm tra email đã tồn tại
 */
async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${MOCKAPI_BASE_URL}/users?email=${encodeURIComponent(email)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return false;
    }

    const users = await response.json();
    return users.length > 0;
  } catch {
    return false;
  }
}

/**
 * Tạo admin user
 */
async function createAdminUser() {
  console.log('🌱 Bắt đầu tạo tài khoản admin...\n');

  // Kiểm tra email đã tồn tại
  console.log('📧 Kiểm tra email:', ADMIN_EMAIL);
  const exists = await checkEmailExists(ADMIN_EMAIL);

  if (exists) {
    console.log('⚠️  Email đã tồn tại! Tài khoản admin có thể đã được tạo.');
    console.log('   Nếu bạn quên mật khẩu, hãy xóa user trong MockAPI và chạy lại script này.');
    return;
  }

  // Tạo client hash (như khi user đăng ký từ form)
  const clientHash = await clientHashPassword(ADMIN_PASSWORD, ADMIN_EMAIL);

  // Tạo server salt và hash
  const serverSalt = generateSalt();
  const finalPasswordHash = await hashPassword(clientHash, serverSalt);

  const adminData = {
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash: finalPasswordHash,
    salt: serverSalt,
    role: 'admin',
    name: ADMIN_NAME,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  console.log('🔐 Đang tạo tài khoản...');

  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Lỗi tạo tài khoản:', error);
      return;
    }

    const user = await response.json();

    console.log('\n✅ Tạo tài khoản admin thành công!\n');
    console.log('═══════════════════════════════════════');
    console.log('   THÔNG TIN ĐĂNG NHẬP ADMIN');
    console.log('═══════════════════════════════════════');
    console.log('   📧 Email:    ', ADMIN_EMAIL);
    console.log('   🔑 Mật khẩu: ', ADMIN_PASSWORD);
    console.log('   👤 Tên:      ', ADMIN_NAME);
    console.log('   🆔 ID:       ', user.id);
    console.log('═══════════════════════════════════════');
    console.log('\n⚠️  QUAN TRỌNG: Hãy đổi mật khẩu sau khi đăng nhập lần đầu!\n');
  } catch (error) {
    console.error('❌ Lỗi kết nối:', error);
    console.log('\n💡 Gợi ý: Kiểm tra lại MOCKAPI_URL trong file .env');
  }
}

// Chạy script
createAdminUser();
