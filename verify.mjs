const { chromium } = await import("file:///C:/Users/MSN/.codex/skills/develop-web-game/node_modules/playwright/index.mjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function advance(page, ms) {
  await page.evaluate(async (duration) => {
    await window.advanceTime(duration);
  }, ms);
}

async function snapshot(page) {
  return page.evaluate(() => window.__debugGame.getSnapshot());
}

async function tapAttack(page, holdMs = 50, settleMs = 260) {
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, holdMs);
  await page.evaluate(() => window.__debugGame.releaseAttack());
  await advance(page, settleMs);
}

async function waitForSnapshot(page, predicate, timeoutMs = 120, stepMs = 20) {
  let current = await snapshot(page);
  if (predicate(current)) return current;
  let elapsed = 0;
  while (elapsed < timeoutMs) {
    await advance(page, stepMs);
    elapsed += stepMs;
    current = await snapshot(page);
    if (predicate(current)) return current;
  }
  return current;
}

function getEnemy(state, type) {
  const tagged = state.player?.lastAttackerId ? state.enemies.find((enemy) => enemy.id === state.player.lastAttackerId && enemy.type === type) : null;
  if (tagged) return tagged;
  return state.enemies.find((enemy) => enemy.type === type) || null;
}

function getGroundRangedEnemy(state) {
  return state.enemies
    .filter((enemy) => enemy.type === "ranged")
    .sort((left, right) => right.y - left.y || right.x - left.x)[0] || null;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});

const page = await browser.newPage();
await page.goto("file:///D:/Desktop/Rpg/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.__debugGame.startArena());
await page.waitForTimeout(150);

const results = [];
const groundY = 464;

let current = await snapshot(page);
assert(current.mode === "running", "game did not start");
assert(current.enemies.length === 3, "mixed encounter should spawn three enemies on start");
assert(current.battleManager.wave === 1, "first wave should start at wave 1");
results.push({ test: "start", ok: true, enemies: current.enemies.length, wave: current.battleManager.wave });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("melee");
  window.__debugGame.setPlayerPosition(560, y);
  window.__debugGame.setMousePosition(700, y - 40);
}, groundY);
await advance(page, 160);
await page.keyboard.down("ArrowRight");
await page.evaluate(() => window.__debugGame.pressAttack());
await advance(page, 90);
await page.evaluate(() => window.__debugGame.releaseAttack());
current = await snapshot(page);
assert(current.player.state === "attack", "attack did not start while moving");
assert(current.player.x > 560, "player did not keep moving during attack");
results.push({ test: "moving attack", ok: true, x: current.player.x, state: current.player.state });
await page.keyboard.up("ArrowRight");
await advance(page, 260);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("idle");
  window.__debugGame.setPlayerPosition(560, y);
  window.__debugGame.setMousePosition(700, y - 40);
  window.__debugGame.pressJump();
}, groundY);
await advance(page, 160);
current = await snapshot(page);
assert(current.player.onGround === false, "jump should lift the player off the ground");
assert(current.player.y < groundY, "jump should move player upward");
results.push({ test: "jump rise", ok: true, y: current.player.y, vy: current.player.vy });
await advance(page, 900);
current = await snapshot(page);
assert(current.player.onGround === true, "player should land after jump");
assert(current.player.y === groundY, "landed player should return to ground line");
results.push({ test: "jump land", ok: true, y: current.player.y, onGround: current.player.onGround });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("idle");
  window.__debugGame.setPlayerPosition(560, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.pressJump();
}, groundY);
await advance(page, 120);
current = await snapshot(page);
const jumpDashStartY = current.player.y;
assert(current.player.onGround === false, "air dash setup should still be airborne before shift");
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 40);
current = await snapshot(page);
assert(current.player.state === "dash", "shift should trigger air dash");
assert(current.player.onGround === false, "air dash should not snap the player back to ground");
assert(current.player.y < groundY, "air dash should keep the player airborne");
assert(current.player.y <= jumpDashStartY + 4, "air dash should not yank the player back to the takeoff line");
results.push({ test: "air dash stays airborne", ok: true, y: current.player.y, onGround: current.player.onGround });
await advance(page, 420);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("idle");
  window.__debugGame.setPlayerPosition(220, y);
  window.__debugGame.setMousePosition(320, y - 40);
  window.__debugGame.pressJump();
}, groundY);
await advance(page, 1000);
current = await snapshot(page);
assert(current.player.onGround === true, "player should settle onto the platform");
assert(current.player.y === 392, "player should land on the left platform top");
results.push({ test: "platform landing", ok: true, y: current.player.y, onGround: current.player.onGround });

