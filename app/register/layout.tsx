import { AuthLayout } from '@/components/auth/auth-layout';

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout variant="register">{children}</AuthLayout>;
}
