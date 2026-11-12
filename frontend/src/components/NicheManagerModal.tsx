import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { createNiche, deleteNiche, type Niche } from '../services/api'

interface NicheManagerModalProps {
  isOpen: boolean
  onClose: () => void
  niches: Niche[]
  onNichesChange: (updated: Niche[]) => void
  onSelectNiche?: (nicheName: string) => void
}

function generateSlugPreview(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NicheManagerModal({
  isOpen,
  onClose,
  niches,
  onNichesChange,
  onSelectNiche,
}: NicheManagerModalProps) {
  const [nameInput, setNameInput] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [customSlugEdited, setCustomSlugEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingDeleteNiche, setPendingDeleteNiche] = useState<Niche | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleCloseModal = () => {
    setPendingDeleteNiche(null)
    setFeedback(null)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingDeleteNiche) {
          setPendingDeleteNiche(null)
        } else {
          setPendingDeleteNiche(null)
          setFeedback(null)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, pendingDeleteNiche])

  if (!isOpen) return null

  const handleNameChange = (val: string) => {
    setNameInput(val)
    if (!customSlugEdited) {
      setSlugInput(generateSlugPreview(val))
    }
  }

  const handleSlugChange = (val: string) => {
    setCustomSlugEdited(true)
    setSlugInput(generateSlugPreview(val))
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const cleanName = nameInput.trim()
    if (!cleanName || isSubmitting) return

    setIsSubmitting(true)
    try {
      const effectiveSlug = slugInput.trim() || generateSlugPreview(cleanName)
      const created = await createNiche(cleanName, effectiveSlug)
      const next = niches.some((n) => n.id === created.id)
        ? niches
        : [...niches, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      onNichesChange(next)
      if (onSelectNiche) {
        onSelectNiche(created.name)
      }
      setNameInput('')
      setSlugInput('')
      setCustomSlugEdited(false)
      setFeedback(`Nicho "${created.name}" (${created.slug}) salvo com sucesso!`)
      window.setTimeout(() => setFeedback(null), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteNiche || isDeleting) return
    setIsDeleting(true)
    try {
      const target = pendingDeleteNiche
      await deleteNiche(target.id)
      const next = niches.filter((n) => n.id !== target.id)
      onNichesChange(next)
      setPendingDeleteNiche(null)
      setFeedback(`Nicho "${target.name}" removido do catálogo.`)
      window.setTimeout(() => setFeedback(null), 3000)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={handleCloseModal}
    >
      <div
        className="tactical-panel w-full max-w-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h2 className="font-sans text-lg font-semibold tracking-tight text-stone-100">
                Gerenciador de Nichos & Verticais
              </h2>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Cadastre novos nichos para varredura no Google Maps, segmentação de Playbook e
              templates Turnkey (`templates/vercel-{'{slug}'}/base`).
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="btn-tactical-secondary p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {feedback && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-950/25 px-3.5 py-2 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mt-4 rounded-xl border border-white/[0.07] bg-[#0c0a09]/80 p-4"
        >
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Cadastrar Novo Nicho</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label className="mb-1 block text-[11px] font-medium text-stone-400">
                Nome Amigável *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Odontologia"
                value={nameInput}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-tactical"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="mb-1 block text-[11px] font-medium text-stone-400">
                Slug Técnico
              </label>
              <input
                type="text"
                placeholder="Ex: odonto"
                value={slugInput}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="input-tactical font-mono text-amber-300"
              />
            </div>

            <div className="flex items-end sm:col-span-3">
              <button
                type="submit"
                disabled={isSubmitting || !nameInput.trim()}
                className="btn-tactical-primary w-full py-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </form>

        {pendingDeleteNiche && (
          <div className="mt-4 rounded-xl border border-rose-500/45 bg-rose-950/25 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                  Confirmação de Exclusão Segura (Etapa 2/2)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-200">
                  Deseja realmente remover o nicho{' '}
                  <strong className="text-amber-300">“{pendingDeleteNiche.name}”</strong> (
                  <code className="font-mono text-stone-300">{pendingDeleteNiche.slug}</code>)?
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-400">
                  <Lock className="h-3 w-3 shrink-0 text-amber-400" />
                  <span>
                    <strong className="text-stone-300">Proteção de Dados:</strong> Os leads, notas e
                    históricos já coletados não serão perdidos.
                  </span>
                </p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteNiche(null)}
                    className="btn-tactical-secondary py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleConfirmDelete()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão Definitiva'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-stone-400">
            <span className="font-medium uppercase tracking-wider">
              Nichos Homologados ({niches.length})
            </span>
            <span>Clique em Excluir para abrir a trava de segurança</span>
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {niches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-stone-500">
                Nenhum nicho cadastrado no banco. Adicione o primeiro acima.
              </div>
            ) : (
              niches.map((niche) => {
                const isBeingDeleted = pendingDeleteNiche?.id === niche.id
                return (
                  <div
                    key={niche.id}
                    className={`flex items-center justify-between rounded-lg border px-3.5 py-2 transition ${
                      isBeingDeleted
                        ? 'border-rose-500/50 bg-rose-950/20'
                        : 'border-white/[0.07] bg-[#0c0a09]/80 hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-sans text-xs font-semibold text-stone-100">
                        {niche.name}
                      </span>
                      <span className="rounded border border-white/[0.08] bg-[#141210] px-2 py-0.5 font-mono text-[11px] text-amber-400">
                        {niche.slug}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onSelectNiche && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectNiche(niche.name)
                            onClose()
                          }}
                          className="btn-tactical-secondary px-2.5 py-1 text-[11px]"
                        >
                          Selecionar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDeleteNiche(niche)}
                        title={`Solicitar exclusão de ${niche.name}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#141210] px-2.5 py-1 text-[11px] font-medium text-stone-400 transition hover:border-rose-500/40 hover:bg-rose-950/35 hover:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
