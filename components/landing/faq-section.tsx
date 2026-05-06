'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Como funciona o período de teste?',
    answer: 'Você pode testar todas as funcionalidades do plano Pro por 14 dias, sem precisar informar cartão de crédito. Após o período de teste, você escolhe se quer continuar com o plano pago ou migrar para o plano gratuito.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim! Não há fidelidade ou multa de cancelamento. Você pode cancelar sua assinatura a qualquer momento pelo próprio painel. Seus dados ficam disponíveis até o final do período pago.',
  },
  {
    question: 'Como meus clientes fazem agendamentos?',
    answer: 'Cada estabelecimento recebe um link único (ex: zapagenda.com/seu-negocio) que pode ser compartilhado nas redes sociais, WhatsApp, ou incorporado no seu site. Seus clientes escolhem o serviço, profissional, data e horário disponíveis.',
  },
  {
    question: 'Preciso instalar algum aplicativo?',
    answer: 'Não! O ZapAgenda funciona 100% no navegador. Você pode acessar de qualquer dispositivo com internet - computador, tablet ou celular. Também pode adicionar um atalho na tela inicial do celular para acesso rápido.',
  },
  {
    question: 'As notificações por WhatsApp são automáticas?',
    answer: 'Sim, nos planos Pro e Elite. Configuramos lembretes automáticos que são enviados 24h e 1h antes do agendamento. Você também pode enviar mensagens manuais para seus clientes.',
  },
  {
    question: 'Posso importar meus clientes atuais?',
    answer: 'Claro! Oferecemos importação via planilha Excel/CSV. Nossa equipe de suporte também pode ajudar na migração de dados de outros sistemas.',
  },
  {
    question: 'Vocês oferecem suporte?',
    answer: 'Sim! Todos os planos incluem suporte por e-mail. Planos Pro e Elite têm suporte prioritário via chat e WhatsApp. O plano Elite ainda conta com um gerente de sucesso dedicado.',
  },
  {
    question: 'Os dados dos meus clientes estão seguros?',
    answer: 'Absolutamente. Utilizamos criptografia de ponta a ponta, servidores seguros e fazemos backup diário de todos os dados. Seguimos as diretrizes da LGPD para proteção de dados pessoais.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="bg-muted/30 py-20 lg:py-32">
      <div className="container mx-auto max-w-3xl px-4">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Perguntas Frequentes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tire suas dúvidas sobre o ZapAgenda
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-foreground hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
