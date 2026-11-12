-- ============================================================================
-- ABDUCTOR - SCHEMA DE BANCO DE DADOS & SEEDS INICIAIS (PostgreSQL 16)
-- Arquivo: backend/init.sql
-- ============================================================================

-- Habilita comparação case-insensitive nativa para parâmetros de busca e categorias
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- 1. TABELA: searches (Histórico de Buscas e Controle de Jobs de Scraping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category CITEXT NOT NULL,
    city CITEXT NOT NULL,
    neighborhood CITEXT NOT NULL DEFAULT '',
    gosom_job_id VARCHAR(100),
    job_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    progress_phase VARCHAR(30) NOT NULL DEFAULT 'IDLE',
    total_leads INTEGER NOT NULL DEFAULT 0,
    last_scraped_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Impede buscas redundantes idênticas e viabiliza busca exata em cache
    CONSTRAINT uq_searches_query UNIQUE (category, city, neighborhood),
    
    -- Restrições de integridade do ciclo de execução
    CONSTRAINT chk_searches_status CHECK (
        job_status IN ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED')
    ),
    CONSTRAINT chk_searches_progress_phase CHECK (
        progress_phase IN ('IDLE', 'SCRAPING', 'PARSING', 'VALIDATING', 'SCORING', 'COMPLETED', 'FAILED')
    )
);

-- ============================================================================
-- 2. TABELA: leads (Entidade Global Única de Estabelecimento / Profissional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    address TEXT,
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    phone_raw VARCHAR(50),
    phone_sanitized VARCHAR(20),
    phone_type VARCHAR(15) NOT NULL DEFAULT 'UNKNOWN',
    whatsapp_url TEXT,
    google_maps_url TEXT,
    website_url TEXT,
    website_status VARCHAR(30) NOT NULL DEFAULT 'SEM_SITE',
    website_http_code INTEGER DEFAULT 0,
    instagram_url TEXT,
    linkedin_url TEXT,
    rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    opening_hours TEXT,
    extracted_reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INTEGER NOT NULL DEFAULT 0,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    pipeline_status VARCHAR(30) NOT NULL DEFAULT 'NOVO',
    deal_value INTEGER NOT NULL DEFAULT 350,
    notes TEXT,
    created_manually BOOLEAN NOT NULL DEFAULT FALSE,
    is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
    last_status_change_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints de validação de domínio
    CONSTRAINT chk_leads_phone_type CHECK (
        phone_type IN ('MOBILE', 'LANDLINE', 'INVALID', 'NONE', 'UNKNOWN')
    ),
    CONSTRAINT chk_leads_website_status CHECK (
        website_status IN ('SEM_SITE', 'IMPROVISADO', 'QUEBRADO', 'ATIVO')
    ),
    CONSTRAINT chk_leads_pipeline_status CHECK (
        pipeline_status IN ('NOVO', 'CONTATADO', 'RESPONDEU', 'NEGOCIANDO', 'FECHADO', 'RECUSADO')
    ),
    CONSTRAINT chk_leads_score_range CHECK (
        score >= 0 AND score <= 100
    )
);

-- ============================================================================
-- 3. TABELA: search_leads (Pivô N:N com Timestamp de Ocorrência)
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_leads (
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    found_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (search_id, lead_id)
);

-- ============================================================================
-- 4. TABELA: pitch_scripts (Roteiros de Abordagem e Quebra de Objeções)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pitch_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category CITEXT NOT NULL,
    script_type VARCHAR(30) NOT NULL DEFAULT 'PITCH',
    website_condition VARCHAR(30) NOT NULL DEFAULT 'GERAL',
    title VARCHAR(150) NOT NULL,
    situation TEXT,
    message_template TEXT NOT NULL,
    upsell_focus VARCHAR(50) NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pitch_script_type CHECK (
        script_type IN ('PITCH', 'OBJECTION')
    ),
    CONSTRAINT chk_pitch_condition CHECK (
        website_condition IN ('SEM_SITE', 'IMPROVISADO', 'QUEBRADO', 'GERAL')
    ),
    CONSTRAINT chk_pitch_upsell CHECK (
        upsell_focus IN ('NONE', 'GMB', 'ADS', 'COMBO')
    ),
    CONSTRAINT uq_pitch_scripts_category_condition_title UNIQUE (category, website_condition, title)
);

