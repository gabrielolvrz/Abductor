"""Motor de higienização de razão social para abordagem humanizada (cleaner.py).

Conforme especificado em docs/03 - SDD e docs/06 - PLAYBOOK:
- Executado exclusivamente em runtime durante a interpolação de scripts e na exportação do site.config.json.
- Remove apenas sufixos societários e empresariais formais (LTDA, ME, EPP, EIRELI, S/S, S.A., Sociedade Individual de Advocacia, Sociedade de Advogados, CNPJ).
- Converte caixa alta desnecessária (ALL CAPS) em Title Case elegante, mantendo preposições minúsculas.
- Preserva palavras legítimas de autoridade (ex.: 'Advocacia', 'Odontologia', 'Clínica', 'Arquitetura').
- O nome original no banco de dados (leads.name) permanece 100% íntegro para o Google Dork.
"""

import re

# Padrões de sufixos corporativos e societários formais a serem removidos
_CORPORATE_PATTERNS = [
    # Sociedades formais da OAB
    re.compile(r"\bSociedade\s+Individual\s+de\s+Advocacia\b", re.IGNORECASE),
    re.compile(r"\bSociedade\s+de\s+Advogados\b", re.IGNORECASE),
    re.compile(r"\bSociedade\s+Simples\b", re.IGNORECASE),
    # CNPJ e inscrições formais
    re.compile(r"\bCNPJ[:\s\d\./-]+", re.IGNORECASE),
    # Siglas societárias e tipos empresariais com ou sem pontos finais
    re.compile(
        r"(?:(?<=\s)|(?<=^)|(?<=[-,/|]))\s*(?:S[./\s]*S|S[./\s]*A|LTDA|LIMITADA|EIRELI|E\.I\.R\.E\.L\.I\.|EPP|E\.P\.P\.|M\.E\.|ME)\.?(?=\s|$|[-,/|;:.\)])",
        re.IGNORECASE,
    ),
]

_LOWERCASE_WORDS = {
    "de",
    "da",
    "do",
    "dos",
    "das",
    "e",
    "em",
    "para",
    "com",
    "por",
}

_SPECIAL_TITLES = {
    "dr.": "Dr.",
    "dra.": "Dra.",
    "dr": "Dr.",
    "dra": "Dra.",
}


def clean_business_name(raw_name: str | None) -> str:
    """Higieniza a razão social do estabelecimento para uso humanizado em scripts de vendas.

    Args:
        raw_name: Nome bruto vindo do Google Maps (ex.: 'DR. CARLOS EDUARDO ADVOCACIA LTDA').

    Returns:
        String limpa e amigável (ex.: 'Dr. Carlos Eduardo Advocacia').
    """
    if raw_name is None:
        return ""

    cleaned = str(raw_name).strip()
    if not cleaned:
        return ""

    # 1. Remover padrões societários e de CNPJ
    for pattern in _CORPORATE_PATTERNS:
        cleaned = pattern.sub("", cleaned)

    # 2. Limpar pontuações e separadores residuais nas extremidades
    cleaned = re.sub(r"[\s\-/,|•\.:]+$", "", cleaned).strip()
    cleaned = re.sub(r"^[\s\-/,|•\.:]+", "", cleaned).strip()

    # 3. Normalizar múltiplos espaços
    cleaned = re.sub(r"\s{2,}", " ", cleaned)

    # 4. Caso a string resultante esteja toda em maiúsculas, formatar para Title Case inteligente
    if cleaned.isupper():
        words = cleaned.split()
        formatted_words: list[str] = []
        for i, word in enumerate(words):
            word_lower = word.lower()
            if word_lower in _SPECIAL_TITLES:
                formatted_words.append(_SPECIAL_TITLES[word_lower])
            elif i > 0 and word_lower in _LOWERCASE_WORDS:
                formatted_words.append(word_lower)
            else:
                formatted_words.append(word.capitalize())
        cleaned = " ".join(formatted_words)

    return cleaned
