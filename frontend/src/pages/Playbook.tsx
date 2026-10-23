import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  BookOpen,
  Check,
  CheckSquare,
  Copy,
  DollarSign,
  Layers,
  MessageSquareText,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react'
import {
  HOMOLOGATED_CATEGORIES,
  createNiche,
  deleteNiche,
  listNiches,
  listScripts,
  type Niche,
  type PitchScript,
} from '../services/api'

interface ChecklistItem {
  id: string
  category: 'whatsapp' | 'reuniao' | 'entrega'
  step: string
  detail: string
}

const OPERATIONAL_CHECKLISTS: ChecklistItem[] = [
  // Checklist de WhatsApp
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
  // Checklist de Reunião
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
    step: '2. Demonstrar o banner LGPD e a página de Privacidade nativa',
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
  // Checklist de Entrega
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
    step: '2. Duplicar templates/vercel-advocacia/base para clientes/<nome>/',
    detail:
      'Copie a pasta base/ para clientes/<nome_do_lead>, cole o site.config.json gerado e revise os dados da banca.',
  },
  {
    id: 'del-3',
    category: 'entrega',
    step: '3. Publicar via Vercel CLI e testar clique no CTA do WhatsApp',
    detail:
      'Rode `vercel --prod --yes` na pasta da instância e clique no botão flutuante para confirmar o redirecionamento wa.me/55.',
  },
]

const OBJECTION_COUNTER_MATRIX = [
  {
    id: 'obj-instagram',
    tag: '“Já tenho Instagram / Linktree”',
    situation: 'Cliente acha que perfil social ou agregador de links substitui sede própria.',
    response:
      'Perfeito, o Instagram é ótimo para relacionamento! A questão é quem pesquisa no Google procurando especialista na sua cidade: quando o cliente clica na sua ficha e cai num Linktree ou precisa logar no Instagram, parte dessas pessoas desiste no caminho. O Site Vitrine One-Page funciona como sua sede própria no Google — carrega em 1 segundo, já vem com adequação LGPD nativa e joga o cliente filtrado direto no seu WhatsApp. Posso te mandar o link da prévia que montei para você testar no celular?',
  },
  {
    id: 'obj-caro',
    tag: '“Tá caro / Não está no orçamento”',
    situation: 'Cliente traumatizado com agências que cobram R$ 2.500 + mensalidade eterna.',
    response:
      'Compreendo totalmente. Inclusive criei esse formato justamente para eliminar custos fixos de agência: não tem mensalidade nem taxa de manutenção. O pacote Turnkey completo (já com aviso e Política de Privacidade LGPD inclusos) é pagamento único de R$ 350 (ou R$ 500 se quiser customização exclusiva de cores e fotos), e podemos dividir em 2x no Pix: metade hoje na aprovação da prévia e metade quando já estiver no ar no seu domínio.',
  },
  {
    id: 'obj-secretaria',
    tag: '“Fale com a secretária / recepção”',
    situation: 'Filtro de recepção ou secretária pedindo para enviar proposta por e-mail.',
    response:
      'Combinado! Para facilitar a avaliação do(a) Doutor(a) sem tomar tempo com PDF longo, eu já deixei uma demonstração funcional pronta no ar com os dados públicos da clínica/escritório. Vou te mandar o link aqui mesmo em 3 linhas: basta encaminhar no WhatsApp dele(a), abre em 3 segundos no celular.',
  },
  {
    id: 'obj-oab',
    tag: '“Não posso fazer propaganda (OAB)”',
    situation: 'Advogado receoso com as regras de publicidade do Provimento 205/2021 da OAB.',
    response:
      'Exatamente por isso nossa estrutura para Advocacia segue 100% o Provimento 205/2021 da OAB: zero promessa de resultado, zero mercantilização e foco estritamente informativo e institucional (áreas de atuação, formação, endereço e canal de atendimento), além de já vir com a blindagem LGPD nativa. É uma carta de apresentação sóbria para quem já procura seu nome no Google.',
  },
]

