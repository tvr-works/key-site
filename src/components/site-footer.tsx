export function SiteFooter({ privacyPage = false }: { privacyPage?: boolean }) {
  return (
    <footer className="site-footer page-gutter">
      <p className="site-footer-row">
        <span>© 2026 TVR Works LLC</span>{" "}
        <span className="site-footer-links">
          <span aria-hidden="true">·</span>{" "}
          <a href="https://tvr.works/software">Software</a>{" "}
          <span aria-hidden="true">·</span>{" "}
          <a href="/privacy" aria-current={privacyPage ? "page" : undefined}>
            Privacy
          </a>
        </span>
      </p>
    </footer>
  )
}
