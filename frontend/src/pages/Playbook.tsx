import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  BookOpen,
  Check,
  CheckCircle2,
  CheckSquare,
  Copy,
  DollarSign,
  Edit3,
  Layers,
  MessageSquarePlus,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  Rocket,
  Save,
  ShieldAlert,
  ShieldCheck,
  Terminal,
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

interface ChecklistItem {
  id: string
  category: 'whatsapp' | 'reuniao' | 'entrega'
  step: string
  detail: string
}

interface PricingPlanItem {
  id: string
  title: string
  priceLabel: string
  deliverables: string
  accent: 'emerald' | 'amber' | 'stone'
}

const DEFAULT_PRICING_PLANS: PricingPlanItem[] = [
  {
    id: 'plan-base',
    title: '1. Base Turnkey Institucional',
    priceLabel: 'R$ 350',
    deliverables:
      'Site Vitrine One-Page perene + Blindagem LGPD nativa inclusa + botão WhatsApp direto. Entrega em 15 minutos via site.config.json.',
    accent: 'emerald',
  },
  {
    id: 'plan-brand',
    title: '2. Customização de Marca',
    priceLabel: '+R$ 150 (R$ 500)',
    deliverables:
      'Ajuste fino de paleta de cores do escritório/clínica, tratamento de fotos autorais e copywriting sob medida das especialidades.',
    accent: 'amber',
  },
  {
    id: 'plan-gmb',
    title: '3. Upsell: Otimização GMB',
    priceLabel: '+R$ 150',
    deliverables:
      'Conexão da nova URL oficial na ficha do Google Maps, revisão de categorias e SEO local.',
    accent: 'stone',
  },
  {
    id: 'plan-ads',
    title: '4. Upsell: Setup Google Ads Local',
    priceLabel: '+R$ 250',
    deliverables:
      'Configuração inicial de campanha de pesquisa local apontando para a nova One-Page.',
    accent: 'stone',
  },
]

const OPERATIONAL_CHECKLISTS: ChecklistItem[] = [
  {
    id: 'wa-1',
    category: 'whatsapp',
    step: '1. Conferir se a ficha não tem site próprio escondido',
    detail:
      'Abra o link cadastrado ou rode o Dork do Instagram. Se for Linktree/Bio ou quebrado, o gancho está validado.',
  },
  {
    id: 'wa-2',
    category: 'whatsapp',
    step: '2. Exportar site.config.json e subir prévia antes do 1º toque',
    detail:
      'Nunca mande mensagem oferecendo "fazer um orçamento". Tenha o link da demonstração pronto para colar em 10 segundos.',
  },
  {
    id: 'wa-3',
    category: 'whatsapp',
    step: '3. Primeiro toque sempre em texto enxuto (sem áudio frio)',
    detail:
      'Cite o número real de avaliações do Google Maps e pergunte se pode enviar a prévia mobile de 1 minuto.',
  },
  {
    id: 'meet-1',
    category: 'reuniao',
    step: '1. Abrir a prévia pelo celular do próprio cliente',
    detail:
      'Peça para ele abrir o link no WhatsApp dele. A velocidade de carregamento instantânea vende sozinha.',
  },
  {
    id: 'meet-2',
    category: 'reuniao',
    step: '2. Demonstrar o aviso LGPD e a página de Privacidade nativa',
    detail:
      'Mostre que a blindagem LGPD já faz parte da estrutura base de R$ 350 sem custo extra nem mensalidade.',
  },
  {
    id: 'meet-3',
    category: 'reuniao',
    step: '3. Ancorar R$ 350 Base vs. R$ 500 com Customização de Marca',
    detail:
      'Ofereça o pacote Turnkey imediato por R$ 350 ou +R$ 150 para personalização fina de paleta, fotos e copy (Total R$ 500).',
  },
  {
    id: 'del-1',
    category: 'entrega',
    step: '1. Baixar site.config.json no card ou gaveta do Lead (30s)',
    detail:
      'O JSON já sai com nome limpo em Title Case (sem LTDA/ME), WhatsApp com prefixo 55 e aviso de privacidade LGPD nativo.',
  },
  {
    id: 'del-2',
    category: 'entrega',
    step: '2. Duplicar templates/vercel-{nicho}/base para clientes/<nome>/',
    detail:
      'Copie a pasta base/ para clientes/<nome_do_lead>, cole o site.config.json gerado e revise os dados do negócio.',
  },
  {
    id: 'del-3',
    category: 'entrega',
    step: '3. Publicar via Vercel CLI e testar clique no CTA do WhatsApp',
    detail:
      'Rode `npx vercel --prod --yes` na pasta da instância e clique no botão flutuante para confirmar o redirecionamento wa.me/55.',
  },
]

