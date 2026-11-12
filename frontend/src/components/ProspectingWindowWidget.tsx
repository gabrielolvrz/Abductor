import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  ChevronDown,
  Clock,
  Clock3,
  Scale,
  Scissors,
  ShieldAlert,
  X,
} from 'lucide-react'

interface ProspectingWindowSlot {
  start: number
  end: number
  label: string
}

interface ProspectingWindow {
  id: string
  title: string
  niches: string
  slots: ProspectingWindowSlot[]
  reason: string
  icon: typeof Scale
}

const PROSPECTING_WINDOWS: ProspectingWindow[] = [
  {
    id: 'ouro-advocacia',
    title: 'Janela de Ouro',
    niches: 'Advogados, Corretores e Clínicas Médicas',
    slots: [{ start: 9.5, end: 11.5, label: '09h30 às 11h30' }],
    reason: 'Abertura de expediente e triagem de demandas matinais antes das audiências e consultas.',
    icon: Scale,
  },
  {
    id: 'acolhimento-psicologia',
    title: 'Janela de Acolhimento',
    niches: 'Psicólogos e Terapeutas',
    slots: [
      { start: 10.0, end: 11.0, label: '10h00 às 11h00' },
      { start: 14.0, end: 16.0, label: '14h00 às 16h00' },
    ],
    reason: 'Intervalos entre sessões clínicas de acolhimento.',
    icon: Brain,
  },
  {
    id: 'comercial-servicos',
    title: 'Janela Comercial',
    niches: 'Barbearias, Pet Shops e Estética',
    slots: [
      { start: 10.0, end: 11.0, label: '10h00 às 11h00' },
      { start: 15.0, end: 17.0, label: '15h00 às 17h00' },
    ],
    reason: 'Horários de menor fluxo no balcão e trégua nos atendimentos.',
    icon: Scissors,
  },
  {
    id: 'tarde-turnos',
    title: 'Janela da Tarde',
    niches: 'Profissionais em Turnos e Plantões',
    slots: [{ start: 14.5, end: 16.5, label: '14h30 às 16h30' }],
    reason: 'Janela de transição de turno e conferência calma de mensagens.',
    icon: Clock3,
  },
]

function isSlotActive(slot: ProspectingWindowSlot, decimalHour: number): boolean {
  return decimalHour >= slot.start && decimalHour < slot.end
}

function isWindowActive(windowConfig: ProspectingWindow, decimalHour: number): boolean {
  return windowConfig.slots.some((slot) => isSlotActive(slot, decimalHour))
}

export function ProspectingWindowWidget() {
  const [now, setNow] = useState<Date>(() => new Date())
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const decimalHour = hours + minutes / 60

  const activeWindows = PROSPECTING_WINDOWS.filter((w) => isWindowActive(w, decimalHour))
  const isAnyActive = activeWindows.length > 0
  const isNightOrEarly = decimalHour < 8.0 || decimalHour >= 19.0

  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
          isAnyActive
            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/50'
            : isNightOrEarly
              ? 'border-white/[0.08] bg-[#141210] text-stone-400 hover:border-white/[0.15] hover:text-stone-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400/50'
        }`}
        title="Clique para ver o mapa completo de horários recomendados de contato"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="relative flex h-1.5 w-1.5">
          {isAnyActive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
              isAnyActive ? 'bg-emerald-400' : isNightOrEarly ? 'bg-stone-500' : 'bg-amber-400'
            }`}
          />
        </span>

        <span className="font-sans font-medium">
          {isAnyActive
            ? `Janela: ${activeWindows[0].title}`
            : isNightOrEarly
              ? 'Fora de expediente'
              : 'Intervalo Comercial'}
        </span>

        <span className="border-l border-white/[0.1] pl-2 font-mono text-[11px] font-semibold tabular-nums opacity-85">
          {timeFormatted}
        </span>

        <ChevronDown
          className={`h-3 w-3 opacity-70 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="tactical-panel absolute left-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] p-4 shadow-2xl"
          role="dialog"
          aria-label="Grade de Horários de Prospecção"
        >
          <div className="flex items-start justify-between border-b border-white/[0.07] pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <h3 className="font-sans text-xs font-semibold tracking-tight text-stone-100">
                  Janelas de Prospecção Ética
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-stone-400">
                Sincronizado com o relógio local ({timeFormatted})
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-tactical-ghost p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {PROSPECTING_WINDOWS.map((windowItem) => {
              const active = isWindowActive(windowItem, decimalHour)
              const WindowIcon = windowItem.icon
              return (
                <div
                  key={windowItem.id}
                  className={`rounded-lg border p-3 transition-all ${
                    active
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-white/[0.06] bg-[#0c0a09]/60 opacity-70 hover:opacity-95'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <WindowIcon
                        className={`h-3.5 w-3.5 ${
                          active ? 'text-emerald-400' : 'text-amber-400/80'
                        }`}
                      />
                      <span
                        className={`font-sans text-xs font-semibold ${
                          active ? 'text-emerald-300' : 'text-stone-200'
                        }`}
                      >
                        {windowItem.title}
                      </span>
                    </div>

                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        ATIVA AGORA
                      </span>
                    ) : (
                      <span className="rounded border border-white/[0.06] bg-[#141210] px-1.5 py-0.5 font-mono text-[10px] text-stone-400">
                        Aguardando
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs font-medium text-stone-300">
                    {windowItem.niches}
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {windowItem.slots.map((s, idx) => {
                      const slotActive = isSlotActive(s, decimalHour)
                      return (
                        <span
                          key={idx}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
                            slotActive
                              ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                              : 'border border-white/[0.07] bg-[#141210] text-stone-400'
                          }`}
                        >
                          {s.label}
                        </span>
                      )
                    })}
                  </div>

                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                    {windowItem.reason}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.07] bg-[#0c0a09] p-2.5 text-[11px] text-stone-400">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="leading-relaxed">
              <strong className="text-stone-200">Código Comercial Ético:</strong> Evite disparos
              entre 19h e 08h. Mensagens nas janelas ativas têm até 3.8x mais conversão.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
