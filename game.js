(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const debugUi = document.getElementById("debug-ui");
  const startBtn = document.getElementById("start-btn");
  const gmPrevBtn = document.getElementById("gm-prev-btn");
  const gmReplayBtn = document.getElementById("gm-replay-btn");
  const gmNextBtn = document.getElementById("gm-next-btn");

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
      maxHp: 200,
      attackMoveScale: 0.62,
      switchMoveScale: 0.55,
      guardMoveScale: 0.4,
      counterMoveScale: 0.7,
      dashDuration: 0.27,
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
      deathDuration: 0.82,
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
      boss: {
        radius: 42,
        maxHp: 360,
        moveSpeed: 176,
        meleeRange: 124,
        preferredRange: 268,
        pressureStepDuration: 0.45,
        backstepDuration: 0.5,
        teleportMinRange: 150,
        teleportMaxRange: 360,
        teleportCooldown: 2.6,
        teleportVanishDuration: 0.18,
        teleportAppearDuration: 0.14,
        teleportStrikeWindup: 0.32,
        teleportStrikeActiveDuration: 0.14,
        teleportRecover: 0.46,
        teleportOffset: 92,
        meleeWindup: 0.75,
        meleeActiveDuration: 0.18,
        meleeRecover: 0.85,
        rangedWindup: 0.7,
        rangedActiveDuration: 0.2,
        rangedRecover: 0.65,
        phaseTwoThreshold: 0.55,
        phaseTwoSpeedMultiplier: 0.8,
        damage: 28,
        teleportDamage: 22,
        projectileDamage: 22,
        projectileSpeed: 420,
        projectileStartupSpeed: 228,
        projectileParryWindow: 0.26,
        projectileRadius: 18,
        staggerDuration: 0.95,
        hurtDuration: 0.22,
        hurtHitstop: 4 / 60,
        hurtKnockback: 96,
        hurtKnockbackDecay: 480,
        deathDuration: 1.1,
        hitCenterOffsetY: 58,
        hitRadiusX: 34,
        hitRadiusY: 58,
        muzzleOffsetX: 22,
        muzzleOffsetY: 86,
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
            counterTitle: "破势重斩",
            counterRole: "高伤惩罚",
            counterHint: "吃准窗口打最大收益",
            counterColor: "#ffd36f",
            activationText: "破势重斩",
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
            counterTitle: "追影突进",
            counterRole: "位移追击",
            counterHint: "贴脸后继续压制",
            counterColor: "#ffca78",
            activationText: "追影突进",
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
            counterTitle: "震退爆轰",
            counterRole: "击退控场",
            counterHint: "先把近身压力轰开",
            counterColor: "#aef3ff",
            activationText: "震退爆轰",
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
            counterTitle: "破甲射击",
            counterRole: "远程破防",
            counterHint: "安全距离直接反压",
            counterColor: "#d8fbff",
            activationText: "破甲射击",
          },
        },
      },
    },
  };

  const state = {
    playMode: "arena",
    mode: "ready",
    time: 0,
    flashTimer: 0,
    hitstopTimer: 0,
    counterPromptTimer: 0,
    infoTextTimer: 0,
    infoText: "点击开始",
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
    encounterOverride: null,
    battleManager: null,
    nextEnemyId: 1,
    tutorialTransition: {
      active: false,
      nextStage: null,
      timer: 0,
      duration: 0.9,
      label: "",
    },
    tutorialChoice: {
      selectedIndex: 1,
    },
    gameOverMenu: {
      active: false,
      selectedIndex: 0,
      reason: "",
    },
    tutorialFlow: window.TutorialFlow.createTutorialFlowState({
      width: WIDTH,
      height: HEIGHT,
      world,
      stagePlatforms,
    }),
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
    boss: [{ type: "boss", x: WIDTH * 0.86, y: world.groundY }],
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
    death: buildManualFrames([
      { x: 38, y: 757, w: 18, h: 33, anchorX: 9, anchorY: 33 },
      { x: 79, y: 757, w: 17, h: 33, anchorX: 8.5, anchorY: 33 },
      { x: 120, y: 757, w: 19, h: 33, anchorX: 9.5, anchorY: 33 },
      { x: 160, y: 757, w: 22, h: 33, anchorX: 11, anchorY: 33 },
      { x: 200, y: 757, w: 30, h: 33, anchorX: 15, anchorY: 33 },
      { x: 232, y: 757, w: 43, h: 33, anchorX: 21.5, anchorY: 33 },
    ]),
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
    gunIdleBody: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gunhold_idle.png"),
    gunAttackBody: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gunhold_attack.png"),
    gunMoveBody: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gunhold_move.png"),
    gunGuardBody: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gunhold_guard.png"),
    gunHurtBody: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gunhold_hurt.png"),
    gunSwitchBody: createImageAsset("./reference_assets/green_bandit/runtime_sideview/green_bandit_gunhold_switch.png"),
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
    boss: {
      idle: Array.from({ length: 8 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/Idle/Bringer-of-Death_Idle_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
      walk: Array.from({ length: 8 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
      attack: Array.from({ length: 10 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/No Effect Sprites/Attack/Bringer-of-Death_Attack_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
      cast: Array.from({ length: 9 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/No Effect Sprites/Cast/Bringer-of-Death_Cast_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
      spell: Array.from({ length: 16 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/Spell/Bringer-of-Death_Spell_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
      hurt: Array.from({ length: 3 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/Hurt/Bringer-of-Death_Hurt_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
      death: Array.from({ length: 10 }, (_, index) =>
        createImageAsset(`./reference_assets/boss/bringer_of_death/extracted/Bringer-Of-Death/Individual Sprite/Death/Bringer-of-Death_Death_${index + 1}.png`, {
          autoColorKeyFromCorner: true,
        }),
      ),
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
    gunIdleBody: buildStripFrames(4, 48, 48, 24, 43),
    gunAttackBody: buildStripFrames(6, 48, 48, 24, 45),
    gunMoveBody: buildStripFrames(8, 48, 48, 24, 43),
    gunGuardBody: buildStripFrames(4, 48, 48, 24, 43),
    gunHurtBody: buildStripFrames(4, 48, 48, 24, 43),
    gunSwitchBody: buildStripFrames(4, 48, 48, 24, 43),
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
    const sx = index * frameWidth;
    ctx.save();
    ctx.globalAlpha *= options.alpha ?? 1;
    ctx.translate(effect.x, effect.y);
    if (options.rotation) ctx.rotate(options.rotation);
    ctx.imageSmoothingEnabled = false;
    const dx = -(options.anchorX ?? frameWidth * 0.5) * scale + (options.offsetX || 0);
    const dy = -(options.anchorY ?? frameHeight * 0.5) * scale + (options.offsetY || 0);
    if (options.tintColor) {
      const tintCanvas = document.createElement("canvas");
      tintCanvas.width = frameWidth;
      tintCanvas.height = frameHeight;
      const tintCtx = tintCanvas.getContext("2d");
      tintCtx.imageSmoothingEnabled = false;
      tintCtx.clearRect(0, 0, frameWidth, frameHeight);
      tintCtx.drawImage(asset.image, sx, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
      tintCtx.globalCompositeOperation = "source-atop";
      tintCtx.globalAlpha = options.tintStrength ?? 0.82;
      tintCtx.fillStyle = options.tintColor;
      tintCtx.fillRect(0, 0, frameWidth, frameHeight);
      tintCtx.globalCompositeOperation = "screen";
      tintCtx.globalAlpha = options.highlightStrength ?? 0.34;
      tintCtx.drawImage(asset.image, sx, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
      tintCtx.globalCompositeOperation = "source-over";
      tintCtx.globalAlpha = 1;
      ctx.drawImage(tintCanvas, dx, dy, frameWidth * scale, frameHeight * scale);
    } else {
      ctx.drawImage(asset.image, sx, 0, frameWidth, frameHeight, dx, dy, frameWidth * scale, frameHeight * scale);
    }
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

  function getEnemyActionFacingSign(enemy) {
    return enemy.facingSign;
  }

  function isPointInEnemyHitbox(enemy, x, y, radius = 0) {
    const hitbox = getEnemyHitbox(enemy);
    const normalizedX = (x - hitbox.x) / Math.max(1, hitbox.radiusX + radius);
    const normalizedY = (y - hitbox.y) / Math.max(1, hitbox.radiusY + radius);
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  function getRangedEnemyMuzzle(enemy) {
    const settings = getEnemySettings(enemy);
    const actionFacingSign = getEnemyActionFacingSign(enemy);
    return {
      x: enemy.x + actionFacingSign * (settings.muzzleOffsetX ?? 26),
      y: enemy.y - (settings.muzzleOffsetY ?? 74),
    };
  }

  function getTutorialMovementLayout() {
    return state.tutorialFlow.stageSegments.movement_tutorial?.layout || null;
  }

  function getSupportSurfaces() {
    if (state.playMode === "tutorial" && state.tutorialFlow.stage === "movement_tutorial") {
      const layout = getTutorialMovementLayout();
      if (layout?.surfaces?.length) {
        return layout.surfaces;
      }
    }
    return [{ id: "ground", x: world.left, y: world.groundY, w: world.right - world.left }].concat(stagePlatforms);
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
    return 10;
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

  function getGunHandPivot(player, stateName) {
    const facingSign = player.facingSign || 1;
    const baseX =
      stateName === "attack"
        ? 7
        : stateName === "guard_startup" || stateName === "guard_active" || stateName === "block_success" || stateName === "perfect_guard"
          ? 6
          : 7;
    const baseY =
      stateName === "attack"
        ? -25
        : stateName === "hurt" || player.feedbackTimer > 0
          ? -24
          : -26;
    return { x: baseX * facingSign, y: baseY };
  }

  function getPlayerSpritePose(player) {
    const weapon = player.currentWeapon;
    const stateName = player.state;
    const moveTimer = state.time + player.stateTimer * 0.35;
    const gunAimPose = weapon === "gun" ? getGunAimPoseAdjust(player, stateName === "attack" ? 1.1 : stateName === "guard_active" ? 0.8 : 1) : null;
    const gunHandPivot = weapon === "gun" ? getGunHandPivot(player, stateName) : null;
    if (stateName === "dead") {
      const progress = clamp(player.stateTimer / config.player.deathDuration, 0, 1);
      return {
        asset: spriteAssets.playerSheet,
        frame: getProgressFrame(greenBanditSheetRows.death, progress),
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
        flipX: player.facingSign < 0,
      };
    }
    if (stateName === "hurt" || player.feedbackTimer > 0) {
      return {
        asset: weapon === "gun" ? sideviewAddonAssets.gunHurtBody : null,
        frame: weapon === "gun" ? getProgressFrame(sideviewAddonFrames.gunHurtBody, player.stateTimer / 0.2) : getProgressFrame(greenBanditSheetRows.hurt, player.stateTimer / 0.2),
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
      };
    }
    if (stateName === "attack" || stateName === "counter_attack" || stateName === "space_counter") {
      const attack = player.activeAttack || { total: 0.3 };
      if (weapon === "gun") {
        return {
          asset: sideviewAddonAssets.gunAttackBody,
          frame: getProgressFrame(sideviewAddonFrames.gunAttackBody, player.stateTimer / attack.total),
          scale: 2.2,
          offsetY: getPlayerGroundOffset("gun"),
        };
      }
      return getSwordAttackPose(player, attack);
    }
    if (stateName === "weapon_switch") {
      return {
        asset: weapon === "gun" ? sideviewAddonAssets.gunSwitchBody : null,
        frame: weapon === "gun" ? getProgressFrame(sideviewAddonFrames.gunSwitchBody, player.stateTimer / 0.18) : getProgressFrame(greenBanditSheetRows.switchPose, player.stateTimer / 0.18),
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
          ? getProgressFrame(sideviewAddonFrames.gunGuardBody, player.stateTimer / config.player.guardStartup)
          : stateName === "block_success" || stateName === "perfect_guard"
            ? sideviewAddonFrames.gunGuardBody[3]
            : sideviewAddonFrames.gunGuardBody[2];
      return {
        asset: weapon === "gun" ? sideviewAddonAssets.gunGuardBody : null,
        frame: weapon === "gun" ? gunGuardFrame : swordGuardFrame,
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
      };
    }
    if (!player.onGround) {
      return {
        asset: weapon === "gun" ? sideviewAddonAssets.gunMoveBody : null,
        frame:
          weapon === "gun"
            ? sideviewAddonFrames.gunMoveBody[player.vy < 0 ? 2 : 5]
            : greenBanditSheetRows.run[player.vy < 0 ? 2 : 5],
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
      };
    }
    if (stateName === "move") {
      return {
        asset: weapon === "gun" ? sideviewAddonAssets.gunMoveBody : null,
        frame: weapon === "gun" ? getLoopFrame(sideviewAddonFrames.gunMoveBody, moveTimer, 12) : getLoopFrame(greenBanditSheetRows.run, moveTimer, 12),
        scale: 2.2,
        offsetY: getPlayerGroundOffset(weapon),
      };
    }
    return {
      asset: weapon === "gun" ? sideviewAddonAssets.gunIdleBody : null,
      frame: weapon === "gun" ? getLoopFrame(sideviewAddonFrames.gunIdleBody, state.time * 0.75, 6) : swordSideIdleFrame,
      scale: 2.2,
      offsetY: getPlayerGroundOffset(weapon),
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
      tutorialPendingFollowUp: null,
      feedbackTimer: 0,
      hurtDirection: 1,
      hazardDamageCooldownTimer: 0,
      deathRotationDir: 1,
    };
  }

  function getTutorialStageSegment(stage = state.tutorialFlow.stage) {
    return state.tutorialFlow.stageSegments[stage] || null;
  }

  function getTutorialStageSpawn(stage = state.tutorialFlow.stage) {
    const segment = getTutorialStageSegment(stage);
    if (!segment) return { x: WIDTH * 0.28, y: world.groundY };
    if (stage === "movement_tutorial") return segment.anchors.spawn;
    if (stage === "melee_tutorial" || stage === "ranged_tutorial" || stage === "mixed_exam" || stage === "mini_boss") {
      return { x: segment.startX + 36, y: world.groundY };
    }
    return { x: WIDTH * 0.28, y: world.groundY };
  }

  function getStageEncounterMode(stage = state.tutorialFlow.stage) {
    if (stage === "movement_tutorial") return "idle";
    if (stage === "melee_tutorial") return "melee";
    if (stage === "ranged_tutorial") return "ranged";
    if (stage === "mixed_exam") return "mixed";
    if (stage === "mini_boss") return "boss";
    return "idle";
  }

  function getTutorialEncounterOverride(stage = state.tutorialFlow.stage) {
    const segment = getTutorialStageSegment(stage);
    if (!segment) return null;
    if (stage === "movement_tutorial") {
      return { explicitLayout: [], autoRespawn: false, maxWaves: 0 };
    }
    if (stage === "melee_tutorial") {
      return {
        explicitLayout: [{ type: "melee", x: segment.anchors.enemySpawn.x, y: segment.anchors.enemySpawn.y }],
        autoRespawn: true,
        maxWaves: 99,
        respawnDelay: 0.6,
        maxMeleeAttackers: 1,
        maxRangedAttackers: 0,
      };
    }
    if (stage === "ranged_tutorial") {
      return {
        explicitLayout: [{ type: "ranged", x: segment.anchors.enemySpawn.x, y: segment.anchors.enemySpawn.y }],
        autoRespawn: true,
        maxWaves: 99,
        respawnDelay: 0.6,
        maxMeleeAttackers: 0,
        maxRangedAttackers: 1,
      };
    }
    if (stage === "mixed_exam") {
      return {
        explicitLayout: [
          { type: "melee", x: segment.anchors.meleeFront.x, y: segment.anchors.meleeFront.y },
          { type: "melee", x: segment.anchors.meleeBack.x, y: segment.anchors.meleeBack.y },
          { type: "ranged", x: segment.anchors.ranged.x, y: segment.anchors.ranged.y },
        ],
        autoRespawn: true,
        maxWaves: 2,
        respawnDelay: 0.8,
        maxMeleeAttackers: 2,
        maxRangedAttackers: 1,
      };
    }
    if (stage === "mini_boss") {
      return {
        explicitLayout: [{ type: "boss", x: segment.anchors.bossSpawn.x, y: segment.anchors.bossSpawn.y }],
        autoRespawn: false,
        maxWaves: 1,
        maxMeleeAttackers: 1,
        maxRangedAttackers: 1,
      };
    }
    return null;
  }

  function getStageDisplayName(stage = state.tutorialFlow.stage) {
    if (stage === "movement_tutorial") return "第 1 关";
    if (stage === "melee_tutorial") return "第 2 关";
    if (stage === "ranged_tutorial") return "第 3 关";
    if (stage === "mixed_exam") return "第 4 关";
    if (stage === "mini_boss") return "第 5 关";
    return "教程完成";
  }

  function getTutorialDoorAnchor(stage = state.tutorialFlow.stage) {
    const segment = getTutorialStageSegment(stage);
    if (!segment) return null;
    const surfaceY =
      stage === "movement_tutorial"
        ? getTutorialMovementLayout()?.surfaces?.at(-1)?.y ?? world.groundY
        : world.groundY;
    return { x: world.right - 34, y: surfaceY };
  }

  function canEnterTutorialDoor(stage = state.tutorialFlow.stage) {
    return state.playMode === "tutorial" && !state.tutorialTransition.active && state.tutorialFlow.stage === stage && state.tutorialFlow.stageStatus === "cleared";
  }

  function getStageIntroText(stage = state.tutorialFlow.stage) {
    if (stage === "movement_tutorial") return "第 1 关";
    if (stage === "melee_tutorial") return "第 2 关";
    if (stage === "ranged_tutorial") return "第 3 关";
    if (stage === "mixed_exam") return "第 4 关";
    if (stage === "mini_boss") return "第 5 关";
    return "教学完成";
  }

  function getStageTransitionText(stage) {
    if (stage === "done") return "教程完成";
    if (stage) return `进入${getStageDisplayName(stage)}`;
    return getStageIntroText(stage);
  }

  function placePlayerAtStageStart(stage = state.tutorialFlow.stage) {
    if (!state.player) return;
    const spawn = getTutorialStageSpawn(stage);
    state.player.x = spawn.x;
    state.player.y = spawn.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = spawn.y >= world.groundY;
    state.player.surfaceId = state.player.onGround ? "ground" : state.player.surfaceId;
    if (state.player.onGround) state.player.y = world.groundY;
  }

  function placePlayerAtStageChoicePoint(stage = state.tutorialFlow.stage) {
    if (!state.player) return;
    const segment = getTutorialStageSegment(stage);
    const anchor = segment?.anchors?.center || getTutorialStageSpawn(stage);
    state.player.x = anchor.x;
    state.player.y = anchor.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = anchor.y >= world.groundY;
    state.player.surfaceId = state.player.onGround ? "ground" : state.player.surfaceId;
    if (state.player.onGround) state.player.y = world.groundY;
  }

  function getTutorialExitThreshold(stage = state.tutorialFlow.stage) {
    const segment = getTutorialStageSegment(stage);
    if (!segment) return world.right - 24;
    return Math.min(world.right - 24, segment.endX + 24);
  }

  function getTutorialRepeatThreshold(stage = state.tutorialFlow.stage) {
    const segment = getTutorialStageSegment(stage);
    if (!segment) return world.left + 24;
    return Math.max(world.left + 24, segment.startX - 18);
  }

  function canRepeatClearedStage(stage = state.tutorialFlow.stage) {
    return stage === "melee_tutorial" || stage === "ranged_tutorial";
  }

  function clearTutorialChoiceInputs() {
    keys.clear();
    mouse.leftDown = false;
    mouse.rightDown = false;
    mouse.leftPressed = false;
    mouse.rightPressed = false;
    mouse.wheelDown = false;
    state.tutorialChoice.selectedIndex = 1;
  }

  function clearGameOverInputs() {
    keys.clear();
    mouse.leftDown = false;
    mouse.rightDown = false;
    mouse.leftPressed = false;
    mouse.rightPressed = false;
    mouse.wheelDown = false;
    state.gameOverMenu.selectedIndex = 0;
  }

  function resetTutorialStageFlags(stage = state.tutorialFlow.stage) {
    const flags = state.tutorialFlow.flags;
    if (!flags) return;
    if (stage === "movement_tutorial") {
      flags.moveDone = false;
      flags.jumpDone = false;
      flags.dashDone = false;
      flags.switchDone = false;
      return;
    }
    if (stage === "melee_tutorial") {
      flags.meleeParryDone = false;
      flags.meleeFollowUpDone = false;
      flags.meleeSwordParryDone = false;
      flags.meleeGunParryDone = false;
      flags.meleeSwordFollowUpDone = false;
      flags.meleeGunFollowUpDone = false;
      return;
    }
    if (stage === "ranged_tutorial") {
      flags.rangedParryDone = false;
      flags.rangedFollowUpDone = false;
      flags.rangedSwordParryDone = false;
      flags.rangedGunParryDone = false;
      flags.rangedSwordFollowUpDone = false;
      flags.rangedGunFollowUpDone = false;
      return;
    }
    if (stage === "mixed_exam") {
      flags.mixedMeleeFollowUpDone = false;
      flags.mixedRangedFollowUpDone = false;
      return;
    }
    if (stage === "mini_boss") {
      flags.miniBossStarted = false;
      flags.miniBossDefeated = false;
    }
  }

  function beginTutorialStage(stage, status = "intro") {
    beginTutorialStageInternal(stage, status, {});
  }

  function beginTutorialStageInternal(stage, status = "intro", options = {}) {
    const { resetPlayer = false, clearTransient = false } = options;
    window.TutorialFlow.setTutorialStage(state.tutorialFlow, stage, status);
    state.tutorialTransition.active = false;
    state.tutorialTransition.nextStage = null;
    clearTutorialChoiceInputs();
    if (clearTransient) {
      state.projectiles = [];
      state.effects = [];
      state.counterPromptTimer = 0;
      clearCounterPrompt();
    }
    if (resetPlayer || !state.player || state.player.hp <= 0 || state.player.state === "dead") {
      state.player = createPlayer();
    }
    state.encounterMode = getStageEncounterMode(stage);
    state.encounterOverride = getTutorialEncounterOverride(stage);
    if (stage === "mini_boss") {
      window.TutorialFlow.markTutorialFlag(state.tutorialFlow, "miniBossStarted", true);
    }
    placePlayerAtStageStart(stage);
    resetEncounterFlow(state.encounterMode);
    state.infoText = getStageIntroText(stage);
    state.infoTextTimer = 0.9;
  }

  function startTutorialTransition(nextStage) {
    state.tutorialTransition.active = true;
    state.tutorialTransition.nextStage = nextStage;
    state.tutorialTransition.timer = state.tutorialTransition.duration;
    state.tutorialTransition.label = getStageTransitionText(nextStage);
    state.infoText = nextStage === "done" ? "教学完成" : `${getStageIntroText(state.tutorialFlow.stage)} 完成`;
    state.infoTextTimer = 0.75;
  }

  function restartTutorialStage(stage = state.tutorialFlow.stage) {
    resetTutorialStageFlags(stage);
    state.tutorialTransition.active = true;
    state.tutorialTransition.nextStage = stage;
    state.tutorialTransition.timer = state.tutorialTransition.duration;
    state.tutorialTransition.label = `重新开始${getStageDisplayName(stage)}`;
    state.infoText = "重新练习本关";
    state.infoTextTimer = 0.75;
  }

  function showGameOverMenu(reason = "战斗失败") {
    state.gameOverMenu.active = true;
    state.gameOverMenu.reason = reason;
    state.gameOverMenu.selectedIndex = 0;
    clearGameOverInputs();
    state.infoText = "战斗失败";
    state.infoTextTimer = 0.9;
  }

  function hideGameOverMenu() {
    state.gameOverMenu.active = false;
    state.gameOverMenu.reason = "";
    state.gameOverMenu.selectedIndex = 0;
  }

  function restartCurrentRun() {
    hideGameOverMenu();
    if (state.playMode === "tutorial") {
      resetTutorialStageFlags(state.tutorialFlow.stage);
      beginTutorialStageInternal(state.tutorialFlow.stage, "intro", { resetPlayer: true, clearTransient: true });
    } else {
      resetGame({ playMode: state.playMode });
    }
  }

  function updateTutorialTransition(dt) {
    if (!state.tutorialTransition.active) return false;
    state.tutorialTransition.timer = Math.max(0, state.tutorialTransition.timer - dt);
    if (state.tutorialTransition.timer > 0) return true;
    const nextStage = state.tutorialTransition.nextStage;
    state.tutorialTransition.active = false;
    state.tutorialTransition.nextStage = null;
    if (nextStage === "done") {
      state.encounterMode = "idle";
      state.encounterOverride = { explicitLayout: [], autoRespawn: false, maxWaves: 0 };
      resetEncounterFlow("idle");
      state.infoText = "教学完成";
      state.infoTextTimer = 1.2;
      window.TutorialFlow.setTutorialStage(state.tutorialFlow, "done", "cleared");
      return false;
    }
    beginTutorialStage(nextStage, "intro");
    return false;
  }

  function getNextTutorialStage(stage = state.tutorialFlow.stage) {
    const stageOrder = window.TutorialFlow.STAGE_ORDER;
    const index = stageOrder.indexOf(stage);
    if (index < 0 || index >= stageOrder.length - 1) return stage;
    return stageOrder[index + 1];
  }

  function getPreviousTutorialStage(stage = state.tutorialFlow.stage) {
    const stageOrder = window.TutorialFlow.STAGE_ORDER;
    const index = stageOrder.indexOf(stage);
    if (index <= 0) return null;
    return stageOrder[index - 1];
  }

  function isTutorialChoiceMenuActive() {
    return false;
  }

  function isGameOverMenuActive() {
    return state.gameOverMenu.active;
  }

  function getGameOverMenu() {
    if (!isGameOverMenuActive()) return null;
    const panelWidth = 364;
    const panelHeight = 154;
    const panelX = WIDTH * 0.5 - panelWidth * 0.5;
    const panelY = HEIGHT * 0.5 - panelHeight * 0.5;
    const buttonWidth = 132;
    const buttonHeight = 48;
    const gap = 18;
    const buttonY = panelY + 88;
    const buttonStartX = WIDTH * 0.5 - (buttonWidth * 2 + gap) * 0.5;
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      title: "战斗失败",
      subtitle: state.gameOverMenu.reason || "玩家倒下，选择接下来的操作",
      buttons: [
        {
          id: "replay",
          label: state.playMode === "tutorial" ? "重玩本关" : "重新开始",
          action: "replay",
          x: buttonStartX,
          y: buttonY,
          w: buttonWidth,
          h: buttonHeight,
        },
        {
          id: "reset",
          label: state.playMode === "tutorial" ? "回到第一关" : "重置场景",
          action: "reset",
          x: buttonStartX + buttonWidth + gap,
          y: buttonY,
          w: buttonWidth,
          h: buttonHeight,
        },
      ],
    };
  }

  function getSelectedGameOverButton(menu = getGameOverMenu()) {
    if (!menu) return null;
    const index = clamp(state.gameOverMenu.selectedIndex ?? 0, 0, menu.buttons.length - 1);
    return menu.buttons[index] || null;
  }

  function chooseGameOverAction(action) {
    if (action === "replay") {
      restartCurrentRun();
      return true;
    }
    if (action === "reset") {
      hideGameOverMenu();
      if (state.playMode === "tutorial") {
        window.TutorialFlow.resetTutorialFlow(state.tutorialFlow);
        beginTutorialStage("movement_tutorial", "intro");
      } else {
        resetGame({ playMode: state.playMode });
      }
      return true;
    }
    return false;
  }

  function handleGameOverMenuInput() {
    const menu = getGameOverMenu();
    if (!menu) return false;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) {
      state.gameOverMenu.selectedIndex = 0;
      keys.delete("ArrowLeft");
      keys.delete("KeyA");
      return true;
    }
    if (keys.has("ArrowRight") || keys.has("KeyD")) {
      state.gameOverMenu.selectedIndex = 1;
      keys.delete("ArrowRight");
      keys.delete("KeyD");
      return true;
    }
    if (keys.has("Digit1")) {
      keys.delete("Digit1");
      return chooseGameOverAction("replay");
    }
    if (keys.has("Digit2")) {
      keys.delete("Digit2");
      return chooseGameOverAction("reset");
    }
    if (keys.has("Enter") || keys.has("Space")) {
      const selected = getSelectedGameOverButton(menu);
      keys.delete("Enter");
      keys.delete("Space");
      return selected ? chooseGameOverAction(selected.action) : false;
    }
    return false;
  }

  function handleGameOverMenuClick(x, y) {
    const menu = getGameOverMenu();
    if (!menu) return false;
    for (const button of menu.buttons) {
      const withinX = x >= button.x && x <= button.x + button.w;
      const withinY = y >= button.y && y <= button.y + button.h;
      if (withinX && withinY) return chooseGameOverAction(button.action);
    }
    return true;
  }

  function getTutorialChoiceMenu() {
    if (!isTutorialChoiceMenuActive()) return null;
    const stage = state.tutorialFlow.stage;
    const previousStage = getPreviousTutorialStage(stage);
    const nextStage = getNextTutorialStage(stage);
    const panelWidth = 418;
    const panelHeight = 164;
    const panelX = WIDTH * 0.5 - panelWidth * 0.5;
    const panelY = HEIGHT * 0.5 - panelHeight * 0.5;
    const buttonWidth = 114;
    const buttonHeight = 48;
    const gap = 18;
    const buttonY = panelY + 92;
    const buttonStartX = WIDTH * 0.5 - (buttonWidth * 3 + gap * 2) * 0.5;
    const buttons = [
      {
        id: "previous",
        label: "上一关",
        action: "previous",
        enabled: Boolean(previousStage),
        targetStage: previousStage,
        x: buttonStartX,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight,
      },
      {
        id: "replay",
        label: "重玩本关",
        action: "replay",
        enabled: true,
        targetStage: stage,
        x: buttonStartX + buttonWidth + gap,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight,
      },
      {
        id: "next",
        label: nextStage === "done" ? "完成教程" : "下一关",
        action: "next",
        enabled: Boolean(nextStage),
        targetStage: nextStage,
        x: buttonStartX + (buttonWidth + gap) * 2,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight,
      },
    ];
    return {
      stage,
      title: `${getStageDisplayName(stage)} 已完成`,
      subtitle: "选择上一关、下一关，或直接重玩本关",
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      buttons,
    };
  }

  function getSelectedTutorialChoiceButton(menu = getTutorialChoiceMenu()) {
    if (!menu) return null;
    const buttons = menu.buttons;
    const selectedIndex = clamp(state.tutorialChoice.selectedIndex ?? 1, 0, buttons.length - 1);
    const selected = buttons[selectedIndex];
    if (selected?.enabled) return selected;
    return buttons.find((button) => button.enabled) || null;
  }

  function moveTutorialChoiceSelection(direction) {
    const menu = getTutorialChoiceMenu();
    if (!menu) return false;
    const buttons = menu.buttons;
    let nextIndex = clamp(state.tutorialChoice.selectedIndex ?? 1, 0, buttons.length - 1);
    while (true) {
      const candidate = nextIndex + direction;
      if (candidate < 0 || candidate >= buttons.length) break;
      nextIndex = candidate;
      if (buttons[nextIndex].enabled) {
        state.tutorialChoice.selectedIndex = nextIndex;
        return true;
      }
    }
    return false;
  }

  function setTutorialChoiceSelection(index) {
    const menu = getTutorialChoiceMenu();
    if (!menu) return false;
    const candidate = menu.buttons[index];
    if (!candidate || !candidate.enabled) return false;
    state.tutorialChoice.selectedIndex = index;
    return true;
  }

  function handleTutorialChoiceInput() {
    if (!isTutorialChoiceMenuActive()) return false;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) {
      moveTutorialChoiceSelection(-1);
      keys.delete("ArrowLeft");
      keys.delete("KeyA");
      return true;
    }
    if (keys.has("ArrowRight") || keys.has("KeyD")) {
      moveTutorialChoiceSelection(1);
      keys.delete("ArrowRight");
      keys.delete("KeyD");
      return true;
    }
    if (keys.has("Digit1")) {
      setTutorialChoiceSelection(0);
      chooseTutorialStage("previous");
      keys.delete("Digit1");
      return true;
    }
    if (keys.has("Digit2")) {
      setTutorialChoiceSelection(1);
      chooseTutorialStage("replay");
      keys.delete("Digit2");
      return true;
    }
    if (keys.has("Digit3")) {
      setTutorialChoiceSelection(2);
      chooseTutorialStage("next");
      keys.delete("Digit3");
      return true;
    }
    if (keys.has("Enter") || keys.has("Space")) {
      const selected = getSelectedTutorialChoiceButton();
      if (selected) chooseTutorialStage(selected.action);
      keys.delete("Enter");
      keys.delete("Space");
      return true;
    }
    return false;
  }

  function chooseTutorialStage(action) {
    const menu = getTutorialChoiceMenu();
    if (!menu) return false;
    const button = menu.buttons.find((item) => item.action === action && item.enabled);
    if (!button) return false;
    clearTutorialChoiceInputs();
    if (button.action === "replay") {
      restartTutorialStage(button.targetStage);
      return true;
    }
    if (!button.targetStage) return false;
    if (button.targetStage !== "done") resetTutorialStageFlags(button.targetStage);
    startTutorialTransition(button.targetStage);
    return true;
  }

  function handleTutorialChoiceClick(x, y) {
    const menu = getTutorialChoiceMenu();
    if (!menu) return false;
    for (const button of menu.buttons) {
      if (!button.enabled) continue;
      const withinX = x >= button.x && x <= button.x + button.w;
      const withinY = y >= button.y && y <= button.y + button.h;
      if (withinX && withinY) {
        return chooseTutorialStage(button.action);
      }
    }
    return true;
  }

  function triggerGmStageAction(action) {
    if (state.mode !== "running" || state.playMode !== "tutorial") {
      resetGame({ playMode: "tutorial" });
    }
    const stage = state.tutorialFlow.stage;
    if (action === "replay") {
      restartTutorialStage(stage);
      return true;
    }
    const targetStage = action === "previous" ? getPreviousTutorialStage(stage) : action === "next" ? getNextTutorialStage(stage) : null;
    if (!targetStage) return false;
    if (targetStage !== "done") resetTutorialStageFlags(targetStage);
    startTutorialTransition(targetStage);
    return true;
  }

  function updateGmButtons() {
    if (!gmPrevBtn || !gmReplayBtn || !gmNextBtn) return;
    const gmReady = state.mode === "running" && state.playMode === "tutorial" && !state.tutorialTransition.active;
    const previousStage = getPreviousTutorialStage(state.tutorialFlow.stage);
    const nextStage = getNextTutorialStage(state.tutorialFlow.stage);
    gmPrevBtn.disabled = !gmReady || !previousStage;
    gmReplayBtn.disabled = !gmReady || state.tutorialFlow.stage === "done";
    gmNextBtn.disabled = !gmReady || !nextStage;
  }

  function advanceTutorialStage() {
    const nextStage = getNextTutorialStage(state.tutorialFlow.stage);
    startTutorialTransition(nextStage);
  }

  function markTutorialAction(flag) {
    if (state.playMode !== "tutorial") return;
    window.TutorialFlow.markTutorialFlag(state.tutorialFlow, flag, true);
  }

  function queueTutorialFollowUpResolution(player, parryType) {
    if (state.playMode !== "tutorial") return;
    player.tutorialPendingFollowUp = {
      stage: state.tutorialFlow.stage,
      parryType,
      weapon: player.currentWeapon,
    };
  }

  function finalizeTutorialFollowUp(player) {
    const pending = player.tutorialPendingFollowUp;
    if (!pending) return;
    player.tutorialPendingFollowUp = null;
    if (pending.stage === "melee_tutorial" && pending.parryType === "melee") {
      if (pending.weapon === "sword") markTutorialAction("meleeSwordFollowUpDone");
      if (pending.weapon === "gun") markTutorialAction("meleeGunFollowUpDone");
      markTutorialAction("meleeFollowUpDone");
      return;
    }
    if (pending.stage === "ranged_tutorial" && pending.parryType === "ranged") {
      if (pending.weapon === "sword") markTutorialAction("rangedSwordFollowUpDone");
      if (pending.weapon === "gun") markTutorialAction("rangedGunFollowUpDone");
      markTutorialAction("rangedFollowUpDone");
      return;
    }
    if (pending.stage === "mixed_exam") {
      if (pending.parryType === "melee") markTutorialAction("mixedMeleeFollowUpDone");
      if (pending.parryType === "ranged") markTutorialAction("mixedRangedFollowUpDone");
    }
  }

  function trackMovementTutorialProgress(player, axis) {
    if (state.playMode !== "tutorial" || state.tutorialFlow.stage !== "movement_tutorial") return;
    const flags = state.tutorialFlow.flags;
    const segment = getTutorialStageSegment("movement_tutorial");
    const layout = getTutorialMovementLayout();
    if (!flags.moveDone && axis.magnitude > 0 && player.x >= segment.anchors.moveGate.x) {
      markTutorialAction("moveDone");
      return;
    }
    if (!flags.jumpDone && flags.moveDone && player.x >= segment.anchors.jumpLand.x && player.y <= layout.surfaces[1].y + 6) {
      markTutorialAction("jumpDone");
      return;
    }
    if (!flags.dashDone && flags.jumpDone && player.state === "dash" && player.x >= segment.anchors.dashLand.x) {
      markTutorialAction("dashDone");
    }
  }

  function resolveMovementTutorialObstacles(player, prevX) {
    if (state.playMode !== "tutorial" || state.tutorialFlow.stage !== "movement_tutorial") return;
    const layout = getTutorialMovementLayout();
    if (!layout?.solidBlocks?.length && !layout?.guideWall) return;
    const bodyTop = player.y - 72;
    const bodyBottom = player.y + 2;
    for (const block of layout.solidBlocks) {
      const overlapsY = bodyBottom >= block.y && bodyTop <= block.y + block.h;
      if (!overlapsY) continue;
      const movingRightIntoBlock = prevX + player.radius <= block.x && player.x + player.radius > block.x;
      const movingLeftIntoBlock = prevX - player.radius >= block.x + block.w && player.x - player.radius < block.x + block.w;
      if (movingRightIntoBlock) {
        player.x = block.x - player.radius - 1;
        player.vx = Math.min(player.vx, 0);
      } else if (movingLeftIntoBlock) {
        player.x = block.x + block.w + player.radius + 1;
        player.vx = Math.max(player.vx, 0);
      }
    }
    if (layout.guideWall) {
      const wall = layout.guideWall;
      const overlapsY = bodyBottom >= wall.y && bodyTop <= wall.y + wall.h;
      if (overlapsY) {
        const movingRightIntoWall = prevX + player.radius <= wall.x && player.x + player.radius > wall.x;
        const movingLeftIntoWall = prevX - player.radius >= wall.x + wall.w && player.x - player.radius < wall.x + wall.w;
        if (movingRightIntoWall) {
          player.x = wall.x - player.radius - 1;
          player.vx = Math.min(player.vx, 0);
        } else if (movingLeftIntoWall) {
          player.x = wall.x + wall.w + player.radius + 1;
          player.vx = Math.max(player.vx, 0);
        }
      }
    }
  }

  function resolveMovementTutorialHazards(player) {
    if (state.playMode !== "tutorial" || state.tutorialFlow.stage !== "movement_tutorial") return;
    const pit = getTutorialMovementLayout()?.spikePit;
    if (!pit) return;
    const bodyLeft = player.x - player.radius + 4;
    const bodyRight = player.x + player.radius - 4;
    const bodyBottom = player.y + 2;
    const overlapsX = bodyRight >= pit.x && bodyLeft <= pit.x + pit.w;
    const overlapsY = bodyBottom >= pit.y - 2;
    if (!overlapsX || !overlapsY) return;
    if (player.hazardDamageCooldownTimer > 0) return;
    player.hazardDamageCooldownTimer = 0.4;
    player.hp = Math.max(0, player.hp - 14);
    player.hurtDirection = player.x >= pit.x + pit.w * 0.5 ? 1 : -1;
    player.deathRotationDir = player.hurtDirection || 1;
    beginState("hurt");
    player.feedbackTimer = 0.18;
    player.vx = player.hurtDirection * 120;
    player.vy = -180;
    state.hitstopTimer = Math.max(state.hitstopTimer, 2 / 60);
    state.infoText = "尖刺伤害";
    state.infoTextTimer = 0.3;
    pushEffect(player.x, pit.y + 2, "#ff9173", "player_hit", {
      angle: player.hurtDirection > 0 ? 0 : Math.PI,
      timer: 0.18,
      total: 0.18,
    });
  }

  function canMarkMovementSwitchTutorial(player) {
    if (state.playMode !== "tutorial" || state.tutorialFlow.stage !== "movement_tutorial") return true;
    const switchZoneX = getTutorialStageSegment("movement_tutorial").anchors.switchZone.x;
    return state.tutorialFlow.flags.dashDone && player.y <= getTutorialMovementLayout().surfaces[2].y + 4 && player.x >= switchZoneX - 14;
  }

  function isCurrentTutorialStageComplete() {
    const flags = state.tutorialFlow.flags;
    const stage = state.tutorialFlow.stage;
    if (stage === "movement_tutorial") return flags.moveDone && flags.jumpDone && flags.dashDone && flags.switchDone;
    if (stage === "melee_tutorial") return flags.meleeSwordFollowUpDone && flags.meleeGunFollowUpDone;
    if (stage === "ranged_tutorial") return flags.rangedSwordFollowUpDone && flags.rangedGunFollowUpDone;
    if (stage === "mixed_exam") {
      const livingEnemies = state.enemies.filter((enemy) => isEnemyAlive(enemy)).length;
      return flags.mixedMeleeFollowUpDone && flags.mixedRangedFollowUpDone && livingEnemies <= 0;
    }
    if (stage === "mini_boss") return flags.miniBossDefeated;
    return false;
  }

  function getTutorialHint() {
    if (state.playMode !== "tutorial") return null;
    const flags = state.tutorialFlow.flags;
    const stage = state.tutorialFlow.stage;
    if (state.tutorialFlow.stageStatus === "cleared") return "门已开启，走进右侧发光门进入下一关";
    if (stage === "movement_tutorial") {
      if (!flags.moveDone) return "按 A / D 向右移动";
      if (!flags.jumpDone) return "按 Space 跳到前方平台";
      if (!flags.dashDone) return "按 Shift 冲刺越过尖刺坑";
      if (!flags.switchDone) return "在右侧平台上按 Q 切换武器";
      return "继续向右前进";
    }
    if (stage === "melee_tutorial") {
      if (!flags.meleeSwordFollowUpDone) return "先用刀完成近战派生";
      if (!flags.meleeGunFollowUpDone) return "切枪后完成近战派生";
      return "本关已完成，选择下一步";
    }
    if (stage === "ranged_tutorial") {
      if (!flags.rangedSwordFollowUpDone) return "先用刀完成远程派生";
      if (!flags.rangedGunFollowUpDone) return "切枪后完成远程派生";
      return "本关已完成，选择下一步";
    }
    if (stage === "mixed_exam") {
      if (!flags.mixedMeleeFollowUpDone && !flags.mixedRangedFollowUpDone) return "分别完成近战与远程派生";
      if (!flags.mixedMeleeFollowUpDone) return "还差近战派生";
      if (!flags.mixedRangedFollowUpDone) return "还差远程派生";
      return "清掉剩余敌人并完成本关";
    }
    if (stage === "mini_boss") return "击败当前敌人并完成第 5 关";
    return "继续前进";
  }

  function updateTutorialFlow() {
    if (state.playMode !== "tutorial" || !state.player) return;
    if (state.tutorialFlow.stageStatus === "intro") {
      state.tutorialFlow.stageStatus = "active";
    }
    if (state.tutorialFlow.stageStatus === "active") {
      if (!isCurrentTutorialStageComplete()) return;
      state.tutorialFlow.stageStatus = "cleared";
      state.encounterMode = "idle";
      state.encounterOverride = { explicitLayout: [], autoRespawn: false, maxWaves: 0 };
      resetEncounterFlow("idle");
      state.player.vx = 0;
      state.player.vy = 0;
      clearTutorialChoiceInputs();
      state.infoText = `${getStageDisplayName(state.tutorialFlow.stage)} 完成，前往右侧门`;
      state.infoTextTimer = 0.9;
      return;
    }
    if (state.tutorialFlow.stageStatus !== "cleared") return;
    const door = getTutorialDoorAnchor(state.tutorialFlow.stage);
    if (!door) return;
    if (Math.abs(state.player.y - door.y) > 64) return;
    if (state.player.x < door.x - 18) return;
    startTutorialTransition(getNextTutorialStage(state.tutorialFlow.stage));
  }

  function createEnemy(type, x, y) {
    const settings = config.enemies[type];
    const tutorialStage = state.playMode === "tutorial" ? state.tutorialFlow.stage : null;
    const mixedFirstWave = tutorialStage === "mixed_exam" && (state.battleManager?.wave || 0) <= 1;
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
      state: type === "ranged" ? "aim" : type === "boss" ? "intro" : "approach",
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
      tutorialStage,
      tutorialWindupScale:
        tutorialStage === "melee_tutorial" && type === "melee"
          ? 1.35
          : tutorialStage === "ranged_tutorial" && type === "ranged"
            ? 1.3
            : mixedFirstWave
              ? type === "melee"
                ? 1.12
                : 1.15
            : 1,
      tutorialNoBlinkUntilFirstShot: tutorialStage === "ranged_tutorial" && type === "ranged",
      tutorialProjectileSpeedScale:
        tutorialStage === "ranged_tutorial" && type === "ranged"
          ? 0.74
          : mixedFirstWave && type === "ranged"
            ? 0.88
            : 1,
      tutorialShotReleased: false,
      deathDirectionKey: "S",
      deathFlipX: false,
      deathRotationDir: 1,
      bossPhase: 1,
      bossLastAttack: null,
      bossPatternCursor: 0,
      bossRecoverDuration: 0,
      bossMoveDirection: 0,
      bossTeleportTargetX: x,
      bossTeleportTargetY: y,
      teleportCooldownTimer: 0,
      removed: false,
    };
  }

  const encounterController = window.createEncounterController({
    state,
    config,
    enemySpawnPoints,
    encounterSpawnLayouts,
    createEnemy,
    isEnemyAlive,
  });

  function setDummyAttackMode(mode) {
    encounterController.setDummyAttackMode(mode, { render });
  }

  function resolveDummyAttackMode(mode) {
    return encounterController.resolveDummyAttackMode(mode);
  }

  function spawnEncounter(mode = state.encounterMode) {
    encounterController.spawnEncounter(mode);
  }

  function resetEncounterFlow(mode = state.encounterMode) {
    encounterController.resetEncounterFlow(mode);
  }

  function getEnemyById(id) {
    return state.enemies.find((enemy) => enemy.id === id) || null;
  }

  function getPrimaryEnemy(type = null) {
    const candidates = state.enemies.filter((enemy) => enemy.state !== "dead" && (!type || enemy.type === type));
    if (candidates.length <= 0) return null;
    return candidates.reduce((best, enemy) => (enemy.x < best.x ? enemy : best), candidates[0]);
  }

  function resetGame(options = {}) {
    const playMode = options.playMode || state.playMode || "arena";
    state.playMode = playMode;
    state.mode = "running";
    state.time = 0;
    state.flashTimer = 0;
    state.infoText = "训练开始";
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
    hideGameOverMenu();
    state.nextEnemyId = 1;
    state.tutorialTransition.active = false;
    state.tutorialTransition.nextStage = null;
    state.tutorialTransition.timer = 0;
    state.tutorialTransition.label = "";
    window.TutorialFlow.resetTutorialFlow(state.tutorialFlow);
    state.player = createPlayer();
    if (state.playMode === "tutorial") {
      beginTutorialStage(state.tutorialFlow.stage, "intro");
    } else {
      state.encounterOverride = null;
      resetEncounterFlow(state.encounterMode);
    }
  }

  function pushEffect(x, y, color, kind, extra = {}) {
    state.effects.push({ x, y, color, kind, timer: 0.2, total: 0.2, ...extra });
  }

  function spawnProjectile(x, y, angle, speed, damage, owner, reflected = false, extra = {}) {
    state.projectiles.push({ x, y, angle, speed, startSpeed: speed, damage, owner, radius: 6, ttl: 3, reflected, ignorePlayerTimer: 0, ...extra });
  }

  function getAimDir(player) {
    const chest = getPlayerChest(player);
    const horizontalOffset = Math.abs(mouse.x - chest.x);
    let aimX = (horizontalOffset < 24 ? 24 : horizontalOffset) * (player.facingSign || 1);
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
      state.infoText = counterAttack ? `${counterAttack.counterRole}：${counterAttack.counterTitle}` : player.lastParryType === "melee" ? "近战完美格挡" : "远程完美格挡";
      state.infoTextTimer = 0.58;
      state.flashTimer = 0.12;
    }
    if (next === "hurt") {
      player.feedbackTimer = 0.16;
      state.infoText = "受击";
      state.infoTextTimer = 0.25;
    }
    if (next === "dead") {
      player.vx = 0;
      player.vy = 0;
      player.invulnerable = true;
      state.infoText = "战斗失败";
      state.infoTextTimer = 0.5;
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
    state.infoText = "下落";
    state.infoTextTimer = 0.18;
  }

  function startGunShot() {
    const player = state.player;
    if (player.gunReloadTimer > 0 || player.gunReloadPending || player.gunAmmo <= 0) {
      state.infoText = "装填中";
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
    state.infoText = "装填中";
    state.infoTextTimer = 0.35;
    return true;
  }

  function startAttack(kind) {
    const player = state.player;
    if (kind === "space_counter") {
      const counterAttack = getSpaceCounterAttack(player);
      if (!counterAttack) return;
      queueTutorialFollowUpResolution(player, player.lastParryType === "ranged" ? "ranged" : "melee");
      beginState("space_counter");
      player.activeAttack = counterAttack;
      state.infoText = counterAttack.activationText || counterAttack.counterTitle || "反击";
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

  function getEnemyWindupDuration(enemy) {
    return getEnemySettings(enemy).windup * (enemy.tutorialWindupScale ?? 1);
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
    if (enemy.type === "boss") return true;
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
      if (enemy.type === "boss" && state.playMode === "tutorial") {
        window.TutorialFlow.markTutorialFlag(state.tutorialFlow, "miniBossDefeated", true);
        state.infoText = "小 Boss 已击败";
        state.infoTextTimer = 0.7;
      }
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
      if (canMarkMovementSwitchTutorial(player)) {
        markTutorialAction("switchDone");
      }
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
          if (state.tutorialFlow.stage !== "movement_tutorial" || state.tutorialFlow.flags.jumpDone) {
            markTutorialAction("dashDone");
          }
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
        if (state.tutorialFlow.stage !== "movement_tutorial" || state.tutorialFlow.flags.moveDone) {
          markTutorialAction("jumpDone");
        }
        player.vy = -world.jumpVelocity;
        player.onGround = false;
        player.surfaceId = null;
        state.infoText = "跳跃";
        state.infoTextTimer = 0.18;
      }
      keys.delete("Space");
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    const prevX = player.x;
    const axis = getMoveAxis();
    trackMovementTutorialProgress(player, axis);
    const aimDir = getAimDir(player);
    player.aimAngle = angleOf(aimDir);
    if (axis.magnitude > 0) {
      player.facingSign = axis.x >= 0 ? 1 : -1;
    }
    player.facing = player.facingSign > 0 ? 0 : Math.PI;
    player.stateTimer += dt;
    if (player.dashCooldownTimer > 0) player.dashCooldownTimer = Math.max(0, player.dashCooldownTimer - dt);
    if (player.comboContinueTimer > 0) player.comboContinueTimer = Math.max(0, player.comboContinueTimer - dt);
    if (player.feedbackTimer > 0) player.feedbackTimer = Math.max(0, player.feedbackTimer - dt);
    if (player.hazardDamageCooldownTimer > 0) player.hazardDamageCooldownTimer = Math.max(0, player.hazardDamageCooldownTimer - dt);
    if (player.dropThroughTimer > 0) {
      player.dropThroughTimer = Math.max(0, player.dropThroughTimer - dt);
      if (player.dropThroughTimer === 0) player.dropThroughSurfaceId = null;
    }
    if (player.gunReloadTimer > 0) {
      player.gunReloadTimer = Math.max(0, player.gunReloadTimer - dt);
      if (player.gunReloadTimer === 0) {
        player.gunAmmo = config.player.gunMaxAmmo;
        state.infoText = "弹药恢复";
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
        if (player.hp <= 0) {
          beginState("dead");
        } else if (player.stateTimer >= 0.16) beginState(axis.magnitude > 0 ? "move" : "idle");
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
          if (player.state === "space_counter") finalizeTutorialFollowUp(player);
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
        if (player.hp <= 0) {
          beginState("dead");
        } else if (player.stateTimer >= config.player.hurtDuration) beginState(axis.magnitude > 0 ? "move" : "idle");
        break;
      case "dead":
        player.vx = 0;
        if (player.stateTimer >= config.player.deathDuration && !isGameOverMenuActive()) {
          showGameOverMenu("玩家倒下，选择接下来的操作");
        }
        break;
      default:
        break;
    }

    applyGravity(player, dt, false);
    resolveMovementTutorialObstacles(player, prevX);
    resolveMovementTutorialHazards(player);
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
      state.infoText = "闪避无敌";
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
        if (state.playMode === "tutorial") {
          if (hitType === "melee") markTutorialAction("meleeParryDone");
          if (hitType === "ranged") markTutorialAction("rangedParryDone");
          if (hitType === "melee") {
            if (player.currentWeapon === "sword") markTutorialAction("meleeSwordParryDone");
            if (player.currentWeapon === "gun") markTutorialAction("meleeGunParryDone");
          }
          if (hitType === "ranged") {
            if (player.currentWeapon === "sword") markTutorialAction("rangedSwordParryDone");
            if (player.currentWeapon === "gun") markTutorialAction("rangedGunParryDone");
          }
        }
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
      state.infoText = "格挡";
      state.infoTextTimer = 0.25;
      return "block";
    }

    const rawDamage = projectile ? projectile.damage : attacker ? getEnemySettings(attacker).damage : hitType === "melee" ? 20 : 16;
    const hurtKnockback = hitType === "melee" ? config.player.hurtKnockbackMelee : config.player.hurtKnockbackRanged;
    const hurtHitstop = hitType === "melee" ? config.player.hurtHitstopMelee : config.player.hurtHitstopRanged;
    player.hp = Math.max(0, player.hp - rawDamage);
    player.hurtDirection = projectile ? (Math.cos(projectile.angle) >= 0 ? 1 : -1) : attacker ? (attacker.x >= player.x ? 1 : -1) : 1;
    player.deathRotationDir = player.hurtDirection || 1;
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
        if (enemy.stateTimer >= getEnemyWindupDuration(enemy)) {
          enemy.state = "attack_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
          enemy.tutorialWindupScale = 1;
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
        if (!enemy.tutorialNoBlinkUntilFirstShot && absDx < settings.pressureRange && enemy.blinkCooldownTimer <= 0 && enemy.noBlinkTimer <= 0) {
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
        if (!enemy.tutorialNoBlinkUntilFirstShot && absDx < settings.pressureRange && enemy.blinkCooldownTimer <= 0 && enemy.noBlinkTimer <= 0) {
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
        if (enemy.stateTimer >= getEnemyWindupDuration(enemy)) {
          enemy.state = "attack_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
          enemy.tutorialWindupScale = 1;
        }
        break;
      case "attack_active":
        enemy.vx = 0;
        if (!enemy.attackResolved) {
          enemy.attackResolved = true;
          enemy.tutorialShotReleased = true;
          enemy.tutorialNoBlinkUntilFirstShot = false;
          spawnProjectile(muzzle.x, muzzle.y, enemy.aimAngle, settings.projectileSpeed * (enemy.tutorialProjectileSpeedScale ?? 1), settings.damage, "enemy", false, {
            sourceEnemyId: enemy.id,
          });
          enemy.tutorialProjectileSpeedScale = 1;
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

  function getBossTeleportTarget(enemy, player, settings) {
    const side = player.x < WIDTH * 0.5 ? 1 : -1;
    const targetX = clamp(player.x + side * settings.teleportOffset, world.left + 48, world.right - 48);
    const support = getEntitySupport({ x: targetX, radius: enemy.radius, dropThroughTimer: 0, dropThroughSurfaceId: null }, player.y, 80);
    return { x: targetX, y: support?.y ?? world.groundY };
  }

  function canBossTeleport(enemy, absDx, settings, phase) {
    if (enemy.teleportCooldownTimer > 0) return false;
    if (absDx < settings.teleportMinRange || absDx > settings.teleportMaxRange) return false;
    if (enemy.bossLastAttack === "teleport" && phase === 1) return false;
    return true;
  }

  function chooseBossAction(enemy, absDx, settings, phase) {
    const teleportReady = canBossTeleport(enemy, absDx, settings, phase);
    if (teleportReady) {
      if (phase === 2 && absDx > settings.meleeRange + 10) return "teleport";
      if (enemy.bossLastAttack === "ranged" && absDx < settings.preferredRange + 32) return "teleport";
      if ((enemy.bossPatternCursor % 3) === 2) return "teleport";
    }
    if (absDx <= settings.meleeRange + 8) {
      if (enemy.bossLastAttack === "melee" && teleportReady) return "teleport";
      return "melee";
    }
    if (absDx >= settings.preferredRange - 8) {
      if (enemy.bossLastAttack === "ranged") return "pressure";
      return "ranged";
    }
    if (enemy.bossLastAttack === "ranged") return "pressure";
    if (enemy.bossLastAttack === "melee") return "retreat";
    if (teleportReady && phase === 2) return "teleport";
    return absDx > settings.meleeRange + 24 ? "pressure" : "melee";
  }

  function updateBossEnemy(enemy, dt) {
    const player = state.player;
    const settings = getEnemySettings(enemy);
    const actionFacingSign = getEnemyActionFacingSign(enemy);
    const phase = enemy.hp / settings.maxHp > settings.phaseTwoThreshold ? 1 : 2;
    const speedScale = phase === 2 ? settings.phaseTwoSpeedMultiplier : 1;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const absDx = Math.abs(dx);
    enemy.bossPhase = phase;
    enemy.facingSign = dx >= 0 ? 1 : -1;
    enemy.facing = enemy.facingSign > 0 ? 0 : Math.PI;
    enemy.aimAngle = angleOf(normalize(player.x - enemy.x, getPlayerChest(player).y - getEnemyChest(enemy).y));

    switch (enemy.state) {
      case "intro":
        enemy.vx = 0;
        if (enemy.stateTimer >= 0.6 * speedScale) {
          enemy.state = "evaluate";
          enemy.stateTimer = 0;
        }
        break;
      case "evaluate": {
        enemy.vx = 0;
        if (enemy.cooldownTimer > 0) break;
        const action = chooseBossAction(enemy, absDx, settings, phase);
        if (action === "pressure") {
          enemy.state = "pressure_step";
          enemy.stateTimer = 0;
          enemy.bossMoveDirection = dx >= 0 ? 1 : -1;
        } else if (action === "retreat") {
          enemy.state = "backstep_reset";
          enemy.stateTimer = 0;
          enemy.bossMoveDirection = dx >= 0 ? -1 : 1;
        } else if (action === "teleport") {
          const target = getBossTeleportTarget(enemy, player, settings);
          enemy.bossTeleportTargetX = target.x;
          enemy.bossTeleportTargetY = target.y;
          enemy.state = "teleport_out";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
          state.infoText = "Boss：折跃逼近";
          state.infoTextTimer = 0.32;
          pushEffect(enemy.x, enemy.y - 42, "#cfb3ff", "boss_teleport", {
            timer: 0.2,
            total: 0.2,
          });
        } else if (action === "melee") {
          enemy.state = "melee_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
          state.infoText = "Boss：近战重劈";
          state.infoTextTimer = 0.32;
        } else {
          enemy.state = "ranged_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
          state.infoText = "Boss：远程蓄力（可格挡）";
          state.infoTextTimer = 0.32;
        }
        break;
      }
      case "pressure_step":
        enemy.vx = enemy.bossMoveDirection * settings.moveSpeed;
        enemy.x += enemy.vx * dt;
        if (enemy.stateTimer >= settings.pressureStepDuration * speedScale || absDx <= settings.meleeRange + 10) {
          enemy.vx = 0;
          enemy.state = "melee_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "backstep_reset":
        enemy.vx = enemy.bossMoveDirection * settings.moveSpeed;
        enemy.x += enemy.vx * dt;
        if (enemy.stateTimer >= settings.backstepDuration * speedScale || absDx >= settings.preferredRange) {
          enemy.vx = 0;
          enemy.state = "ranged_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "teleport_out":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.teleportVanishDuration * speedScale) {
          enemy.x = enemy.bossTeleportTargetX;
          enemy.y = enemy.bossTeleportTargetY;
          enemy.state = "teleport_in";
          enemy.stateTimer = 0;
          pushEffect(enemy.x, enemy.y - 42, "#cfb3ff", "boss_teleport", {
            timer: 0.2,
            total: 0.2,
          });
        }
        break;
      case "teleport_in":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.teleportAppearDuration * speedScale) {
          enemy.state = "teleport_strike_windup";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "teleport_strike_windup":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.teleportStrikeWindup * speedScale) {
          enemy.state = "teleport_strike_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "teleport_strike_active":
        enemy.vx = 0;
        if (!enemy.attackResolved) {
          enemy.attackResolved = true;
          enemy.swingTimer = 0.2;
          pushEffect(enemy.x + actionFacingSign * 24, enemy.y - 50, "#f5bf5c", "dummy_melee");
          if (Math.abs(player.x - enemy.x) <= settings.meleeRange + player.radius && Math.abs(player.y - enemy.y) <= 82) {
            processIncomingHit("melee", enemy, null);
          }
        }
        if (enemy.stateTimer >= settings.teleportStrikeActiveDuration * speedScale) {
          enemy.state = "recover";
          enemy.stateTimer = 0;
          enemy.cooldownTimer = settings.teleportRecover * speedScale;
          enemy.bossRecoverDuration = settings.teleportRecover * speedScale;
          enemy.bossLastAttack = "teleport";
          enemy.teleportCooldownTimer = settings.teleportCooldown * speedScale;
          enemy.bossPatternCursor += 1;
        }
        break;
      case "melee_windup":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.meleeWindup * speedScale) {
          enemy.state = "melee_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "melee_active":
        enemy.vx = 0;
        if (!enemy.attackResolved) {
          enemy.attackResolved = true;
          enemy.swingTimer = 0.24;
          pushEffect(enemy.x + actionFacingSign * 26, enemy.y - 52, "#f5bf5c", "dummy_melee");
          if (Math.abs(player.x - enemy.x) <= settings.meleeRange + player.radius && Math.abs(player.y - enemy.y) <= 82) {
            processIncomingHit("melee", enemy, null);
          }
        }
        if (enemy.stateTimer >= settings.meleeActiveDuration * speedScale) {
          enemy.state = "recover";
          enemy.stateTimer = 0;
          enemy.cooldownTimer = settings.meleeRecover * speedScale;
          enemy.bossRecoverDuration = settings.meleeRecover * speedScale;
          enemy.bossLastAttack = "melee";
          enemy.bossPatternCursor += 1;
        }
        break;
      case "ranged_windup":
        enemy.vx = 0;
        if (enemy.stateTimer >= settings.rangedWindup * speedScale) {
          enemy.state = "ranged_active";
          enemy.stateTimer = 0;
          enemy.attackResolved = false;
        }
        break;
      case "ranged_active":
        enemy.vx = 0;
        if (!enemy.attackResolved) {
          enemy.attackResolved = true;
          const muzzle = getRangedEnemyMuzzle(enemy);
          spawnProjectile(muzzle.x, muzzle.y, enemy.aimAngle, settings.projectileStartupSpeed, settings.projectileDamage, "enemy", false, {
            sourceEnemyId: enemy.id,
            shotStyle: "boss_spell",
            radius: settings.projectileRadius,
            glowColor: "#cdb9ff",
            targetSpeed: settings.projectileSpeed,
            parryWindowTimer: settings.projectileParryWindow,
            parryWindowTotal: settings.projectileParryWindow,
          });
          pushEffect(muzzle.x, muzzle.y, "#d8c2ff", "boss_spell_cast", {
            angle: enemy.aimAngle,
            timer: 0.22,
            total: 0.22,
          });
        }
        if (enemy.stateTimer >= settings.rangedActiveDuration * speedScale) {
          enemy.state = "recover";
          enemy.stateTimer = 0;
          enemy.cooldownTimer = settings.rangedRecover * speedScale;
          enemy.bossRecoverDuration = settings.rangedRecover * speedScale;
          enemy.bossLastAttack = "ranged";
          enemy.bossPatternCursor += 1;
        }
        break;
      case "recover":
        enemy.vx = 0;
        if (enemy.stateTimer >= (enemy.bossRecoverDuration || settings.rangedRecover) || enemy.cooldownTimer <= 0) {
          enemy.state = "evaluate";
          enemy.stateTimer = 0;
        }
        break;
      case "stagger":
        enemy.vx = 0;
        if (enemy.staggerTimer <= 0) {
          enemy.state = "evaluate";
          enemy.stateTimer = 0;
        }
        break;
      default:
        enemy.state = "evaluate";
        enemy.stateTimer = 0;
        enemy.vx = 0;
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
      enemy.teleportCooldownTimer = Math.max(0, enemy.teleportCooldownTimer - dt);
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
      else if (enemy.type === "ranged") updateRangedEnemy(enemy, dt);
      else updateBossEnemy(enemy, dt);
      applyGravity(enemy, dt, false);
      enemy.x = clamp(enemy.x, world.left + 6, world.right - 6);
    }
    state.enemies = state.enemies.filter((enemy) => !enemy.removed);
    updateEncounterFlow(dt);
  }

  function updateEncounterFlow(dt) {
    encounterController.updateEncounterFlow(dt);
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
      if (proj.parryWindowTimer > 0) {
        proj.parryWindowTimer = Math.max(0, proj.parryWindowTimer - dt);
        const total = Math.max(0.0001, proj.parryWindowTotal || 0.0001);
        const progress = 1 - proj.parryWindowTimer / total;
        const startSpeed = proj.startSpeed ?? proj.speed;
        const targetSpeed = proj.targetSpeed ?? proj.speed;
        proj.speed = lerp(startSpeed, targetSpeed, progress);
      } else if (proj.targetSpeed) {
        proj.speed = proj.targetSpeed;
      }
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
    if (state.tutorialTransition.active) {
      updateTutorialTransition(dt);
      updateEffects(dt);
      mouse.leftPressed = false;
      mouse.rightPressed = false;
      mouse.wheelDown = false;
      return;
    }
    if (isGameOverMenuActive()) {
      handleGameOverMenuInput();
      if (state.player) {
        state.player.vx = 0;
        state.player.vy = 0;
      }
      updateEffects(dt);
      mouse.leftPressed = false;
      mouse.rightPressed = false;
      mouse.wheelDown = false;
      return;
    }
    if (isTutorialChoiceMenuActive()) {
      handleTutorialChoiceInput();
      if (state.player) {
        state.player.vx = 0;
        state.player.vy = 0;
      }
      updateEffects(dt);
      mouse.leftPressed = false;
      mouse.rightPressed = false;
      mouse.wheelDown = false;
      return;
    }
    handlePlayerInput();
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateTutorialFlow();
    updateEffects(dt);
    mouse.leftPressed = false;
    mouse.rightPressed = false;
    mouse.wheelDown = false;
  }

  function drawArena() {
    const isMovementTutorial = state.playMode === "tutorial" && state.tutorialFlow.stage === "movement_tutorial";
    const movementLayout = isMovementTutorial ? getTutorialMovementLayout() : null;
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

    const visiblePlatforms = isMovementTutorial ? [] : stagePlatforms;
    for (const platform of visiblePlatforms) {
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
    if (isMovementTutorial && movementLayout?.surfaces?.length) {
      for (const surface of movementLayout.surfaces) {
        ctx.fillRect(surface.x, surface.y, surface.w, HEIGHT - surface.y);
        ctx.strokeStyle = "rgba(226, 241, 250, 0.14)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(surface.x, surface.y + 0.5);
        ctx.lineTo(surface.x + surface.w, surface.y + 0.5);
        ctx.stroke();
      }
      for (const block of movementLayout.solidBlocks || []) {
        ctx.fillStyle = "#2d394d";
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.fillStyle = "rgba(184, 233, 248, 0.14)";
        ctx.fillRect(block.x + 8, block.y + 12, Math.max(8, block.w - 16), Math.max(16, block.h - 24));
      }
      if (movementLayout.guideWall) {
        const wall = movementLayout.guideWall;
        ctx.fillStyle = "#2d394d";
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = "rgba(184, 233, 248, 0.14)";
        ctx.fillRect(wall.x + 2, wall.y + 8, Math.max(4, wall.w - 4), wall.h - 16);
      }
      if (movementLayout.spikePit) {
        const pit = movementLayout.spikePit;
        ctx.fillStyle = "#141c29";
        ctx.fillRect(pit.x, pit.y, pit.w, pit.h + 28);
        ctx.strokeStyle = "rgba(255, 136, 108, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pit.x, pit.y + 0.5);
        ctx.lineTo(pit.x + pit.w, pit.y + 0.5);
        ctx.stroke();
        for (let x = pit.x + 6; x < pit.x + pit.w - 6; x += 14) {
          ctx.fillStyle = "#c85f4f";
          ctx.beginPath();
          ctx.moveTo(x, pit.y + pit.h + 8);
          ctx.lineTo(x + 6, pit.y + 2);
          ctx.lineTo(x + 12, pit.y + pit.h + 8);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255, 214, 196, 0.22)";
          ctx.beginPath();
          ctx.moveTo(x + 6, pit.y + 4);
          ctx.lineTo(x + 9, pit.y + pit.h + 4);
          ctx.lineTo(x + 3, pit.y + pit.h + 4);
          ctx.closePath();
          ctx.fill();
        }
      }
      const pedestal = movementLayout.switchPedestal;
      ctx.fillStyle = "#3a475d";
      ctx.fillRect(pedestal.x, pedestal.y, pedestal.w, pedestal.h);
      ctx.fillStyle = "#d9f7ff";
      ctx.fillRect(pedestal.x + 4, pedestal.y + 6, pedestal.w - 8, 8);

      const anchors = getTutorialStageSegment("movement_tutorial").anchors;
      ctx.fillStyle = "rgba(245, 240, 216, 0.9)";
      ctx.font = "12px Segoe UI";
      ctx.fillText("AD移动", anchors.moveGate.x - 28, world.groundY - 14);
      ctx.fillText("Space跳跃", anchors.jumpTakeoff.x - 28, world.groundY - 14);
      ctx.fillText("Shift冲刺", movementLayout.spikePit.x + 4, movementLayout.spikePit.y - 12);
      ctx.fillText("Q切武", anchors.switchZone.x - 18, pedestal.y - 10);
      ctx.fillText("出口", getTutorialDoorAnchor().x - 12, movementLayout.surfaces[2].y - 48);
    } else {
      ctx.fillRect(0, world.groundY, WIDTH, HEIGHT - world.groundY);
      ctx.strokeStyle = "rgba(226, 241, 250, 0.14)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, world.groundY + 0.5);
      ctx.lineTo(WIDTH, world.groundY + 0.5);
      ctx.stroke();
    }

    if (state.playMode === "tutorial" && state.tutorialFlow.stage !== "done") {
      const door = getTutorialDoorAnchor();
      if (door) {
        const cleared = canEnterTutorialDoor();
        const glow = cleared ? 0.68 + Math.sin(state.time * 7) * 0.14 : 0.14;
        const doorX = door.x - 28;
        const doorY = door.y - 92;
        ctx.fillStyle = "rgba(14, 21, 31, 0.96)";
        ctx.beginPath();
        ctx.roundRect(doorX - 10, doorY - 8, 76, 104, 18);
        ctx.fill();
        ctx.strokeStyle = "rgba(221, 236, 248, 0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(doorX - 10, doorY - 8, 76, 104, 18);
        ctx.stroke();

        ctx.fillStyle = "#3c4a60";
        ctx.beginPath();
        ctx.roundRect(doorX - 4, doorY + 8, 64, 14, 8);
        ctx.fill();
        ctx.fillRect(doorX + 2, doorY + 14, 8, 74);
        ctx.fillRect(doorX + 46, doorY + 14, 8, 74);

        ctx.fillStyle = cleared ? `rgba(255, 220, 124, ${0.26 + glow * 0.2})` : "rgba(140, 154, 170, 0.08)";
        ctx.beginPath();
        ctx.roundRect(doorX + 8, doorY + 18, 40, 66, 12);
        ctx.fill();
        if (cleared) {
          ctx.fillStyle = `rgba(255, 233, 176, ${0.16 + glow * 0.08})`;
          ctx.beginPath();
          ctx.ellipse(door.x + 28, door.y - 44, 46 + glow * 14, 72 + glow * 12, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 241, 197, ${0.74 + glow * 0.16})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(doorX + 8, doorY + 18, 40, 66, 12);
          ctx.stroke();
          ctx.fillStyle = `rgba(255, 236, 168, ${0.85 + glow * 0.08})`;
          ctx.beginPath();
          ctx.moveTo(doorX + 20, doorY + 50);
          ctx.lineTo(doorX + 34, doorY + 50);
          ctx.lineTo(doorX + 34, doorY + 38);
          ctx.lineTo(doorX + 50, doorY + 58);
          ctx.lineTo(doorX + 34, doorY + 78);
          ctx.lineTo(doorX + 34, doorY + 66);
          ctx.lineTo(doorX + 20, doorY + 66);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
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
      flipX: pose.flipX ?? facingLeft,
      offsetX: pose.offsetX,
      offsetY: pose.offsetY,
      rotation: pose.rotation,
    });
    if (spriteDrawn && pose.overlayAsset && pose.overlayFrame) {
      drawSpriteFrame(pose.overlayAsset, pose.overlayFrame, pose.overlayPivotX || 0, pose.overlayPivotY || 0, {
        scale: pose.scale,
        alpha: pose.alpha,
        flipX: pose.flipX ?? facingLeft,
        offsetX: pose.overlayOffsetX || 0,
        offsetY: pose.overlayOffsetY || 0,
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
    const bossScale = 1.32;
    const rangedFlip = !facingLeft;
    if (enemy.type === "boss") {
      const bossFlip = !facingLeft;
      if (enemy.state === "dead") {
        const progress = clamp(enemy.stateTimer / settings.deathDuration, 0, 1);
        const deathAsset = getProgressItem(enemySpriteAssets.boss.death, progress) || enemySpriteAssets.boss.death.at(-1);
        return {
          asset: deathAsset,
          frame: getWholeAssetFrame(deathAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10 + progress * 12,
          flipX: bossFlip,
          alpha: progress > 0.82 ? 1 - (progress - 0.82) / 0.18 : 1,
          rotation: enemy.deathRotationDir * progress * 0.2,
        };
      }

      const hurtProgress = enemy.hurtTimer > 0 ? enemy.hurtTimer / settings.hurtDuration : 0;
      const hurtOffsetX = enemy.hurtTimer > 0 ? enemy.hurtDirection * hurtProgress * 10 : 0;
      const hurtOffsetY = enemy.hurtTimer > 0 ? -hurtProgress * 3 : 0;
      const hurtRotation = enemy.hurtTimer > 0 ? enemy.hurtDirection * hurtProgress * 0.08 : 0;
      if (enemy.state === "stagger" || enemy.hurtTimer > 0) {
        const hurtAsset = getProgressItem(enemySpriteAssets.boss.hurt, 1 - hurtProgress) || enemySpriteAssets.boss.hurt.at(-1);
        return {
          asset: hurtAsset,
          frame: getWholeAssetFrame(hurtAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10 + hurtOffsetY,
          flipX: bossFlip,
          offsetX: hurtOffsetX,
          rotation: hurtRotation,
        };
      }
      if (enemy.state === "pressure_step" || enemy.state === "backstep_reset") {
        const walkAsset = getLoopItem(enemySpriteAssets.boss.walk, state.time + enemy.stateTimer * 0.18, 9);
        return {
          asset: walkAsset,
          frame: getWholeAssetFrame(walkAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10,
          flipX: bossFlip,
        };
      }
      if (enemy.state === "teleport_out" || enemy.state === "teleport_in") {
        const teleportProgress =
          enemy.state === "teleport_out"
            ? clamp(enemy.stateTimer / settings.teleportVanishDuration, 0, 1)
            : clamp(enemy.stateTimer / settings.teleportAppearDuration, 0, 1);
        const castAsset = getProgressItem(enemySpriteAssets.boss.cast, enemy.state === "teleport_out" ? teleportProgress : 1 - teleportProgress) || enemySpriteAssets.boss.cast.at(-1);
        return {
          asset: castAsset,
          frame: getWholeAssetFrame(castAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10,
          flipX: bossFlip,
          alpha: enemy.state === "teleport_out" ? 1 - teleportProgress * 0.9 : 0.2 + teleportProgress * 0.8,
        };
      }
      if (enemy.state === "teleport_strike_windup" || enemy.state === "teleport_strike_active") {
        const progress =
          enemy.state === "teleport_strike_windup"
            ? clamp(enemy.stateTimer / settings.teleportStrikeWindup, 0, 0.64)
            : 0.64 + clamp(enemy.stateTimer / settings.teleportStrikeActiveDuration, 0, 1) * 0.36;
        const attackAsset = getProgressItem(enemySpriteAssets.boss.attack, progress) || enemySpriteAssets.boss.attack.at(-1);
        return {
          asset: attackAsset,
          frame: getWholeAssetFrame(attackAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10,
          flipX: bossFlip,
        };
      }
      if (enemy.state === "melee_windup" || enemy.state === "melee_active") {
        const progress =
          enemy.state === "melee_windup"
            ? clamp(enemy.stateTimer / settings.meleeWindup, 0, 0.7)
            : 0.7 + clamp(enemy.stateTimer / settings.meleeActiveDuration, 0, 1) * 0.3;
        const attackAsset = getProgressItem(enemySpriteAssets.boss.attack, progress) || enemySpriteAssets.boss.attack.at(-1);
        return {
          asset: attackAsset,
          frame: getWholeAssetFrame(attackAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10,
          flipX: bossFlip,
        };
      }
      if (enemy.state === "ranged_windup" || enemy.state === "ranged_active" || (enemy.state === "recover" && enemy.bossLastAttack === "ranged")) {
        const progress =
          enemy.state === "recover"
            ? 0.96
            : enemy.state === "ranged_windup"
              ? clamp(enemy.stateTimer / settings.rangedWindup, 0, 1)
              : 0.92;
        const castAsset = getProgressItem(enemySpriteAssets.boss.cast, progress) || enemySpriteAssets.boss.cast.at(-1);
        return {
          asset: castAsset,
          frame: getWholeAssetFrame(castAsset, 0.5, 0.96),
          scale: bossScale,
          offsetY: 10,
          flipX: bossFlip,
        };
      }
      const idleAsset = Math.abs(enemy.vx) > 8 ? getLoopItem(enemySpriteAssets.boss.walk, state.time + enemy.stateTimer * 0.12, 8) : getLoopItem(enemySpriteAssets.boss.idle, state.time + enemy.stateTimer * 0.12, 6);
      return {
        asset: idleAsset,
        frame: getWholeAssetFrame(idleAsset, 0.5, 0.96),
        scale: bossScale,
        offsetY: 10,
        flipX: bossFlip,
      };
    }
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
        const baseColor = enemy.type === "melee" ? "#8d5632" : enemy.type === "boss" ? "#6b537d" : "#4b74c9";
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
      } else if (enemy.type === "boss") {
        const actionFacingSign = getEnemyActionFacingSign(enemy);
        if (enemy.state === "melee_windup" || enemy.state === "teleport_strike_windup") {
          const isTeleport = enemy.state === "teleport_strike_windup";
          const windup = isTeleport ? settings.teleportStrikeWindup : settings.meleeWindup;
          const progress = clamp(enemy.stateTimer / windup, 0, 1);
          ctx.strokeStyle = `rgba(245,191,92,${0.35 + progress * 0.5})`;
          ctx.lineWidth = 4 + progress * 3;
          ctx.beginPath();
          ctx.arc(actionFacingSign * (isTeleport ? 16 : 20), -48, 30 + progress * 16, -0.68, 0.68);
          ctx.stroke();
        }
        if (enemy.state === "ranged_windup") {
          const progress = clamp(enemy.stateTimer / settings.rangedWindup, 0, 1);
          ctx.strokeStyle = `rgba(201,229,255,${0.28 + progress * 0.42})`;
          ctx.lineWidth = 3 + progress * 2;
          ctx.beginPath();
          ctx.moveTo(0, -58);
          ctx.lineTo(Math.cos(enemy.aimAngle) * 110, -58 + Math.sin(enemy.aimAngle) * 52);
          ctx.stroke();
          ctx.strokeStyle = `rgba(181,149,255,${0.2 + progress * 0.4})`;
          ctx.beginPath();
          ctx.arc(0, -58, 18 + progress * 10, 0, TAU);
          ctx.stroke();
        }
        if (enemy.state === "teleport_out" || enemy.state === "teleport_in") {
          ctx.strokeStyle = `rgba(207,179,255,${enemy.state === "teleport_out" ? 0.72 : 0.88})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, -44, 18 + (enemy.state === "teleport_out" ? enemy.stateTimer / settings.teleportVanishDuration : 1 - enemy.stateTimer / settings.teleportAppearDuration) * 18, 0, TAU);
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
      } else if (proj.shotStyle === "boss_spell") {
        const spellAsset = getLoopItem(enemySpriteAssets.boss.spell, state.time + (3 - proj.ttl) * 4, 14) || enemySpriteAssets.boss.spell[0];
        const parryRatio = proj.parryWindowTimer > 0 ? clamp(proj.parryWindowTimer / Math.max(0.0001, proj.parryWindowTotal || 0.0001), 0, 1) : 0;
        if (parryRatio > 0) {
          ctx.strokeStyle = `rgba(232, 244, 255, ${0.48 + Math.sin(state.time * 18) * 0.12 + parryRatio * 0.22})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius + 10 + (1 - parryRatio) * 4, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = `rgba(184, 226, 255, ${0.28 + parryRatio * 0.26})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius + 18 + (1 - parryRatio) * 6, 0, TAU);
          ctx.stroke();
        }
        const drewSpell = drawSpriteFrame(spellAsset, getWholeAssetFrame(spellAsset, 0.5, 0.5), proj.x, proj.y, {
          scale: 0.72 + parryRatio * 0.04,
          rotation: proj.angle + Math.PI * 0.5,
          alpha: 0.96,
        });
        if (!drewSpell) {
          ctx.strokeStyle = "#f0e5ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius + 4, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = "#b894ff";
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius, 0, TAU);
          ctx.fill();
        }
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

  function drawTintedBanditGuardEffect(effect, options = {}) {
    return drawStripEffect(combatVfxAssets.guard, effect, 40, 40, 5, {
      scale: options.scale ?? 1,
      rotation: options.rotation ?? 0,
      anchorX: 20,
      anchorY: 20,
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
      tintColor: effect.color,
      tintStrength: options.tintStrength ?? 0.88,
      highlightStrength: options.highlightStrength ?? 0.28,
    });
  }

  function drawTintedPerfectGuardEffect(effect, options = {}) {
    return drawStripEffect(sideviewAddonAssets.perfectGuard, effect, 40, 40, 5, {
      scale: options.scale ?? 1,
      rotation: options.rotation ?? 0,
      anchorX: 20,
      anchorY: 20,
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
      tintColor: effect.color,
      tintStrength: options.tintStrength ?? 0.84,
      highlightStrength: options.highlightStrength ?? 0.36,
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
        if (!drawTintedPerfectGuardEffect(effect, { scale: 1.08, rotation: effect.angle || 0, offsetY: -2 })) {
          drawGuardPulseEffect(effect, { baseRadius: 16, expand: 22, lineWidth: 6.5, arc: 1.35, alphaScale: 1 });
        }
      } else if (effect.kind === "block") {
        if (!drawTintedBanditGuardEffect(effect, { scale: 1.02, rotation: effect.angle || 0 })) {
          drawGuardPulseEffect(effect, { baseRadius: 16, expand: 12, lineWidth: 4.5, arc: 1.02, alphaScale: 0.9 });
        }
      } else if (effect.kind === "parry" || effect.kind === "reflect") {
        if (
          !drawTintedBanditGuardEffect(effect, {
            scale: effect.kind === "parry" ? 1.12 : 0.98,
            rotation: effect.angle || 0,
            tintStrength: effect.kind === "parry" ? 0.82 : 0.9,
          })
        ) {
          drawGuardPulseEffect(effect, {
            baseRadius: effect.kind === "parry" ? 18 : 16,
            expand: effect.kind === "parry" ? 18 : 14,
            lineWidth: effect.kind === "parry" ? 5.5 : 4.5,
            arc: effect.kind === "parry" ? 1.28 : 1.08,
            alphaScale: 0.96,
          });
        }
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
      } else if (effect.kind === "boss_spell_cast") {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle || 0);
        ctx.strokeStyle = "#eadbff";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();
        ctx.strokeStyle = "rgba(194, 162, 255, 0.82)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16 + (1 - alpha) * 10, 0, TAU);
        ctx.stroke();
      } else if (effect.kind === "boss_teleport") {
        ctx.strokeStyle = "#cfb3ff";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 18 + (1 - alpha) * 22, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(232, 219, 255, 0.78)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 30 + (1 - alpha) * 18, 0, TAU);
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
    const weaponLabel = player.currentWeapon === "gun" ? "枪" : "刀";
    const bossEnemy = state.enemies.find((enemy) => isEnemyAlive(enemy) && enemy.type === "boss") || null;
    const panelWidth = player.currentWeapon === "gun" ? 184 : 120;
    const panelHeight = player.currentWeapon === "gun" ? 78 : 52;
    ctx.fillStyle = "rgba(9, 15, 23, 0.82)";
    ctx.beginPath();
    ctx.roundRect(18, 18, panelWidth, panelHeight, 14);
    ctx.fill();

    ctx.fillStyle = "#eef4fb";
    ctx.font = "16px Segoe UI";
    ctx.fillText(`当前武器：${weaponLabel}`, 32, 50);
    if (player.currentWeapon === "gun") {
      ctx.fillText(`弹药：${player.gunAmmo}/${config.player.gunMaxAmmo}`, 32, 76);
    }

    ctx.fillStyle = "#1a2636";
    ctx.fillRect(18, HEIGHT - 34, 220, 14);
    ctx.fillStyle = "#ff8076";
    ctx.fillRect(18, HEIGHT - 34, 220 * (player.hp / config.player.maxHp), 14);

    if (bossEnemy) {
      const bossSettings = getEnemySettings(bossEnemy);
      const ratio = clamp(bossEnemy.hp / bossSettings.maxHp, 0, 1);
      const barWidth = 320;
      const barX = WIDTH * 0.5 - barWidth * 0.5;
      const barY = 18;
      ctx.fillStyle = "rgba(9, 15, 23, 0.82)";
      ctx.beginPath();
      ctx.roundRect(barX - 12, barY - 10, barWidth + 24, 38, 14);
      ctx.fill();
      ctx.fillStyle = "#2b3547";
      ctx.fillRect(barX, barY, barWidth, 12);
      ctx.fillStyle = bossEnemy.bossPhase === 2 ? "#d45d8c" : "#b894ff";
      ctx.fillRect(barX, barY, barWidth * ratio, 12);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, barY, barWidth, 12);
      ctx.fillStyle = "#f1e8ff";
      ctx.font = "bold 16px Segoe UI";
      ctx.fillText(`双式督战官  P${bossEnemy.bossPhase}`, barX, barY - 2);
    }

    if (state.infoTextTimer > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Segoe UI";
      ctx.fillText(state.infoText, WIDTH * 0.5 - 84, 42);
    }

    const tutorialHint = getTutorialHint();
    const tutorialCenterPrompt = getTutorialCenterPrompt();
    if (tutorialHint && !tutorialCenterPrompt) {
      const panelX = WIDTH * 0.5 - 172;
      const panelY = 68;
      const panelWidth = 344;
      const panelHeight = 36;
      ctx.fillStyle = "rgba(10, 18, 28, 0.74)";
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 203, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
      ctx.stroke();
      ctx.fillStyle = "#f5f0d8";
      ctx.font = "14px Segoe UI";
      ctx.fillText(tutorialHint, panelX + 16, panelY + 23);
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
      ctx.fillText(`Shift：${state.counterPromptTitle || "反击派生"}`, panelX + 16, panelY + 24);
      ctx.fillStyle = `rgba(255, 250, 232, ${0.66 + alpha * 0.3})`;
      ctx.font = "bold 13px Segoe UI";
      ctx.fillText(state.counterPromptRole || "反击", panelX + 16, panelY + 47);
      ctx.fillStyle = `rgba(214, 224, 236, ${0.62 + alpha * 0.26})`;
      ctx.font = "12px Segoe UI";
      ctx.fillText(state.counterPromptHint || "抓住窗口打出去", panelX + 114, panelY + 47);
    }
  }

  function getTutorialCoachState() {
    if (state.playMode !== "tutorial" || state.tutorialTransition.active) return { labels: [], checklist: null };
    const stage = state.tutorialFlow.stage;
    const flags = state.tutorialFlow.flags;
    if (stage === "melee_tutorial") {
      const text = !flags.meleeSwordFollowUpDone ? "先用刀完成派生" : !flags.meleeGunFollowUpDone ? "切枪后再完成派生" : "继续向右进入下一关";
      return {
        labels: [],
        checklist: {
          title: "第 2 关目标",
          swordDone: flags.meleeSwordFollowUpDone,
          gunDone: flags.meleeGunFollowUpDone,
        },
      };
    }
    if (stage === "ranged_tutorial") {
      const text = !flags.rangedSwordFollowUpDone ? "先用刀完成派生" : !flags.rangedGunFollowUpDone ? "切枪后再完成派生" : "继续向右进入下一关";
      return {
        labels: [],
        checklist: {
          title: "第 3 关目标",
          swordDone: flags.rangedSwordFollowUpDone,
          gunDone: flags.rangedGunFollowUpDone,
        },
      };
    }
    if (stage === "mixed_exam") {
      return {
        labels: [],
        checklist: {
          title: "第 4 关目标",
          meleeDone: flags.mixedMeleeFollowUpDone,
          rangedDone: flags.mixedRangedFollowUpDone,
        },
      };
    }
    if (stage === "mini_boss") {
      return {
        labels: [{ enemyType: "boss", text: "双式督战官", color: "#e3c8ff" }],
        checklist: null,
      };
    }
    return { labels: [], checklist: null };
  }

  function drawTutorialCoachOverlay() {
    const coachState = getTutorialCoachState();
    if (coachState.checklist) {
      const panelX = WIDTH - 208;
      const panelY = 18;
      ctx.fillStyle = "rgba(9, 15, 23, 0.84)";
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, 188, 74, 14);
      ctx.fill();
      ctx.fillStyle = "#eef4fb";
      ctx.font = "bold 14px Segoe UI";
      ctx.fillText(coachState.checklist.title, panelX + 16, panelY + 22);
      ctx.font = "13px Segoe UI";
      if ("meleeDone" in coachState.checklist || "rangedDone" in coachState.checklist) {
        ctx.fillStyle = coachState.checklist.meleeDone ? "#96efb5" : "#ffeab4";
        ctx.fillText(`${coachState.checklist.meleeDone ? "已完成" : "未完成"} 近战派生`, panelX + 16, panelY + 46);
        ctx.fillStyle = coachState.checklist.rangedDone ? "#96efb5" : "#c9f7ff";
        ctx.fillText(`${coachState.checklist.rangedDone ? "已完成" : "未完成"} 远程派生`, panelX + 16, panelY + 68);
      } else {
        ctx.fillStyle = coachState.checklist.swordDone ? "#96efb5" : "#ffeab4";
        ctx.fillText(`${coachState.checklist.swordDone ? "已完成" : "未完成"} 刀形态`, panelX + 16, panelY + 46);
        ctx.fillStyle = coachState.checklist.gunDone ? "#96efb5" : "#c9f7ff";
        ctx.fillText(`${coachState.checklist.gunDone ? "已完成" : "未完成"} 枪形态`, panelX + 16, panelY + 68);
      }
    }
  }

  function getTutorialCenterPrompt() {
    if (state.playMode !== "tutorial" || state.tutorialTransition.active) return null;
    const stage = state.tutorialFlow.stage;
    if (stage === "melee_tutorial") {
      return "近战（第 2 关）：点击右键可以完美格挡，再按 Shift 可以使出格挡技";
    }
    if (stage === "ranged_tutorial") {
      return "远程（第 3 关）：点击右键可以完美格挡，再按 Shift 可以使出格挡技";
    }
    return null;
  }

  function drawTutorialCenterPrompt() {
    const text = getTutorialCenterPrompt();
    if (!text) return;
    const panelWidth = 418;
    const panelHeight = 42;
    const panelX = WIDTH * 0.5 - panelWidth * 0.5;
    const panelY = 86;
    ctx.fillStyle = "rgba(10, 18, 28, 0.8)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 244, 203, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
    ctx.stroke();
    ctx.fillStyle = "#f5f0d8";
    ctx.font = "14px Segoe UI";
    ctx.fillText(text, panelX + 16, panelY + 26);
  }

  function drawTutorialChoiceMenu() {
    const menu = getTutorialChoiceMenu();
    if (!menu) return;
    ctx.fillStyle = "rgba(6, 11, 18, 0.56)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(11, 18, 27, 0.94)";
    ctx.beginPath();
    ctx.roundRect(menu.panelX, menu.panelY, menu.panelWidth, menu.panelHeight, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 244, 203, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#f8f1d5";
    ctx.font = "bold 24px Segoe UI";
    ctx.fillText(menu.title, menu.panelX + 28, menu.panelY + 42);
    ctx.fillStyle = "#c9d7e8";
    ctx.font = "14px Segoe UI";
    ctx.fillText(menu.subtitle, menu.panelX + 28, menu.panelY + 68);

    for (const button of menu.buttons) {
      const selected = getSelectedTutorialChoiceButton(menu)?.id === button.id;
      const hovered = button.enabled && mouse.x >= button.x && mouse.x <= button.x + button.w && mouse.y >= button.y && mouse.y <= button.y + button.h;
      ctx.fillStyle = button.enabled
        ? selected
          ? "rgba(255, 229, 145, 0.96)"
          : hovered
            ? "rgba(251, 223, 147, 0.92)"
            : "rgba(248, 204, 94, 0.84)"
        : "rgba(92, 103, 120, 0.42)";
      ctx.beginPath();
      ctx.roundRect(button.x, button.y, button.w, button.h, 14);
      ctx.fill();
      ctx.strokeStyle = button.enabled
        ? selected
          ? "rgba(255, 252, 235, 0.92)"
          : "rgba(255, 249, 222, 0.54)"
        : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = selected ? 2.5 : 1.25;
      ctx.stroke();
      ctx.fillStyle = button.enabled ? "#122031" : "#95a4b7";
      ctx.font = "bold 16px Segoe UI";
      ctx.fillText(button.label, button.x + 22, button.y + 29);
    }
  }

  function drawGameOverMenu() {
    const menu = getGameOverMenu();
    if (!menu) return;
    ctx.fillStyle = "rgba(5, 10, 16, 0.62)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(11, 18, 27, 0.94)";
    ctx.beginPath();
    ctx.roundRect(menu.panelX, menu.panelY, menu.panelWidth, menu.panelHeight, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 170, 146, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffd3c3";
    ctx.font = "bold 24px Segoe UI";
    ctx.fillText(menu.title, menu.panelX + 28, menu.panelY + 42);
    ctx.fillStyle = "#d2dbe7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(menu.subtitle, menu.panelX + 28, menu.panelY + 68);

    const selected = getSelectedGameOverButton(menu);
    for (const button of menu.buttons) {
      const isSelected = selected?.id === button.id;
      const hovered = mouse.x >= button.x && mouse.x <= button.x + button.w && mouse.y >= button.y && mouse.y <= button.y + button.h;
      ctx.fillStyle = isSelected
        ? "rgba(255, 146, 116, 0.92)"
        : hovered
          ? "rgba(255, 186, 155, 0.86)"
          : "rgba(248, 204, 94, 0.84)";
      ctx.beginPath();
      ctx.roundRect(button.x, button.y, button.w, button.h, 14);
      ctx.fill();
      ctx.strokeStyle = isSelected ? "rgba(255, 246, 236, 0.92)" : "rgba(255, 249, 222, 0.46)";
      ctx.lineWidth = isSelected ? 2.5 : 1.25;
      ctx.stroke();
      ctx.fillStyle = "#122031";
      ctx.font = "bold 16px Segoe UI";
      ctx.fillText(button.label, button.x + 22, button.y + 29);
    }
  }

  function drawTutorialTransitionOverlay() {
    if (!state.tutorialTransition.active) return;
    const alpha = clamp(state.tutorialTransition.timer / state.tutorialTransition.duration, 0, 1);
    ctx.fillStyle = `rgba(6, 11, 18, ${0.38 + (1 - alpha) * 0.36})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = `rgba(255, 248, 223, ${0.82 + (1 - alpha) * 0.14})`;
    ctx.font = "bold 30px Segoe UI";
    ctx.fillText(state.tutorialTransition.label || "进入下一段", WIDTH * 0.5 - 104, HEIGHT * 0.46);
    ctx.font = "16px Segoe UI";
    ctx.fillText("短暂停顿后继续前进", WIDTH * 0.5 - 72, HEIGHT * 0.52);
  }

  function render() {
    updateGmButtons();
    drawArena();
    if (state.mode !== "running") {
      ctx.fillStyle = "#eef4fb";
      ctx.font = "bold 28px Segoe UI";
      ctx.fillText("点击开始进入教程", WIDTH * 0.31, HEIGHT * 0.48);
      ctx.font = "16px Segoe UI";
      ctx.fillText("共 5 关，完成基础操作与战斗流程训练。", WIDTH * 0.24, HEIGHT * 0.54);
      debugUi.textContent = JSON.stringify({ mode: state.mode, note: "点击开始" });
      return;
    }

    drawEnemies();
    drawProjectiles();
    drawEffects();
    drawPlayer();
    drawHud();
    drawTutorialCenterPrompt();
    drawTutorialCoachOverlay();
    drawTutorialChoiceMenu();
    drawGameOverMenu();
    drawTutorialTransitionOverlay();

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
      playMode: state.playMode,
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
            playMode: state.playMode,
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
      tutorialFlow: window.TutorialFlow.getTutorialSnapshot(state.tutorialFlow),
      tutorialHint: getTutorialHint(),
      tutorialCenterPrompt: getTutorialCenterPrompt(),
      tutorialCoach: getTutorialCoachState(),
      tutorialDoor:
        state.playMode === "tutorial" && state.tutorialFlow.stage !== "done"
          ? (() => {
              const door = getTutorialDoorAnchor();
              return door
                ? {
                    x: Math.round(door.x),
                    y: Math.round(door.y),
                    active: canEnterTutorialDoor(),
                  }
                : null;
            })()
          : null,
      tutorialChoiceMenu: (() => {
        const menu = getTutorialChoiceMenu();
        if (!menu) return null;
        return {
          title: menu.title,
          subtitle: menu.subtitle,
          selectedAction: getSelectedTutorialChoiceButton(menu)?.action || null,
          buttons: menu.buttons.map((button) => ({
            id: button.id,
            label: button.label,
            enabled: button.enabled,
          })),
        };
      })(),
      gameOverMenu: (() => {
        const menu = getGameOverMenu();
        if (!menu) return null;
        return {
          title: menu.title,
          subtitle: menu.subtitle,
          selectedAction: getSelectedGameOverButton(menu)?.action || null,
          buttons: menu.buttons.map((button) => ({
            id: button.id,
            label: button.label,
          })),
        };
      })(),
      projectiles: state.projectiles.map((proj) => ({
        x: Math.round(proj.x),
        y: Math.round(proj.y),
        owner: proj.owner,
        reflected: proj.reflected,
        shotStyle: proj.shotStyle || null,
        parryWindow: Number((proj.parryWindowTimer || 0).toFixed(2)),
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
    resetGame({ playMode: "tutorial" });
    render();
  });

  gmPrevBtn?.addEventListener("click", () => {
    if (triggerGmStageAction("previous")) render();
  });
  gmReplayBtn?.addEventListener("click", () => {
    if (triggerGmStageAction("replay")) render();
  });
  gmNextBtn?.addEventListener("click", () => {
    if (triggerGmStageAction("next")) render();
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    mouse.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
  });

  canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const pointerY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    mouse.x = pointerX;
    mouse.y = pointerY;
    if (isGameOverMenuActive()) {
      handleGameOverMenuClick(pointerX, pointerY);
      return;
    }
    if (isTutorialChoiceMenuActive()) {
      handleTutorialChoiceClick(pointerX, pointerY);
      return;
    }
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
    startTutorial() {
      resetGame({ playMode: "tutorial" });
    },
    startArena() {
      resetGame({ playMode: "arena" });
    },
    setTutorialStage(stage, status = "intro") {
      state.playMode = "tutorial";
      beginTutorialStage(stage, status);
    },
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
    triggerStageAction(action) {
      return triggerGmStageAction(action);
    },
    clickTutorialChoice(action) {
      return triggerGmStageAction(action);
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
    forcePlayerDeath() {
      state.player.hp = 0;
      state.player.deathRotationDir = state.player.facingSign || 1;
      beginState("dead");
    },
    primeBossTeleport() {
      const boss = state.enemies.find((enemy) => enemy.type === "boss");
      if (!boss) return false;
      boss.state = "evaluate";
      boss.stateTimer = 0;
      boss.cooldownTimer = 0;
      boss.teleportCooldownTimer = 0;
      boss.bossPatternCursor = 2;
      boss.bossLastAttack = "ranged";
      return true;
    },
    primeBossRanged() {
      const boss = state.enemies.find((enemy) => enemy.type === "boss");
      if (!boss) return false;
      boss.state = "ranged_windup";
      boss.stateTimer = 0;
      boss.cooldownTimer = 0;
      boss.attackResolved = false;
      return true;
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

  render();
  requestAnimationFrame(frame);
})();
