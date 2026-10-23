"""Testes unitários para o higienizador de razão social (clean_business_name)."""

from app.engines.cleaner import clean_business_name


def test_clean_ltda_suffix():
    assert (
        clean_business_name("Dr. Carlos Eduardo Advocacia LTDA")
        == "Dr. Carlos Eduardo Advocacia"
    )
    assert (
        clean_business_name("Dr. Carlos Eduardo Advocacia - LTDA.")
        == "Dr. Carlos Eduardo Advocacia"
    )
    assert (
        clean_business_name("Silva Advocacia Limitada")
        == "Silva Advocacia"
    )


def test_clean_me_and_epp():
    assert (
        clean_business_name("Clínica Odonto Center - ME")
        == "Clínica Odonto Center"
    )
    assert (
        clean_business_name("Studio Pet Feliz M.E.")
        == "Studio Pet Feliz"
    )
    assert (
        clean_business_name("Marmoraria Granito EPP")
        == "Marmoraria Granito"
    )


def test_clean_eireli_and_sa():
    assert (
        clean_business_name("Santos & Silva Consultoria EIRELI")
        == "Santos & Silva Consultoria"
    )
    assert (
        clean_business_name("Barbearia Tradicional S/A")
        == "Barbearia Tradicional"
    )
    assert (
        clean_business_name("Hospital Veterinário 24h S.A.")
        == "Hospital Veterinário 24h"
    )


def test_clean_oab_formal_societies():
    assert (
        clean_business_name("Dr. André Ferreira - Sociedade Individual de Advocacia")
        == "Dr. André Ferreira"
    )
    assert (
        clean_business_name("Ferreira & Souza - Sociedade de Advogados")
        == "Ferreira & Souza"
    )
    assert (
        clean_business_name("Oliveira Advogados Associados S/S")
        == "Oliveira Advogados Associados"
    )


def test_clean_cnpj_pattern():
    assert (
        clean_business_name(
            "Consultório Dra. Mariana Santos - CNPJ: 12.345.678/0001-90"
        )
        == "Consultório Dra. Mariana Santos"
    )


def test_clean_all_caps_conversion():
    assert (
        clean_business_name("DR. CARLOS SILVA ADVOCACIA LTDA")
        == "Dr. Carlos Silva Advocacia"
    )
    assert (
        clean_business_name("DRA. MARIANA SANTOS ODONTOLOGIA E ESTETICA")
        == "Dra. Mariana Santos Odontologia e Estetica"
    )


def test_clean_empty_and_none():
    assert clean_business_name(None) == ""
    assert clean_business_name("") == ""
    assert clean_business_name("   ") == ""


def test_clean_preserves_legitimate_authority_words():
    assert (
        clean_business_name("Advocacia Previdenciária Especializada")
        == "Advocacia Previdenciária Especializada"
    )
    assert (
        clean_business_name("Consultório de Psicologia e Terapia")
        == "Consultório de Psicologia e Terapia"
    )
