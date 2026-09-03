import { useTranslation } from 'next-i18next';
import { WarpAuthShell } from '@/components/auth/WarpAuthShell';

interface AuthLayoutProps {
  children: React.ReactNode;
  heading?: string;
  description?: string;
}

/**
 * Centred variant of the auth canvas, used by the single-step pages (magic
 * link, verify email, unlock account, SSO, password reset). The logo image the
 * previous version rendered is dropped — the wordmark already sits in the
 * shell's header, so it was showing twice.
 */
export default function AuthLayout({
  children,
  heading,
  description,
}: AuthLayoutProps) {
  const { t } = useTranslation('common');

  return (
    <WarpAuthShell>
      {(heading || description) && (
        <div className="mb-10">
          {heading && <h1 className="warp-feature">{t(heading)}</h1>}
          {description && <p className="warp-body mt-4">{t(description)}</p>}
        </div>
      )}
      {children}
    </WarpAuthShell>
  );
}
