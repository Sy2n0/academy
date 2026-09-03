import { JetBrains_Mono, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * Font instances, shared between _app and _document.
 *
 * They live here because their CSS variables have to be declared on <html>: the
 * theme classes sit there (portals need the palette above document.body), and a
 * `font-family: var(--font-general-sans)` on <html> cannot see a variable
 * declared on a wrapper div inside body — custom properties inherit downward
 * only. _document puts the variable classes on <html>; _app keeps them on its
 * wrapper too, which is harmless and covers client-side transitions.
 */

/** Direction C's monospace UI font, for surfaces not yet on the Warp palette. */
export const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jb-mono',
});

/**
 * Warp body face. General Sans stands in for Matter, a commercial Displaay
 * licence we do not hold — the closest free geometric sans with the same soft,
 * humanist character. Hangul comes from Pretendard (styles/pretendard.css).
 */
export const generalSans = localFont({
  src: [
    { path: '../styles/fonts/GeneralSans-Regular.woff2', weight: '400' },
    { path: '../styles/fonts/GeneralSans-Medium.woff2', weight: '500' },
    { path: '../styles/fonts/GeneralSans-Semibold.woff2', weight: '600' },
    { path: '../styles/fonts/GeneralSans-Bold.woff2', weight: '700' },
  ],
  variable: '--font-general-sans',
  display: 'swap',
});

/** Figures and code on Warp surfaces (.warp-num, prose-code). */
export const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

/** Every font variable class, for the <html> element. */
export const fontVariables = [
  jbMono.variable,
  generalSans.variable,
  geistMono.variable,
].join(' ');