-- ============================================================================
-- 5. TABELA: niches (Gestão Centralizada de Categorias / Verticais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CITEXT NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. TABELA: system_notes (Backlog e Bloco de Notas Interno do Operador)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tag VARCHAR(50) DEFAULT 'IDEIA',
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. ÍNDICES DE ALTA PERFORMANCE (Otimização para Cockpit e Filtros)
-- ============================================================================

-- Listagem ordenada por oportunidade (maior score no topo)
CREATE INDEX IF NOT EXISTS idx_leads_score_desc ON leads(score DESC);

-- Filtro dinâmico por status do funil de vendas (ex: Ocultar 'CONTATADO')
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON leads(pipeline_status);

-- Ordenação rápida do Kanban por última movimentação de status
CREATE INDEX IF NOT EXISTS idx_leads_last_status_change ON leads(last_status_change_at DESC);

-- Filtro dinâmico por diagnóstico web (ex: Apenas 'IMPROVISADO' e 'SEM_SITE')
CREATE INDEX IF NOT EXISTS idx_leads_website_status ON leads(website_status);

-- Verificação em tempo O(1) de compartilhamento de número de telefone (Subquery EXISTS)
CREATE INDEX IF NOT EXISTS idx_leads_phone_sanitized ON leads(phone_sanitized) WHERE phone_sanitized IS NOT NULL;

-- Otimização do JOIN no carregamento do dashboard por busca ativa
CREATE INDEX IF NOT EXISTS idx_search_leads_lead_id ON search_leads(lead_id);

-- ============================================================================
-- 8. CARGA INICIAL DE SEEDS (Nichos Homologados & Scripts de Vendas)
-- ============================================================================

INSERT INTO niches (name, slug) VALUES
    ('Advogado', 'advogado'),
    ('Dentista', 'dentista'),
    ('Corretor de Imoveis', 'corretor-de-imoveis'),
    ('Psicologo', 'psicologo'),
    ('Clinica de Estetica', 'clinica-de-estetica'),
    ('Pet Shop & Veterinária', 'pet-shop-veterinaria'),
    ('Pet Shop', 'pet-shop'),
    ('Banho e Tosa', 'banho-e-tosa'),
    ('Veterinaria', 'veterinaria'),
    ('Arquiteto', 'arquiteto')
ON CONFLICT (name) DO NOTHING;

INSERT INTO pitch_scripts (category, website_condition, title, message_template, upsell_focus) VALUES
-- 1. Advogado com Linktree / WhatsApp
(
    'Advogado',
    'IMPROVISADO',
    'Advocacia - Transição de Linktree para Site Institucional One-Page',
    'Olá, Dr(a). {name}, tudo bem? Vi o perfil do seu escritório aqui no Google Maps com {reviews_count} avaliações excelentes na região de {city}.\n\nPercebi que o link principal do perfil cai em uma página genérica de links. Para o segmento jurídico, isso dispersa clientes qualificados e transmite informalidade.\n\nEu desenvolvo Sites Institucionais One-Page perenes para advogados — estruturas sóbrias, rápidas, sem mensalidades e já entregues com blindagem LGPD nativa inclusa no pacote base (Base Turnkey R$ 350 | Com Customização de Marca R$ 500).\n\nPosso te enviar uma prévia de 1 minuto para ver como ficaria no celular?',
    'GMB'
),
-- 2. Dentista / Clínica Odontológica sem site
(
    'Dentista',
    'SEM_SITE',
    'Odontologia - Site Vitrine Perene e Captação de Pacientes',
    'Olá, pessoal da {name}! Passando para parabenizar pela nota {rating} no Google Maps. A reputação da clínica em {city} é excelente.\n\nNotei que quando novos pacientes pesquisam pelo consultório no Google, não encontram um site oficial apresentando a estrutura, corpo clínico e tratamentos antes do contato.\n\nDesenvolvo Sites Vitrine One-Page institucionais, perenes e turnkey para clínicas odontológicas (Base Turnkey R$ 350 | Customização de Marca +R$ 150, total R$ 500), já com agendamento direto no WhatsApp e adequação LGPD nativa inclusa.\n\nVocê teria 2 minutos para dar uma olhada em um modelo funcional que preparei para a clínica?',
    'GMB'
),
-- 3. Geral / Profissional com site quebrado (Fora do Ar)
(
    'Geral',
    'QUEBRADO',
    'Alerta Técnico/Comercial - Site Fora do Ar',
    'Olá, equipe da {name}! Estava pesquisando serviços na região de {city} e encontrei a empresa de vocês com ótimas recomendações ({reviews_count} avaliações).\n\nAo tentar abrir o site oficial cadastrado no perfil do Google para ver mais detalhes, a página apresentou erro de conexão e não carregou.\n\nComo vocês recebem acessos diários pelo Maps, resolvi avisar porque potenciais clientes acham que o negócio fechou quando o link falha. Trabalho substituindo páginas instáveis por Sites Vitrine One-Page definitivos (Base Turnkey R$ 350 | Customização de Marca R$ 500), já com termos formais de privacidade LGPD integrados. Se precisarem restabelecer a página hoje, estou à disposição.',
    'NONE'
),
-- 4. Corretor de Imóveis com Instagram no lugar do site
(
    'Corretor de Imoveis',
    'IMPROVISADO',
    'Imobiliário - Site Vitrine Institucional e Carteira de Imóveis',
    'Olá, {name}! Vi seu trabalho no mercado imobiliário aqui em {city} e o perfil bem recomendado no Google.\n\nPercebi que o botão de site aponta para o Instagram. Redes sociais são ótimas para audiência, mas quem pesquisa no Google com intenção imediata de compra quer ver autoridade institucional, imóveis em destaque e um botão direto para falar com você.\n\nDesenvolvo Sites Vitrine One-Page turnkey para corretores (Base Turnkey R$ 350 | Customização de Marca +R$ 150, total R$ 500), já com conformidade LGPD nativa e agendamento de visitas no WhatsApp.\n\nSe fizer sentido, te envio uma prévia rápida no celular.',
    'ADS'
),
-- 5. Pet Shop & Clínica Veterinária (Banho e Tosa, Clínica e Farmácia)
(
    'Pet Shop & Veterinária',
    'IMPROVISADO',
    'Pet Shop & Vet - Vitrine dos 4 Pilares com Agendamento Direto no WhatsApp',
    'Olá, pessoal da {name}, tudo bem? Vi o perfil de vocês no Google Maps com {reviews_count} avaliações excelentes (nota {rating}) aqui em {city}!\n\nPercebi que o link da ficha aponta para uma página improvisada/Instagram. Tutores que pesquisam no Google querem ver rapidamente a estrutura de Banho & Tosa (higiene, toalhas esterilizadas), Clínica/Vacinas, Farmácia Delivery e um botão direto de agendamento no WhatsApp.\n\nEu desenvolvo Sites Vitrine One-Page perenes específicos para Pet Shops e Clínicas Veterinárias (Base Turnkey R$ 350 | Com Customização de Marca R$ 500), sem mensalidades e já em conformidade com o CFMV e LGPD.\n\nPosso enviar um link de demonstração de 1 minuto no celular para vocês verem como fica?',
    'GMB'
)
ON CONFLICT (category, website_condition, title) DO NOTHING;

INSERT INTO pitch_scripts (category, script_type, website_condition, title, situation, message_template, upsell_focus) VALUES
(
    'Geral',
    'OBJECTION',
    'GERAL',
    '“Já tenho Instagram / Linktree”',
    'Cliente acha que perfil social ou agregador de links substitui sede própria.',
    'Perfeito, o Instagram é ótimo para relacionamento! A questão é quem pesquisa no Google procurando especialista na sua cidade: quando o cliente clica na sua ficha e cai num Linktree ou precisa logar no Instagram, parte dessas pessoas desiste no caminho. O Site Vitrine One-Page funciona como sua sede própria no Google — carrega em 1 segundo, já vem com adequação LGPD nativa e joga o cliente filtrado direto no seu WhatsApp. Posso te mandar o link da prévia que montei para você testar no celular?',
    'NONE'
),
(
    'Geral',
    'OBJECTION',
    'GERAL',
    '“Tá caro / Não está no orçamento”',
    'Cliente traumatizado com agências que cobram R$ 2.500 + mensalidade eterna.',
    'Compreendo totalmente. Inclusive criei esse formato justamente para eliminar custos fixos de agência: não tem mensalidade nem taxa de manutenção. O pacote Turnkey completo (já com aviso e Política de Privacidade LGPD inclusos) é pagamento único de R$ {price} (ou R$ 500 se quiser customização exclusiva de cores e fotos), e podemos dividir em 2x no Pix: metade hoje na aprovação da prévia e metade quando já estiver no ar no seu domínio.',
    'NONE'
),
(
    'Geral',
    'OBJECTION',
    'GERAL',
    '“Preciso falar com meu sócio / secretária”',
    'Filtro de recepção ou sociedade pedindo tempo ou apresentação por e-mail.',
    'Combinado! Para facilitar a avaliação sem tomar tempo com PDF longo, eu já deixei uma demonstração funcional pronta no ar com os dados públicos de vocês. Vou te mandar o link aqui mesmo em 3 linhas: basta encaminhar no WhatsApp do seu sócio(a), abre em 3 segundos no celular.',
    'NONE'
),
(
    'Advogado',
    'OBJECTION',
    'GERAL',
    '“Não posso fazer propaganda (Provimento OAB)”',
    'Advogado receoso com as regras de publicidade do Provimento 205/2021 da OAB.',
    'Exatamente por isso nossa estrutura para Advocacia segue 100% o Provimento 205/2021 da OAB: zero promessa de resultado, zero mercantilização e foco estritamente informativo e institucional (áreas de atuação, formação, endereço e canal de atendimento), além de já vir com a blindagem LGPD nativa. É uma carta de apresentação sóbria para quem já procura seu nome no Google.',
    'NONE'
),
(
    'Pet Shop & Veterinária',
    'OBJECTION',
    'GERAL',
    '“Os tutores já agendam direto pelo WhatsApp”',
    'Dono de Pet Shop ou Clínica Vet que acha que só ter telefone na ficha basta.',
    'E é justamente no WhatsApp que o fechamento acontece! O ponto é que quando um tutor novo pesquisa "banho e tosa" ou "veterinário" no Google, ele compara 3 fichas em 30 segundos. Ter uma vitrine própria mostrando seus 4 pilares (Estética segura, Clínica/Vacinas, Boutique e Táxi Dog) + avaliações reais 5 estrelas passa uma confiança imediata que faz o tutor clicar no SEU WhatsApp em vez do concorrente.',
    'NONE'
)
ON CONFLICT (category, website_condition, title) DO NOTHING;
