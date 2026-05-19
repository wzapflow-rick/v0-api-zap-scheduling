import { AuthLayout } from '@/components/auth/auth-layout';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout variant="login">{children}</AuthLayout>;
}
