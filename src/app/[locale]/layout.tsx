import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={params.locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
