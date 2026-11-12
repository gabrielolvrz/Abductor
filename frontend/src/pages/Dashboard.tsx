import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowUpDown,
  CheckCircle2,
  DollarSign,
  Filter,
  Flame,
  Kanban,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageCircle,
  Plus,
  Radar,
  Search,
  Sliders,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import type { ActiveRoute } from '../components/Header'
import { JobProgress } from '../components/JobProgress'
import { LeadCard } from '../components/LeadCard'
import { LeadDrawer } from '../components/LeadDrawer'
import { PitchModal } from '../components/PitchModal'
import { SearchForm } from '../components/SearchForm'
import { ExportConfigModal } from '../components/ExportConfigModal'
import { NicheManagerModal } from '../components/NicheManagerModal'
import {
  HOMOLOGATED_CATEGORIES,
  buildQuickPitchMessage,
  cleanNameClientSide,
  createManualLead,
  createOrGetSearch,
  exportLeadSiteConfig,
  getPipelineLeads,
  getSearchLeads,
  getSearchStatus,
  isAdvocaciaLead,
  isPetshopLead,
  listNiches,
  listSearches,
  revalidateSearchUrls,
  updateLeadDetails,
  updateLeadPipeline,
  type Lead,
  type LeadCreateManualRequest,
  type LeadUpdateRequest,
  type Niche,
  type PipelineStatus,
  type SearchCreateRequest,
  type SearchStatusResponse,
} from '../services/api'

type SortField = 'score' | 'reviews_count' | 'rating'
type ViewMode = 'grid' | 'list'

interface DashboardProps {
  showManualLeadModal: boolean
  onCloseManualLeadModal: () => void
  onNavigate: (route: ActiveRoute) => void
}

const PAGE_SIZE = 60
const VIEW_MODE_STORAGE_KEY = 'abductor_view_mode'
const ACTIVE_SEARCH_STORAGE_KEY = 'abductor_last_active_search_id'
const DASHBOARD_FILTERS_STORAGE_KEY = 'abductor_dashboard_filters'
const BASE_TICKET_BRL = 350

interface PersistedDashboardFilters {
  hideContacted: boolean
  onlyMobile: boolean
  onlyNoSiteOrImprovised: boolean
  hideBrokenSite: boolean
  pipelineStatusFilter: 'ALL' | PipelineStatus
  sortBy: SortField
  searchTerm: string
}

