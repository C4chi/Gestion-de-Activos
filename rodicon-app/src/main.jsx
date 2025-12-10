import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Importante: Carga Tailwind
import App from './App.jsx' // Importante: Carga tu App
import { AppProvider } from './AppContext.jsx' // Contexto global

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)