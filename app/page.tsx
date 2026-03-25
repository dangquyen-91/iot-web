// Trang chủ - Redirect về login hoặc dashboard
// Middleware sẽ xử lý redirect dựa trên trạng thái đăng nhập

import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect về login, middleware sẽ chuyển về dashboard nếu đã đăng nhập
  redirect('/login');
}
