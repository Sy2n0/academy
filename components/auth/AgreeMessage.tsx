import { useTranslation } from 'next-i18next';
import Link from 'next/link';

const AgreeMessage = ({ text }) => {
  const { t } = useTranslation('common');

  return (
    <p className="text-sm text-center">
      {t('agree-message-part', { button: text })}{' '}
      <Link
        rel="noopener noreferrer"
        target="_blank"
        href={process.env.NEXT_PUBLIC_TERMS_URL || '/terms'}
        className="warp-link font-medium underline underline-offset-4 hover:text-[var(--warp-parchment)]"
      >
        {t('terms')}
      </Link>{' '}
      {t('and')}{' '}
      <Link
        rel="noopener noreferrer"
        target="_blank"
        href={process.env.NEXT_PUBLIC_PRIVACY_URL || '/privacy'}
        className="warp-link font-medium underline underline-offset-4 hover:text-[var(--warp-parchment)]"
      >
        {t('privacy')}
      </Link>
    </p>
  );
};

export default AgreeMessage;
