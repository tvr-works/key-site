import { ArrowDown, ArrowUpRight } from "lucide-react"
import { projectUrl } from "@/content/chapters"

export function Hero() {
  return (
    <section
      className="hero relative isolate overflow-hidden"
      aria-labelledby="hero-title"
      id="top"
    >
      <img
        className="hero-photo absolute inset-0 -z-20 size-full object-cover"
        src="/assets/touch-id-1536.webp"
        srcSet="/assets/touch-id-768.webp 768w, /assets/touch-id-1024.webp 1024w, /assets/touch-id-1536.webp 1536w"
        sizes="100vw"
        alt=""
        width="1536"
        height="1024"
        fetchPriority="high"
      />
      <div className="hero-shade absolute inset-0 -z-10" aria-hidden="true" />
      <header className="site-header page-gutter flex items-center justify-between">
        <a href="#top" className="wordmark" aria-label="key home">
          key
        </a>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-7 sm:gap-10"
        >
          <a className="nav-link" href="#install">
            Install <ArrowDown aria-hidden="true" />
          </a>
          <a className="nav-link" href={projectUrl}>
            GitHub <ArrowUpRight aria-hidden="true" />
          </a>
        </nav>
      </header>
      <div className="hero-content page-gutter">
        <p className="eyebrow hero-eyebrow">
          macOS <span>/</span> CLI <span>/</span> Open Source
        </p>
        <h1 id="hero-title" className="hero-title">
          <span>Your Mac.</span>
          <span>Your CLI.</span>
          <span>Your secrets.</span>
        </h1>
        <p className="hero-description">
          A password and secret vault for your Mac’s terminal. Unlock it with
          Touch ID, Apple Watch, or your Mac password, and keep your encrypted
          vault in a folder you choose.
        </p>
        <a className="inline-link hero-install" href="#install">
          Install key <ArrowDown aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
