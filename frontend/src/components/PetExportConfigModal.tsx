import { useEffect, useState } from 'react'
import {
  CheckSquare,
  Code2,
  Download,
  Palette,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react'
import { cleanNameClientSide, type Lead } from '../services/api'

export type PetColorThemePreset =
  | 'teal-honey'
  | 'sage-earth'
  | 'lavender-mint'
  | 'navy-sunshine'
  | 'boutique-dark'
  | 'custom'

export type PetPillarId = 'grooming' | 'veterinary' | 'petshop' | 'hotel'

export interface CustomPetPalette {
  backgroundColor: string
  surfaceColor: string
  primaryColor: string
  accentColor: string
  highlightColor: string
}

interface PetThemeOption {
  id: Exclude<PetColorThemePreset, 'custom'>
  name: string
  mode: 'light' | 'dark'
  modeBadge: string
  icon: string
  backgroundColor: string
  surfaceColor: string
  primaryColor: string
  bodyText: string
  accentColor: string
  highlightColor: string
  borderColor: string
  desc: string
}

const PET_THEME_OPTIONS: PetThemeOption[] = [
  {
    id: 'teal-honey',
    name: 'Teal & Honey',
    mode: 'light',
    modeBadge: 'Claro • Turquesa Spa & Mel',
    icon: '🛁',
    backgroundColor: '#f8fafc',
    surfaceColor: '#ffffff',
    primaryColor: '#1e293b',
    bodyText: '#475569',
    accentColor: '#0d9488',
    highlightColor: '#f59e0b',
    borderColor: '#e2e8f0',
    desc: 'Turquesa spa limpo e mel vibrante (Padrão)',
  },
  {
    id: 'sage-earth',
    name: 'Sage & Earth',
    mode: 'light',
    modeBadge: 'Claro • Sálvia & Terracota',
    icon: '🌿',
    backgroundColor: '#f9f7f2',
    surfaceColor: '#ffffff',
    primaryColor: '#264653',
    bodyText: '#475569',
    accentColor: '#6096ba',
    highlightColor: '#e76f51',
    borderColor: '#e5e0d8',
    desc: 'Estilo natural e acolhedor (Eco Vet)',
  },
  {
    id: 'lavender-mint',
    name: 'Lavender & Mint',
    mode: 'light',
    modeBadge: 'Claro • Lavanda & Menta',
    icon: '💜',
    backgroundColor: '#fafaf9',
    surfaceColor: '#ffffff',
    primaryColor: '#2e294e',
    bodyText: '#52525b',
    accentColor: '#8b5cf6',
    highlightColor: '#10b981',
    borderColor: '#f3e8ff',
    desc: 'Estética delicada de Grooming & Pet Spa',
  },
  {
    id: 'navy-sunshine',
    name: 'Navy & Sunshine',
    mode: 'light',
    modeBadge: 'Claro • Náutico & Solar',
    icon: '🩺',
    backgroundColor: '#f1f5f9',
    surfaceColor: '#ffffff',
    primaryColor: '#1e3a8a',
    bodyText: '#334155',
    accentColor: '#3b82f6',
    highlightColor: '#f59e0b',
    borderColor: '#cbd5e1',
    desc: 'Azul clínico seguro e amarelo solar (Centro Vet)',
  },
  {
    id: 'boutique-dark',
    name: 'Boutique Dark',
    mode: 'dark',
    modeBadge: 'Escuro • Ônix & Caramelo',
    icon: '✨',
    backgroundColor: '#121214',
    surfaceColor: '#1c1c21',
    primaryColor: '#f4f4f5',
    bodyText: '#a1a1aa',
    accentColor: '#d97706',
    highlightColor: '#fbbf24',
    borderColor: '#27272a',
    desc: 'Preto quente e âmbar caramelo (Estética de Luxo)',
  },
]

interface PillarPresetDefinition {
  id: PetPillarId
  icon: string
  shortLabel: string
  badge: string
  title: string
  subtitle: string
  description: string
  items: string[]
  details: {
    protocol_title: string
    protocol_text: string
    highlights: string[]
  }
  cta_label: string
  whatsapp_message: string
}

const PILLAR_CATALOG: Record<PetPillarId, PillarPresetDefinition> = {
  grooming: {
    id: 'grooming',
    icon: '🛁',
    shortLabel: 'Banho & Tosa / Estética Animal',
    badge: 'Estética & Bem-Estar',
    title: 'Estética Animal & Banho e Tosa',
    subtitle: 'Higiene rigorosa, produtos hipoalergênicos e manejo livre de estresse.',
    description:
      'Transformamos o momento do banho em uma experiência relaxante e segura. Utilizamos água morna controlada, secagem silenciosa e toalhas 100% esterilizadas e lacradas individualmente.',
    items: [
      'Banho terapêutico e relaxante com linha hipoalergênica',
      'Tosa da raça, tosa na tesoura e tosa higiênica delicada',
      'Hidratação profunda de pelagem e desembolo sem dor',
      'Corte de unhas, limpeza auricular e escovação dental',
    ],
    details: {
      protocol_title: 'Protocolo de Segurança e Higiene no Banho',
      protocol_text:
        'Todas as lâminas, tesouras e pentes passam por esterilização a cada atendimento. Seu pet nunca compartilha toalhas e permanece em ambiente visível, climatizado e com manejo gentil.',
      highlights: [
        'Toalhas individuais lacradas',
        'Cosméticos biodegradáveis pH neutro',
        'Secagem com temperatura monitorada',
        'Inspeção de pele e ouvidos inclusa',
      ],
    },
    cta_label: 'Agendar Banho & Tosa',
    whatsapp_message: 'Olá! Gostaria de agendar um horário de banho e tosa para o meu pet.',
  },
  veterinary: {
    id: 'veterinary',
    icon: '🩺',
    shortLabel: 'Clínica Veterinária',
    badge: 'Saúde & Prevenção',
    title: 'Clínica Veterinária & Vacinação',
    subtitle: 'Medicina veterinária preventiva, diagnósticos precisos e vacinas importadas.',
    description:
      'Acompanhamento clínico completo em todas as fases da vida do seu cão ou gato, com foco em longevidade, prevenção de doenças e atendimento acolhedor.',
    items: [
      'Consultas clínicas preventivas e check-up geriátrico',
      'Protocolo completo de vacinação importada (V8, V10, Giárdia, Raiva, V4/V5)',
      'Exames laboratoriais de sangue, bioquímicos e check-up rápido',
      'Controle parasitário, vermifugação e orientação nutricional',
    ],
    details: {
      protocol_title: 'Rigor Técnico e Conservação de Imunobiológicos',
      protocol_text:
        'Nossas vacinas são exclusivamente importadas de laboratórios éticos e armazenadas em câmara refrigerada com controle térmico digital contínuo, garantindo máxima resposta imunológica.',
      highlights: [
        'Vacinas importadas refrigeradas',
        'Carteira de vacinação revisada',
        'Manejo Cat-Friendly e Dog-Friendly',
        'Atendimento com hora marcada',
      ],
    },
    cta_label: 'Agendar Consulta ou Vacina',
    whatsapp_message:
      'Olá! Gostaria de informações sobre consulta veterinária e vacinação.',
  },
  petshop: {
    id: 'petshop',
    icon: '🛍️',
    shortLabel: 'Pet Shop & Farmácia (Rações e Medicamentos)',
    badge: 'Nutrição & Farmácia',
    title: 'Pet Shop & Farmácia Veterinária',
    subtitle: 'Rações Super Premium, medicamentos veterinários e entrega rápida no bairro.',
    description:
      'Tudo o que o seu melhor amigo precisa no dia a dia sem você sair de casa. Trabalhamos com as marcas mais recomendadas por veterinários e entrega ágil pelo WhatsApp.',
    items: [
      'Rações Super Premium, Premium Especial e linhas coadjuvantes/medicamentosas',
      'Farmácia veterinária completa: antipulgas, carrapaticidas e suplementos',
      'Petiscos naturais, tapetes higiênicos e areias biodegradáveis',
      'Acessórios ergonômicos, guias seguras, camas e brinquedos interativos',
    ],
    details: {
      protocol_title: 'Curadoria Nutricional e Delivery Rápido',
      protocol_text:
        'Todos os lotes de ração e medicamentos possuem procedência direta dos fabricantes oficiais e validade monitorada. Consulte disponibilidade pelo WhatsApp e receba em casa.',
      highlights: [
        'Lotes frescos com validade longa',
        'Antipulgas originais lacrados',
        'Orientação sobre porte e idade',
        'Delivery expresso na região',
      ],
    },
    cta_label: 'Pedir Ração ou Medicamento',
    whatsapp_message:
      'Olá! Gostaria de consultar a disponibilidade de ração/medicamento para entrega.',
  },
  hotel: {
    id: 'hotel',
    icon: '🏨',
    shortLabel: 'Hotelzinho & Creche / Daycare',
    badge: 'Socialização & Hospedagem',
    title: 'Hotelzinho, Daycare & Creche',
    subtitle: 'Rotina alegre de atividades, monitoramento constante e espaço livre sem gaiolas.',
    description:
      'Mais do que hospedagem: um ambiente seguro de enriquecimento ambiental onde o seu pet gasta energia com saúde, interage com supervisão e recebe carinho o dia inteiro.',
    items: [
      'Creche diurna (Daycare) com cronograma de brincadeiras e descanso',
      'Hospedagem assistida com envio diário de fotos e vídeos no WhatsApp',
      'Espaço amplo, higienizado e 100% livre de confinamento em baias frias',
      'Exigência rigorosa de carteira de vacinação e controle de ectoparasitas',
    ],
    details: {
      protocol_title: 'Adaptação Gradual e Segurança Coletiva',
      protocol_text:
        'Todos os hóspedes passam por avaliação comportamental prévia e conferência de vacinas em dia, garantindo uma convivência pacífica, saudável e divertida para toda a matilha.',
      highlights: [
        'Envio de vídeos diários ao tutor',
        'Zero confinamento em gaiolas',
        'Separação por porte e energia',
        'Higienização hospitalar do espaço',
      ],
    },
    cta_label: 'Consultar Vaga na Creche/Hotel',
    whatsapp_message:
      'Olá! Gostaria de saber como funciona a hospedagem/creche para o meu pet.',
  },
}

function extractPetInitials(name: string): string {
  const clean = cleanNameClientSide(name)
  const parts = clean
    .replace(/\b(pet|shop|petshop|clinica|clínica|veterinaria|veterinária|centro|estetica|estética)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'PET'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

interface RealReviewInput {
  author: string
  stars: number
  text: string
}

export interface PetExportConfigModalInnerProps {
  lead: Lead
  onClose: () => void
  onSuccess?: (businessName: string) => void
}

interface PetModalDraft {
  selectedPillars: Record<PetPillarId, boolean>
  taxiDogEnabled: boolean
  themePreset: PetColorThemePreset
  customPalette: CustomPetPalette
  tagline: string
  crmvNumber: string
  officeHours: string
  monogramInitials: string
  groomingPrice: string
  plansPrice: string
  taxiDogPrice: string
  includeRealReviews: boolean
  realReviews: RealReviewInput[]
}

const DEFAULT_CUSTOM_PALETTE: CustomPetPalette = {
  backgroundColor: '#f8fafc',
  surfaceColor: '#ffffff',
  primaryColor: '#1e293b',
  accentColor: '#0d9488',
  highlightColor: '#f59e0b',
}

function isDarkHexColor(hex: string): boolean {
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.45
}

function getPetDraftKey(leadId: string): string {
  return `abductor_modal_draft_${leadId}`
}

function buildDefaultPetDraft(lead: Lead): PetModalDraft {
  const extracted = Array.isArray(lead.extracted_reviews) ? lead.extracted_reviews : []
  const fiveStarExtracted = extracted.filter((r) => (r.stars || 5) >= 5)
  const prioritizedExtracted = fiveStarExtracted.length > 0 ? fiveStarExtracted : extracted
  const hasExtracted = prioritizedExtracted.length > 0

  const defaultReviews: RealReviewInput[] = hasExtracted
    ? prioritizedExtracted.slice(0, 5).map((r) => ({
        author: r.author || 'Tutor(a) Verificado(a)',
        stars: r.stars || 5,
        text: r.text || '',
      }))
    : [
        { author: '', stars: 5, text: '' },
        { author: '', stars: 5, text: '' },
        { author: '', stars: 5, text: '' },
      ]

  while (defaultReviews.length < 3) {
    defaultReviews.push({ author: '', stars: 5, text: '' })
  }

  return {
    selectedPillars: {
      grooming: true,
      veterinary: true,
      petshop: true,
      hotel: false,
    },
    taxiDogEnabled: true,
    themePreset: 'teal-honey',
    customPalette: { ...DEFAULT_CUSTOM_PALETTE },
    tagline: 'Estética Animal Segura, Carinho Genuíno e Saúde Veterinária Integrada',
    crmvNumber: 'Responsável Técnico(a) Médico(a) Veterinário(a) — CRMV/MG Sob Consulta',
    officeHours:
      lead.opening_hours && lead.opening_hours.trim().length > 0
        ? lead.opening_hours.trim()
        : 'Segunda a Sexta das 08:00–18:30 • Sábados das 08:00–14:00',
    monogramInitials: extractPetInitials(lead.name),
    groomingPrice: '',
    plansPrice: '',
    taxiDogPrice: '',
    includeRealReviews: hasExtracted,
    realReviews: defaultReviews,
  }
}

function loadPetDraft(lead: Lead): PetModalDraft {
  const defaults = buildDefaultPetDraft(lead)
  try {
    const raw = localStorage.getItem(getPetDraftKey(lead.id))
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<PetModalDraft>
    return {
      ...defaults,
      ...parsed,
      selectedPillars: {
        ...defaults.selectedPillars,
        ...(parsed.selectedPillars ?? {}),
      },
      customPalette: {
        ...defaults.customPalette,
        ...(parsed.customPalette ?? {}),
      },
      groomingPrice:
        typeof parsed.groomingPrice === 'string' ? parsed.groomingPrice : defaults.groomingPrice,
      plansPrice:
        typeof parsed.plansPrice === 'string' ? parsed.plansPrice : defaults.plansPrice,
      taxiDogPrice:
        typeof parsed.taxiDogPrice === 'string' ? parsed.taxiDogPrice : defaults.taxiDogPrice,
      realReviews:
        Array.isArray(parsed.realReviews) && parsed.realReviews.length >= 3
          ? parsed.realReviews
          : defaults.realReviews,
    }
  } catch {
    return defaults
  }
}

export function PetExportConfigModalInner({
  lead,
  onClose,
  onSuccess,
}: PetExportConfigModalInnerProps) {
  const cleanedName = cleanNameClientSide(lead.name) || lead.name
  const initialDraft = loadPetDraft(lead)

  // 1. Toggles Modulares dos Pilares (3 pré-selecionados por padrão + Táxi Dog)
  const [selectedPillars, setSelectedPillars] = useState<Record<PetPillarId, boolean>>(
    initialDraft.selectedPillars,
  )
  const [taxiDogEnabled, setTaxiDogEnabled] = useState<boolean>(initialDraft.taxiDogEnabled)

  // 2. Paleta Visual + Construtor Customizado
  const [themePreset, setThemePreset] = useState<PetColorThemePreset>(initialDraft.themePreset)
  const [customPalette, setCustomPalette] = useState<CustomPetPalette>(
    initialDraft.customPalette,
  )

  // 3. Textos & Responsável Técnico CFMV
  const [tagline, setTagline] = useState(initialDraft.tagline)
  const [crmvNumber, setCrmvNumber] = useState(initialDraft.crmvNumber)
  const [officeHours, setOfficeHours] = useState(initialDraft.officeHours)
  const [monogramInitials, setMonogramInitials] = useState(initialDraft.monogramInitials)

  // 4. Precificação Opcional de Serviços (Banho, Planos e Táxi Dog)
  const [groomingPrice, setGroomingPrice] = useState(initialDraft.groomingPrice)
  const [plansPrice, setPlansPrice] = useState(initialDraft.plansPrice)
  const [taxiDogPrice, setTaxiDogPrice] = useState(initialDraft.taxiDogPrice)

  // 5. Gestão de Prova Social e Avaliações Reais
  const [includeRealReviews, setIncludeRealReviews] = useState<boolean>(
    initialDraft.includeRealReviews,
  )
  const [realReviews, setRealReviews] = useState<RealReviewInput[]>(initialDraft.realReviews)

  // Sincronização automática do rascunho por Lead no localStorage
  useEffect(() => {
    const currentDraft: PetModalDraft = {
      selectedPillars,
      taxiDogEnabled,
      themePreset,
      customPalette,
      tagline,
      crmvNumber,
      officeHours,
      monogramInitials,
      groomingPrice,
      plansPrice,
      taxiDogPrice,
      includeRealReviews,
      realReviews,
    }
    const defaults = buildDefaultPetDraft(lead)
    const isDefault = JSON.stringify(currentDraft) === JSON.stringify(defaults)
    try {
      if (isDefault) {
        localStorage.removeItem(getPetDraftKey(lead.id))
      } else {
        localStorage.setItem(getPetDraftKey(lead.id), JSON.stringify(currentDraft))
      }
    } catch {
      // ignore
    }
  }, [
    lead,
    selectedPillars,
    taxiDogEnabled,
    themePreset,
    customPalette,
    tagline,
    crmvNumber,
    officeHours,
    monogramInitials,
    groomingPrice,
    plansPrice,
    taxiDogPrice,
    includeRealReviews,
    realReviews,
  ])

  const handleResetDefaults = () => {
    const defaults = buildDefaultPetDraft(lead)
    setSelectedPillars(defaults.selectedPillars)
    setTaxiDogEnabled(defaults.taxiDogEnabled)
    setThemePreset(defaults.themePreset)
    setCustomPalette(defaults.customPalette)
    setTagline(defaults.tagline)
    setCrmvNumber(defaults.crmvNumber)
    setOfficeHours(defaults.officeHours)
    setMonogramInitials(defaults.monogramInitials)
    setGroomingPrice(defaults.groomingPrice)
    setPlansPrice(defaults.plansPrice)
    setTaxiDogPrice(defaults.taxiDogPrice)
    setIncludeRealReviews(defaults.includeRealReviews)
    setRealReviews(defaults.realReviews)
    try {
      localStorage.removeItem(getPetDraftKey(lead.id))
    } catch {
      // ignore
    }
  }

  const handleUpdateCustomColor = (field: keyof CustomPetPalette, value: string) => {
    setCustomPalette((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const activePillarIds = (['grooming', 'veterinary', 'petshop', 'hotel'] as PetPillarId[]).filter(
    (id) => selectedPillars[id],
  )

  const handleTogglePillar = (id: PetPillarId) => {
    setSelectedPillars((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      const nextCount = Object.values(next).filter(Boolean).length
      // Garante ao menos 1 pilar ativo para que o site nunca fique sem serviços
      if (nextCount === 0) return prev
      return next
    })
  }

  const handleUpdateReview = (
    idx: number,
    field: keyof RealReviewInput,
    value: string | number,
  ) => {
    setRealReviews((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    )
  }

  const getLayoutPreviewLabel = (count: number) => {
    if (count === 1) return '1 pilar ativo → Vitrine Hero Expandida + 4 Sub-cards'
    if (count === 2) return '2 pilares ativos → Grid Duplo Simétrico (2 colunas)'
    if (count === 3) return '3 pilares ativos → Bento Grid Equilibrado (3 colunas)'
    return '4 pilares ativos → Bento Grid Completo (2x2)'
  }

  const handleDownload = () => {
    const selectedPresetObj =
      PET_THEME_OPTIONS.find((t) => t.id === themePreset) ?? PET_THEME_OPTIONS[0]

    const isCustom = themePreset === 'custom'
    const customIsDark = isDarkHexColor(customPalette.backgroundColor)

    const resolvedTheme = isCustom
      ? {
          preset: 'custom' as const,
          mode: customIsDark ? ('dark' as const) : ('light' as const),
          backgroundColor: customPalette.backgroundColor || '#f8fafc',
          surfaceColor: customPalette.surfaceColor || '#ffffff',
          primaryColor: customPalette.primaryColor || '#1e293b',
          bodyText: customIsDark ? '#a1a1aa' : '#475569',
          accentColor: customPalette.accentColor || '#0d9488',
          highlightColor: customPalette.highlightColor || '#f59e0b',
          borderColor: customIsDark ? '#27272a' : '#e2e8f0',
        }
      : {
          preset: selectedPresetObj.id,
          mode: selectedPresetObj.mode,
          backgroundColor: selectedPresetObj.backgroundColor,
          surfaceColor: selectedPresetObj.surfaceColor,
          primaryColor: selectedPresetObj.primaryColor,
          bodyText: selectedPresetObj.bodyText,
          accentColor: selectedPresetObj.accentColor,
          highlightColor: selectedPresetObj.highlightColor,
          borderColor: selectedPresetObj.borderColor,
        }

    const pillarImageMap: Record<PetPillarId, string> = {
      grooming: './assets/especialidade-banho-tosa.jpg',
      veterinary: './assets/especialidade-clinica-vet.jpg',
      petshop: './assets/especialidade-pet-farmacia.jpg',
      hotel: './assets/especialidade-hotel-daycare.jpg',
    }

    // Omite do payload JSON os pilares desmarcados para recomposição automática do layout
    const exportedPillars = activePillarIds.map((id) => ({
      ...PILLAR_CATALOG[id],
      image: pillarImageMap[id],
      enabled: true,
      ...(id === 'grooming'
        ? {
            price_badge: groomingPrice.trim() || null,
            plans_badge: plansPrice.trim() || null,
          }
        : {}),
    }))

    // Filtra apenas avaliações reais preenchidas (priorizando 5 estrelas) quando o toggle estiver ativo
    const filledReviews = realReviews
      .filter((r) => r.text.trim().length > 0)
      .map((r) => ({
        author: r.author.trim() || 'Tutor(a) Verificado(a)',
        stars: Number(r.stars) || 5,
        text: r.text.trim(),
      }))
    const fiveStarFilled = filledReviews.filter((r) => r.stars >= 5)
    const exportedTestimonials = includeRealReviews
      ? fiveStarFilled.length > 0
        ? fiveStarFilled
        : filledReviews
      : []

    const resolvedHours =
      officeHours.trim() || 'Segunda a Sexta: 08:00 às 18:00 • Sábado: 08:00 às 13:00'

    // FAQ orgânico sincronizado em cascata apenas com os serviços efetivamente ativos
    const exportedFaq: Array<{ category: string; question: string; answer: string }> = []
    if (selectedPillars.grooming) {
      exportedFaq.push(
        {
          category: 'grooming',
          question: 'Preciso agendar horário para o Banho & Tosa ou posso levar direto?',
          answer:
            'Recomendamos agendar previamente pelo nosso WhatsApp. Assim garantimos atendimento pontual e reduzimos o tempo de espera, proporcionando uma experiência muito mais tranquila e sem estresse para o seu pet.',
        },
        {
          category: 'grooming',
          question: 'Quais cuidados de higiene são tomados para evitar alergias ou contaminações?',
          answer:
            'Utilizamos exclusivamente toalhas esterilizadas em embalagens individuais lacradas, produtos hipoalergênicos aprovados e desinfecção completa de mesas, banheiras e instrumentais entre cada atendimento.',
        },
      )
    }
    if (taxiDogEnabled) {
      exportedFaq.push({
        category: 'taxi_dog',
        question: 'Como funciona o serviço de Táxi Dog (Leva e Traz)?',
        answer:
          'Nosso transporte busca e entrega o seu pet com total segurança em caixas de transporte individuais, higienizadas a cada viagem e em veículo climatizado. Basta solicitar o Táxi Dog no momento do agendamento pelo WhatsApp.',
      })
    }
    if (selectedPillars.veterinary) {
      exportedFaq.push({
        category: 'veterinary',
        question: 'A clínica aplica vacinas importadas? Preciso levar a carteirinha?',
        answer:
          'Sim! Trabalhamos com vacinas importadas armazenadas sob rigoroso controle de temperatura. Sempre traga a carteirinha de vacinação anterior para que o Médico Veterinário avalie o protocolo ideal.',
      })
    }
    if (selectedPillars.petshop) {
      exportedFaq.push({
        category: 'petshop',
        question: 'Vocês fazem entrega de rações, antipulgas e medicamentos em domicílio?',
        answer:
          'Sim! Basta enviar uma mensagem no nosso WhatsApp informando a marca da ração, antipulgas ou item desejado. Conferimos o estoque na hora e enviamos com rapidez para o seu endereço.',
      })
    }
    if (selectedPillars.hotel) {
      exportedFaq.push({
        category: 'hotel',
        question: 'Como funciona a adaptação no Hotelzinho e Creche (Daycare)?',
        answer:
          'Os pets ficam em espaço amplo, 100% livre de gaiolas, separados por porte e perfil de energia. Enviamos fotos e vídeos diários pelo WhatsApp para você acompanhar toda a rotina de brincadeiras e descanso.',
      })
    }

    const configPayload = {
      business: {
        name: cleanedName,
        tagline:
          tagline.trim() ||
          'Estética Animal Segura, Carinho Genuíno e Saúde Veterinária Integrada',
        city: lead.city || 'Uberlândia',
        state: 'MG',
        phone_display: lead.phone_raw || '(34) 99876-5432',
        whatsapp_number: lead.phone_sanitized ? `55${lead.phone_sanitized}` : '5534998765432',
        whatsapp_default_message:
          'Olá! Vi o site de vocês e gostaria de informações sobre o atendimento para o meu pet.',
        address_display: lead.address || lead.neighborhood || 'Uberlândia - MG',
        crmv_number: selectedPillars.veterinary
          ? crmvNumber.trim() || 'RT Médico(a) Veterinário(a) — CRMV Sob Consulta'
          : '',
        opening_hours: resolvedHours,
        office_hours: resolvedHours,
        has_taxi_dog: taxiDogEnabled,
        taxi_dog_enabled: taxiDogEnabled,
        has_vet: Boolean(selectedPillars.veterinary),
        has_grooming: Boolean(selectedPillars.grooming),
        has_shop: Boolean(selectedPillars.petshop),
        has_hotel: Boolean(selectedPillars.hotel),
        taxi_dog_price: taxiDogEnabled ? taxiDogPrice.trim() || null : null,
        taxi_dog_message:
          'Olá! Gostaria de agendar um horário utilizando o serviço de Táxi Dog (Leva e Traz).',
      },
      pricing: {
        grooming_starting_at: groomingPrice.trim() || null,
        plans_starting_at: plansPrice.trim() || null,
        taxi_dog_fee: taxiDogEnabled ? taxiDogPrice.trim() || null : null,
      },
      theme: resolvedTheme,
      visuals: {
        theme_preset: resolvedTheme.preset,
        theme_mode: resolvedTheme.mode,
        hero_image: './assets/hero-principal.jpg',
        hero_image_url: './assets/hero-principal.jpg',
        service_grooming_image: './assets/especialidade-banho-tosa.jpg',
        service_clinic_image: './assets/especialidade-clinica-vet.jpg',
        service_shop_image: './assets/especialidade-pet-farmacia.jpg',
        service_hotel_image: './assets/especialidade-hotel-daycare.jpg',
        about_image: './assets/ambiente-equipe.jpg',
        use_custom_photo: false,
        monogram_initials: (monogramInitials.trim() || 'PET').toUpperCase(),
      },
      metrics: {
        rating: lead.rating > 0 ? lead.rating.toFixed(1) : '4.9',
        reviews_count: lead.reviews_count > 0 ? lead.reviews_count : 64,
        years_experience: '+8',
        pets_cared: '+2.400',
      },
      pillars: exportedPillars,
      trust_badges: [
        {
          category: 'grooming',
          icon: '🧼',
          title: 'Toalhas 100% Esterilizadas e Lacradas',
          description:
            'Higienizadas em alta temperatura e lacradas individualmente para cada pet.',
        },
        {
          category: 'grooming',
          icon: '🌡️',
          title: 'Água Quentinha & Produtos Hipoalergênicos',
          description:
            'Banho em temperatura controlada com dermocosméticos suaves de pH neutro.',
        },
        {
          category: 'taxi_dog',
          icon: '🚗',
          title: 'Táxi Dog Climatizado com Caixas Individuais',
          description:
            'Busca e entrega com segurança, veículo climatizado e higienização a cada viagem.',
        },
        {
          category: 'veterinary',
          icon: '🩺',
          title: 'Atendimento Clínico Sem Estresse',
          description:
            'Equipe treinada em manejo gentil e supervisão técnica para total tranquilidade.',
        },
      ],
      testimonials: exportedTestimonials,
      faq: exportedFaq,
      compliance: {
        enable_lgpd_banner: false,
        privacy_policy_url: './privacidade.html',
        cfmv_compliance: Boolean(selectedPillars.veterinary),
      },
    }

    const jsonBlob = new Blob([JSON.stringify(configPayload, null, 2)], {
      type: 'application/json',
    })
    const blobUrl = URL.createObjectURL(jsonBlob)
    const downloadAnchor = document.createElement('a')
    downloadAnchor.href = blobUrl
    downloadAnchor.download = 'site.config.json'
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    document.body.removeChild(downloadAnchor)
    URL.revokeObjectURL(blobUrl)

    if (onSuccess) onSuccess(cleanedName)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-export-modal-title"
    >
      <div className="tactical-panel flex max-h-[90vh] w-full max-w-2xl flex-col shadow-2xl">
        {/* Topo do Modal */}
        <div className="flex items-start justify-between border-b border-white/[0.07] p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <Code2 className="h-3.5 w-3.5" />
                Gerador Turnkey Pet &amp; Vet
              </span>
              <span className="text-[11px] text-stone-400">
                Template: <code className="font-mono text-emerald-400">vercel-petshop</code>
              </span>
            </div>
            <h2
              id="pet-export-modal-title"
              className="mt-2 font-sans text-lg font-semibold tracking-tight text-stone-100"
            >
              Configurar Site Vitrine Pet — {cleanedName}
            </h2>
            <p className="text-xs text-stone-400">
              Ative os pilares que o estabelecimento oferece. O template recompõe o grid automaticamente sem deixar buracos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-tactical-secondary p-2 text-stone-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          {/* 1. Seleção Modular dos 4 Pilares + Táxi Dog */}
          <div className="rounded-xl border border-stone-800 bg-stone-950/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-stone-200">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                1. Pilares Ativos do Estabelecimento
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                {getLayoutPreviewLabel(activePillarIds.length)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(['grooming', 'veterinary', 'petshop', 'hotel'] as PetPillarId[]).map((id) => {
                const item = PILLAR_CATALOG[id]
                const isChecked = selectedPillars[id]
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      isChecked
                        ? 'border-emerald-600/60 bg-emerald-600/10 text-stone-100'
                        : 'border-stone-800 bg-stone-900/70 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePillar(id)}
                      className="mt-0.5 rounded border-stone-700 bg-stone-950 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{item.icon}</span>
                        <span className="truncate">{item.shortLabel}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-stone-400 leading-snug">
                        {item.subtitle}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Toggle de Táxi Dog */}
            <div className="mt-3 border-t border-stone-800 pt-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/90 px-3.5 py-2.5 hover:border-amber-600/50 transition">
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-stone-200">
                      Serviço de Táxi Dog (Leva e Traz Climatizado)
                    </span>
                    <p className="text-[10px] text-stone-400">
                      Exibe banner de busca e entrega em domicílio com CTA contextual para WhatsApp.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={taxiDogEnabled}
                  onChange={(e) => setTaxiDogEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-500"
                />
              </label>
            </div>
          </div>

          {/* 2. Seletor de Paleta de Cores do Nicho Pet com Swatches + Construtor Customizado */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block font-bold uppercase tracking-wider text-stone-300">
                2. Paleta de Cores Calibrada (Estética &amp; Saúde Animal)
              </label>
              <Palette className="h-3.5 w-3.5 text-amber-500" />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {PET_THEME_OPTIONS.map((theme) => {
                const isSelected = themePreset === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemePreset(theme.id)}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/50'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0">{theme.icon}</span>
                          <span className="font-serif text-xs font-bold text-stone-100 truncate">
                            {theme.name}
                          </span>
                        </div>
                      </div>

                      {/* Swatches Visuais */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          title={`Fundo: ${theme.backgroundColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.backgroundColor }}
                        />
                        <span
                          title={`Acento: ${theme.accentColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span
                          title={`Destaque: ${theme.highlightColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.highlightColor }}
                        />
                        <span
                          title={`Texto: ${theme.primaryColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                      </div>

                      <p className="mt-1.5 text-[10px] font-medium text-emerald-400">
                        {theme.modeBadge}
                      </p>
                      <p className="mt-0.5 text-[10px] text-stone-400 leading-tight">
                        {theme.desc}
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* Opção 6: Construtor de Paleta Personalizada */}
              <button
                type="button"
                onClick={() => setThemePreset('custom')}
                className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                  themePreset === 'custom'
                    ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500/50'
                    : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0">🎨</span>
                      <span className="font-serif text-xs font-bold text-stone-100 truncate">
                        Criar Paleta Personalizada
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      title={`Fundo: ${customPalette.backgroundColor}`}
                      className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                      style={{ backgroundColor: customPalette.backgroundColor }}
                    />
                    <span
                      title={`Cards: ${customPalette.surfaceColor}`}
                      className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                      style={{ backgroundColor: customPalette.surfaceColor }}
                    />
                    <span
                      title={`Títulos: ${customPalette.primaryColor}`}
                      className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                      style={{ backgroundColor: customPalette.primaryColor }}
                    />
                    <span
                      title={`Botão Principal: ${customPalette.accentColor}`}
                      className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                      style={{ backgroundColor: customPalette.accentColor }}
                    />
                    <span
                      title={`Destaque/Badges: ${customPalette.highlightColor}`}
                      className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                      style={{ backgroundColor: customPalette.highlightColor }}
                    />
                  </div>

                  <p className="mt-1.5 text-[10px] font-medium text-amber-400">
                    Preset: custom • Sob Medida
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-400 leading-tight">
                    Color Pickers + HEX para espelhar a marca do cliente
                  </p>
                </div>
              </button>
            </div>

            {/* Painel Expansível do Construtor de Paleta Customizada */}
            {themePreset === 'custom' && (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-stone-950/95 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    🎨 Construtor de Paleta Personalizada (Tokens de Cores)
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Modo detectado:{' '}
                    <strong className="text-stone-200">
                      {isDarkHexColor(customPalette.backgroundColor) ? 'Escuro (Dark)' : 'Claro (Light)'}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {(
                    [
                      {
                        field: 'backgroundColor',
                        label: 'Cor de Fundo',
                        token: 'backgroundColor',
                      },
                      {
                        field: 'surfaceColor',
                        label: 'Cor dos Cards',
                        token: 'surfaceColor',
                      },
                      {
                        field: 'primaryColor',
                        label: 'Cor dos Títulos',
                        token: 'primaryColor',
                      },
                      {
                        field: 'accentColor',
                        label: 'Cor do Botão Principal',
                        token: 'accentColor',
                      },
                      {
                        field: 'highlightColor',
                        label: 'Cor de Destaque / Badges',
                        token: 'highlightColor',
                      },
                    ] as Array<{
                      field: keyof CustomPetPalette
                      label: string
                      token: string
                    }>
                  ).map((item) => (
                    <div
                      key={item.field}
                      className="rounded-lg border border-stone-800 bg-stone-900/80 p-2.5 space-y-1.5"
                    >
                      <label className="block text-[10px] font-bold text-stone-200 truncate">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            /^#[0-9A-Fa-f]{6}$/.test(customPalette[item.field])
                              ? customPalette[item.field]
                              : '#0d9488'
                          }
                          onChange={(e) =>
                            handleUpdateCustomColor(item.field, e.target.value)
                          }
                          className="h-7 w-8 shrink-0 cursor-pointer rounded border border-stone-700 bg-transparent p-0"
                        />
                        <input
                          type="text"
                          value={customPalette[item.field]}
                          maxLength={7}
                          onChange={(e) =>
                            handleUpdateCustomColor(item.field, e.target.value)
                          }
                          placeholder="#000000"
                          className="w-full min-w-0 rounded border border-stone-700 bg-stone-950 px-2 py-1 font-mono text-[11px] text-stone-100 outline-none focus:border-amber-500"
                        />
                      </div>
                      <span className="block font-mono text-[9px] text-stone-500 truncate">
                        {item.token}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Textos Institucionais e Conformidade CFMV */}
          <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-950/70 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-stone-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              3. Posicionamento, Horários &amp; Conformidade CFMV
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-stone-400">
                Headline Principal (Hero)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-stone-400">
                    Horário de Funcionamento
                  </label>
                  {lead.opening_hours && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                      Extraído do Maps
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={officeHours}
                  onChange={(e) => setOfficeHours(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-400">
                  Sigla no Header
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={monogramInitials}
                  onChange={(e) => setMonogramInitials(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 font-mono text-xs font-bold text-amber-400 outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {selectedPillars.veterinary && (
              <div>
                <label className="block text-[11px] font-semibold text-emerald-400">
                  Responsável Técnico Médico(a) Veterinário(a) (CFMV Res. 1.649/2025):
                </label>
                <input
                  type="text"
                  value={crmvNumber}
                  onChange={(e) => setCrmvNumber(e.target.value)}
                  placeholder="Ex: Resp. Técnico Dr. Rafael Almeida — CRMV/MG 12.345"
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>

          {/* 4. Precificação Opcional de Serviços (Banho & Tosa, Planos e Táxi Dog) */}
          <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-stone-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                4. Precificação Opcional de Serviços (Banho, Planos &amp; Táxi Dog)
              </span>
              <span className="rounded-full border border-stone-700 bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                Vazio = Consultar Valor no WhatsApp
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Se deixados em branco, o template oculta valores numéricos e foca exclusivamente nos CTAs de agendamento via WhatsApp.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-300">
                  Banho &amp; Tosa (A partir de):
                </label>
                <input
                  type="text"
                  value={groomingPrice}
                  onChange={(e) => setGroomingPrice(e.target.value)}
                  placeholder="Ex: A partir de R$ 60"
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-300">
                  Planos Semanais / Mensais:
                </label>
                <input
                  type="text"
                  value={plansPrice}
                  onChange={(e) => setPlansPrice(e.target.value)}
                  placeholder="Ex: Planos a partir de R$ 239,90/mês"
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-300">
                  Valor / Taxa do Táxi Dog:
                </label>
                <input
                  type="text"
                  value={taxiDogPrice}
                  onChange={(e) => setTaxiDogPrice(e.target.value)}
                  disabled={!taxiDogEnabled}
                  placeholder={taxiDogEnabled ? 'Ex: Sob consulta por bairro ou R$ 20' : 'Táxi Dog desativado'}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 outline-none focus:border-emerald-600 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* 5. Gestão de Prova Social e Avaliações Reais */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-stone-300">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  5. Prova Social &amp; Avaliações do Google Maps
                </span>
                {lead.extracted_reviews && lead.extracted_reviews.length > 0 && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    {lead.extracted_reviews.length} avaliações reais importadas do Maps
                  </span>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] font-semibold text-stone-200 hover:border-amber-500/60">
                <input
                  type="checkbox"
                  checked={includeRealReviews}
                  onChange={(e) => setIncludeRealReviews(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-amber-500"
                />
                <span>Incluir avaliações reais em texto</span>
              </label>
            </div>

            {!includeRealReviews ? (
              <div className="rounded-lg border border-stone-800 bg-stone-950/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>
                      Nota {lead.rating > 0 ? lead.rating.toFixed(1) : '4.9'} ({lead.reviews_count > 0 ? lead.reviews_count : 64} avaliações verificadas)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    Banner Oficial Maps Ativo
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Exporta <code>testimonials: []</code> acionando automaticamente o Banner de Reputação Verificada do Google Maps (zero depoimentos inventados).
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-amber-600/30 bg-stone-950/90 p-3.5">
                <p className="text-[11px] text-amber-300">
                  {lead.extracted_reviews && lead.extracted_reviews.length > 0
                    ? 'Avaliações extraídas automaticamente da ficha do Google Maps (você pode revisar ou editar antes de exportar):'
                    : 'Cole abaixo até 3 comentários reais extraídos literalmente da ficha do Google Maps deste estabelecimento:'}
                </p>
                {realReviews.map((rev, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-2 rounded-lg border border-stone-800 bg-stone-900/70 p-2.5 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-4 space-y-1">
                      <input
                        type="text"
                        value={rev.author}
                        onChange={(e) => handleUpdateReview(idx, 'author', e.target.value)}
                        placeholder={`Nome do Tutor ${idx + 1}`}
                        className="w-full rounded border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-500"
                      />
                      <select
                        value={rev.stars}
                        onChange={(e) =>
                          handleUpdateReview(idx, 'stars', Number(e.target.value))
                        }
                        className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] text-amber-400 outline-none"
                      >
                        <option value={5}>★★★★★ (5 estrelas)</option>
                        <option value={4}>★★★★☆ (4 estrelas)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-8">
                      <textarea
                        rows={2}
                        value={rev.text}
                        onChange={(e) => handleUpdateReview(idx, 'text', e.target.value)}
                        placeholder="Cole o texto autêntico da avaliação no Google Maps..."
                        className="w-full rounded border border-stone-700 bg-stone-950 p-2 text-xs text-stone-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] p-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-tactical-secondary px-4 py-2 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Limpar rascunho deste lead e restaurar configuração original"
              className="btn-tactical-secondary px-3.5 py-2 text-xs text-stone-400 hover:text-emerald-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Padrões
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="btn-tactical-emerald px-6 py-2.5 text-xs"
          >
            <Download className="h-4 w-4" />
            Gerar e Baixar site.config.json
          </button>
        </div>
      </div>
    </div>
  )
}
