from __future__ import annotations

import hashlib
import re
import secrets


EDGE_CODE_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")


def normalize_edge_code(value: str) -> str:
    code = str(value or "").strip().lower()
    if not EDGE_CODE_PATTERN.fullmatch(code):
        raise ValueError("code must contain lowercase letters, numbers, or hyphens")
    return code


def hash_edge_token(token: str) -> str:
    normalized = str(token or "").strip()
    if not normalized:
        raise ValueError("edge token cannot be empty")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def verify_edge_token(token: str, token_hash: str) -> bool:
    try:
        candidate = hash_edge_token(token)
    except ValueError:
        return False
    return secrets.compare_digest(candidate, str(token_hash or ""))