await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 220);
current = await snapshot(page);
assert(current.player.x > 316, "platform dash should carry the player past the platform edge");
assert(current.player.onGround === false, "platform dash should leave the player airborne after the edge");
assert(current.player.y > 392 && current.player.y < groundY, "platform dash should fall smoothly instead of snapping to ground");
results.push({ test: "platform dash edge fall", ok: true, x: current.player.x, y: current.player.y, onGround: current.player.onGround });
await advance(page, 500);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("idle");
  window.__debugGame.setPlayerPosition(220, y);
  window.__debugGame.setMousePosition(320, y - 40);
  window.__debugGame.pressJump();
}, groundY);
await advance(page, 1000);
current = await snapshot(page);
assert(current.player.onGround === true, "drop-through setup should settle onto the platform");
assert(current.player.y === 392, "drop-through setup should start on platform top");

await page.evaluate(() => window.__debugGame.pressDown());
await page.evaluate(() => window.__debugGame.pressJump());
await advance(page, 160);
current = await snapshot(page);
assert(current.player.onGround === false, "player should leave the platform when pressing S+Space");
assert(current.player.y > 392, "drop-through should move player below the platform height");
results.push({ test: "platform drop-through", ok: true, y: current.player.y, onGround: current.player.onGround });
await page.evaluate(() => window.__debugGame.releaseDown());
await advance(page, 700);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("melee");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(700, y - 40);
}, groundY);
await advance(page, 120);
await tapAttack(page, 50, 260);
current = await snapshot(page);
assert(getEnemy(current, "melee").hp < 120, "sword attack did not damage melee enemy");
results.push({ test: "sword hit", ok: true, enemyHp: getEnemy(current, "melee").hp });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("melee");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(700, y - 40);
  window.__debugGame.pressAttack();
}, groundY);
await advance(page, 50);
await page.evaluate(() => window.__debugGame.releaseAttack());
await advance(page, 110);
await page.evaluate(() => window.__debugGame.pressAttack());
await advance(page, 30);
await page.evaluate(() => window.__debugGame.releaseAttack());
await advance(page, 160);
current = await snapshot(page);
assert(current.player.activeAttackId === "Sword_A2" || current.player.comboIndex === 1, "second sword input should chain into A2");
results.push({ test: "sword combo to A2", ok: true, activeAttackId: current.player.activeAttackId, comboIndex: current.player.comboIndex });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("melee");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.pressSwitch();
}, groundY);
await advance(page, 320);
current = await snapshot(page);
assert(current.player.weapon === "gun", "normal weapon switch failed");
results.push({ test: "normal switch", ok: true, weapon: current.player.weapon });

