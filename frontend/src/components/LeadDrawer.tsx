import { useEffect, useState, type FormEvent } from 'react'
import {
  Check,
  Clock,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sliders,
  Star,
  X,
} from 'lucide-react'
import type {
  Lead,
  LeadUpdateRequest,
  PipelineStatus,
  WebsiteStatus,
} from '../services/api'

interface LeadDrawerProps {
  lead: Lead | null
  onClose: () => void
  onUpdateDetails: (leadId: string, payload: LeadUpdateRequest) => Promise<void>
  onUpdatePipeline: (leadId: string, status: PipelineStatus) => Promise<void>
  onOpenPitchModal: (lead: Lead) => void
  onExportSiteConfig: (lead: Lead) => Promise<void> | void
}

const PIPELINE_STEPS: { value: PipelineStatus; label: string }[] = [
  { value: 'NOVO', label: 'NOVO (Na Bancada)' },
  { value: 'CONTATADO', label: 'CONTATADO (1º Toque)' },
  { value: 'RESPONDEU', label: 'RESPONDEU (Engajado)' },
  { value: 'NEGOCIANDO', label: 'NEGOCIANDO (Prévia Enviada)' },
  { value: 'FECHADO', label: 'FECHADO (Pix Recebido)' },
  { value: 'RECUSADO', label: 'RECUSADO (Opt-Out LGPD)' },
]

export function LeadDrawer(props: LeadDrawerProps) {
  const { lead, onClose } = props

  useEffect(() => {
    if (!lead) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lead, onClose])

  if (!lead) return null

  return (
    <LeadDrawerInner
      key={`${lead.id}-${lead.last_checked_at ?? ''}`}
      lead={lead}
      onClose={props.onClose}
      onUpdateDetails={props.onUpdateDetails}
      onUpdatePipeline={props.onUpdatePipeline}
      onOpenPitchModal={props.onOpenPitchModal}
      onExportSiteConfig={props.onExportSiteConfig}
    />
  )
}

interface LeadDrawerInnerProps extends Omit<LeadDrawerProps, 'lead'> {
  lead: Lead
}

