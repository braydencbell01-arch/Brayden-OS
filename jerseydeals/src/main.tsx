import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { resetLandingClientStateIfNeeded } from './landingClientReset'
import App from './App.tsx'

// Must run before App reads cart / offers / rewards from localStorage.
resetLandingClientStateIfNeeded()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
