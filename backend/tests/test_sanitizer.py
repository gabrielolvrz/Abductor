"""Testes unitários exaustivos para o motor de sanitização telefônica."""

from app.engines.sanitizer import sanitize_phone


def test_sanitize_mobile_with_ddd_and_formatting():
    # Celular com máscara padrão brasileira
    res = sanitize_phone("(34) 99876-5432")
    assert res.is_valid is True
    assert res.phone_type == "MOBILE"
    assert res.phone_sanitized == "34998765432"
    assert res.whatsapp_url == "https://wa.me/5534998765432"


def test_sanitize_mobile_with_country_code():
    # Celular com +55 já incluso
    res = sanitize_phone("+55 11 98765-4321")
    assert res.is_valid is True
    assert res.phone_type == "MOBILE"
    assert res.phone_sanitized == "11987654321"
    assert res.whatsapp_url == "https://wa.me/5511987654321"


def test_sanitize_mobile_digits_only():
    res = sanitize_phone("34998765432")
    assert res.is_valid is True
    assert res.phone_type == "MOBILE"
    assert res.phone_sanitized == "34998765432"


def test_sanitize_landline():
    # Telefone fixo
    res = sanitize_phone("(34) 3232-1000")
    assert res.is_valid is True
    assert res.phone_type == "LANDLINE"
    assert res.phone_sanitized == "3432321000"
    # Link gerado para testes de WhatsApp Business em fixo
    assert res.whatsapp_url == "https://wa.me/553432321000"


def test_sanitize_toll_free_0800():
    # Número 0800 de serviço gratuito (não comercial direto)
    res = sanitize_phone("0800 123 4567")
    assert res.is_valid is False
    assert res.phone_type == "INVALID"
    assert res.phone_sanitized is None
    assert res.whatsapp_url is None


def test_sanitize_invalid_format():
    # String não telefônica
    res = sanitize_phone("not-a-number")
    assert res.is_valid is False
    assert res.phone_type == "INVALID"
    assert res.phone_sanitized is None
    assert res.whatsapp_url is None


def test_sanitize_invalid_ddd():
    # DDD 00 inexistente
    res = sanitize_phone("(00) 99876-5432")
    assert res.is_valid is False
    assert res.phone_type == "INVALID"
    assert res.phone_sanitized is None


def test_sanitize_empty_and_none():
    res_none = sanitize_phone(None)
    assert res_none.is_valid is False
    assert res_none.phone_type == "NONE"
    assert res_none.phone_sanitized is None
    assert res_none.whatsapp_url is None

    res_empty = sanitize_phone("   ")
    assert res_empty.is_valid is False
    assert res_empty.phone_type == "NONE"
    assert res_empty.phone_sanitized is None


def test_sanitize_to_dict():
    res = sanitize_phone("(34) 99876-5432")
    d = res.to_dict()
    assert d["phone_type"] == "MOBILE"
    assert d["phone_sanitized"] == "34998765432"
    assert d["is_valid"] is True
