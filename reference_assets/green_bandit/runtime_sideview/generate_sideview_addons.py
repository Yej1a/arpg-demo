from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent / "green_bandit_free_pack" / "normal" / "normal.png"
CELL_W = 48
CELL_H = 48

ROWS = {
    "gun_idle": {"y": 95, "height": 33, "boxes": [(35, 57), (77, 99), (121, 143), (163, 185)]},
    "gun_attack": {"y": 159, "height": 37, "boxes": [(38, 60), (75, 98), (107, 124), (138, 154), (167, 185)]},
    "neutral": {"y": 220, "height": 33, "boxes": [(42, 59), (85, 102), (127, 144), (168, 185)]},
    "switch_pose": {"y": 284, "height": 33, "boxes": [(42, 59), (84, 100), (127, 143)]},
    "run": {"y": 389, "height": 33, "boxes": [(41, 62), (86, 103), (129, 146), (171, 187), (207, 227), (251, 268), (296, 313), (337, 353)]},
    "hurt": {"y": 692, "height": 34, "boxes": [(39, 57), (76, 95), (121, 139), (159, 177)]},
}

PALETTE = {
    "outline": (8, 17, 26, 255),
    "steel": (214, 224, 235, 255),
    "steel_mid": (166, 180, 196, 255),
    "steel_dark": (98, 114, 128, 255),
    "teal": (119, 215, 234, 255),
    "teal_light": (223, 249, 255, 255),
    "gold": (245, 191, 92, 255),
    "gold_light": (255, 232, 170, 255),
    "white": (255, 248, 218, 255),
}


def crop_frame(sheet: Image.Image, row_name: str, index: int) -> Image.Image:
    spec = ROWS[row_name]
    y = spec["y"]
    boxes = spec["boxes"]
    x0, x1 = boxes[index]
    return sheet.crop((x0, y, x1 + 1, y + spec["height"]))


def paste_base(canvas: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    canvas.alpha_composite(sprite, (x, y))


def make_strip_from_sequence(sheet: Image.Image, sequence: list[tuple[str, int, int, int]]) -> Image.Image:
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (row_name, frame_index, x, y) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, row_name, frame_index)
        paste_base(canvas, frame, x, y)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def draw_gun_overlay(draw: ImageDraw.ImageDraw, x: int, y: int, barrel: int, muzzle_flash: bool = False, lowered: bool = False) -> None:
    tilt = 1 if lowered else 0
    draw.rectangle((x, y + tilt, x + 8, y + 2 + tilt), fill=PALETTE["steel_dark"])
    draw.rectangle((x + 1, y - 1 + tilt, x + barrel, y + 1 + tilt), fill=PALETTE["steel"])
    draw.rectangle((x + 2, y + tilt, x + barrel - 1, y + 1 + tilt), fill=PALETTE["steel_mid"])
    draw.rectangle((x + 1, y + 2 + tilt, x + 3, y + 5 + tilt), fill=PALETTE["outline"])
    draw.point((x + barrel - 1, y + tilt), fill=PALETTE["teal_light"])
    if muzzle_flash:
        cx = x + barrel + 1
        cy = y + 1 + tilt
        draw.line((cx - 1, cy, cx + 4, cy), fill=PALETTE["teal_light"], width=1)
        draw.line((cx + 1, cy - 2, cx + 3, cy + 2), fill=PALETTE["teal"], width=1)
        draw.line((cx + 1, cy + 2, cx + 3, cy - 2), fill=PALETTE["teal"], width=1)


def draw_gunhold_overlay(draw: ImageDraw.ImageDraw, x: int, y: int, barrel: int, muzzle_flash: bool = False, lowered: bool = False) -> None:
    tilt = 1 if lowered else 0
    # Draw a slimmer baked gun so the face silhouette stays readable.
    draw.rectangle((x + 1, y + tilt, x + 4, y + 2 + tilt), fill=PALETTE["steel_dark"])
    draw.rectangle((x + 2, y - 1 + tilt, x + barrel, y + 1 + tilt), fill=PALETTE["steel"])
    draw.rectangle((x + 3, y + tilt, x + barrel - 1, y + 1 + tilt), fill=PALETTE["steel_mid"])
    draw.rectangle((x + 2, y + 2 + tilt, x + 3, y + 5 + tilt), fill=PALETTE["steel_dark"])
    draw.rectangle((x + 3, y + 3 + tilt, x + 3, y + 5 + tilt), fill=PALETTE["outline"])
    draw.point((x + barrel - 1, y + tilt), fill=PALETTE["teal_light"])
    draw.point((x + 1, y + 1 + tilt), fill=PALETTE["steel_mid"])
    draw.point((x + 1, y + 2 + tilt), fill=PALETTE["steel_dark"])
    if muzzle_flash:
        cx = x + barrel + 1
        cy = y + 1 + tilt
        draw.line((cx - 1, cy, cx + 4, cy), fill=PALETTE["teal_light"], width=1)
        draw.line((cx + 1, cy - 2, cx + 3, cy + 2), fill=PALETTE["teal"], width=1)
        draw.line((cx + 1, cy + 2, cx + 3, cy - 2), fill=PALETTE["teal"], width=1)


