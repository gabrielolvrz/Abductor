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
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="flex h-full w-full max-w-[460px] flex-col justify-between overflow-y-auto border-l border-white/[0.08] bg-[#141210] p-6 text-stone-100 shadow-2xl">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-white/[0.08] bg-[#0c0a09] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-300">
                  {lead.category ?? 'Estabelecimento'}
                </span>
                {lead.is_manually_edited && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                    <Lock className="h-3 w-3" />
                    <span>Override Protegido</span>
                  </span>
                )}
                {lead.is_claimed && (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Verificado</span>
                  </span>
                )}
              </div>

              <h2
                id="lead-drawer-title"
                className="mt-2 font-sans text-lg font-semibold tracking-tight text-stone-100"
              >
                {lead.name}
              </h2>

              {lead.address && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{lead.address}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-tactical-secondary p-2"
              aria-label="Fechar gaveta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#0c0a09] p-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  Qualificação Matemática
                </span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold tabular-nums text-emerald-400">
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
              <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-950/30 p-2.5 text-xs text-rose-300">
                <strong>Hard Gate Ativo:</strong> Possui site próprio funcional. Score zerado. Mude
                o diagnóstico abaixo se for um falso positivo.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-stone-300">
                <div className="flex justify-between rounded border border-white/[0.05] bg-[#141210] px-2.5 py-1.5">
                  <span className="text-stone-400">Web:</span>
                  <span className="text-emerald-400">+{bd.website_points ?? 0}</span>
                </div>
                <div className="flex justify-between rounded border border-white/[0.05] bg-[#141210] px-2.5 py-1.5">
                  <span className="text-stone-400">Canal:</span>
                  <span
                    className={(bd.phone_points ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}
                  >
                    {(bd.phone_points ?? 0) >= 0 ? `+${bd.phone_points ?? 0}` : bd.phone_points}
                  </span>
                </div>
                <div className="flex justify-between rounded border border-white/[0.05] bg-[#141210] px-2.5 py-1.5">
                  <span className="text-stone-400">Reviews:</span>
                  <span className="text-emerald-400">+{bd.reviews_points ?? 0}</span>
                </div>
                <div className="flex justify-between rounded border border-white/[0.05] bg-[#141210] px-2.5 py-1.5">
                  <span className="text-stone-400">Nota + Ficha:</span>
                  <span className="text-emerald-400">
                    +{(bd.rating_points ?? 0) + (bd.claimed_points ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="drawer-pipeline-select"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-stone-400"
            >
              Etapa Atual no Funil (Kanban)
            </label>
            <select
              id="drawer-pipeline-select"
              value={lead.pipeline_status}
              onChange={(e) =>
                void onUpdatePipeline(lead.id, e.target.value as PipelineStatus)
              }
              className="input-tactical py-2.5 font-mono text-xs font-semibold"
            >
              {PIPELINE_STEPS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={(e) => void handleSaveOverride(e)}
            className="space-y-3.5 rounded-xl border border-white/[0.07] bg-[#0c0a09]/70 p-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                <Sliders className="h-3.5 w-3.5" />
                <span>Edição Manual & Override de Diagnóstico</span>
              </div>
              {savedFeedback && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  <span>Salvo!</span>
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="drawer-website-status"
                className="mb-1 block text-xs font-medium text-stone-300"
              >
                Diagnóstico Digital (Forçar Status)
              </label>
              <select
                id="drawer-website-status"
                value={websiteStatus}
                onChange={(e) => setWebsiteStatus(e.target.value as WebsiteStatus)}
                className="input-tactical font-medium"
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
                <label className="mb-1 block text-xs font-medium text-stone-300">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    value={phoneRaw}
                    onChange={(e) => setPhoneRaw(e.target.value)}
                    placeholder="(34) 99999-9999"
                    className="input-tactical pl-8 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-300">
                  Instagram (@ ou URL)
                </label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="input-tactical"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-300">
                Link / URL Cadastrada no Maps
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://linktr.ee/..."
                  className="input-tactical pl-8 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-300">
                  Nota no Maps (0–5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="input-tactical font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-300">
                  Total de Avaliações
                </label>
                <input
                  type="number"
                  min="0"
                  value={reviewsCount}
                  onChange={(e) => setReviewsCount(e.target.value)}
                  className="input-tactical font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-stone-300">
                  Notas de Abordagem & Histórico
                </label>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-stone-400">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(lead.last_checked_at)}</span>
                </span>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anote aqui com quem falou, objeções, horário de retorno ou detalhes da prévia..."
                className="input-tactical p-3 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-tactical-primary w-full py-2.5"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'Recalculando Score...' : 'Salvar e Recalcular Score'}</span>
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2">
            {lead.google_maps_url && (
              <a
                href={lead.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="btn-tactical-secondary py-2"
              >
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Abrir no Maps</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
            <a
              href={googleDorkHref}
              target="_blank"
              rel="noreferrer"
              className="btn-tactical-secondary py-2"
            >
              <Search className="h-3.5 w-3.5 text-amber-400" />
              <span>Dork Instagram</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-white/[0.07] pt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenPitchModal(lead)}
              className="btn-tactical-secondary py-2.5"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Gerar Script</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleExport()}
              className="btn-tactical-secondary py-2.5"
            >
              <Code2 className="h-3.5 w-3.5 text-amber-400" />
              <span>{isExporting ? 'Gerando...' : 'site.config.json'}</span>
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
              className="btn-tactical-emerald w-full py-2.5"
            >
              <MessageCircle className="h-4 w-4 fill-stone-950" />
              <span>Chamar no WhatsApp (55{lead.phone_sanitized})</span>
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}
