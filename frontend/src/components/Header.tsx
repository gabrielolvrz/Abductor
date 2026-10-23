import {
  BookOpen,
  Kanban,
  MessageSquareText,
  NotebookPen,
  PlusCircle,
  Radar,
} from 'lucide-react'
import { ProspectingWindowWidget } from './ProspectingWindowWidget'

export type ActiveRoute = '/' | '/pipeline' | '/abordagens' | '/playbook' | '/anotacoes'

interface HeaderProps {
  activeRoute: ActiveRoute
  onNavigate: (route: ActiveRoute) => void
  onOpenManualLeadModal?: () => void
  apiOnline: boolean
}

export function Header({
  activeRoute,
  onNavigate,
  onOpenManualLeadModal,
  apiOnline,
}: HeaderProps) {
  const navItems: { route: ActiveRoute; label: string; icon: typeof Radar }[] = [
    { route: '/', label: 'Bancada', icon: Radar },
    { route: '/pipeline', label: 'Kanban Comercial', icon: Kanban },
    { route: '/abordagens', label: 'Roteiros', icon: MessageSquareText },
    { route: '/playbook', label: 'Playbook & Objeções', icon: BookOpen },
    { route: '/anotacoes', label: 'Backlog & Notas', icon: NotebookPen },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-600/40 bg-amber-600/10 text-amber-500 shadow-inner">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-xl font-bold tracking-tight text-stone-100">
                ABDUCTOR
              </span>
              <ProspectingWindowWidget />
            </div>
            <p className="text-xs text-stone-400">
              Bancada local de prospecção e fechamento rápido de Sites Vitrine One-Page
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-stone-800 bg-stone-900/90 p-1">
          {navItems.map(({ route, label, icon: Icon }) => {
            const isActive = activeRoute === route
            return (
              <button
                key={route}
                type="button"
                onClick={() => onNavigate(route)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-600 text-stone-950 shadow-sm'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          {onOpenManualLeadModal && activeRoute === '/' && (
            <button
              type="button"
              onClick={onOpenManualLeadModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-200 transition hover:border-amber-600/60 hover:bg-stone-800 hover:text-stone-100"
            >
              <PlusCircle className="h-4 w-4 text-amber-500" />
              Lead Avulso
            </button>
          )}

          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs font-medium tabular-nums ${
              apiOnline
                ? 'border-emerald-600/35 bg-emerald-600/10 text-emerald-400'
                : 'border-rose-700/50 bg-rose-950/40 text-rose-300'
            }`}
            title={
              apiOnline
                ? 'Core API FastAPI conectada na porta 8000'
                : 'Backend offline (verifique uvicorn na porta 8000)'
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-600'
              }`}
            />
            {apiOnline ? 'API :8000' : 'API Offline'}
          </div>
        </div>
      </div>
    </header>
  )
}
