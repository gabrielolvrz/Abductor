import { useState } from 'react'
import {
  AlertTriangle,
  AtSign,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  Sliders,
  Star,
} from 'lucide-react'
import {
  buildQuickPitchMessage,
  type Lead,
  type LeadUpdateRequest,
  type PipelineStatus,
} from '../services/api'

interface LeadCardProps {
  lead: Lead
  onUpdatePipeline: (leadId: string, status: PipelineStatus) => Promise<void>
  onUpdateDetails: (leadId: string, payload: LeadUpdateRequest) => Promise<void>
  onOpenPitchModal: (lead: Lead) => void
  onExportSiteConfig: (lead: Lead) => Promise<void> | void
  onOpenDrawer?: (lead: Lead) => void
}

const PIPELINE_OPTIONS: { value: PipelineStatus; label: string; badgeClass: string }[] = [
  {
    value: 'NOVO',
    label: 'NOVO',
    badgeClass: 'border-stone-700 bg-stone-800 text-stone-200',
  },
  {
    value: 'CONTATADO',
    label: 'CONTATADO',
    badgeClass: 'border-amber-600/50 bg-amber-600/15 text-amber-300',
  },
  {
    value: 'RESPONDEU',
    label: 'RESPONDEU',
    badgeClass: 'border-amber-500/60 bg-amber-500/20 text-amber-200',
  },
  {
    value: 'NEGOCIANDO',
    label: 'NEGOCIANDO',
    badgeClass: 'border-emerald-600/50 bg-emerald-600/15 text-emerald-300',
  },
  {
    value: 'FECHADO',
    label: 'FECHADO (PIX)',
    badgeClass: 'border-emerald-500/70 bg-emerald-600/25 text-emerald-200',
  },
  {
    value: 'RECUSADO',
    label: 'RECUSADO (OPT-OUT)',
    badgeClass: 'border-rose-700/60 bg-rose-950/40 text-rose-300',
  },
]