const CHECKLIST_STORAGE_KEY = 'abductor_playbook_checks_v2'

export function Playbook() {
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedNiche, setSelectedNiche] = useState<string>('Advogado')
  const [newNicheName, setNewNicheName] = useState<string>('')
  const [scripts, setScripts] = useState<PitchScript[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
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

  useEffect(() => {
    let active = true
    Promise.all([listNiches(), listScripts()])
      .then(([nichesData, scriptsData]) => {
        if (!active) return
        setNiches(nichesData)
        setScripts(scriptsData)
      })
      .catch(() => {
        // Silencioso
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

  const handleCopyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
  }

  const handleAddNiche = async (e: FormEvent) => {
    e.preventDefault()
    if (!newNicheName.trim()) return
    const created = await createNiche(newNicheName.trim())
    setNiches((prev) =>
      prev.some((n) => n.id === created.id) ? prev : [...prev, created],
    )
    setSelectedNiche(created.name)
    setNewNicheName('')
  }

  const handleRemoveNiche = async (niche: Niche) => {
    await deleteNiche(niche.id)
    setNiches((prev) => prev.filter((n) => n.id !== niche.id))
  }

  const nicheNames =
    niches.length > 0 ? niches.map((n) => n.name) : [...HOMOLOGATED_CATEGORIES]

  const filteredScripts = useMemo(() => {
    const target = selectedNiche.toLowerCase()
    const matches = scripts.filter(
      (s) =>
        s.category.toLowerCase() === target ||
        s.category.toLowerCase() === 'geral',
    )
    return matches.length > 0 ? matches : scripts
  }, [scripts, selectedNiche])

  const currentTabChecklist = useMemo(
    () => OPERATIONAL_CHECKLISTS.filter((item) => item.category === activeChecklistTab),
    [activeChecklistTab],
  )

  return (
    <main className="mx-auto max-w-[1680px] space-y-6 px-6 py-6">
      {/* Topo: Seletor de Nicho + Gestão Rápida de Categorias */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-100">
              Central de Playbooks, Scripts & Contra-Ataque de Objeções
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Oferta Base Turnkey: <strong className="text-emerald-400">R$ 350</strong> (com
            blindagem LGPD nativa inclusa) • Customização de Marca:{' '}
            <strong className="text-amber-400">+R$ 150 (Total R$ 500)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <label
              htmlFor="playbook-niche-select"
              className="text-xs font-bold uppercase tracking-wider text-stone-400"
            >
              Nicho Ativo:
            </label>
            <select
              id="playbook-niche-select"
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-bold text-stone-100 outline-none focus:border-amber-600"
            >
              {nicheNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={(e) => void handleAddNiche(e)} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newNicheName}
              onChange={(e) => setNewNicheName(e.target.value)}
              placeholder="Novo nicho..."
              className="w-36 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-600"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          </form>
        </div>
      </section>

      {/* Pills de Nichos Cadastrados */}
      {niches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Catálogo (/api/niches):
          </span>
          {niches.map((n) => {
            const active = n.name.toLowerCase() === selectedNiche.toLowerCase()
            return (
              <div
                key={n.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-amber-600 bg-amber-600/15 text-amber-300'
                    : 'border-stone-800 bg-[#1c1917] text-stone-300'
                }`}
              >
                <button type="button" onClick={() => setSelectedNiche(n.name)}>
                  {n.name}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemoveNiche(n)}
                  title={`Remover nicho ${n.name}`}
                  className="text-stone-500 hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Abordagens do Nicho Selecionado */}
      <section className="rounded-2xl border border-stone-800 bg-[#1c1917] p-5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-400" />
            <h2 className="font-serif text-lg font-bold text-stone-100">
              Roteiros de Abordagem — {selectedNiche}
            </h2>
          </div>
          <span className="font-mono text-xs text-stone-400">
            {filteredScripts.length} roteiro(s) disponível(is)
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredScripts.map((script) => {
            const formattedText = script.message_template.replace(/\\n/g, '\n')
            const isCopied = copiedId === script.id
            return (
              <article
                key={script.id}
                className="flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/90 p-4"
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
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopyText(script.id, formattedText)}
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

      {/* Matriz de Contra-Ataque de Objeções (1-Click Copy) + Escada de Valor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-stone-800 bg-[#1c1917] p-5 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              <h2 className="font-serif text-lg font-bold text-stone-100">
                Matriz de Contra-Ataque de Objeções (1-Click Copy)
              </h2>
            </div>
            <span className="text-xs text-stone-400">
              Clique em Copiar Resposta e cole direto no WhatsApp
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {OBJECTION_COUNTER_MATRIX.map((obj) => {
              const isCopied = copiedId === obj.id
              return (
                <article
                  key={obj.id}
                  className="flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-700"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-bold text-amber-400">
                        {obj.tag}
                      </h3>
                      <button
                        type="button"
                        onClick={() => void handleCopyText(obj.id, obj.response)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-stone-950 transition hover:bg-emerald-500"
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
                    <p className="mt-1 text-[11px] text-stone-400">{obj.situation}</p>
                    <p className="mt-3 rounded-lg border border-stone-800/80 bg-[#1c1917] p-3 text-xs leading-relaxed text-stone-200">
                      {obj.response}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Escada de Preços e Pacotes */}
        <section className="space-y-4 rounded-2xl border border-stone-800 bg-[#1c1917] p-5 lg:col-span-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <h2 className="font-serif text-lg font-bold text-stone-100">
              Tabela Oficial de Preços (Sem Mensalidade)
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-emerald-600/40 bg-emerald-600/10 p-3.5">
              <div className="flex items-center justify-between font-bold text-stone-100">
                <span>1. Base Turnkey Institucional</span>
                <span className="font-mono text-sm font-black tabular-nums text-emerald-400">
                  R$ 350
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-300">
                Site Vitrine One-Page perene + <strong>Blindagem LGPD nativa inclusa</strong> +
                botão WhatsApp direto. Entrega em 15 minutos via <code>site.config.json</code>.
              </p>
            </div>

            <div className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3.5">
              <div className="flex items-center justify-between font-bold text-stone-100">
                <span>2. Customização de Marca</span>
                <span className="font-mono text-sm font-black tabular-nums text-amber-400">
                  +R$ 150 (R$ 500)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-300">
                Ajuste fino de paleta de cores do escritório/clínica, tratamento de fotos
                autorais e copywriting sob medida das especialidades.
              </p>
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-950 p-3.5">
              <div className="flex items-center justify-between font-bold text-stone-100">
                <span>3. Upsell: Otimização GMB</span>
                <span className="font-mono text-sm font-black tabular-nums text-stone-200">
                  +R$ 150
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-400">
                Conexão da nova URL oficial na ficha do Google Maps, revisão de categorias e SEO
                local.
              </p>
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-950 p-3.5">
              <div className="flex items-center justify-between font-bold text-stone-100">
                <span>4. Upsell: Setup Google Ads Local</span>
                <span className="font-mono text-sm font-black tabular-nums text-stone-200">
                  +R$ 250
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-400">
                Configuração inicial de campanha de pesquisa local apontando para a nova
                One-Page.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Regra de Ouro LGPD
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              A adequação LGPD nunca é vendida separada: ela é o argumento matador já embutido no
              pacote base de R$ 350.
            </p>
          </div>
        </section>
      </div>

      {/* Checklists Operacionais Interativos (WhatsApp, Reunião, Entrega) */}
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
            <Terminal className="h-4 w-4 text-amber-500" />
            <span>Deploy Instantâneo da Prévia / Produção (Vercel CLI):</span>
          </div>
          <code className="font-mono text-xs text-emerald-400">
            cd templates/vercel-advocacia/base && vercel --prod --yes
          </code>
        </div>
      </section>
    </main>
  )
}
