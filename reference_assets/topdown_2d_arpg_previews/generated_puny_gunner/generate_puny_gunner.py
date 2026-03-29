from pathlib import Path

from PIL import Image, ImageDraw


FRAME_W = 32
FRAME_H = 32
ROWS = 8
MOVE_COLS = list(range(0, 6))
SHOOT_COLS = [14, 15]
IDLE_COLS = [0, 1]
PREVIEW_SCALE = 4


# Reuse the original sheet's neutral metal/leather tones so the weapon reads
# like it belongs to the same pack instead of imported from another style.
PALETTE = {
    "shadow": (4, 4, 4, 255),
    "gun_dark": (54, 54, 54, 255),
    "gun_mid": (125, 123, 118, 255),
    "gun_light": (162, 158, 150, 255),
    "gun_hi": (232, 232, 232, 255),
    "grip": (93, 71, 23, 255),
    "grip_dark": (63, 48, 19, 255),
    "flash_core": (255, 238, 173, 255),
    "flash_mid": (255, 187, 72, 255),
    "flash_hot": (255, 97, 52, 255),
}


ROOT = Path(__file__).resolve().parents[1]
SRC_SHEET = ROOT / "puny_characters_src_v1" / "Puny-Characters" / "Soldier-Blue.png"
OUT_DIR = Path(__file__).resolve().parent


# The rows appear to be arranged in 8 directions.
# Using direction names keeps the offset table readable.
ROW_DIRECTIONS = [
    "down",
    "down_right",
    "right",
    "up_right",
    "up",
    "up_left",
    "left",
    "down_left",
]


BASE_SHAPES = {
    "down": [
        (0, 0, "gun_dark"),
        (1, 0, "gun_mid"),
        (2, 0, "gun_light"),
        (2, -1, "gun_hi"),
        (-1, 1, "grip"),
        (-1, 2, "grip_dark"),
        (3, 1, "shadow"),
    ],
    "down_right": [
        (0, 0, "gun_dark"),
        (1, -1, "gun_mid"),
        (2, -2, "gun_light"),
        (2, -3, "gun_hi"),
        (-1, 1, "grip"),
        (-1, 2, "grip_dark"),
        (3, -1, "shadow"),
    ],
    "right": [
        (0, 0, "gun_dark"),
        (1, 0, "gun_mid"),
        (2, 0, "gun_light"),
        (3, 0, "gun_hi"),
        (-1, 1, "grip"),
        (-1, 2, "grip_dark"),
        (4, 0, "shadow"),
    ],
    "up_right": [
        (0, 0, "gun_dark"),
        (1, -1, "gun_mid"),
        (2, -2, "gun_light"),
        (3, -3, "gun_hi"),
        (-1, 1, "grip"),
        (-1, 2, "grip_dark"),
        (3, -2, "shadow"),
    ],
    "up": [
        (0, 0, "gun_dark"),
        (0, -1, "gun_mid"),
        (0, -2, "gun_light"),
        (0, -3, "gun_hi"),
        (-1, 1, "grip"),
        (-1, 2, "grip_dark"),
        (1, -3, "shadow"),
    ],
    "up_left": [
        (0, 0, "gun_dark"),
        (-1, -1, "gun_mid"),
        (-2, -2, "gun_light"),
        (-3, -3, "gun_hi"),
        (1, 1, "grip"),
        (1, 2, "grip_dark"),
        (-3, -2, "shadow"),
    ],
    "left": [
        (0, 0, "gun_dark"),
        (-1, 0, "gun_mid"),
        (-2, 0, "gun_light"),
        (-3, 0, "gun_hi"),
        (1, 1, "grip"),
        (1, 2, "grip_dark"),
        (-4, 0, "shadow"),
    ],
    "down_left": [
        (0, 0, "gun_dark"),
        (-1, -1, "gun_mid"),
        (-2, -2, "gun_light"),
        (-2, -3, "gun_hi"),
        (1, 1, "grip"),
        (1, 2, "grip_dark"),
        (-3, -1, "shadow"),
    ],
}


