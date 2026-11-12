import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Bug,
  CheckCircle2,
  Circle,
  Lightbulb,
  NotebookPen,
  Plus,
  Trash2,
  Bell,
} from 'lucide-react'
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type NoteTag,
  type SystemNote,
} from '../services/api'

const NOTES_DRAFT_STORAGE_KEY = 'abductor_notes_draft'

interface NotesDraft {
  title: string
  content: string
  tag: NoteTag
}

function loadNotesDraft(): NotesDraft {
  const defaults: NotesDraft = {
    title: '',
    content: '',
    tag: 'IDEIA',
  }
  try {
    const raw = window.localStorage.getItem(NOTES_DRAFT_STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<NotesDraft>
    return {
      title: parsed.title ?? '',
      content: parsed.content ?? '',
      tag: parsed.tag ?? 'IDEIA',
    }
  } catch {
    return defaults
  }
}

export function Notes() {
  const initialDraft = loadNotesDraft()

  const [notes, setNotes] = useState<SystemNote[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [filterTag, setFilterTag] = useState<NoteTag | 'TODAS'>('TODAS')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [title, setTitle] = useState(initialDraft.title)
  const [content, setContent] = useState(initialDraft.content)
  const [tag, setTag] = useState<NoteTag>(initialDraft.tag)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Salva rascunho continuamente no localStorage
  useEffect(() => {
    try {
      if (!title.trim() && !content.trim() && tag === 'IDEIA') {
        window.localStorage.removeItem(NOTES_DRAFT_STORAGE_KEY)
      } else {
        const draft: NotesDraft = { title, content, tag }
        window.localStorage.setItem(NOTES_DRAFT_STORAGE_KEY, JSON.stringify(draft))
      }
    } catch {
      // ignore
    }
  }, [title, content, tag])

  useEffect(() => {
    let active = true
    listNotes()
      .then((data) => {
        if (active) setNotes(data)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const created = await createNote({
        title: title.trim(),
        content: content.trim() || null,
        tag,
      })
      setNotes((prev) => [created, ...prev])
      setTitle('')
      setContent('')
      setTag('IDEIA')
      try {
        window.localStorage.removeItem(NOTES_DRAFT_STORAGE_KEY)
      } catch {
        // ignore
      }
      setToastMessage('Anotação salva no backlog!')
      window.setTimeout(() => setToastMessage(null), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleDone = async (note: SystemNote) => {
    const updated = await updateNote(note.id, { is_done: !note.is_done })
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
  }

  const handleDelete = async (noteId: string) => {
    await deleteNote(noteId)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  const filteredNotes = useMemo(() => {
    if (filterTag === 'TODAS') return notes
    return notes.filter((n) => n.tag === filterTag)
  }, [notes, filterTag])

  const getTagBadge = (t: NoteTag) => {
    switch (t) {
      case 'BUG':
        return {
          icon: Bug,
          className: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
        }
      case 'LEMBRETE':
        return {
          icon: Bell,
          className: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
        }
      case 'IDEIA':
      default:
        return {
          icon: Lightbulb,
          className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
        }
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-6 py-6">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-[#141210] px-4 py-3 text-xs font-semibold text-amber-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Topo */}
      <div className="tactical-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-amber-400" />
            <h1 className="font-sans text-xl font-semibold tracking-tight text-stone-100">
              Backlog Interno &amp; Caderno de Operação (/anotacoes)
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Anote ideias de novos nichos, ajustes nos templates Turnkey, feedbacks de clientes ou
            lembretes de prospecção.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-[#0c0a09] p-1">
          {(['TODAS', 'IDEIA', 'LEMBRETE', 'BUG'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilterTag(item)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                filterTag === item
                  ? 'bg-amber-500 text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                  : 'text-stone-400 hover:bg-white/[0.04] hover:text-stone-100'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulário de Nova Nota */}
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="tactical-panel space-y-4 self-start p-5 lg:col-span-4"
        >
          <h2 className="font-sans text-sm font-semibold tracking-tight text-stone-100">
            Registrar no Backlog
          </h2>

          <div>
            <label className="block text-[11px] font-medium text-stone-400">
              Título / Resumo *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Testar vertical de Fisioterapia em Uberaba"
              className="input-tactical mt-1 w-full px-3.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-400">
              Categoria
            </label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as NoteTag)}
              className="input-tactical mt-1 w-full px-3.5 py-2 text-xs font-semibold"
            >
              <option value="IDEIA">IDEIA (Novo Nicho / Template / Pitch)</option>
              <option value="LEMBRETE">LEMBRETE (Follow-up / Operação)</option>
              <option value="BUG">BUG (Ajuste Técnico)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-400">
              Detalhes (opcional)
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contexto adicional, referências ou passos..."
              className="input-tactical mt-1 w-full p-3 text-xs leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="btn-tactical-primary w-full px-4 py-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Salvar Anotação
          </button>
        </form>

        {/* Lista de Anotações */}
        <section className="space-y-2.5 lg:col-span-8">
          {!isLoading && filteredNotes.length === 0 ? (
            <div className="tactical-panel p-12 text-center">
              <p className="font-sans text-sm font-semibold text-stone-200">
                Nenhuma anotação por aqui ainda.
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Use o formulário ao lado para guardar ideias de nichos, melhorias de copy ou
                lembretes rápidos.
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const badge = getTagBadge(note.tag)
              const BadgeIcon = badge.icon
              return (
                <article
                  key={note.id}
                  className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-all duration-150 ${
                    note.is_done
                      ? 'border-white/[0.04] bg-[#0c0a09]/70 opacity-60'
                      : 'tactical-card hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void handleToggleDone(note)}
                      className="mt-0.5 text-stone-400 transition hover:text-emerald-400"
                      title={note.is_done ? 'Reabrir item' : 'Marcar como concluído'}
                    >
                      {note.is_done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {note.tag}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-stone-400">
                          {new Date(note.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <h3
                        className={`mt-1.5 font-sans text-sm font-semibold tracking-tight ${
                          note.is_done ? 'line-through text-stone-500' : 'text-stone-100'
                        }`}
                      >
                        {note.title}
                      </h3>

                      {note.content && (
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-stone-300">
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(note.id)}
                    title="Excluir anotação"
                    className="btn-tactical-secondary p-2 text-stone-400 hover:border-rose-500/40 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
