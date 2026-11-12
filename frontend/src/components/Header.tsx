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
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0c0a09]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <Radar className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-sans text-sm font-bold tracking-wider text-stone-100">
                ABDUCTOR
              </span>
              <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] font-medium text-stone-400">
                v1.0
              </span>
              <ProspectingWindowWidget />
            </div>
            <p className="mt-0.5 text-[11px] text-stone-400">
              Cockpit tático de prospecção e fechamento de Sites Vitrine Turnkey
            </p>
          </div>
        </div>

        <nav
          aria-label="Navegação principal do cockpit"
          className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.07] bg-[#141210] p-1 shadow-inner"
        >
          {navItems.map(({ route, label, icon: Icon }) => {
            const isActive = activeRoute === route
            return (
              <button
                key={route}
                type="button"
                onClick={() => onNavigate(route)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500 font-semibold text-stone-950 shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]'
                    : 'font-medium text-stone-400 hover:bg-white/[0.05] hover:text-stone-100'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          {onOpenManualLeadModal && activeRoute === '/' && (
            <button
              type="button"
              onClick={onOpenManualLeadModal}
              className="btn-tactical-secondary"
            >
              <PlusCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>Lead Avulso</span>
            </button>
          )}

          <div
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium tabular-nums ${
              apiOnline
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/35 bg-rose-950/40 text-rose-300'
            }`}
            title={
              apiOnline
                ? 'Core API FastAPI conectada na porta 8000'
                : 'Backend offline (verifique uvicorn na porta 8000)'
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
              }`}
            />
            <span>{apiOnline ? 'API :8000' : 'API OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
