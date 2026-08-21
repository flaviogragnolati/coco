from __future__ import annotations

from pathlib import Path
from typing import Iterable


FontCandidate = tuple[str, tuple[Path, ...], tuple[Path, ...]]

FREE_FONT_CANDIDATES: tuple[FontCandidate, ...] = (
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


def resolve_free_font_family(
    candidates: Iterable[FontCandidate] = FREE_FONT_CANDIDATES,
) -> dict[str, str]:
    for family, regular_candidates, bold_candidates in candidates:
        regular = next((path for path in regular_candidates if path.is_file()), None)
        bold = next((path for path in bold_candidates if path.is_file()), None)
        if regular and bold:
            return {
                "family": family,
                "regular_path": str(regular.resolve()),
                "bold_path": str(bold.resolve()),
            }
    raise RuntimeError(
        "No supported free font is available for render QA; install Liberation Sans "
        "or DejaVu Sans, then rerun without substituting a proprietary font"
    )
