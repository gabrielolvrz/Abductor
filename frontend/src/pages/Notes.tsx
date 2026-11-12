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
          className: 'border-rose-700/50 bg-rose-950/40 text-rose-300',
        }
      case 'LEMBRETE':
        return {
          icon: Bell,
          className: 'border-amber-600/40 bg-amber-600/15 text-amber-300',
        }
      case 'IDEIA':
      default:
        return {
          icon: Lightbulb,
          className: 'border-emerald-600/40 bg-emerald-600/15 text-emerald-300',
        }
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-6 py-6">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-amber-600/50 bg-stone-900 px-4 py-3 text-xs font-semibold text-amber-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Topo */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <NotebookPen className="h-5 w-5 text-amber-500" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-100">
              Backlog Interno & Caderno de Operação (/anotacoes)
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Anote ideias de novos nichos, ajustes nos templates Turnkey, feedbacks de clientes ou
            lembretes de prospecção.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 p-1">
          {(['TODAS', 'IDEIA', 'LEMBRETE', 'BUG'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilterTag(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filterTag === item
                  ? 'bg-amber-600 text-stone-950'
                  : 'text-stone-400 hover:text-stone-100'
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
          className="space-y-4 self-start rounded-2xl border border-stone-800 bg-[#1c1917] p-5 lg:col-span-4"
        >
          <h2 className="font-serif text-lg font-bold text-stone-100">
            Registrar no Backlog
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-300">
              Título / Resumo *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Testar vertical de Fisioterapia em Uberaba"
              className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300">
              Categoria
            </label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as NoteTag)}
              className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-xs font-bold text-stone-100 outline-none focus:border-amber-600"
            >
              <option value="IDEIA">IDEIA (Novo Nicho / Template / Pitch)</option>
              <option value="LEMBRETE">LEMBRETE (Follow-up / Operação)</option>
              <option value="BUG">BUG (Ajuste Técnico)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300">
              Detalhes (opcional)
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contexto adicional, referências ou passos..."
              className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 p-3 text-xs leading-relaxed text-stone-100 placeholder-stone-500 outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-stone-950 transition hover:bg-amber-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Salvar Anotação
          </button>
        </form>

        {/* Lista de Anotações */}
        <section className="space-y-3 lg:col-span-8">
          {!isLoading && filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-[#1c1917]/70 p-12 text-center">
              <p className="font-serif text-lg font-bold text-stone-200">
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
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-all duration-200 ${
                    note.is_done
                      ? 'border-stone-800/60 bg-stone-950/50 opacity-60'
                      : 'border-stone-800 bg-[#1c1917] hover:-translate-y-0.5 hover:border-stone-700'
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
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${badge.className}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {note.tag}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-stone-400">
                          {new Date(note.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <h3
                        className={`mt-1.5 font-serif text-base font-bold ${
                          note.is_done ? 'line-through text-stone-400' : 'text-stone-100'
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
                    className="rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-400 transition hover:border-rose-700/50 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
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
