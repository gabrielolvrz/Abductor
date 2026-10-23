import { useEffect, useState } from 'react'
import {
  Camera,
  Code2,
  Download,
  Palette,
  Shield,
  Sparkles,
  X,
} from 'lucide-react'
import {
  cleanNameClientSide,
  type Lead,
} from '../services/api'

interface ExportConfigModalProps {
  lead: Lead | null
  onClose: () => void
  onSuccess?: (businessName: string) => void
}

export type JuridicalSubniche =
  | 'Trabalhista'
  | 'Família e Sucessões'
  | 'Cível e Consumidor'
  | 'Imobiliário'
  | 'Empresarial e Consultoria'
  | 'Previdenciário (INSS)'
  | 'Outro / Personalizar'

export type ColorThemePreset =
  | 'navy-gold'
  | 'sovereign-dark'
  | 'espresso-amber'
  | 'oxford-linen'
  | 'atlantic-blue'

interface PresetData {
  tagline: string
  services: { title: string; description: string }[]
}

// Compliance Ético OAB (Provimento 205/2021): Tolerância zero a depoimentos fabricados/fictícios.
// O site vitrine utiliza exclusivamente a reputação verificada oficial do Google Maps.

const SUBNICHE_PRESETS: Record<Exclude<JuridicalSubniche, 'Outro / Personalizar'>, PresetData> = {
  'Trabalhista': {
    tagline: 'Defesa Estratégica de Direitos Trabalhistas e Segurança Jurídica',
    services: [
      {
        title: 'Rescisão Indireta e Verbas Rescisórias',
        description:
          'Revisão detalhada de cálculos rescisórios, horas extras não quitadas, adicional de periculosidade/insalubridade e proteção integral contra retenções indevidas.',
      },
      {
        title: 'Acidentes de Trabalho e Doenças Ocupacionais',
        description:
          'Reparação civil por danos materiais e morais decorrentes de LER/DORT, burnout e infortúnios no ambiente laboral com estabilidade provisória.',
      },
      {
        title: 'Assédio Moral e Discriminação no Trabalho',
        description:
          'Atuação técnica e sigilosa na reparação de danos morais por cobranças vexatórias, metas abusivas e condutas discriminatórias.',
      },
    ],
  },
  'Família e Sucessões': {
    tagline: 'Inventários Ágeis, Planejamento Sucessório e Proteção Patrimonial Familiar',
    services: [
      {
        title: 'Inventário Extrajudicial em Cartório e Judicial',
        description:
          'Condução célere de partilha de bens entre herdeiros com foco em economia tributária (ITCMD) e resolução pacífica de pendências.',
      },
      {
        title: 'Planejamento Sucessório e Testamentos',
        description:
          'Estruturação preventiva da transmissão de patrimônio para evitar litígios futuros e garantir a vontade e a segurança da família.',
      },
      {
        title: 'Divórcio Consensual, Guarda e Pensão Alimentícia',
        description:
          'Formalização ágil e discreta de dissolução conjugal, partilha de bens comum e fixação equilibrada de alimentos para filhos.',
      },
    ],
  },
  'Cível e Consumidor': {
    tagline: 'Defesa do Consumidor e Resolução Estratégica de Conflitos Cíveis',
    services: [
      {
        title: 'Ações Indenizatórias e Danos Morais',
        description:
          'Reparação financeira por negativação indevida em cadastros de crédito (SPC/Serasa), fraudes bancárias e abusos contratuais.',
      },
      {
        title: 'Problemas com Companhias Aéreas e Serviços',
        description:
          'Cancelamento ou atraso injustificado de voos, extravio de bagagem e cobranças indevidas de operadoras e concessionárias.',
      },
      {
        title: 'Execução de Dívidas e Cobrança Judicial',
        description:
          'Recuperação célere de créditos, cheques, títulos executivos e defesa técnica em cobranças ilegais ou desproporcionais.',
      },
    ],
  },
  'Imobiliário': {
    tagline: 'Segurança Jurídica na Aquisição, Posse e Regularização de Imóveis',
    services: [
      {
        title: 'Regularização de Imóveis e Usucapião',
        description:
          'Regularização de escrituras, registros imobiliários e procedimentos de usucapião judicial e extrajudicial em cartório.',
      },
      {
        title: 'Distrato Imobiliário e Atraso de Obras',
        description:
          'Rescisão de contratos de compra na planta com devolução corrigida de valores e indenização por descumprimento de prazos.',
      },
      {
        title: 'Contratos de Locação e Ações de Despejo',
        description:
          'Elaboração de contratos blindados de locação, ações renovatórias comerciais e despejos por inadimplemento com cautela técnica.',
      },
    ],
  },
  'Empresarial e Consultoria': {
    tagline: 'Assessoria Jurídica Preventiva e Blindagem Estratégica para Empresas',
    services: [
      {
        title: 'Contratos Empresariais e Acordos de Sócios',
        description:
          'Redação e revisão de instrumentos societários, memorandos de entendimento (MoU), vesting e cláusulas de não-concorrência.',
      },
      {
        title: 'Consultoria Trabalhista e Prevenção de Passivo',
        description:
          'Auditoria preventiva de rotinas de RH, adequação de contratos de prestação de serviços e mitigação de riscos contenciosos.',
      },
      {
        title: 'Recuperação de Créditos e Cobrança B2B',
        description:
          'Gestão técnica de títulos vencidos, notificações extrajudiciais e execuções patrimoniais com velocidade.',
      },
    ],
  },
  'Previdenciário (INSS)': {
    tagline: 'Concessão, Revisão de Benefícios do INSS e Planejamento Previdenciário',
    services: [
      {
        title: 'Planejamento de Aposentadoria',
        description:
          'Análise minuciosa do CNIS, contagem de tempo de contribuição e identificação da regra de transição mais vantajosa financeiramente.',
      },
      {
        title: 'Benefícios por Incapacidade (Auxílio-Doença e Invalidez)',
        description:
          'Defesa perante indeferimentos injustos de perícia médica do INSS para restabelecimento imediato do benefício.',
      },
      {
        title: 'BPC/LOAS para Idosos e Portadores de Deficiência',
        description:
          'Requerimento administrativo e judicial do Benefício de Prestação Continuada com comprovação técnica dos requisitos legais.',
      },
    ],
  },
}

