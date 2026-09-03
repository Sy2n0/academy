import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

/**
 * The frame 404 and 500 share.
 *
 * Both used to render inside DefaultLayout, which meant a mistyped URL from a
 * signed-out visitor came back with the app sidebar around it — a shell for an
 * app they are not in. An error page stands on its own.
 *
 * Colours are written as the Warp token with its literal as the fallback,
 * rather than through `bg-background`. The theme class is resolved from the
 * URL before paint, and a 404 arrives at a URL that matches nothing — so the
 * page would otherwise paint on Direction C's light `:root` palette and flip
 * to warm dark a frame later. These hold in either case.
 */
const buttonClass =
  'inline-flex items-center justify-center rounded border border-[var(--warp-rule,rgba(226,226,226,0.12))] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--warp-stone,#868584)] transition-colors hover:bg-white/[0.03] hover:text-[var(--warp-parchment,#faf9f6)]';

const buttonPrimaryClass =
  'inline-flex items-center justify-center rounded border border-white/25 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--warp-parchment,#faf9f6)] transition-colors hover:bg-white/[0.07]';

export function ErrorPage({
  code,
  title,
  description,
}: {
  code: ReactNode;
  title: ReactNode;
  description: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--warp-void,#131311)] px-6 font-[family-name:var(--font-general-sans)]">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--warp-stone,#868584)]">
          Error
        </p>
        <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-6xl tracking-tight text-[var(--warp-parchment,#faf9f6)] [font-variant-numeric:tabular-nums]">
          {code}
        </p>

        <div className="my-6 border-t border-[var(--warp-rule,rgba(226,226,226,0.12))]" />

        <h1 className="text-lg text-[var(--warp-parchment,#faf9f6)]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--warp-ash,#afaeac)]">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/" className={buttonPrimaryClass}>
            Home
          </Link>
          {/* The old pages imported next/router's default singleton and called
              it from inside the component; the hook is bound to this render. */}
          <button
            type="button"
            onClick={() => router.back()}
            className={buttonClass}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
