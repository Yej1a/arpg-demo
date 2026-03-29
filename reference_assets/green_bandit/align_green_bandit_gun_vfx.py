from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
CHAR_PATH = ROOT / "green_bandit_free_pack" / "normal" / "normal.png"
OUT_DIR = ROOT / "aligned_vfx"
OUT_DIR.mkdir(exist_ok=True)


GUN_ROW_Y1, GUN_ROW_Y2 = 95, 127


PALETTE = {
    "mint": (181, 241, 195, 255),
    "cream": (255, 238, 207, 255),
    "teal": (74, 161, 155, 255),
    "teal_dark": (35, 133, 127, 255),
}


def paint(frame: Image.Image, points: list[tuple[int, int]], color: tuple[int, int, int, int]) -> None:
    for x, y in points:
        if 0 <= x < frame.width and 0 <= y < frame.height:
            frame.putpixel((x, y), color)


def make_muzzle(kind: str) -> Image.Image:
    frame = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    if kind == "small":
        paint(frame, [(16, 16), (17, 15), (17, 17)], PALETTE["cream"])
        paint(frame, [(18, 16)], PALETTE["mint"])
    elif kind == "medium":
        paint(frame, [(15, 16), (16, 15), (16, 16), (16, 17), (17, 16), (18, 16)], PALETTE["cream"])
        paint(frame, [(17, 15), (17, 17), (19, 16)], PALETTE["mint"])
        paint(frame, [(18, 15), (18, 17)], PALETTE["teal"])
    elif kind == "afterglow":
        paint(frame, [(16, 16), (17, 16)], (255, 238, 207, 180))
        paint(frame, [(18, 16)], (181, 241, 195, 150))
    return frame


def make_projectile(kind: str) -> Image.Image:
    frame = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    if kind == "spawn":
        paint(frame, [(14, 16), (15, 16), (16, 16)], PALETTE["cream"])
        paint(frame, [(17, 16), (18, 16)], PALETTE["mint"])
        paint(frame, [(19, 16)], PALETTE["teal"])
    elif kind == "travel":
        paint(frame, [(10, 16), (11, 16), (12, 16)], (255, 238, 207, 190))
        paint(frame, [(13, 16), (14, 16)], (181, 241, 195, 180))
        paint(frame, [(15, 16), (16, 16), (17, 16)], PALETTE["cream"])
        paint(frame, [(18, 16), (19, 16)], PALETTE["mint"])
        paint(frame, [(9, 15), (10, 15), (11, 15)], (74, 161, 155, 90))
        paint(frame, [(9, 17), (10, 17), (11, 17)], (35, 133, 127, 80))
    elif kind == "far":
        paint(frame, [(18, 16), (19, 16), (20, 16)], PALETTE["cream"])
        paint(frame, [(21, 16), (22, 16)], PALETTE["mint"])
        paint(frame, [(16, 15), (17, 15)], (74, 161, 155, 80))
    return frame


def build_gun_layer(size: tuple[int, int]) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))

    muzzle_small = make_muzzle("small")
    muzzle_medium = make_muzzle("medium")
    muzzle_afterglow = make_muzzle("afterglow")
    projectile_spawn = make_projectile("spawn")
    projectile_travel = make_projectile("travel")
    projectile_far = make_projectile("far")

    placements = [
        # row1 frame 0: subtle ready spark at the muzzle
        {"img": muzzle_small, "xy": (43, 93)},
        # row1 frame 1: main shot, muzzle flash plus projectile spawn
        {"img": muzzle_medium, "xy": (83, 92)},
        {"img": projectile_spawn, "xy": (95, 92)},
        # row1 frame 2: projectile continues traveling while character recoils
        {"img": muzzle_afterglow, "xy": (129, 96)},
        {"img": projectile_travel, "xy": (143, 94)},
        # row1 frame 3: second strong read for shot-ready / repeated fire
        {"img": muzzle_medium, "xy": (169, 92)},
        {"img": projectile_far, "xy": (182, 92)},
    ]

    for item in placements:
        layer.alpha_composite(item["img"], item["xy"])

    return layer


def main() -> None:
    character = Image.open(CHAR_PATH).convert("RGBA")
    layer = build_gun_layer(character.size)
    composite = character.copy()
    composite.alpha_composite(layer)

    row_layer = layer.crop((0, GUN_ROW_Y1, character.width, GUN_ROW_Y2 + 1))
    row_composite = composite.crop((0, GUN_ROW_Y1, character.width, GUN_ROW_Y2 + 1))

    layer.save(OUT_DIR / "green_bandit_gun_vfx_layer.png")
    composite.save(OUT_DIR / "green_bandit_gun_vfx_composite.png")
    row_layer.save(OUT_DIR / "green_bandit_gun_row_vfx.png")
    row_composite.save(OUT_DIR / "green_bandit_gun_row_composite.png")

    row_layer.resize((character.width * 4, (GUN_ROW_Y2 - GUN_ROW_Y1 + 1) * 4), Image.Resampling.NEAREST).save(
        OUT_DIR / "green_bandit_gun_row_vfx_preview.png"
    )
    row_composite.resize((character.width * 4, (GUN_ROW_Y2 - GUN_ROW_Y1 + 1) * 4), Image.Resampling.NEAREST).save(
        OUT_DIR / "green_bandit_gun_row_composite_preview.png"
    )


if __name__ == "__main__":
    main()