await tapAttack(page, 50, 520);
current = await snapshot(page);
assert(getEnemy(current, "melee").hp < 120, "gun attack did not damage melee enemy");
assert(current.player.gunAmmo === 3, "first gun shot should consume one ammo orb");
results.push({ test: "gun hit", ok: true, enemyHp: getEnemy(current, "melee").hp, gunAmmo: current.player.gunAmmo });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("ranged");
  window.__debugGame.setPlayerPosition(760, y);
  window.__debugGame.setMousePosition(940, y - 92);
  window.__debugGame.pressSwitch();
}, groundY);
await advance(page, 320);
current = await snapshot(page);
const groundRangedEnemy = getGroundRangedEnemy(current);
assert(groundRangedEnemy, "ranged encounter should include a ground archer for collision coverage");
await page.evaluate((target) => {
  window.__debugGame.setMousePosition(target.x, target.y - 92);
}, groundRangedEnemy);
await tapAttack(page, 50, 520);
current = await snapshot(page);
const headshotEnemy = current.enemies.find((enemy) => enemy.id === groundRangedEnemy.id) || getGroundRangedEnemy(current);
assert(headshotEnemy && headshotEnemy.hp < 96, "gun attack aimed at ranged enemy head should damage it");
results.push({ test: "gun head hit ranged enemy", ok: true, enemyHp: headshotEnemy.hp, enemyId: headshotEnemy.id });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("idle");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.pressSwitch();
}, groundY);
await advance(page, 320);
current = await snapshot(page);
assert(current.player.weapon === "gun", "reload scenario should start in gun form");

await tapAttack(page, 50, 520);
await tapAttack(page, 50, 520);
await tapAttack(page, 50, 520);
await page.evaluate(() => window.__debugGame.pressAttack());
await advance(page, 50);
await page.evaluate(() => window.__debugGame.releaseAttack());
await advance(page, 920);
current = await snapshot(page);
assert(current.player.gunAmmo === 0, "fourth gun shot should empty ammo");
assert(current.player.gunReloadTimer > 0, "gun should start recharging");
results.push({ test: "gun reload start", ok: true, gunAmmo: current.player.gunAmmo, gunReloadTimer: current.player.gunReloadTimer });

await advance(page, 1450);
current = await snapshot(page);
assert(current.player.gunAmmo === 4, "gun ammo should refill after recharge");
assert(current.player.gunReloadTimer === 0, "gun recharge timer should end at full ammo");
results.push({ test: "gun reload finish", ok: true, gunAmmo: current.player.gunAmmo, gunReloadTimer: current.player.gunReloadTimer });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("ranged");
  window.__debugGame.setPlayerPosition(720, y);
}, groundY);
await advance(page, 360);
current = await snapshot(page);
const blinkEnemy = current.enemies.find((enemy) => enemy.type === "ranged" && enemy.blinkCooldown > 0) || getEnemy(current, "ranged");
assert(blinkEnemy !== null, "ranged enemy missing in blink scenario");
assert(blinkEnemy.blinkCooldown > 0, "ranged enemy should spend blink cooldown when player runs close");
assert(Math.abs(blinkEnemy.x - 720) > 120, "ranged enemy should blink away from close player pressure");
results.push({ test: "ranged blink retreat", ok: true, blinkCooldown: blinkEnemy.blinkCooldown, x: blinkEnemy.x });

await page.evaluate(() => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("mixed");
  window.__debugGame.defeatAllEnemies();
});
current = await snapshot(page);
assert(current.enemies.length === 0, "cleared wave should remove all current enemies");
await advance(page, 980);
current = await snapshot(page);
assert(current.enemies.length === 3, "next wave should respawn with three enemies");
assert(current.battleManager.wave === 2, "next wave should increment wave count");
results.push({ test: "wave respawn", ok: true, enemies: current.enemies.length, wave: current.battleManager.wave });

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("idle");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
}, groundY);
await advance(page, 120);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 80);
current = await snapshot(page);
assert(current.player.state === "dash", "shift did not trigger dash in normal state");
assert(current.player.dashCooldown > 0, "dash should start cooldown");
results.push({ test: "dash", ok: true, state: current.player.state, dashCooldown: current.player.dashCooldown });

await advance(page, 180);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 60);
current = await snapshot(page);
assert(current.player.state !== "dash", "dash should not retrigger during cooldown");
results.push({ test: "dash cooldown blocks retrigger", ok: true, state: current.player.state, dashCooldown: current.player.dashCooldown });

