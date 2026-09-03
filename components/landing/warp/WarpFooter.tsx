/* eslint-disable i18next/no-literal-string */

// Columns are the previous colophon's, minus the blocks that were commented out.
const columns = [
  {
    heading: 'Other contents',
    items: [{ label: 'Recruiting CTF' }, { label: 'HUB Conference' }],
  },
  {
    heading: 'Location',
    items: [{ label: 'Cheonan, Korea' }, { label: 'Baekseok University' }],
  },
  {
    heading: 'Contact',
    items: [
      { label: 'Email', href: 'mailto:info@hub-h4ck.com' },
      { label: 'Instagram', href: 'https://www.instagram.com/hubxbu' },
    ],
  },
  {
    heading: 'Established',
    items: [{ label: '2026' }, { label: 'HUB ACADEMY' }],
  },
];

export function WarpFooter() {
  return (
    <footer id="contact" className="warp-section warp-rule">
      <div className="warp-container">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="warp-label">05 — Contact</p>
            <h2 className="warp-heading mt-4 max-w-[12ch]">Get in touch</h2>
          </div>
          <a
            href="mailto:info@hub-h4ck.com"
            className="warp-pill self-start md:self-auto"
          >
            Email us
          </a>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {columns.map(({ heading, items }) => (
            <div key={heading}>
              <h3 className="warp-label">{heading}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {items.map(({ label, ...rest }) => (
                  <li key={label} className="warp-nav-text">
                    {'href' in rest && rest.href ? (
                      <a
                        href={rest.href}
                        className="warp-link"
                        {...(rest.href.startsWith('http')
                          ? { target: '_blank', rel: 'noreferrer' }
                          : {})}
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="text-[var(--warp-ash)]">{label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-[var(--warp-rule)] pt-7">
          <p className="warp-caption">
            © 2026 Highest Unique Batch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
