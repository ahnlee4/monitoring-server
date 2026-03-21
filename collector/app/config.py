import os


def get_env(name: str, default: str) -> str:
    return os.getenv(name, default)


def get_int_env(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))