await advance(page, 360);
await page.evaluate(() => window.__debugGame.pressDash());
current = await waitForSnapshot(page, (state) => state.player.state === "dash", 120, 20);
assert(current.player.state === "dash", "dash should retrigger after cooldown ends");
results.push({ test: "dash cooldown ends", ok: true, state: current.player.state, dashCooldown: current.player.dashCooldown });
await advance(page, 260);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("melee");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.startGuard();
  window.__debugGame.forceIncomingHit("melee");
}, groundY);
current = await snapshot(page);
assert(current.player.hitstop > 0, "perfect guard should trigger visible hitstop");
assert(getEnemy(current, "melee").stagger > 0, "melee perfect guard should stagger melee enemy");
current = await waitForSnapshot(page, (state) => ["perfect_guard", "counter_window"].includes(state.player.state), 260, 20);
assert(current.player.lastParryType === "melee", "melee parry type not recorded");
assert(["perfect_guard", "counter_window"].includes(current.player.state), "melee perfect guard did not open follow-up state");
if (current.player.state === "perfect_guard") {
  current = await waitForSnapshot(page, (state) => state.player.state === "counter_window", 220, 20);
}
assert(current.counterPromptTitle === "破势重斩", "sword melee follow-up should preview break slash");
assert(current.counterPromptRole === "高伤惩罚", "sword melee follow-up should preview its high-damage role");
results.push({ test: "melee perfect guard", ok: true, state: current.player.state });

await page.evaluate(() => window.__debugGame.pressAttack());
await advance(page, 40);
await page.evaluate(() => window.__debugGame.releaseAttack());
current = await snapshot(page);
assert(current.player.state === "counter_window", "left click should not trigger melee parry follow-up");
results.push({ test: "melee parry ignores lmb", ok: true, state: current.player.state });

await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 120);
current = await snapshot(page);
assert(current.player.state === "space_counter", "shift in counter window did not trigger sword melee follow-up");
assert(current.player.weapon === "sword", "sword melee follow-up should keep sword form");
assert(current.player.activeAttackId === "Sword_MeleeBreak", "sword melee follow-up should use guard break slash");
results.push({ test: "sword form melee follow-up", ok: true, activeAttackId: current.player.activeAttackId });
await advance(page, 450);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("ranged");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.startGuard();
  window.__debugGame.forceIncomingHit("ranged");
}, groundY);
current = await waitForSnapshot(page, (state) => ["perfect_guard", "counter_window"].includes(state.player.state), 320, 20);
assert(current.player.lastParryType === "ranged", "ranged parry type not recorded");
assert(["perfect_guard", "counter_window"].includes(current.player.state), "ranged perfect guard did not open follow-up state");
if (current.player.state === "perfect_guard") {
  current = await waitForSnapshot(page, (state) => state.player.state === "counter_window", 220, 20);
}
assert(current.player.counterPrompt > 0, "counter window should show follow-up prompt");
assert(current.counterPromptTitle === "追影突进", "sword ranged follow-up should preview chase step");
assert(current.counterPromptRole === "位移追击", "sword ranged follow-up should preview its gap-close role");
assert(getEnemy(current, "ranged").noBlink > 0, "ranged perfect guard should open no-blink window on ranged enemy");
results.push({ test: "ranged perfect guard", ok: true, state: current.player.state });

await tapAttack(page, 40, 40);
current = await snapshot(page);
assert(current.player.state === "counter_window", "left click should not trigger ranged parry follow-up");
results.push({ test: "ranged parry ignores lmb", ok: true, state: current.player.state });

await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 120);
current = await snapshot(page);
assert(current.player.state === "space_counter", "shift in ranged counter window did not trigger sword ranged follow-up");
assert(current.player.weapon === "sword", "sword ranged follow-up should keep sword form");
assert(current.player.activeAttackId === "Sword_RangedChase", "sword ranged follow-up should use chase slash");
results.push({ test: "sword form ranged follow-up", ok: true, activeAttackId: current.player.activeAttackId });
await advance(page, 450);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("melee");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.pressSwitch();
}, groundY);
await advance(page, 320);
await page.evaluate((y) => {
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.startGuard();
  window.__debugGame.forceIncomingHit("melee");
}, groundY);
await advance(page, 180);
current = await snapshot(page);
assert(current.player.lastParryType === "melee", "gun form melee parry type not recorded");
assert(current.counterPromptTitle === "震退爆轰", "gun melee follow-up should preview repel blast");
assert(current.counterPromptRole === "击退控场", "gun melee follow-up should preview its knockback role");
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 120);
current = await snapshot(page);
assert(current.player.state === "space_counter", "shift in gun form melee guard did not trigger gun melee follow-up");
assert(current.player.weapon === "gun", "gun melee follow-up should keep gun form");
assert(current.player.activeAttackId === "Gun_MeleeRepel", "gun melee follow-up should use repel blast");
results.push({ test: "gun form melee follow-up", ok: true, activeAttackId: current.player.activeAttackId });
await advance(page, 450);

