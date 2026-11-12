import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  GripVertical,
  Kanban,
  Lock,
  MessageCircle,
  Pencil,
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
  isPetshopLead,
  updateLeadDetails,
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
    title: 'Contatado',
    subtitle: '1º toque enviado no WhatsApp',
    accentClass: 'border-amber-500/30 text-amber-400',
  },
  {
    status: 'RESPONDEU',
    title: 'Respondeu',
    subtitle: 'Abriu conversa / pediu link',
    accentClass: 'border-amber-400/35 text-amber-300',
  },
  {
    status: 'NEGOCIANDO',
    title: 'Negociando',
    subtitle: 'Avaliando prévia / proposta',
    accentClass: 'border-emerald-500/30 text-emerald-400',
  },
  {
    status: 'FECHADO',
    title: 'Fechado (Pix)',
    subtitle: 'Turnkey vendido / Pix confirmado',
    accentClass: 'border-emerald-500/50 text-emerald-300',
  },
  {
    status: 'RECUSADO',
    title: 'Recusado',
    subtitle: 'Opt-Out LGPD / Sem interesse',
    accentClass: 'border-rose-500/35 text-rose-400',
  },
]

const STATUS_SEQUENCE: PipelineStatus[] = [
  'CONTATADO',
  'RESPONDEU',
  'NEGOCIANDO',
  'FECHADO',
  'RECUSADO',
]

const DEFAULT_DEAL_VALUE = 350

function resolveDealValue(lead: Lead): number {
  return typeof lead.deal_value === 'number' && lead.deal_value > 0
    ? lead.deal_value
    : DEFAULT_DEAL_VALUE
}

