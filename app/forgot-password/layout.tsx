import { AuthLayout } from '@/components/auth/auth-layout';

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout variant="forgot-password">{children}</AuthLayout>;
}
