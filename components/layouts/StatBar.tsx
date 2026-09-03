import type { ReactNode } from 'react';

export type Stat = {
  label: string;
  value: ReactNode;
  /**
   * Figures get Geist Mono with tabular figures. Turn it off for values that
   * are words — a container name in a numeral face reads as a serial number.
   */
  mono?: boolean;
};

/**
 * The summary line above a page's main content.
 *
 * Extracted from the five pages that had copied it, for the same reason the top
 * bar was: copies drift. Spacing lives here too — label and value used to sit
 * 8px apart in the same uppercase, wide-tracked style, so "STATUS STOPPED" read
 * as one phrase. The value now drops the tracking and the gaps are widened, so
 * a caption and its figure are legible as two things.
 */
export function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-10 gap-y-3 border-y border-[var(--warp-rule)] py-4">
      {stats.map(({ label, value, mono = true }) => (
        <div key={label} className="flex items-baseline gap-2.5">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </dt>
          <dd
            className={`text-sm text-foreground ${mono ? 'warp-num' : 'truncate'}`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