function renderSlaBadge(days: number, status: PipelineStatus) {
  if (status === 'FECHADO' || status === 'RECUSADO') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-white/[0.08] bg-[#0c0a09] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-stone-400">
        <Clock className="h-2.5 w-2.5" />
        <span>Finalizado ({days}d)</span>
      </span>
    )
  }

  if (days >= 8) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-rose-300">
        <AlertTriangle className="h-3 w-3 text-rose-400" />
        <span>Esfriando: follow-up ({days}d)</span>
      </span>
    )
  }

  if (days >= 4) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-amber-300">
        <Clock className="h-3 w-3 text-amber-400" />
        <span>Atenção: {days}d</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-emerald-400">
      <Clock className="h-2.5 w-2.5" />
      <span>Em dia • {days === 0 ? 'hoje' : `${days}d`}</span>
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

  // Estado de Drag & Drop Nativo HTML5
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<PipelineStatus | null>(null)

  // Estado de Edição Rápida de Valor do Negócio (deal_value) no Card
  const [editingPriceLeadId, setEditingPriceLeadId] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState<string>('350')

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
    const targetLead = leads.find((l) => l.id === leadId)
    if (targetLead && targetLead.pipeline_status === newStatus) {
      return
    }

    // Atualização otimista instantânea no Kanban
    const previousLeads = leads
    if (newStatus === 'NOVO') {
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, pipeline_status: newStatus, days_in_status: 0 }
            : l,
        ),
      )
    }

    try {
      const updated = await updateLeadDetails(leadId, { pipeline_status: newStatus })
      if (newStatus === 'NOVO') {
        setLeads((prev) => prev.filter((l) => l.id !== leadId))
      } else {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)))
      }
      setDrawerLead((prev) => (prev?.id === leadId ? updated : prev))
      window.dispatchEvent(new CustomEvent('abductor:pipeline-updated'))
      showToast(`Contato movido para ${newStatus}.`)
    } catch {
      setLeads(previousLeads)
      showToast('Falha ao atualizar etapa do lead no banco.')
    }
  }

  const handleStartEditPrice = (lead: Lead) => {
    setEditingPriceLeadId(lead.id)
    setEditingPriceValue(String(resolveDealValue(lead)))
  }

  const handleCommitEditPrice = async (lead: Lead) => {
    if (editingPriceLeadId !== lead.id) return
    setEditingPriceLeadId(null)

    const parsed = Number.parseInt(editingPriceValue.replace(/\D/g, ''), 10)
    const nextValue = Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_DEAL_VALUE : parsed
    const currentValue = resolveDealValue(lead)

    if (nextValue === currentValue) return

    // Atualização otimista instantânea
    const previousLeads = leads
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, deal_value: nextValue } : l)),
    )

    try {
      const updated = await updateLeadDetails(lead.id, { deal_value: nextValue })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
      setDrawerLead((prev) => (prev?.id === lead.id ? updated : prev))
      window.dispatchEvent(new CustomEvent('abductor:pipeline-updated'))
      showToast(
        `Ticket atualizado para R$ ${nextValue.toLocaleString('pt-BR')} (${cleanNameClientSide(lead.name)}).`,
      )
    } catch {
      setLeads(previousLeads)
      showToast('Falha ao salvar o valor do negócio.')
    }
  }

  const handlePriceKeyDown = (e: KeyboardEvent<HTMLInputElement>, lead: Lead) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleCommitEditPrice(lead)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingPriceLeadId(null)
    }
  }

  // Handlers de Drag & Drop Nativo HTML5
  const handleDragStart = (e: DragEvent<HTMLElement>, lead: Lead) => {
    if (editingPriceLeadId === lead.id) {
      e.preventDefault()
      return
    }
    setDraggedLeadId(lead.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
  }

  const handleDragEnd = () => {
    setDraggedLeadId(null)
    setDragOverColumn(null)
  }

  const handleColumnDragOver = (e: DragEvent<HTMLElement>, status: PipelineStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== status) {
      setDragOverColumn(status)
    }
  }

  const handleColumnDragLeave = (e: DragEvent<HTMLElement>, status: PipelineStatus) => {
    const related = e.relatedTarget as Node | null
    if (!related || !e.currentTarget.contains(related)) {
      if (dragOverColumn === status) {
        setDragOverColumn(null)
      }
    }
  }

  const handleColumnDrop = (e: DragEvent<HTMLElement>, targetStatus: PipelineStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const droppedId = draggedLeadId || e.dataTransfer.getData('text/plain')
    setDraggedLeadId(null)
    if (!droppedId) return
    void handleMoveStatus(droppedId, targetStatus)
  }

  const handleUpdateDetails = async (leadId: string, payload: LeadUpdateRequest) => {
    const updated = await updateLeadDetails(leadId, payload)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)))
    setDrawerLead((prev) => (prev?.id === leadId ? updated : prev))
    window.dispatchEvent(new CustomEvent('abductor:pipeline-updated'))
    showToast(`Override salvo! Novo Score: ${updated.score} pts.`)
  }

  const handleExportSiteConfig = async (lead: Lead) => {
    if (isAdvocaciaLead(lead) || isPetshopLead(lead)) {
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

  const pipelineRevenueSummary = useMemo(() => {
    const closedRevenue = (groupedByColumn.FECHADO ?? []).reduce(
      (sum, l) => sum + resolveDealValue(l),
      0,
    )
    const activeForecast = [
      ...(groupedByColumn.RESPONDEU ?? []),
      ...(groupedByColumn.NEGOCIANDO ?? []),
    ].reduce((sum, l) => sum + resolveDealValue(l), 0)

    return { closedRevenue, activeForecast }
  }, [groupedByColumn])

  return (
    <main className="mx-auto max-w-[1920px] space-y-5 px-6 py-5">
      {toastMessage && (
        <div className="tactical-panel fixed bottom-5 right-5 z-50 flex items-center gap-2 border-amber-500/40 px-4 py-3 text-xs font-semibold text-amber-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho do Kanban */}
      <div className="tactical-panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Kanban className="h-4 w-4 text-amber-400" />
            <h1 className="font-sans text-lg font-semibold tracking-tight text-stone-100">
              Kanban Comercial & Controle de SLA (/pipeline)
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Arraste os cards entre colunas (Drag &amp; Drop) e clique no valor em R$ para ajustar o
            ticket negociado em tempo real com o Dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Resumo Financeiro Sincronizado */}
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-[#0c0a09] px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-stone-400">Fechado:</span>
              <strong className="font-mono font-bold tabular-nums text-emerald-400">
                R$ {pipelineRevenueSummary.closedRevenue.toLocaleString('pt-BR')}
              </strong>
            </div>
            <span className="text-stone-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Em Negociação:</span>
              <strong className="font-mono font-semibold tabular-nums text-amber-400">
                R$ {pipelineRevenueSummary.activeForecast.toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#0c0a09] px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-stone-300">0–3d Em dia</span>
            <span className="ml-2 h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-stone-300">4–7d Atenção</span>
            <span className="ml-2 h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-stone-300">8+d Urgente</span>
          </div>

          <button
            type="button"
            onClick={() => void fetchPipeline()}
            className="btn-tactical-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Funil</span>
          </button>
        </div>
      </div>

      {/* Colunas do Kanban */}
      {leads.length === 0 && !isLoading ? (
        <div className="tactical-panel p-12 text-center">
          <p className="font-sans text-base font-semibold text-stone-200">
            Seu Kanban ainda está vazio.
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Dispare o primeiro WhatsApp na Bancada ou mude o status de um lead para que ele entre
            em acompanhamento aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-5">
          {KANBAN_COLUMNS.map((col) => {
            const colLeads = groupedByColumn[col.status] ?? []
            const colIdx = STATUS_SEQUENCE.indexOf(col.status)
            const prevStatus = colIdx > 0 ? STATUS_SEQUENCE[colIdx - 1] : null
            const nextStatus =
              colIdx >= 0 && colIdx < STATUS_SEQUENCE.length - 1
                ? STATUS_SEQUENCE[colIdx + 1]
                : null
            const isDropTarget = dragOverColumn === col.status
            const columnTotalBrl = colLeads.reduce((sum, l) => sum + resolveDealValue(l), 0)

            return (
              <section
                key={col.status}
                onDragOver={(e) => handleColumnDragOver(e, col.status)}
                onDragLeave={(e) => handleColumnDragLeave(e, col.status)}
                onDrop={(e) => handleColumnDrop(e, col.status)}
                className={`flex min-h-[560px] flex-col rounded-xl border p-3 transition-all duration-150 ${
                  isDropTarget
                    ? 'border-amber-500/60 bg-amber-950/15 ring-1 ring-amber-500/35'
                    : 'border-white/[0.07] bg-[#141210]'
                }`}
              >
                {/* Topo da Coluna */}
                <div
                  className={`mb-3 flex items-center justify-between border-b pb-2.5 ${col.accentClass}`}
                >
                  <div>
                    <h2 className="font-sans text-sm font-semibold tracking-tight text-stone-100">
                      {col.title}
                    </h2>
                    <p className="text-[11px] text-stone-400">{col.subtitle}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded border border-white/[0.08] bg-[#0c0a09] px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-stone-200">
                      {colLeads.length}
                    </span>
                    {colLeads.length > 0 && col.status !== 'RECUSADO' && (
                      <span className="font-mono text-[10px] font-medium tabular-nums text-stone-400">
                        R$ {columnTotalBrl.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards da Coluna */}
                <div className="flex-1 space-y-2.5">
                  {colLeads.length === 0 ? (
                    <div
                      className={`flex h-36 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs transition ${
                        isDropTarget
                          ? 'border-amber-500/50 bg-amber-500/5 font-semibold text-amber-300'
                          : 'border-white/[0.08] text-stone-500'
                      }`}
                    >
                      {isDropTarget
                        ? `Solte aqui para mover para ${col.title}`
                        : 'Arraste um card para esta etapa'}
                    </div>
                  ) : (
                    colLeads.map((lead) => {
                      const dealValue = resolveDealValue(lead)
                      const quickMsg = buildQuickPitchMessage(lead, dealValue)
                      const waHref = lead.phone_sanitized
                        ? `https://wa.me/55${lead.phone_sanitized}?text=${encodeURIComponent(quickMsg)}`
                        : null
                      const isDraggingThis = draggedLeadId === lead.id
                      const isEditingPrice = editingPriceLeadId === lead.id

                      return (
                        <article
                          key={lead.id}
                          draggable={editingPriceLeadId !== lead.id}
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          className={`group cursor-grab rounded-lg border p-3 transition-all duration-150 active:cursor-grabbing ${
                            isDraggingThis
                              ? 'scale-[0.98] border-amber-500/60 bg-stone-900/60 opacity-50'
                              : 'border-white/[0.07] bg-[#0c0a09]/90 hover:border-white/[0.15]'
                          }`}
                        >
                          {/* SLA Badge + Score + Grip */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3.5 w-3.5 shrink-0 text-stone-600 transition group-hover:text-stone-400" />
                              {renderSlaBadge(lead.days_in_status ?? 0, lead.pipeline_status)}
                            </div>
                            <span className="rounded border border-white/[0.08] bg-[#141210] px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-emerald-400">
                              {lead.score} pts
                            </span>
                          </div>

                          {/* Nome clicável para abrir Drawer */}
                          <button
                            type="button"
                            onClick={() => setDrawerLead(lead)}
                            className="mt-2 flex items-center gap-1.5 text-left"
                          >
                            <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug text-stone-100 transition-colors group-hover:text-amber-400">
                              {lead.name}
                            </h3>
                            {lead.is_manually_edited && (
                              <Lock className="h-3 w-3 shrink-0 text-amber-400" />
                            )}
                          </button>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
                            <span>{lead.category ?? 'Geral'}</span>
                            <span>•</span>
                            <span>{lead.city}</span>
                            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>
                                {lead.rating.toFixed(1)} ({lead.reviews_count})
                              </span>
                            </span>
                          </div>

                          {/* Ticket Negociado (Edição Rápida Inline do deal_value) */}
                          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#141210] px-2.5 py-1.5">
                            <span className="text-[11px] font-medium text-stone-400">
                              Ticket Negociado:
                            </span>

                            {isEditingPrice ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs font-semibold text-emerald-400">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={50}
                                  autoFocus
                                  value={editingPriceValue}
                                  onChange={(e) => setEditingPriceValue(e.target.value)}
                                  onBlur={() => void handleCommitEditPrice(lead)}
                                  onKeyDown={(e) => handlePriceKeyDown(e, lead)}
                                  className="w-20 rounded border border-amber-500 bg-[#0c0a09] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-stone-100 outline-none"
                                />
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    void handleCommitEditPrice(lead)
                                  }}
                                  className="rounded bg-emerald-500 p-1 text-stone-950 hover:bg-emerald-400"
                                  title="Salvar valor"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditPrice(lead)}
                                title="Clique para editar o valor negociado deste lead"
                                className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-400 transition hover:border-amber-500/50 hover:bg-amber-500/15 hover:text-amber-300"
                              >
                                <span>R$ {dealValue.toLocaleString('pt-BR')}</span>
                                <Pencil className="h-2.5 w-2.5 opacity-75" />
                              </button>
                            )}
                          </div>

                          {lead.notes && (
                            <p className="mt-2 line-clamp-2 rounded border border-white/[0.05] bg-[#141210] px-2 py-1 text-[11px] italic text-stone-300">
                              “{lead.notes}”
                            </p>
                          )}

                          {/* Ações Rápidas do Card no Kanban */}
                          <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-white/[0.06] pt-2">
                            <div className="flex items-center gap-1">
                              {prevStatus && (
                                <button
                                  type="button"
                                  title={`Voltar para ${prevStatus}`}
                                  onClick={() => void handleMoveStatus(lead.id, prevStatus)}
                                  className="btn-tactical-secondary p-1.5"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {nextStatus && (
                                <button
                                  type="button"
                                  title={`Avançar para ${nextStatus}`}
                                  onClick={() => void handleMoveStatus(lead.id, nextStatus)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500 hover:text-stone-950"
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
                                  className="btn-tactical-emerald p-1.5"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 fill-stone-950" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setDrawerLead(lead)}
                                title="Abrir Gaveta de Foco & Override"
                                className="btn-tactical-secondary p-1.5"
                              >
                                <Sliders className="h-3.5 w-3.5 text-amber-400" />
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
