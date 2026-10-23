import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

export const HOMOLOGATED_CATEGORIES = [
  'Advogado',
  'Dentista',
  'Corretor de Imóveis',
  'Psicólogo',
  'Clínica de Estética',
  'Veterinária',
  'Arquiteto',
] as const

export type PipelineStatus =
  | 'NOVO'
  | 'CONTATADO'
  | 'RESPONDEU'
  | 'NEGOCIANDO'
  | 'FECHADO'
  | 'RECUSADO'

export type WebsiteStatus = 'SEM_SITE' | 'IMPROVISADO' | 'QUEBRADO' | 'ATIVO'

export type PhoneType = 'MOBILE' | 'LANDLINE' | 'NONE' | 'INVALID' | 'UNKNOWN'

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

export type ProgressPhase =
  | 'IDLE'
  | 'SCRAPING'
  | 'PARSING'
  | 'VALIDATING'
  | 'SCORING'
  | 'COMPLETED'
  | 'FAILED'

export type NoteTag = 'IDEIA' | 'BUG' | 'LEMBRETE'

export interface ScoreBreakdown {
  website_status?: string
  website_points?: number
  phone_type?: string
  phone_points?: number
  reviews_count?: number
  reviews_points?: number
  niche_group?: number
  rating?: number
  rating_points?: number
  is_claimed?: boolean
  claimed_points?: number
  raw_score?: number
  final_score?: number
  hard_gate_triggered?: boolean
}

export interface Lead {
  id: string
  place_id: string
  name: string
  category: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  phone_raw: string | null
  phone_sanitized: string | null
  phone_type: PhoneType
  whatsapp_url: string | null
  google_maps_url: string | null
  website_url: string | null
  website_status: WebsiteStatus
  website_http_code: number | null
  instagram_url: string | null
  linkedin_url: string | null
  rating: number
  reviews_count: number
  is_claimed: boolean
  score: number
  score_breakdown: ScoreBreakdown
  pipeline_status: PipelineStatus
  notes: string | null
  created_manually: boolean
  is_manually_edited: boolean
  is_shared_phone: boolean
  days_in_status: number
  last_status_change_at: string | null
  found_at: string | null
  first_seen_at: string | null
  last_checked_at: string | null
}

export interface SearchCreateRequest {
  category: string
  city: string
  neighborhood?: string
  force_sync?: boolean
}

export interface SearchStatusResponse {
  search_id: string
  category: string
  city: string
  neighborhood: string
  job_status: JobStatus
  progress_phase: ProgressPhase
  elapsed_seconds: number
  total_leads: number
  last_scraped_at: string | null
  started_at: string | null
  created_at: string | null
  cached: boolean
  message: string | null
  leads: Lead[] | null
}

export interface LeadUpdateRequest {
  phone_raw?: string | null
  instagram_url?: string | null
  linkedin_url?: string | null
  website_url?: string | null
  website_status?: WebsiteStatus | null
  rating?: number | null
  reviews_count?: number | null
  notes?: string | null
}

export interface LeadCreateManualRequest {
  name: string
  category: string
  city: string
  neighborhood?: string
  address?: string
  phone_raw?: string
  website_url?: string
  instagram_url?: string
  rating?: number
  reviews_count?: number
  is_claimed?: boolean
  notes?: string
  search_id?: string | null
}

export type ScriptWebsiteCondition = 'SEM_SITE' | 'IMPROVISADO' | 'QUEBRADO' | 'GERAL'
export type UpsellFocus = 'NONE' | 'GMB' | 'ADS' | 'COMBO'

export interface PitchScript {
  id: string
  category: string
  website_condition: ScriptWebsiteCondition
  title: string
  message_template: string
  upsell_focus: UpsellFocus
  created_at: string
}

export interface PitchScriptCreateRequest {
  category: string
  website_condition: ScriptWebsiteCondition
  title: string
  message_template: string
  upsell_focus?: UpsellFocus
}

export interface PitchScriptUpdateRequest {
  category?: string
  website_condition?: ScriptWebsiteCondition
  title?: string
  message_template?: string
  upsell_focus?: UpsellFocus
}

export interface PitchInterpolateRequest {
  lead_id: string
  script_id?: string | null
  custom_template?: string | null
  price?: number | null
}

export interface PitchInterpolateResponse {
  lead_id: string
  script_id: string | null
  script_title: string
  cleaned_name: string
  interpolated_message: string
  whatsapp_trigger_url: string | null
  upsell_focus: string
}

