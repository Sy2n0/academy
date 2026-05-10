/* eslint-disable i18next/no-literal-string */
import { useEffect, useRef } from "react"
import { ScrambleTextOnHover } from "@/components/scramble-text"
import { AnimatedNoise } from "@/components/animated-noise"
import { BitmapChevron } from "@/components/bitmap-chevron"
import { Navbar } from "@/components/landing/Navbar"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex flex-col pl-6 md:pl-28 pr-6 md:pr-12">
      <AnimatedNoise opacity={0.03} />
      
      {/* Navbar at the top of section */}
      <div className="w-full pt-4">
        <Navbar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center relative">
        {/* Left vertical labels */}
        {/* <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground -rotate-90 origin-left block whitespace-nowrap">
            HUB ACADEMY
          </span>
        </div> */}

        <div ref={contentRef} className="flex-1 w-full -mt-32 md:-mt-48">
          <h1 className="font-[var(--font-bebas)] text-6xl md:text-8xl tracking-tight text-foreground">
            BAEKSEOK UNIVERSITY
          </h1>

          <h2 className="font-[var(--font-bebas)] text-muted-foreground/60 text-[clamp(1rem,3vw,2rem)] mt-4 tracking-wide">
            Highest Unique Batch
          </h2>

          <p className="mt-8 max-w-md font-mono text-sm text-muted-foreground leading-relaxed">
            Stay Curious and Keep Hacking!
          </p>

          <div className="mt-10 flex items-center gap-8">
            <a
              href="#programs"
              className="group inline-flex items-center gap-3 border border-foreground/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-all duration-200"
            >
              <ScrambleTextOnHover text="View Programs" as="span" duration={0.6} />
              <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
            </a>
            <a
              href="#news"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Latest News
            </a>
          </div>
        </div>
      </div>

      {/* Floating info tag */}
      <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12">
        <div className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          v.01 / HUB ACADEMY
        </div>
      </div>
    </section>
  )
}
