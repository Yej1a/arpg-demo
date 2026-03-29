## Generated Puny Gunner Mockup

This folder contains a quick style-matching gunner extension for the `Puny Characters` pack.

### What was generated

- `puny_gun_4dir.png`
  - A tiny 4-direction gun sprite sheet in a palette sampled from `Soldier-Blue.png`.

- `puny_gunner_base_4dir.png`
  - A bare-base proof of concept with the generated gun attached.

- `puny_gunner_soldier_blue_4dir.png`
  - A more believable gunner variant built on top of `Soldier-Blue.png`.

- `puny_gunner_mockup_scene.png`
  - A simple preview sheet for quickly checking the look.

- `puny_gunner_idle_8dir.png`
  - 8-direction idle strip derived from `Soldier-Blue.png`.

- `puny_gunner_move_8dir.png`
  - 8-direction move strip that keeps the original walk timing and adds the gun overlay.

- `puny_gunner_shoot_8dir.png`
  - 8-direction ranged attack strip with a small muzzle flash on the first frame.

- `puny_gunner_fullsheet.png`
  - A merged full sheet that updates the original move and ranged-attack slots with the generated gun.

- `generate_puny_gunner.py`
  - Rebuilds the idle / move / shoot rows and preview outputs from the original `Soldier-Blue.png`.

### Intent

This is still a prototype extension rather than a final production asset. The goal is to answer:

1. Can a firearm be added without breaking the `Puny Characters` style?
2. Is the `Soldier-Blue` base a good direction for a gun form?

### Next step if approved

- Tune the gun silhouette toward pistol, musket, or hand-cannon
- Create a player-color variant without the current helmet look
- Add dedicated reload / hurt / dodge gun poses if you want to use this as a real in-game sheet