const FALLBACK_OBJECTIONS: PitchScript[] = [
  {
    id: 'fallback-obj-instagram',
    category: 'Geral',
    script_type: 'OBJECTION',
    website_condition: 'GERAL',
    title: '“Já tenho Instagram / Linktree”',
    situation: 'Cliente acha que perfil social ou agregador de links substitui sede própria.',
    message_template:
      'Perfeito, o Instagram é ótimo para relacionamento! A questão é quem pesquisa no Google procurando especialista na sua cidade: quando o cliente clica na sua ficha e cai num Linktree ou precisa logar no Instagram, parte dessas pessoas desiste no caminho. O Site Vitrine One-Page funciona como sua sede própria no Google — carrega em 1 segundo, já vem com adequação LGPD nativa e joga o cliente filtrado direto no seu WhatsApp. Posso te mandar o link da prévia que montei para você testar no celular?',
    upsell_focus: 'NONE',
    created_at: '',
  },
  {
    id: 'fallback-obj-caro',
    category: 'Geral',
    script_type: 'OBJECTION',
    website_condition: 'GERAL',
    title: '“Tá caro / Não está no orçamento”',
    situation: 'Cliente traumatizado com agências que cobram R$ 2.500 + mensalidade eterna.',
    message_template:
      'Compreendo totalmente. Inclusive criei esse formato justamente para eliminar custos fixos de agência: não tem mensalidade nem taxa de manutenção. O pacote Turnkey completo (já com aviso e Política de Privacidade LGPD inclusos) é pagamento único de R$ 350 (ou R$ 500 se quiser customização exclusiva de cores e fotos), e podemos dividir em 2x no Pix: metade hoje na aprovação da prévia e metade quando já estiver no ar no seu domínio.',
    upsell_focus: 'NONE',
    created_at: '',
  },
  {
    id: 'fallback-obj-socio',
    category: 'Geral',
    script_type: 'OBJECTION',
    website_condition: 'GERAL',
    title: '“Preciso falar com meu sócio / secretária”',
    situation: 'Filtro de recepção ou sociedade pedindo tempo ou apresentação por e-mail.',
    message_template:
      'Combinado! Para facilitar a avaliação sem tomar tempo com PDF longo, eu já deixei uma demonstração funcional pronta no ar com os dados públicos de vocês. Vou te mandar o link aqui mesmo em 3 linhas: basta encaminhar no WhatsApp do seu sócio(a), abre em 3 segundos no celular.',
    upsell_focus: 'NONE',
    created_at: '',
  },
  {
    id: 'fallback-obj-oab',
    category: 'Advogado',
    script_type: 'OBJECTION',
    website_condition: 'GERAL',
    title: '“Não posso fazer propaganda (Provimento OAB)”',
    situation: 'Advogado receoso com as regras de publicidade do Provimento 205/2021 da OAB.',
    message_template:
      'Exatamente por isso nossa estrutura para Advocacia segue 100% o Provimento 205/2021 da OAB: zero promessa de resultado, zero mercantilização e foco estritamente informativo e institucional (áreas de atuação, formação, endereço e canal de atendimento), além de já vir com a blindagem LGPD nativa. É uma carta de apresentação sóbria para quem já procura seu nome no Google.',
    upsell_focus: 'NONE',
    created_at: '',
  },
  {
    id: 'fallback-obj-pet',
    category: 'Pet Shop & Veterinária',
    script_type: 'OBJECTION',
    website_condition: 'GERAL',
    title: '“Os tutores já agendam direto pelo WhatsApp”',
    situation: 'Dono de Pet Shop ou Clínica Vet que acha que só ter telefone na ficha basta.',
    message_template:
      'E é justamente no WhatsApp que o fechamento acontece! O ponto é que quando um tutor novo pesquisa "banho e tosa" ou "veterinário" no Google, ele compara 3 fichas em 30 segundos. Ter uma vitrine própria mostrando seus 4 pilares (Estética segura, Clínica/Vacinas, Boutique e Táxi Dog) + avaliações reais 5 estrelas passa uma confiança imediata que faz o tutor clicar no SEU WhatsApp em vez do concorrente.',
    upsell_focus: 'NONE',
    created_at: '',
  },
]

