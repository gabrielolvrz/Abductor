"""Utilitário de normalização de parâmetros de busca para cache-first sem duplicatas.

Conforme especificado em docs/04 - DATA - Modelagem e Banco.md e docs/02 - SRS.
Aplica strip(), remoção de acentos e casefold() para que variações como
'Uberlândia', 'uberlandia' e 'Uberlândia ' resolvam para a mesma chave de busca.
"""

import unicodedata


def normalize_search_param(value: str | None) -> str:
    """Normaliza um parâmetro de texto de busca (category, city, neighborhood).

    1. Remove espaços em branco nas extremidades (strip).
    2. Decompõe caracteres acentuados (NFD) e remove marcas diacríticas.
    3. Converte para minúsculas universais (casefold).
    """
    if not value:
        return ""

    cleaned = value.strip()
    decomposed = unicodedata.normalize("NFD", cleaned)
    without_accents = "".join(
        char for char in decomposed if unicodedata.category(char) != "Mn"
    )
    return without_accents.casefold()