await page.evaluate((y) => {
  window.__debugGame.resetGame();
  window.__debugGame.setEncounterMode("ranged");
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.pressSwitch();
}, groundY);
await advance(page, 320);
await page.evaluate((y) => {
  window.__debugGame.setPlayerPosition(590, y);
  window.__debugGame.setMousePosition(760, y - 40);
  window.__debugGame.startGuard();
  window.__debugGame.forceIncomingHit("ranged");
}, groundY);
await advance(page, 180);
current = await snapshot(page);
assert(current.player.lastParryType === "ranged", "gun form ranged parry type not recorded");
assert(current.counterPromptTitle === "破甲射击", "gun ranged follow-up should preview armor break");
assert(current.counterPromptRole === "远程破防", "gun ranged follow-up should preview its ranged-break role");
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 120);
current = await snapshot(page);
assert(current.player.state === "space_counter", "shift in gun form ranged guard did not trigger gun ranged follow-up");
assert(current.player.weapon === "gun", "gun ranged follow-up should keep gun form");
assert(current.player.activeAttackId === "Gun_RangedBreak", "gun ranged follow-up should use armor break shot");
results.push({ test: "gun form ranged follow-up", ok: true, activeAttackId: current.player.activeAttackId });

await page.evaluate((y) => {
  window.__debugGame.startTutorial();
  window.__debugGame.setMousePosition(760, y - 40);
}, groundY);
await advance(page, 80);
current = await snapshot(page);
assert(current.playMode === "tutorial", "tutorial mode should start through debug helper");
assert(current.tutorialFlow.stage === "movement_tutorial", "tutorial should begin at movement stage");
assert(current.enemies.length === 0, "movement tutorial should start without enemies");
results.push({ test: "tutorial start", ok: true, stage: current.tutorialFlow.stage, enemies: current.enemies.length });

await page.keyboard.down("ArrowRight");
await advance(page, 220);
await page.keyboard.up("ArrowRight");
current = await snapshot(page);
assert(current.tutorialFlow.flags.moveDone === true, "movement tutorial should mark move after crossing first gate");
results.push({ test: "tutorial move gate", ok: true, moveDone: current.tutorialFlow.flags.moveDone, x: current.player.x });

await page.evaluate((y) => {
  window.__debugGame.setPlayerPosition(258, y - 46);
}, groundY);
await advance(page, 34);
current = await snapshot(page);
assert(current.tutorialFlow.flags.jumpDone === true, "movement tutorial should mark jump after reaching jump platform");
results.push({ test: "tutorial jump landing", ok: true, jumpDone: current.tutorialFlow.flags.jumpDone, y: current.player.y });

await page.evaluate((y) => {
  window.__debugGame.setPlayerPosition(314, y);
  window.__debugGame.pressDash();
}, groundY);
await advance(page, 80);
current = await snapshot(page);
assert(current.tutorialFlow.flags.dashDone === true, "movement tutorial should mark dash after crossing dash wall");
results.push({ test: "tutorial dash wall", ok: true, dashDone: current.tutorialFlow.flags.dashDone, x: current.player.x });

