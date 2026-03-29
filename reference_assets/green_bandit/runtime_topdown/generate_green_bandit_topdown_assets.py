from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
CELL = 32
DIR_ANGLES = [0, -45, -90, -135, 180, 135, 90, 45]

PALETTE = {
    "hood_dark": (21, 119, 114, 255),
    "hood_mid": (39, 170, 162, 255),
    "hood_light": (92, 219, 208, 255),
    "skin": (252, 228, 206, 255),
    "coat": (39, 74, 57, 255),
    "coat_light": (78, 126, 95, 255),
    "belt": (139, 99, 66, 255),
    "boot": (150, 104, 61, 255),
    "blade": (223, 232, 236, 255),
    "blade_edge": (255, 255, 255, 255),
    "pistol": (196, 204, 214, 255),
    "pistol_dark": (98, 114, 128, 255),
    "gold": (245, 191, 92, 255),
    "gold_light": (255, 235, 168, 255),
    "gun_cyan": (119, 215, 234, 255),
    "gun_cyan_light": (223, 249, 255, 255),
    "hurt": (255, 128, 118, 220),
    "guard": (202, 244, 255, 255),
}


def rgba(name: str) -> tuple[int, int, int, int]:
    return PALETTE[name]


def vec(angle_deg: float) -> tuple[float, float]:
    rad = math.radians(angle_deg)
    return math.cos(rad), math.sin(rad)


def to_px(x: float, y: float) -> tuple[int, int]:
    return round(x), round(y)


def poly(draw: ImageDraw.ImageDraw, points: Iterable[tuple[float, float]], fill: tuple[int, int, int, int]) -> None:
    draw.polygon([to_px(x, y) for x, y in points], fill=fill)


def line(draw: ImageDraw.ImageDraw, points: Iterable[tuple[float, float]], fill: tuple[int, int, int, int], width: int = 1) -> None:
    draw.line([to_px(x, y) for x, y in points], fill=fill, width=width)


def circle(draw: ImageDraw.ImageDraw, x: float, y: float, r: float, fill: tuple[int, int, int, int]) -> None:
    draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def rect(draw: ImageDraw.ImageDraw, x0: float, y0: float, x1: float, y1: float, fill: tuple[int, int, int, int]) -> None:
    draw.rectangle((round(x0), round(y0), round(x1), round(y1)), fill=fill)


