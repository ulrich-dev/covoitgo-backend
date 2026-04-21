import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// ── Initialisation Capacitor (Android/iOS) ───────────────────
async function initCapacitor() {
  // Détecte si on est dans une app native Capacitor
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  if (isNative) {
    try {
      // SplashScreen — masquer après chargement
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide({ fadeOutDuration: 300 })
    } catch {}

    try {
      // StatusBar — couleur teal
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#1A9E8A' })
      await StatusBar.show()
    } catch {}

    try {
      // App — gérer le bouton retour Android
      const { App: CapApp } = await import('@capacitor/app')
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          CapApp.exitApp()
        }
      })
    } catch {}
  }
}

initCapacitor()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
