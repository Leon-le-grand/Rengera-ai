#!/usr/bin/env python3
"""Turn the supplied brand JPEGs into clean transparent PNGs.

The sources are JPEG, which cannot store an alpha channel, so the checkerboard
"transparency" in the preview is baked into the pixels. Both checkerboard tones
(white and a light grey) sit well above the midpoint, so a single luminance
threshold recovers the mark and discards the background without tracing.

Outputs:
    public/rengera-logo-light.png   black mark, for light backgrounds
    public/rengera-logo-dark.png    white mark, for dark backgrounds
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - depends on the environment.
    raise SystemExit(
        "Pillow is required. Install it with: pip install Pillow"
    )

from PIL import ImageFilter

LIGHT_SOURCE = Path.home() / "Downloads" / "Logo-light-theme.jpeg"
DARK_SOURCE = Path.home() / "Downloads" / "Logo-dark-theme.jpeg"

FAVICON_SOURCE = Path.home() / "Downloads" / "Logo-favicon.png"

OUTPUTS = {
    "light": Path("public/rengera-logo-light.png"),
    "dark": Path("public/rengera-logo-dark.png"),
    "favicon": Path("public/rengera-logo-favicon.png"),
}

def stable_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Bounding box of the mark, ignoring stray JPEG speckle near the borders.

    JPEG compression leaves isolated bright or dark pixels along the frame
    edges. Taking the raw alpha bbox stretches the crop to the full image, which
    makes the two theme variants render at different sizes. Eroding a copy
    first drops those specks, and the surviving bounds describe the mark itself.
    """
    alpha = image.split()[3]
    eroded = alpha.filter(ImageFilter.MinFilter(11))
    return eroded.getbbox()


# Measured from the sources: the light mark sits near luminance 7 on a
# background of 255 and ~210, so the midpoint separates them cleanly. The dark
# mark sits near 255 on a background of ~232 and ~166, which needs a much
# higher cut or the grey checkerboard is captured as if it were the mark.
LIGHT_THRESHOLD = 128
DARK_THRESHOLD = 243


def extract(
    source: Path,
    mark_is_dark: bool,
    destination: Path,
    threshold: int,
) -> tuple[int, int, tuple[int, int, int, int]]:
    if not source.is_file():
        raise SystemExit(f"Missing source file: {source}")

    image = Image.open(source).convert("RGB")
    width, height = image.size
    pixels = image.load()

    rgba = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    out = rgba.load()

    colour = (10, 10, 10, 255) if mark_is_dark else (255, 255, 255, 255)

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            luminance = (r * 299 + g * 587 + b * 114) // 1000
            is_mark = luminance < threshold if mark_is_dark else luminance >= threshold
            out[x, y] = colour if is_mark else (0, 0, 0, 0)

    bbox = stable_bbox(rgba)
    if bbox is None:
        raise SystemExit(f"No mark found in {source}")

    trimmed = rgba.crop(bbox)
    destination.parent.mkdir(parents=True, exist_ok=True)
    trimmed.save(destination, "PNG", optimize=True)

    return width, height, bbox


def main() -> int:
    for name, (mark_is_dark, source, threshold) in {
        "light": (True, LIGHT_SOURCE, LIGHT_THRESHOLD),
        "dark": (False, DARK_SOURCE, DARK_THRESHOLD),
        "favicon": (True, FAVICON_SOURCE, LIGHT_THRESHOLD),
    }.items():
        width, height, bbox = extract(source, mark_is_dark, OUTPUTS[name], threshold)
        trimmed = OUTPUTS[name]
        print(
            f"{name}: source {width}x{height}, mark bbox {bbox}, "
            f"wrote {trimmed} at {trimmed.stat().st_size // 1024} KB"
        )

    # Next.js serves app/icon.png as the favicon.
    favicon = OUTPUTS["favicon"]
    mark = Image.open(favicon).convert("RGBA")
    side = max(mark.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
    canvas.resize((512, 512), Image.LANCZOS).save("app/icon.png", "PNG", optimize=True)
    print(f"favicon: wrote app/icon.png at 512x512")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())