export interface Niche {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface SystemNote {
  id: string
  title: string
  content: string | null
  tag: NoteTag
  is_done: boolean
  created_at: string
}

export interface SystemNoteCreateRequest {
  title: string
  content?: string | null
  tag?: NoteTag
}

export interface SystemNoteUpdateRequest {
  title?: string
  content?: string | null
  tag?: NoteTag
  is_done?: boolean
}

export interface SiteConfigExport {
  business: {
    name: string
    tagline: string
    city: string
    state: string
    phone_display: string
    whatsapp_number: string
    whatsapp_default_message?: string
    address_display: string
    google_maps_url?: string
    instagram_url?: string
  }
  metrics?: {
    rating: string
    reviews_count: number
  }
  compliance: {
    enable_lgpd_banner: boolean
    privacy_policy_url: string
    dpo_contact_email?: string
  }
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Funções de Cliente REST
// ---------------------------------------------------------------------------

export async function checkApiHealth(): Promise<boolean> {
  try {
    const { data } = await apiClient.get<{ status: string }>('/health')
    return data.status === 'ok'
  } catch {
    return false
  }
}

export async function listSearches(): Promise<SearchStatusResponse[]> {
  const { data } = await apiClient.get<SearchStatusResponse[]>('/searches')
  return data
}

export async function createOrGetSearch(
  payload: SearchCreateRequest,
): Promise<{ status: number; data: SearchStatusResponse }> {
  const response = await apiClient.post<SearchStatusResponse>('/searches', payload)
  return { status: response.status, data: response.data }
}

export async function getSearchStatus(searchId: string): Promise<SearchStatusResponse> {
  const { data } = await apiClient.get<SearchStatusResponse>(`/searches/${searchId}/status`)
  return data
}

export async function getSearchLeads(searchId: string): Promise<Lead[]> {
  const { data } = await apiClient.get<Lead[]>(`/searches/${searchId}/leads`)
  return data
}

export async function revalidateSearchUrls(searchId: string): Promise<SearchStatusResponse> {
  const { data } = await apiClient.post<SearchStatusResponse>(
    `/searches/${searchId}/revalidate`,
  )
  return data
}

export async function getPipelineLeads(): Promise<Lead[]> {
  const { data } = await apiClient.get<Lead[]>('/leads/pipeline')
  return data
}

export async function updateLeadPipeline(
  leadId: string,
  pipelineStatus: PipelineStatus,
): Promise<Lead> {
  const { data } = await apiClient.patch<Lead>(`/leads/${leadId}/pipeline`, {
    pipeline_status: pipelineStatus,
  })
  return data
}

export async function updateLeadDetails(
  leadId: string,
  payload: LeadUpdateRequest,
): Promise<Lead> {
  const { data } = await apiClient.patch<Lead>(`/leads/${leadId}`, payload)
  return data
}

export async function createManualLead(payload: LeadCreateManualRequest): Promise<Lead> {
  const { data } = await apiClient.post<Lead>('/leads', payload)
  return data
}

export async function exportLeadSiteConfig(leadId: string): Promise<SiteConfigExport> {
  const { data } = await apiClient.get<SiteConfigExport>(`/leads/${leadId}/export-config`)
  return data
}

export async function listScripts(params?: {
  category?: string
  website_condition?: string
}): Promise<PitchScript[]> {
  const { data } = await apiClient.get<PitchScript[]>('/scripts', { params })
  return data
}

export async function createScript(payload: PitchScriptCreateRequest): Promise<PitchScript> {
  const { data } = await apiClient.post<PitchScript>('/scripts', payload)
  return data
}

export async function updateScript(
  scriptId: string,
  payload: PitchScriptUpdateRequest,
): Promise<PitchScript> {
  const { data } = await apiClient.patch<PitchScript>(`/scripts/${scriptId}`, payload)
  return data
}

export async function interpolateScript(
  payload: PitchInterpolateRequest,
): Promise<PitchInterpolateResponse> {
  const { data } = await apiClient.post<PitchInterpolateResponse>(
    '/scripts/interpolate',
    payload,
  )
  return data
}

export async function listNiches(): Promise<Niche[]> {
  const { data } = await apiClient.get<Niche[]>('/niches')
  return data
}

export async function createNiche(name: string): Promise<Niche> {
  const { data } = await apiClient.post<Niche>('/niches', { name })
  return data
}

export async function deleteNiche(nicheId: string): Promise<void> {
  await apiClient.delete(`/niches/${nicheId}`)
}

export async function listNotes(): Promise<SystemNote[]> {
  const { data } = await apiClient.get<SystemNote[]>('/notes')
  return data
}

export async function createNote(payload: SystemNoteCreateRequest): Promise<SystemNote> {
  const { data } = await apiClient.post<SystemNote>('/notes', payload)
  return data
}

export async function updateNote(
  noteId: string,
  payload: SystemNoteUpdateRequest,
): Promise<SystemNote> {
  const { data } = await apiClient.patch<SystemNote>(`/notes/${noteId}`, payload)
  return data
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiClient.delete(`/notes/${noteId}`)
}

const CORPORATE_PATTERNS: RegExp[] = [
  /\bSociedade\s+Individual\s+de\s+Advocacia\b/gi,
  /\bSociedade\s+de\s+Advogados\b/gi,
  /\bSociedade\s+Simples\b/gi,
  /\bCNPJ[:\s\d./-]+/gi,
  /(?:(?<=\s)|(?<=^)|(?<=[-,/|]))\s*(?:S[./\s]*S|S[./\s]*A|LTDA|LIMITADA|EIRELI|E\.I\.R\.E\.L\.I\.|EPP|E\.P\.P\.|M\.E\.|ME)\.?(?=\s|$|[-,/|;:.)])/gi,
]

const LOWERCASE_CONNECTIVES = new Set([
  'de',
  'da',
  'do',
  'dos',
  'das',
  'e',
  'em',
  'para',
  'com',
  'por',
])

const SPECIAL_WORDS_MAP: Record<string, string> = {
  'dr.': 'Dr.',
  'dra.': 'Dra.',
  'dr': 'Dr.',
  'dra': 'Dra.',
  'oab': 'OAB',
  'cpf': 'CPF',
  'cnpj': 'CNPJ',
}

export function cleanNameClientSide(rawName: string | null | undefined): string {
  if (!rawName) return ''
  let cleaned = String(rawName).trim()
  if (!cleaned) return ''

  // 1. Remover padrões societários e de CNPJ
  for (const pattern of CORPORATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }

  // 2. Limpar pontuações e separadores residuais nas extremidades
  cleaned = cleaned.replace(/^[\s\-/,|•.:]+|[\s\-/,|•.:]+$/g, '').trim()

  // 3. Normalizar múltiplos espaços
  cleaned = cleaned.replace(/\s{2,}/g, ' ')

  // 4. Se a string estiver em CAIXA ALTA (ALL CAPS), converter para Title Case inteligente
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(cleaned)
  const isAllCaps = hasLetters && cleaned === cleaned.toUpperCase()

  if (isAllCaps) {
    const words = cleaned.split(' ')
    const formatted = words.map((w, idx) => {
      const wLower = w.toLowerCase()
      if (SPECIAL_WORDS_MAP[wLower]) {
        return SPECIAL_WORDS_MAP[wLower]
      }
      if (idx > 0 && LOWERCASE_CONNECTIVES.has(wLower)) {
        return wLower
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    cleaned = formatted.join(' ')
  }

  return cleaned
}

export function isAdvocaciaLead(lead: Lead): boolean {
  const cat = (lead.category || '').toLowerCase()
  const name = (lead.name || '').toLowerCase()
  return (
    cat.includes('advoga') ||
    cat.includes('jurid') ||
    cat.includes('direito') ||
    cat.includes('oab') ||
    name.includes('advocacia') ||
    name.includes('advogado') ||
    name.includes('advogada') ||
    name.includes('jurídico') ||
    name.includes('juridico')
  )
}

export function buildQuickPitchMessage(lead: Lead, price = 350): string {
  const cleanName = cleanNameClientSide(lead.name) || lead.name
  const city = lead.city || 'sua região'
  const reviewsText =
    lead.reviews_count > 0
      ? `com ${lead.reviews_count} avaliações excelentes (nota ${lead.rating.toFixed(1)})`
      : 'com presença destacada no Google Maps'

  if (lead.website_status === 'IMPROVISADO') {
    return `Olá, equipe de ${cleanName}, tudo bem? Vi o perfil de vocês no Google Maps ${reviewsText} em ${city}.\n\nPercebi que o link principal aponta para um agregador/rede social. Eu desenvolvo Sites Vitrine One-Page perenes (R$ ${price} em pagamento único, sem mensalidades e já com blindagem LGPD nativa).\n\nPosso te enviar uma prévia de 1 minuto para ver como ficaria no celular?`
  }
  if (lead.website_status === 'QUEBRADO') {
    return `Olá, equipe de ${cleanName}, tudo bem? Encontrei vocês no Google Maps ${reviewsText} em ${city}, mas notei que o site cadastrado está dando erro ao abrir.\n\nEu desenvolvo Sites Vitrine One-Page perenes (R$ ${price} base, sem mensalidade e com adequação LGPD nativa). Posso te mandar uma demonstração rápida pelo WhatsApp?`
  }
  return `Olá, equipe de ${cleanName}, tudo bem? Parabéns pelo perfil no Google Maps ${reviewsText} em ${city}!\n\nNotei que vocês ainda não têm um site institucional próprio conectado na ficha. Eu monto Sites Vitrine One-Page perenes (R$ ${price} em pagamento único, botão direto para WhatsApp e blindagem LGPD inclusa).\n\nPosso te mandar o link de uma prévia sem compromisso?`
}