def erase_weapon_zone(canvas: Image.Image, x: int, y: int, barrel: int, lowered: bool = False) -> None:
    tilt = 1 if lowered else 0
    clear_boxes = [
        # Only clear the original barrel/front half so we do not punch a transparent hole through the face silhouette.
        (x + 2, y - 2 + tilt, x + barrel + 5, y + 2 + tilt),
        (x + 2, y + 2 + tilt, x + 4, y + 6 + tilt),
    ]
    for box in clear_boxes:
        canvas.paste((0, 0, 0, 0), box)


def restore_erased_patch(
    canvas: Image.Image,
    original_canvas: Image.Image,
    reference_frame: Image.Image,
    dest_x: int,
    dest_y: int,
    region: tuple[int, int, int, int],
) -> None:
    canvas_px = canvas.load()
    original_px = original_canvas.load()
    ref_px = reference_frame.load()
    x0, y0, x1, y1 = region
    for canvas_y in range(y0, y1):
        ref_y = canvas_y - dest_y
        if ref_y < 0 or ref_y >= reference_frame.height:
            continue
        for canvas_x in range(x0, x1):
            ref_x = canvas_x - dest_x
            if ref_x < 0 or ref_x >= reference_frame.width:
                continue
            if canvas_px[canvas_x, canvas_y][3] != 0:
                continue
            if original_px[canvas_x, canvas_y][3] == 0:
                continue
            if ref_px[ref_x, ref_y][3] == 0:
                continue
            canvas_px[canvas_x, canvas_y] = ref_px[ref_x, ref_y]


def overlay_reference_patch(
    canvas: Image.Image,
    reference_frame: Image.Image,
    dest_x: int,
    dest_y: int,
    region: tuple[int, int, int, int],
) -> None:
    canvas_px = canvas.load()
    ref_px = reference_frame.load()
    x0, y0, x1, y1 = region
    for canvas_y in range(y0, y1):
        ref_y = canvas_y - dest_y
        if ref_y < 0 or ref_y >= reference_frame.height:
            continue
        for canvas_x in range(x0, x1):
            ref_x = canvas_x - dest_x
            if ref_x < 0 or ref_x >= reference_frame.width:
                continue
            if ref_px[ref_x, ref_y][3] == 0:
                continue
            canvas_px[canvas_x, canvas_y] = ref_px[ref_x, ref_y]


