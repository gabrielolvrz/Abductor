import { useEffect, useState, type FormEvent } from 'react'
import {
  Clock,
  Globe,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  HOMOLOGATED_CATEGORIES,
  createNiche,
  listNiches,
  type Niche,
  type SearchCreateRequest,
  type SearchStatusResponse,
} from '../services/api'

interface SearchFormProps {
  onSubmitSearch: (payload: SearchCreateRequest) => void
  onRevalidateUrls?: (searchId: string) => void
  onSelectSavedSearch?: (search: SearchStatusResponse) => void
  savedSearches: SearchStatusResponse[]
  activeSearch: SearchStatusResponse | null
  isRunning: boolean
}

const SEARCH_FORM_DRAFT_KEY = 'abductor_search_form_draft'

interface SearchFormDraft {
  selectedCategory: string
  customCategory: string
  city: string
  neighborhood: string
}

function loadSearchFormDraft(
  activeSearch: SearchStatusResponse | null,
): SearchFormDraft {
  if (activeSearch) {
    return {
      selectedCategory: activeSearch.category,
      customCategory: '',
      city: activeSearch.city,
      neighborhood: activeSearch.neighborhood ?? '',
    }
  }
  try {
    const raw = window.localStorage.getItem(SEARCH_FORM_DRAFT_KEY)
    if (!raw) {
      return {
        selectedCategory: '',
        customCategory: '',
        city: '',
        neighborhood: '',
      }
    }
    const parsed = JSON.parse(raw) as Partial<SearchFormDraft>
    return {
      selectedCategory: parsed.selectedCategory ?? '',
      customCategory: parsed.customCategory ?? '',
      city: parsed.city ?? '',
      neighborhood: parsed.neighborhood ?? '',
    }
  } catch {
    return {
      selectedCategory: '',
      customCategory: '',
      city: '',
      neighborhood: '',
    }
  }
}