const CHECKLIST_STORAGE_KEY = 'abductor_playbook_checks_v2'
const PRICING_STORAGE_KEY = 'abductor_official_pricing_plans_v1'

type NicheFilterKey = 'TODOS' | 'ADVOCACIA' | 'PETSHOP' | string

function loadPersistedPricingPlans(): PricingPlanItem[] {
  try {
    const raw = window.localStorage.getItem(PRICING_STORAGE_KEY)
    if (!raw) return DEFAULT_PRICING_PLANS
    const parsed = JSON.parse(raw) as PricingPlanItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRICING_PLANS
    return parsed
  } catch {
    return DEFAULT_PRICING_PLANS
  }
}

function matchesNicheFilter(category: string, filterKey: NicheFilterKey): boolean {
  const cat = (category || '').toLowerCase().trim()
  if (cat === 'geral') return true
  if (filterKey === 'TODOS') return true
  if (filterKey === 'ADVOCACIA') {
    return (
      cat.includes('advoga') ||
      cat.includes('jurid') ||
      cat.includes('direito') ||
      cat.includes('oab')
    )
  }
  if (filterKey === 'PETSHOP') {
    return (
      cat.includes('pet') ||
      cat.includes('veterin') ||
      cat.includes('banho') ||
      cat.includes('tosa')
    )
  }
  return cat === filterKey.toLowerCase().trim()
}

