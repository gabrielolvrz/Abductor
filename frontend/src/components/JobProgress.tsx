import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Filter,
  Globe,
  Loader2,
  Radar,
  Timer,
} from 'lucide-react'
import type { JobStatus, ProgressPhase } from '../services/api'

interface JobProgressProps {
  jobStatus: JobStatus
  progressPhase: ProgressPhase
  initialElapsedSeconds: number
  message?: string | null
}

const PIPELINE_STEPS: {
  phase: ProgressPhase
  label: string
  description: string
  icon: typeof Radar
}[] = [
  {
    phase: 'SCRAPING',
    label: 'Coleta no Maps',
    description: 'Container gosom varrendo fichas da região',
    icon: Radar,
  },
  {
    phase: 'PARSING',
    label: 'Filtro & Telefone',
    description: 'Descartando órgãos públicos e validando DDD',
    icon: Filter,
  },
  {
    phase: 'VALIDATING',
    label: 'Sondagem Web',
    description: '30 conexões simultâneas caçando Linktrees e erros',
    icon: Globe,
  },
  {
    phase: 'SCORING',
    label: 'Lead Scoring',
    description: 'Aplicando Hard Gate e ordenando oportunidades',
    icon: Calculator,
  },
]

const PHASE_ORDER: Record<ProgressPhase, number> = {
  IDLE: 0,
  SCRAPING: 1,
  PARSING: 2,
  VALIDATING: 3,
  SCORING: 4,
  COMPLETED: 5,
  FAILED: -1,
}

export function JobProgress({
  jobStatus,
  progressPhase,
  initialElapsedSeconds,
  message,
}: JobProgressProps) {
  const [localSeconds, setLocalSeconds] = useState<number>(initialElapsedSeconds)

  useEffect(() => {
    if (jobStatus !== 'RUNNING' && jobStatus !== 'PENDING') return
    const timer = window.setInterval(() => {
      setLocalSeconds((prev) => Math.max(prev, initialElapsedSeconds) + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [jobStatus, initialElapsedSeconds])

  const displayedSeconds = Math.max(localSeconds, initialElapsedSeconds)

  const formatChronometer = (totalSecs: number): string => {
    const clamped = Math.max(0, totalSecs)
    const mins = Math.floor(clamped / 60)
    const secs = clamped % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}s`
  }

  const currentRank = PHASE_ORDER[progressPhase] ?? 1

  if (jobStatus === 'FAILED') {
    return (
      <div className="rounded-xl border border-rose-500/35 bg-rose-950/20 p-4 text-rose-200">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <h3 className="font-sans text-sm font-semibold text-rose-300">
              Coleta interrompida pelo Watchdog de 180s
            </h3>
            <p className="mt-0.5 text-xs text-rose-200/80">
              {message ??
                'O scraper demorou além do limite ou sofreu bloqueio temporário. Tente novamente em alguns segundos.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="tactical-panel border-amber-500/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div>
              <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-100">
                Garimpando oportunidades em background
              </h3>
              <p className="text-xs text-stone-400">
                {message ?? 'Extraindo fichas e testando URLs em lote (timeout de segurança: 180s)...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c0a09] px-3.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-amber-400">
            <Timer className="h-3.5 w-3.5 text-amber-400" />
            <span>{formatChronometer(displayedSeconds)}</span>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step, index) => {
            const stepRank = index + 1
            const isCompleted = currentRank > stepRank
            const isCurrent = currentRank === stepRank
            const Icon = step.icon

            return (
              <div
                key={step.phase}
                className={`rounded-lg border p-3 transition-all ${
                  isCurrent
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : isCompleted
                      ? 'border-emerald-500/30 bg-[#0c0a09]/80'
                      : 'border-white/[0.06] bg-[#0c0a09]/40 opacity-55'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-100">{step.label}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  ) : (
                    <Icon className="h-4 w-4 text-stone-500" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-stone-400">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div
        aria-label="Carregando leads"
        className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="tactical-card animate-pulse p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-stone-800/80" />
                <div className="h-3 w-1/2 rounded bg-stone-800/50" />
              </div>
              <div className="h-9 w-12 rounded-lg bg-stone-800/80" />
            </div>
            <div className="mt-3.5 flex gap-2">
              <div className="h-5 w-20 rounded bg-stone-800/70" />
              <div className="h-5 w-24 rounded bg-stone-800/70" />
            </div>
            <div className="mt-4 h-8 w-full rounded-lg bg-stone-800/70" />
          </div>
        ))}
      </div>
    </div>
  )
}
