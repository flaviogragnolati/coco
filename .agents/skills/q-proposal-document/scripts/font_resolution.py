from __future__ import annotations

from pathlib import Path
from typing import Iterable


FontCandidate = tuple[str, tuple[Path, ...], tuple[Path, ...]]

DECLARED_FAMILY = "Aptos"
DECLARED_FALLBACK = "Arial"
GENERATION_SLOT = "Arial"

GENERATION_CANDIDATES: tuple[FontCandidate, ...] = (
    (
        "Arial",
        (
            Path("/usr/share/fonts/truetype/msttcorefonts/Arial.ttf"),
            Path("/usr/share/fonts/truetype/msttcorefonts/arial.ttf"),
            Path("C:/Windows/Fonts/arial.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf"),
            Path("/usr/share/fonts/truetype/msttcorefonts/arialbd.ttf"),
            Path("C:/Windows/Fonts/arialbd.ttf"),
        ),
    ),
    (
        "Liberation Sans",
        (
            Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
            Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
            Path("C:/Windows/Fonts/LiberationSans-Regular.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"),
            Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
            Path("C:/Windows/Fonts/LiberationSans-Bold.ttf"),
        ),
    ),
    (
        "DejaVu Sans",
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("C:/Windows/Fonts/DejaVuSans.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            Path("C:/Windows/Fonts/DejaVuSans-Bold.ttf"),
        ),
    ),
)


def resolve_generation_font(
    candidates: Iterable[FontCandidate] | None = None,
) -> dict[str, str]:
    if candidates is None:
        candidates = GENERATION_CANDIDATES
    for family, regular_candidates, bold_candidates in candidates:
        regular = next((path for path in regular_candidates if path.is_file()), None)
        bold = next((path for path in bold_candidates if path.is_file()), None)
        if regular and bold:
            return {
                "declared_family": DECLARED_FAMILY,
                "declared_fallback": DECLARED_FALLBACK,
                "generation_slot": GENERATION_SLOT,
                "generation_resolved": family,
                "regular_path": str(regular.resolve()),
                "bold_path": str(bold.resolve()),
            }
    raise RuntimeError(
        "No generation font is available for the Arial -> Liberation Sans -> "
        "DejaVu Sans raster chain; install one regular and bold pair, then rerun"
    )