function LeadDrawerInner({
  lead,
  onClose,
  onUpdateDetails,
  onUpdatePipeline,
  onOpenPitchModal,
  onExportSiteConfig,
}: LeadDrawerInnerProps) {
  const [websiteStatus, setWebsiteStatus] = useState<WebsiteStatus>(lead.website_status)
  const [websiteUrl, setWebsiteUrl] = useState(lead.website_url ?? '')
  const [phoneRaw, setPhoneRaw] = useState(lead.phone_raw ?? '')
  const [instagramUrl, setInstagramUrl] = useState(lead.instagram_url ?? '')
  const [rating, setRating] = useState(lead.rating.toFixed(1))
  const [reviewsCount, setReviewsCount] = useState(String(lead.reviews_count))
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  const handleSaveOverride = async (e: FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSavedFeedback(false)
    try {
      await onUpdateDetails(lead.id, {
        website_status: websiteStatus,
        website_url: websiteUrl.trim() || null,
        phone_raw: phoneRaw.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        rating: Number.parseFloat(rating) || 0,
        reviews_count: Number.parseInt(reviewsCount, 10) || 0,
        notes: notes.trim() || null,
      })
      setSavedFeedback(true)
      window.setTimeout(() => setSavedFeedback(false), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExportSiteConfig(lead)
    } finally {
      setIsExporting(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Agora mesmo'
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const dorkQuery = `"${lead.name}" "${lead.city ?? ''}" site:instagram.com`
  const googleDorkHref = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`
  const bd = lead.score_breakdown ?? {}

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/75 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="flex h-full w-full max-w-[460px] flex-col justify-between overflow-y-auto border-l border-stone-800 bg-[#1c1917] p-6 text-stone-100 shadow-2xl">
        <div className="space-y-6">
          {/* Topo da Gaveta */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-stone-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-300">
                  {lead.category ?? 'Estabelecimento'}
                </span>
                {lead.is_manually_edited && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-600/40 bg-amber-600/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                    <Lock className="h-3 w-3" />
                    Override Manual Protegido
                  </span>
                )}
                {lead.is_claimed && (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    Verificado
                  </span>
                )}
              </div>

              <h2
                id="lead-drawer-title"
                className="mt-2 font-serif text-xl font-bold tracking-tight text-stone-100"
              >
                {lead.name}
              </h2>

              {lead.address && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{lead.address}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-400 transition hover:border-stone-700 hover:text-stone-100"
              aria-label="Fechar gaveta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo de Score + Breakdown Tabular */}
          <div className="rounded-xl border border-stone-800 bg-stone-950/90 p-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Qualificação Matemática
                </span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black tabular-nums text-emerald-400">
                    {lead.score}
                  </span>
                  <span className="font-mono text-xs text-stone-400">/ 100 pts</span>
                </div>
              </div>

              <div className="text-right font-mono text-xs tabular-nums text-stone-300">
                <div className="inline-flex items-center gap-1 text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{lead.rating.toFixed(1)}</span>
                  <span className="text-stone-400">({lead.reviews_count} av.)</span>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {lead.days_in_status}d nesta etapa
                </p>
              </div>
            </div>

            {bd.hard_gate_triggered ? (
              <p className="mt-3 rounded-lg border border-rose-700/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
                <strong>Hard Gate Ativo:</strong> Possui site próprio funcional. Score zerado. Mude
                o diagnóstico abaixo se for um falso positivo.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-stone-300">
                <div className="flex justify-between rounded bg-stone-900 px-2.5 py-1.5">
                  <span className="text-stone-400">Web:</span>
                  <span className="text-emerald-400">+{bd.website_points ?? 0}</span>
                </div>
                <div className="flex justify-between rounded bg-stone-900 px-2.5 py-1.5">
                  <span className="text-stone-400">Canal:</span>
                  <span
                    className={(bd.phone_points ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}
                  >
                    {(bd.phone_points ?? 0) >= 0 ? `+${bd.phone_points ?? 0}` : bd.phone_points}
                  </span>
                </div>
                <div className="flex justify-between rounded bg-stone-900 px-2.5 py-1.5">
                  <span className="text-stone-400">Reviews:</span>
                  <span className="text-emerald-400">+{bd.reviews_points ?? 0}</span>
                </div>
                <div className="flex justify-between rounded bg-stone-900 px-2.5 py-1.5">
                  <span className="text-stone-400">Nota + Ficha:</span>
                  <span className="text-emerald-400">
                    +{(bd.rating_points ?? 0) + (bd.claimed_points ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Etapa do Pipeline Comercial */}
          <div>
            <label
              htmlFor="drawer-pipeline-select"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-400"
            >
              Etapa Atual no Funil (Kanban)
            </label>
            <select
              id="drawer-pipeline-select"
              value={lead.pipeline_status}
              onChange={(e) =>
                void onUpdatePipeline(lead.id, e.target.value as PipelineStatus)
              }
              className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-xs font-bold text-stone-100 outline-none transition focus:border-amber-600"
            >
              {PIPELINE_STEPS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Formulário de Edição Manual (Override) */}
          <form
            onSubmit={(e) => void handleSaveOverride(e)}
            className="space-y-4 rounded-xl border border-stone-800 bg-stone-950/60 p-4"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                <Sliders className="h-3.5 w-3.5" />
                <span>Edição Manual & Override de Diagnóstico</span>
              </div>
              {savedFeedback && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Salvo!
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="drawer-website-status"
                className="block text-xs font-semibold text-stone-300"
              >
                Diagnóstico Digital (Forçar Status)
              </label>
              <select
                id="drawer-website-status"
                value={websiteStatus}
                onChange={(e) => setWebsiteStatus(e.target.value as WebsiteStatus)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-100 outline-none focus:border-amber-600"
              >
                <option value="IMPROVISADO">
                  IMPROVISADO (+30 pts — Linktree, Bio, WhatsApp, Instagram)
                </option>
                <option value="QUEBRADO">QUEBRADO (+25 pts — Site fora do ar / Erro)</option>
                <option value="SEM_SITE">SEM_SITE (+15 pts — Sem site na ficha)</option>
                <option value="ATIVO">ATIVO (0 pts — Hard Gate: já tem site próprio)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-300">
                  Telefone / WhatsApp
                </label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    value={phoneRaw}
                    onChange={(e) => setPhoneRaw(e.target.value)}
                    placeholder="(34) 99999-9999"
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 py-2 pl-8 pr-2.5 font-mono text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300">
                  Instagram (@ ou URL)
                </label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300">
                Link / URL Cadastrada no Maps
              </label>
              <div className="relative mt-1">
                <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://linktr.ee/..."
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 py-2 pl-8 pr-2.5 font-mono text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300">
                  Nota no Maps (0–5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-xs tabular-nums text-stone-100 outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300">
                  Total de Avaliações
                </label>
                <input
                  type="number"
                  min="0"
                  value={reviewsCount}
                  onChange={(e) => setReviewsCount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-xs tabular-nums text-stone-100 outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-stone-300">
                  Notas de Abordagem & Histórico
                </label>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-stone-400">
                  <Clock className="h-3 w-3" />
                  {formatDate(lead.last_checked_at)}
                </span>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anote aqui com quem falou, objeções, horário de retorno ou detalhes da prévia..."
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 p-3 text-xs leading-relaxed text-stone-100 outline-none focus:border-amber-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-stone-950 transition hover:bg-amber-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSaving ? 'Recalculando Score...' : 'Salvar e Recalcular Score'}
            </button>
          </form>

          {/* Links Externos de Investigação */}
          <div className="grid grid-cols-2 gap-2.5">
            {lead.google_maps_url && (
              <a
                href={lead.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-300 transition hover:border-amber-600/50 hover:text-stone-100"
              >
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                Abrir no Maps
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
            <a
              href={googleDorkHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-300 transition hover:border-amber-600/50 hover:text-stone-100"
            >
              <Search className="h-3.5 w-3.5 text-amber-500" />
              Dork Instagram
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Rodapé Fixo de Ações de Conversão */}
        <div className="mt-6 space-y-2 border-t border-stone-800 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenPitchModal(lead)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-xs font-bold text-stone-200 transition hover:border-emerald-600/50 hover:text-stone-100"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              Gerar Script
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleExport()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-xs font-bold text-stone-200 transition hover:border-amber-600/50 hover:text-stone-100 disabled:opacity-50"
            >
              <Code2 className="h-3.5 w-3.5 text-amber-500" />
              {isExporting ? 'Gerando...' : 'site.config.json'}
            </button>
          </div>

          {lead.phone_sanitized && lead.pipeline_status !== 'RECUSADO' && (
            <a
              href={`https://wa.me/55${lead.phone_sanitized}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (lead.pipeline_status === 'NOVO') {
                  void onUpdatePipeline(lead.id, 'CONTATADO')
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-stone-950 shadow-md transition hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4 fill-stone-950" />
              Chamar no WhatsApp (55{lead.phone_sanitized})
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}
