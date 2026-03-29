(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const debugUi = document.getElementById("debug-ui");
  const startBtn = document.getElementById("start-btn");
  const dummyIdleBtn = document.getElementById("dummy-idle-btn");
  const dummyMeleeBtn = document.getElementById("dummy-melee-btn");
  const dummyRangedBtn = document.getElementById("dummy-ranged-btn");
  const dummyCycleBtn = document.getElementById("dummy-cycle-btn");
  const dummyTriggerBtn = document.getElementById("dummy-trigger-btn");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const TAU = Math.PI * 2;
  const world = {
    left: 64,
    right: WIDTH - 64,
    groundY: HEIGHT - 76,
    playerChestOffset: 40,
    enemyChestOffset: 42,
    gravity: 1820,
    jumpVelocity: 660,
    airControl: 0.86,
    floorSnap: 2,
  };
  const stagePlatforms = [
    { id: "plat-left", x: 146, y: 392, w: 170, h: 18 },
    { id: "plat-mid", x: 412, y: 348, w: 156, h: 18 },
    { id: "plat-right", x: 690, y: 378, w: 178, h: 18 },
  ];

  const keys = new Set();
  const mouse = {
    x: WIDTH * 0.75,
    y: HEIGHT * 0.42,
    leftDown: false,
    rightDown: false,
    leftPressed: false,
    rightPressed: false,
    wheelDown: false,
  };

  const config = {
    player: {
      speed: 220,
      radius: 18,
      maxHp: 100,
      attackMoveScale: 0.62,
      switchMoveScale: 0.55,
      guardMoveScale: 0.4,
      counterMoveScale: 0.7,
      dashDuration: 0.22,
      dashCooldown: 0.5,
      dashSpeed: 520,
      dashInvulnStart: 0.02,
      dashInvulnEnd: 0.16,
      guardStartup: 0.16,
      gunMaxAmmo: 4,
      gunReloadDuration: 1,
      meleePerfectGuardWindow: 12 / 60,
      rangedPerfectGuardWindow: 0.1,
      perfectGuardHitstop: 4 / 60,
      hurtHitstopMelee: 3 / 60,
      hurtHitstopRanged: 2 / 60,
      hurtDuration: 0.22,
      hurtKnockbackMelee: 150,
      hurtKnockbackRanged: 118,
      hurtKnockbackDecay: 780,
      comboGrace: 0.12,
      blockChipRatio: 0.1,
      counterWindow: 0.6,
    },
    battle: {
      maxMeleeAttackers: 1,
      maxRangedAttackers: 1,
      waveSize: 3,
      waveRespawnDelay: 0.85,
    },
    enemies: {
      melee: {
        radius: 28,
        maxHp: 120,
        moveSpeed: 82,
        orbitSpeed: 58,
        approachRange: 112,
        attackRange: 94,
        damage: 20,
        windup: 0.7,
        activeDuration: 0.2,
        recover: 1.0,
        cooldown: 1.15,
        staggerDuration: 0.82,
        hurtDuration: 0.18,
        hurtHitstop: 3 / 60,
        hurtKnockback: 92,
        hurtKnockbackDecay: 620,
        deathDuration: 0.7,
      },
      ranged: {
        radius: 24,
        maxHp: 96,
        moveSpeed: 116,
        preferredRange: 244,
        pressureRange: 132,
        damage: 16,
        projectileSpeed: 320,
        windup: 0.65,
        activeDuration: 0.18,
        recover: 1.1,
        cooldown: 1.35,
        staggerDuration: 0.5,
        blinkDistance: 148,
        blinkCooldown: 2.5,
        noBlinkDuration: 0.6,
        blinkSettle: 0.16,
        hurtDuration: 0.14,
        hurtHitstop: 2 / 60,
        hurtKnockback: 74,
        hurtKnockbackDecay: 560,
        deathDuration: 0.64,
        hitCenterOffsetY: 48,
        hitRadiusX: 24,
        hitRadiusY: 48,
        muzzleOffsetX: 26,
        muzzleOffsetY: 68,
      },
    },
  };

  const weaponPalette = {
    sword: "#f5bf5c",
    gun: "#77d7ea",
  };

  const attackData = {
    sword: [
      { id: "Sword_A1", total: 14 / 60, activeStart: 5 / 60, damage: 10, reach: 78, arc: 1.15, cancelGuardAt: 10 / 60, cancelDashAt: 10 / 60, cancelSwitchAt: 12 / 60, dashForward: 0, slashRadius: 54, slashWidth: 8, slashStyle: "a1", hitstop: 2 / 60 },
      { id: "Sword_A2", total: 18 / 60, activeStart: 7 / 60, damage: 14, reach: 90, arc: 1.25, cancelGuardAt: 12 / 60, cancelDashAt: 12 / 60, cancelSwitchAt: 14 / 60, dashForward: 0, slashRadius: 66, slashWidth: 9, slashStyle: "a2", hitstop: 3 / 60 },
      { id: "Sword_A3", total: 28 / 60, activeStart: 9 / 60, damage: 20, reach: 116, arc: 0.96, cancelGuardAt: 18 / 60, cancelDashAt: 99, cancelSwitchAt: 22 / 60, dashForward: 0, slashRadius: 92, slashWidth: 14, slashStyle: "a3", hitstop: 4 / 60 },
    ],
    gun: [
      { id: "Gun_A1", total: 30 / 60, activeStart: 10 / 60, damage: 20, bulletSpeed: 540, cancelGuardAt: 18 / 60, cancelDashAt: 99, cancelSwitchAt: 22 / 60 },
      { id: "Gun_A2", total: 30 / 60, activeStart: 10 / 60, damage: 20, bulletSpeed: 540, cancelGuardAt: 18 / 60, cancelDashAt: 99, cancelSwitchAt: 22 / 60 },
      { id: "Gun_A3", total: 30 / 60, activeStart: 10 / 60, damage: 20, bulletSpeed: 540, cancelGuardAt: 18 / 60, cancelDashAt: 99, cancelSwitchAt: 22 / 60 },
      { id: "Gun_A4", total: 50 / 60, activeStart: 20 / 60, damage: 40, bulletSpeed: 640, cancelGuardAt: 32 / 60, cancelDashAt: 99, cancelSwitchAt: 38 / 60, shotStyle: "fourth_shot" },
    ],
    counter: {
      sword: {
        space: {
          melee: {
            id: "Sword_MeleeBreak",
            total: 0.46,
            activeStart: 0.08,
            damage: 36,
            reach: 106,
            arc: 0.94,
            dashForward: 24,
            slashRadius: 92,
            slashWidth: 14,
            slashStyle: "guard_break",
            faceAttacker: true,
            hitstop: 6 / 60,
            stagger: 0.52,
            counterTitle: "BREAK SLASH",
            counterRole: "HIGH DAMAGE",
            counterHint: "Big punish if you commit",
            counterColor: "#ffd36f",
            activationText: "Break Slash",
          },
          ranged: {
            id: "Sword_RangedChase",
            total: 0.44,
            activeStart: 0.08,
            damage: 20,
            reach: 132,
            arc: 1.08,
            dashForward: 0,
            slashRadius: 94,
            slashWidth: 14,
            seekTarget: true,
            chaseOffset: 10,
            slashStyle: "ranged_chase",
            faceAttacker: true,
            hitstop: 4 / 60,
            counterTitle: "CHASE STEP",
            counterRole: "GAP CLOSE",
            counterHint: "Snap in and stay on them",
            counterColor: "#ffca78",
            activationText: "Chase Step",
          },
        },
      },
      gun: {
        space: {
          melee: {
            id: "Gun_MeleeRepel",
            total: 0.42,
            activeStart: 0.08,
            damage: 12,
            reach: 138,
            arc: 1.16,
            shotStyle: "repel_blast",
            knockback: 132,
            recoil: 94,
            stagger: 0.6,
            faceAttacker: true,
            counterTitle: "REPEL BLAST",
            counterRole: "KNOCKBACK",
            counterHint: "Push melee pressure out",
            counterColor: "#aef3ff",
            activationText: "Repel Blast",
          },
          ranged: {
            id: "Gun_RangedBreak",
            total: 0.4,
            activeStart: 0.06,
            damage: 24,
            bulletSpeed: 860,
            projectileRadius: 11,
            projectileKnockback: 136,
            stagger: 0.42,
            hitstop: 4 / 60,
            shotStyle: "armor_break",
            faceAttacker: true,
            counterTitle: "ARMOR BREAK",
            counterRole: "RANGED BREAK",
            counterHint: "Fast pierce from safety",
            counterColor: "#d8fbff",
            activationText: "Armor Break",
          },
        },
      },
    },
  };

  const state = {
    mode: "ready",
    time: 0,
    flashTimer: 0,
    hitstopTimer: 0,
    counterPromptTimer: 0,
    infoTextTimer: 0,
    infoText: "Click Start",
    projectiles: [],
    effects: [],
    lastSpaceAction: "dash",
    counterPromptTitle: "",
    counterPromptRole: "",
    counterPromptHint: "",
    counterPromptColor: "#fff4cb",
    player: null,
    enemies: [],
    encounterMode: "mixed",
    battleManager: null,
    nextEnemyId: 1,
  };

  const enemySpawnPoints = {
    melee: [
      { x: WIDTH * 0.7, y: world.groundY },
      { x: WIDTH * 0.79, y: world.groundY },
      { x: WIDTH * 0.88, y: world.groundY },
    ],
    ranged: [
      { x: stagePlatforms[2].x + 36, y: stagePlatforms[2].y },
      { x: stagePlatforms[1].x + stagePlatforms[1].w * 0.58, y: stagePlatforms[1].y },
      { x: WIDTH * 0.84, y: world.groundY },
    ],
  };

  const encounterSpawnLayouts = {
    mixed: [
      { type: "melee", x: WIDTH * 0.58, y: world.groundY },
      { type: "melee", x: WIDTH * 0.7, y: world.groundY },
      { type: "ranged", x: stagePlatforms[2].x + stagePlatforms[2].w * 0.42, y: stagePlatforms[2].y },
    ],
  };

  const greenBanditSheetRows = {
    swordIdle: buildSpriteFrames(31, 33, [[35, 57], [67, 89], [100, 122], [132, 154]], 11, 33),
    gunReady: buildSpriteFrames(95, 33, [[35, 57], [77, 99], [121, 143], [163, 185]], 11, 33),
    gunAttack: buildSpriteFrames(159, 37, [[38, 60], [75, 98], [107, 124], [138, 154], [167, 185]], 11, 37),
    neutral: buildSpriteFrames(220, 33, [[42, 59], [85, 102], [127, 144], [168, 185]], 8, 33),
    switchPose: buildSpriteFrames(284, 33, [[42, 59], [84, 100], [127, 143]], 8, 33),
    guardPose: buildSpriteFrames(336, 35, [[43, 65], [81, 102], [123, 139]], 10, 35),
    run: buildSpriteFrames(389, 33, [[41, 62], [86, 103], [129, 146], [171, 187], [207, 227], [251, 268], [296, 313], [337, 353]], 10, 33),
    attack: buildSpriteFrames(633, 33, [[38, 60], [84, 103], [121, 140], [161, 196], [210, 234], [250, 271], [290, 312], [329, 365], [373, 399], [420, 440], [459, 481]], 11, 33),
    hurt: buildSpriteFrames(692, 34, [[39, 57], [76, 95], [121, 139], [159, 177]], 11, 34),
  };
  const swordAttackPoseFrames = {
    a1: [greenBanditSheetRows.attack[0], greenBanditSheetRows.attack[1], greenBanditSheetRows.attack[2], greenBanditSheetRows.attack[3], greenBanditSheetRows.attack[4]],
    a2: [greenBanditSheetRows.attack[2], greenBanditSheetRows.attack[3], greenBanditSheetRows.attack[4], greenBanditSheetRows.attack[5], greenBanditSheetRows.attack[6], greenBanditSheetRows.attack[7]],
    a3: [greenBanditSheetRows.attack[5], greenBanditSheetRows.attack[6], greenBanditSheetRows.attack[7], greenBanditSheetRows.attack[8], greenBanditSheetRows.attack[9], greenBanditSheetRows.attack[10]],
    guard_break: [greenBanditSheetRows.attack[4], greenBanditSheetRows.attack[5], greenBanditSheetRows.attack[6], greenBanditSheetRows.attack[7], greenBanditSheetRows.attack[8], greenBanditSheetRows.attack[9], greenBanditSheetRows.attack[10]],
    ranged_chase: [greenBanditSheetRows.attack[3], greenBanditSheetRows.attack[4], greenBanditSheetRows.attack[5], greenBanditSheetRows.attack[6], greenBanditSheetRows.attack[7], greenBanditSheetRows.attack[8]],
  };
  const swordSideIdleFrame = greenBanditSheetRows.attack[10];

  const spriteAssets = {
    playerSheet: createImageAsset("./reference_assets/green_bandit/green_bandit_free_pack/normal/normal.png"),
  };
  const combatVfxAssets = {
    swordA1: createImageAsset("./reference_assets/green_bandit/runtime_topdown/sword_a1_vfx.png"),
    swordA2: createImageAsset("./reference_assets/green_bandit/runtime_topdown/sword_a2_vfx.png"),
    swordA3: createImageAsset("./reference_assets/green_bandit/runtime_topdown/sword_a3_vfx.png"),
    gunMuzzle: createImageAsset("./reference_assets/green_bandit/runtime_topdown/gun_muzzle_vfx.png"),
    hit: createImageAsset("./reference_assets/green_bandit/runtime_topdown/hit_vfx.png"),
    guard: createImageAsset("./reference_assets/green_bandit/runtime_topdown/guard_vfx.png"),
    dash: createImageAsset("./reference_assets/green_bandit/runtime_topdown/dash_vfx.png"),
  };

  const sideviewAddonAssets = {
    dash: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_dash.png"),
    gunDash: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_dash.png"),
    gunIdle: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_idle.png"),
    gunAttack: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_attack.png"),
    gunMove: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_move.png"),
    gunGuard: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_guard.png"),
    gunHurt: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_hurt.png"),
    gunSwitch: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_switch.png"),
    gunIdleOverlay: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_idle_overlay.png"),
    gunAttackOverlay: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_attack_overlay.png"),
    gunMoveOverlay: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_move_overlay.png"),
    gunGuardOverlay: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_guard_overlay.png"),
    gunHurtOverlay: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_hurt_overlay.png"),
    gunSwitchOverlay: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gun_switch_overlay.png"),
    perfectGuard: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_perfect_guard.png"),
  };
  const enemySpriteAssets = {
    meleeSheet: createImageAsset("./reference_assets/skeleton_guy_animated/SkelitonGuy_alpha.png"),
    ranged: {
      idle: Array.from({ length: 10 }, (_, index) =>
        createImageAsset(`./reference_assets/skeleton_archer/Archer Skeleton  Animations/Idle/Separate sp/idle (${index + 1}).png`, { pixelateScale: 0.065 }),
      ),
      walk: Array.from({ length: 10 }, (_, index) =>
        createImageAsset(`./reference_assets/skeleton_archer/Archer Skeleton  Animations/Walk/Separate sp/walk (${index + 1}).png`, { pixelateScale: 0.065 }),
      ),
      attack: Array.from({ length: 10 }, (_, index) =>
        createImageAsset(`./reference_assets/skeleton_archer/Archer Skeleton  Animations/Attack/Separate sp/attack (${index + 1}).png`, { pixelateScale: 0.065 }),
      ),
      hurt: Array.from({ length: 10 }, (_, index) =>
        createImageAsset(`./reference_assets/skeleton_archer/Archer Skeleton  Animations/Evassion/Separate sp/evassion (${index + 1}).png`, { pixelateScale: 0.065 }),
      ),
      death: Array.from({ length: 6 }, (_, index) =>
        createImageAsset(`./reference_assets/skeleton_archer/Archer Skeleton  Animations/Dead/Separate sp/dead (${index + 1}).png`, { pixelateScale: 0.065 }),
      ),
      arrow: createImageAsset("./reference_assets/skeleton_archer/Archer Skeleton  Animations/All parts/arrow.png", { pixelateScale: 0.09 }),
    },
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function buildSpriteFrames(y, height, boxes, anchorX, anchorY = height) {
    return boxes.map(([x0, x1]) => ({
      x: x0,
      y,
      w: x1 - x0 + 1,
      h: height,
      anchorX,
      anchorY,
    }));
  }

  function buildManualFrames(frames) {
    return frames.map((frame) => ({
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      anchorX: frame.anchorX ?? frame.w * 0.5,
      anchorY: frame.anchorY ?? frame.h,
    }));
  }

  function buildStripFrames(frameCount, width, height, anchorX = width * 0.5, anchorY = height * 0.8) {
    return Array.from({ length: frameCount }, (_, index) => ({
      x: index * width,
      y: 0,
      w: width,
      h: height,
      anchorX,
      anchorY,
    }));
  }

  const sideviewAddonFrames = {
    dash: buildStripFrames(4, 48, 48, 24, 39),
    gunDash: buildStripFrames(4, 48, 48, 24, 39),
    gunIdle: buildStripFrames(4, 48, 48, 24, 39),
    gunAttack: buildStripFrames(6, 48, 48, 24, 39),
    gunMove: buildStripFrames(8, 48, 48, 24, 39),
    gunGuard: buildStripFrames(4, 48, 48, 24, 39),
    gunHurt: buildStripFrames(4, 48, 48, 24, 39),
    gunSwitch: buildStripFrames(4, 48, 48, 24, 39),
    gunIdleOverlay: buildStripFrames(4, 48, 48, 30, 22),
    gunAttackOverlay: buildStripFrames(6, 48, 48, 30, 22),
    gunMoveOverlay: buildStripFrames(8, 48, 48, 30, 22),
    gunGuardOverlay: buildStripFrames(4, 48, 48, 30, 22),
    gunHurtOverlay: buildStripFrames(4, 48, 48, 30, 22),
    gunSwitchOverlay: buildStripFrames(4, 48, 48, 30, 22),
  };
  const enemySpriteFrames = {
    meleeIdle: buildManualFrames([
      { x: 24, y: 15, w: 13, h: 18, anchorX: 6.5, anchorY: 18 },
      { x: 45, y: 14, w: 13, h: 19, anchorX: 6.5, anchorY: 19 },
      { x: 66, y: 14, w: 13, h: 19, anchorX: 6.5, anchorY: 19 },
      { x: 85, y: 15, w: 13, h: 18, anchorX: 6.5, anchorY: 18 },
      { x: 104, y: 15, w: 21, h: 16, anchorX: 7.5, anchorY: 16 },
    ]),
    meleeWalk: buildManualFrames([
      { x: 24, y: 36, w: 13, h: 19, anchorX: 6.5, anchorY: 19 },
      { x: 45, y: 33, w: 13, h: 21, anchorX: 6.5, anchorY: 21 },
      { x: 67, y: 37, w: 10, h: 18, anchorX: 5, anchorY: 18 },
      { x: 85, y: 36, w: 13, h: 19, anchorX: 6.5, anchorY: 19 },
      { x: 106, y: 33, w: 13, h: 21, anchorX: 6.5, anchorY: 21 },
      { x: 126, y: 35, w: 13, h: 20, anchorX: 6.5, anchorY: 20 },
    ]),
    meleeAttack: buildManualFrames([
      { x: 22, y: 99, w: 13, h: 19, anchorX: 6.5, anchorY: 19 },
      { x: 42, y: 101, w: 23, h: 17, anchorX: 7.5, anchorY: 17 },
      { x: 70, y: 103, w: 26, h: 15, anchorX: 8.5, anchorY: 15 },
    ]),
    meleeHurt: buildManualFrames([
      { x: 22, y: 57, w: 15, h: 22, anchorX: 7.5, anchorY: 22 },
      { x: 84, y: 59, w: 14, h: 20, anchorX: 7, anchorY: 20 },
    ]),
    rangedIdle: buildStripFrames(4, 48, 48, 24, 46),
    rangedPreAttack: buildStripFrames(1, 48, 48, 24, 46),
    rangedAttack: buildStripFrames(6, 48, 48, 24, 46),
    arrow: [{ x: 0, y: 0, w: 59, h: 364, anchorX: 30, anchorY: 182 }],
  };

  function createImageAsset(src, options = {}) {
    const image = new Image();
    const asset = {
      image,
      ready: false,
      src,
      failed: false,
    };
    image.onload = () => {
      try {
        if (options.autoColorKeyFromCorner || options.pixelateScale) {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.imageSmoothingEnabled = false;
          context.drawImage(image, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          if (options.autoColorKeyFromCorner) {
            const pixels = imageData.data;
            const keyR = pixels[0];
            const keyG = pixels[1];
            const keyB = pixels[2];
            for (let index = 0; index < pixels.length; index += 4) {
              if (pixels[index] === keyR && pixels[index + 1] === keyG && pixels[index + 2] === keyB) {
                pixels[index + 3] = 0;
              }
            }
            context.putImageData(imageData, 0, 0);
          }
          if (options.pixelateScale) {
            const sampleScale = clamp(options.pixelateScale, 0.02, 1);
            const sampleCanvas = document.createElement("canvas");
            sampleCanvas.width = Math.max(1, Math.round(canvas.width * sampleScale));
            sampleCanvas.height = Math.max(1, Math.round(canvas.height * sampleScale));
            const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
            sampleContext.imageSmoothingEnabled = false;
            sampleContext.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);

            const pixelCanvas = document.createElement("canvas");
            pixelCanvas.width = canvas.width;
            pixelCanvas.height = canvas.height;
            const pixelContext = pixelCanvas.getContext("2d");
            pixelContext.imageSmoothingEnabled = false;
            pixelContext.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
            pixelContext.drawImage(sampleCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);
            asset.image = pixelCanvas;
          } else {
            asset.image = canvas;
          }
        }
      } catch (error) {
        console.warn(`Image post-process skipped for ${src}: ${error.message}`);
      }
      asset.ready = true;
    };
    image.onerror = () => {
      asset.failed = true;
      console.warn(`Image failed to load: ${src}`);
    };
    image.src = src;
    return asset;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function normalize(x, y) {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }

  function angleOf(vec) {
    return Math.atan2(vec.y, vec.x);
  }

  function angleDelta(a, b) {
    let diff = b - a;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    return diff;
  }

  function vecFromAngle(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  function getLoopFrame(frames, timer, fps) {
    if (!frames || frames.length <= 0) return null;
    const index = Math.floor(timer * fps) % frames.length;
    return frames[index];
  }

  function getProgressFrame(frames, progress) {
    if (!frames || frames.length <= 0) return null;
    const normalized = clamp(progress, 0, 0.9999);
    return frames[Math.floor(normalized * frames.length)];
  }

  function getLoopItem(items, timer, fps) {
    if (!items || items.length <= 0) return null;
    const index = Math.floor(timer * fps) % items.length;
    return items[index];
  }

  function getProgressItem(items, progress) {
    if (!items || items.length <= 0) return null;
    const normalized = clamp(progress, 0, 0.9999);
    return items[Math.floor(normalized * items.length)];
  }

  function getWholeAssetFrame(asset, anchorXRatio = 0.5, anchorYRatio = 0.98) {
    if (!asset || !asset.ready || !asset.image) return null;
    return {
      x: 0,
      y: 0,
      w: asset.image.width,
      h: asset.image.height,
      anchorX: asset.image.width * anchorXRatio,
      anchorY: asset.image.height * anchorYRatio,
    };
  }

  function drawSpriteFrame(asset, frame, x, y, options = {}) {
    if (!asset || !asset.ready || !frame) return false;
    const scale = options.scale ?? 1;
    const scaleX = (options.scaleX ?? 1) * scale;
    const scaleY = (options.scaleY ?? 1) * scale;
    const rotation = options.rotation || 0;
    const flipX = options.flipX ? -1 : 1;
    const alpha = options.alpha ?? 1;
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.scale(flipX, 1);
    ctx.imageSmoothingEnabled = false;
    const drawX = -frame.anchorX * scaleX + offsetX;
    const drawY = -frame.anchorY * scaleY + offsetY;
    const drawW = frame.w * scaleX;
    const drawH = frame.h * scaleY;
    const baseBrightness = options.baseBrightness ?? 1;
    if (baseBrightness !== 1) ctx.filter = `brightness(${baseBrightness})`;
    ctx.drawImage(asset.image, frame.x, frame.y, frame.w, frame.h, drawX, drawY, drawW, drawH);
    ctx.filter = "none";
    if ((options.flashAlpha || 0) > 0) {
      const outlineAlpha = (options.flashOutlineAlpha || 0) * options.flashAlpha;
      if (outlineAlpha > 0) {
        const outlineScale = 1 + (options.flashOutlineScale ?? 0.06) * options.flashAlpha;
        const outlineW = drawW * outlineScale;
        const outlineH = drawH * outlineScale;
        const outlineX = drawX - (outlineW - drawW) * 0.5;
        const outlineY = drawY - (outlineH - drawH) * 0.5;
        ctx.globalAlpha *= outlineAlpha;
        ctx.globalCompositeOperation = "lighter";
        ctx.filter = `brightness(${1.8 + options.flashAlpha * 2.4}) saturate(${Math.max(0, 1 - options.flashAlpha)})`;
        ctx.drawImage(asset.image, frame.x, frame.y, frame.w, frame.h, outlineX, outlineY, outlineW, outlineH);
        ctx.globalAlpha = alpha;
        ctx.filter = "none";
      }
      ctx.globalAlpha *= options.flashAlpha * 0.45;
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `brightness(${1.2 + options.flashAlpha * 1.8}) saturate(${Math.max(0, 1 - options.flashAlpha * 0.85)})`;
      ctx.drawImage(asset.image, frame.x, frame.y, frame.w, frame.h, drawX, drawY, drawW, drawH);
      ctx.filter = "none";
    }
    ctx.restore();
    return true;
  }

  function drawStripEffect(asset, effect, frameWidth, frameHeight, frameCount, options = {}) {
    if (!asset || !asset.ready) return false;
    const progress = 1 - effect.timer / effect.total;
    const index = Math.min(frameCount - 1, Math.max(0, Math.floor(progress * frameCount)));
    const scale = options.scale ?? 1;
    ctx.save();
    ctx.globalAlpha *= options.alpha ?? 1;
    ctx.translate(effect.x, effect.y);
    if (options.rotation) ctx.rotate(options.rotation);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      asset.image,
      index * frameWidth,
      0,
      frameWidth,
      frameHeight,
      -(options.anchorX ?? frameWidth * 0.5) * scale + (options.offsetX || 0),
      -(options.anchorY ?? frameHeight * 0.5) * scale + (options.offsetY || 0),
      frameWidth * scale,
      frameHeight * scale,
    );
    ctx.restore();
    return true;
  }

  function getPlayerChest(player) {
    return { x: player.x, y: player.y - world.playerChestOffset };
  }

  function getEnemyChest(enemy) {
    const settings = getEnemySettings(enemy);
    return { x: enemy.x, y: enemy.y - (settings.hitCenterOffsetY ?? world.enemyChestOffset) };
  }

  function getEnemyHitbox(enemy) {
    const settings = getEnemySettings(enemy);
    return {
      x: enemy.x,
      y: enemy.y - (settings.hitCenterOffsetY ?? world.enemyChestOffset),
      radiusX: settings.hitRadiusX ?? enemy.radius,
      radiusY: settings.hitRadiusY ?? enemy.radius + 10,
    };
  }

  function isPointInEnemyHitbox(enemy, x, y, radius = 0) {
    const hitbox = getEnemyHitbox(enemy);
    const normalizedX = (x - hitbox.x) / Math.max(1, hitbox.radiusX + radius);
    const normalizedY = (y - hitbox.y) / Math.max(1, hitbox.radiusY + radius);
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  function getRangedEnemyMuzzle(enemy) {
    const settings = getEnemySettings(enemy);
    return {
      x: enemy.x + enemy.facingSign * (settings.muzzleOffsetX ?? 26),
      y: enemy.y - (settings.muzzleOffsetY ?? 74),
    };
  }

  function getSupportSurfaces() {
    return [{ id: "ground", x: world.left, y: world.groundY, w: world.right - world.left }] .concat(stagePlatforms);
  }

  function isWithinSurfaceX(surface, x, radius = 0) {
    return x >= surface.x - radius * 0.35 && x <= surface.x + surface.w + radius * 0.35;
  }

  function getEntitySupport(entity, y = entity.y, snap = 6) {
    let support = null;
    for (const surface of getSupportSurfaces()) {
      if (entity.dropThroughTimer > 0 && entity.dropThroughSurfaceId === surface.id) continue;
      if (!isWithinSurfaceX(surface, entity.x, entity.radius)) continue;
      if (Math.abs(surface.y - y) > snap) continue;
      if (!support || surface.y < support.y) support = surface;
    }
    return support;
  }

  function findLandingSurface(entity, prevY, nextY) {
    let landing = null;
    for (const surface of getSupportSurfaces()) {
      if (entity.dropThroughTimer > 0 && entity.dropThroughSurfaceId === surface.id) continue;
      if (!isWithinSurfaceX(surface, entity.x, entity.radius)) continue;
      if (prevY <= surface.y + world.floorSnap && nextY >= surface.y) {
        if (!landing || surface.y < landing.y) landing = surface;
      }
    }
    return landing;
  }

  function getSwordAttackPose(player, attack) {
    const style = attack?.slashStyle || "a1";
    const frames = swordAttackPoseFrames[style] || greenBanditSheetRows.attack;
    const progress = clamp(player.stateTimer / Math.max(attack?.total || 0.3, 0.001), 0, 1);
    const lungeCurve = Math.sin(progress * Math.PI);
    const poseProfile =
      style === "a3"
        ? { forward: 24, lift: -4, scaleX: 1.14, scaleY: 0.95 }
        : style === "guard_break"
          ? { forward: 20, lift: -3, scaleX: 1.12, scaleY: 0.96 }
          : style === "ranged_chase"
            ? { forward: 18, lift: -2, scaleX: 1.1, scaleY: 0.98 }
            : style === "a2"
              ? { forward: 12, lift: -1, scaleX: 1.08, scaleY: 0.99 }
              : { forward: 6, lift: 0, scaleX: 1.02, scaleY: 1 };
    return {
      frame: getProgressItem(frames, progress),
      scale: 2.2,
      scaleX: poseProfile.scaleX,
      scaleY: poseProfile.scaleY,
      offsetX: lungeCurve * poseProfile.forward,
      offsetY: getPlayerGroundOffset("sword") + poseProfile.lift,
    };
  }

  function getPlayerGroundOffset(weapon) {
    return weapon === "gun" ? 12 : 10;
  }

  function getDashPose(player) {
    const weapon = player.currentWeapon === "gun" ? "gun" : "sword";
    const frames = weapon === "gun" ? sideviewAddonFrames.gunDash : sideviewAddonFrames.dash;
    const progress = clamp(player.stateTimer / Math.max(config.player.dashDuration, 0.001), 0, 1);
    const dashLean = Math.sin(progress * Math.PI);
    return {
      asset: weapon === "gun" ? sideviewAddonAssets.gunDash : sideviewAddonAssets.dash,
      frame: getProgressItem(frames, progress),
      scale: 2.2,
      scaleX: 1.18,
      scaleY: 0.88,
      alpha: 0.94,
      offsetX: 10 + dashLean * 12,
      offsetY: getPlayerGroundOffset(weapon) + 2,
    };
  }

  function getGunAimPoseAdjust(player, intensity = 1) {
    const chest = getPlayerChest(player);
    const pitch = clamp((mouse.y - chest.y) / 110, -0.92, 0.92);
    const facingSign = player.facingSign || 1;
    const raise = Math.max(0, -pitch);
    const lower = Math.max(0, pitch);
    return {
      rotation: pitch * 0.36 * facingSign * intensity,
      offsetX: (raise * -2.2 + lower * 1.5) * facingSign * intensity,
      offsetY: -raise * 8 * intensity + lower * 5 * intensity,
    };
  }

  function getPlayerSpritePose(player) {
    const weapon = player.currentWeapon;
    const stateName = player.state;
    const moveTimer = state.time + player.stateTimer * 0.35;
    const gunAimPose = weapon === "gun" ? getGunAimPoseAdjust(player, stateName === "attack" ? 1.1 : stateName === "guard_active" ? 0.8 : 1) : null;
    if (stateName === "hurt" || player.feedbackTimer > 0) {
      return {
        asset: weapon === "gun" ? null : null,
        frame: weapon === "gun" ? getProgressFrame(greenBanditSheetRows.hurt, player.stateTimer / 0.2) : getProgressFrame(greenBanditSheetRows.hurt, player.stateTimer / 0.2),
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
        overlayAsset: weapon === "gun" ? sideviewAddonAssets.gunHurtOverlay : null,
        overlayFrame: weapon === "gun" ? getProgressFrame(sideviewAddonFrames.gunHurtOverlay, player.stateTimer / 0.2) : null,
        overlayOffsetX: weapon === "gun" ? gunAimPose.offsetX : 0,
        overlayOffsetY: weapon === "gun" ? gunAimPose.offsetY : 0,
        overlayRotation: weapon === "gun" ? gunAimPose.rotation * 0.55 : 0,
      };
    }
    if (stateName === "attack" || stateName === "counter_attack" || stateName === "space_counter") {
      const attack = player.activeAttack || { total: 0.3 };
      if (weapon === "gun") {
        return {
          asset: null,
          frame: getProgressFrame(greenBanditSheetRows.gunAttack, player.stateTimer / attack.total),
          scale: 2.2,
          offsetY: getPlayerGroundOffset("gun"),
          overlayAsset: sideviewAddonAssets.gunAttackOverlay,
          overlayFrame: getProgressFrame(sideviewAddonFrames.gunAttackOverlay, player.stateTimer / attack.total),
          overlayOffsetX: gunAimPose.offsetX,
          overlayOffsetY: gunAimPose.offsetY,
          overlayRotation: gunAimPose.rotation,
        };
      }
      return getSwordAttackPose(player, attack);
    }
    if (stateName === "weapon_switch") {
      return {
        asset: weapon === "gun" ? sideviewAddonAssets.gunSwitch : null,
        frame: weapon === "gun" ? getProgressFrame(sideviewAddonFrames.gunSwitch, player.stateTimer / 0.18) : getProgressFrame(greenBanditSheetRows.switchPose, player.stateTimer / 0.18),
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
      };
    }
    if (stateName === "dash") {
      return getDashPose(player);
    }
    if (
      stateName === "guard_startup" ||
      stateName === "guard_active" ||
      stateName === "block_success" ||
      stateName === "perfect_guard" ||
      stateName === "counter_window"
    ) {
      const swordGuardFrame =
        stateName === "guard_startup"
          ? getProgressFrame(greenBanditSheetRows.guardPose, player.stateTimer / config.player.guardStartup)
          : stateName === "block_success" || stateName === "perfect_guard"
            ? greenBanditSheetRows.guardPose[2]
            : greenBanditSheetRows.guardPose[1];
      const gunGuardFrame =
        stateName === "guard_startup"
          ? getProgressFrame(sideviewAddonFrames.gunGuardOverlay, player.stateTimer / config.player.guardStartup)
          : stateName === "block_success" || stateName === "perfect_guard"
            ? sideviewAddonFrames.gunGuardOverlay[3]
            : sideviewAddonFrames.gunGuardOverlay[2];
      return {
        asset: weapon === "gun" ? null : null,
        frame: weapon === "gun" ? greenBanditSheetRows.gunReady[1] : swordGuardFrame,
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
        overlayAsset: weapon === "gun" ? sideviewAddonAssets.gunGuardOverlay : null,
        overlayFrame: weapon === "gun" ? gunGuardFrame : null,
        overlayOffsetX: weapon === "gun" ? gunAimPose.offsetX * 0.7 : 0,
        overlayOffsetY: weapon === "gun" ? gunAimPose.offsetY * 0.7 : 0,
        overlayRotation: weapon === "gun" ? gunAimPose.rotation * 0.75 : 0,
      };
    }
    if (!player.onGround) {
      return {
        asset: weapon === "gun" ? null : null,
        frame:
          weapon === "gun"
            ? greenBanditSheetRows.run[player.vy < 0 ? 2 : 5]
            : greenBanditSheetRows.run[player.vy < 0 ? 2 : 5],
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
        overlayAsset: weapon === "gun" ? sideviewAddonAssets.gunMoveOverlay : null,
        overlayFrame: weapon === "gun" ? sideviewAddonFrames.gunMoveOverlay[player.vy < 0 ? 2 : 5] : null,
        overlayOffsetX: weapon === "gun" ? gunAimPose.offsetX : 0,
        overlayOffsetY: weapon === "gun" ? gunAimPose.offsetY : 0,
        overlayRotation: weapon === "gun" ? gunAimPose.rotation * 0.85 : 0,
      };
    }
    if (stateName === "move") {
      return {
        asset: weapon === "gun" ? null : null,
        frame: weapon === "gun" ? getLoopFrame(greenBanditSheetRows.run, moveTimer, 12) : getLoopFrame(greenBanditSheetRows.run, moveTimer, 12),
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
        overlayAsset: weapon === "gun" ? sideviewAddonAssets.gunMoveOverlay : null,
        overlayFrame: weapon === "gun" ? getLoopFrame(sideviewAddonFrames.gunMoveOverlay, moveTimer, 12) : null,
        overlayOffsetX: weapon === "gun" ? gunAimPose.offsetX : 0,
        overlayOffsetY: weapon === "gun" ? gunAimPose.offsetY : 0,
        overlayRotation: weapon === "gun" ? gunAimPose.rotation : 0,
      };
    }
    return {
      asset: weapon === "gun" ? null : null,
      frame: weapon === "gun" ? getLoopFrame(greenBanditSheetRows.gunReady, state.time * 0.75, 6) : swordSideIdleFrame,
      scale: 2.2,
      offsetY: getPlayerGroundOffset(weapon),
      overlayAsset: weapon === "gun" ? sideviewAddonAssets.gunIdleOverlay : null,
      overlayFrame: weapon === "gun" ? getLoopFrame(sideviewAddonFrames.gunIdleOverlay, state.time * 0.75, 6) : null,
      overlayOffsetX: weapon === "gun" ? gunAimPose.offsetX : 0,
      overlayOffsetY: weapon === "gun" ? gunAimPose.offsetY : 0,
      overlayRotation: weapon === "gun" ? gunAimPose.rotation : 0,
    };
  }

  function drawPlayerFallback(player, isGuarding) {
    const bodyColor = player.currentWeapon === "sword" ? "#f5bf5c" : "#77d7ea";
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, -24, player.radius, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(-5, -30, player.radius * 0.48, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "#08111a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(player.facingSign * 26, -16);
    ctx.stroke();

    if (player.currentWeapon === "sword") {
      if (!isGuarding) {
        ctx.fillStyle = "#08111a";
        ctx.fillRect(player.facingSign > 0 ? 8 : -24, -18, 16, 4);
        ctx.fillStyle = "#d9e4f0";
        ctx.fillRect(player.facingSign > 0 ? 22 : -38, -18, 14, 4);
      } else {
        ctx.strokeStyle = "#08111a";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(player.facingSign * 4, -18);
        ctx.lineTo(player.facingSign * 8, -46);
        ctx.stroke();
      }
    } else {
      if (isGuarding) {
        ctx.fillStyle = "#08111a";
        ctx.fillRect(player.facingSign > 0 ? -2 : -20, -26, 22, 6);
        ctx.fillStyle = "#4e6378";
        ctx.fillRect(player.facingSign > 0 ? 14 : -30, -25, 10, 4);
      } else {
        ctx.fillStyle = "#08111a";
        ctx.fillRect(player.facingSign > 0 ? 10 : -32, -20, 22, 6);
        ctx.fillStyle = "#4e6378";
        ctx.fillRect(player.facingSign > 0 ? 26 : -42, -19, 10, 4);
      }
    }
  }

  function updateDummyToolUi() {
    dummyIdleBtn.classList.toggle("is-active", state.encounterMode === "idle");
    dummyMeleeBtn.classList.toggle("is-active", state.encounterMode === "melee");
    dummyRangedBtn.classList.toggle("is-active", state.encounterMode === "ranged");
    dummyCycleBtn.classList.toggle("is-active", state.encounterMode === "mixed");
  }

  function setDummyAttackMode(mode) {
    const nextMode = mode === "cycle" ? "mixed" : mode;
    state.encounterMode = nextMode;
    if (state.mode === "running") {
      resetEncounterFlow(nextMode);
    }
    state.infoText =
      nextMode === "idle"
        ? "Encounter: Idle"
        : nextMode === "melee"
          ? "Encounter: Melee"
          : nextMode === "ranged"
            ? "Encounter: Ranged"
            : "Encounter: Mixed";
    state.infoTextTimer = 0.45;
    updateDummyToolUi();
    render();
  }

  function resolveDummyAttackMode(mode) {
    const encounterMode = state.encounterMode;
    if (mode === "idle") return "idle";
    if (mode && mode !== "cycle" && mode !== "mixed") return mode;
    if (encounterMode === "idle") return "idle";
    if (encounterMode === "melee" || encounterMode === "ranged") return encounterMode;
    const rangedCount = state.enemies.filter((enemy) => enemy.type === "ranged" && enemy.state !== "dead").length;
    const meleeCount = state.enemies.filter((enemy) => enemy.type === "melee" && enemy.state !== "dead").length;
    if (rangedCount <= 0) return "melee";
    if (meleeCount <= 0) return "ranged";
    return state.time % 2 < 1 ? "melee" : "ranged";
  }

  function createPlayer() {
    return {
      x: WIDTH * 0.28,
      y: world.groundY,
      vx: 0,
      vy: 0,
      onGround: true,
      surfaceId: "ground",
      dropThroughTimer: 0,
      dropThroughSurfaceId: null,
      radius: config.player.radius,
      hp: config.player.maxHp,
      facing: 0,
      facingSign: 1,
      aimAngle: 0,
      state: "idle",
      currentWeapon: "sword",
      comboIndex: 0,
      comboQueue: false,
      comboContinueTimer: 0,
      comboContinueWeapon: null,
      stateTimer: 0,
      attackSpawned: false,
      activeAttack: null,
      gunAmmo: config.player.gunMaxAmmo,
      gunReloadTimer: 0,
      gunReloadPending: false,
      guardHeld: false,
      perfectGuardTimer: 0,
      counterWindowTimer: 0,
      dashCooldownTimer: 0,
      dashDirection: 1,
      dashStartedOnGround: true,
      invulnerable: false,
      lastParryType: null,
      lastAttackerId: null,
      lastAttackerPosition: null,
      lastProjectileDirection: null,
      feedbackTimer: 0,
      hurtDirection: 1,
    };
  }

  function createEnemy(type, x, y) {
    const settings = config.enemies[type];
    return {
      id: `enemy-${state.nextEnemyId++}`,
      type,
      role: type,
      x,
      y,
      vx: 0,
      vy: 0,
      onGround: true,
      surfaceId: y === world.groundY ? "ground" : stagePlatforms.find((platform) => Math.abs(platform.y - y) < 1)?.id || "ground",
      dropThroughTimer: 0,
      dropThroughSurfaceId: null,
      spawnX: x,
      spawnY: y,
      radius: settings.radius,
      hp: settings.maxHp,
      state: type === "ranged" ? "aim" : "approach",
      stateTimer: 0,
      cooldownTimer: 0,
      staggerTimer: 0,
      flashTimer: 0,
      hurtTimer: 0,
      hurtDirection: 1,
      hurtVelocityX: 0,
      swingTimer: 0,
      windupTimer: settings.windup,
      attackResolved: false,
      blinkCooldownTimer: type === "ranged" ? 0.25 : 0,
      noBlinkTimer: 0,
      blinkAlpha: 0,
      facingSign: -1,
      facing: Math.PI,
      aimAngle: Math.PI,
      deathDirectionKey: "S",
      deathFlipX: false,
      deathRotationDir: 1,
      removed: false,
    };
  }

  function createBattleManager() {
    return {
      maxMeleeAttackers: config.battle.maxMeleeAttackers,
      maxRangedAttackers: config.battle.maxRangedAttackers,
      wave: 0,
      waveSize: config.battle.waveSize,
      livingEnemies: 0,
      awaitingNextWave: false,
      nextWaveTimer: 0,
    };
  }

  function getWaveTypes(mode) {
    const waveSize = config.battle.waveSize;
    if (mode === "idle") return [];
    if (mode === "melee") return Array.from({ length: waveSize }, () => "melee");
    if (mode === "ranged") return Array.from({ length: waveSize }, () => "ranged");

    const waveTypes = ["melee", "ranged"];
    while (waveTypes.length < waveSize) {
      waveTypes.splice(waveTypes.length - 1, 0, "melee");
    }
    return waveTypes;
  }

  function getEnemySpawnPoint(type, sameTypeIndex) {
    const points = enemySpawnPoints[type];
    return points[sameTypeIndex % points.length];
  }

  function spawnEncounter(mode = state.encounterMode) {
    if (!state.battleManager) {
      state.battleManager = createBattleManager();
    }
    state.enemies = [];
    state.battleManager.awaitingNextWave = false;
    state.battleManager.nextWaveTimer = 0;
    state.battleManager.livingEnemies = 0;
    if (mode === "idle") {
      state.battleManager.wave = 0;
      return;
    }

    const explicitLayout = encounterSpawnLayouts[mode];
    if (explicitLayout) {
      state.battleManager.wave += 1;
      state.battleManager.waveSize = explicitLayout.length;
      for (const slot of explicitLayout) {
        state.enemies.push(createEnemy(slot.type, slot.x, slot.y));
      }
      state.battleManager.livingEnemies = state.enemies.length;
      return;
    }

    const sameTypeCount = { melee: 0, ranged: 0 };
    const waveTypes = getWaveTypes(mode);
    state.battleManager.wave += 1;
    state.battleManager.waveSize = waveTypes.length;
    for (const type of waveTypes) {
      const spawnPoint = getEnemySpawnPoint(type, sameTypeCount[type]);
      sameTypeCount[type] += 1;
      state.enemies.push(createEnemy(type, spawnPoint.x, spawnPoint.y));
    }
    state.battleManager.livingEnemies = state.enemies.length;
  }

  function resetEncounterFlow(mode = state.encounterMode) {
    state.battleManager = createBattleManager();
    spawnEncounter(mode);
  }

  function getEnemyById(id) {
    return state.enemies.find((enemy) => enemy.id === id) || null;
  }

  function getPrimaryEnemy(type = null) {
    const candidates = state.enemies.filter((enemy) => enemy.state !== "dead" && (!type || enemy.type === type));
    if (candidates.length <= 0) return null;
    return candidates.reduce((best, enemy) => (enemy.x < best.x ? enemy : best), candidates[0]);
  }

  function resetGame() {
    state.mode = "running";
    state.time = 0;
    state.flashTimer = 0;
    state.infoText = "Training Started";
    state.infoTextTimer = 1.2;
    keys.clear();
    mouse.leftDown = false;
    mouse.rightDown = false;
    mouse.leftPressed = false;
    mouse.rightPressed = false;
    mouse.wheelDown = false;
    state.projectiles = [];
    state.effects = [];
    state.lastSpaceAction = "dash";
    state.counterPromptTimer = 0;
    clearCounterPrompt();
    state.nextEnemyId = 1;
    state.player = createPlayer();
    resetEncounterFlow(state.encounterMode);
    updateDummyToolUi();
  }

  function pushEffect(x, y, color, kind, extra = {}) {
    state.effects.push({ x, y, color, kind, timer: 0.2, total: 0.2, ...extra });
  }

  function spawnProjectile(x, y, angle, speed, damage, owner, reflected = false, extra = {}) {
    state.projectiles.push({ x, y, angle, speed, damage, owner, radius: 6, ttl: 3, reflected, ignorePlayerTimer: 0, ...extra });
  }

  function getAimDir(player) {
    const chest = getPlayerChest(player);
    const rawDx = mouse.x - chest.x;
    const aimSign = Math.abs(rawDx) < 0.001 ? player.facingSign || 1 : Math.sign(rawDx);
    let aimX = Math.abs(rawDx) < 24 ? 24 * aimSign : rawDx;
    let aimY = mouse.y - chest.y;
    aimY = clamp(aimY, -120, 120);
    return normalize(aimX, aimY);
  }

  function getMoveAxis() {
    let x = 0;
    if (keys.has("ArrowLeft")) x -= 1;
    if (keys.has("ArrowRight")) x += 1;
    if (keys.has("KeyA")) x -= 1;
    if (keys.has("KeyD")) x += 1;
    const magnitude = Math.abs(x);
    if (magnitude === 0) return { x: 0, y: 0, magnitude: 0 };
    return { x: x / magnitude, y: 0, magnitude: 1 };
  }

  function isJumpPressed() {
    return keys.has("Space");
  }

  function isDownHeld() {
    return keys.has("KeyS") || keys.has("ArrowDown");
  }

  function applyMove(player, axis, dt, scale = 1) {
    const horizontal = axis.magnitude > 0 ? axis.x * config.player.speed * scale : 0;
    player.vx = horizontal;
    player.x += horizontal * dt;
  }

  function applyGravity(entity, dt, lockToGround = false) {
    const currentSupport = entity.onGround ? getEntitySupport(entity, entity.y, 10) : null;
    if (entity.onGround && !currentSupport && !lockToGround) {
      entity.onGround = false;
    }
    if (lockToGround) {
      const support = currentSupport || getEntitySupport(entity, entity.y + 8, 24);
      if (support) {
        entity.vy = 0;
        entity.y = support.y;
        entity.onGround = true;
        entity.surfaceId = support.id;
        return;
      }
      entity.onGround = false;
      entity.surfaceId = null;
      if (entity === state.player) entity.dashStartedOnGround = false;
    }
    const prevY = entity.y;
    entity.vy += world.gravity * dt;
    entity.y += entity.vy * dt;
    const landing = entity.vy >= 0 ? findLandingSurface(entity, prevY, entity.y) : null;
    if (landing) {
      const landed = !entity.onGround && entity.vy > 120;
      entity.y = landing.y;
      entity.vy = 0;
      entity.onGround = true;
      entity.surfaceId = landing.id;
      if (landed && entity === state.player) {
        pushEffect(entity.x, entity.y - 4, "rgba(220,236,246,0.5)", "land_dust", {
          timer: 0.22,
          total: 0.22,
        });
      }
    } else {
      entity.onGround = false;
      entity.surfaceId = null;
    }
  }

  function beginState(next, options = {}) {
    const player = state.player;
    player.state = next;
    player.stateTimer = 0;
    player.attackSpawned = false;
    if (next !== "counter_window") {
      player.counterWindowTimer = 0;
      state.counterPromptTimer = 0;
      clearCounterPrompt();
    }
    if (next !== "guard_startup" && next !== "guard_active") player.perfectGuardTimer = 0;
    if (next === "idle" || next === "move") {
      player.activeAttack = null;
      player.comboQueue = false;
      if (!options.keepCombo && player.comboContinueTimer <= 0) {
        player.comboIndex = 0;
        player.comboContinueWeapon = null;
      }
    }
    if (next === "dash") {
      player.dashCooldownTimer = config.player.dashCooldown;
      player.dashStartedOnGround = player.onGround;
      const axis = getMoveAxis();
      player.dashDirection = axis.magnitude > 0 ? (axis.x >= 0 ? 1 : -1) : player.facingSign || 1;
      player.invulnerable = false;
      if (player.dashStartedOnGround) player.vy = 0;
      pushEffect(player.x - player.dashDirection * 18, player.y - 26, "rgba(197,230,242,0.4)", "dash_afterimage", {
        angle: player.dashDirection > 0 ? 0 : Math.PI,
        timer: 0.16,
        total: 0.16,
      });
    }
    if (next === "guard_startup") {
      player.perfectGuardTimer = Math.max(config.player.meleePerfectGuardWindow, config.player.rangedPerfectGuardWindow);
      player.vx = 0;
    }
    if (next === "weapon_switch") {
      player.currentWeapon = player.currentWeapon === "sword" ? "gun" : "sword";
      pushEffect(player.x, player.y - 34, weaponPalette[player.currentWeapon], "switch");
    }
    if (next === "counter_window") {
      const counterAttack = getSpaceCounterAttack(player);
      player.counterWindowTimer = config.player.counterWindow;
      state.counterPromptTimer = 0.48;
      state.lastSpaceAction = "counter_followup";
      setCounterPrompt(counterAttack);
      state.infoText = counterAttack ? `${counterAttack.counterRole}: ${counterAttack.counterTitle}` : player.lastParryType === "melee" ? "Perfect Guard: Melee" : "Perfect Guard: Ranged";
      state.infoTextTimer = 0.58;
      state.flashTimer = 0.12;
    }
    if (next === "hurt") {
      player.feedbackTimer = 0.16;
      state.infoText = "Hit";
      state.infoTextTimer = 0.25;
    }
  }

  function canSwitch(player) {
    if (player.state === "counter_window") return false;
    if (player.state === "idle" || player.state === "move") return true;
    if (player.state === "attack" && player.activeAttack) return player.stateTimer >= player.activeAttack.cancelSwitchAt;
    return false;
  }

  function canGuard(player) {
    if (player.state === "idle" || player.state === "move") return true;
    if (player.state === "attack" && player.activeAttack) return player.stateTimer >= player.activeAttack.cancelGuardAt;
    return false;
  }

  function canDash(player) {
    if (player.state === "counter_window") return true;
    if (player.dashCooldownTimer > 0) return false;
    if (player.state === "idle" || player.state === "move") return true;
    if (player.state === "attack" && player.activeAttack) return player.stateTimer >= player.activeAttack.cancelDashAt;
    return false;
  }

  function canDropThrough(player) {
    return player.onGround && player.surfaceId && player.surfaceId !== "ground";
  }

  function startDropThrough(player) {
    player.dropThroughTimer = 0.22;
    player.dropThroughSurfaceId = player.surfaceId;
    player.onGround = false;
    player.surfaceId = null;
    player.y += 4;
    player.vy = Math.max(player.vy, 40);
    state.infoText = "Drop";
    state.infoTextTimer = 0.18;
  }

  function startGunShot() {
    const player = state.player;
    if (player.gunReloadTimer > 0 || player.gunReloadPending || player.gunAmmo <= 0) {
      state.infoText = "Recharging";
      state.infoTextTimer = 0.28;
      return;
    }
    const shotIndex = config.player.gunMaxAmmo - player.gunAmmo;
    player.comboIndex = shotIndex;
    player.comboContinueTimer = 0;
    player.comboContinueWeapon = null;
    player.activeAttack = attackData.gun[Math.min(shotIndex, attackData.gun.length - 1)];
    player.gunAmmo = Math.max(0, player.gunAmmo - 1);
    if (player.gunAmmo === 0) {
      player.gunReloadPending = true;
    }
    beginState("attack", { keepCombo: true });
  }

  function tryStartGunReload(player) {
    if (player.gunAmmo > 0 || player.gunReloadTimer > 0) return false;
    if (player.state === "attack" || player.state === "counter_attack" || player.state === "space_counter") return false;
    if (!player.gunReloadPending) return false;
    player.gunReloadPending = false;
    player.gunReloadTimer = config.player.gunReloadDuration;
    state.infoText = "Recharging";
    state.infoTextTimer = 0.35;
    return true;
  }

  function startAttack(kind) {
    const player = state.player;
    if (kind === "space_counter") {
      const counterAttack = getSpaceCounterAttack(player);
      if (!counterAttack) return;
      beginState("space_counter");
      player.activeAttack = counterAttack;
      state.infoText = counterAttack.activationText || counterAttack.counterTitle || "Counter";
      state.infoTextTimer = 0.42;
      return;
    }
    if (kind === "gun_shot" || player.currentWeapon === "gun") {
      startGunShot();
      return;
    }
    const list = attackData[player.currentWeapon];
    if (player.state === "attack") player.comboIndex += 1;
    else if (player.comboContinueTimer > 0 && player.comboContinueWeapon === player.currentWeapon) player.comboIndex += 1;
    else player.comboIndex = 0;
    player.comboContinueTimer = 0;
    player.comboContinueWeapon = null;
    player.comboIndex %= list.length;
    player.activeAttack = list[player.comboIndex];
    beginState("attack", { keepCombo: true });
  }

  function getEnemySettings(enemy) {
    return config.enemies[enemy.type];
  }

  function isEnemyAlive(enemy) {
    return !!enemy && enemy.state !== "dead" && enemy.hp > 0;
  }

  function isEnemyRenderable(enemy) {
    return !!enemy && !enemy.removed;
  }

  function forEachLivingEnemy(callback) {
    for (const enemy of state.enemies) {
      if (isEnemyAlive(enemy)) callback(enemy);
    }
  }

  function countAttackers(type) {
    return state.enemies.filter(
      (enemy) =>
        isEnemyAlive(enemy) &&
        enemy.type === type &&
        (enemy.state === "attack_windup" || enemy.state === "attack_active" || enemy.state === "attack_recover"),
    ).length;
  }

  function canEnemyStartAttack(enemy) {
    if (!isEnemyAlive(enemy) || enemy.cooldownTimer > 0 || enemy.staggerTimer > 0) return false;
    const limit = enemy.type === "melee" ? state.battleManager.maxMeleeAttackers : state.battleManager.maxRangedAttackers;
    return countAttackers(enemy.type) < limit;
  }

  function damageEnemy(enemy, damage, options = {}) {
    if (!isEnemyAlive(enemy)) return false;
    const settings = getEnemySettings(enemy);
    const hitDirection =
      options.hitDirection ??
      (typeof options.projectileAngle === "number"
        ? Math.cos(options.projectileAngle) >= 0
          ? 1
          : -1
        : enemy.x >= state.player.x
          ? 1
          : -1);
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.flashTimer = Math.max(enemy.flashTimer, 0.18);
    enemy.hurtTimer = Math.max(enemy.hurtTimer, settings.hurtDuration);
    enemy.hurtDirection = hitDirection;
    enemy.hurtVelocityX = hitDirection * (options.knockback ?? settings.hurtKnockback ?? 0);
    state.hitstopTimer = Math.max(state.hitstopTimer, options.hitstop ?? settings.hurtHitstop ?? 0);
    pushEffect(enemy.x, enemy.y - 34, enemy.type === "melee" ? "#ffe2a6" : "#c7f6ff", "enemy_hit", {
      angle: hitDirection > 0 ? 0 : Math.PI,
      timer: 0.18,
      total: 0.18,
    });
    if (options.stagger) {
      enemy.staggerTimer = Math.max(enemy.staggerTimer, options.stagger);
      enemy.state = "stagger";
      enemy.stateTimer = 0;
    }
    if (enemy.hp <= 0) {
      enemy.state = "dead";
      enemy.stateTimer = 0;
      enemy.hurtTimer = 0;
      enemy.hurtVelocityX = 0;
      enemy.swingTimer = 0;
      enemy.cooldownTimer = 0;
      enemy.deathDirectionKey = "S";
      enemy.deathFlipX = enemy.hurtDirection < 0;
      enemy.deathRotationDir = enemy.hurtDirection || (enemy.facingSign >= 0 ? 1 : -1);
      pushEffect(enemy.x, enemy.y, enemy.type === "melee" ? "#f7d17a" : "#b9f4ff", "hit");
    }
    return true;
  }

  function defeatAllEnemies() {
    for (const enemy of state.enemies) {
      damageEnemy(enemy, enemy.hp + 1);
    }
    if (state.battleManager) {
      state.battleManager.livingEnemies = 0;
    }
  }

  function getClosestEnemyInArc(origin, facing, reach, arc) {
    let best = null;
    let bestDist = Infinity;
    forEachLivingEnemy((enemy) => {
      const hitbox = getEnemyHitbox(enemy);
      const toEnemy = { x: hitbox.x - origin.x, y: hitbox.y - origin.y };
      const dist = Math.hypot(toEnemy.x, toEnemy.y * 0.72);
      const delta = Math.abs(angleDelta(facing, angleOf(toEnemy)));
      if (dist <= reach + hitbox.radiusX && delta <= arc * 0.5 && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    });
    return best;
  }

  function getClosestEnemyInFront(originX, originY, facingSign, reach) {
    let best = null;
    let bestDist = Infinity;
    forEachLivingEnemy((enemy) => {
      const hitbox = getEnemyHitbox(enemy);
      const dx = hitbox.x - originX;
      const dy = (hitbox.y - originY) * 0.72;
      if (dx * facingSign < -hitbox.radiusX * 0.35) return;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + hitbox.radiusX && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    });
    return best;
  }

  function getAttackerTarget() {
    if (state.player.lastAttackerId) {
      const target = getEnemyById(state.player.lastAttackerId);
      if (isEnemyAlive(target)) return target;
    }
    return getClosestEnemyInFront(state.player.x, state.player.y, state.player.facingSign || 1, 9999) || getPrimaryEnemy();
  }

  function getSpaceCounterAttack(player = state.player) {
    if (!player) return null;
    const parryType = player.lastParryType === "ranged" ? "ranged" : "melee";
    return attackData.counter[player.currentWeapon]?.space?.[parryType] || null;
  }

  function setCounterPrompt(attack) {
    state.counterPromptTitle = attack?.counterTitle || "";
    state.counterPromptRole = attack?.counterRole || "";
    state.counterPromptHint = attack?.counterHint || "";
    state.counterPromptColor = attack?.counterColor || "#fff4cb";
  }

  function clearCounterPrompt() {
    state.counterPromptTitle = "";
    state.counterPromptRole = "";
    state.counterPromptHint = "";
    state.counterPromptColor = "#fff4cb";
  }

  function performAttack(attack) {
    const player = state.player;
    if (attack.faceAttacker && player.lastAttackerPosition) {
      player.facingSign = player.lastAttackerPosition.x >= player.x ? 1 : -1;
      player.facing = player.facingSign > 0 ? 0 : Math.PI;
    }
    if (player.currentWeapon === "gun") {
      const shotStyle = attack.shotStyle || "normal";
      const isArmorBreak = shotStyle === "armor_break";
      const isFourthShot = shotStyle === "fourth_shot";
      if (shotStyle === "repel_blast") {
        pushEffect(player.x + player.facingSign * 18, player.y - 34, "#d7fbff", "repel_blast", {
          angle: player.facingSign > 0 ? 0 : Math.PI,
          timer: 0.18,
          total: 0.18,
        });
        forEachLivingEnemy((enemy) => {
          const hitbox = getEnemyHitbox(enemy);
          const dx = hitbox.x - player.x;
          const dy = hitbox.y - player.y;
          const dist = Math.hypot(dx, dy * 0.72);
          if (dx * player.facingSign >= -hitbox.radiusX * 0.25 && Math.abs(dy) <= hitbox.radiusY + 24 && dist <= attack.reach + hitbox.radiusX) {
            damageEnemy(enemy, attack.damage, { stagger: attack.stagger ?? 0.4, knockback: 0, hitDirection: player.facingSign });
            enemy.x += player.facingSign * attack.knockback;
            player.x -= player.facingSign * attack.recoil;
            pushEffect(enemy.x, enemy.y - 34, "#d7fbff", "repel_hit");
          }
        });
        return;
      }
      const chest = getPlayerChest(player);
      const aim = getAimDir(player);
      player.facingSign = aim.x >= 0 ? 1 : -1;
      player.facing = player.facingSign > 0 ? 0 : Math.PI;
      const shotAngle = angleOf(aim);
      const projectileRadius = attack.projectileRadius ?? (isArmorBreak ? 9 : isFourthShot ? 9 : 6);
      spawnProjectile(
        chest.x + aim.x * 26,
        chest.y + aim.y * 10,
        shotAngle,
        attack.bulletSpeed,
        attack.damage,
        "player",
        false,
        {
          shotStyle,
          radius: projectileRadius,
          glowColor: isArmorBreak ? "#eafcff" : isFourthShot ? "#fff0b0" : "#77d7ea",
          stagger: attack.stagger ?? 0,
          knockback: attack.projectileKnockback,
          hitstop: attack.hitstop,
        },
      );
      pushEffect(
        chest.x + aim.x * 20,
        chest.y + aim.y * 12,
        isArmorBreak ? "#eafcff" : isFourthShot ? "#fff0b0" : weaponPalette.gun,
        isArmorBreak ? "armor_break_muzzle" : isFourthShot ? "fourth_shot_muzzle" : "muzzle",
        {
          angle: shotAngle,
          timer: isArmorBreak || isFourthShot ? 0.18 : 0.14,
          total: isArmorBreak || isFourthShot ? 0.18 : 0.14,
        },
      );
      return;
    }

    const target = getAttackerTarget();
    if (attack.seekTarget && target) {
      const startX = player.x;
      const startY = player.y;
      player.facingSign = target.x >= player.x ? 1 : -1;
      player.facing = player.facingSign > 0 ? 0 : Math.PI;
      player.x = target.x - player.facingSign * (player.radius + target.radius + (attack.chaseOffset ?? 16));
      player.y = target.y;
      const chaseGhosts = [
        { progress: 0, timer: 0.2, scale: 2.2, scaleX: 1.18, scaleY: 0.88, alphaScale: 0.72, frameIndex: 0 },
        { progress: 0.5, timer: 0.22, scale: 2.2, scaleX: 1.18, scaleY: 0.88, alphaScale: 0.64, frameIndex: 1 },
        { progress: 1, timer: 0.24, scale: 2.2, scaleX: 1.18, scaleY: 0.88, alphaScale: 0.78, frameIndex: 2 },
      ];
      for (const ghost of chaseGhosts) {
        pushEffect(
          startX + (player.x - startX) * ghost.progress,
          startY + (player.y - startY) * ghost.progress,
          "rgba(245,191,92,0.5)",
          "chase_afterimage",
          {
            angle: player.facingSign > 0 ? 0 : Math.PI,
            timer: ghost.timer,
            total: ghost.timer,
            scale: ghost.scale,
            scaleX: ghost.scaleX,
            scaleY: ghost.scaleY,
            alphaScale: ghost.alphaScale,
            frameIndex: ghost.frameIndex,
            facingLeft: player.facingSign < 0,
            weapon: "sword",
          },
        );
      }
    } else if (attack.dashForward > 0) {
      player.x += player.facingSign * attack.dashForward;
    }

    const slashStyle = attack.slashStyle || "a1";
    if (slashStyle !== "a1" && slashStyle !== "a2" && slashStyle !== "a3") {
      pushEffect(player.x + player.facingSign * 26, player.y - 36, weaponPalette.sword, "sword_slash", {
        timer: 0.16,
        total: 0.16,
        angle: player.facingSign > 0 ? 0 : Math.PI,
        arc: attack.arc,
        radius: attack.slashRadius || attack.reach * 0.72,
        width: attack.slashWidth || 9,
        slashStyle,
      });
    }
    forEachLivingEnemy((enemy) => {
      const hitbox = getEnemyHitbox(enemy);
      const dx = hitbox.x - player.x;
      const dy = hitbox.y - player.y;
      const dist = Math.hypot(dx, dy * 0.72);
      if (dx * player.facingSign >= -hitbox.radiusX * 0.35 && Math.abs(dy) <= hitbox.radiusY + 26 && dist <= attack.reach + hitbox.radiusX) {
        damageEnemy(enemy, attack.damage, { hitstop: attack.hitstop, stagger: attack.stagger, hitDirection: player.facingSign });
        pushEffect(enemy.x, enemy.y - 34, weaponPalette.sword, "slash_hit");
      }
    });
  }

  function handlePlayerInput() {
    const player = state.player;

    if (keys.has("KeyB")) {
      setDummyAttackMode(
        state.encounterMode === "idle"
          ? "melee"
          : state.encounterMode === "melee"
            ? "ranged"
            : state.encounterMode === "ranged"
              ? "mixed"
              : "idle",
      );
      keys.delete("KeyB");
    }
    if (keys.has("Enter")) {
      triggerDummyAttack(resolveDummyAttackMode());
      keys.delete("Enter");
    }

    if (keys.has("Digit1")) setDummyAttackMode("idle");
    if (keys.has("Digit2")) setDummyAttackMode("melee");
    if (keys.has("Digit3")) setDummyAttackMode("ranged");
    if (keys.has("Digit4")) setDummyAttackMode("mixed");

    if ((mouse.wheelDown || keys.has("KeyQ")) && canSwitch(player)) {
      beginState("weapon_switch");
      mouse.wheelDown = false;
      keys.delete("KeyQ");
      return;
    }

    if (mouse.rightPressed && canGuard(player)) {
      player.guardHeld = true;
      beginState("guard_startup");
      mouse.rightPressed = false;
      return;
    }

    player.guardHeld = mouse.rightDown;

    if (mouse.leftPressed) {
      if (player.state === "counter_window") {
        mouse.leftPressed = false;
        return;
      }
      if (player.state === "idle" || player.state === "move") {
        startAttack("normal");
        mouse.leftPressed = false;
        return;
      }
      if (player.state === "attack") player.comboQueue = true;
      mouse.leftPressed = false;
    }

    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) {
      if (canDash(player)) {
        if (player.state === "counter_window") {
          startAttack("space_counter");
        } else {
          state.lastSpaceAction = "dash";
          beginState("dash");
        }
      }
      keys.delete("ShiftLeft");
      keys.delete("ShiftRight");
    }

    if (isJumpPressed() && (player.state === "idle" || player.state === "move" || player.state === "counter_window")) {
      if (isDownHeld() && canDropThrough(player)) {
        startDropThrough(player);
      } else if (player.onGround) {
        player.vy = -world.jumpVelocity;
        player.onGround = false;
        player.surfaceId = null;
        state.infoText = "Jump";
        state.infoTextTimer = 0.18;
      }
      keys.delete("Space");
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    const axis = getMoveAxis();
    const aimDir = getAimDir(player);
    player.aimAngle = angleOf(aimDir);
    if (player.currentWeapon === "gun") {
      player.facingSign = aimDir.x >= 0 ? 1 : -1;
    } else if (axis.magnitude > 0) {
      player.facingSign = axis.x >= 0 ? 1 : -1;
    }
    player.facing = player.facingSign > 0 ? 0 : Math.PI;
    player.stateTimer += dt;
    if (player.dashCooldownTimer > 0) player.dashCooldownTimer = Math.max(0, player.dashCooldownTimer - dt);
    if (player.comboContinueTimer > 0) player.comboContinueTimer = Math.max(0, player.comboContinueTimer - dt);
    if (player.feedbackTimer > 0) player.feedbackTimer = Math.max(0, player.feedbackTimer - dt);
    if (player.dropThroughTimer > 0) {
      player.dropThroughTimer = Math.max(0, player.dropThroughTimer - dt);
      if (player.dropThroughTimer === 0) player.dropThroughSurfaceId = null;
    }
    if (player.gunReloadTimer > 0) {
      player.gunReloadTimer = Math.max(0, player.gunReloadTimer - dt);
      if (player.gunReloadTimer === 0) {
        player.gunAmmo = config.player.gunMaxAmmo;
        state.infoText = "Ammo Full";
        state.infoTextTimer = 0.32;
        pushEffect(player.x, player.y - 26, "#bff4ff", "ammo_reload", { timer: 0.24, total: 0.24 });
      }
    }
    tryStartGunReload(player);

    switch (player.state) {
      case "idle":
      case "move":
        if (axis.magnitude > 0) {
          applyMove(player, axis, dt, player.onGround ? 1 : world.airControl);
          player.state = "move";
        } else {
          player.vx = 0;
          player.state = player.onGround ? "idle" : "move";
        }
        break;
      case "weapon_switch":
        applyMove(player, axis, dt, config.player.switchMoveScale * (player.onGround ? 1 : world.airControl));
        if (player.stateTimer >= 0.18) beginState(axis.magnitude > 0 ? "move" : "idle");
        break;
      case "dash": {
        const t = player.stateTimer;
        player.invulnerable = t >= config.player.dashInvulnStart && t <= config.player.dashInvulnEnd;
        player.vx = player.dashDirection * config.player.dashSpeed;
        if (player.dashStartedOnGround) player.vy = 0;
        player.x += player.vx * dt;
        if (player.stateTimer >= config.player.dashDuration) {
          player.invulnerable = false;
          player.vx = 0;
          beginState(axis.magnitude > 0 ? "move" : "idle");
        }
        break;
      }
      case "guard_startup":
        player.vx = 0;
        player.perfectGuardTimer = Math.max(0, player.perfectGuardTimer - dt);
        if (!player.guardHeld) beginState(axis.magnitude > 0 ? "move" : "idle");
        else if (player.stateTimer >= config.player.guardStartup) beginState("guard_active");
        break;
      case "guard_active":
        player.vx = 0;
        if (!player.guardHeld) beginState(axis.magnitude > 0 ? "move" : "idle");
        break;
      case "block_success":
        player.vx = 0;
        if (player.stateTimer >= 0.16) beginState(axis.magnitude > 0 ? "move" : "idle");
        break;
      case "perfect_guard":
        player.vx = 0;
        if (player.stateTimer >= 0.06) beginState("counter_window");
        break;
      case "counter_window":
        applyMove(player, axis, dt, config.player.counterMoveScale * (player.onGround ? 1 : world.airControl));
        player.counterWindowTimer -= dt;
        if (player.counterWindowTimer <= 0) {
          state.lastSpaceAction = "dash";
          beginState(axis.magnitude > 0 ? "move" : "idle");
        }
        break;
      case "attack":
      case "counter_attack":
      case "space_counter": {
        applyMove(player, axis, dt, config.player.attackMoveScale * (player.onGround ? 1 : world.airControl));
        const attack = player.activeAttack;
        if (attack && !player.attackSpawned && player.stateTimer >= attack.activeStart) {
          performAttack(attack);
          player.attackSpawned = true;
        }
        if (player.state === "attack" && player.comboQueue && player.stateTimer >= attack.total - 0.08) {
          player.comboQueue = false;
          startAttack("normal");
          return;
        }
        if (player.stateTimer >= attack.total) {
          if (player.state === "attack") {
            player.comboContinueTimer = config.player.comboGrace;
            player.comboContinueWeapon = player.currentWeapon;
          }
          state.lastSpaceAction = "dash";
          beginState(axis.magnitude > 0 ? "move" : "idle");
        }
        break;
      }
      case "hurt":
        player.x += player.vx * dt;
        if (player.vx !== 0) {
          const decay = config.player.hurtKnockbackDecay * dt;
          if (player.vx > 0) player.vx = Math.max(0, player.vx - decay);
          else player.vx = Math.min(0, player.vx + decay);
        }
        if (player.stateTimer >= config.player.hurtDuration) beginState(axis.magnitude > 0 ? "move" : "idle");
        break;
      default:
        break;
    }

    applyGravity(player, dt, player.state === "dash" && player.dashStartedOnGround);
    player.x = clamp(player.x, world.left, world.right);
    if (player.y > world.groundY - world.floorSnap) {
      player.y = world.groundY;
      player.vy = 0;
      player.onGround = true;
    }
  }

  function processIncomingHit(hitType, attacker, projectile) {
    const player = state.player;
    if (player.invulnerable) {
      state.infoText = "Dash I-Frame";
      state.infoTextTimer = 0.2;
      return "ignored";
    }

    const guarding = player.state === "guard_startup" || player.state === "guard_active";
    if (guarding) {
      const perfectWindow = hitType === "melee" ? config.player.meleePerfectGuardWindow : config.player.rangedPerfectGuardWindow;
      const perfect = player.state === "guard_startup" && player.stateTimer <= perfectWindow;
      player.lastParryType = hitType;
      player.lastAttackerId = attacker ? attacker.id : null;
      player.lastAttackerPosition = attacker ? { x: attacker.x, y: attacker.y } : player.lastAttackerPosition;
      if (perfect) {
        beginState("perfect_guard");
        state.hitstopTimer = config.player.perfectGuardHitstop;
        pushEffect(player.x, player.y - 34, player.currentWeapon === "sword" ? "#ffe08d" : "#9fe8ff", "perfect_guard", {
          angle: player.facing,
          timer: 0.24,
          total: 0.24,
        });
        if (hitType === "melee" && attacker) {
          const settings = getEnemySettings(attacker);
          attacker.staggerTimer = Math.max(attacker.staggerTimer, settings.staggerDuration);
          attacker.state = "stagger";
          attacker.stateTimer = 0;
          pushEffect(attacker.x, attacker.y - 32, "#fff2a6", "parry");
          pushEffect(attacker.x, attacker.y - 32, "#fff2a6", "stagger_burst", {
            timer: 0.3,
            total: 0.3,
          });
        } else if (projectile) {
          projectile.owner = "player";
          projectile.reflected = true;
          if (attacker) {
            const enemyChest = getEnemyChest(attacker);
            projectile.angle = angleOf(normalize(enemyChest.x - projectile.x, enemyChest.y - projectile.y));
            attacker.noBlinkTimer = Math.max(attacker.noBlinkTimer || 0, config.enemies.ranged.noBlinkDuration);
          }
          projectile.speed *= 1.35;
          player.lastProjectileDirection = vecFromAngle(projectile.angle);
          pushEffect(projectile.x, projectile.y, "#b8f5ff", "reflect");
          pushEffect(projectile.x, projectile.y, "#d6fbff", "reflect_burst", {
            angle: projectile.angle,
            timer: 0.24,
            total: 0.24,
          });
        }
        return "perfect";
      }

      const rawDamage = projectile ? projectile.damage : attacker ? getEnemySettings(attacker).damage : hitType === "melee" ? 20 : 16;
      player.hp = Math.max(0, player.hp - rawDamage * config.player.blockChipRatio);
      beginState("block_success");
      pushEffect(player.x + player.facingSign * 14, player.y - 34, player.currentWeapon === "sword" ? "#f5bf5c" : "#77d7ea", "block", {
        angle: player.facing,
        timer: 0.18,
        total: 0.18,
      });
      state.infoText = "Block";
      state.infoTextTimer = 0.25;
      return "block";
    }

    const rawDamage = projectile ? projectile.damage : attacker ? getEnemySettings(attacker).damage : hitType === "melee" ? 20 : 16;
    const hurtKnockback = hitType === "melee" ? config.player.hurtKnockbackMelee : config.player.hurtKnockbackRanged;
    const hurtHitstop = hitType === "melee" ? config.player.hurtHitstopMelee : config.player.hurtHitstopRanged;
    player.hp = Math.max(0, player.hp - rawDamage);
    player.hurtDirection = projectile ? (Math.cos(projectile.angle) >= 0 ? 1 : -1) : attacker ? (attacker.x >= player.x ? 1 : -1) : 1;
    beginState("hurt");
    player.vx = projectile ? Math.cos(projectile.angle) * hurtKnockback : attacker ? (attacker.x < player.x ? hurtKnockback : -hurtKnockback) : 0;
    pushEffect(player.x, player.y - 34, "#ff9a7d", "player_hit", {
      angle: projectile ? projectile.angle : player.hurtDirection > 0 ? 0 : Math.PI,
      timer: 0.18,
      total: 0.18,
    });
    state.flashTimer = Math.max(state.flashTimer, 0.05);
    state.hitstopTimer = Math.max(state.hitstopTimer, hurtHitstop);
    return "hit";
  }

  function triggerEnemyBlink(enemy) {
    const player = state.player;
    const settings = getEnemySettings(enemy);
    const away = enemy.x >= player.x ? 1 : -1;
    enemy.x = clamp(enemy.x + away * settings.blinkDistance, world.left + 40, world.right - 40);
    enemy.blinkCooldownTimer = settings.blinkCooldown;
    enemy.blinkAlpha = 1;
    pushEffect(enemy.x, enemy.y - 30, "#aeeeff", "reflect");
  }

  function updateMeleeEnemy(enemy, dt) {
    const player = state.player;
    const settings = getEnemySettings(enemy);
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const absDx = Math.abs(dx);
    enemy.facingSign = dx >= 0 ? 1 : -1;
    enemy.facing = enemy.facingSign > 0 ? 0 : Math.PI;

    switch (enemy.state) {
      case "approach":
        enemy.vx = enemy.facingSign * settings.moveSpeed;
        enemy.x += enemy.vx * dt;
        if (absDx <= settings.approachRange + player.radius) enemy.state = "wait";
        break;
      case "wait": {
        enemy.vx = 0;
        if (absDx > settings.approachRange + player.radius + 24) {
          enemy.state = "approach";
          break;
        }
        if (absDx <= settings.attackRange + player.radius + 10 && Math.abs(dy) <= 68 && canEnemyStartAttack(enemy)) {
          enemy.state = "attack_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      }
      case "attack_windup":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.windup) {
          enemy.state = "attack_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "attack_active":
        enemy.vx = 0;
        if (!enemy.attackResolved) {
          enemy.attackResolved = true;
          enemy.swingTimer = 0.18;
          if (Math.abs(player.x - enemy.x) <= settings.attackRange + player.radius && Math.abs(player.y - enemy.y) <= 68) {
            processIncomingHit("melee", enemy, null);
          }
        }
        if (enemy.stateTimer >= settings.activeDuration) {
          enemy.state = "attack_recover";
          enemy.stateTimer = 0;
          enemy.cooldownTimer = settings.cooldown;
        }
        break;
      case "attack_recover":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.recover) enemy.state = "wait";
        break;
      case "stagger":
        enemy.vx = 0;
        if (enemy.staggerTimer <= 0) enemy.state = "approach";
        break;
      default:
        break;
    }
  }

  function updateRangedEnemy(enemy, dt) {
    const player = state.player;
    const settings = getEnemySettings(enemy);
    const dx = player.x - enemy.x;
    const absDx = Math.abs(dx);
    const muzzle = getRangedEnemyMuzzle(enemy);
    const playerChest = getPlayerChest(player);
    const exactAim = normalize(playerChest.x - muzzle.x, playerChest.y - muzzle.y);
    enemy.facingSign = dx >= 0 ? 1 : -1;
    enemy.facing = enemy.facingSign > 0 ? 0 : Math.PI;
    enemy.aimAngle = angleOf(exactAim);

    switch (enemy.state) {
      case "approach":
        if (absDx < settings.pressureRange && enemy.blinkCooldownTimer <= 0 && enemy.noBlinkTimer <= 0) {
          enemy.state = "retreat_blink";
          enemy.stateTimer = 0;
          triggerEnemyBlink(enemy);
          break;
        }
        if (absDx > settings.preferredRange + 22) {
          enemy.vx = enemy.facingSign * settings.moveSpeed;
          enemy.x += enemy.vx * dt;
        } else if (absDx < settings.preferredRange - 34) {
          enemy.vx = -enemy.facingSign * settings.moveSpeed * 0.85;
          enemy.x += enemy.vx * dt;
        } else {
          enemy.vx = 0;
          enemy.state = "aim";
        }
        break;
      case "retreat_blink":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.blinkSettle) enemy.state = "aim";
        break;
      case "aim":
      case "wait":
        enemy.vx = 0;
        if (absDx < settings.pressureRange && enemy.blinkCooldownTimer <= 0 && enemy.noBlinkTimer <= 0) {
          enemy.state = "retreat_blink";
          enemy.stateTimer = 0;
          triggerEnemyBlink(enemy);
          break;
        }
        if (absDx > settings.preferredRange + 48) {
          enemy.state = "approach";
          break;
        }
        if (canEnemyStartAttack(enemy)) {
          enemy.state = "attack_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "attack_windup":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.windup) {
          enemy.state = "attack_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "attack_active":
        enemy.vx = 0;
        if (!enemy.attackResolved) {
          enemy.attackResolved = true;
          spawnProjectile(muzzle.x, muzzle.y, enemy.aimAngle, settings.projectileSpeed, settings.damage, "enemy", false, { sourceEnemyId: enemy.id });
        }
        if (enemy.stateTimer >= settings.activeDuration) {
          enemy.state = "attack_recover";
          enemy.stateTimer = 0;
          enemy.cooldownTimer = settings.cooldown;
        }
        break;
      case "attack_recover":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.recover) enemy.state = "aim";
        break;
      case "stagger":
        enemy.vx = 0;
        if (enemy.staggerTimer <= 0) enemy.state = "approach";
        break;
      default:
        break;
    }
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      if (!isEnemyRenderable(enemy)) continue;
      enemy.stateTimer += dt;
      enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
      if (enemy.hurtVelocityX !== 0) {
        enemy.x += enemy.hurtVelocityX * dt;
        const hurtDecay = (getEnemySettings(enemy).hurtKnockbackDecay || 0) * dt;
        if (enemy.hurtVelocityX > 0) enemy.hurtVelocityX = Math.max(0, enemy.hurtVelocityX - hurtDecay);
        else enemy.hurtVelocityX = Math.min(0, enemy.hurtVelocityX + hurtDecay);
      }
      enemy.swingTimer = Math.max(0, enemy.swingTimer - dt);
      enemy.cooldownTimer = Math.max(0, enemy.cooldownTimer - dt);
      enemy.blinkCooldownTimer = Math.max(0, enemy.blinkCooldownTimer - dt);
      enemy.noBlinkTimer = Math.max(0, enemy.noBlinkTimer - dt);
      enemy.blinkAlpha = Math.max(0, enemy.blinkAlpha - dt * 3);
      if (enemy.state === "dead") {
        if (enemy.stateTimer >= getEnemySettings(enemy).deathDuration) {
          enemy.removed = true;
        }
        continue;
      }
      if (enemy.staggerTimer > 0) {
        enemy.staggerTimer = Math.max(0, enemy.staggerTimer - dt);
        enemy.state = "stagger";
      }
      if (enemy.type === "melee") updateMeleeEnemy(enemy, dt);
      else updateRangedEnemy(enemy, dt);
      applyGravity(enemy, dt, false);
      enemy.x = clamp(enemy.x, world.left + 6, world.right - 6);
    }
    state.enemies = state.enemies.filter((enemy) => !enemy.removed);
    updateEncounterFlow(dt);
  }

  function updateEncounterFlow(dt) {
    if (!state.battleManager) return;
    if (state.encounterMode === "idle") {
      state.battleManager.livingEnemies = 0;
      state.battleManager.awaitingNextWave = false;
      state.battleManager.nextWaveTimer = 0;
      return;
    }

    const livingEnemies = state.enemies.filter((enemy) => isEnemyAlive(enemy)).length;
    state.battleManager.livingEnemies = livingEnemies;
    if (livingEnemies > 0) return;

    if (!state.battleManager.awaitingNextWave) {
      state.battleManager.awaitingNextWave = true;
      state.battleManager.nextWaveTimer = config.battle.waveRespawnDelay;
      state.infoText = `Wave ${state.battleManager.wave} Clear`;
      state.infoTextTimer = 0.6;
      return;
    }

    state.battleManager.nextWaveTimer = Math.max(0, state.battleManager.nextWaveTimer - dt);
    if (state.battleManager.nextWaveTimer <= 0) {
      spawnEncounter(state.encounterMode);
    }
  }

  function triggerDummyAttack(mode) {
    const nextMode = resolveDummyAttackMode(mode);
    if (nextMode === "idle") return;
    let enemy = getPrimaryEnemy(nextMode);
    if (!enemy) {
      state.encounterMode = nextMode;
      spawnEncounter(nextMode);
      enemy = getPrimaryEnemy(nextMode);
      if (!enemy) return;
    }
    enemy.state = "attack_windup";
    enemy.stateTimer = 0;
    enemy.attackResolved = false;
    if (nextMode === "ranged") {
      enemy.noBlinkTimer = Math.max(enemy.noBlinkTimer, 0.25);
    }
  }

  function updateProjectiles(dt) {
    const player = state.player;
    state.projectiles = state.projectiles.filter((proj) => {
      proj.ttl -= dt;
      if (proj.ignorePlayerTimer > 0) proj.ignorePlayerTimer -= dt;
      proj.x += Math.cos(proj.angle) * proj.speed * dt;
      proj.y += Math.sin(proj.angle) * proj.speed * dt;
      if (proj.ttl <= 0) return false;
      if (proj.x < -40 || proj.y < -40 || proj.x > WIDTH + 40 || proj.y > HEIGHT + 40) return false;

      if (proj.owner === "enemy" && proj.ignorePlayerTimer <= 0) {
        const chest = getPlayerChest(player);
        if (Math.hypot(proj.x - chest.x, proj.y - chest.y) <= proj.radius + player.radius + 8) {
          const attacker = getEnemyById(proj.sourceEnemyId);
          const hitResult = processIncomingHit("ranged", attacker, proj);
          if (hitResult === "ignored") {
            proj.ignorePlayerTimer = 0.14;
            return true;
          }
          if (proj.owner === "enemy") return false;
        }
      }

      if (proj.owner === "player") {
        let hitEnemy = null;
        forEachLivingEnemy((enemy) => {
          if (!hitEnemy && isPointInEnemyHitbox(enemy, proj.x, proj.y, proj.radius)) hitEnemy = enemy;
        });
        if (hitEnemy) {
          damageEnemy(hitEnemy, proj.damage, {
            stagger: proj.stagger ?? (proj.shotStyle === "armor_break" ? 0.28 : 0),
            projectileAngle: proj.angle,
            knockback: proj.knockback ?? (proj.shotStyle === "armor_break" ? 102 : undefined),
            hitstop: proj.reflected ? 0 : proj.hitstop,
          });
          pushEffect(hitEnemy.x, hitEnemy.y - 34, proj.reflected ? "#b8f5ff" : weaponPalette.gun, "hit");
          return false;
        }
      }

      return true;
    });
  }

  function updateEffects(dt) {
    state.effects = state.effects.filter((effect) => {
      effect.timer -= dt;
      return effect.timer > 0;
    });
    if (state.infoTextTimer > 0) state.infoTextTimer -= dt;
    if (state.flashTimer > 0) state.flashTimer -= dt;
    if (state.counterPromptTimer > 0) state.counterPromptTimer -= dt;
  }

  function update(dt) {
    if (state.mode !== "running") return;
    state.time += dt;
    if (state.hitstopTimer > 0) {
      state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
      updateEffects(dt);
      return;
    }
    handlePlayerInput();
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateEffects(dt);
    mouse.leftPressed = false;
    mouse.rightPressed = false;
    mouse.wheelDown = false;
  }

  function drawArena() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#0c1118");
    sky.addColorStop(0.55, "#132030");
    sky.addColorStop(1, "#0f1722");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(WIDTH * 0.62, HEIGHT * 0.18, 18, WIDTH * 0.62, HEIGHT * 0.18, 260);
    glow.addColorStop(0, "rgba(243, 194, 101, 0.18)");
    glow.addColorStop(1, "rgba(243, 194, 101, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillRect(96, world.groundY - 164, 56, 164);
    ctx.fillRect(294, world.groundY - 210, 78, 210);
    ctx.fillRect(728, world.groundY - 188, 64, 188);

    for (const platform of stagePlatforms) {
      ctx.fillStyle = "#273447";
      ctx.beginPath();
      ctx.roundRect(platform.x, platform.y, platform.w, platform.h, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(platform.x + 10, platform.y + 4, platform.w - 20, 4);
      ctx.strokeStyle = "rgba(227, 238, 248, 0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(platform.x + 8, platform.y + 0.5);
      ctx.lineTo(platform.x + platform.w - 8, platform.y + 0.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(124, 148, 170, 0.18)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(platform.x + 24, platform.y + platform.h);
      ctx.lineTo(platform.x + 24, Math.min(world.groundY, platform.y + 64));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(platform.x + platform.w - 24, platform.y + platform.h);
      ctx.lineTo(platform.x + platform.w - 24, Math.min(world.groundY, platform.y + 64));
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(180, 214, 235, 0.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, world.groundY + 10);
      ctx.lineTo(x + 18, HEIGHT);
      ctx.stroke();
    }

    const ground = ctx.createLinearGradient(0, world.groundY - 8, 0, HEIGHT);
    ground.addColorStop(0, "#243041");
    ground.addColorStop(1, "#18212f");
    ctx.fillStyle = ground;
    ctx.fillRect(0, world.groundY, WIDTH, HEIGHT - world.groundY);

    ctx.strokeStyle = "rgba(226, 241, 250, 0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, world.groundY + 0.5);
    ctx.lineTo(WIDTH, world.groundY + 0.5);
    ctx.stroke();
  }

  function drawPlayer() {
    const player = state.player;
    const isGuarding =
      player.state === "guard_startup" ||
      player.state === "guard_active" ||
      player.state === "block_success" ||
      player.state === "perfect_guard";
    const pose = getPlayerSpritePose(player);
    const facingLeft = player.facingSign < 0;
    const hurtRatio = player.feedbackTimer > 0 ? clamp(player.feedbackTimer / 0.16, 0, 1) : 0;
    const hurtShiftX = hurtRatio > 0 ? player.hurtDirection * hurtRatio * 9 : 0;
    const hurtShiftY = hurtRatio > 0 ? -hurtRatio * 2 : 0;
    const hurtRotation = hurtRatio > 0 ? player.hurtDirection * hurtRatio * 0.12 : 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    if (hurtRatio > 0) {
      ctx.translate(hurtShiftX, hurtShiftY);
      ctx.rotate(hurtRotation);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 0, player.radius + 8, 8, 0, 0, TAU);
    ctx.fill();

    if (player.state === "counter_window") {
      ctx.strokeStyle = "rgba(245,191,92,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -34, player.radius + 12, 0, TAU);
      ctx.stroke();
    }

    if (player.currentWeapon === "gun") {
      const ammoSpacing = 15;
      const ammoStartX = -((config.player.gunMaxAmmo - 1) * ammoSpacing) * 0.5;
      const reloadPulse = player.gunReloadTimer > 0 ? 0.55 + Math.sin(state.time * 16) * 0.18 : 0;
      for (let i = 0; i < config.player.gunMaxAmmo; i += 1) {
        const filled = i < player.gunAmmo;
        const orbX = ammoStartX + i * ammoSpacing;
        const orbY = -76;
        ctx.fillStyle = filled ? "#8ce8ff" : `rgba(56, 78, 94, ${player.gunReloadTimer > 0 ? 0.46 + reloadPulse * 0.3 : 0.82})`;
        ctx.beginPath();
        ctx.arc(orbX, orbY, filled ? 5 : 4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = filled ? "rgba(235,252,255,0.95)" : "rgba(164, 204, 220, 0.22)";
        ctx.lineWidth = filled ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(orbX, orbY, filled ? 7 : 6, 0, TAU);
        ctx.stroke();
      }
    }

    const spriteDrawn = drawSpriteFrame(pose.asset || spriteAssets.playerSheet, pose.frame, 0, 0, {
      scale: pose.scale,
      scaleX: pose.scaleX,
      scaleY: pose.scaleY,
      alpha: pose.alpha,
      flipX: facingLeft,
      offsetX: pose.offsetX,
      offsetY: pose.offsetY,
      rotation: pose.rotation,
    });
    if (spriteDrawn && pose.overlayAsset && pose.overlayFrame) {
      drawSpriteFrame(pose.overlayAsset, pose.overlayFrame, 0, 0, {
        scale: pose.scale,
        alpha: pose.alpha,
        flipX: facingLeft,
        offsetX: (pose.offsetX || 0) + (pose.overlayOffsetX || 0),
        offsetY: (pose.offsetY || 0) + (pose.overlayOffsetY || 0),
        rotation: pose.overlayRotation || 0,
      });
    }
    if (!spriteDrawn) {
      drawPlayerFallback(player, isGuarding);
    }

    ctx.restore();
  }

  function getEnemySpritePose(enemy) {
    const settings = getEnemySettings(enemy);
    const facingLeft = enemy.state === "dead" ? enemy.deathFlipX : enemy.facingSign < 0;
    const meleeScale = 4.6;
    const rangedScale = 0.185;
    const rangedFlip = !facingLeft;
    if (enemy.state === "dead") {
      const progress = clamp(enemy.stateTimer / settings.deathDuration, 0, 1);
      if (enemy.type === "melee") {
        return {
          asset: enemySpriteAssets.meleeSheet,
          frame: enemySpriteFrames.meleeHurt[1],
          scale: meleeScale,
          offsetY: 8 + progress * 8,
          flipX: enemy.deathFlipX,
          alpha: progress > 0.78 ? 1 - (progress - 0.78) / 0.22 : 1,
          rotation: enemy.deathRotationDir * progress * 1.18,
          scaleX: 1 + progress * 0.08,
          scaleY: 1 - progress * 0.28,
        };
      }
      const deathAsset = getProgressItem(enemySpriteAssets.ranged.death, progress) || enemySpriteAssets.ranged.death.at(-1);
      return {
        asset: deathAsset,
        frame: getWholeAssetFrame(deathAsset, 0.5, 0.985),
        scale: rangedScale,
        offsetY: 4 + progress * 10,
        flipX: !enemy.deathFlipX,
        alpha: progress > 0.82 ? 1 - (progress - 0.82) / 0.18 : 1,
        rotation: enemy.deathRotationDir * progress * 0.42,
      };
    }

    const hurtProgress = enemy.hurtTimer > 0 ? enemy.hurtTimer / settings.hurtDuration : 0;
    const hurtOffsetX = enemy.hurtTimer > 0 ? enemy.hurtDirection * hurtProgress * 8 : 0;
    const hurtOffsetY = enemy.hurtTimer > 0 ? -hurtProgress * 2 : 0;
    const hurtRotation = enemy.hurtTimer > 0 ? enemy.hurtDirection * hurtProgress * 0.14 : 0;

    if (enemy.type === "melee") {
      if (enemy.hurtTimer > 0 && enemy.state !== "stagger") {
        return {
          asset: enemySpriteAssets.meleeSheet,
          frame: getProgressFrame(enemySpriteFrames.meleeHurt, 1 - hurtProgress),
          scale: meleeScale,
          offsetY: 8 + hurtOffsetY,
          flipX: facingLeft,
          offsetX: hurtOffsetX,
          rotation: hurtRotation * 1.05,
          scaleX: 1 - hurtProgress * 0.04,
          scaleY: 1 + hurtProgress * 0.05,
        };
      }
      if (enemy.state === "attack_windup") {
        return {
          asset: enemySpriteAssets.meleeSheet,
          frame: getProgressFrame(enemySpriteFrames.meleeAttack, Math.min(0.66, (enemy.stateTimer / config.enemies.melee.windup) * 0.66)),
          scale: meleeScale,
          offsetY: 8,
          flipX: facingLeft,
          offsetX: hurtOffsetX,
          rotation: hurtRotation,
        };
      }
      if (enemy.state === "attack_active" || enemy.state === "attack_recover") {
        const activeProgress =
          enemy.state === "attack_active"
            ? 0.66 + clamp(enemy.stateTimer / config.enemies.melee.activeDuration, 0, 1) * 0.34
            : 0.88;
        return {
          asset: enemySpriteAssets.meleeSheet,
          frame: getProgressFrame(enemySpriteFrames.meleeAttack, activeProgress),
          scale: meleeScale,
          offsetY: 8,
          flipX: facingLeft,
          offsetX: hurtOffsetX,
          rotation: hurtRotation,
        };
      }
      if (enemy.state === "stagger") {
        return {
          asset: enemySpriteAssets.meleeSheet,
          frame: enemySpriteFrames.meleeHurt[0],
          scale: meleeScale,
          offsetY: 8 + hurtOffsetY,
          flipX: facingLeft,
          offsetX: hurtOffsetX,
          rotation: hurtRotation,
        };
      }
      if (enemy.vx === 0) {
        return {
          asset: enemySpriteAssets.meleeSheet,
          frame: getLoopFrame(enemySpriteFrames.meleeIdle, state.time + enemy.stateTimer * 0.2, 5),
          scale: meleeScale,
          offsetY: 8 + hurtOffsetY,
          flipX: facingLeft,
          offsetX: hurtOffsetX,
          rotation: hurtRotation,
        };
      }
      return {
        asset: enemySpriteAssets.meleeSheet,
        frame: getLoopFrame(enemySpriteFrames.meleeWalk, state.time + enemy.stateTimer * 0.25, enemy.vx === 0 ? 4 : 10),
        scale: meleeScale,
        offsetY: 8 + hurtOffsetY,
        flipX: facingLeft,
        offsetX: hurtOffsetX,
        rotation: hurtRotation,
      };
    }

    if (enemy.state === "stagger" || enemy.hurtTimer > 0) {
      const hurtBaseAsset =
        Math.abs(enemy.vx) > 10
          ? getLoopItem(enemySpriteAssets.ranged.walk, state.time + enemy.stateTimer * 0.12, 8)
          : getLoopItem(enemySpriteAssets.ranged.idle, state.time + enemy.stateTimer * 0.12, 6);
      return {
        asset: hurtBaseAsset,
        frame: getWholeAssetFrame(hurtBaseAsset, 0.5, 0.985),
        scale: rangedScale,
        offsetY: 4 + hurtOffsetY - hurtProgress * 4,
        flipX: rangedFlip,
        offsetX: hurtOffsetX * 1.15,
        rotation: hurtRotation * 1.45 + enemy.hurtDirection * hurtProgress * 0.08,
        scaleX: 1 - hurtProgress * 0.08,
        scaleY: 1 + hurtProgress * 0.1,
      };
    }

    if (enemy.state === "attack_windup") {
      const progress = clamp(enemy.stateTimer / config.enemies.ranged.windup, 0, 1);
      const attackAsset =
        progress < 0.34
          ? getLoopItem(enemySpriteAssets.ranged.idle, state.time * 0.6, 6)
          : getProgressItem(enemySpriteAssets.ranged.attack, progress * 0.4);
      return {
        asset: attackAsset,
        frame: getWholeAssetFrame(attackAsset, 0.5, 0.985),
        scale: rangedScale,
        offsetY: 4 + hurtOffsetY,
        flipX: rangedFlip,
        offsetX: hurtOffsetX,
        rotation: hurtRotation,
      };
    }
    if (enemy.state === "attack_active" || enemy.state === "attack_recover") {
      const activeProgress =
        enemy.state === "attack_active"
          ? 0.4 + clamp(enemy.stateTimer / config.enemies.ranged.activeDuration, 0, 1) * 0.6
          : 0.96;
      const attackAsset = getProgressItem(enemySpriteAssets.ranged.attack, activeProgress) || enemySpriteAssets.ranged.attack.at(-1);
      return {
        asset: attackAsset,
        frame: getWholeAssetFrame(attackAsset, 0.5, 0.985),
        scale: rangedScale,
        offsetY: 4 + hurtOffsetY,
        flipX: rangedFlip,
        offsetX: hurtOffsetX,
        rotation: hurtRotation,
      };
    }
    const baseAsset =
      Math.abs(enemy.vx) > 10
        ? getLoopItem(enemySpriteAssets.ranged.walk, state.time + enemy.stateTimer * 0.15, 8)
        : getLoopItem(enemySpriteAssets.ranged.idle, state.time + enemy.stateTimer * 0.15, 6);
    return {
      asset: baseAsset,
      frame: getWholeAssetFrame(baseAsset, 0.5, 0.985),
      scale: rangedScale,
      offsetY: 4 + hurtOffsetY,
      flipX: rangedFlip,
      offsetX: hurtOffsetX,
      rotation: hurtRotation,
    };
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      if (!isEnemyRenderable(enemy)) continue;
      const settings = getEnemySettings(enemy);
      const staggerRatio = settings.staggerDuration > 0 ? clamp(enemy.staggerTimer / settings.staggerDuration, 0, 1) : 0;
      const flashRatio = clamp(enemy.flashTimer / 0.18, 0, 1);
      const wobble = staggerRatio > 0 ? Math.sin(state.time * 48) * 7 * staggerRatio : 0;
      const x = enemy.x + wobble;
      ctx.save();
      ctx.translate(x, enemy.y);

      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius + 8, 8, 0, 0, TAU);
      ctx.fill();

      const pose = getEnemySpritePose(enemy);
      const spriteDrawn = drawSpriteFrame(pose.asset, pose.frame, 0, 0, {
        scale: pose.scale,
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
        flipX: pose.flipX,
        offsetY: pose.offsetY,
        offsetX: pose.offsetX,
        rotation: pose.rotation,
        alpha: (pose.alpha ?? 1) * (enemy.blinkAlpha > 0 ? 0.7 + (1 - enemy.blinkAlpha) * 0.3 : 1),
        flashAlpha: flashRatio * 0.82,
        flashColor: "#ffffff",
        baseBrightness: enemy.type === "melee" ? 1 - flashRatio * 0.52 : 1,
        flashOutlineAlpha: enemy.type === "melee" ? 1 : 0,
        flashOutlineScale: enemy.type === "melee" ? 0.14 : 0.04,
      });
      if (!spriteDrawn) {
        const baseColor = enemy.type === "melee" ? "#8d5632" : "#4b74c9";
        const fillColor = enemy.flashTimer > 0 ? "#ffffff" : baseColor;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(-18, -62, 36, 56, 10);
        ctx.fill();
      }

      if (enemy.state !== "dead" && staggerRatio > 0) {
        ctx.strokeStyle = `rgba(255,242,166,${0.55 + staggerRatio * 0.35})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, -34, enemy.radius + 12 + (1 - staggerRatio) * 8, 0, TAU);
        ctx.stroke();
      }

      if (enemy.state === "attack_windup") {
        const windupRatio = clamp(enemy.stateTimer / Math.max(settings.windup, 0.001), 0, 1);
        const popIn = clamp(windupRatio / 0.18, 0, 1);
        const pulse = 1 + Math.sin(state.time * 18 + enemy.x * 0.02) * 0.06;
        const alertScale = (0.82 + popIn * 0.18) * pulse;
        const alertY = -94 - (1 - popIn) * 12;
        ctx.save();
        ctx.translate(0, alertY);
        ctx.scale(alertScale, alertScale);
        ctx.fillStyle = "rgba(11, 17, 25, 0.84)";
        ctx.beginPath();
        ctx.roundRect(-13, -31, 26, 36, 11);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 237, 169, 0.92)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-13, -31, 26, 36, 11);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 211, 95, 0.98)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(0, -7);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 211, 95, 0.98)";
        ctx.beginPath();
        ctx.arc(0, 1, 3.2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      if (enemy.type === "melee" && enemy.swingTimer > 0) {
        const spread = 1.18;
        const alpha = enemy.swingTimer / 0.18;
        ctx.strokeStyle = `rgba(245,191,92,${0.35 + alpha * 0.55})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(enemy.facingSign * 8, -32, enemy.radius + 20, -spread * 0.5, spread * 0.5);
        ctx.stroke();
      }

      if (enemy.type === "ranged") {
        if (enemy.blinkAlpha > 0) {
          ctx.strokeStyle = `rgba(174,238,255,${enemy.blinkAlpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, -34, enemy.radius + 8 + (1 - enemy.blinkAlpha) * 18, 0, TAU);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  function drawProjectiles() {
    for (const proj of state.projectiles) {
      ctx.save();
      if (proj.owner === "enemy") {
        const drewArrow = drawSpriteFrame(enemySpriteAssets.ranged.arrow, enemySpriteFrames.arrow[0], proj.x, proj.y, {
          scale: 0.12,
          rotation: proj.angle - Math.PI * 0.5,
        });
        if (!drewArrow) {
          ctx.fillStyle = "#ff8c6a";
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius, 0, TAU);
          ctx.fill();
        }
      } else if (proj.reflected) {
        const tail = 34;
        ctx.strokeStyle = "rgba(214,251,255,0.34)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(proj.x - Math.cos(proj.angle) * tail, proj.y - Math.sin(proj.angle) * tail);
        ctx.lineTo(proj.x + Math.cos(proj.angle) * 10, proj.y + Math.sin(proj.angle) * 10);
        ctx.stroke();
        ctx.strokeStyle = "#f1ffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius + 4, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#9fefff";
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(159,239,255,0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(proj.x - Math.cos(proj.angle) * tail, proj.y - Math.sin(proj.angle) * tail);
        ctx.lineTo(proj.x + Math.cos(proj.angle) * 8, proj.y + Math.sin(proj.angle) * 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(proj.x + Math.cos(proj.angle) * 12, proj.y + Math.sin(proj.angle) * 12);
        ctx.lineTo(proj.x + Math.cos(proj.angle + 2.55) * 10, proj.y + Math.sin(proj.angle + 2.55) * 10);
        ctx.lineTo(proj.x + Math.cos(proj.angle - 2.55) * 10, proj.y + Math.sin(proj.angle - 2.55) * 10);
        ctx.closePath();
        ctx.fillStyle = "#ecffff";
        ctx.fill();
      } else if (proj.shotStyle === "armor_break") {
        ctx.strokeStyle = "#faffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius + 6, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(215,251,255,0.72)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius + 11, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#d7fbff";
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(215,251,255,0.68)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(proj.x - Math.cos(proj.angle) * 22, proj.y - Math.sin(proj.angle) * 22);
        ctx.lineTo(proj.x + Math.cos(proj.angle) * 8, proj.y + Math.sin(proj.angle) * 8);
        ctx.stroke();
      } else if (proj.shotStyle === "fourth_shot") {
        ctx.strokeStyle = "#fff8d4";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius + 5, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,240,176,0.72)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius + 10, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#ffe48b";
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,234,163,0.72)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(proj.x - Math.cos(proj.angle) * 26, proj.y - Math.sin(proj.angle) * 26);
        ctx.lineTo(proj.x + Math.cos(proj.angle) * 10, proj.y + Math.sin(proj.angle) * 10);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#77d7ea";
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function getSwordSlashVfxConfig(style) {
    if (style === "a2") {
      return { asset: combatVfxAssets.swordA2, frameWidth: 48, frameHeight: 48, frameCount: 6, scale: 1.62, anchorX: 12, anchorY: 24, forward: 18 };
    }
    if (style === "a3") {
      return { asset: combatVfxAssets.swordA3, frameWidth: 48, frameHeight: 48, frameCount: 6, scale: 1.94, anchorX: 12, anchorY: 24, forward: 26 };
    }
    if (style === "guard_break") {
      return { asset: combatVfxAssets.swordA3, frameWidth: 48, frameHeight: 48, frameCount: 6, scale: 2.06, anchorX: 12, anchorY: 24, forward: 30 };
    }
    if (style === "ranged_chase") {
      return { asset: combatVfxAssets.swordA3, frameWidth: 48, frameHeight: 48, frameCount: 6, scale: 1.84, anchorX: 12, anchorY: 24, forward: 24 };
    }
    return { asset: combatVfxAssets.swordA1, frameWidth: 48, frameHeight: 48, frameCount: 6, scale: 1.4, anchorX: 12, anchorY: 24, forward: 12 };
  }

  function drawBanditHitEffect(effect, scale = 1.05) {
    return drawStripEffect(combatVfxAssets.hit, effect, 32, 32, 4, {
      scale,
      anchorX: 16,
      anchorY: 16,
    });
  }

  function drawBanditGunMuzzle(effect, scale) {
    return drawStripEffect(combatVfxAssets.gunMuzzle, effect, 32, 32, 4, {
      scale,
      rotation: effect.angle || 0,
      anchorX: 8,
      anchorY: 16,
    });
  }

  function drawBanditGuardEffect(effect, scale = 1, rotation = 0) {
    return drawStripEffect(combatVfxAssets.guard, effect, 40, 40, 5, {
      scale,
      rotation,
      anchorX: 20,
      anchorY: 20,
    });
  }

  function drawGuardPulseEffect(effect, options = {}) {
    const alpha = effect.total > 0 ? clamp(effect.timer / effect.total, 0, 1) : 0;
    const radius = (options.baseRadius ?? 18) + (1 - alpha) * (options.expand ?? 14);
    const arc = options.arc ?? 1.1;
    const angle = effect.angle || 0;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.rotate(angle);
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = alpha * (options.alphaScale ?? 0.92);
    ctx.lineWidth = (options.lineWidth ?? 5) + (1 - alpha) * 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -arc * 0.5, arc * 0.5);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, (options.lineWidth ?? 5) * 0.46);
    for (const sparkDir of [-1, 1]) {
      const sparkAngle = sparkDir * arc * 0.64;
      const inner = radius - 2;
      const outer = radius + 8 + (1 - alpha) * 10;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sparkAngle) * inner, Math.sin(sparkAngle) * inner);
      ctx.lineTo(Math.cos(sparkAngle) * outer, Math.sin(sparkAngle) * outer);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  function drawEffects() {
    for (const effect of state.effects) {
      const alpha = effect.timer / effect.total;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (effect.kind === "sword_slash") {
        const style = effect.slashStyle || "a1";
        const slashConfig = getSwordSlashVfxConfig(style);
        const drawX = effect.x + Math.cos(effect.angle || 0) * slashConfig.forward;
        const drawY = effect.y + Math.sin(effect.angle || 0) * slashConfig.forward * 0.1;
        drawStripEffect(slashConfig.asset, { ...effect, x: drawX, y: drawY }, slashConfig.frameWidth, slashConfig.frameHeight, slashConfig.frameCount, {
          scale: slashConfig.scale,
          rotation: effect.angle || 0,
          anchorX: slashConfig.anchorX,
          anchorY: slashConfig.anchorY,
        });
      } else if (effect.kind === "armor_break_muzzle") {
        drawBanditGunMuzzle(effect, 1.52);
      } else if (effect.kind === "fourth_shot_muzzle") {
        drawBanditGunMuzzle(effect, 1.7);
      } else if (effect.kind === "muzzle") {
        drawBanditGunMuzzle(effect, 1.2);
      } else if (effect.kind === "repel_blast") {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle || 0);
        ctx.strokeStyle = "#d7fbff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 24 + (1 - alpha) * 14, -0.55, 0.55);
        ctx.stroke();
        ctx.strokeStyle = "rgba(215,251,255,0.72)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(24, 0);
        ctx.lineTo(0, 12);
        ctx.stroke();
      } else if (effect.kind === "repel_hit") {
        drawBanditHitEffect(effect, 1.18);
      } else if (effect.kind === "ammo_reload") {
        ctx.strokeStyle = "#bff4ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 14 + (1 - alpha) * 12, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(191,244,255,0.72)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 24 + (1 - alpha) * 10, 0, TAU);
        ctx.stroke();
      } else if (effect.kind === "reflect_burst") {
        drawGuardPulseEffect(effect, { baseRadius: 20, expand: 18, lineWidth: 5.5, arc: 1.22, alphaScale: 0.98 });
      } else if (effect.kind === "stagger_burst") {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 22 + (1 - alpha) * 28, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,252,216,0.9)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i += 1) {
          const angle = i * (TAU / 4) + (1 - alpha) * 0.2;
          const inner = 18;
          const outer = 34 + (1 - alpha) * 10;
          ctx.beginPath();
          ctx.moveTo(effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner);
          ctx.lineTo(effect.x + Math.cos(angle) * outer, effect.y + Math.sin(angle) * outer);
          ctx.stroke();
        }
      } else if (effect.kind === "slash_hit" || effect.kind === "hit") {
        drawBanditHitEffect(effect, effect.kind === "slash_hit" ? 1.05 : 0.98);
      } else if (effect.kind === "enemy_hit") {
        drawBanditHitEffect(effect, 1.08);
      } else if (effect.kind === "player_hit") {
        drawBanditHitEffect(effect, 1.12);
      } else if (effect.kind === "perfect_guard") {
        drawGuardPulseEffect(effect, { baseRadius: 16, expand: 22, lineWidth: 6.5, arc: 1.35, alphaScale: 1 });
      } else if (effect.kind === "block") {
        drawGuardPulseEffect(effect, { baseRadius: 16, expand: 12, lineWidth: 4.5, arc: 1.02, alphaScale: 0.9 });
      } else if (effect.kind === "parry" || effect.kind === "reflect") {
        drawGuardPulseEffect(effect, {
          baseRadius: effect.kind === "parry" ? 18 : 16,
          expand: effect.kind === "parry" ? 18 : 14,
          lineWidth: effect.kind === "parry" ? 5.5 : 4.5,
          arc: effect.kind === "parry" ? 1.28 : 1.08,
          alphaScale: 0.96,
        });
      } else if (effect.kind === "dash_afterimage") {
        drawStripEffect(combatVfxAssets.dash, effect, 40, 40, 4, {
          scale: effect.scale ?? 1.15,
          alpha: effect.alphaScale ?? 1,
          rotation: effect.angle || 0,
          anchorX: 6,
          anchorY: 20,
        });
      } else if (effect.kind === "chase_afterimage") {
        const asset = effect.weapon === "gun" ? sideviewAddonAssets.gunDash : sideviewAddonAssets.dash;
        const frames = effect.weapon === "gun" ? sideviewAddonFrames.gunDash : sideviewAddonFrames.dash;
        const frame = frames[Math.max(0, Math.min(frames.length - 1, effect.frameIndex ?? 1))];
        drawSpriteFrame(asset, frame, effect.x, effect.y, {
          scale: effect.scale ?? 2.2,
          scaleX: effect.scaleX ?? 1.18,
          scaleY: effect.scaleY ?? 0.88,
          alpha: (effect.alphaScale ?? 0.8) * alpha,
          flipX: effect.facingLeft,
          offsetY: effect.weapon === "gun" ? 24 : 20,
        });
      } else if (effect.kind === "land_dust") {
        ctx.strokeStyle = "rgba(220,236,246,0.55)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 14 + (1 - alpha) * 16, Math.PI, TAU);
        ctx.stroke();
      } else if (effect.kind === "switch") {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 14 + (1 - alpha) * 18, 0, TAU);
        ctx.stroke();
      } else {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 16 + (1 - alpha) * 24, 0, TAU);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  function drawHud() {
    const player = state.player;
    const primaryEnemy = getPrimaryEnemy();
    const livingCount = state.enemies.filter((enemy) => isEnemyAlive(enemy)).length;
    const battleManager = state.battleManager;
    ctx.fillStyle = "rgba(9, 15, 23, 0.86)";
    ctx.fillRect(18, 18, 368, 126);

    ctx.fillStyle = "#eef4fb";
    ctx.font = "16px Segoe UI";
    ctx.fillText(`Weapon: ${player.currentWeapon}`, 32, 44);
    ctx.fillText(`State: ${player.state}`, 32, 66);
    ctx.fillText(`Encounter: ${state.encounterMode}`, 32, 88);
    ctx.fillText(`Wave: ${battleManager ? battleManager.wave : 0}`, 32, 110);
    ctx.fillText(`Enemies: ${livingCount}`, 32, 132);
    ctx.fillText(`Dash CD: ${player.dashCooldownTimer.toFixed(2)}`, 214, 66);
    ctx.fillText(`Grounded: ${player.onGround ? "yes" : "no"}`, 214, 132);
    if (primaryEnemy) {
      ctx.fillText(`Focus: ${primaryEnemy.type} ${Math.round(primaryEnemy.hp)}`, 214, 44);
      ctx.fillText(`Slots M/R: ${countAttackers("melee")}/${countAttackers("ranged")}`, 214, 110);
    }
    if (player.currentWeapon === "gun") {
      ctx.fillText(`Ammo: ${player.gunAmmo}/${config.player.gunMaxAmmo}`, 214, 88);
    } else if (battleManager && battleManager.awaitingNextWave) {
      ctx.fillText(`Next Wave: ${battleManager.nextWaveTimer.toFixed(2)}`, 214, 88);
    }

    ctx.fillStyle = "#1a2636";
    ctx.fillRect(18, HEIGHT - 34, 220, 14);
    ctx.fillStyle = "#ff8076";
    ctx.fillRect(18, HEIGHT - 34, 220 * (player.hp / config.player.maxHp), 14);

    if (state.infoTextTimer > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Segoe UI";
      ctx.fillText(state.infoText, WIDTH * 0.5 - 84, 42);
    }

    if (state.counterPromptTimer > 0 && player.state === "counter_window") {
      const alpha = clamp(state.counterPromptTimer / 0.48, 0, 1);
      const panelWidth = 332;
      const panelHeight = 62;
      const panelX = WIDTH * 0.5 - panelWidth * 0.5;
      const panelY = HEIGHT - 88;
      ctx.fillStyle = `rgba(10, 18, 28, ${0.7 + alpha * 0.14})`;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 244, 203, ${0.3 + alpha * 0.32})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
      ctx.stroke();

      ctx.fillStyle = state.counterPromptColor;
      ctx.font = "bold 19px Segoe UI";
      ctx.fillText(`SHIFT: ${state.counterPromptTitle || "FOLLOW-UP"}`, panelX + 16, panelY + 24);
      ctx.fillStyle = `rgba(255, 250, 232, ${0.66 + alpha * 0.3})`;
      ctx.font = "bold 13px Segoe UI";
      ctx.fillText(state.counterPromptRole || "COUNTER", panelX + 16, panelY + 47);
      ctx.fillStyle = `rgba(214, 224, 236, ${0.62 + alpha * 0.26})`;
      ctx.font = "12px Segoe UI";
      ctx.fillText(state.counterPromptHint || "Use your follow-up", panelX + 114, panelY + 47);
    }
  }

  function render() {
    drawArena();
    if (state.mode !== "running") {
      ctx.fillStyle = "#eef4fb";
      ctx.font = "bold 28px Segoe UI";
      ctx.fillText("Click Start To Begin", WIDTH * 0.34, HEIGHT * 0.48);
      ctx.font = "16px Segoe UI";
      ctx.fillText("Side-view graybox validates dual weapons, guard, perfect guard, jump, dash, drop-through, and shift follow-up actions.", WIDTH * 0.05, HEIGHT * 0.54);
      debugUi.textContent = JSON.stringify({ mode: state.mode, note: "press start" });
      return;
    }

    drawEnemies();
    drawProjectiles();
    drawEffects();
    drawPlayer();
    drawHud();

    if (state.flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,220,${(state.flashTimer / 0.12) * 0.2})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    debugUi.textContent = window.render_game_to_text();
  }

  function frame(ts) {
    if (!frame.last) frame.last = ts;
    const dt = Math.min((ts - frame.last) / 1000, 1 / 30);
    frame.last = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function renderGameToText() {
    const player = state.player;
    const primaryEnemy = getPrimaryEnemy();
    return JSON.stringify({
      mode: state.mode,
      note: "side-view test arena with one-way platforms; x grows right and y grows down",
      player: player
        ? {
            x: Math.round(player.x),
            y: Math.round(player.y),
            hp: Number(player.hp.toFixed(1)),
            state: player.state,
            weapon: player.currentWeapon,
            comboIndex: player.comboIndex,
            activeAttackId: player.activeAttack ? player.activeAttack.id : null,
            gunAmmo: player.gunAmmo,
            gunReloadTimer: Number(player.gunReloadTimer.toFixed(2)),
            gunReloadPending: player.gunReloadPending,
            counterWindow: Number(player.counterWindowTimer.toFixed(2)),
            counterPrompt: Number(state.counterPromptTimer.toFixed(2)),
            dashCooldown: Number(player.dashCooldownTimer.toFixed(2)),
            hitstop: Number(state.hitstopTimer.toFixed(2)),
            perfectGuardTimer: Number(player.perfectGuardTimer.toFixed(2)),
            lastParryType: player.lastParryType,
            lastAttackerId: player.lastAttackerId,
            onGround: player.onGround,
            vy: Number(player.vy.toFixed(1)),
          }
        : null,
      dummy: primaryEnemy
        ? {
            x: Math.round(primaryEnemy.x),
            y: Math.round(primaryEnemy.y),
            hp: Number(primaryEnemy.hp.toFixed(1)),
            state: primaryEnemy.state,
            attackMode: state.encounterMode,
            stagger: Number(primaryEnemy.staggerTimer.toFixed(2)),
          }
        : null,
      enemies: state.enemies
        .filter((enemy) => isEnemyAlive(enemy))
        .map((enemy) => ({
          id: enemy.id,
          type: enemy.type,
          x: Math.round(enemy.x),
          y: Math.round(enemy.y),
          hp: Number(enemy.hp.toFixed(1)),
          state: enemy.state,
          stagger: Number(enemy.staggerTimer.toFixed(2)),
          blinkCooldown: Number((enemy.blinkCooldownTimer || 0).toFixed(2)),
          noBlink: Number((enemy.noBlinkTimer || 0).toFixed(2)),
        })),
      battleManager: state.battleManager
        ? {
            encounterMode: state.encounterMode,
            wave: state.battleManager.wave,
            waveSize: state.battleManager.waveSize,
            livingEnemies: state.battleManager.livingEnemies,
            awaitingNextWave: state.battleManager.awaitingNextWave,
            nextWaveTimer: Number(state.battleManager.nextWaveTimer.toFixed(2)),
            meleeAttackers: countAttackers("melee"),
            rangedAttackers: countAttackers("ranged"),
            maxMeleeAttackers: state.battleManager.maxMeleeAttackers,
            maxRangedAttackers: state.battleManager.maxRangedAttackers,
          }
        : null,
      projectiles: state.projectiles.map((proj) => ({
        x: Math.round(proj.x),
        y: Math.round(proj.y),
        owner: proj.owner,
        reflected: proj.reflected,
      })),
      lastSpaceAction: state.lastSpaceAction,
      infoText: state.infoTextTimer > 0 ? state.infoText : "",
      counterPromptTitle: player && player.state === "counter_window" ? state.counterPromptTitle : "",
      counterPromptRole: player && player.state === "counter_window" ? state.counterPromptRole : "",
      counterPromptHint: player && player.state === "counter_window" ? state.counterPromptHint : "",
    });
  }

  function stepGame(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) update(1 / 60);
    render();
  }

  startBtn.addEventListener("click", () => {
    resetGame();
    render();
  });

  dummyIdleBtn.addEventListener("click", () => setDummyAttackMode("idle"));
  dummyMeleeBtn.addEventListener("click", () => setDummyAttackMode("melee"));
  dummyRangedBtn.addEventListener("click", () => setDummyAttackMode("ranged"));
  dummyCycleBtn.addEventListener("click", () => setDummyAttackMode("mixed"));
  dummyTriggerBtn.addEventListener("click", () => {
    if (state.mode !== "running") return;
    triggerDummyAttack(state.encounterMode === "idle" ? "melee" : undefined);
    render();
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    mouse.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      mouse.leftDown = true;
      mouse.leftPressed = true;
    }
    if (event.button === 2) {
      mouse.rightDown = true;
      mouse.rightPressed = true;
    }
  });

  canvas.addEventListener("mouseup", (event) => {
    if (event.button === 0) mouse.leftDown = false;
    if (event.button === 2) mouse.rightDown = false;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("wheel", (event) => {
    if (event.deltaY > 0) mouse.wheelDown = true;
    event.preventDefault();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") event.preventDefault();
    keys.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.render_game_to_text = renderGameToText;
  window.advanceTime = stepGame;
  window.__debugGame = {
    resetGame,
    triggerDummyAttack,
    setDummyMode(mode) {
      setDummyAttackMode(mode);
    },
    setEncounterMode(mode) {
      setDummyAttackMode(mode);
    },
    setPlayerPosition(x, y) {
      state.player.x = x;
      state.player.y = y ?? world.groundY;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.onGround = state.player.y >= world.groundY;
      if (state.player.onGround) state.player.y = world.groundY;
    },
    setMousePosition(x, y) {
      mouse.x = x;
      mouse.y = y;
    },
    pressAttack() {
      mouse.leftPressed = true;
      mouse.leftDown = true;
    },
    releaseAttack() {
      mouse.leftDown = false;
    },
    pressGuard() {
      mouse.rightPressed = true;
      mouse.rightDown = true;
    },
    releaseGuard() {
      mouse.rightDown = false;
    },
    pressSpace() {
      keys.add("Space");
    },
    pressDash() {
      keys.add("ShiftLeft");
    },
    pressSwitch() {
      keys.add("KeyQ");
    },
    pressJump() {
      keys.add("Space");
    },
    releaseJump() {
      keys.delete("Space");
    },
    pressDown() {
      keys.add("KeyS");
    },
    releaseDown() {
      keys.delete("KeyS");
      keys.delete("ArrowDown");
    },
    startGuard() {
      state.player.guardHeld = true;
      beginState("guard_startup");
    },
    endGuard() {
      state.player.guardHeld = false;
      if (state.player.state === "guard_startup" || state.player.state === "guard_active") {
        beginState("idle");
      }
    },
    forceIncomingHit(type) {
      const attacker = getPrimaryEnemy(type === "melee" ? "melee" : type === "ranged" ? "ranged" : null);
      processIncomingHit(
        type,
        attacker,
        type === "ranged" && attacker
          ? {
              owner: "enemy",
              angle: 0,
              speed: config.enemies.ranged.projectileSpeed,
              damage: config.enemies.ranged.damage,
              reflected: false,
              x: attacker.x,
              y: getEnemyChest(attacker).y,
              sourceEnemyId: attacker.id,
            }
          : null,
      );
    },
    forceCounterWindow(type) {
      state.player.lastParryType = type;
      beginState("counter_window");
    },
    defeatAllEnemies,
    getSnapshot() {
      return JSON.parse(renderGameToText());
    },
  };

  updateDummyToolUi();
  render();
  requestAnimationFrame(frame);
})();