def make_gun_idle(sheet: Image.Image) -> Image.Image:
    positions = [
        (28, 21, 9, False),
        (28, 21, 9, False),
        (27, 22, 8, True),
        (28, 21, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "gun_idle", i)
        paste_base(canvas, frame, 12, 10)
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_attack(sheet: Image.Image) -> Image.Image:
    sequence = [
        ("gun_idle", 0, (28, 21, 9, False, False)),
        ("gun_attack", 0, (27, 20, 8, True, False)),
        ("gun_attack", 1, (28, 18, 10, False, False)),
        ("gun_attack", 2, (28, 17, 11, False, True)),
        ("gun_attack", 3, (29, 20, 10, False, False)),
        ("gun_attack", 4, (28, 22, 8, True, False)),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (row_name, frame_index, (x, y, barrel, lowered, flash)) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, row_name, frame_index)
        base_y = 8 if row_name == "gun_attack" else 10
        paste_base(canvas, frame, 11, base_y)
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, muzzle_flash=flash, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_move(sheet: Image.Image) -> Image.Image:
    positions = [
        (29, 21, 10, False),
        (28, 21, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
        (29, 21, 10, False),
        (28, 21, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
    ]
    out = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "run", i)
        paste_base(canvas, frame, 12, 10)
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_dash_strip(sheet: Image.Image) -> Image.Image:
    sequence = [
        (1, 9, 0, 2),
        (2, 12, -1, 3),
        (5, 14, -2, 4),
        (4, 11, -1, 2),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (frame_index, x, y, smear) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "run", frame_index)
        ghost = frame.copy()
        ghost.putalpha(80 - i * 12)
        canvas.alpha_composite(ghost, (x - (6 + smear), 10 + y))
        canvas.alpha_composite(frame, (x, 10 + y))
        draw = ImageDraw.Draw(canvas)
        trail_y = 26 + y
        draw.rectangle((x - (7 + smear * 2), trail_y, x - 1, trail_y + 2), fill=(92, 219, 208, 96))
        draw.rectangle((x - (3 + smear), trail_y + 1, x + 4, trail_y + 2), fill=(223, 249, 255, 120))
        draw.line((x + 8, 31 + y, x + 18, 31 + y), fill=(255, 232, 170, 110), width=1)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_dash(sheet: Image.Image) -> Image.Image:
    sequence = [
        (1, 9, 0, 9, False),
        (2, 12, -1, 8, True),
        (5, 14, -2, 8, True),
        (4, 11, -1, 9, False),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (frame_index, x, y, barrel, lowered) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "run", frame_index)
        ghost = frame.copy()
        ghost.putalpha(72 - i * 10)
        canvas.alpha_composite(ghost, (x - 8, 10 + y))
        canvas.alpha_composite(frame, (x, 10 + y))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, 28, 20 + y, barrel, lowered=lowered)
        draw.rectangle((x - 9, 26 + y, x - 1, 28 + y), fill=(92, 219, 208, 88))
        draw.rectangle((x - 4, 27 + y, x + 5, 28 + y), fill=(223, 249, 255, 118))
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_guard(sheet: Image.Image) -> Image.Image:
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i in range(4):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "gun_idle", 1 if i < 2 else 0)
        paste_base(canvas, frame, 12, 10)
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, 26, 18, 10, lowered=False)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_hurt(sheet: Image.Image) -> Image.Image:
    positions = [
        (24, 21, 8, True),
        (24, 20, 8, True),
        (25, 20, 9, False),
        (26, 21, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "hurt", i)
        paste_base(canvas, frame, 14, 9)
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_switch(sheet: Image.Image) -> Image.Image:
    sequence = [
        ("gun_idle", 2, (27, 22, 8, True, False)),
        ("gun_attack", 0, (27, 20, 8, True, False)),
        ("gun_attack", 1, (28, 18, 10, False, False)),
        ("gun_idle", 3, (28, 21, 10, False, False)),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (row_name, frame_index, (x, y, barrel, lowered, flash)) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, row_name, frame_index)
        base_y = 8 if row_name == "gun_attack" else 10
        paste_base(canvas, frame, 11, base_y)
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, muzzle_flash=flash, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_idle_body(sheet: Image.Image) -> Image.Image:
    positions = [
        (28, 21, 9, False),
        (28, 21, 9, False),
        (27, 22, 8, True),
        (28, 21, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "gun_idle", i)
        paste_base(canvas, frame, 12, 10)
        erase_weapon_zone(canvas, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_attack_body(sheet: Image.Image) -> Image.Image:
    sequence = [
        ("gun_idle", 0, (28, 21, 9, False)),
        ("gun_attack", 0, (27, 20, 8, True)),
        ("gun_attack", 1, (28, 18, 10, False)),
        ("gun_attack", 2, (28, 17, 11, False)),
        ("gun_attack", 3, (29, 20, 10, False)),
        ("gun_attack", 4, (28, 22, 8, True)),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (row_name, frame_index, (x, y, barrel, lowered)) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, row_name, frame_index)
        base_y = 8 if row_name == "gun_attack" else 10
        paste_base(canvas, frame, 11, base_y)
        erase_weapon_zone(canvas, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_move_body(sheet: Image.Image) -> Image.Image:
    positions = [
        (29, 21, 10, False),
        (28, 21, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
        (29, 21, 10, False),
        (28, 21, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
    ]
    out = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "run", i)
        paste_base(canvas, frame, 12, 10)
        erase_weapon_zone(canvas, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_guard_body(sheet: Image.Image) -> Image.Image:
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i in range(4):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "gun_idle", 1 if i < 2 else 0)
        paste_base(canvas, frame, 12, 10)
        erase_weapon_zone(canvas, 26, 18, 10, lowered=False)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_hurt_body(sheet: Image.Image) -> Image.Image:
    positions = [
        (24, 21, 8, True),
        (24, 20, 8, True),
        (25, 20, 9, False),
        (26, 21, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "hurt", i)
        paste_base(canvas, frame, 14, 9)
        erase_weapon_zone(canvas, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_switch_body(sheet: Image.Image) -> Image.Image:
    sequence = [
        ("gun_idle", 2, (27, 22, 8, True)),
        ("gun_attack", 0, (27, 20, 8, True)),
        ("gun_attack", 1, (28, 18, 10, False)),
        ("gun_idle", 3, (28, 21, 10, False)),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (row_name, frame_index, (x, y, barrel, lowered)) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, row_name, frame_index)
        base_y = 8 if row_name == "gun_attack" else 10
        paste_base(canvas, frame, 11, base_y)
        erase_weapon_zone(canvas, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_idle_overlay() -> Image.Image:
    positions = [
        (28, 21, 9, False),
        (28, 21, 9, False),
        (27, 22, 8, True),
        (28, 21, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_attack_overlay() -> Image.Image:
    sequence = [
        (28, 21, 9, False, False),
        (27, 20, 8, True, False),
        (28, 18, 10, False, False),
        (28, 17, 11, False, True),
        (29, 20, 10, False, False),
        (28, 22, 8, True, False),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered, flash) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, muzzle_flash=flash, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_move_overlay() -> Image.Image:
    positions = [
        (29, 21, 10, False),
        (28, 21, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
        (29, 21, 10, False),
        (28, 21, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
    ]
    out = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_guard_overlay() -> Image.Image:
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i in range(4):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, 26, 18, 10, lowered=False)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_hurt_overlay() -> Image.Image:
    positions = [
        (24, 21, 8, True),
        (24, 20, 8, True),
        (25, 20, 9, False),
        (26, 21, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gun_switch_overlay() -> Image.Image:
    sequence = [
        (27, 22, 8, True, False),
        (27, 20, 8, True, False),
        (28, 18, 10, False, False),
        (28, 21, 10, False, False),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered, flash) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, muzzle_flash=flash, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def draw_arc(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], start: int, end: int, color: tuple[int, int, int, int], width: int) -> None:
    draw.arc(box, start=start, end=end, fill=color, width=width)


def make_slash_strip(mode: str) -> Image.Image:
    out = Image.new("RGBA", (CELL_W * 6, CELL_H), (0, 0, 0, 0))
    for i in range(6):
        frame = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        if mode == "a2":
            draw_arc(draw, (10, 12, 36, 36), -40 + i * 3, 140 + i * 6, PALETTE["gold"], 4)
            draw_arc(draw, (12, 14, 34, 34), -28 + i * 3, 126 + i * 5, PALETTE["gold_light"], 2)
        else:
            draw.line((14, 24, 26 + i * 2, 24), fill=PALETTE["gold_light"], width=4)
            draw.line((14, 24, 26 + i * 2, 24), fill=PALETTE["gold"], width=2)
            draw_arc(draw, (18, 14, 40, 34), -30, 32, PALETTE["gold"], 4)
            draw_arc(draw, (20, 16, 38, 32), -18, 24, PALETTE["white"], 2)
        out.alpha_composite(frame, (i * CELL_W, 0))
    return out


def make_perfect_guard_strip() -> Image.Image:
    out = Image.new("RGBA", (CELL_W * 5, CELL_H), (0, 0, 0, 0))
    radii = [8, 11, 14, 17, 20]
    for i, radius in enumerate(radii):
        frame = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        alpha = max(70, 220 - i * 28)
        gold = (*PALETTE["gold"][:3], alpha)
        teal = (*PALETTE["teal_light"][:3], alpha)
        draw_arc(draw, (24 - radius, 24 - radius, 24 + radius, 24 + radius), -35, 215, gold, 3)
        draw_arc(draw, (24 - radius + 3, 24 - radius + 3, 24 + radius - 3, 24 + radius - 3), -18, 198, teal, 2)
        draw.line((24 - (4 + i), 24, 24 + (4 + i), 24), fill=PALETTE["white"], width=2)
        draw.line((24, 24 - (4 + i), 24, 24 + (4 + i)), fill=PALETTE["white"], width=2)
        out.alpha_composite(frame, (i * CELL_W, 0))
    return out


def make_preview(images: list[tuple[str, Image.Image]]) -> Image.Image:
    width = max(img.width for _, img in images)
    height = sum(img.height for _, img in images) + (len(images) - 1) * 8
    preview = Image.new("RGBA", (width, height), (14, 22, 34, 255))
    y = 0
    for _, img in images:
        preview.alpha_composite(img, (0, y))
        y += img.height + 8
    return preview


def compose_layers(body: Image.Image, overlay: Image.Image) -> Image.Image:
    out = body.copy()
    out.alpha_composite(overlay)
    return out


def make_cell_canvas(sheet: Image.Image, row_name: str, frame_index: int, paste_x: int, paste_y: int) -> Image.Image:
    canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    frame = crop_frame(sheet, row_name, frame_index)
    paste_base(canvas, frame, paste_x, paste_y)
    return canvas


def paste_opaque_region(
    source_canvas: Image.Image,
    target_canvas: Image.Image,
    region: tuple[int, int, int, int],
    offset_x: int = 0,
    offset_y: int = 0,
) -> None:
    source_px = source_canvas.load()
    target_px = target_canvas.load()
    x0, y0, x1, y1 = region
    for source_y in range(y0, y1):
        target_y = source_y + offset_y
        if target_y < 0 or target_y >= CELL_H:
            continue
        for source_x in range(x0, x1):
            target_x = source_x + offset_x
            if target_x < 0 or target_x >= CELL_W:
                continue
            pixel = source_px[source_x, source_y]
            if pixel[3] == 0:
                continue
            target_px[target_x, target_y] = pixel


GUN_PATCH_REGION = (14, 9, 40, 27)


def make_gunform_idle(sheet: Image.Image) -> Image.Image:
    return make_strip_from_sequence(sheet, [("gun_idle", i, 12, 10) for i in range(4)])


def make_gunform_attack(sheet: Image.Image) -> Image.Image:
    return make_strip_from_sequence(
        sheet,
        [
            ("gun_idle", 0, 12, 10),
            ("gun_attack", 0, 11, 8),
            ("gun_attack", 1, 11, 8),
            ("gun_attack", 2, 11, 8),
            ("gun_attack", 3, 11, 8),
            ("gun_attack", 4, 11, 8),
        ],
    )


def make_gunform_move(sheet: Image.Image) -> Image.Image:
    source_cycle = [0, 1, 2, 3, 0, 1, 2, 3]
    out = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    for i, source_index in enumerate(source_cycle):
        canvas = make_cell_canvas(sheet, "run", i, 12, 10)
        source = make_cell_canvas(sheet, "gun_idle", source_index, 12, 10)
        paste_opaque_region(source, canvas, GUN_PATCH_REGION)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunform_guard(sheet: Image.Image) -> Image.Image:
    base_sequence = [("neutral", 1), ("neutral", 1), ("neutral", 2), ("neutral", 2)]
    source_cycle = [1, 1, 2, 2]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, ((row_name, frame_index), source_index) in enumerate(zip(base_sequence, source_cycle)):
        canvas = make_cell_canvas(sheet, row_name, frame_index, 13, 10)
        source = make_cell_canvas(sheet, "gun_idle", source_index, 12, 10)
        paste_opaque_region(source, canvas, GUN_PATCH_REGION)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunform_hurt(sheet: Image.Image) -> Image.Image:
    source_cycle = [2, 2, 3, 3]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, source_index in enumerate(source_cycle):
        canvas = make_cell_canvas(sheet, "hurt", i, 14, 9)
        source = make_cell_canvas(sheet, "gun_idle", source_index, 12, 10)
        paste_opaque_region(source, canvas, GUN_PATCH_REGION, offset_x=-1, offset_y=1)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunform_switch(sheet: Image.Image) -> Image.Image:
    base_sequence = [("neutral", 2, 13, 10), ("switch_pose", 0, 13, 10), ("switch_pose", 1, 13, 10), ("switch_pose", 2, 13, 10)]
    source_sequence = [2, 0, 1, 3]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, ((row_name, frame_index, paste_x, paste_y), source_index) in enumerate(zip(base_sequence, source_sequence)):
        canvas = make_cell_canvas(sheet, row_name, frame_index, paste_x, paste_y)
        source_row = "gun_attack" if source_index in (0, 1) else "gun_idle"
        source_frame = source_index if source_row == "gun_attack" else min(source_index, 3)
        source = make_cell_canvas(sheet, source_row, source_frame, 11 if source_row == "gun_attack" else 12, 8 if source_row == "gun_attack" else 10)
        paste_opaque_region(source, canvas, GUN_PATCH_REGION)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_idle(sheet: Image.Image) -> Image.Image:
    sequence = [
        (0, (24, 19, 10, False)),
        (1, (24, 19, 10, False)),
        (2, (23, 20, 9, True)),
        (3, (24, 19, 10, False)),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (frame_index, (x, y, barrel, lowered)) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, "neutral", frame_index)
        paste_base(canvas, frame, 13, 10)
        draw_x = x + 4
        draw_y = y + (4 if lowered else 5)
        draw = ImageDraw.Draw(canvas)
        draw_gunhold_overlay(draw, draw_x, draw_y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_attack(sheet: Image.Image) -> Image.Image:
    sequence = [
        ("gun_idle", 0, (24, 19, 10, False, False)),
        ("gun_attack", 0, (23, 18, 9, True, False)),
        ("gun_attack", 1, (24, 17, 11, False, False)),
        ("gun_attack", 2, (24, 16, 12, False, True)),
        ("gun_attack", 3, (25, 19, 11, False, False)),
        ("gun_attack", 4, (24, 20, 9, True, False)),
    ]
    out = Image.new("RGBA", (CELL_W * len(sequence), CELL_H), (0, 0, 0, 0))
    for i, (row_name, frame_index, (x, y, barrel, lowered, flash)) in enumerate(sequence):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        frame = crop_frame(sheet, row_name, frame_index)
        base_y = 8 if row_name == "gun_attack" else 10
        paste_base(canvas, frame, 11, base_y)
        original_canvas = canvas.copy()
        draw_x = x + 4
        draw_y = y + (4 if lowered else 5)
        erase_weapon_zone(canvas, x - 3, y, barrel + 3, lowered=lowered)
        reference_frame = crop_frame(sheet, "neutral", frame_index % 4)
        overlay_reference_patch(canvas, reference_frame, 13, 10, (14, 10, 24, 24))
        draw = ImageDraw.Draw(canvas)
        draw_gunhold_overlay(draw, draw_x, draw_y, barrel, muzzle_flash=flash, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_idle_body(sheet: Image.Image) -> Image.Image:
    return make_gun_idle_body(sheet)


def make_gunhold_idle_overlay() -> Image.Image:
    positions = [
        (25, 19, 9, False),
        (25, 19, 9, False),
        (24, 20, 8, True),
        (25, 19, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gunhold_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_move_body(sheet: Image.Image) -> Image.Image:
    return make_strip_from_sequence(
        sheet,
        [("run", i, 12, 10) for i in range(8)],
    )


def make_gunhold_move_overlay() -> Image.Image:
    positions = [
        (29, 20, 10, False),
        (28, 20, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
        (29, 20, 10, False),
        (28, 20, 9, False),
        (27, 21, 8, True),
        (27, 20, 9, True),
    ]
    out = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_guard_body(sheet: Image.Image) -> Image.Image:
    return make_strip_from_sequence(
        sheet,
        [
            ("neutral", 1, 13, 10),
            ("neutral", 1, 13, 10),
            ("neutral", 2, 13, 10),
            ("neutral", 2, 13, 10),
        ],
    )


def make_gunhold_guard_overlay() -> Image.Image:
    positions = [
        (24, 18, 10, False),
        (24, 18, 10, False),
        (24, 18, 10, False),
        (24, 18, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_hurt_body(sheet: Image.Image) -> Image.Image:
    return make_strip_from_sequence(
        sheet,
        [
            ("hurt", 0, 14, 9),
            ("hurt", 1, 14, 9),
            ("hurt", 2, 14, 9),
            ("hurt", 3, 14, 9),
        ],
    )


def make_gunhold_hurt_overlay() -> Image.Image:
    positions = [
        (24, 20, 8, True),
        (24, 19, 8, True),
        (25, 19, 9, False),
        (26, 20, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_switch_body(sheet: Image.Image) -> Image.Image:
    return make_strip_from_sequence(
        sheet,
        [
            ("neutral", 2, 13, 10),
            ("switch_pose", 0, 13, 10),
            ("switch_pose", 1, 13, 10),
            ("switch_pose", 2, 13, 10),
        ],
    )


def make_gunhold_switch_overlay() -> Image.Image:
    positions = [
        (24, 20, 8, True),
        (24, 19, 8, True),
        (25, 18, 9, False),
        (26, 19, 10, False),
    ]
    out = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gun_overlay(draw, x, y, barrel, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def make_gunhold_attack_body(sheet: Image.Image) -> Image.Image:
    return make_gun_attack_body(sheet)


def make_gunhold_attack_overlay() -> Image.Image:
    positions = [
        (25, 19, 9, False, False),
        (24, 18, 8, True, False),
        (25, 17, 10, False, False),
        (25, 16, 11, False, True),
        (26, 19, 10, False, False),
        (25, 20, 8, True, False),
    ]
    out = Image.new("RGBA", (CELL_W * 6, CELL_H), (0, 0, 0, 0))
    for i, (x, y, barrel, lowered, flash) in enumerate(positions):
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw_gunhold_overlay(draw, x, y, barrel, muzzle_flash=flash, lowered=lowered)
        out.alpha_composite(canvas, (i * CELL_W, 0))
    return out


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SRC).convert("RGBA")

    gun_idle = make_gun_idle(sheet)
    gun_attack = make_gun_attack(sheet)
    gun_move = make_gun_move(sheet)
    dash = make_dash_strip(sheet)
    gun_dash = make_gun_dash(sheet)
    gun_guard = make_gun_guard(sheet)
    gun_hurt = make_gun_hurt(sheet)
    gun_switch = make_gun_switch(sheet)
    gun_idle_body = make_gun_idle_body(sheet)
    gun_attack_body = make_gun_attack_body(sheet)
    gun_move_body = make_gun_move_body(sheet)
    gun_guard_body = make_gun_guard_body(sheet)
    gun_hurt_body = make_gun_hurt_body(sheet)
    gun_switch_body = make_gun_switch_body(sheet)
    gun_idle_overlay = make_gun_idle_overlay()
    gun_attack_overlay = make_gun_attack_overlay()
    gun_move_overlay = make_gun_move_overlay()
    gun_guard_overlay = make_gun_guard_overlay()
    gun_hurt_overlay = make_gun_hurt_overlay()
    gun_switch_overlay = make_gun_switch_overlay()
    slash_a2 = make_slash_strip("a2")
    slash_a3 = make_slash_strip("a3")
    perfect_guard = make_perfect_guard_strip()
    gunhold_idle_body = make_gunhold_idle_body(sheet)
    gunhold_idle_overlay = make_gunhold_idle_overlay()
    gunhold_move_body = make_gunhold_move_body(sheet)
    gunhold_move_overlay = make_gunhold_move_overlay()
    gunhold_guard_body = make_gunhold_guard_body(sheet)
    gunhold_guard_overlay = make_gunhold_guard_overlay()
    gunhold_hurt_body = make_gunhold_hurt_body(sheet)
    gunhold_hurt_overlay = make_gunhold_hurt_overlay()
    gunhold_switch_body = make_gunhold_switch_body(sheet)
    gunhold_switch_overlay = make_gunhold_switch_overlay()
    gunhold_attack_body = make_gunhold_attack_body(sheet)
    gunhold_attack_overlay = make_gunhold_attack_overlay()
    gunhold_idle = make_gunhold_idle(sheet)
    gunhold_move = compose_layers(gunhold_move_body, gunhold_move_overlay)
    gunhold_guard = compose_layers(gunhold_guard_body, gunhold_guard_overlay)
    gunhold_hurt = compose_layers(gunhold_hurt_body, gunhold_hurt_overlay)
    gunhold_switch = compose_layers(gunhold_switch_body, gunhold_switch_overlay)
    gunhold_attack = make_gunhold_attack(sheet)
    gunform_idle = make_gunform_idle(sheet)
    gunform_attack = make_gunform_attack(sheet)
    gunform_move = make_gunform_move(sheet)
    gunform_guard = make_gunform_guard(sheet)
    gunform_hurt = make_gunform_hurt(sheet)
    gunform_switch = make_gunform_switch(sheet)

    gun_idle.save(ROOT / "green_bandit_gun_idle.png")
    gun_attack.save(ROOT / "green_bandit_gun_attack.png")
    gun_move.save(ROOT / "green_bandit_gun_move.png")
    dash.save(ROOT / "green_bandit_dash.png")
    gun_dash.save(ROOT / "green_bandit_gun_dash.png")
    gun_guard.save(ROOT / "green_bandit_gun_guard.png")
    gun_hurt.save(ROOT / "green_bandit_gun_hurt.png")
    gun_switch.save(ROOT / "green_bandit_gun_switch.png")
    gun_idle_body.save(ROOT / "green_bandit_gun_idle_body.png")
    gun_attack_body.save(ROOT / "green_bandit_gun_attack_body.png")
    gun_move_body.save(ROOT / "green_bandit_gun_move_body.png")
    gun_guard_body.save(ROOT / "green_bandit_gun_guard_body.png")
    gun_hurt_body.save(ROOT / "green_bandit_gun_hurt_body.png")
    gun_switch_body.save(ROOT / "green_bandit_gun_switch_body.png")
    gun_idle_overlay.save(ROOT / "green_bandit_gun_idle_overlay.png")
    gun_attack_overlay.save(ROOT / "green_bandit_gun_attack_overlay.png")
    gun_move_overlay.save(ROOT / "green_bandit_gun_move_overlay.png")
    gun_guard_overlay.save(ROOT / "green_bandit_gun_guard_overlay.png")
    gun_hurt_overlay.save(ROOT / "green_bandit_gun_hurt_overlay.png")
    gun_switch_overlay.save(ROOT / "green_bandit_gun_switch_overlay.png")
    slash_a2.save(ROOT / "green_bandit_slash_a2.png")
    slash_a3.save(ROOT / "green_bandit_slash_a3.png")
    perfect_guard.save(ROOT / "green_bandit_perfect_guard.png")
    gunhold_idle_body.save(ROOT / "green_bandit_gunhold_idle_body.png")
    gunhold_idle_overlay.save(ROOT / "green_bandit_gunhold_idle_overlay.png")
    gunhold_move_body.save(ROOT / "green_bandit_gunhold_move_body.png")
    gunhold_move_overlay.save(ROOT / "green_bandit_gunhold_move_overlay.png")
    gunhold_guard_body.save(ROOT / "green_bandit_gunhold_guard_body.png")
    gunhold_guard_overlay.save(ROOT / "green_bandit_gunhold_guard_overlay.png")
    gunhold_hurt_body.save(ROOT / "green_bandit_gunhold_hurt_body.png")
    gunhold_hurt_overlay.save(ROOT / "green_bandit_gunhold_hurt_overlay.png")
    gunhold_switch_body.save(ROOT / "green_bandit_gunhold_switch_body.png")
    gunhold_switch_overlay.save(ROOT / "green_bandit_gunhold_switch_overlay.png")
    gunhold_attack_body.save(ROOT / "green_bandit_gunhold_attack_body.png")
    gunhold_attack_overlay.save(ROOT / "green_bandit_gunhold_attack_overlay.png")
    gunhold_idle.save(ROOT / "green_bandit_gunhold_idle.png")
    gunhold_move.save(ROOT / "green_bandit_gunhold_move.png")
    gunhold_guard.save(ROOT / "green_bandit_gunhold_guard.png")
    gunhold_hurt.save(ROOT / "green_bandit_gunhold_hurt.png")
    gunhold_switch.save(ROOT / "green_bandit_gunhold_switch.png")
    gunhold_attack.save(ROOT / "green_bandit_gunhold_attack.png")
    gunform_idle.save(ROOT / "green_bandit_gunform_idle.png")
    gunform_attack.save(ROOT / "green_bandit_gunform_attack.png")
    gunform_move.save(ROOT / "green_bandit_gunform_move.png")
    gunform_guard.save(ROOT / "green_bandit_gunform_guard.png")
    gunform_hurt.save(ROOT / "green_bandit_gunform_hurt.png")
    gunform_switch.save(ROOT / "green_bandit_gunform_switch.png")

    preview = make_preview(
        [
            ("gun_idle", gun_idle),
            ("gun_attack", gun_attack),
            ("gun_move", gun_move),
            ("gun_idle_body", gun_idle_body),
            ("gun_attack_body", gun_attack_body),
            ("gun_move_body", gun_move_body),
            ("gun_guard_body", gun_guard_body),
            ("gun_hurt_body", gun_hurt_body),
            ("gun_switch_body", gun_switch_body),
            ("gun_idle_overlay", gun_idle_overlay),
            ("gun_attack_overlay", gun_attack_overlay),
            ("gun_move_overlay", gun_move_overlay),
            ("gun_guard_overlay", gun_guard_overlay),
            ("gun_hurt_overlay", gun_hurt_overlay),
            ("gun_switch_overlay", gun_switch_overlay),
            ("gunhold_idle", gunhold_idle),
            ("gunhold_move", gunhold_move),
            ("gunhold_guard", gunhold_guard),
            ("gunhold_hurt", gunhold_hurt),
            ("gunhold_switch", gunhold_switch),
            ("gunhold_attack", gunhold_attack),
            ("gunform_idle", gunform_idle),
            ("gunform_attack", gunform_attack),
            ("gunform_move", gunform_move),
            ("gunform_guard", gunform_guard),
            ("gunform_hurt", gunform_hurt),
            ("gunform_switch", gunform_switch),
            ("dash", dash),
            ("gun_dash", gun_dash),
            ("gun_guard", gun_guard),
            ("gun_hurt", gun_hurt),
            ("gun_switch", gun_switch),
            ("slash_a2", slash_a2),
            ("slash_a3", slash_a3),
            ("perfect_guard", perfect_guard),
        ]
    )
    preview.save(ROOT / "green_bandit_sideview_addons_preview.png")
    print(f"Generated sideview addon assets in {ROOT}")


if __name__ == "__main__":
    main()