export function LeadCard({
  lead,
  onUpdatePipeline,
  onOpenPitchModal,
  onExportSiteConfig,
  onOpenDrawer,
}: LeadCardProps) {
  const [isExporting, setIsExporting] = useState(false)

  const borderClass =
    lead.score >= 80
      ? 'border-emerald-600/80 shadow-emerald-950/20'
      : lead.score >= 50
        ? 'border-amber-600/80 shadow-amber-950/20'
        : 'border-stone-800'

  const scoreBadgeClass =
    lead.score >= 80
      ? 'bg-emerald-600 text-stone-950 border-emerald-500'
      : lead.score >= 50
        ? 'bg-amber-600 text-stone-950 border-amber-500'
        : 'bg-stone-800 text-stone-300 border-stone-700'

  const getWebsiteBadge = () => {
    switch (lead.website_status) {
      case 'IMPROVISADO':
        return {
          label: 'Linktree / Improvisado',
          className: 'border-amber-600/40 bg-amber-600/15 text-amber-300',
        }
      case 'SEM_SITE':
        return {
          label: 'Sem Site',
          className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
        }
      case 'QUEBRADO':
        return {
          label: `Fora do Ar (${lead.website_http_code || 'DNS/Timeout'})`,
          className: 'border-rose-700/50 bg-rose-950/40 text-rose-300',
        }
      case 'ATIVO':
      default:
        return {
          label: 'Site Ativo (Hard Gate)',
          className: 'border-stone-700 bg-stone-800/90 text-stone-400',
        }
    }
  }

  const getPhoneBadge = () => {
    switch (lead.phone_type) {
      case 'MOBILE':
        return {
          label: 'WhatsApp Celular',
          className: 'border-emerald-600/40 bg-emerald-600/15 text-emerald-300',
        }
      case 'LANDLINE':
        return {
          label: 'Fixo',
          className: 'border-stone-700 bg-stone-800 text-stone-300',
        }
      default:
        return {
          label: 'Sem Telefone (-30)',
          className: 'border-rose-700/40 bg-rose-950/30 text-rose-300',
        }
    }
  }

  const websiteBadge = getWebsiteBadge()
  const phoneBadge = getPhoneBadge()

  const quickMessage = buildQuickPitchMessage(lead)
  const whatsappDirectHref = lead.phone_sanitized
    ? `https://wa.me/55${lead.phone_sanitized}?text=${encodeURIComponent(quickMessage)}`
    : null

  const dorkQuery = `"${lead.name}" "${lead.city ?? ''}" site:instagram.com`
  const googleDorkHref = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`

  const handleExportClick = async () => {
    setIsExporting(true)
    try {
      await onExportSiteConfig(lead)
    } finally {
      setIsExporting(false)
    }
  }

  const currentPipelineMeta =
    PIPELINE_OPTIONS.find((p) => p.value === lead.pipeline_status) ?? PIPELINE_OPTIONS[0]

  const isOptedOut = lead.pipeline_status === 'RECUSADO'
  const bd = lead.score_breakdown ?? {}

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-2xl border bg-[#1c1917] p-5 shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-stone-700 ${borderClass} ${
        isOptedOut ? 'opacity-60' : ''
      }`}
    >
      {/* Topo do Card */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-stone-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-300">
                {lead.category ?? 'Estabelecimento'}
              </span>
              {lead.is_claimed && (
                <span className="rounded border border-emerald-600/35 bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Verificado
                </span>
              )}
              {lead.is_manually_edited && (
                <span
                  title="Diagnóstico ou contato ajustado manualmente (protegido contra re-scraping)"
                  className="inline-flex items-center gap-1 rounded border border-amber-600/40 bg-amber-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Override
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenDrawer?.(lead)}
              className="mt-1.5 text-left"
            >
              <h3
                className="line-clamp-2 font-serif text-lg font-bold leading-snug tracking-tight text-stone-100 transition group-hover:text-amber-400"
                title={lead.name}
              >
                {lead.name}
              </h3>
            </button>

            {lead.address && (
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                <span className="truncate" title={lead.address}>
                  {lead.address}
                </span>
              </p>
            )}
          </div>

          {/* Selo de Score Tabular + Tooltip */}
          <div className="relative shrink-0 group/score">
            <div
              className={`flex flex-col items-center justify-center rounded-xl border px-3 py-1.5 text-center shadow-sm cursor-help ${scoreBadgeClass}`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                Score
              </span>
              <span className="font-mono text-xl font-black leading-none tabular-nums">
                {lead.score}
              </span>
            </div>

            <div className="pointer-events-none invisible absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-stone-700 bg-stone-950 p-3.5 text-xs text-stone-200 opacity-0 shadow-2xl transition-all group-hover/score:visible group-hover/score:opacity-100">
              <div className="mb-2 flex items-center justify-between border-b border-stone-800 pb-1.5 font-bold text-stone-100">
                <span>Composição do Score</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {lead.score} / 100
                </span>
              </div>
              {bd.hard_gate_triggered ? (
                <div className="rounded-lg border border-rose-700/40 bg-rose-950/30 p-2 text-[11px] text-rose-300">
                  <strong>Hard Gate (0 pts):</strong> Site próprio ativo. Clique em Override se
                  for falso positivo.
                </div>
              ) : (
                <ul className="space-y-1 font-mono text-[11px] tabular-nums">
                  <li className="flex justify-between">
                    <span className="font-sans text-stone-400">Web ({lead.website_status}):</span>
                    <span className="text-emerald-400">+{bd.website_points ?? 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-sans text-stone-400">Canal ({lead.phone_type}):</span>
                    <span
                      className={
                        (bd.phone_points ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }
                    >
                      {(bd.phone_points ?? 0) >= 0
                        ? `+${bd.phone_points ?? 0}`
                        : bd.phone_points}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-sans text-stone-400">
                      Avaliações ({lead.reviews_count}):
                    </span>
                    <span className="text-emerald-400">+{bd.reviews_points ?? 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-sans text-stone-400">
                      Nota ({lead.rating.toFixed(1)}★):
                    </span>
                    <span
                      className={
                        (bd.rating_points ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }
                    >
                      {(bd.rating_points ?? 0) >= 0
                        ? `+${bd.rating_points ?? 0}`
                        : bd.rating_points}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-sans text-stone-400">Ficha Reivindicada:</span>
                    <span className="text-emerald-400">+{bd.claimed_points ?? 0}</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Badges de Prova Social e Diagnóstico */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-stone-800 bg-stone-950 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {lead.reviews_count > 0 ? (
              <>
                {lead.rating.toFixed(1)}{' '}
                <span className="text-stone-400">({lead.reviews_count})</span>
              </>
            ) : (
              <span className="font-sans text-stone-400">0 av.</span>
            )}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${websiteBadge.className}`}
          >
            <Globe className="h-3 w-3" />
            {websiteBadge.label}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${phoneBadge.className}`}
          >
            <Phone className="h-3 w-3" />
            {phoneBadge.label}
          </span>

          {lead.is_shared_phone && (
            <span
              title="Número compartilhado com outra ficha no Google Maps"
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-600/20 px-2.5 py-1 text-xs font-bold text-amber-300"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Tel. compartilhado
            </span>
          )}
        </div>

        {/* Resumo de Contato e Notas */}
        <div className="mt-3.5 space-y-1.5 rounded-xl border border-stone-800 bg-stone-950/70 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono tabular-nums text-stone-200">
              {lead.phone_raw || 'Sem telefone na ficha'}
            </span>
            {lead.website_url && (
              <a
                href={
                  lead.website_url.startsWith('http')
                    ? lead.website_url
                    : `https://${lead.website_url}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-[180px] items-center gap-1 truncate font-mono text-amber-400 hover:underline"
                title={lead.website_url}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.website_url}</span>
              </a>
            )}
          </div>

          {lead.instagram_url && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <AtSign className="h-3.5 w-3.5 shrink-0" />
              <a
                href={lead.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:underline"
              >
                {lead.instagram_url}
              </a>
            </div>
          )}

          {lead.notes && (
            <p className="mt-1 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] italic text-stone-300">
              “{lead.notes}”
            </p>
          )}
        </div>
      </div>

      {/* Rodapé: Pipeline + Botão Override Drawer + Ações de 1 Clique */}
      <div className="mt-4 space-y-3 border-t border-stone-800 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor={`pipeline-${lead.id}`} className="sr-only">
              Status do Funil
            </label>
            <select
              id={`pipeline-${lead.id}`}
              value={lead.pipeline_status}
              onChange={(e) =>
                void onUpdatePipeline(lead.id, e.target.value as PipelineStatus)
              }
              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none transition ${currentPipelineMeta.badgeClass}`}
            >
              {PIPELINE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-stone-900 text-stone-100"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {onOpenDrawer && (
            <button
              type="button"
              onClick={() => onOpenDrawer(lead)}
              title="Abrir Gaveta de Foco & Override Manual"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-amber-600/60 hover:text-amber-400"
            >
              <Sliders className="h-3.5 w-3.5 text-amber-500" />
              Override
            </button>
          )}
        </div>

        {isOptedOut && (
          <div className="flex items-center gap-1.5 rounded-lg border border-rose-700/40 bg-rose-950/30 px-2.5 py-1 text-[11px] font-medium text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Opt-Out ativo (LGPD): Abordagem comercial bloqueada.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {whatsappDirectHref && !isOptedOut ? (
            <a
              href={whatsappDirectHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (lead.pipeline_status === 'NOVO') {
                  void onUpdatePipeline(lead.id, 'CONTATADO')
                }
              }}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-stone-950 shadow-md transition hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4 fill-stone-950" />
              Abordar no WhatsApp (1-Click)
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="col-span-2 flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 text-xs font-semibold text-stone-500"
            >
              <MessageCircle className="h-4 w-4" />
              {isOptedOut ? 'Lead em Opt-Out (Recusado)' : 'Sem WhatsApp Válido'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenPitchModal(lead)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-200 transition hover:border-amber-600/50 hover:bg-stone-800 hover:text-stone-100"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500" />
            Ver Script
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExportClick()}
            title="Baixar site.config.json pré-preenchido com nome limpo, WhatsApp 55+DDD e LGPD nativa"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-200 transition hover:border-amber-600/50 hover:bg-stone-800 hover:text-stone-100 disabled:opacity-50"
          >
            <Code2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="truncate">
              {isExporting ? 'Gerando...' : 'site.config.json'}
            </span>
          </button>

          {lead.google_maps_url ? (
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950/80 px-2.5 py-1.5 text-[11px] font-medium text-stone-300 transition hover:border-stone-600 hover:text-stone-100"
            >
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              Ficha Maps
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800/50 bg-stone-950/40 px-2.5 py-1.5 text-[11px] text-stone-600">
              <MapPin className="h-3.5 w-3.5" />
              Sem Link Maps
            </span>
          )}

          <a
            href={googleDorkHref}
            target="_blank"
            rel="noreferrer"
            title={`Buscar no Google: ${dorkQuery}`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950/80 px-2.5 py-1.5 text-[11px] font-medium text-stone-300 transition hover:border-amber-600/50 hover:text-amber-300"
          >
            <Search className="h-3.5 w-3.5 text-amber-500" />
            Dork Instagram
          </a>
        </div>
      </div>
    </article>
  )
}
