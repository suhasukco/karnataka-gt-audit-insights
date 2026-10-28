import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* `reducedMotion="user"` makes every Framer Motion animation in the app
          honour the OS "reduce motion" setting — transforms are skipped and only
          opacity animates. The shared fadeUp presets in lib/motion.ts are plain
          objects spread into props, so they can't check the preference
          themselves, and CSS can't override transforms that Motion writes
          inline. Setting it once here covers all four dashboard pages and Home. */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
