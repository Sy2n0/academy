/**
 * Warp styling for the Radix tab strip, shared by the six admin pages that use
 * tabs. Each had pasted the same ~350-character trigger className, so they had
 * already drifted: some carried `font-medium`, some a different active fill.
 * The strip is a rule with the active label underlined — no pill, no box.
 */
export const adminTabsListClass =
  'flex h-auto w-auto justify-start gap-6 rounded-none border-b border-[var(--warp-rule)] bg-transparent p-0';

export const adminTabsTriggerClass =
  '-mb-px rounded-none border-b border-transparent bg-transparent px-0.5 pb-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

/**
 * Controls. The admin pages had reached for `bg-accent` — a Direction C token
 * with no counterpart in the Warp palette, where emphasis comes from contrast
 * against the ground rather than from a hue. A control is a hairline box.
 */
export const adminButtonClass =
  'inline-flex items-center justify-center gap-2 rounded border border-[var(--warp-rule)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

/** The one control on a screen that commits the change. */
export const adminButtonPrimaryClass =
  'inline-flex items-center justify-center gap-2 rounded border border-foreground/25 bg-[var(--warp-veil)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-40';

export const adminInputClass =
  'w-full rounded border border-[var(--warp-rule)] bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none';

/** Section heading: a rule with a quiet label sitting on it. */
export const adminSectionHeadingClass =
  'border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground';

/** Form field label. */
export const adminLabelClass =
  'mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground';