function loadPersistedDashboardFilters(): PersistedDashboardFilters {
  const defaults: PersistedDashboardFilters = {
    hideContacted: false,
    onlyMobile: false,
    onlyNoSiteOrImprovised: false,
    hideBrokenSite: false,
    pipelineStatusFilter: 'ALL',
    sortBy: 'score',
    searchTerm: '',
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<PersistedDashboardFilters>
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export function Dashboard({
  showManualLeadModal,
  onCloseManualLeadModal,
  onNavigate,
}: DashboardProps) {
  const initialFilters = loadPersistedDashboardFilters()

  const [savedSearches, setSavedSearches] = useState<SearchStatusResponse[]>([])
  const [activeSearch, setActiveSearch] = useState<SearchStatusResponse | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelineLeads, setPipelineLeads] = useState<Lead[]>([])
  const [pitchLead, setPitchLead] = useState<Lead | null>(null)
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [exportModalLead, setExportModalLead] = useState<Lead | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showSearchForm, setShowSearchForm] = useState<boolean>(true)
  const [niches, setNiches] = useState<Niche[]>([])
  const [showNicheModal, setShowNicheModal] = useState<boolean>(false)

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return saved === 'list' ? 'list' : 'grid'
  })

  // Filtros e Ordenação Client-Side (hidratados do localStorage)
  const [hideContacted, setHideContacted] = useState<boolean>(initialFilters.hideContacted)
  const [onlyMobile, setOnlyMobile] = useState<boolean>(initialFilters.onlyMobile)
  const [onlyNoSiteOrImprovised, setOnlyNoSiteOrImprovised] = useState<boolean>(
    initialFilters.onlyNoSiteOrImprovised,
  )
  const [hideBrokenSite, setHideBrokenSite] = useState<boolean>(initialFilters.hideBrokenSite)
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<'ALL' | PipelineStatus>(
    initialFilters.pipelineStatusFilter,
  )
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.searchTerm)
  const [sortBy, setSortBy] = useState<SortField>(initialFilters.sortBy)
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE)

  // Modal de Cadastro Manual
  const [manualName, setManualName] = useState('')
  const [manualCategory, setManualCategory] = useState<string>(HOMOLOGATED_CATEGORIES[0])
  const [manualCity, setManualCity] = useState('Uberlândia')
  const [manualNeighborhood, setManualNeighborhood] = useState('Centro')
  const [manualPhone, setManualPhone] = useState('')
  const [manualWebsite, setManualWebsite] = useState('')
  const [manualInstagram, setManualInstagram] = useState('')
  const [manualRating, setManualRating] = useState('5.0')
  const [manualReviews, setManualReviews] = useState('20')
  const [manualClaimed, setManualClaimed] = useState(true)
  const [manualNotes, setManualNotes] = useState('')
  const [isCreatingManual, setIsCreatingManual] = useState(false)

  // Persistir filtros da listagem no localStorage
  useEffect(() => {
    try {
      const payload: PersistedDashboardFilters = {
        hideContacted,
        onlyMobile,
        onlyNoSiteOrImprovised,
        hideBrokenSite,
        pipelineStatusFilter,
        sortBy,
        searchTerm,
      }
      window.localStorage.setItem(DASHBOARD_FILTERS_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore
    }
  }, [
    hideContacted,
    onlyMobile,
    onlyNoSiteOrImprovised,
    hideBrokenSite,
    pipelineStatusFilter,
    sortBy,
    searchTerm,
  ])

  // Fechar Modal de Cadastro Manual com tecla Escape
  useEffect(() => {
    if (!showManualLeadModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseManualLeadModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showManualLeadModal, onCloseManualLeadModal])

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 3500)
  }, [])

  const refreshPipelineSnapshot = useCallback(async () => {
    try {
      const pLeads = await getPipelineLeads()
      setPipelineLeads(pLeads)
    } catch {
      // Silencioso
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const [history, pLeads, nichesList] = await Promise.all([
          listSearches(),
          getPipelineLeads(),
          listNiches().catch(() => [] as Niche[]),
        ])
        if (!active) return
        setSavedSearches(history)
        setPipelineLeads(pLeads)
        setNiches(nichesList)

        // Restaura exclusivamente a última busca ativa salva no localStorage.
        // Caso não exista busca salva, mantém o painel em estado limpo/neutro.
        const savedSearchId = window.localStorage.getItem(ACTIVE_SEARCH_STORAGE_KEY)
        if (savedSearchId && history.length > 0) {
          const restored = history.find((s) => s.search_id === savedSearchId)
          if (restored) {
            setActiveSearch({ ...restored, cached: true })
            if (restored.job_status === 'COMPLETED' || restored.job_status === 'PARTIAL') {
              const fetchedLeads = await getSearchLeads(restored.search_id)
              if (active) setLeads(fetchedLeads)
            }
          }
        }
      } catch {
        // Silencioso caso backend ainda esteja subindo
      }
    }
    void init()
    return () => {
      active = false
    }
  }, [])

  // Polling a cada 3 segundos enquanto job_status === 'RUNNING' ou 'PENDING'
  useEffect(() => {
    if (!activeSearch) return
    if (activeSearch.job_status !== 'RUNNING' && activeSearch.job_status !== 'PENDING') {
      return
    }

    const interval = window.setInterval(async () => {
      try {
        const statusData = await getSearchStatus(activeSearch.search_id)
        setActiveSearch((prev) => ({
          ...statusData,
          cached: prev?.cached ?? false,
        }))

        if (statusData.job_status === 'COMPLETED' || statusData.job_status === 'PARTIAL') {
          const fetchedLeads = await getSearchLeads(statusData.search_id)
          setLeads(fetchedLeads)
          const updatedHistory = await listSearches()
          setSavedSearches(updatedHistory)
          showToast(
            `Leva pronta: ${fetchedLeads.length} contatos qualificados na bancada.`,
          )
        }
      } catch {
        // Ignora falha transitória de rede durante polling
      }
    }, 3000)

    return () => window.clearInterval(interval)
  }, [activeSearch, showToast])

  const handleSearchSubmit = async (payload: SearchCreateRequest) => {
    setVisibleCount(PAGE_SIZE)
    try {
      const { status, data } = await createOrGetSearch(payload)
      setActiveSearch(data)
      try {
        window.localStorage.setItem(ACTIVE_SEARCH_STORAGE_KEY, data.search_id)
      } catch {
        // ignore
      }

      if (status === 200 && data.leads) {
        setLeads(data.leads)
        showToast(`Cache local: ${data.leads.length} contatos abertos em <100ms.`)
      } else {
        setLeads([])
        showToast('Scraper Go acionado em background.')
      }

      const updatedHistory = await listSearches()
      setSavedSearches(updatedHistory)
    } catch {
      showToast('Sem resposta da API na porta 8000. Confira o terminal do uvicorn.')
    }
  }

  const handleSelectSavedSearch = async (search: SearchStatusResponse) => {
    setVisibleCount(PAGE_SIZE)
    setActiveSearch({ ...search, cached: true })
    try {
      window.localStorage.setItem(ACTIVE_SEARCH_STORAGE_KEY, search.search_id)
    } catch {
      // ignore
    }
    if (search.job_status === 'COMPLETED' || search.job_status === 'PARTIAL') {
      const fetchedLeads = await getSearchLeads(search.search_id)
      setLeads(fetchedLeads)
    } else {
      setLeads([])
    }
  }

  const handleRevalidateUrls = async (searchId: string) => {
    try {
      const statusData = await revalidateSearchUrls(searchId)
      setActiveSearch(statusData)
      showToast('Revalidando URLs em lote (overrides manuais serão preservados).')
    } catch {
      showToast('Não foi possível iniciar a revalidação de URLs.')
    }
  }

  const handleUpdatePipeline = async (leadId: string, status: PipelineStatus) => {
    const updated = await updateLeadPipeline(leadId, status)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)))
    setDrawerLead((prev) => (prev?.id === leadId ? updated : prev))
    void refreshPipelineSnapshot()
    showToast(`Movido para ${status}.`)
  }

  const handleUpdateDetails = async (leadId: string, payload: LeadUpdateRequest) => {
    const updated = await updateLeadDetails(leadId, payload)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)))
    setDrawerLead((prev) => (prev?.id === leadId ? updated : prev))
    void refreshPipelineSnapshot()
    showToast(`Contato atualizado! Score recalculado: ${updated.score} pts.`)
  }

  const handleExportSiteConfig = async (lead: Lead) => {
    if (isAdvocaciaLead(lead) || isPetshopLead(lead)) {
      setExportModalLead(lead)
    } else {
      // Exportação turnkey padrão para outros nichos
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

  const handleCreateManualLeadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!manualName.trim() || !manualCity.trim()) return
    setIsCreatingManual(true)
    try {
      const req: LeadCreateManualRequest = {
        name: manualName.trim(),
        category: manualCategory,
        city: manualCity.trim(),
        neighborhood: manualNeighborhood.trim(),
        phone_raw: manualPhone.trim() || undefined,
        website_url: manualWebsite.trim() || undefined,
        instagram_url: manualInstagram.trim() || undefined,
        rating: Number.parseFloat(manualRating) || 0,
        reviews_count: Number.parseInt(manualReviews, 10) || 0,
        is_claimed: manualClaimed,
        notes: manualNotes.trim() || undefined,
        search_id: activeSearch?.search_id ?? null,
      }
      const created = await createManualLead(req)
      setLeads((prev) => [created, ...prev])
      setManualName('')
      setManualPhone('')
      setManualWebsite('')
      setManualInstagram('')
      setManualNotes('')
      onCloseManualLeadModal()
      showToast(`Contato "${created.name}" adicionado com Score ${created.score}!`)
    } finally {
      setIsCreatingManual(false)
    }
  }

  // Filtragem e Ordenação Client-Side Instantânea
  const filteredAndSortedLeads = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()

    const filtered = leads.filter((lead) => {
      if (hideContacted && lead.pipeline_status !== 'NOVO') {
        return false
      }
      if (pipelineStatusFilter !== 'ALL' && lead.pipeline_status !== pipelineStatusFilter) {
        return false
      }
      if (onlyMobile && lead.phone_type !== 'MOBILE') {
        return false
      }
      if (
        onlyNoSiteOrImprovised &&
        lead.website_status !== 'SEM_SITE' &&
        lead.website_status !== 'IMPROVISADO'
      ) {
        return false
      }
      if (hideBrokenSite && lead.website_status === 'QUEBRADO') {
        return false
      }
      if (
        normalizedQuery &&
        !lead.name.toLowerCase().includes(normalizedQuery) &&
        !(lead.address ?? '').toLowerCase().includes(normalizedQuery)
      ) {
        return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'score') {
        if (b.score !== a.score) return b.score - a.score
        return b.reviews_count - a.reviews_count
      }
      if (sortBy === 'reviews_count') {
        if (b.reviews_count !== a.reviews_count) return b.reviews_count - a.reviews_count
        return b.score - a.score
      }
      if (b.rating !== a.rating) return b.rating - a.rating
      return b.reviews_count - a.reviews_count
    })
  }, [
    leads,
    hideContacted,
    pipelineStatusFilter,
    onlyMobile,
    onlyNoSiteOrImprovised,
    hideBrokenSite,
    searchTerm,
    sortBy,
  ])

  const visibleLeads = useMemo(
    () => filteredAndSortedLeads.slice(0, visibleCount),
    [filteredAndSortedLeads, visibleCount],
  )

  useEffect(() => {
    const onPipelineSync = () => {
      void refreshPipelineSnapshot()
    }
    window.addEventListener('abductor:pipeline-updated', onPipelineSync)
    window.addEventListener('focus', onPipelineSync)
    return () => {
      window.removeEventListener('abductor:pipeline-updated', onPipelineSync)
      window.removeEventListener('focus', onPipelineSync)
    }
  }, [refreshPipelineSnapshot])

  // 4 Métricas de Topo (Combinando oportunidades na bancada + funil global com deal_value real)
  const topMetrics = useMemo(() => {
    const opportunitiesCount = leads.filter((l) => l.score >= 50).length || leads.length
    const inNegotiationLeads = pipelineLeads.filter(
      (l) => l.pipeline_status === 'RESPONDEU' || l.pipeline_status === 'NEGOCIANDO',
    )
    const inNegotiationCount = inNegotiationLeads.length
    const negotiationForecastBrl = inNegotiationLeads.reduce(
      (sum, l) =>
        sum + (typeof l.deal_value === 'number' && l.deal_value > 0 ? l.deal_value : BASE_TICKET_BRL),
      0,
    )

    const closedLeads = pipelineLeads.filter((l) => l.pipeline_status === 'FECHADO')
    const closedCount = closedLeads.length
    const closedRevenueBrl = closedLeads.reduce(
      (sum, l) =>
        sum + (typeof l.deal_value === 'number' && l.deal_value > 0 ? l.deal_value : BASE_TICKET_BRL),
      0,
    )

    const totalContacted = pipelineLeads.length
    const totalReplied = pipelineLeads.filter(
      (l) =>
        l.pipeline_status === 'RESPONDEU' ||
        l.pipeline_status === 'NEGOCIANDO' ||
        l.pipeline_status === 'FECHADO',
    ).length
    const responseRate =
      totalContacted > 0 ? Math.round((totalReplied / totalContacted) * 100) : 0

    return {
      opportunitiesCount,
      inNegotiationCount,
      negotiationForecastBrl,
      closedCount,
      closedRevenueBrl,
      responseRate,
      totalContacted,
    }
  }, [leads, pipelineLeads])

  const recentThreeSearches = useMemo(
    () => savedSearches.slice(0, 3),
    [savedSearches],
  )

  const isRunning =
    activeSearch?.job_status === 'RUNNING' || activeSearch?.job_status === 'PENDING'

  return (
    <main className="mx-auto max-w-[1920px] space-y-6 px-6 py-6">
      {/* Toast Flutuante */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-amber-600/50 bg-stone-900 px-4 py-3 text-xs font-semibold text-amber-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* 4 Métricas de Topo */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-[#1c1917] px-5 py-4 shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total de Oportunidades
            </span>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-stone-100">
              {topMetrics.opportunitiesCount}
            </p>
            <span className="text-[11px] text-stone-400">
              {leads.length} fichas carregadas na leva atual
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-600/30 bg-amber-600/10 text-amber-500">
            <Flame className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-[#1c1917] px-5 py-4 shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Em Negociação
            </span>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-amber-400">
              {topMetrics.inNegotiationCount}
            </p>
            <span className="font-mono text-[11px] tabular-nums text-stone-400">
              Previsão: R$ {topMetrics.negotiationForecastBrl.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 text-amber-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-emerald-600/35 bg-[#1c1917] px-5 py-4 shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Faturamento Fechado / Previsão
            </span>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-emerald-400">
              R$ {topMetrics.closedRevenueBrl.toLocaleString('pt-BR')}
            </p>
            <span className="font-mono text-[11px] tabular-nums text-stone-400">
              {topMetrics.closedCount} venda(s) • Sincronizado com o Kanban
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-600/40 bg-emerald-600/15 text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-[#1c1917] px-5 py-4 shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Taxa de Resposta
            </span>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-stone-100">
              {topMetrics.responseRate}%
            </p>
            <span className="font-mono text-[11px] tabular-nums text-stone-400">
              {topMetrics.totalContacted} contato(s) acionados no funil
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Barra de Ação Rápida: Nova Varredura + Atalho Kanban + Últimas 3 Buscas Salvas */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-[#1c1917] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSearchForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-500"
          >
            <Radar className="h-4 w-4" />
            {showSearchForm ? 'Recolher Painel de Busca' : 'Nova Varredura'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/pipeline')}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-4 py-2 text-xs font-bold text-stone-200 transition hover:border-amber-600/60 hover:text-amber-400"
          >
            <Kanban className="h-4 w-4 text-amber-500" />
            Abrir Kanban ({pipelineLeads.length})
          </button>

          <button
            type="button"
            onClick={() => setShowNicheModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-4 py-2 text-xs font-bold text-stone-200 transition hover:border-amber-600/60 hover:text-amber-400"
          >
            <Layers className="h-4 w-4 text-amber-500" />
            Nichos ({niches.length || HOMOLOGATED_CATEGORIES.length})
          </button>
        </div>

        {/* Últimas 3 buscas salvas como pills rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Últimas 3 levas:
          </span>
          {recentThreeSearches.length === 0 ? (
            <span className="text-xs text-stone-500">Nenhuma leva salva ainda</span>
          ) : (
            recentThreeSearches.map((s) => {
              const isSelected = activeSearch?.search_id === s.search_id
              return (
                <button
                  key={s.search_id}
                  type="button"
                  onClick={() => void handleSelectSavedSearch(s)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold tabular-nums transition ${
                    isSelected
                      ? 'border-amber-600 bg-amber-600/15 text-amber-300'
                      : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                  }`}
                >
                  <span>
                    {s.category} • {s.city}
                  </span>
                  <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300">
                    {s.total_leads}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </section>

      {/* Painel de Busca e Controle de Cache-First */}
      {showSearchForm && (
        <SearchForm
          key={`${activeSearch?.search_id ?? 'neutral'}-${niches.length}`}
          onSubmitSearch={(payload) => void handleSearchSubmit(payload)}
          onRevalidateUrls={(id) => void handleRevalidateUrls(id)}
          onSelectSavedSearch={(s) => void handleSelectSavedSearch(s)}
          savedSearches={savedSearches}
          activeSearch={activeSearch}
          isRunning={isRunning}
        />
      )}

      {/* Stepper de Progresso */}
      {activeSearch &&
        (activeSearch.job_status === 'RUNNING' ||
          activeSearch.job_status === 'PENDING' ||
          activeSearch.job_status === 'FAILED') && (
          <JobProgress
            jobStatus={activeSearch.job_status}
            progressPhase={activeSearch.progress_phase}
            initialElapsedSeconds={activeSearch.elapsed_seconds}
            message={activeSearch.message}
          />
        )}

      {/* Barra de Filtros + Dual View Toggle ([ Modo Grade ] | [ Modo Lista ]) */}
      {!isRunning && leads.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400">
              <Filter className="h-3.5 w-3.5 text-amber-500" />
              Refinar Bancada:
            </span>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-200 select-none">
              <input
                type="checkbox"
                checked={hideContacted}
                onChange={(e) => setHideContacted(e.target.checked)}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-600"
              />
              Ocultar já acionados
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-200 select-none">
              <input
                type="checkbox"
                checked={onlyMobile}
                onChange={(e) => setOnlyMobile(e.target.checked)}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-600"
              />
              Só WhatsApp Celular
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-200 select-none">
              <input
                type="checkbox"
                checked={onlyNoSiteOrImprovised}
                onChange={(e) => setOnlyNoSiteOrImprovised(e.target.checked)}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-600"
              />
              Só Sem Site / Linktree
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-200 select-none">
              <input
                type="checkbox"
                checked={hideBrokenSite}
                onChange={(e) => setHideBrokenSite(e.target.checked)}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-600"
              />
              Ocultar Fora do Ar
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro por Status no Funil */}
            <select
              aria-label="Filtrar por status no funil"
              value={pipelineStatusFilter}
              onChange={(e) =>
                setPipelineStatusFilter(e.target.value as 'ALL' | PipelineStatus)
              }
              className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-semibold text-stone-100 outline-none focus:border-amber-600"
            >
              <option value="ALL">Todos os Status</option>
              <option value="NOVO">Status: NOVO</option>
              <option value="CONTATADO">Status: CONTATADO</option>
              <option value="RESPONDEU">Status: RESPONDEU</option>
              <option value="NEGOCIANDO">Status: NEGOCIANDO</option>
              <option value="FECHADO">Status: FECHADO</option>
              <option value="RECUSADO">Status: RECUSADO</option>
            </select>

            {/* Busca textual */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome ou rua..."
                className="rounded-xl border border-stone-700 bg-stone-950 py-1.5 pl-8 pr-3 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-600"
              />
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
              <select
                aria-label="Ordenar contatos"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-semibold text-stone-100 outline-none focus:border-amber-600"
              >
                <option value="score">Maior Score</option>
                <option value="reviews_count">Mais Avaliações</option>
                <option value="rating">Maior Nota</option>
              </select>
            </div>

            {/* Dual View Toggle: [ Modo Grade ] | [ Modo Lista ] */}
            <div className="flex items-center rounded-xl border border-stone-700 bg-stone-950 p-0.5">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === 'grid'
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Modo Grade
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === 'list'
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Modo Lista
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Listagem de Resultados (Grade ou Lista) */}
      {!isRunning && (
        <section>
          {filteredAndSortedLeads.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-[#1c1917]/70 p-12 text-center">
              <p className="font-serif text-lg font-bold text-stone-200">
                {leads.length === 0
                  ? 'Sua bancada está limpa. Puxe uma nova leva de contatos ou confira o Kanban.'
                  : 'Nenhum contato bateu com os filtros marcados acima.'}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {leads.length === 0
                  ? 'Selecione um nicho acima ou clique em uma das últimas varreduras salvas.'
                  : 'Desmarque um dos filtros rápidos para voltar a ver toda a leva.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-stone-400">
                <span>
                  Mostrando{' '}
                  <strong className="font-mono tabular-nums text-stone-100">
                    {visibleLeads.length}
                  </strong>{' '}
                  de{' '}
                  <strong className="font-mono tabular-nums text-stone-100">
                    {filteredAndSortedLeads.length}
                  </strong>{' '}
                  contatos na bancada
                </span>
                <span className="text-[11px] text-stone-400">
                  Dica: clique no nome ou em <strong>Override</strong> para abrir a gaveta lateral
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visibleLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onUpdatePipeline={handleUpdatePipeline}
                      onUpdateDetails={handleUpdateDetails}
                      onOpenPitchModal={(l) => setPitchLead(l)}
                      onExportSiteConfig={handleExportSiteConfig}
                      onOpenDrawer={(l) => setDrawerLead(l)}
                    />
                  ))}
                </div>
              ) : (
                /* Modo Lista (Tabela Densa e Escaneável) */
                <div className="overflow-x-auto rounded-2xl border border-stone-800 bg-[#1c1917] shadow-lg">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-800 bg-stone-950/80 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Estabelecimento</th>
                        <th className="px-4 py-3">Nicho / Cidade</th>
                        <th className="px-4 py-3">Reputação</th>
                        <th className="px-4 py-3">Diagnóstico Web</th>
                        <th className="px-4 py-3">Telefone</th>
                        <th className="px-4 py-3">Funil</th>
                        <th className="px-4 py-3 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/80">
                      {visibleLeads.map((lead) => {
                        const isOptedOut = lead.pipeline_status === 'RECUSADO'
                        const quickMsg = buildQuickPitchMessage(lead)
                        const waHref = lead.phone_sanitized
                          ? `https://wa.me/55${lead.phone_sanitized}?text=${encodeURIComponent(quickMsg)}`
                          : null

                        return (
                          <tr
                            key={lead.id}
                            className={`transition hover:bg-stone-950/60 ${
                              isOptedOut ? 'opacity-55' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex min-w-[42px] justify-center rounded-lg border px-2 py-1 font-mono text-xs font-black tabular-nums ${
                                  lead.score >= 80
                                    ? 'border-emerald-500 bg-emerald-600 text-stone-950'
                                    : lead.score >= 50
                                      ? 'border-amber-500 bg-amber-600 text-stone-950'
                                      : 'border-stone-700 bg-stone-800 text-stone-300'
                                }`}
                              >
                                {lead.score}
                              </span>
                            </td>

                            <td className="max-w-[260px] px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setDrawerLead(lead)}
                                className="flex items-center gap-1.5 text-left font-serif text-sm font-bold text-stone-100 hover:text-amber-400"
                              >
                                <span className="truncate">{lead.name}</span>
                                {lead.is_manually_edited && (
                                  <Lock className="h-3 w-3 shrink-0 text-amber-500" />
                                )}
                              </button>
                              {lead.notes && (
                                <p className="mt-0.5 truncate text-[11px] italic text-stone-400">
                                  “{lead.notes}”
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-3 text-stone-300">
                              <div className="font-semibold">{lead.category ?? '—'}</div>
                              <div className="text-[11px] text-stone-400">
                                {lead.city} {lead.neighborhood ? `• ${lead.neighborhood}` : ''}
                              </div>
                            </td>

                            <td className="px-4 py-3 font-mono tabular-nums text-amber-400">
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {lead.rating.toFixed(1)}
                                <span className="text-stone-400">({lead.reviews_count})</span>
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                  lead.website_status === 'IMPROVISADO'
                                    ? 'border-amber-600/40 bg-amber-600/15 text-amber-300'
                                    : lead.website_status === 'QUEBRADO'
                                      ? 'border-rose-700/50 bg-rose-950/40 text-rose-300'
                                      : lead.website_status === 'SEM_SITE'
                                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                                        : 'border-stone-700 bg-stone-800 text-stone-400'
                                }`}
                              >
                                {lead.website_status}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono tabular-nums text-stone-200">
                              {lead.phone_raw || 'Sem telefone'}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                aria-label={`Status de ${lead.name}`}
                                value={lead.pipeline_status}
                                onChange={(e) =>
                                  void handleUpdatePipeline(
                                    lead.id,
                                    e.target.value as PipelineStatus,
                                  )
                                }
                                className="rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] font-bold text-stone-200 outline-none focus:border-amber-600"
                              >
                                <option value="NOVO">NOVO</option>
                                <option value="CONTATADO">CONTATADO</option>
                                <option value="RESPONDEU">RESPONDEU</option>
                                <option value="NEGOCIANDO">NEGOCIANDO</option>
                                <option value="FECHADO">FECHADO</option>
                                <option value="RECUSADO">RECUSADO</option>
                              </select>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {waHref && !isOptedOut && (
                                  <a
                                    href={waHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                      if (lead.pipeline_status === 'NOVO') {
                                        void handleUpdatePipeline(lead.id, 'CONTATADO')
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-stone-950 transition hover:bg-emerald-500"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 fill-stone-950" />
                                    WhatsApp
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDrawerLead(lead)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-[11px] font-semibold text-stone-300 transition hover:border-amber-600/60 hover:text-amber-400"
                                >
                                  <Sliders className="h-3.5 w-3.5 text-amber-500" />
                                  Override
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {visibleCount < filteredAndSortedLeads.length && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="rounded-xl border border-stone-700 bg-stone-900 px-6 py-2.5 text-xs font-bold text-stone-200 transition hover:border-amber-600 hover:text-stone-100"
                  >
                    Mostrar mais contatos ({filteredAndSortedLeads.length - visibleCount}{' '}
                    restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Gaveta Lateral de Foco & Override Manual */}
      <LeadDrawer
        lead={drawerLead}
        onClose={() => setDrawerLead(null)}
        onUpdateDetails={handleUpdateDetails}
        onUpdatePipeline={handleUpdatePipeline}
        onOpenPitchModal={(l) => setPitchLead(l)}
        onExportSiteConfig={handleExportSiteConfig}
      />

      {/* Modal de Script de Abordagem */}
      <PitchModal
        lead={pitchLead}
        onClose={() => setPitchLead(null)}
        onMarkContacted={handleUpdatePipeline}
      />

      {/* Modal Inteligente de Exportação site.config.json */}
      <ExportConfigModal
        lead={exportModalLead}
        onClose={() => setExportModalLead(null)}
        onSuccess={(name) => showToast(`site.config.json gerado para "${name}"!`)}
      />

      {/* Modal de Cadastro Manual Avulso */}
      {showManualLeadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-[#1c1917] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h2 className="font-serif text-lg font-bold text-stone-100">
                Adicionar Contato Avulso na Bancada
              </h2>
              <button
                type="button"
                onClick={onCloseManualLeadModal}
                className="rounded-lg p-1.5 text-stone-400 hover:text-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleCreateManualLeadSubmit(e)}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-stone-300">
                  Nome do Estabelecimento *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: Dr. Carlos Almeida Advocacia"
                  className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Categoria *
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                  >
                    {HOMOLOGATED_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Telefone (DDD + Número)
                  </label>
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="(34) 99876-5432"
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={manualNeighborhood}
                    onChange={(e) => setManualNeighborhood(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Website / Linktree URL
                  </label>
                  <input
                    type="text"
                    value={manualWebsite}
                    onChange={(e) => setManualWebsite(e.target.value)}
                    placeholder="https://linktr.ee/..."
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    value={manualInstagram}
                    onChange={(e) => setManualInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Nota (0..5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={manualRating}
                    onChange={(e) => setManualRating(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-xs tabular-nums text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300">
                    Nº Avaliações
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualReviews}
                    onChange={(e) => setManualReviews(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-xs tabular-nums text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-200">
                    <input
                      type="checkbox"
                      checked={manualClaimed}
                      onChange={(e) => setManualClaimed(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-600"
                    />
                    Verificado
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300">
                  Anotações Comerciais
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-stone-800 pt-3">
                <button
                  type="button"
                  onClick={onCloseManualLeadModal}
                  className="rounded-xl border border-stone-700 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingManual}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {isCreatingManual ? 'Calculando Score...' : 'Cadastrar & Qualificar'}
                </button>
              </div>
            </form>
          </div>
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
