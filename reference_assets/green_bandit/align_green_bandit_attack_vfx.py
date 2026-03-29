from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
CHAR_PATH = ROOT / "green_bandit_free_pack" / "normal" / "normal.png"
VFX_DIR = ROOT / "custom_vfx"
OUT_DIR = ROOT / "aligned_vfx"
OUT_DIR.mkdir(exist_ok=True)


ROW_Y1, ROW_Y2 = 633, 665
HIT_ROW_Y1, HIT_ROW_Y2 = 692, 725


def load_frames(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    frame_w = 32
    return [sheet.crop((i * frame_w, 0, (i + 1) * frame_w, 32)) for i in range(sheet.width // frame_w)]


def alpha_copy(img: Image.Image, alpha: int) -> Image.Image:
    out = img.copy()
    out.putalpha(alpha)
    return out


def paint_points(frame: Image.Image, points: list[tuple[int, int]], color: tuple[int, int, int, int]) -> None:
    for x, y in points:
        if 0 <= x < frame.width and 0 <= y < frame.height:
            frame.putpixel((x, y), color)


def make_trail(kind: str) -> Image.Image:
    frame = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    if kind == "right_short":
        paint_points(
            frame,
            [(10, 20), (11, 19), (12, 18), (13, 17), (14, 16), (15, 15)],
            (181, 241, 195, 120),
        )
        paint_points(frame, [(11, 20), (12, 19), (13, 18), (14, 17)], (255, 238, 207, 90))
    elif kind == "right_long":
        paint_points(
            frame,
            [(7, 22), (8, 21), (9, 20), (10, 19), (11, 18), (12, 17), (13, 16), (14, 15)],
            (181, 241, 195, 110),
        )
        paint_points(frame, [(9, 22), (10, 21), (11, 20), (12, 19), (13, 18)], (255, 238, 207, 80))
    elif kind == "left_short":
        paint_points(
            frame,
            [(21, 20), (20, 19), (19, 18), (18, 17), (17, 16), (16, 15)],
            (181, 241, 195, 120),
        )
        paint_points(frame, [(20, 20), (19, 19), (18, 18), (17, 17)], (255, 238, 207, 90))
    elif kind == "left_long":
        paint_points(
            frame,
            [(24, 22), (23, 21), (22, 20), (21, 19), (20, 18), (19, 17), (18, 16), (17, 15)],
            (181, 241, 195, 110),
        )
        paint_points(frame, [(22, 22), (21, 21), (20, 20), (19, 19), (18, 18)], (255, 238, 207, 80))
    return frame


def make_hit_burst(size: str) -> Image.Image:
    frame = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    if size == "small":
        paint_points(frame, [(16, 14), (14, 16), (18, 16), (16, 18)], (181, 241, 195, 255))
        paint_points(frame, [(16, 16)], (255, 238, 207, 255))
    elif size == "medium":
        paint_points(
            frame,
            [(16, 12), (16, 13), (16, 14), (16, 18), (16, 19), (14, 16), (15, 16), (17, 16), (18, 16)],
            (181, 241, 195, 255),
        )
        paint_points(frame, [(15, 15), (17, 15), (15, 17), (17, 17)], (74, 161, 155, 230))
        paint_points(frame, [(16, 16)], (255, 238, 207, 255))
    elif size == "large":
        paint_points(
            frame,
            [(16, 10), (16, 11), (16, 12), (16, 13), (16, 14), (16, 18), (16, 19), (16, 20), (16, 21), (12, 16), (13, 16), (14, 16), (18, 16), (19, 16), (20, 16)],
            (181, 241, 195, 255),
        )
        paint_points(
            frame,
            [(14, 14), (15, 15), (17, 15), (18, 14), (14, 18), (15, 17), (17, 17), (18, 18)],
            (74, 161, 155, 230),
        )
        paint_points(frame, [(16, 16), (15, 16), (17, 16), (16, 15), (16, 17)], (255, 238, 207, 255))
    return frame


def build_attack_layer() -> Image.Image:
    layer = Image.new("RGBA", Image.open(CHAR_PATH).size, (0, 0, 0, 0))

    slash = load_frames(VFX_DIR / "green_bandit_slash.png")
    slash_left = load_frames(VFX_DIR / "green_bandit_slash_left.png")
    spark = load_frames(VFX_DIR / "green_bandit_hit_spark.png")
    spark_left = load_frames(VFX_DIR / "green_bandit_hit_spark_left.png")

    trail_right_short = make_trail("right_short")
    trail_right_long = make_trail("right_long")
    trail_left_short = make_trail("left_short")
    trail_left_long = make_trail("left_long")

    # Hand-tuned placements for row10 so the prototype VFX track the existing
    # slash poses instead of floating as generic overlays.
    placements = [
        {"img": slash[0], "xy": (86, 636)},
        {"img": alpha_copy(trail_right_short, 255), "xy": (105, 636)},
        {"img": slash[1], "xy": (121, 635)},
        {"img": alpha_copy(trail_right_long, 255), "xy": (136, 634)},
        {"img": slash[2], "xy": (154, 633)},
        {"img": spark[1], "xy": (214, 634)},
        {"img": spark[0], "xy": (245, 637)},
        {"img": alpha_copy(trail_left_long, 255), "xy": (309, 634)},
        {"img": slash_left[2], "xy": (326, 633)},
        {"img": spark_left[1], "xy": (358, 634)},
        {"img": alpha_copy(trail_left_short, 255), "xy": (392, 636)},
        {"img": slash_left[1], "xy": (406, 636)},
        {"img": slash_left[0], "xy": (447, 637)},
    ]

    for item in placements:
        layer.alpha_composite(item["img"], item["xy"])

    return layer


def build_hit_layer() -> Image.Image:
    layer = Image.new("RGBA", Image.open(CHAR_PATH).size, (0, 0, 0, 0))
    small = make_hit_burst("small")
    medium = make_hit_burst("medium")
    large = make_hit_burst("large")

    placements = [
        {"img": alpha_copy(small, 170), "xy": (34, 694)},
        {"img": alpha_copy(medium, 220), "xy": (73, 693)},
        {"img": large, "xy": (116, 692)},
        {"img": alpha_copy(small, 180), "xy": (156, 698)},
    ]

    for item in placements:
        layer.alpha_composite(item["img"], item["xy"])

    return layer


def main() -> None:
    character = Image.open(CHAR_PATH).convert("RGBA")
    attack_layer = build_attack_layer()
    hit_layer = build_hit_layer()
    combined_layer = Image.new("RGBA", character.size, (0, 0, 0, 0))
    combined_layer.alpha_composite(attack_layer)
    combined_layer.alpha_composite(hit_layer)

    composite = character.copy()
    composite.alpha_composite(combined_layer)

    attack_row_layer = attack_layer.crop((0, ROW_Y1, character.width, ROW_Y2 + 1))
    attack_row_composite = composite.crop((0, ROW_Y1, character.width, ROW_Y2 + 1))
    hit_row_layer = hit_layer.crop((0, HIT_ROW_Y1, character.width, HIT_ROW_Y2 + 1))
    hit_row_composite = composite.crop((0, HIT_ROW_Y1, character.width, HIT_ROW_Y2 + 1))

    attack_layer.save(OUT_DIR / "green_bandit_attack_vfx_layer.png")
    hit_layer.save(OUT_DIR / "green_bandit_hit_vfx_layer.png")
    combined_layer.save(OUT_DIR / "green_bandit_attack_hit_vfx_layer.png")
    composite.save(OUT_DIR / "green_bandit_attack_vfx_composite.png")
    attack_row_layer.save(OUT_DIR / "green_bandit_attack_row_vfx.png")
    attack_row_composite.save(OUT_DIR / "green_bandit_attack_row_composite.png")
    hit_row_layer.save(OUT_DIR / "green_bandit_hit_row_vfx.png")
    hit_row_composite.save(OUT_DIR / "green_bandit_hit_row_composite.png")

    attack_row_composite.resize((character.width * 4, (ROW_Y2 - ROW_Y1 + 1) * 4), Image.Resampling.NEAREST).save(
        OUT_DIR / "green_bandit_attack_row_composite_preview.png"
    )
    attack_row_layer.resize((character.width * 4, (ROW_Y2 - ROW_Y1 + 1) * 4), Image.Resampling.NEAREST).save(
        OUT_DIR / "green_bandit_attack_row_vfx_preview.png"
    )
    hit_row_composite.resize((character.width * 4, (HIT_ROW_Y2 - HIT_ROW_Y1 + 1) * 4), Image.Resampling.NEAREST).save(
        OUT_DIR / "green_bandit_hit_row_composite_preview.png"
    )
    hit_row_layer.resize((character.width * 4, (HIT_ROW_Y2 - HIT_ROW_Y1 + 1) * 4), Image.Resampling.NEAREST).save(
        OUT_DIR / "green_bandit_hit_row_vfx_preview.png"
    )


if __name__ == "__main__":
    main()
