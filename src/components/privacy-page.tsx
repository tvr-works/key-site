import { SiteFooter } from "@/components/site-footer"
import { projectUrl } from "@/content/chapters"

export function PrivacyPage() {
  return (
    <>
      <a href="#privacy" className="skip-link">
        Skip to content
      </a>
      <header className="privacy-header page-gutter">
        <a href="/" className="wordmark" aria-label="Key home">
          key
        </a>
      </header>
      <main id="privacy" className="page-gutter">
        <article
          className="privacy-article typeset"
          aria-labelledby="privacy-title"
        >
          <header data-not-typeset>
            <h1 id="privacy-title">Key privacy</h1>
            <p className="privacy-date">
              <time dateTime="2026-11-24">November 24, 2026</time>
            </p>
            <p className="privacy-intro">
              TVR Works LLC operates key.tvr.works. This notice covers visits to
              that website and use of Key as described below.
            </p>
          </header>
          <section aria-labelledby="website-visits">
            <h2 id="website-visits">Website visits</h2>
            <p>
              Cloudflare helps deliver and protect this site. It processes
              information about requests, such as IP addresses and pages
              requested. Your browser may send Cloudflare a report if it has
              trouble connecting to the site. You can read the site without
              signing in. See{" "}
              <a href="https://www.cloudflare.com/privacypolicy/">
                Cloudflare’s privacy policy
              </a>
              .
            </p>
            <p>
              The site does not add advertising or visitor-analytics scripts.
              The Copy button in the install section copies the Homebrew
              commands to your clipboard when your browser allows it.
            </p>
          </section>
          <section aria-labelledby="vault-storage">
            <h2 id="vault-storage">Vault storage and sync</h2>
            <p>
              Key stores encrypted secret values in a vault folder you choose.
              You can keep a device-enrolled vault (format v3) on your Mac or
              put it in iCloud Drive. If you use a sync provider, it handles the
              files under its own privacy practices. Those files include
              encrypted entries and vault metadata such as entry names.
            </p>
            <p>
              Older Keychain-backed vaults (format v2) use a local Keychain item
              or an existing item synced through iCloud Keychain, depending on
              the vault’s settings. See the{" "}
              <a
                href={`${projectUrl}/blob/v0.4.1/README.md#how-key-protects-a-vault`}
              >
                Key vault documentation
              </a>{" "}
              for how the formats differ.
            </p>
            <p>
              When you unlock Key with Touch ID, Apple Watch or your Mac
              password, macOS handles that check. Running <code>key lock</code>{" "}
              ends the session on that Mac. Synced and backup copies are managed
              separately. Terminal completion can still suggest saved entry
              names while the vault is locked.
            </p>
          </section>
          <section aria-labelledby="privacy-questions">
            <h2 id="privacy-questions">Support and privacy questions</h2>
            <p>
              If you email us, we receive your email address, message and any
              attachments. We use what you send to respond and follow up. Other
              people can read anything you post in a{" "}
              <a href={`${projectUrl}/issues`}>public GitHub issue</a>.
            </p>
            <p>
              For privacy questions, or to ask about or request deletion of
              information you sent us, email{" "}
              <a href="mailto:support@tvr.works">support@tvr.works</a>.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter privacyPage />
    </>
  )
}
