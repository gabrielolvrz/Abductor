"""Motor de sanitização e classificação telefônica (sanitizer.py).

Utiliza a biblioteca oficial `phonenumbers` com região 'BR'.
Contratos:
- phone_sanitized: DDD + número nacional puro, sem '+55' (ex.: '34998765432').
- PhoneNumberType.MOBILE: phone_type = 'MOBILE', bônus de score (+20 pts), link 'https://wa.me/55...'.
- FIXED_LINE / FIXED_LINE_OR_MOBILE: phone_type = 'LANDLINE', sem bônus (0 pts), link 'https://wa.me/55...' permitido para testes de WhatsApp Business.
- 0800 (TOLL_FREE), inválido ou com DDD inexistente: phone_type = 'INVALID', sem sanitizado, penalidade (-30 pts).
- Nulo ou em branco: phone_type = 'NONE', sem sanitizado, penalidade (-30 pts).
"""

from dataclasses import asdict, dataclass
from typing import Any, Literal

import phonenumbers
from phonenumbers import NumberParseException, PhoneNumberFormat, PhoneNumberType

PhoneType = Literal["MOBILE", "LANDLINE", "INVALID", "NONE", "UNKNOWN"]


@dataclass(frozen=True)
class SanitizedPhone:
    """Resultado imutável da sanitização de telefone."""

    phone_raw: str | None
    phone_sanitized: str | None
    phone_type: PhoneType
    whatsapp_url: str | None
    is_valid: bool

    def to_dict(self) -> dict[str, Any]:
        """Converte o resultado para dicionário."""
        return asdict(self)


def sanitize_phone(
    phone_raw: str | None, default_region: str = "BR"
) -> SanitizedPhone:
    """Valida, formata e classifica um número telefônico brasileiro.

    Args:
        phone_raw: String original extraída do Google Maps ou digitada pelo usuário.
        default_region: Região padrão ISO 3166-1 (padrão 'BR').

    Returns:
        Instância de SanitizedPhone com phone_type, phone_sanitized e whatsapp_url.
    """
    if phone_raw is None:
        return SanitizedPhone(
            phone_raw=None,
            phone_sanitized=None,
            phone_type="NONE",
            whatsapp_url=None,
            is_valid=False,
        )

    raw_cleaned = str(phone_raw).strip()
    if not raw_cleaned:
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=None,
            phone_type="NONE",
            whatsapp_url=None,
            is_valid=False,
        )

    try:
        parsed = phonenumbers.parse(raw_cleaned, default_region)
    except NumberParseException:
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=None,
            phone_type="INVALID",
            whatsapp_url=None,
            is_valid=False,
        )

    # Validar se o número é formalmente válido (incluindo DDD real e quantidade de dígitos)
    if not phonenumbers.is_valid_number(parsed):
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=None,
            phone_type="INVALID",
            whatsapp_url=None,
            is_valid=False,
        )

    # Garantir que pertence ao plano de numeração do Brasil (+55)
    if parsed.country_code != 55:
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=None,
            phone_type="INVALID",
            whatsapp_url=None,
            is_valid=False,
        )

    num_type = phonenumbers.number_type(parsed)

    # Descartar números de serviço gratuitos (0800 / TOLL_FREE) e outros formatos não comerciais diretos
    if num_type == PhoneNumberType.TOLL_FREE:
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=None,
            phone_type="INVALID",
            whatsapp_url=None,
            is_valid=False,
        )

    # Formatar em E.164 (+5534998765432) e remover o prefixo '+55' para obter DDD + número puro
    e164_formatted = phonenumbers.format_number(
        parsed, PhoneNumberFormat.E164
    )
    phone_sanitized = e164_formatted.removeprefix("+55")
    whatsapp_url = f"https://wa.me/55{phone_sanitized}"

    if num_type == PhoneNumberType.MOBILE:
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=phone_sanitized,
            phone_type="MOBILE",
            whatsapp_url=whatsapp_url,
            is_valid=True,
        )

    if num_type in (
        PhoneNumberType.FIXED_LINE,
        PhoneNumberType.FIXED_LINE_OR_MOBILE,
    ):
        return SanitizedPhone(
            phone_raw=phone_raw,
            phone_sanitized=phone_sanitized,
            phone_type="LANDLINE",
            whatsapp_url=whatsapp_url,
            is_valid=True,
        )

    # Qualquer outro tipo não suportado (ex.: SHARED_COST, VOIP comercial genérico)
    return SanitizedPhone(
        phone_raw=phone_raw,
        phone_sanitized=None,
        phone_type="INVALID",
        whatsapp_url=None,
        is_valid=False,
    )