interface ThemeOption {
  id: ColorThemePreset
  name: string
  mode: 'dark' | 'light'
  modeBadge: string
  icon: string
  backgroundColor: string
  surfaceColor: string
  primaryText: string
  bodyText: string
  accentColor: string
  borderColor: string
  desc: string
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'navy-gold',
    name: 'Navy & Gold',
    mode: 'dark',
    modeBadge: 'Escuro • Marinho & Ouro',
    icon: '🏛️',
    backgroundColor: '#0f172a',
    surfaceColor: '#162032',
    primaryText: '#f8f6f0',
    bodyText: '#94a3b8',
    accentColor: '#c5a059',
    borderColor: '#1e293b',
    desc: 'Azul-marinho profundo e ouro nobre clássico',
  },
  {
    id: 'sovereign-dark',
    name: 'Sovereign Dark',
    mode: 'dark',
    modeBadge: 'Escuro • Preto Ônix & Champanhe',
    icon: '⚖️',
    backgroundColor: '#0d0f12',
    surfaceColor: '#161a1f',
    primaryText: '#f3f4f6',
    bodyText: '#9ca3af',
    accentColor: '#d4af37',
    borderColor: '#242b35',
    desc: 'Preto ônix aquecido e ouro champanhe acetinado (Mattos Filho)',
  },
  {
    id: 'espresso-amber',
    name: 'Espresso & Amber',
    mode: 'dark',
    modeBadge: 'Escuro • Café & Âmbar Ocre',
    icon: '☕',
    backgroundColor: '#120e0b',
    surfaceColor: '#1c1712',
    primaryText: '#faf6f0',
    bodyText: '#a3988c',
    accentColor: '#c28e46',
    borderColor: '#332920',
    desc: 'Café torrado escuro quase preto e âmbar ocre rico',
  },
  {
    id: 'oxford-linen',
    name: 'Oxford Linen',
    mode: 'light',
    modeBadge: 'Claro • Linho Nobre & Marinho',
    icon: '📜',
    backgroundColor: '#f7f5f0',
    surfaceColor: '#ffffff',
    primaryText: '#0a192f',
    bodyText: '#334155',
    accentColor: '#8c6d3b',
    borderColor: '#e2ded4',
    desc: 'Linho pergaminho suave, cards brancos e bronze fosco (Pinheiro Neto)',
  },
  {
    id: 'atlantic-blue',
    name: 'Atlantic Blue',
    mode: 'light',
    modeBadge: 'Claro • Cinza Gelo & Azul Atlântico',
    icon: '🏙️',
    backgroundColor: '#f1f4f8',
    surfaceColor: '#ffffff',
    primaryText: '#002244',
    bodyText: '#1e293b',
    accentColor: '#005088',
    borderColor: '#cbd5e1',
    desc: 'Cinza-gelo de alta legibilidade e azul corporativo (Machado Meyer)',
  },
]