await page.evaluate((y) => {
  window.__debugGame.setPlayerPosition(404, y);
  window.__debugGame.pressSwitch();
}, groundY);
await advance(page, 120);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "movement_tutorial", "movement tutorial should remain current until the player chooses the next stage");
assert(current.tutorialFlow.stageStatus === "cleared", "movement tutorial should clear after the switch zone requirement");
assert(current.tutorialChoiceMenu?.buttons?.length === 3, "movement tutorial should show a three-button choice menu after clear");
assert(current.tutorialChoiceMenu?.buttons?.[0]?.label === "上一关", "choice menu should expose previous-stage label");
assert(current.tutorialChoiceMenu?.buttons?.[1]?.label === "重玩本关", "choice menu should expose replay label");
assert(current.tutorialChoiceMenu?.buttons?.[2]?.label === "下一关", "choice menu should expose next-stage label");
assert(current.tutorialChoiceMenu?.selectedAction === "replay", "choice menu should default selection to replay");
await page.evaluate(() => {
  window.__debugGame.clickTutorialChoice("next");
});
await advance(page, 1000);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "melee_tutorial", "movement tutorial should advance into melee tutorial after selecting next");
assert(current.enemies.length === 1 && current.enemies[0].type === "melee", "melee tutorial should spawn exactly one melee enemy");
results.push({ test: "tutorial advance to melee", ok: true, stage: current.tutorialFlow.stage, enemies: current.enemies.length, enemyType: current.enemies[0]?.type });

await page.evaluate(() => {
  window.__debugGame.startArena();
  window.__debugGame.setTutorialStage("melee_tutorial");
});
await advance(page, 80);
await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("melee");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);
current = await snapshot(page);
assert(current.tutorialFlow.flags.meleeSwordFollowUpDone === true, "melee tutorial should record sword follow-up");
assert(current.tutorialFlow.stage === "melee_tutorial", "melee tutorial should not advance after only the sword branch");
results.push({ test: "tutorial melee sword branch", ok: true, swordDone: current.tutorialFlow.flags.meleeSwordFollowUpDone, stage: current.tutorialFlow.stage });

await page.evaluate(() => {
  window.__debugGame.pressSwitch();
});
await advance(page, 260);
await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("melee");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);
current = await snapshot(page);
assert(current.tutorialFlow.flags.meleeGunFollowUpDone === true, "melee tutorial should record gun follow-up");
assert(current.tutorialFlow.stageStatus === "cleared", "melee tutorial should clear after both weapon branches are completed");
assert(current.tutorialChoiceMenu?.buttons?.length === 3, "melee tutorial should show a three-button choice menu after clear");
results.push({ test: "tutorial melee gun branch", ok: true, gunDone: current.tutorialFlow.flags.meleeGunFollowUpDone, stageStatus: current.tutorialFlow.stageStatus });

await page.evaluate(() => {
  window.__debugGame.clickTutorialChoice("replay");
});
await advance(page, 1000);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "melee_tutorial", "melee tutorial should support repeating the same stage from the left side");
assert(current.tutorialFlow.stageStatus === "active", "restarting melee tutorial should return it to active status");
results.push({ test: "tutorial melee repeat choice", ok: true, stage: current.tutorialFlow.stage, stageStatus: current.tutorialFlow.stageStatus });

await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("melee");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);
await page.evaluate(() => {
  window.__debugGame.pressSwitch();
});
await advance(page, 260);
await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("melee");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);

await page.evaluate(() => {
  window.__debugGame.clickTutorialChoice("next");
});
await advance(page, 1000);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "ranged_tutorial", "melee tutorial should only advance after the player chooses to move to the exit zone");
results.push({ test: "tutorial melee exit choice", ok: true, stage: current.tutorialFlow.stage });

await page.evaluate(() => {
  window.__debugGame.setTutorialStage("ranged_tutorial");
});
await advance(page, 80);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "ranged_tutorial", "debug stage jump should enter ranged tutorial");
assert(current.enemies.length === 1 && current.enemies[0].type === "ranged", "ranged tutorial should spawn one ranged enemy");
assert(current.tutorialCoach.labels[0]?.text === "先用刀完成派生", "ranged tutorial should expose updated teacher-style coach text");
results.push({ test: "tutorial ranged coach", ok: true, coach: current.tutorialCoach.labels[0]?.text, enemies: current.enemies.length });