FLASH_SHAPES = {
    "down": [(3, -1), (4, 0), (3, 1)],
    "down_right": [(3, -3), (4, -2), (3, -1)],
    "right": [(4, -1), (5, 0), (4, 1)],
    "up_right": [(4, -4), (5, -3), (4, -2)],
    "up": [(-1, -4), (0, -5), (1, -4)],
    "up_left": [(-4, -4), (-5, -3), (-4, -2)],
    "left": [(-4, -1), (-5, 0), (-4, 1)],
    "down_left": [(-3, -3), (-4, -2), (-3, -1)],
}


ANCHORS = {
    "down": (19, 20),
    "down_right": (19, 19),
    "right": (20, 18),
    "up_right": (18, 16),
    "up": (16, 14),
    "up_left": (13, 16),
    "left": (12, 18),
    "down_left": (13, 19),
}


MOVE_BOB = {
    "down": [(0, 0), (0, 0), (0, 1), (0, 1), (0, 0), (0, 0)],
    "down_right": [(0, 0), (1, 0), (1, 1), (1, 1), (0, 0), (0, 0)],
    "right": [(0, 0), (1, 0), (1, 0), (1, 0), (0, 0), (0, 0)],
    "up_right": [(0, 0), (1, -1), (1, -1), (1, 0), (0, 0), (0, 0)],
    "up": [(0, 0), (0, -1), (0, -1), (0, 0), (0, 0), (0, 0)],
    "up_left": [(0, 0), (-1, -1), (-1, -1), (-1, 0), (0, 0), (0, 0)],
    "left": [(0, 0), (-1, 0), (-1, 0), (-1, 0), (0, 0), (0, 0)],
    "down_left": [(0, 0), (-1, 0), (-1, 1), (-1, 1), (0, 0), (0, 0)],
}


SHOOT_PUSH = {
    "down": [(1, 0), (0, 1)],
    "down_right": [(1, 0), (0, 0)],
    "right": [(2, 0), (1, 0)],
    "up_right": [(1, -1), (0, 0)],
    "up": [(0, -2), (0, -1)],
    "up_left": [(-1, -1), (0, 0)],
    "left": [(-2, 0), (-1, 0)],
    "down_left": [(-1, 0), (0, 0)],
}


def paint_pixels(frame: Image.Image, anchor: tuple[int, int], direction: str, with_flash: bool) -> None:
    ax, ay = anchor
    for dx, dy, tone in BASE_SHAPES[direction]:
        x = ax + dx
        y = ay + dy
        if 0 <= x < frame.width and 0 <= y < frame.height:
            frame.putpixel((x, y), PALETTE[tone])

    if with_flash:
        flash = FLASH_SHAPES[direction]
        flash_colors = ["flash_core", "flash_mid", "flash_hot"]
        for (dx, dy), tone in zip(flash, flash_colors):
            x = ax + dx
            y = ay + dy
            if 0 <= x < frame.width and 0 <= y < frame.height:
                frame.putpixel((x, y), PALETTE[tone])


def crop_frame(sheet: Image.Image, col: int, row: int) -> Image.Image:
    return sheet.crop((col * FRAME_W, row * FRAME_H, (col + 1) * FRAME_W, (row + 1) * FRAME_H))


def build_animation_sheet(
    source: Image.Image,
    columns: list[int],
    offsets_by_direction: dict[str, list[tuple[int, int]]],
    flash_on_first: bool = False,
) -> Image.Image:
    result = Image.new("RGBA", (len(columns) * FRAME_W, ROWS * FRAME_H), (0, 0, 0, 0))
    for row, direction in enumerate(ROW_DIRECTIONS):
        for index, col in enumerate(columns):
            frame = crop_frame(source, col, row).copy()
            dx, dy = offsets_by_direction[direction][index]
            anchor_x, anchor_y = ANCHORS[direction]
            paint_pixels(frame, (anchor_x + dx, anchor_y + dy), direction, flash_on_first and index == 0)
            result.paste(frame, (index * FRAME_W, row * FRAME_H), frame)
    return result


