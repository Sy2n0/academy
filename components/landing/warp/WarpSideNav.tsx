import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const items = [
  { id: 'hero', label: 'Home' },
  { id: 'platform', label: 'Platform' },
  { id: 'programs', label: 'Disciplines' },
  { id: 'contact', label: 'Contact' },
];

export function WarpSideNav() {
  const [active, setActive] = useState('hero');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    // Lives in the page gutter. 1700px is the first width where the 1500px
    // container leaves room for the rail plus its hover label; below that it
    // would sit on top of the headline.
    <nav
      aria-label="Section navigation"
      className="fixed left-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-5 min-[1700px]:flex"
    >
      {items.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className="group relative flex items-center"
          aria-current={active === id ? 'true' : undefined}
        >
          <span
            className={cn(
              'block h-1.5 w-1.5 rounded-full transition-all duration-[var(--warp-motion-standard)]',
              active === id
                ? 'scale-125 bg-[var(--warp-parchment)]'
                : 'bg-[var(--warp-stone)] opacity-50 group-hover:opacity-100'
            )}
          />
          <span
            className={cn(
              'warp-label absolute left-5 whitespace-nowrap opacity-0 transition-all duration-[var(--warp-motion-fast)] group-hover:left-6 group-hover:opacity-100',
              active === id && 'text-[var(--warp-parchment)]'
            )}
          >
            {label}
          </span>
        </a>
      ))}
    </nav>
  );
}
