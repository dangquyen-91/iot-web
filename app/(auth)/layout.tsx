// Layout cho các trang auth (login, register, etc.)

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