await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("ranged");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);
current = await snapshot(page);
assert(current.tutorialFlow.flags.rangedSwordFollowUpDone === true, "ranged tutorial should record sword follow-up");
assert(current.tutorialFlow.stage === "ranged_tutorial", "ranged tutorial should stay current after only the sword branch");
results.push({ test: "tutorial ranged sword branch", ok: true, swordDone: current.tutorialFlow.flags.rangedSwordFollowUpDone, stage: current.tutorialFlow.stage });

await page.evaluate(() => {
  window.__debugGame.pressSwitch();
});
await advance(page, 260);
await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("ranged");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);
current = await snapshot(page);
assert(current.tutorialFlow.flags.rangedGunFollowUpDone === true, "ranged tutorial should record gun follow-up");
assert(current.tutorialFlow.stageStatus === "cleared", "ranged tutorial should clear after both weapon branches are completed");
assert(current.tutorialChoiceMenu?.buttons?.length === 3, "ranged tutorial should show a three-button choice menu after clear");
results.push({ test: "tutorial ranged gun branch", ok: true, gunDone: current.tutorialFlow.flags.rangedGunFollowUpDone, stageStatus: current.tutorialFlow.stageStatus });

await page.evaluate(() => {
  window.__debugGame.clickTutorialChoice("replay");
});
await advance(page, 1000);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "ranged_tutorial", "ranged tutorial should support repeating the same stage from the left side");
assert(current.tutorialFlow.stageStatus === "active", "restarting ranged tutorial should return it to active status");
results.push({ test: "tutorial ranged repeat choice", ok: true, stage: current.tutorialFlow.stage, stageStatus: current.tutorialFlow.stageStatus });

await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("ranged");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);
await page.evaluate(() => {
  window.__debugGame.pressSwitch();
});
await advance(page, 260);
await page.evaluate(() => {
  window.__debugGame.forceCounterWindow("ranged");
});
await advance(page, 40);
await page.evaluate(() => window.__debugGame.pressDash());
await advance(page, 700);

await page.evaluate(() => {
  window.__debugGame.clickTutorialChoice("next");
});
await advance(page, 1000);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "mixed_exam", "ranged tutorial should only advance after the player chooses to move to the exit zone");
results.push({ test: "tutorial ranged exit choice", ok: true, stage: current.tutorialFlow.stage });

await page.evaluate(() => {
  window.__debugGame.setTutorialStage("ranged_tutorial", "cleared");
});
await advance(page, 60);
current = await snapshot(page);
assert(current.tutorialChoiceMenu?.selectedAction === "replay", "cleared ranged tutorial should default the menu selection to replay");
await page.keyboard.down("ArrowLeft");
await advance(page, 40);
await page.keyboard.up("ArrowLeft");
current = await snapshot(page);
assert(current.tutorialChoiceMenu?.selectedAction === "previous", "left arrow should move tutorial choice selection to previous");
await page.keyboard.down("Enter");
await advance(page, 40);
await page.keyboard.up("Enter");
await advance(page, 1000);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "melee_tutorial", "confirming previous should move back to the prior tutorial stage");
results.push({ test: "tutorial previous choice keyboard", ok: true, stage: current.tutorialFlow.stage });

await page.evaluate(() => {
  window.__debugGame.setTutorialStage("mixed_exam");
});
await advance(page, 80);
current = await snapshot(page);
assert(current.tutorialFlow.stage === "mixed_exam", "debug stage jump should enter mixed tutorial");
assert(current.enemies.length === 3, "mixed tutorial should spawn 2 melee + 1 ranged");
assert(current.tutorialCoach.checklist?.title === "混合验证目标", "mixed tutorial should expose checklist coach panel");
results.push({ test: "tutorial mixed coach", ok: true, checklist: current.tutorialCoach.checklist?.title, enemies: current.enemies.length });

console.log(JSON.stringify({ ok: true, results }, null, 2));
await browser.close();
