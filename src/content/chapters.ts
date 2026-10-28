export const chapters = [
  {
    id: "use",
    number: "01",
    label: "Use",
    title: "Secrets in your terminal.",
    description: "Store passwords, API keys, and authenticator secrets.",
    detail: "Use Key in pipes and scripts",
  },
  {
    id: "authenticate",
    number: "02",
    label: "Authenticate",
    title: "Your presence opens it.",
    description:
      "Approve access with Touch ID, Apple Watch, or your Mac password.",
    detail: "Device keys and the unlocked session",
  },
  {
    id: "sync",
    number: "03",
    label: "Sync",
    title: "Safe sync.\nYour choice of provider.",
    description:
      "Keep one vault across your Macs, through a sync folder you choose.",
    detail: "History, conflicts, and checkpoints",
  },
  {
    id: "recover",
    number: "04",
    label: "Recover",
    title: "Keep access when a Mac is lost.",
    description:
      "With two or more Macs enrolled, losing one doesn’t mean losing access to your vault.",
    detail: "Device continuity and planned hardware recovery",
  },
] as const

export type Chapter = (typeof chapters)[number]

export const projectUrl = "https://github.com/tvr-works/key"
export const installCommand =
  "brew tap tvr-works/tap && brew install --cask tvr-works/tap/key"

export const setupUrl = `${projectUrl}#install-and-choose-a-release-channel`
