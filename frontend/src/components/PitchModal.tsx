import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react'
import {
  cleanNameClientSide,
  interpolateScript,
  listScripts,
  type Lead,
  type PipelineStatus,
  type PitchScript,
} from '../services/api'

interface PitchModalProps {
  lead: Lead | null
  onClose: () => void
  onMarkContacted?: (leadId: string, status: PipelineStatus) => Promise<void>
}

export function PitchModal({ lead, onClose, onMarkContacted }: PitchModalProps) {
  const [scripts, setScripts] = useState<PitchScript[]>([])
  const [selectedScriptId, setSelectedScriptId] = useState<string>('')
  const [ticketPrice, setTicketPrice] = useState<number>(350)
  const [messageText, setMessageText] = useState<string>('')
  const [cleanedName, setCleanedName] = useState<string>('')
  const [scriptTitle, setScriptTitle] = useState<string>('')
  const [upsellFocus, setUpsellFocus] = useState<string>('NONE')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  useEffect(() => {
    if (!lead) return
    let active = true

    const initialPrice =
      typeof lead.deal_value === 'number' && lead.deal_value > 0
        ? lead.deal_value
        : 350

    const loadInitialInterpolation = async () => {
      setIsLoading(true)
      try {
        const [allScripts, interp] = await Promise.all([
          listScripts(),
          interpolateScript({ lead_id: lead.id, price: initialPrice }),
        ])
        if (!active) return
        setTicketPrice(initialPrice)
        setScripts(allScripts)
        setSelectedScriptId(interp.script_id ?? '')
        setMessageText(interp.interpolated_message)
        setCleanedName(interp.cleaned_name)
        setScriptTitle(interp.script_title)
        setUpsellFocus(interp.upsell_focus)
      } catch {
        if (!active) return
        const fallbackName = cleanNameClientSide(lead.name) || lead.name
        setCleanedName(fallbackName)
        setScriptTitle('Roteiro Padrão')
        setMessageText(
          `Olá, equipe de ${fallbackName}, tudo bem? Vi o perfil de vocês no Google Maps em ${
            lead.city ?? 'sua cidade'
          } e montei uma prévia de Site Vitrine One-Page (R$ 350 em pagamento único, zero mensalidade e já com blindagem LGPD nativa). Posso te mandar o link para ver no celular?`,
        )
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadInitialInterpolation()
    return () => {
      active = false
    }
  }, [lead])

  useEffect(() => {
    if (!lead) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lead, onClose])

  if (!lead) return null

  const handleSelectScript = async (newScriptId: string) => {
    setSelectedScriptId(newScriptId)
    setIsLoading(true)
    try {
      const interp = await interpolateScript({
        lead_id: lead.id,
        script_id: newScriptId || null,
        price: ticketPrice,
      })
      setMessageText(interp.interpolated_message)
      setCleanedName(interp.cleaned_name)
      setScriptTitle(interp.script_title)
      setUpsellFocus(interp.upsell_focus)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePrice = async (newPrice: number) => {
    setTicketPrice(newPrice)
    setIsLoading(true)
    try {
      const interp = await interpolateScript({
        lead_id: lead.id,
        script_id: selectedScriptId || null,
        price: newPrice,
      })
      setMessageText(interp.interpolated_message)
    } catch {
      setMessageText((prev) =>
        prev.replace(/R\$\s*\d+/g, `R$ ${newPrice}`)
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyOnly = async () => {
    await navigator.clipboard.writeText(messageText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyAndOpenWhatsApp = async () => {
    await navigator.clipboard.writeText(messageText)
    setCopied(true)
    if (lead.phone_sanitized) {
      const url = `https://wa.me/55${lead.phone_sanitized}?text=${encodeURIComponent(
        messageText,
      )}`
      window.open(url, '_blank', 'noopener,noreferrer')
      if (onMarkContacted && lead.pipeline_status === 'NOVO') {
        await onMarkContacted(lead.id, 'CONTATADO')
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pitch-modal-title"
    >
      {copied && (
        <div className="tactical-panel fixed bottom-5 right-5 z-[60] flex items-center gap-2 border-emerald-500/40 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Copiado para a área de transferência!</span>
        </div>
      )}
      <div className="tactical-panel w-full max-w-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <Sparkles className="h-3 w-3" />
                <span>Interpolação Runtime</span>
              </span>
              {upsellFocus !== 'NONE' && (
                <span className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Upsell: {upsellFocus}
                </span>
              )}
            </div>
            <h2
              id="pitch-modal-title"
              className="mt-2 font-sans text-lg font-semibold tracking-tight text-stone-100"
            >
              Abordagem para {cleanedName || lead.name}
            </h2>
            <p className="mt-0.5 text-xs text-stone-400">
              Ficha original: <span className="text-stone-300">{lead.name}</span> • Diagnóstico:{' '}
              <strong className="font-mono text-amber-400">{lead.website_status}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-tactical-secondary p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-[#0c0a09]/80 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                Ticket Volátil para este Prospect
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400">
                R$ {ticketPrice} em pagamento único
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[300, 350, 400, 450, 500, 650, 850].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void handleChangePrice(p)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs tabular-nums transition-all ${
                    ticketPrice === p
                      ? 'bg-amber-500 font-semibold text-stone-950 shadow-sm'
                      : 'border border-white/[0.08] bg-[#141210] text-stone-300 hover:border-white/[0.18] hover:text-stone-100'
                  }`}
                >
                  R$ {p}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 pt-1 sm:pt-0">
                <span className="text-[11px] text-stone-400">Outro:</span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={ticketPrice}
                  onChange={(e) => void handleChangePrice(Number(e.target.value) || 350)}
                  className="input-tactical w-20 py-1 font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="pitch-script-selector"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-stone-400"
            >
              Roteiro Selecionado ({scriptTitle})
            </label>
            <select
              id="pitch-script-selector"
              value={selectedScriptId}
              disabled={isLoading}
              onChange={(e) => void handleSelectScript(e.target.value)}
              className="input-tactical py-2.5 font-medium"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.script_type === 'OBJECTION' ? 'OBJEÇÃO' : 'PITCH'} • {s.category} /{' '}
                  {s.website_condition}] {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                Texto pronto (ajuste antes de disparar se quiser)
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Montando mensagem...</span>
                </span>
              )}
            </div>
            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="input-tactical p-3.5 font-sans text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={() => void handleCopyOnly()}
            className="btn-tactical-secondary px-4 py-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-stone-400" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-tactical-ghost px-4 py-2"
            >
              Fechar
            </button>

            <button
              type="button"
              disabled={!lead.phone_sanitized}
              onClick={() => void handleCopyAndOpenWhatsApp()}
              className="btn-tactical-emerald px-5 py-2"
            >
              <MessageCircle className="h-4 w-4 fill-stone-950" />
              <span>Copiar e Abrir WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
