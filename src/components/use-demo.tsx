import { useState } from "react"
import { Button } from "@/components/ui/button"
import { commandWalkthrough } from "@/content/command-walkthrough"

export function UseDemo({ onInteract }: { onInteract: () => void }) {
  const [index, setIndex] = useState(0)
  const step = commandWalkthrough[index]

  return (
    <figure className="use-demo" aria-label="Key command walkthrough">
      <div className="demo-terminal">
        <div
          className="demo-screen"
          aria-live="polite"
          aria-atomic="true"
          id="command-example"
        >
          <div className="demo-scene" key={step.label}>
            <pre className="demo-command">
              <code>
                {step.commands.map((command, commandIndex) => (
                  <span key={command}>
                    {commandIndex > 0 && "\n"}
                    <span className="demo-tool">key</span>
                    {command.slice(3)}
                  </span>
                ))}
              </code>
            </pre>
            <p className="demo-explanation">{step.explanation}</p>
          </div>
        </div>
      </div>
      <fieldset className="demo-steps">
        <legend className="sr-only">Command examples</legend>
        {commandWalkthrough.map((item, stepIndex) => (
          <Button
            key={item.label}
            variant="ghost"
            className="demo-step"
            aria-pressed={index === stepIndex}
            aria-controls="command-example"
            onClick={() => {
              setIndex(stepIndex)
              onInteract()
            }}
          >
            <span className="demo-step-number">0{stepIndex + 1}</span>{" "}
            {item.label}
          </Button>
        ))}
      </fieldset>
    </figure>
  )
}
