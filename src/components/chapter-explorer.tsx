import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { chapters } from "@/content/chapters"
import { useChapterPlayback } from "@/hooks/use-chapter-playback"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ChapterReader } from "@/components/chapter-reader"

export function ChapterExplorer() {
  const { stageRef, state, pause, play, select, progress } = useChapterPlayback(
    chapters.length
  )
  const compact = useMediaQuery("(max-width: 767px)")
  const current = chapters[state.index]

  return (
    <section
      id="explore"
      className="chapter-section border-y border-border"
      aria-label="Explore key"
      aria-roledescription="carousel"
      onFocusCapture={(event) => {
        // The explicit playback control remains operable while focused.
        if (!(event.target as HTMLElement).closest("[data-playback-toggle]"))
          pause()
      }}
    >
      <Tabs
        value={current.id}
        orientation={compact ? "horizontal" : "vertical"}
        onValueChange={(value) =>
          select(chapters.findIndex((chapter) => chapter.id === value))
        }
        className="chapter-layout"
      >
        <div className="chapter-rail" ref={stageRef}>
          <TabsList
            activateOnFocus
            variant="line"
            className="chapter-tabs"
            aria-label="Feature chapters"
          >
            {chapters.map((chapter, index) => (
              <TabsTrigger
                key={chapter.id}
                value={chapter.id}
                className="chapter-tab"
                onClick={() => select(index)}
              >
                <span className="chapter-tab-number">{chapter.number}</span>
                <span>{chapter.label}</span>
                <span className="chapter-progress" aria-hidden="true">
                  <span
                    style={{
                      transform: `scaleX(${index === state.index ? progress : 0})`,
                    }}
                  />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="playback-controls">
            <Button
              data-playback-toggle=""
              variant="ghost"
              className="playback-toggle h-11 rounded-none p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={state.paused ? play : pause}
              aria-label={state.paused ? "Play chapters" : "Pause chapters"}
            >
              <span className="playback-icon">
                {state.paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
              </span>
              {state.paused ? "Play" : "Pause"}
            </Button>
            <span
              className="mobile-page-count eyebrow text-muted-foreground"
              aria-hidden="true"
            >
              {current.number} / 04
            </span>
          </div>
        </div>
        <div className="chapter-stage">
          {chapters.map((chapter) => (
            <TabsContent
              key={chapter.id}
              value={chapter.id}
              className="chapter-panel"
              keepMounted
            >
              <ChapterReader
                chapter={chapter}
                active={current.id === chapter.id}
                compact={compact}
                onRead={pause}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </section>
  )
}