export function SearchForm({
  onSubmitSearch,
  onRevalidateUrls,
  onSelectSavedSearch,
  savedSearches,
  activeSearch,
  isRunning,
}: SearchFormProps) {
  const initialDraft = loadSearchFormDraft(activeSearch)
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialDraft.selectedCategory,
  )
  const [customCategory, setCustomCategory] = useState<string>(initialDraft.customCategory)
  const [city, setCity] = useState<string>(initialDraft.city)
  const [neighborhood, setNeighborhood] = useState<string>(initialDraft.neighborhood)
  const [isSavingNiche, setIsSavingNiche] = useState<boolean>(false)

  useEffect(() => {
    let active = true
    listNiches()
      .then((data) => {
        if (active && data.length > 0) {
          setNiches(data)
        }
      })
      .catch(() => {
        // Fallback para HOMOLOGATED_CATEGORIES caso backend esteja indisponível
      })
    return () => {
      active = false
    }
  }, [])

  const categoryOptions =
    niches.length > 0 ? niches.map((n) => n.name) : [...HOMOLOGATED_CATEGORIES]

  // Persiste alterações do formulário no localStorage
  useEffect(() => {
    try {
      const draft: SearchFormDraft = {
        selectedCategory,
        customCategory,
        city,
        neighborhood,
      }
      window.localStorage.setItem(SEARCH_FORM_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
  }, [selectedCategory, customCategory, city, neighborhood])

  const isCustomMode = selectedCategory === '__CUSTOM__'
  const effectiveCategory = isCustomMode ? customCategory.trim() : selectedCategory

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!effectiveCategory || !city.trim() || isRunning) return

    if (isCustomMode && customCategory.trim()) {
      setIsSavingNiche(true)
      try {
        const created = await createNiche(customCategory.trim())
        setNiches((prev) =>
          prev.some((n) => n.id === created.id) ? prev : [...prev, created],
        )
        setSelectedCategory(created.name)
        setCustomCategory('')
      } catch {
        // Segue a busca mesmo se falhar ao persistir o nicho
      } finally {
        setIsSavingNiche(false)
      }
    }

    onSubmitSearch({
      category: effectiveCategory,
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      force_sync: false,
    })
  }

  const handleForceResync = () => {
    if (!activeSearch || isRunning) return
    onSubmitSearch({
      category: activeSearch.category,
      city: activeSearch.city,
      neighborhood: activeSearch.neighborhood,
      force_sync: true,
    })
  }

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return 'Recente'
    try {
      const d = new Date(iso)
      return d.toLocaleString('pt-BR', {
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

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900/95 p-5 shadow-lg">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end"
      >
        {/* Dropdown de Categoria / Nicho Homologado */}
        <div className="md:col-span-3">
          <label
            htmlFor="search-category"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Vertical / Nicho
          </label>
          <select
            id="search-category"
            value={selectedCategory}
            disabled={isRunning}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-sm font-medium text-stone-100 outline-none transition focus:border-amber-600 disabled:opacity-60"
          >
            <option value="" disabled>
              Selecione o nicho / vertical...
            </option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="__CUSTOM__">+ Cadastrar novo nicho...</option>
          </select>
        </div>

        {isCustomMode && (
          <div className="md:col-span-2">
            <label
              htmlFor="custom-category"
              className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-400"
            >
              <Plus className="h-3 w-3" />
              Novo Nicho *
            </label>
            <input
              id="custom-category"
              type="text"
              required
              disabled={isRunning || isSavingNiche}
              placeholder="Ex: Contabilidade"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full rounded-xl border border-amber-600/60 bg-stone-950 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none transition focus:border-amber-500 disabled:opacity-60"
            />
          </div>
        )}

        {/* Input de Cidade */}
        <div className={isCustomMode ? 'md:col-span-2' : 'md:col-span-3'}>
          <label
            htmlFor="search-city"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            <MapPin className="h-3.5 w-3.5 text-amber-500" />
            Cidade *
          </label>
          <input
            id="search-city"
            type="text"
            required
            disabled={isRunning}
            placeholder="Ex: Uberlândia"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none transition focus:border-amber-600 disabled:opacity-60"
          />
        </div>

        {/* Input de Bairro */}
        <div className={isCustomMode ? 'md:col-span-2' : 'md:col-span-3'}>
          <label
            htmlFor="search-neighborhood"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            Bairro / Região <span className="text-stone-500">(opcional)</span>
          </label>
          <input
            id="search-neighborhood"
            type="text"
            disabled={isRunning}
            placeholder="Ex: Centro, Santa Mônica"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none transition focus:border-amber-600 disabled:opacity-60"
          />
        </div>

        {/* Botão de Envio */}
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={isRunning || !effectiveCategory || !city.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-stone-950 shadow-md transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {isRunning ? 'Varrendo Maps...' : 'Puxar Leads / Carregar'}
          </button>
        </div>
      </form>

      {/* Barra inferior: Cache-First Status e Revalidação */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {activeSearch ? (
            <div className="flex flex-wrap items-center gap-2 text-stone-300">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-1 font-mono text-xs tabular-nums text-stone-200">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Sincronizado em{' '}
                <strong className="text-stone-100">
                  {formatTimestamp(activeSearch.last_scraped_at ?? activeSearch.created_at)}
                </strong>{' '}
                ({activeSearch.total_leads} leads)
              </span>
              {activeSearch.cached && (
                <span className="rounded-md border border-emerald-600/35 bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  Cache-First (&lt;100ms)
                </span>
              )}
            </div>
          ) : (
            <span className="text-stone-400">
              Escolha o nicho e a cidade para abrir uma leva salva ou acionar o scraper Go.
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedSearches.length > 0 && onSelectSavedSearch && (
            <select
              aria-label="Histórico de buscas salvas"
              disabled={isRunning}
              value={activeSearch?.search_id ?? ''}
              onChange={(e) => {
                const found = savedSearches.find((s) => s.search_id === e.target.value)
                if (found) {
                  setCity(found.city)
                  setNeighborhood(found.neighborhood)
                  const matched = categoryOptions.find(
                    (c) => c.toLowerCase() === found.category.toLowerCase(),
                  )
                  if (matched) setSelectedCategory(matched)
                  onSelectSavedSearch(found)
                }
              }}
              className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 font-mono text-xs text-stone-200 outline-none focus:border-amber-600 disabled:opacity-50"
            >
              <option value="" disabled>
                Histórico de varreduras ({savedSearches.length})
              </option>
              {savedSearches.map((s) => (
                <option key={s.search_id} value={s.search_id}>
                  {s.category.toUpperCase()} — {s.city}{' '}
                  {s.neighborhood ? `(${s.neighborhood})` : ''} [{s.total_leads}]
                </option>
              ))}
            </select>
          )}

          {activeSearch && (
            <>
              {onRevalidateUrls && (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => onRevalidateUrls(activeSearch.search_id)}
                  title="Checa novamente todas as URLs (ignorando leads com Override Manual)"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 font-semibold text-stone-300 transition hover:border-amber-600/60 hover:text-amber-400 disabled:opacity-50"
                >
                  <Globe className="h-3.5 w-3.5 text-amber-500" />
                  Revalidar Sites
                </button>
              )}

              <button
                type="button"
                disabled={isRunning}
                onClick={handleForceResync}
                title="Roda nova coleta no Google Maps preservando notas, funil e overrides"
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 font-semibold text-stone-300 transition hover:border-emerald-600/60 hover:text-emerald-400 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                Re-escanear Maps
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
