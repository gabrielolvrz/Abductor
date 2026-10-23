import { useEffect, useState } from 'react'
import { Header, type ActiveRoute } from './components/Header'
import { Dashboard } from './pages/Dashboard'
import { Notes } from './pages/Notes'
import { Pipeline } from './pages/Pipeline'
import { Pitches } from './pages/Pitches'
import { Playbook } from './pages/Playbook'
import { checkApiHealth } from './services/api'

function resolveRouteFromLocation(): ActiveRoute {
  const path = window.location.pathname
  if (path.startsWith('/pipeline')) return '/pipeline'
  if (path.startsWith('/abordagens')) return '/abordagens'
  if (path.startsWith('/playbook')) return '/playbook'
  if (path.startsWith('/anotacoes')) return '/anotacoes'
  return '/'
}

export function App() {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>(resolveRouteFromLocation)
  const [showManualLeadModal, setShowManualLeadModal] = useState<boolean>(false)
  const [apiOnline, setApiOnline] = useState<boolean>(true)

  useEffect(() => {
    const onPopState = () => {
      setActiveRoute(resolveRouteFromLocation())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    let mounted = true
    const verifyHealth = async () => {
      const ok = await checkApiHealth()
      if (mounted) setApiOnline(ok)
    }
    void verifyHealth()
    const timer = window.setInterval(() => void verifyHealth(), 15000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  const handleNavigate = (route: ActiveRoute) => {
    window.history.pushState({}, '', route)
    setActiveRoute(route)
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100">
      <Header
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        onOpenManualLeadModal={() => setShowManualLeadModal(true)}
        apiOnline={apiOnline}
      />

      {activeRoute === '/' && (
        <Dashboard
          showManualLeadModal={showManualLeadModal}
          onCloseManualLeadModal={() => setShowManualLeadModal(false)}
          onNavigate={handleNavigate}
        />
      )}
      {activeRoute === '/pipeline' && <Pipeline />}
      {activeRoute === '/abordagens' && <Pitches />}
      {activeRoute === '/playbook' && <Playbook />}
      {activeRoute === '/anotacoes' && <Notes />}
    </div>
  )
}

export default App
