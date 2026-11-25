import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { PrivacyPage } from "@/components/privacy-page"

import "./index.css"
import "./privacy.css"

const root = document.getElementById("root")!
const page = (
  <StrictMode>
    <PrivacyPage />
  </StrictMode>
)

if (root.hasChildNodes()) hydrateRoot(root, page)
else createRoot(root).render(page)
