import { Fragment, useEffect, useRef, useState } from "react"
import { ArrowUpRight, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { installCommand, setupUrl } from "@/content/chapters"

export function InstallSection() {
  const [feedback, setFeedback] = useState<"idle" | "copied" | "failed">("idle")
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timeout.current), [])

  async function copyCommand() {
    clearTimeout(timeout.current)
    try {
      await navigator.clipboard.writeText(installCommand)
      setFeedback("copied")
    } catch {
      setFeedback("failed")
    }
    timeout.current = setTimeout(() => setFeedback("idle"), 4000)
  }

  return (
    <section
      id="install"
      className="install-section page-gutter"
      aria-labelledby="install-title"
    >
      <div>
        <p className="eyebrow text-muted-foreground">macOS 26+</p>
        <h2 id="install-title" className="install-title">
          Install key.
        </h2>
        <a className="text-link mt-8" href={setupUrl}>
          Set up your vault <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      <div className="install-instructions">
        <h3 className="eyebrow mb-5 text-muted-foreground">
          Install with Homebrew
        </h3>
        <div className="install-command">
          <pre className="install-code">
            <code>
              {installCommand.split(" && ").map((command, index) => (
                <Fragment key={command}>
                  {index > 0 && " && "}
                  <span className="whitespace-nowrap">{command}</span>
                </Fragment>
              ))}
            </code>
          </pre>
          <Button
            variant="ghost"
            className="size-11 shrink-0 gap-2 rounded-none px-2 text-muted-foreground sm:w-24"
            onClick={copyCommand}
            aria-label="Copy install commands"
          >
            {feedback === "copied" ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {feedback === "copied" ? "Copied" : "Copy"}
            </span>
          </Button>
        </div>
        <output
          className={
            feedback === "failed"
              ? "mt-3 block text-sm text-muted-foreground"
              : "sr-only"
          }
        >
          {feedback === "copied"
            ? "Copied to clipboard."
            : feedback === "failed"
              ? "Select the commands above to copy them manually."
              : ""}
        </output>
        <p className="install-note text-muted-foreground">
          After installing, open{" "}
          <span className="text-foreground">Key.app</span> once to enable the
          CLI, then follow the{" "}
          <a className="underline underline-offset-4" href={setupUrl}>
            vault setup guide
          </a>
          .
        </p>
      </div>
    </section>
  )
}