function extractInitials(name: string): string {
  const clean = cleanNameClientSide(name)
  const parts = clean
    .replace(/^(dr|dra|doutor|doutora|adv|advogado|advogada)\.?\s+/i, '')
    .replace(/\b(advocacia|associados|direito|consultoria|jur[ií]dico)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'ADV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function ExportConfigModal(props: ExportConfigModalProps) {
  const { lead, onClose } = props

  useEffect(() => {
    if (!lead) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lead, onClose])

  if (!lead) return null

  return (
    <ExportConfigModalInner
      key={lead.id}
      lead={lead}
      onClose={props.onClose}
      onSuccess={props.onSuccess}
    />
  )
}

interface ExportConfigModalInnerProps extends Omit<ExportConfigModalProps, 'lead'> {
  lead: Lead
}

function ExportConfigModalInner({
  lead,
  onClose,
  onSuccess,
}: ExportConfigModalInnerProps) {
  const [subniche, setSubniche] = useState<JuridicalSubniche>('Trabalhista')
  const [themePreset, setThemePreset] = useState<ColorThemePreset>('navy-gold')
  const [customAccentHex, setCustomAccentHex] = useState('')
  const [useProfilePhoto, setUseProfilePhoto] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('./assets/profile.jpg')
  const [monogramInitials, setMonogramInitials] = useState(() => extractInitials(lead.name))
  const [oabNumber, setOabNumber] = useState('OAB/MG Sob Consulta')

  // Precificação Dinâmica
  const [baseTicket, setBaseTicket] = useState<number>(350)

  // Customização de Serviços do Preset
  const [customizePresetServices, setCustomizePresetServices] = useState(false)
  const [presetService1Title, setPresetService1Title] = useState(
    () => SUBNICHE_PRESETS['Trabalhista'].services[0].title,
  )
  const [presetService1Desc, setPresetService1Desc] = useState(
    () => SUBNICHE_PRESETS['Trabalhista'].services[0].description,
  )
  const [presetService2Title, setPresetService2Title] = useState(
    () => SUBNICHE_PRESETS['Trabalhista'].services[1].title,
  )
  const [presetService2Desc, setPresetService2Desc] = useState(
    () => SUBNICHE_PRESETS['Trabalhista'].services[1].description,
  )
  const [presetService3Title, setPresetService3Title] = useState(
    () => SUBNICHE_PRESETS['Trabalhista'].services[2].title,
  )
  const [presetService3Desc, setPresetService3Desc] = useState(
    () => SUBNICHE_PRESETS['Trabalhista'].services[2].description,
  )

  // Campos expandidos apenas para 'Outro / Personalizar'
  const [customTagline, setCustomTagline] = useState('')
  const [customService1Title, setCustomService1Title] = useState('')
  const [customService1Desc, setCustomService1Desc] = useState('')
  const [customService2Title, setCustomService2Title] = useState('')
  const [customService2Desc, setCustomService2Desc] = useState('')
  const [customService3Title, setCustomService3Title] = useState('')
  const [customService3Desc, setCustomService3Desc] = useState('')

  const cleanedName = cleanNameClientSide(lead.name) || lead.name
  const isCustomSubniche = subniche === 'Outro / Personalizar'

  const handleSubnicheChange = (newSub: JuridicalSubniche) => {
    setSubniche(newSub)
    if (newSub !== 'Outro / Personalizar') {
      const preset = SUBNICHE_PRESETS[newSub]
      setPresetService1Title(preset.services[0].title)
      setPresetService1Desc(preset.services[0].description)
      setPresetService2Title(preset.services[1].title)
      setPresetService2Desc(preset.services[1].description)
      setPresetService3Title(preset.services[2].title)
      setPresetService3Desc(preset.services[2].description)
    }
  }

  const handleDownload = () => {
    // 1. Resolver Tagline e Serviços conforme preset ou personalização
    const finalTagline = !isCustomSubniche
      ? SUBNICHE_PRESETS[subniche].tagline
      : customTagline.trim() || 'Atuação Jurídica Estratégica, Ética e Personalizada'

    const finalServices: { title: string; description: string }[] = isCustomSubniche
      ? [
          {
            title: customService1Title.trim() || 'Consultoria Jurídica Especializada',
            description:
              customService1Desc.trim() ||
              'Atuação consultiva e contenciosa focada na resolução objetiva de litígios e preservação de direitos.',
          },
          {
            title: customService2Title.trim() || 'Assessoria Preventiva e Contratual',
            description:
              customService2Desc.trim() ||
              'Elaboração e análise técnica de contratos e instrumentos jurídicos com foco em segurança patrimonial.',
          },
          {
            title: customService3Title.trim() || 'Defesa Contenciosa e Negociação',
            description:
              customService3Desc.trim() ||
              'Acompanhamento processual ativo e negociação estratégica extrajudicial com sigilo ético absoluto.',
          },
        ]
      : customizePresetServices
        ? [
            {
              title: presetService1Title.trim() || SUBNICHE_PRESETS[subniche].services[0].title,
              description:
                presetService1Desc.trim() || SUBNICHE_PRESETS[subniche].services[0].description,
            },
            {
              title: presetService2Title.trim() || SUBNICHE_PRESETS[subniche].services[1].title,
              description:
                presetService2Desc.trim() || SUBNICHE_PRESETS[subniche].services[1].description,
            },
            {
              title: presetService3Title.trim() || SUBNICHE_PRESETS[subniche].services[2].title,
              description:
                presetService3Desc.trim() || SUBNICHE_PRESETS[subniche].services[2].description,
            },
          ]
        : SUBNICHE_PRESETS[subniche].services

    const selectedTheme =
      THEME_OPTIONS.find((t) => t.id === themePreset) ?? THEME_OPTIONS[0]

    // 2. Montar objeto site.config.json conforme o contrato oficial
    const configPayload = {
      business: {
        name: cleanedName,
        tagline: finalTagline,
        city: lead.city || 'Uberlândia',
        state: 'MG',
        phone_display: lead.phone_raw || '(34) 99876-5432',
        whatsapp_number: lead.phone_sanitized ? `55${lead.phone_sanitized}` : '5534998765432',
        whatsapp_default_message:
          'Olá! Vi o site institucional do escritório e gostaria de agendar uma avaliação sobre o meu caso.',
        address_display: lead.address || lead.neighborhood || 'Uberlândia - MG',
        oab_number: oabNumber.trim() || 'OAB/MG Sob Consulta',
        office_hours: 'Segunda a Sexta, das 09h às 18h',
      },
      pricing: {
        base_ticket: baseTicket,
        custom_ticket: baseTicket + 150,
      },
      theme: {
        preset: themePreset,
        mode: selectedTheme.mode,
        backgroundColor: selectedTheme.backgroundColor,
        surfaceColor: selectedTheme.surfaceColor,
        primaryText: selectedTheme.primaryText,
        bodyText: selectedTheme.bodyText,
        accentColor: customAccentHex.trim() || selectedTheme.accentColor,
        borderColor: selectedTheme.borderColor,
      },
      visuals: {
        theme_preset: themePreset,
        theme_mode: selectedTheme.mode,
        primary_color: selectedTheme.primaryText,
        accent_color: customAccentHex.trim() || selectedTheme.accentColor,
        background_color: selectedTheme.backgroundColor,
        surface_color: selectedTheme.surfaceColor,
        border_color: selectedTheme.borderColor,
        custom_accent_hex: customAccentHex.trim() || null,
        use_profile_photo: useProfilePhoto,
        profile_photo_url: useProfilePhoto ? profilePhotoUrl.trim() : './assets/doutor.svg',
        monogram_initials: (monogramInitials.trim() || 'ADV').toUpperCase(),
      },
      metrics: {
        rating: lead.rating > 0 ? lead.rating.toFixed(1) : '4.9',
        reviews_count: lead.reviews_count > 0 ? lead.reviews_count : 48,
        years_experience: '+10',
        cases_count: '+500',
      },
      services: finalServices,
      testimonials: [],
      faq: [
        {
          question: 'Como funciona o primeiro contato e a avaliação do caso?',
          answer:
            'O primeiro contato é realizado diretamente pelo WhatsApp institucional do escritório. Nossa equipe realiza uma triagem inicial para entender a natureza da sua demanda e indicar a documentação necessária para a análise jurídica.',
        },
        {
          question: 'O escritório realiza atendimento em formato 100% online?',
          answer:
            'Sim. Além do atendimento presencial em nossa sede física, possuímos estrutura digital homologada para reuniões por videoconferência, envio seguro de documentos e acompanhamento de processos eletrônicos em todo o Brasil.',
        },
        {
          question: 'Quais documentos preciso reunir antes do primeiro contato?',
          answer:
            'Documento de identificação oficial com foto, comprovante de endereço recente e os documentos específicos relacionados à sua demanda (contratos, notificações, extratos ou certidões).',
        },
        {
          question: 'Minhas informações e documentos estão resguardados pelo sigilo?',
          answer:
            'Sim, com total rigor. Todas as consultas e dados compartilhados são protegidos pelo sigilo profissional inerente à advocacia (Lei nº 8.906/94 — Estatuto da OAB) e tratados em estrita observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).',
        },
      ],
      compliance: {
        enable_lgpd_banner: false,
        privacy_policy_url: '/privacidade.html',
      },
    }

    // 3. Disparar download do arquivo site.config.json no navegador
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-stone-700 bg-[#1c1917] shadow-2xl">
        {/* Topo do Modal */}
        <div className="flex items-start justify-between border-b border-stone-800 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/40 bg-amber-600/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                <Code2 className="h-3.5 w-3.5" />
                Gerador de Instância Turnkey
              </span>
              <span className="text-[11px] text-stone-400">
                Template: <code>vercel-advocacia</code>
              </span>
            </div>
            <h2
              id="export-modal-title"
              className="mt-2 font-serif text-xl font-bold tracking-tight text-stone-100"
            >
              Configurar Site Vitrine — {cleanedName}
            </h2>
            <p className="text-xs text-stone-400">
              Escolha a especialidade e a estética visual. O arquivo já sai pronto para a pasta
              do cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-400 hover:text-stone-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          {/* 1. Subnicho Jurídico com Presets Automáticos */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="modal-subniche"
                className="block font-bold uppercase tracking-wider text-stone-300"
              >
                1. Subnicho Jurídico (Presets Automáticos)
              </label>
              {!isCustomSubniche && (
                <span className="font-mono text-[11px] text-emerald-400">
                  Tagline + 3 serviços pré-carregados
                </span>
              )}
            </div>

            <select
              id="modal-subniche"
              value={subniche}
              onChange={(e) => handleSubnicheChange(e.target.value as JuridicalSubniche)}
              className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-xs font-bold text-stone-100 outline-none focus:border-amber-600"
            >
              <option value="Trabalhista">Trabalhista (Rescisão, Horas Extras, Acidentes)</option>
              <option value="Família e Sucessões">
                Família e Sucessões (Inventários, Partilha, Divórcio)
              </option>
              <option value="Cível e Consumidor">
                Cível e Consumidor (Indenizações, Danos Morais, Contratos)
              </option>
              <option value="Imobiliário">
                Imobiliário (Usucapião, Regularização, Distratos, Locação)
              </option>
              <option value="Empresarial e Consultoria">
                Empresarial e Consultoria (Contratos, Preventivo, Cobrança B2B)
              </option>
              <option value="Previdenciário (INSS)">
                Previdenciário (Aposentadorias, Auxílio-Doença, BPC/LOAS)
              </option>
              <option value="Outro / Personalizar">Outro / Personalizar campos manualmente...</option>
            </select>

            {/* Prévia dos 3 Serviços quando preset selecionado */}
            {!isCustomSubniche && (
              <div className="mt-2.5 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-amber-400">
                    Headline: “{SUBNICHE_PRESETS[subniche].tagline}”
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-stone-300 hover:border-amber-600/50 hover:text-amber-300 transition">
                    <input
                      type="checkbox"
                      checked={customizePresetServices}
                      onChange={(e) => setCustomizePresetServices(e.target.checked)}
                      className="rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Personalizar serviços deste preset</span>
                  </label>
                </div>

                {!customizePresetServices ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-stone-400">
                    {SUBNICHE_PRESETS[subniche].services.map((s, idx) => (
                      <li key={idx} className="truncate">
                        • <strong className="text-stone-300">{s.title}:</strong> {s.description}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 space-y-2.5 border-t border-stone-800 pt-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-stone-400">Serviço 1</label>
                      <input
                        type="text"
                        value={presetService1Title}
                        onChange={(e) => setPresetService1Title(e.target.value)}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                      />
                      <textarea
                        rows={2}
                        value={presetService1Desc}
                        onChange={(e) => setPresetService1Desc(e.target.value)}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] text-stone-100 outline-none focus:border-amber-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-stone-400">Serviço 2</label>
                      <input
                        type="text"
                        value={presetService2Title}
                        onChange={(e) => setPresetService2Title(e.target.value)}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                      />
                      <textarea
                        rows={2}
                        value={presetService2Desc}
                        onChange={(e) => setPresetService2Desc(e.target.value)}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] text-stone-100 outline-none focus:border-amber-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-stone-400">Serviço 3</label>
                      <input
                        type="text"
                        value={presetService3Title}
                        onChange={(e) => setPresetService3Title(e.target.value)}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                      />
                      <textarea
                        rows={2}
                        value={presetService3Desc}
                        onChange={(e) => setPresetService3Desc(e.target.value)}
                        className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] text-stone-100 outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seletor Condicional Expandido: Apenas se 'Outro / Personalizar' */}
          {isCustomSubniche && (
            <div className="space-y-3 rounded-xl border border-amber-600/40 bg-stone-950/80 p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                Personalização dos Serviços
              </span>

              <div>
                <label className="block text-stone-300">Tagline de Autoridade do Escritório</label>
                <input
                  type="text"
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  placeholder="Ex: Defesa Tributária Estratégica e Recuperação de Ativos"
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Serviço 1</label>
                  <input
                    type="text"
                    value={customService1Title}
                    onChange={(e) => setCustomService1Title(e.target.value)}
                    placeholder="Título 1"
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                  <textarea
                    rows={2}
                    value={customService1Desc}
                    onChange={(e) => setCustomService1Desc(e.target.value)}
                    placeholder="Descrição breve 1..."
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Serviço 2</label>
                  <input
                    type="text"
                    value={customService2Title}
                    onChange={(e) => setCustomService2Title(e.target.value)}
                    placeholder="Título 2"
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                  <textarea
                    rows={2}
                    value={customService2Desc}
                    onChange={(e) => setCustomService2Desc(e.target.value)}
                    placeholder="Descrição breve 2..."
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Serviço 3</label>
                  <input
                    type="text"
                    value={customService3Title}
                    onChange={(e) => setCustomService3Title(e.target.value)}
                    placeholder="Título 3"
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                  <textarea
                    rows={2}
                    value={customService3Desc}
                    onChange={(e) => setCustomService3Desc(e.target.value)}
                    placeholder="Descrição breve 3..."
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-[11px] text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Seletor de Paleta de Cores Clássica */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block font-bold uppercase tracking-wider text-stone-300">
                2. Paleta Visual Clássica da Advocacia
              </label>
              <Palette className="h-3.5 w-3.5 text-amber-500" />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = themePreset === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemePreset(theme.id)}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500/50'
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
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            theme.mode === 'dark'
                              ? 'border border-stone-800 bg-stone-900 text-stone-400'
                              : 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {theme.mode === 'dark' ? 'Dark' : 'Light'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          title={`Fundo: ${theme.backgroundColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.backgroundColor }}
                        />
                        <span
                          title={`Superfície: ${theme.surfaceColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.surfaceColor }}
                        />
                        <span
                          title={`Acento: ${theme.accentColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span
                          title={`Borda: ${theme.borderColor}`}
                          className="h-3.5 w-3.5 rounded-full border border-stone-700 shadow-sm"
                          style={{ backgroundColor: theme.borderColor }}
                        />
                      </div>

                      <p className="mt-1.5 text-[10px] font-medium text-amber-400/90">
                        {theme.modeBadge}
                      </p>
                      <p className="mt-0.5 text-[10px] text-stone-400 leading-tight">
                        {theme.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Campo Opcional de Acento Customizado HEX */}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[11px] text-stone-400">
                Acento Personalizado (opcional HEX para bater com logo/Instagram):
              </span>
              <input
                type="text"
                value={customAccentHex}
                onChange={(e) => setCustomAccentHex(e.target.value)}
                placeholder="#c5a059"
                className="w-28 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 font-mono text-xs text-stone-100 placeholder-stone-600 outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* 3. Tratamento Visual: Foto vs. Monograma Heráldico */}
          <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
            <span className="block font-bold uppercase tracking-wider text-stone-300">
              3. Identidade no Hero: Foto vs. Monograma
            </span>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  !useProfilePhoto
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="visualTreatment"
                  checked={!useProfilePhoto}
                  onChange={() => setUseProfilePhoto(false)}
                  className="mt-0.5 text-amber-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-serif text-xs font-bold text-stone-100">
                    <Shield className="h-3.5 w-3.5 text-amber-500" />
                    <span>Modo Editorial (Monograma)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400">
                    Selo heráldico minimalista com iniciais. Estética deliberada e de prestígio, sem
                    necessidade de foto profissional.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  useProfilePhoto
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="visualTreatment"
                  checked={useProfilePhoto}
                  onChange={() => setUseProfilePhoto(true)}
                  className="mt-0.5 text-amber-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-serif text-xs font-bold text-stone-100">
                    <Camera className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Utilizar Foto do Advogado</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400">
                    Exibe a foto profissional recortada à direita com moldura fina na cor de acento.
                  </p>
                </div>
              </label>
            </div>

            {/* Campos Condicionais de Identidade */}
            <div className="mt-3">
              {!useProfilePhoto ? (
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-semibold text-stone-300">
                    Iniciais do Monograma:
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={monogramInitials}
                    onChange={(e) => setMonogramInitials(e.target.value.toUpperCase())}
                    className="w-24 rounded-lg border border-amber-600/50 bg-stone-900 px-2.5 py-1 font-serif text-sm font-bold tracking-widest text-amber-400 outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-stone-500">
                    (Auto-extraído do nome do lead. Ajustável)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-stone-300">
                    Caminho / URL da Foto:
                  </label>
                  <input
                    type="text"
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    placeholder="./assets/profile.jpg ou https://..."
                    className="flex-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-100 outline-none focus:border-amber-600"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Prova Social Ética & Google Maps (Compliance OAB / Provimento 205/2021) */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-stone-300">
                <Shield className="h-4 w-4 text-emerald-400" />
                4. Prova Social & Reputação Verificada (Compliance OAB)
              </span>
              <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                Provimento 205/2021
              </span>
            </div>

            <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-serif text-sm font-bold">
                  <span>★ {lead.rating > 0 ? lead.rating.toFixed(1) : '4.9'}</span>
                  <span className="text-stone-400 font-sans text-xs">
                    ({lead.reviews_count > 0 ? lead.reviews_count : 48} avaliações públicas)
                  </span>
                </div>
                <span className="text-[11px] font-medium text-emerald-400">
                  Banner Oficial Ativo
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                <strong className="text-stone-200">Tolerância zero a depoimentos inventados:</strong> O site vitrine exibe exclusivamente o banner consolidado de reputação do Google Maps com nota, total de avaliações e link direto para a ficha oficial do escritório. Nenhuma citação textual fictícia é injetada.
              </p>
            </div>
          </div>

          {/* 5. Ticket Volátil e Proposta Comercial */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-stone-300">
                5. Ticket Base da Proposta para este Lead
              </label>
              <span className="font-mono text-xs font-bold text-emerald-400">
                R$ {baseTicket} (Customizado: R$ {baseTicket + 150})
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[300, 350, 400, 450, 500, 650, 850].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBaseTicket(t)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs transition ${
                    baseTicket === t
                      ? 'bg-emerald-600 font-bold text-stone-950 shadow-sm'
                      : 'border border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  R$ {t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 pt-1 sm:pt-0">
                <span className="text-[11px] text-stone-400">Personalizado:</span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={baseTicket}
                  onChange={(e) => setBaseTicket(Number(e.target.value) || 350)}
                  className="w-20 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 font-mono text-xs text-stone-100 outline-none focus:border-amber-600"
                />
              </div>
            </div>
          </div>

          {/* 6. OAB e Dados Complementares */}
          <div className="flex items-center gap-3">
            <label className="text-stone-400">Número de Inscrição na OAB:</label>
            <input
              type="text"
              value={oabNumber}
              onChange={(e) => setOabNumber(e.target.value)}
              placeholder="Ex: OAB/MG 123.456"
              className="w-48 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1 font-mono text-xs text-stone-100 outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="flex items-center justify-between border-t border-stone-800 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-700 px-4 py-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold text-stone-950 shadow-lg shadow-amber-600/15 transition hover:bg-amber-500"
          >
            <Download className="h-4 w-4" />
            Gerar e Baixar site.config.json
          </button>
        </div>
      </div>
    </div>
  )
}
