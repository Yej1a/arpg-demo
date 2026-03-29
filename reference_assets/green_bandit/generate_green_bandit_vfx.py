from pathlib import Path

from PIL import Image, ImageOps


FRAME = 32
ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "custom_vfx"
OUT_DIR.mkdir(exist_ok=True)


PALETTE = {
    "teal_dark": (35, 133, 127, 255),
    "teal_mid": (74, 161, 155, 255),
    "teal_bright": (86, 203, 161, 255),
    "mint": (181, 241, 195, 255),
    "cream": (255, 238, 207, 255),
    "brown": (150, 96, 47, 255),
    "brown_dark": (135, 84, 38, 255),
    "deep": (43, 73, 56, 255),
    "white": (250, 250, 250, 255),
}


def empty_frame() -> Image.Image:
    return Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))


def paint(frame: Image.Image, x: int, y: int, tone: str) -> None:
    if 0 <= x < FRAME and 0 <= y < FRAME:
        frame.putpixel((x, y), PALETTE[tone])


def paint_many(frame: Image.Image, points: list[tuple[int, int]], tone: str) -> None:
    for x, y in points:
        paint(frame, x, y, tone)


def slash_frames() -> list[Image.Image]:
    frames: list[Image.Image] = []
    specs = [
        {
            "deep": [(10, 18), (11, 17), (12, 16), (13, 16)],
            "cream": [(11, 18), (12, 17), (13, 17)],
            "mint": [(12, 18), (13, 18)],
        },
        {
            "deep": [(9, 20), (10, 19), (11, 18), (12, 17), (13, 16), (14, 15), (15, 14), (16, 13)],
            "cream": [(10, 20), (11, 19), (12, 18), (13, 17), (14, 16), (15, 15), (16, 14)],
            "mint": [(12, 20), (13, 19), (14, 18), (15, 17)],
            "teal_mid": [(9, 21), (10, 21), (11, 20), (12, 19)],
        },
        {
            "deep": [(7, 22), (8, 21), (9, 20), (10, 19), (11, 18), (12, 17), (13, 16), (14, 15), (15, 14), (16, 13), (17, 12), (18, 11), (19, 10)],
            "brown_dark": [(17, 20), (18, 19), (19, 18)],
            "cream": [(8, 22), (9, 21), (10, 20), (11, 19), (12, 18), (13, 17), (14, 16), (15, 15), (16, 14), (17, 13), (18, 12)],
            "mint": [(10, 22), (11, 21), (12, 20), (13, 19), (14, 18), (15, 17), (16, 16)],
            "teal_bright": [(18, 11), (19, 11), (20, 11), (19, 12)],
        },
        {
            "deep": [(13, 13), (14, 12), (15, 11), (16, 10), (17, 10), (18, 11), (19, 12), (20, 13)],
            "cream": [(14, 13), (15, 12), (16, 11), (17, 11), (18, 12), (19, 13)],
            "mint": [(15, 13), (16, 12), (17, 12), (18, 13)],
            "teal_mid": [(12, 14), (13, 14), (20, 14), (21, 14)],
        },
        {
            "deep": [(20, 12), (21, 12), (22, 13)],
            "cream": [(20, 13), (21, 13), (22, 14)],
            "mint": [(21, 14), (22, 15)],
            "teal_mid": [(18, 11), (19, 12), (20, 14)],
        },
    ]

    for spec in specs:
        frame = empty_frame()
        for tone, points in spec.items():
            paint_many(frame, points, tone)
        frames.append(frame)
    return frames