function resolveTemplateNicheSlug(filterKey: NicheFilterKey, niches: Niche[]): string {
  if (filterKey === 'PETSHOP') return 'petshop'
  if (filterKey === 'ADVOCACIA' || filterKey === 'TODOS') return 'advocacia'

  const lower = filterKey.toLowerCase()
  if (lower.includes('pet') || lower.includes('veterin') || lower.includes('banho')) {
    return 'petshop'
  }
  if (lower.includes('advoga') || lower.includes('jurid')) {
    return 'advocacia'
  }

  const matchedNiche = niches.find((n) => n.name.toLowerCase() === lower)
  if (matchedNiche) return matchedNiche.slug

  return lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function Playbook() {
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedFilter, setSelectedFilter] = useState<NicheFilterKey>('TODOS')
  const [scripts, setScripts] = useState<PitchScript[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showNicheModal, setShowNicheModal] = useState<boolean>(false)

  // Modal de Criação / Edição de Roteiro ou Objeção
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false)
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null)
  const [formScriptType, setFormScriptType] = useState<ScriptType>('PITCH')
  const [formCategory, setFormCategory] = useState<string>('Advogado')
  const [formTitle, setFormTitle] = useState<string>('')
  const [formSituation, setFormSituation] = useState<string>('')
  const [formCondition, setFormCondition] =
    useState<ScriptWebsiteCondition>('IMPROVISADO')
  const [formUpsell, setFormUpsell] = useState<UpsellFocus>('GMB')
  const [formMessage, setFormMessage] = useState<string>('')
  const [isSavingScript, setIsSavingScript] = useState<boolean>(false)

  // Tabela Oficial de Preços Editável (localStorage)
  const [pricingPlans, setPricingPlans] = useState<PricingPlanItem[]>(
    loadPersistedPricingPlans,
  )
  const [isEditingPricing, setIsEditingPricing] = useState<boolean>(false)
  const [draftPricingPlans, setDraftPricingPlans] =
    useState<PricingPlanItem[]>(pricingPlans)

  // Checklists Operacionais
  const [activeChecklistTab, setActiveChecklistTab] = useState<
    'whatsapp' | 'reuniao' | 'entrega'
  >('whatsapp')
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    } catch {
      return {}
    }
  })

  const showToast = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 3000)
  }

  useEffect(() => {
    let active = true
    Promise.all([listNiches(), listScripts()])
      .then(([nichesData, scriptsData]) => {
        if (!active) return
        setNiches(nichesData)
        setScripts(scriptsData)
      })
      .catch(() => {
        // Fallback silencioso
      })
    return () => {
      active = false
    }
  }, [])

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleCopyText = async (id: string, text: string, customToast?: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    showToast(customToast ?? 'Copiado para a área de transferência!')
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
  }

  // Separação entre Abordagens Iniciais (PITCH) e Quebra de Objeções (OBJECTION)
  const { filteredPitches, filteredObjections } = useMemo(() => {
    const dbPitches = scripts.filter((s) => (s.script_type ?? 'PITCH') === 'PITCH')
    const dbObjections = scripts.filter((s) => s.script_type === 'OBJECTION')

    // Mescla objeções do banco com fallback caso o banco ainda não tenha as seeds
    const combinedObjections =
      dbObjections.length > 0
        ? dbObjections
        : FALLBACK_OBJECTIONS

    return {
      filteredPitches: dbPitches.filter((s) =>
        matchesNicheFilter(s.category, selectedFilter),
      ),
      filteredObjections: combinedObjections.filter((s) =>
        matchesNicheFilter(s.category, selectedFilter),
      ),
    }
  }, [scripts, selectedFilter])

  // Nichos extras além de Advocacia e Pet Shop
  const customNichesForBar = useMemo(() => {
    return niches.filter((n) => {
      const lower = n.name.toLowerCase()
      const isAdv = lower.includes('advoga') || lower.includes('jurid')
      const isPet =
        lower.includes('pet') || lower.includes('veterin') || lower.includes('banho')
      return !isAdv && !isPet
    })
  }, [niches])

  const allCategoryChoices = useMemo(() => {
    const base = ['Geral', 'Advogado', 'Pet Shop & Veterinária']
    const fromDb = niches.map((n) => n.name)
    const merged = new Set([...base, ...fromDb, ...HOMOLOGATED_CATEGORIES])
    return Array.from(merged)
  }, [niches])

  const openCreateModal = (defaultType: ScriptType = 'PITCH') => {
    setEditingScriptId(null)
    setFormScriptType(defaultType)
    if (selectedFilter === 'ADVOCACIA') {
      setFormCategory('Advogado')
    } else if (selectedFilter === 'PETSHOP') {
      setFormCategory('Pet Shop & Veterinária')
    } else if (selectedFilter === 'TODOS') {
      setFormCategory(defaultType === 'OBJECTION' ? 'Geral' : 'Advogado')
    } else {
      setFormCategory(selectedFilter)
    }
    setFormTitle('')
    setFormSituation('')
    setFormCondition(defaultType === 'OBJECTION' ? 'GERAL' : 'IMPROVISADO')
    setFormUpsell('GMB')
    setFormMessage(
      defaultType === 'PITCH'
        ? 'Olá, equipe de {name}, tudo bem? Vi o perfil de vocês no Google Maps em {city}.\n\nDesenvolvo Sites Vitrine One-Page perenes ({price} em pagamento único, sem mensalidades e com blindagem LGPD nativa). Posso te mandar uma prévia de 1 minuto?'
        : 'Compreendo perfeitamente! Inclusive estruturamos o Site Vitrine One-Page para {name} em {city} com pagamento único de {price} (zero mensalidade) e entrega pronta para o WhatsApp.',
    )
    setShowScriptModal(true)
  }

  const openEditModal = (item: PitchScript) => {
    setEditingScriptId(item.id.startsWith('fallback-') ? null : item.id)
    setFormScriptType(item.script_type ?? 'PITCH')
    setFormCategory(item.category)
    setFormTitle(item.title)
    setFormSituation(item.situation ?? '')
    setFormCondition(item.website_condition)
    setFormUpsell(item.upsell_focus)
    setFormMessage(item.message_template.replace(/\\n/g, '\n'))
    setShowScriptModal(true)
  }

  const handleSaveScriptModal = async (e: FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formMessage.trim() || isSavingScript) return

    setIsSavingScript(true)
    try {
      const effectiveCondition: ScriptWebsiteCondition =
        formScriptType === 'OBJECTION' ? 'GERAL' : formCondition
      const effectiveUpsell: UpsellFocus =
        formScriptType === 'OBJECTION' ? 'NONE' : formUpsell

      if (editingScriptId) {
        const updated = await updateScript(editingScriptId, {
          category: formCategory.trim(),
          script_type: formScriptType,
          website_condition: effectiveCondition,
          title: formTitle.trim(),
          situation: formSituation.trim() || null,
          message_template: formMessage,
          upsell_focus: effectiveUpsell,
        })
        setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        showToast(`"${updated.title}" atualizado com sucesso!`)
      } else {
        const created = await createScript({
          category: formCategory.trim(),
          script_type: formScriptType,
          website_condition: effectiveCondition,
          title: formTitle.trim(),
          situation: formSituation.trim() || null,
          message_template: formMessage,
          upsell_focus: effectiveUpsell,
        })
        setScripts((prev) => [...prev, created])
        showToast(
          formScriptType === 'OBJECTION'
            ? `Nova quebra de objeção "${created.title}" cadastrada!`
            : `Novo roteiro "${created.title}" cadastrado!`,
        )
      }
      setShowScriptModal(false)
    } catch {
      showToast('Erro ao salvar no banco. Verifique se o título já existe neste nicho.')
    } finally {
      setIsSavingScript(false)
    }
  }

  const handleDeleteScriptItem = async (item: PitchScript) => {
    if (item.id.startsWith('fallback-')) {
      showToast('Este item faz parte da matriz base padrão.')
      return
    }
    try {
      await deleteScript(item.id)
      setScripts((prev) => prev.filter((s) => s.id !== item.id))
      showToast(`"${item.title}" removido.`)
    } catch {
      showToast('Não foi possível remover o item.')
    }
  }

  // Handlers de Edição da Tabela de Preços
  const handleStartEditPricing = () => {
    setDraftPricingPlans(pricingPlans.map((p) => ({ ...p })))
    setIsEditingPricing(true)
  }

  const handleSavePricingPlans = () => {
    setPricingPlans(draftPricingPlans)
    try {
      window.localStorage.setItem(
        PRICING_STORAGE_KEY,
        JSON.stringify(draftPricingPlans),
      )
    } catch {
      // ignore
    }
    setIsEditingPricing(false)
    showToast('Tabela Oficial de Preços atualizada e salva!')
  }

  const handleResetPricingPlans = () => {
    setPricingPlans(DEFAULT_PRICING_PLANS)
    setDraftPricingPlans(DEFAULT_PRICING_PLANS)
    try {
      window.localStorage.removeItem(PRICING_STORAGE_KEY)
    } catch {
      // ignore
    }
    setIsEditingPricing(false)
    showToast('Tabela de preços restaurada para os valores padrão.')
  }

  const currentTabChecklist = useMemo(
    () => OPERATIONAL_CHECKLISTS.filter((item) => item.category === activeChecklistTab),
    [activeChecklistTab],
  )

  const dynamicDeploySlug = useMemo(
    () => resolveTemplateNicheSlug(selectedFilter, niches),
    [selectedFilter, niches],
  )

  const dynamicDeployCommand = `cd templates/vercel-${dynamicDeploySlug}/base && npx vercel --prod --yes`

  return (
    <main className="mx-auto max-w-[1680px] space-y-6 px-6 py-6">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-600/50 bg-stone-900 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Cabeçalho Principal + Botões de Ação */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-100">
              Central de Playbooks, Roteiros &amp; Contra-Ataque de Objeções
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Segmente seus roteiros de abordagem inicial e respostas de quebra de objeção por
            vertical de atuação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNicheModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-bold text-stone-200 transition hover:border-amber-600/60 hover:text-amber-400"
          >
            <Layers className="h-4 w-4 text-amber-500" />
            Nichos ({niches.length || HOMOLOGATED_CATEGORIES.length})
          </button>

          <button
            type="button"
            onClick={() => openCreateModal('PITCH')}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-500"
          >
            <MessageSquarePlus className="h-4 w-4" />
            + Novo Roteiro / Objeção
          </button>
        </div>
      </section>

      {/* Barra de Filtro e Segmentação por Nicho no Topo */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-[#1c1917]/90 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFilter('TODOS')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              selectedFilter === 'TODOS'
                ? 'border-amber-500 bg-amber-600 text-stone-950 shadow-sm'
                : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700 hover:text-stone-100'
            }`}
          >
            Todos / Geral
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('ADVOCACIA')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              selectedFilter === 'ADVOCACIA'
                ? 'border-amber-500 bg-amber-600 text-stone-950 shadow-sm'
                : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700 hover:text-stone-100'
            }`}
          >
            <span>⚖️</span>
            <span>Advocacia</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('PETSHOP')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              selectedFilter === 'PETSHOP'
                ? 'border-amber-500 bg-amber-600 text-stone-950 shadow-sm'
                : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700 hover:text-stone-100'
            }`}
          >
            <span>🐾</span>
            <span>Pet Shop &amp; Vet</span>
          </button>

          {customNichesForBar.map((n) => {
            const isSelected = selectedFilter.toLowerCase() === n.name.toLowerCase()
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedFilter(n.name)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                  isSelected
                    ? 'border-amber-500 bg-amber-600 text-stone-950 shadow-sm'
                    : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                }`}
              >
                {n.name}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowNicheModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-amber-600/50 bg-amber-600/10 px-3.5 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-600/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Gerenciar Nichos
        </button>
      </section>

      {/* SEÇÃO 1: Abordagens Iniciais (Pitches) do Nicho Selecionado */}
      <section className="rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-400" />
            <h2 className="font-serif text-lg font-bold text-stone-100">
              Abordagens Iniciais (Pitches de 1º Toque)
            </h2>
            <span className="rounded-md border border-stone-700 bg-stone-950 px-2 py-0.5 font-mono text-[11px] text-amber-400">
              {selectedFilter === 'TODOS'
                ? 'Todos os Nichos'
                : selectedFilter === 'ADVOCACIA'
                  ? '⚖️ Advocacia + Geral'
                  : selectedFilter === 'PETSHOP'
                    ? '🐾 Pet Shop & Vet + Geral'
                    : `${selectedFilter} + Geral`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-stone-400">
              {filteredPitches.length} roteiro(s)
            </span>
            <button
              type="button"
              onClick={() => openCreateModal('PITCH')}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:border-amber-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Pitch
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredPitches.map((script) => {
            const formattedText = script.message_template.replace(/\\n/g, '\n')
            const isCopied = copiedId === script.id
            return (
              <article
                key={script.id}
                className="flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/90 p-4 transition hover:border-stone-700"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-600/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                        {script.category}
                      </span>
                      <span className="rounded border border-stone-700 bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300">
                        {script.website_condition}
                      </span>
                      {script.upsell_focus && script.upsell_focus !== 'NONE' && (
                        <span className="rounded border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Upsell: {script.upsell_focus}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(script)}
                        title="Editar roteiro"
                        className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-400 transition hover:border-amber-600/50 hover:text-stone-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteScriptItem(script)}
                        title="Excluir roteiro"
                        className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-400 transition hover:border-rose-600/50 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyText(
                            script.id,
                            formattedText,
                            `Roteiro "${script.title}" copiado!`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1 text-xs font-bold text-stone-200 transition hover:border-emerald-600/60 hover:text-emerald-400"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Script
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="mt-2.5 font-serif text-base font-bold text-stone-100">
                    {script.title}
                  </h3>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-stone-800/80 bg-[#1c1917] p-3 font-sans text-xs leading-relaxed text-stone-200">
                    {formattedText}
                  </pre>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* SEÇÃO 2: Quebra de Objeções (Contra-Ataques) + Tabela Oficial de Preços Editável */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-stone-800 bg-[#1c1917] p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <h2 className="font-serif text-lg font-bold text-stone-100">
                Quebra de Objeções (Contra-Ataques 1-Click)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">
                {filteredObjections.length} contra-ataque(s)
              </span>
              <button
                type="button"
                onClick={() => openCreateModal('OBJECTION')}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-600/40 bg-amber-600/15 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-600 hover:text-stone-950"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Objeção
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredObjections.map((obj) => {
              const isCopied = copiedId === obj.id
              const formattedResponse = obj.message_template.replace(/\\n/g, '\n')
              return (
                <article
                  key={obj.id}
                  className="flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-700"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded bg-amber-600/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {obj.category}
                        </span>
                        <h3 className="mt-1.5 font-serif text-base font-bold text-amber-400">
                          {obj.title}
                        </h3>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(obj)}
                          title="Editar contra-ataque"
                          className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-400 transition hover:border-amber-600/50 hover:text-stone-100"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        {!obj.id.startsWith('fallback-') && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteScriptItem(obj)}
                            title="Excluir contra-ataque"
                            className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-400 transition hover:border-rose-600/50 hover:text-rose-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyText(
                              obj.id,
                              formattedResponse,
                              `Contra-ataque "${obj.title}" copiado!`,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-stone-950 transition hover:bg-emerald-500"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copiar Resposta
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {obj.situation && (
                      <p className="mt-1.5 text-[11px] text-stone-400">{obj.situation}</p>
                    )}

                    <p className="mt-3 whitespace-pre-wrap rounded-lg border border-stone-800/80 bg-[#1c1917] p-3 text-xs leading-relaxed text-stone-200">
                      {formattedResponse}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Tabela Oficial de Preços Editável */}
        <section className="space-y-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h2 className="font-serif text-lg font-bold text-stone-100">
                Tabela Oficial de Preços
              </h2>
            </div>

            {!isEditingPricing ? (
              <button
                type="button"
                onClick={handleStartEditPricing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:border-amber-500 hover:text-amber-200"
              >
                <Pencil className="h-3 w-3" />
                Editar Valores
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetPricingPlans}
                  title="Restaurar tabela padrão"
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] font-semibold text-stone-400 hover:text-stone-200"
                >
                  <RotateCcw className="h-3 w-3" />
                  Padrão
                </button>
                <button
                  type="button"
                  onClick={handleSavePricingPlans}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-stone-950 hover:bg-emerald-500"
                >
                  <Save className="h-3 w-3" />
                  Salvar
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {(isEditingPricing ? draftPricingPlans : pricingPlans).map((plan, idx) => {
              const cardBorder =
                plan.accent === 'emerald'
                  ? 'border-emerald-600/40 bg-emerald-600/10'
                  : plan.accent === 'amber'
                    ? 'border-amber-600/40 bg-amber-600/10'
                    : 'border-stone-800 bg-stone-950'
              const priceColor =
                plan.accent === 'emerald'
                  ? 'text-emerald-400'
                  : plan.accent === 'amber'
                    ? 'text-amber-400'
                    : 'text-stone-200'

              return (
                <div key={plan.id} className={`rounded-xl border p-3.5 ${cardBorder}`}>
                  {isEditingPricing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={plan.title}
                          onChange={(e) => {
                            const val = e.target.value
                            setDraftPricingPlans((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, title: val } : p)),
                            )
                          }}
                          className="col-span-7 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs font-bold text-stone-100 outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          value={plan.priceLabel}
                          onChange={(e) => {
                            const val = e.target.value
                            setDraftPricingPlans((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, priceLabel: val } : p,
                              ),
                            )
                          }}
                          className="col-span-5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 font-mono text-xs font-black text-emerald-400 outline-none focus:border-amber-500"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={plan.deliverables}
                        onChange={(e) => {
                          const val = e.target.value
                          setDraftPricingPlans((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, deliverables: val } : p,
                            ),
                          )
                        }}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] leading-relaxed text-stone-200 outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between font-bold text-stone-100">
                        <span>{plan.title}</span>
                        <span
                          className={`font-mono text-sm font-black tabular-nums ${priceColor}`}
                        >
                          {plan.priceLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-300">
                        {plan.deliverables}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Regra de Ouro LGPD
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              A adequação LGPD nunca é vendida separada: ela é o argumento matador já embutido no
              pacote base Turnkey.
            </p>
          </div>
        </section>
      </div>

      {/* Checklists Operacionais Interativos + Deploy Instantâneo Dinâmico */}
      <section className="rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-emerald-400" />
            <h2 className="font-serif text-lg font-bold text-stone-100">
              Checklists Operacionais Persistentes
            </h2>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 p-1">
            {(
              [
                { key: 'whatsapp', label: 'Checklist de WhatsApp' },
                { key: 'reuniao', label: 'Checklist de Reunião' },
                { key: 'entrega', label: 'Checklist de Entrega (15 min)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveChecklistTab(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeChecklistTab === tab.key
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {currentTabChecklist.map((item) => {
            const checked = Boolean(checkedIds[item.id])
            return (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  checked
                    ? 'border-emerald-600/45 bg-emerald-600/10'
                    : 'border-stone-800 bg-stone-950/80 hover:border-stone-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-700 bg-stone-900 text-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100">
                    <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>{item.step}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{item.detail}</p>
                </div>
              </label>
            )
          })}
        </div>

        {/* Snippet de Deploy em 1 Minuto Dinâmico por Nicho */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
            <Terminal className="h-4 w-4 text-amber-500" />
            <span>
              Deploy em 1 Minuto (Nicho Ativo:{' '}
              <strong className="text-amber-400">vercel-{dynamicDeploySlug}</strong>):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-stone-800 bg-stone-900 px-3 py-1.5 font-mono text-xs text-emerald-400">
              {dynamicDeployCommand}
            </code>
            <button
              type="button"
              onClick={() =>
                void handleCopyText(
                  'deploy-cmd',
                  dynamicDeployCommand,
                  'Comando de deploy copiado!',
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-stone-200 transition hover:border-emerald-500 hover:text-emerald-300"
            >
              {copiedId === 'deploy-cmd' ? (
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
      </section>

      {/* Modal de Criação / Edição de Roteiro ou Quebra de Objeção */}
      {showScriptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowScriptModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-stone-800 bg-[#1c1917] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-amber-500" />
                <h2 className="font-serif text-xl font-bold text-stone-100">
                  {editingScriptId
                    ? 'Editar Roteiro / Contra-Ataque'
                    : 'Novo Roteiro / Quebra de Objeção'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="rounded-lg border border-stone-800 bg-stone-950 p-1.5 text-stone-400 hover:text-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveScriptModal(e)} className="mt-4 space-y-4">
              {/* Seletor de Tipo: PITCH vs OBJECTION */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-300">
                    Tipo de Registro *
                  </label>
                  <select
                    value={formScriptType}
                    onChange={(e) => setFormScriptType(e.target.value as ScriptType)}
                    className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-xs font-bold text-stone-100 outline-none focus:border-amber-500"
                  >
                    <option value="PITCH">Abordagem Inicial (Pitch)</option>
                    <option value="OBJECTION">Quebra de Objeção (Contra-Ataque)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-300">
                    Nicho / Vertical *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-xs font-bold text-stone-100 outline-none focus:border-amber-500"
                  >
                    {allCategoryChoices.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-300">
                  {formScriptType === 'OBJECTION'
                    ? 'Título / Gatilho da Objeção (Ex: “Já tenho Instagram / Linktree”) *'
                    : 'Título do Roteiro de Abordagem *'}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    formScriptType === 'OBJECTION'
                      ? 'Ex: “Acho caro / Preciso falar com meu sócio”'
                      : 'Ex: Pet Shop — Vitrine dos 4 Pilares + Táxi Dog'
                  }
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                />
              </div>

              {formScriptType === 'OBJECTION' ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-300">
                    Contexto da Trava / Situação do Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={formSituation}
                    onChange={(e) => setFormSituation(e.target.value)}
                    placeholder="Ex: Cliente acha que perfil no Instagram substitui site próprio no Google."
                    className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-300">
                      Diagnóstico Web Alvo
                    </label>
                    <select
                      value={formCondition}
                      onChange={(e) =>
                        setFormCondition(e.target.value as ScriptWebsiteCondition)
                      }
                      className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-500"
                    >
                      <option value="IMPROVISADO">IMPROVISADO (Linktree / Instagram)</option>
                      <option value="SEM_SITE">SEM_SITE (Sem link na ficha)</option>
                      <option value="QUEBRADO">QUEBRADO (Fora do Ar)</option>
                      <option value="GERAL">GERAL (Qualquer situação)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-300">
                      Foco de Upsell Posterior
                    </label>
                    <select
                      value={formUpsell}
                      onChange={(e) => setFormUpsell(e.target.value as UpsellFocus)}
                      className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-amber-500"
                    >
                      <option value="GMB">Google Meu Negócio (GMB)</option>
                      <option value="ADS">Google Ads Local</option>
                      <option value="COMBO">Combo (Marca + GMB)</option>
                      <option value="NONE">Sem Upsell</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300">
                    {formScriptType === 'OBJECTION'
                      ? 'Resposta / Contra-Ataque para Copiar no WhatsApp *'
                      : 'Texto da Mensagem de Abordagem *'}
                  </label>
                  <span className="font-mono text-[11px] text-amber-400">
                    Variáveis: {'{name}'}, {'{city}'}, {'{price}'}, {'{rating}'},{' '}
                    {'{reviews_count}'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 p-3.5 text-xs leading-relaxed text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-stone-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="rounded-xl border border-stone-700 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingScript}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-stone-950 transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingScript ? 'Salvando...' : 'Salvar no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Nichos com Exclusão Segura */}
      <NicheManagerModal
        isOpen={showNicheModal}
        onClose={() => setShowNicheModal(false)}
        niches={niches}
        onNichesChange={setNiches}
        onSelectNiche={(name) => {
          const lower = name.toLowerCase()
          if (lower.includes('advoga')) {
            setSelectedFilter('ADVOCACIA')
          } else if (lower.includes('pet') || lower.includes('veterin')) {
            setSelectedFilter('PETSHOP')
          } else {
            setSelectedFilter(name)
          }
        }}
      />
    </main>
  )
}
