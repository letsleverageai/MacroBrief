"""Configuration: config.yaml (what to track) + environment (secrets, URLs)."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("MACROBRIEF_CONFIG", ROOT / "config.yaml"))


def _load_dotenv(path: Path = ROOT / ".env") -> None:
    """Load KEY=VALUE lines from pipeline/.env into the environment (real env vars win). Docker passes env directly."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


_load_dotenv()


@lru_cache(maxsize=1)
def load() -> Dict[str, Any]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def database_url() -> str:
    url = env("DATABASE_URL", f"sqlite:///{ROOT / 'data' / 'macrobrief.db'}")
    if url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
        # make relative sqlite paths relative to the pipeline root
        rel = url[len("sqlite:///"):]
        if not os.path.isabs(rel):
            url = f"sqlite:///{ROOT / rel}"
    return url


def timezone() -> str:
    return env("TIMEZONE", load().get("timezone", "Europe/London"))
