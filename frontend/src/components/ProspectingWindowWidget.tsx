import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock, ShieldAlert, X } from 'lucide-react'

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
  icon: string
}

const PROSPECTING_WINDOWS: ProspectingWindow[] = [
  {
    id: 'ouro-advocacia',
    title: 'Janela de Ouro',
    niches: 'Advogados, Corretores e Clínicas Médicas',
    slots: [{ start: 9.5, end: 11.5, label: '09h30 às 11h30' }],
    reason: 'Abertura de expediente e triagem de demandas matinais antes das audiências e consultas.',
    icon: '🏛️',
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
    icon: '🧠',
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
    icon: '✂️',
  },
  {
    id: 'tarde-turnos',
    title: 'Janela da Tarde',
    niches: 'Profissionais em Turnos e Plantões',
    slots: [{ start: 14.5, end: 16.5, label: '14h30 às 16h30' }],
    reason: 'Janela de transição de turno e conferência calma de mensagens.',
    icon: '⏳',
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

  // Atualiza relógio local a cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // Fechar no clique fora ou no Escape
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
      {/* Botão de Disparo / Indicador Inteligente no Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
          isAnyActive
            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-900/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
            : isNightOrEarly
              ? 'border-stone-800 bg-stone-900/80 text-stone-400 hover:border-stone-700 hover:text-stone-300'
              : 'border-amber-600/30 bg-stone-900/90 text-amber-300/90 hover:border-amber-500/50'
        }`}
        title="Clique para ver o mapa completo de horários recomendados de contato"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="relative flex h-2 w-2">
          {isAnyActive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isAnyActive ? 'bg-emerald-400' : isNightOrEarly ? 'bg-stone-500' : 'bg-amber-400'
            }`}
          />
        </span>

        <span className="font-sans font-semibold tracking-tight">
          {isAnyActive
            ? `Janela Ativa: ${activeWindows[0].title}`
            : isNightOrEarly
              ? 'Fora do horário de disparo'
              : 'Intervalo Comercial'}
        </span>

        <span className="font-mono text-[11px] font-bold tabular-nums opacity-80 border-l border-stone-800 pl-2">
          {timeFormatted}
        </span>

        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover com Grade Completa de Horários */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-700 bg-stone-900/95 p-4 shadow-2xl backdrop-blur-md"
          role="dialog"
          aria-label="Grade de Horários de Prospecção"
        >
          {/* Cabeçalho do Popover */}
          <div className="flex items-start justify-between border-b border-stone-800 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                <h3 className="font-serif text-sm font-bold text-stone-100">
                  Janelas de Prospecção Ética
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-stone-400">
                Sincronizado com o relógio local do sistema ({timeFormatted})
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Lista de Janelas */}
          <div className="mt-3 space-y-2.5">
            {PROSPECTING_WINDOWS.map((windowItem) => {
              const active = isWindowActive(windowItem, decimalHour)
              return (
                <div
                  key={windowItem.id}
                  className={`rounded-xl border p-3 transition-all ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-950/25 shadow-sm'
                      : 'border-stone-800/80 bg-stone-950/50 opacity-60 hover:opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span>{windowItem.icon}</span>
                      <span
                        className={`font-serif text-xs font-bold ${
                          active ? 'text-emerald-300' : 'text-stone-300'
                        }`}
                      >
                        {windowItem.title}
                      </span>
                    </div>

                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ATIVA AGORA
                      </span>
                    ) : (
                      <span className="rounded border border-stone-800 bg-stone-900 px-1.5 py-0.5 text-[10px] font-mono text-stone-500">
                        Inativa
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs font-medium text-stone-200">
                    {windowItem.niches}
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {windowItem.slots.map((s, idx) => {
                      const slotActive = isSlotActive(s, decimalHour)
                      return (
                        <span
                          key={idx}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                            slotActive
                              ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                              : 'bg-stone-900 text-stone-400 border border-stone-800'
                          }`}
                        >
                          {s.label}
                        </span>
                      )
                    })}
                  </div>

                  <p className="mt-1.5 text-[10px] leading-relaxed text-stone-400">
                    {windowItem.reason}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Alerta de Ética Noturna */}
          <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-stone-800 bg-stone-950 p-2.5 text-[10px] text-stone-400">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-stone-300">Código Comercial Ético:</strong> Não faça disparos
              entre 19h e 08h. Mensagens enviadas dentro das janelas têm até 3.8x mais respostas no
              mesmo dia.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
