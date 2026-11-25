import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { PrivacyPage } from "@/components/privacy-page"
import App from "./App"

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

export function renderPrivacy() {
  return renderToString(
    <StrictMode>
      <PrivacyPage />
    </StrictMode>
  )
}