def build_full_sheet(source: Image.Image, move_sheet: Image.Image, shoot_sheet: Image.Image) -> Image.Image:
    full = source.copy()
    for row in range(ROWS):
        for index, col in enumerate(MOVE_COLS):
            frame = crop_frame(move_sheet, index, row)
            full.paste(frame, (col * FRAME_W, row * FRAME_H), frame)
        for index, col in enumerate(SHOOT_COLS):
            frame = crop_frame(shoot_sheet, index, row)
            full.paste(frame, (col * FRAME_W, row * FRAME_H), frame)

        # Keep one ready-to-use standing pose with the gun in the original sheet.
        idle_frame = crop_frame(move_sheet, 0, row)
        full.paste(idle_frame, (21 * FRAME_W, row * FRAME_H), idle_frame)
    return full


def save_preview(sheet: Image.Image, filename: str, bg: tuple[int, int, int, int]) -> None:
    preview = Image.new("RGBA", (sheet.width * PREVIEW_SCALE, sheet.height * PREVIEW_SCALE), bg)
    scaled = sheet.resize(preview.size, Image.Resampling.NEAREST)
    preview.alpha_composite(scaled)
    preview.save(OUT_DIR / filename)


def save_strip_preview(idle_sheet: Image.Image, move_sheet: Image.Image, shoot_sheet: Image.Image) -> None:
    bg = (89, 109, 66, 255)
    spacer = 12
    width = max(idle_sheet.width, move_sheet.width, shoot_sheet.width) * PREVIEW_SCALE + spacer * 2
    height = (idle_sheet.height + move_sheet.height + shoot_sheet.height) * PREVIEW_SCALE + spacer * 4
    canvas = Image.new("RGBA", (width, height), bg)

    y = spacer
    for sheet in [idle_sheet, move_sheet, shoot_sheet]:
        scaled = sheet.resize((sheet.width * PREVIEW_SCALE, sheet.height * PREVIEW_SCALE), Image.Resampling.NEAREST)
        canvas.alpha_composite(scaled, (spacer, y))
        y += scaled.height + spacer

    canvas.save(OUT_DIR / "puny_gunner_animation_rows_preview.png")


def main() -> None:
    source = Image.open(SRC_SHEET).convert("RGBA")

    idle_offsets = {direction: [(0, 0), (0, 0)] for direction in ROW_DIRECTIONS}
    move_sheet = build_animation_sheet(source, MOVE_COLS, MOVE_BOB)
    idle_sheet = build_animation_sheet(source, IDLE_COLS, idle_offsets)
    shoot_sheet = build_animation_sheet(source, SHOOT_COLS, SHOOT_PUSH, flash_on_first=True)
    full_sheet = build_full_sheet(source, move_sheet, shoot_sheet)

    idle_sheet.save(OUT_DIR / "puny_gunner_idle_8dir.png")
    move_sheet.save(OUT_DIR / "puny_gunner_move_8dir.png")
    shoot_sheet.save(OUT_DIR / "puny_gunner_shoot_8dir.png")
    full_sheet.save(OUT_DIR / "puny_gunner_fullsheet.png")

    save_preview(idle_sheet, "puny_gunner_idle_8dir_preview.png", (89, 109, 66, 255))
    save_preview(move_sheet, "puny_gunner_move_8dir_preview.png", (89, 109, 66, 255))
    save_preview(shoot_sheet, "puny_gunner_shoot_8dir_preview.png", (89, 109, 66, 255))
    save_preview(full_sheet, "puny_gunner_fullsheet_preview.png", (24, 24, 24, 255))
    save_strip_preview(idle_sheet, move_sheet, shoot_sheet)


if __name__ == "__main__":
    main()
