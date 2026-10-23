"""Testes unitários para o normalizador de parâmetros de busca."""

from app.core.normalizer import normalize_search_param


def test_normalize_search_param_accents_and_case():
    assert normalize_search_param("Uberlândia") == "uberlandia"
    assert normalize_search_param("uberlandia") == "uberlandia"
    assert normalize_search_param("UBERLÂNDIA") == "uberlandia"


def test_normalize_search_param_whitespace():
    assert normalize_search_param("  Uberlândia   ") == "uberlandia"
    assert normalize_search_param("  Advogado Trabalhista  ") == "advogado trabalhista"


def test_normalize_search_param_empty():
    assert normalize_search_param("") == ""
    assert normalize_search_param(None) == ""
    assert normalize_search_param("   ") == ""
