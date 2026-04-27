import { Seo } from '@/components/ui/Seo';

type LegalPlaceholderPageProps = {
  title: string;
};

function LegalPlaceholderPage({ title }: LegalPlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-surface">
      <Seo
        description={`${title} de Docqee.`}
        noIndex
        title={`Docqee | ${title}`}
      />
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-16">
        <h1 className="font-headline text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
      </main>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return <LegalPlaceholderPage title="Política de Privacidad" />;
}

export function TermsAndConditionsPage() {
  return <LegalPlaceholderPage title="Términos y Condiciones" />;
}