def draw_player_frame(anim: str, dir_idx: int, frame_idx: int, frame_count: int) -> Image.Image:
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    angle = DIR_ANGLES[dir_idx]
    fx, fy = vec(angle)
    sx, sy = -fy, fx
    progress = frame_idx / max(1, frame_count - 1)

    cx = 16
    cy = 17
    bob = 0
    step = 0
    if anim == "idle":
      bob = math.sin(progress * math.tau) * 0.35
    elif anim == "run":
      bob = math.sin((frame_idx / frame_count) * math.tau) * 0.7
      step = math.sin((frame_idx / frame_count) * math.tau) * 1.5
    elif anim == "dash":
      bob = -0.4 + math.sin((frame_idx / frame_count) * math.tau) * 0.45
      step = 0.5 + progress * 1.2
    elif anim == "guard":
      bob = -0.2
    elif anim == "hurt":
      bob = 0.4
    cy += bob

    back_x = -fx
    back_y = -fy
    cape_len = 7.5 if anim != "dash" else 10.5
    shoulder = 4.3
    hip = 3.2
    head_push = 3.1

    neck_x = cx + fx * 0.6
    neck_y = cy + fy * 0.6
    head_x = cx + fx * head_push
    head_y = cy + fy * head_push - 4.6

    cape_tip_x = cx + back_x * cape_len
    cape_tip_y = cy + back_y * cape_len + 3.2
    left_shoulder = (cx - sx * shoulder - fx * 0.4, cy - sy * shoulder - fy * 1.2)
    right_shoulder = (cx + sx * shoulder - fx * 0.4, cy + sy * shoulder - fy * 1.2)
    left_hip = (cx - sx * hip + back_x * 2.4, cy - sy * hip + back_y * 2.4 + 2.1)
    right_hip = (cx + sx * hip + back_x * 2.4, cy + sy * hip + back_y * 2.4 + 2.1)
    cape_tip = (cape_tip_x, cape_tip_y)

    if anim == "dash":
        ghost_tip = (cape_tip_x + back_x * 2.2, cape_tip_y + back_y * 2.2)
        poly(draw, [left_shoulder, right_shoulder, ghost_tip], (92, 219, 208, 88))

    poly(draw, [left_shoulder, right_shoulder, right_hip, cape_tip, left_hip], rgba("hood_dark"))
    poly(draw, [(cx - sx * 2.4, cy - sy * 2.4 - 0.6), (cx + sx * 2.4, cy + sy * 2.4 - 0.6), right_hip, left_hip], rgba("coat"))
    poly(draw, [(cx - sx * 2.1, cy - sy * 2.1 - 1.1), (cx + sx * 2.1, cy + sy * 2.1 - 1.1), (cx + sx * 1.6 + back_x * 1.2, cy + sy * 1.6 + back_y * 1.4), (cx - sx * 1.6 + back_x * 1.2, cy - sy * 1.6 + back_y * 1.4)], rgba("coat_light"))
    circle(draw, head_x, head_y, 4.6, rgba("hood_mid"))
    circle(draw, head_x, head_y, 3.2, rgba("skin"))
    circle(draw, head_x - sx * 1.1 - fx * 0.2, head_y - sy * 1.1 - fy * 0.2, 0.75, rgba("hood_light"))

    stride = step
    if anim == "guard":
        stride = -0.5
    if anim == "hurt":
        stride = 1.0
    left_foot = (cx - sx * 2.2 + back_x * (5.4 + stride), cy - sy * 2.2 + back_y * (5.4 + stride) + 4.2)
    right_foot = (cx + sx * 2.2 + back_x * (5.4 - stride), cy + sy * 2.2 + back_y * (5.4 - stride) + 4.2)
    rect(draw, left_foot[0] - 1.2, left_foot[1] - 1.2, left_foot[0] + 1.2, left_foot[1] + 1.2, rgba("boot"))
    rect(draw, right_foot[0] - 1.2, right_foot[1] - 1.2, right_foot[0] + 1.2, right_foot[1] + 1.2, rgba("boot"))
    rect(draw, cx - 2.5, cy + 1.0, cx + 2.5, cy + 2.2, rgba("belt"))

    arm_tuck = 0.8
    if anim == "guard":
        arm_tuck = 0.2
    left_arm = (cx - sx * 4.0 + fx * arm_tuck, cy - sy * 4.0 + fy * arm_tuck - 0.4)
    right_arm = (cx + sx * 4.0 + fx * arm_tuck, cy + sy * 4.0 + fy * arm_tuck - 0.4)
    circle(draw, left_arm[0], left_arm[1], 1.1, rgba("skin"))
    circle(draw, right_arm[0], right_arm[1], 1.1, rgba("skin"))

    weapon = "sword"
    if anim == "gun_attack":
        weapon = "gun"

    if anim == "gun_attack":
        raise_curve = [0.05, 0.2, 0.45, 0.95, 0.45, 0.08][frame_idx]
        hand_x = cx + sx * 2.2 + fx * (4.0 + raise_curve * 4.0)
        hand_y = cy + sy * 2.2 + fy * (0.5 + raise_curve * 3.8) - 1.8
        muzzle_x = hand_x + fx * (4.8 + raise_curve * 2.0)
        muzzle_y = hand_y + fy * (4.8 + raise_curve * 2.0)
        line(draw, [(hand_x, hand_y), (muzzle_x, muzzle_y)], rgba("pistol_dark"), 3)
        line(draw, [(hand_x + sx * 0.8, hand_y + sy * 0.8), (muzzle_x, muzzle_y)], rgba("pistol"), 1)
        rect(draw, hand_x - sx * 0.8 - 1.0, hand_y - sy * 0.8 - 1.0, hand_x + sx * 0.8 + 1.0, hand_y + sy * 0.8 + 1.0, rgba("gun_cyan"))
        circle(draw, muzzle_x, muzzle_y, 0.9, rgba("gun_cyan_light"))
    else:
        blade_progress = 0.15
        if anim == "sword_attack":
            blade_progress = [0.12, 0.2, 0.4, 0.7, 0.95, 0.78][frame_idx]
        elif anim == "dash":
            blade_progress = 0.28
        elif anim == "guard":
            blade_progress = -0.18
        sweep = (blade_progress - 0.5) * math.radians(140)
        base_angle = math.radians(angle) + sweep
        blade_dir = (math.cos(base_angle), math.sin(base_angle))
        hand_x = cx + sx * 1.8 + fx * 1.6
        hand_y = cy + sy * 1.8 + fy * 1.6 - 0.4
        guard_len = 2.0
        tip_len = 8.5 if anim != "dash" else 10.5
        tip_x = hand_x + blade_dir[0] * tip_len
        tip_y = hand_y + blade_dir[1] * tip_len
        line(draw, [(hand_x, hand_y), (tip_x, tip_y)], rgba("blade"), 2)
        line(draw, [(hand_x, hand_y), (tip_x, tip_y)], rgba("blade_edge"), 1)
        line(draw, [(hand_x - sx * guard_len, hand_y - sy * guard_len), (hand_x + sx * guard_len, hand_y + sy * guard_len)], rgba("gold"), 1)

    if anim == "guard":
        shield_center = (cx + fx * 3.0, cy + fy * 3.0 - 1.0)
        circle(draw, shield_center[0], shield_center[1], 3.0, (202, 244, 255, 84))
        circle(draw, shield_center[0], shield_center[1], 2.0, (255, 255, 255, 52))

    if anim == "hurt":
        circle(draw, cx, cy - 0.5, 6.8, rgba("hurt"))

    return img


