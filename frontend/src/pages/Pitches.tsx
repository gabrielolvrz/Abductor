import { useEffect, useState, type FormEvent } from 'react'
import {
  Check,
  Copy,
  Edit3,
  Layers,
  MessageSquarePlus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { NicheManagerModal } from '../components/NicheManagerModal'
import {
  HOMOLOGATED_CATEGORIES,
  createScript,
  deleteScript,
  listNiches,
  listScripts,
  updateScript,
  type Niche,
  type PitchScript,
  type ScriptType,
  type ScriptWebsiteCondition,
  type UpsellFocus,
} from '../services/api'

export function Pitches() {
  const [scripts, setScripts] = useState<PitchScript[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedNicheFilter, setSelectedNicheFilter] = useState<string>('TODOS')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingScript, setEditingScript] = useState<PitchScript | null>(null)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false)
  const [showNicheModal, setShowNicheModal] = useState<boolean>(false)

  // Campos de criação
  const [newScriptType, setNewScriptType] = useState<ScriptType>('PITCH')
  const [newTitle, setNewTitle] = useState('')
  const [newSituation, setNewSituation] = useState('')
  const [newCategory, setNewCategory] = useState('Advogado')
  const [newCondition, setNewCondition] = useState<ScriptWebsiteCondition>('IMPROVISADO')
  const [newUpsell, setNewUpsell] = useState<UpsellFocus>('GMB')
  const [newTemplate, setNewTemplate] = useState(
    'Olá, Dr(a). {name}, tudo bem? Vi o perfil do seu escritório no Google Maps com {reviews_count} avaliações excelentes na região de {city}.\n\nEu desenvolvo Sites Vitrine One-Page perenes (R$ 350 em pagamento único, zero mensalidades e já com blindagem LGPD nativa inclusa). Posso te enviar uma demonstração de 1 minuto?',
  )

  useEffect(() => {
    let active = true
    Promise.all([listScripts(), listNiches()])
      .then(([scriptsData, nichesData]) => {
        if (!active) return
        setScripts(scriptsData)
        setNiches(nichesData)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingScript(null)
        setShowCreateForm(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const categoryOptions =
    niches.length > 0 ? niches.map((n) => n.name) : [...HOMOLOGATED_CATEGORIES]

  const filteredScripts =
    selectedNicheFilter === 'TODOS'
      ? scripts
      : scripts.filter(
          (s) =>
            s.category.toLowerCase() === selectedNicheFilter.toLowerCase() ||
            s.category.toLowerCase() === 'geral',
        )

  const handleCopy = async (script: PitchScript) => {
    await navigator.clipboard.writeText(script.message_template.replace(/\\n/g, '\n'))
    setCopiedId(script.id)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingScript) return
    const updated = await updateScript(editingScript.id, {
      title: editingScript.title,
      category: editingScript.category,
      script_type: editingScript.script_type,
      situation: editingScript.situation,
      website_condition: editingScript.website_condition,
      message_template: editingScript.message_template,
      upsell_focus: editingScript.upsell_focus,
    })
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setEditingScript(null)
  }

  const handleCreateScript = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newTemplate.trim()) return
    const created = await createScript({
      title: newTitle.trim(),
      category: newCategory.trim(),
      script_type: newScriptType,
      situation: newSituation.trim() || null,
      website_condition: newScriptType === 'OBJECTION' ? 'GERAL' : newCondition,
      message_template: newTemplate,
      upsell_focus: newScriptType === 'OBJECTION' ? 'NONE' : newUpsell,
    })
    setScripts((prev) => [...prev, created])
    setNewTitle('')
    setNewSituation('')
    setShowCreateForm(false)
  }

  const handleDelete = async (scriptId: string) => {
    await deleteScript(scriptId)
    setScripts((prev) => prev.filter((s) => s.id !== scriptId))
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
      {copiedId && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-[#141210] px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          <Check className="h-4 w-4 text-emerald-400" />
          Copiado para a área de transferência!
        </div>
      )}
      <div className="tactical-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h1 className="font-sans text-xl font-semibold tracking-tight text-stone-100">
              Biblioteca de Roteiros &amp; Templates (/abordagens)
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Variáveis interpoladas em runtime:{' '}
            <code className="rounded border border-white/[0.06] bg-[#0c0a09] px-1.5 py-0.5 font-mono text-amber-400">
              {'{name}'}
            </code>{' '}
            (sem LTDA/ME),{' '}
            <code className="rounded border border-white/[0.06] bg-[#0c0a09] px-1.5 py-0.5 font-mono text-amber-400">
              {'{city}'}
            </code>
            ,{' '}
            <code className="rounded border border-white/[0.06] bg-[#0c0a09] px-1.5 py-0.5 font-mono text-amber-400">
              {'{rating}'}
            </code>{' '}
            e{' '}
            <code className="rounded border border-white/[0.06] bg-[#0c0a09] px-1.5 py-0.5 font-mono text-amber-400">
              {'{reviews_count}'}
            </code>
            . Pacote Base Turnkey R$ 350 (LGPD nativa inclusa) | Customização +R$ 150.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar roteiros por nicho"
            value={selectedNicheFilter}
            onChange={(e) => setSelectedNicheFilter(e.target.value)}
            className="input-tactical px-3.5 py-2 text-xs font-semibold"
          >
            <option value="TODOS">Todos os Nichos ({scripts.length})</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNicheModal(true)}
            className="btn-tactical-secondary px-3.5 py-2 text-xs"
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            Nichos
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="btn-tactical-primary px-4 py-2 text-xs"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            + Novo Roteiro / Objeção
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreateScript(e)}
          className="tactical-panel space-y-4 border-amber-500/35 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-sm font-semibold tracking-tight text-stone-100">
              Cadastrar Novo Roteiro no PostgreSQL
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-tactical-ghost p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="block text-[11px] font-medium text-stone-400">Tipo *</label>
              <select
                value={newScriptType}
                onChange={(e) => setNewScriptType(e.target.value as ScriptType)}
                className="input-tactical mt-1 w-full px-3 py-2 text-xs font-semibold"
              >
                <option value="PITCH">Abordagem Inicial (Pitch)</option>
                <option value="OBJECTION">Quebra de Objeção</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400">Título *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Odonto — Linktree para Vitrine"
                className="input-tactical mt-1 w-full px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400">
                Categoria / Nicho *
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="input-tactical mt-1 w-full px-3 py-2 text-xs"
              >
                <option value="Geral">Geral (Universal)</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400">
                Condição do Site
              </label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as ScriptWebsiteCondition)}
                className="input-tactical mt-1 w-full px-3 py-2 text-xs"
              >
                <option value="IMPROVISADO">IMPROVISADO (Linktree/Insta)</option>
                <option value="SEM_SITE">SEM_SITE</option>
                <option value="QUEBRADO">QUEBRADO (Fora do Ar)</option>
                <option value="GERAL">GERAL</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400">
                Foco de Upsell Posterior
              </label>
              <select
                value={newUpsell}
                onChange={(e) => setNewUpsell(e.target.value as UpsellFocus)}
                className="input-tactical mt-1 w-full px-3 py-2 text-xs"
              >
                <option value="GMB">Google Meu Negócio (GMB)</option>
                <option value="ADS">Google Ads Local</option>
                <option value="COMBO">Combo (Marca + GMB)</option>
                <option value="NONE">Sem Upsell</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-stone-400">
              Corpo do Script *
            </label>
            <textarea
              rows={5}
              required
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              className="input-tactical mt-1 w-full p-3 text-xs leading-relaxed"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-tactical-secondary px-4 py-2 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-tactical-emerald px-4 py-2 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar Roteiro
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="tactical-card h-56 animate-pulse p-5"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredScripts.map((script) => {
            const isEditingThis = editingScript?.id === script.id
            return (
              <article
                key={script.id}
                className="tactical-card flex flex-col justify-between p-5 hover:border-white/[0.14]"
              >
                {isEditingThis && editingScript ? (
                  <form onSubmit={(e) => void handleSaveEdit(e)} className="space-y-3">
                    <input
                      type="text"
                      value={editingScript.title}
                      onChange={(e) =>
                        setEditingScript({ ...editingScript, title: e.target.value })
                      }
                      className="input-tactical w-full px-3 py-2 text-sm font-semibold"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editingScript.category}
                        onChange={(e) =>
                          setEditingScript({ ...editingScript, category: e.target.value })
                        }
                        className="input-tactical px-2.5 py-1.5 text-xs"
                      />
                      <select
                        value={editingScript.website_condition}
                        onChange={(e) =>
                          setEditingScript({
                            ...editingScript,
                            website_condition: e.target.value as ScriptWebsiteCondition,
                          })
                        }
                        className="input-tactical px-2.5 py-1.5 text-xs"
                      >
                        <option value="IMPROVISADO">IMPROVISADO</option>
                        <option value="SEM_SITE">SEM_SITE</option>
                        <option value="QUEBRADO">QUEBRADO</option>
                        <option value="GERAL">GERAL</option>
                      </select>
                      <select
                        value={editingScript.upsell_focus}
                        onChange={(e) =>
                          setEditingScript({
                            ...editingScript,
                            upsell_focus: e.target.value as UpsellFocus,
                          })
                        }
                        className="input-tactical px-2.5 py-1.5 text-xs"
                      >
                        <option value="NONE">Sem Upsell</option>
                        <option value="GMB">Upsell GMB</option>
                        <option value="ADS">Upsell Ads</option>
                        <option value="COMBO">Upsell Combo</option>
                      </select>
                    </div>
                    <textarea
                      rows={7}
                      value={editingScript.message_template}
                      onChange={(e) =>
                        setEditingScript({
                          ...editingScript,
                          message_template: e.target.value,
                        })
                      }
                      className="input-tactical w-full p-3 text-xs leading-relaxed"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingScript(null)}
                        className="btn-tactical-secondary px-3 py-1.5 text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn-tactical-emerald px-3.5 py-1.5 text-xs"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            script.script_type === 'OBJECTION'
                              ? 'border border-rose-500/35 bg-rose-500/10 text-rose-300'
                              : 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          {script.script_type === 'OBJECTION' ? 'Objeção' : 'Pitch'}
                        </span>
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          {script.category}
                        </span>
                        <span className="rounded-md border border-white/[0.08] bg-[#0c0a09] px-2 py-0.5 font-mono text-[11px] font-medium text-stone-300">
                          {script.website_condition}
                        </span>
                        {script.upsell_focus !== 'NONE' && (
                          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            Upsell: {script.upsell_focus}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingScript(script)}
                          className="btn-tactical-secondary px-2.5 py-1 text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(script.id)}
                          title="Excluir roteiro"
                          className="btn-tactical-secondary px-2 py-1 text-xs hover:border-rose-500/40 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopy(script)}
                          className="btn-tactical-secondary px-2.5 py-1 text-xs hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                          {copiedId === script.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-3 font-sans text-base font-semibold tracking-tight text-stone-100">
                      {script.title}
                    </h3>

                    <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-[#0c0a09] p-3.5 font-sans text-xs leading-relaxed text-stone-200">
                      {script.message_template.replace(/\\n/g, '\n')}
                    </pre>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <NicheManagerModal
        isOpen={showNicheModal}
        onClose={() => setShowNicheModal(false)}
        niches={niches}
        onNichesChange={setNiches}
      />
    </main>
  )
}
