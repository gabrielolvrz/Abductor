import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Kanban,
  Lock,
  MessageCircle,
  RefreshCw,
  Sliders,
  Star,
} from 'lucide-react'
import { LeadDrawer } from '../components/LeadDrawer'
import { PitchModal } from '../components/PitchModal'
import { ExportConfigModal } from '../components/ExportConfigModal'
import {
  buildQuickPitchMessage,
  cleanNameClientSide,
  exportLeadSiteConfig,
  getPipelineLeads,
  isAdvocaciaLead,
  updateLeadDetails,
  updateLeadPipeline,
  type Lead,
  type LeadUpdateRequest,
  type PipelineStatus,
} from '../services/api'

interface KanbanColumnConfig {
  status: PipelineStatus
  title: string
  subtitle: string
  accentClass: string
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    status: 'CONTATADO',
    title: '1. Contatado',
    subtitle: '1º toque enviado no WhatsApp',
    accentClass: 'border-amber-600/40 text-amber-400',
  },
  {
    status: 'RESPONDEU',
    title: '2. Respondeu',
    subtitle: 'Abriu conversa / pediu link',
    accentClass: 'border-amber-500/50 text-amber-300',
  },
  {
    status: 'NEGOCIANDO',
    title: '3. Negociando',
    subtitle: 'Avaliando prévia / ajustes',
    accentClass: 'border-emerald-600/40 text-emerald-400',
  },
  {
    status: 'FECHADO',
    title: '4. Fechado (Pix)',
    subtitle: 'Turnkey vendido / Pix confirmado',
    accentClass: 'border-emerald-500/70 text-emerald-300',
  },
  {
    status: 'RECUSADO',
    title: '5. Recusado',
    subtitle: 'Opt-Out LGPD / Sem interesse',
    accentClass: 'border-rose-700/50 text-rose-400',
  },
]

const STATUS_SEQUENCE: PipelineStatus[] = [
  'CONTATADO',
  'RESPONDEU',
  'NEGOCIANDO',
  'FECHADO',
  'RECUSADO',
]

function renderSlaBadge(days: number, status: PipelineStatus) {
  if (status === 'FECHADO' || status === 'RECUSADO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-950 px-2 py-0.5 font-mono text-[10px] tabular-nums text-stone-400">
        <Clock className="h-2.5 w-2.5" />
        Finalizado ({days}d)
      </span>
    )
  }

  if (days >= 8) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-700/60 bg-rose-950/50 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-rose-300">
        <AlertTriangle className="h-3 w-3 text-rose-500" />
        Esfriando: fazer follow-up urgente ({days}d)
      </span>
    )
  }

  if (days >= 4) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-600/50 bg-amber-600/15 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-300">
        <Clock className="h-3 w-3 text-amber-500" />
        Atenção: {days} dias sem retorno
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-600/35 bg-emerald-600/10 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-emerald-400">
      <Clock className="h-2.5 w-2.5" />
      Em dia • {days === 0 ? 'hoje' : `${days}d`}
    </span>
  )
}