def muzzle_frames() -> list[Image.Image]:
    frames: list[Image.Image] = []
    specs = [
        {
            "brown_dark": [(8, 16), (9, 16)],
            "cream": [(10, 16)],
            "teal_bright": [(7, 15)],
        },
        {
            "brown_dark": [(8, 15), (8, 16), (9, 16)],
            "cream": [(10, 15), (10, 16), (10, 17), (11, 16)],
            "mint": [(11, 15), (11, 17)],
            "teal_bright": [(12, 16)],
        },
        {
            "brown_dark": [(8, 15), (8, 16), (9, 16)],
            "cream": [(10, 14), (10, 15), (10, 16), (10, 17), (10, 18), (11, 15), (11, 16), (11, 17), (12, 16)],
            "mint": [(12, 15), (12, 17), (13, 16)],
            "teal_mid": [(11, 14), (11, 18)],
        },
        {
            "brown_dark": [(8, 16), (9, 16)],
            "cream": [(10, 15), (10, 16), (10, 17), (11, 16)],
            "mint": [(11, 15), (11, 17)],
            "teal_mid": [(12, 16)],
        },
    ]
    for spec in specs:
        frame = empty_frame()
        for tone, points in spec.items():
            paint_many(frame, points, tone)
        frames.append(frame)
    return frames


def hit_frames() -> list[Image.Image]:
    frames: list[Image.Image] = []
    specs = [
        {
            "deep": [(16, 14), (16, 15), (16, 16), (16, 17), (14, 16), (15, 16), (17, 16), (18, 16)],
            "cream": [(15, 15), (15, 17), (17, 15), (17, 17)],
            "mint": [(14, 14), (18, 14), (14, 18), (18, 18)],
        },
        {
            "deep": [(16, 12), (16, 13), (16, 14), (16, 15), (16, 16), (16, 17), (16, 18), (16, 19), (12, 16), (13, 16), (14, 16), (15, 16), (17, 16), (18, 16), (19, 16), (20, 16)],
            "cream": [(14, 14), (15, 15), (17, 15), (18, 14), (14, 18), (15, 17), (17, 17), (18, 18)],
            "mint": [(13, 13), (19, 13), (13, 19), (19, 19)],
            "teal_bright": [(12, 12), (20, 12), (12, 20), (20, 20)],
        },
        {
            "deep": [(13, 13), (14, 14), (15, 15), (17, 15), (18, 14), (19, 13), (13, 19), (14, 18), (15, 17), (17, 17), (18, 18), (19, 19)],
            "cream": [(16, 12), (12, 16), (20, 16), (16, 20)],
            "mint": [(13, 16), (19, 16), (16, 13), (16, 19)],
            "teal_mid": [(12, 12), (20, 12), (12, 20), (20, 20)],
        },
        {
            "deep": [(14, 14), (18, 14), (14, 18), (18, 18)],
            "cream": [(16, 15), (15, 16), (17, 16), (16, 17)],
            "mint": [(13, 13), (19, 13), (13, 19), (19, 19)],
        },
    ]
    for spec in specs:
        frame = empty_frame()
        for tone, points in spec.items():
            paint_many(frame, points, tone)
        frames.append(frame)
    return frames


def to_sheet(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for idx, frame in enumerate(frames):
        sheet.paste(frame, (idx * FRAME, 0), frame)
    return sheet


def save_sheet(name: str, frames: list[Image.Image], mirror: bool = True) -> None:
    sheet = to_sheet(frames)
    sheet.save(OUT_DIR / f"{name}.png")
    if mirror:
        ImageOps.mirror(sheet).save(OUT_DIR / f"{name}_left.png")


def save_preview() -> None:
    bg = Image.new("RGBA", (FRAME * 5, FRAME * 6), (24, 26, 20, 255))
    entries = [
        ("green_bandit_slash", (0, 0)),
        ("green_bandit_slash_left", (0, FRAME)),
        ("green_bandit_muzzle_flash", (0, FRAME * 2)),
        ("green_bandit_muzzle_flash_left", (0, FRAME * 3)),
        ("green_bandit_hit_spark", (0, FRAME * 4)),
        ("green_bandit_hit_spark_left", (0, FRAME * 5)),
    ]
    for filename, pos in entries:
        img = Image.open(OUT_DIR / f"{filename}.png").convert("RGBA")
        bg.paste(img, pos, img)
    bg.resize((bg.width * 4, bg.height * 4), Image.Resampling.NEAREST).save(OUT_DIR / "green_bandit_vfx_preview.png")


def main() -> None:
    save_sheet("green_bandit_slash", slash_frames())
    save_sheet("green_bandit_muzzle_flash", muzzle_frames())
    save_sheet("green_bandit_hit_spark", hit_frames())
    save_preview()


if __name__ == "__main__":
    main()