def make_sheet(anim: str, frame_count: int) -> None:
    sheet = Image.new("RGBA", (CELL * frame_count, CELL * 8), (0, 0, 0, 0))
    for dir_idx in range(8):
        for frame_idx in range(frame_count):
            frame = draw_player_frame(anim, dir_idx, frame_idx, frame_count)
            sheet.alpha_composite(frame, (frame_idx * CELL, dir_idx * CELL))
    sheet.save(ROOT / f"player_{anim}_8dir.png")


def make_slash_sheet(name: str, mode: str) -> None:
    frames = 6
    w = 48
    h = 48
    img = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i in range(frames):
        ox = i * w
        p = i / (frames - 1)
        center = (ox + 18, 24)
        if mode == "a1":
            line(draw, [(center[0] - 4, center[1] + 6), (center[0] + 10 + p * 8, center[1] - 6 - p * 4)], rgba("gold"), 4)
            line(draw, [(center[0] - 2, center[1] + 5), (center[0] + 9 + p * 8, center[1] - 5 - p * 4)], rgba("gold_light"), 2)
        elif mode == "a2":
            bbox = (ox + 8, 8, ox + 38, 40)
            draw.arc(bbox, start=-25 - p * 20, end=110 + p * 35, fill=rgba("gold"), width=4)
            draw.arc((bbox[0] + 2, bbox[1] + 2, bbox[2] - 2, bbox[3] - 2), start=-15 - p * 18, end=94 + p * 28, fill=rgba("gold_light"), width=2)
        else:
            line(draw, [(ox + 10, 24), (ox + 28 + p * 10, 24)], rgba("gold_light"), 4)
            draw.arc((ox + 15, 15, ox + 40, 33), start=-30, end=30, fill=rgba("gold"), width=4)
            circle(draw, ox + 33 + p * 6, 24, 2.0 + p * 1.5, (255, 248, 218, 168))
    img.save(ROOT / f"sword_{name}_vfx.png")


def make_muzzle_sheet() -> None:
    frames = 4
    w = 32
    h = 32
    img = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i in range(frames):
        ox = i * w
        size = [2, 5, 3, 1][i]
        pts = [(ox + 12, 16), (ox + 16 + size, 14 - size * 0.4), (ox + 19 + size * 1.1, 16), (ox + 16 + size, 18 + size * 0.4)]
        poly(draw, pts, rgba("gun_cyan"))
        line(draw, [(ox + 9, 16), (ox + 18 + size * 0.9, 16)], rgba("gun_cyan_light"), 1)
    img.save(ROOT / "gun_muzzle_vfx.png")


def make_guard_sheet() -> None:
    frames = 5
    w = 40
    h = 40
    img = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i in range(frames):
        ox = i * w
        r = 6 + i * 2
        alpha = 180 - i * 28
        draw.arc((ox + 20 - r, 20 - r, ox + 20 + r, 20 + r), start=-40, end=220, fill=(202, 244, 255, alpha), width=3)
        draw.arc((ox + 20 - r + 3, 20 - r + 3, ox + 20 + r - 3, 20 + r - 3), start=-25, end=205, fill=(255, 255, 255, max(0, alpha - 40)), width=1)
    img.save(ROOT / "guard_vfx.png")


def make_dash_sheet() -> None:
    frames = 4
    w = 40
    h = 40
    img = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i in range(frames):
        ox = i * w
        length = 9 + i * 4
        alpha = 110 - i * 16
        poly(draw, [(ox + 10, 20), (ox + 20 + length, 14), (ox + 20 + length, 26)], (92, 219, 208, alpha))
        line(draw, [(ox + 9, 20), (ox + 17 + length, 20)], (223, 255, 255, alpha), 2)
    img.save(ROOT / "dash_vfx.png")


def make_hit_sheet() -> None:
    frames = 4
    w = 32
    h = 32
    img = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    sizes = [2, 5, 4, 2]
    for i, size in enumerate(sizes):
        ox = i * w
        line(draw, [(ox + 16 - size, 16), (ox + 16 + size, 16)], rgba("gold_light"), 2)
        line(draw, [(ox + 16, 16 - size), (ox + 16, 16 + size)], rgba("gold_light"), 2)
        line(draw, [(ox + 16 - size + 1, 16 - size + 1), (ox + 16 + size - 1, 16 + size - 1)], rgba("gold"), 1)
        line(draw, [(ox + 16 - size + 1, 16 + size - 1), (ox + 16 + size - 1, 16 - size + 1)], rgba("gold"), 1)
    img.save(ROOT / "hit_vfx.png")


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    make_sheet("idle", 4)
    make_sheet("run", 6)
    make_sheet("dash", 4)
    make_sheet("sword_attack", 6)
    make_sheet("gun_attack", 6)
    make_sheet("guard", 4)
    make_sheet("hurt", 2)
    make_slash_sheet("a1", "a1")
    make_slash_sheet("a2", "a2")
    make_slash_sheet("a3", "a3")
    make_muzzle_sheet()
    make_guard_sheet()
    make_dash_sheet()
    make_hit_sheet()
    print(f"Generated assets in {ROOT}")


if __name__ == "__main__":
    main()
