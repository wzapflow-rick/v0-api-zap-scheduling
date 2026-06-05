import { ConfirmationClient } from './confirmation-client';

export const metadata = {
  title: 'Confirmar Agendamento',
  description: 'Confirme a sua presença no agendamento.',
};

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ConfirmationClient token={token} />;
}