export function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [pitchLead, setPitchLead] = useState<Lead | null>(null)
  const [exportModalLead, setExportModalLead] = useState<Lead | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 3000)
  }, [])

  const fetchPipeline = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getPipelineLeads()
      setLeads(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getPipelineLeads()
      .then((data) => {
        if (active) setLeads(data)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleMoveStatus = async (leadId: string, newStatus: PipelineStatus) => {
    const updated = await updateLeadPipeline(leadId, newStatus)
    if (newStatus === 'NOVO') {
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)))
    }
    setDrawerLead((prev) => (prev?.id === leadId ? updated : prev))
    showToast(`Contato movido para ${newStatus}.`)
  }

  const handleUpdateDetails = async (leadId: string, payload: LeadUpdateRequest) => {
    const updated = await updateLeadDetails(leadId, payload)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)))
    setDrawerLead((prev) => (prev?.id === leadId ? updated : prev))
    showToast(`Override salvo! Novo Score: ${updated.score} pts.`)
  }

  const handleExportSiteConfig = async (lead: Lead) => {
    if (isAdvocaciaLead(lead)) {
      setExportModalLead(lead)
    } else {
      try {
        const config = await exportLeadSiteConfig(lead.id)
        const blob = new Blob([JSON.stringify(config, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `site.config-${cleanNameClientSide(lead.name).toLowerCase().replace(/\s+/g, '-')}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast(`Configuração turnkey exportada para ${cleanNameClientSide(lead.name)}!`)
      } catch {
        showToast('Falha ao exportar configuração do site.')
      }
    }
  }

  const groupedByColumn = useMemo(() => {
    const map: Record<PipelineStatus, Lead[]> = {
      NOVO: [],
      CONTATADO: [],
      RESPONDEU: [],
      NEGOCIANDO: [],
      FECHADO: [],
      RECUSADO: [],
    }
    for (const lead of leads) {
      if (map[lead.pipeline_status]) {
        map[lead.pipeline_status].push(lead)
      }
    }
    return map
  }, [leads])

  return (
    <main className="mx-auto max-w-[1920px] space-y-6 px-6 py-6">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-amber-600/50 bg-stone-900 px-4 py-3 text-xs font-semibold text-amber-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Cabeçalho do Kanban */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Kanban className="h-5 w-5 text-amber-500" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-100">
              Kanban Comercial & Controle de SLA (/pipeline)
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Acompanhe cada conversa ativa, identifique leads esfriando (4+ dias sem retorno) e
            avance negócios até o Pix.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-stone-300">0–3d Em dia</span>
            <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-stone-300">4–7d Atenção</span>
            <span className="ml-2 h-2 w-2 rounded-full bg-rose-600" />
            <span className="text-stone-300">8+d Urgente</span>
          </div>

          <button
            type="button"
            onClick={() => void fetchPipeline()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-bold text-stone-200 transition hover:border-amber-600/60 hover:text-amber-400"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Funil
          </button>
        </div>
      </div>

      {/* Colunas do Kanban */}
      {leads.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-stone-800 bg-[#1c1917]/70 p-12 text-center">
          <p className="font-serif text-lg font-bold text-stone-200">
            Seu Kanban ainda está vazio.
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Dispare o primeiro WhatsApp na Bancada ou mude o status de um lead para que ele entre
            em acompanhamento aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {KANBAN_COLUMNS.map((col) => {
            const colLeads = groupedByColumn[col.status] ?? []
            const colIdx = STATUS_SEQUENCE.indexOf(col.status)
            const prevStatus = colIdx > 0 ? STATUS_SEQUENCE[colIdx - 1] : null
            const nextStatus =
              colIdx >= 0 && colIdx < STATUS_SEQUENCE.length - 1
                ? STATUS_SEQUENCE[colIdx + 1]
                : null

            return (
              <section
                key={col.status}
                className="flex min-h-[540px] flex-col rounded-2xl border border-stone-800 bg-[#1c1917]/90 p-3.5"
              >
                {/* Topo da Coluna */}
                <div
                  className={`mb-3 flex items-center justify-between border-b pb-3 ${col.accentClass}`}
                >
                  <div>
                    <h2 className="font-serif text-base font-bold text-stone-100">
                      {col.title}
                    </h2>
                    <p className="text-[11px] text-stone-400">{col.subtitle}</p>
                  </div>
                  <span className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1 font-mono text-xs font-black tabular-nums text-stone-200">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards da Coluna */}
                <div className="flex-1 space-y-3">
                  {colLeads.length === 0 ? (
                    <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-stone-800/80 p-4 text-center text-xs text-stone-500">
                      Sem contatos nesta etapa
                    </div>
                  ) : (
                    colLeads.map((lead) => {
                      const quickMsg = buildQuickPitchMessage(lead)
                      const waHref = lead.phone_sanitized
                        ? `https://wa.me/55${lead.phone_sanitized}?text=${encodeURIComponent(quickMsg)}`
                        : null

                      return (
                        <article
                          key={lead.id}
                          className="group rounded-xl border border-stone-800 bg-stone-950/90 p-3.5 shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-stone-700"
                        >
                          {/* SLA Badge + Score */}
                          <div className="flex items-center justify-between gap-2">
                            {renderSlaBadge(lead.days_in_status ?? 0, lead.pipeline_status)}
                            <span className="rounded border border-stone-700 bg-stone-900 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-400">
                              {lead.score} pts
                            </span>
                          </div>

                          {/* Nome clicável para abrir Drawer */}
                          <button
                            type="button"
                            onClick={() => setDrawerLead(lead)}
                            className="mt-2.5 flex items-center gap-1.5 text-left"
                          >
                            <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-stone-100 group-hover:text-amber-400">
                              {lead.name}
                            </h3>
                            {lead.is_manually_edited && (
                              <Lock className="h-3 w-3 shrink-0 text-amber-500" />
                            )}
                          </button>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                            <span>{lead.category ?? 'Geral'}</span>
                            <span>•</span>
                            <span>{lead.city}</span>
                            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {lead.rating.toFixed(1)} ({lead.reviews_count})
                            </span>
                          </div>

                          {lead.notes && (
                            <p className="mt-2 line-clamp-2 rounded-lg border border-stone-800/80 bg-stone-900 px-2.5 py-1.5 text-[11px] italic text-stone-300">
                              “{lead.notes}”
                            </p>
                          )}

                          {/* Ações Rápidas do Card no Kanban */}
                          <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-stone-800/80 pt-2.5">
                            <div className="flex items-center gap-1">
                              {prevStatus && (
                                <button
                                  type="button"
                                  title={`Voltar para ${prevStatus}`}
                                  onClick={() => void handleMoveStatus(lead.id, prevStatus)}
                                  className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-400 transition hover:border-stone-600 hover:text-stone-100"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {nextStatus && (
                                <button
                                  type="button"
                                  title={`Avançar para ${nextStatus}`}
                                  onClick={() => void handleMoveStatus(lead.id, nextStatus)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-600/40 bg-amber-600/15 px-2 py-1 text-[11px] font-bold text-amber-300 transition hover:bg-amber-600 hover:text-stone-950"
                                >
                                  <span>Avançar</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {waHref && lead.pipeline_status !== 'RECUSADO' && (
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Abrir conversa no WhatsApp"
                                  className="rounded-lg bg-emerald-600 p-1.5 text-stone-950 transition hover:bg-emerald-500"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 fill-stone-950" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setDrawerLead(lead)}
                                title="Abrir Gaveta de Foco & Override"
                                className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-300 transition hover:border-amber-600/50 hover:text-amber-400"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <LeadDrawer
        lead={drawerLead}
        onClose={() => setDrawerLead(null)}
        onUpdateDetails={handleUpdateDetails}
        onUpdatePipeline={handleMoveStatus}
        onOpenPitchModal={(l) => setPitchLead(l)}
        onExportSiteConfig={handleExportSiteConfig}
      />

      <PitchModal
        lead={pitchLead}
        onClose={() => setPitchLead(null)}
        onMarkContacted={handleMoveStatus}
      />

      <ExportConfigModal
        lead={exportModalLead}
        onClose={() => setExportModalLead(null)}
        onSuccess={(name) => showToast(`site.config.json gerado para "${name}"!`)}
      />
    </main>
  )
}
