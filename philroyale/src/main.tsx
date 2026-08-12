import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BootFlow } from './BootFlow.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootFlow>
      <App />
    </BootFlow>
  </StrictMode>,
)
