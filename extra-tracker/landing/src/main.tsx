import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const bootstrapLandingTheme = () => {
  const root = document.documentElement
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  const applyTheme = () => {
    root.setAttribute('data-theme', media.matches ? 'dark' : 'light')
  }

  applyTheme()
  media.addEventListener('change', applyTheme)
}

bootstrapLandingTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
