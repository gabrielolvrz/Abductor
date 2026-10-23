"""Motores de regras de negócio desacoplados do Abductor.

Engines puras e testáveis:
- sanitizer: Validação e sanitização telefônica via phonenumbers (região BR).
- cleaner: Higienização humanizada de razão social (clean_business_name).
- validator: Validação concorrente assíncrona de URLs com detecção anti-redirect.
- scorer: Motor matemático de Lead Scoring com Hard Gate e clamping [0, 100].
"""
