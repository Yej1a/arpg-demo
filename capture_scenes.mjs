const { chromium } = await import("file:///C:/Users/MSN/.codex/skills/develop-web-game/node_modules/playwright/index.mjs");
import fs from "node:fs";
import path from "node:path";

const outDir = "D:/Desktop/Rpg/output/web-game/scene-captures";
const groundY = 464;

fs.mkdirSync(outDir, { recursive: true });

async function advance(page, ms) {
  await page.evaluate(async (duration) => {
    await window.advanceTime(duration);
  }, ms);
}

async function getSnapshot(page) {
  return page.evaluate(() => window.__debugGame.getSnapshot());
}

async function waitForCondition(page, label, predicate, { timeoutMs = 1200, stepMs = 16 } = {}) {
  const maxSteps = Math.ceil(timeoutMs / stepMs);
  let snapshot = null;
  for (let index = 0; index < maxSteps; index += 1) {
    snapshot = await getSnapshot(page);
    if (predicate(snapshot)) return snapshot;
    await advance(page, stepMs);
  }
  throw new Error(`${label} timed out. Last snapshot: ${JSON.stringify(snapshot)}`);
}

async function setupPage(page) {
  await page.goto("file:///D:/Desktop/Rpg/index.html", { waitUntil: "domcontentloaded" });
  await page.click("#start-btn");
  await page.waitForTimeout(100);
}

async function resetScene(page) {
  await page.evaluate((y) => {
    window.__debugGame.resetGame();
    window.__debugGame.setPlayerPosition(590, y);
    window.__debugGame.setMousePosition(760, y - 40);
  }, groundY);
}

async function tapAttack(page, holdMs = 50, settleMs = 220) {
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, holdMs);
  await page.evaluate(() => window.__debugGame.releaseAttack());
  await advance(page, settleMs);
}

async function queueSwordComboA2(page) {
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 50);
  await page.evaluate(() => window.__debugGame.releaseAttack());
  await advance(page, 110);
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 30);
  await page.evaluate(() => window.__debugGame.releaseAttack());
}

async function queueSwordComboA3(page) {
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 50);
  await page.evaluate(() => window.__debugGame.releaseAttack());
  await advance(page, 110);
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 30);
  await page.evaluate(() => window.__debugGame.releaseAttack());
  await advance(page, 110);
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 40);
  await page.evaluate(() => window.__debugGame.releaseAttack());
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});

const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await setupPage(page);

const capture = async (name, fn) => {
  await resetScene(page);
  await fn();
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
};

await capture("sideview_sword_a1", async () => {
  await page.evaluate(() => window.__debugGame.setEncounterMode("melee"));
  await advance(page, 80);
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 120);
  await page.evaluate(() => window.__debugGame.releaseAttack());
});

await capture("sideview_sword_a2", async () => {
  await page.evaluate(() => window.__debugGame.setEncounterMode("idle"));
  await advance(page, 80);
  await queueSwordComboA2(page);
  await advance(page, 90);
});

await capture("sideview_sword_a3", async () => {
  await page.evaluate(() => window.__debugGame.setEncounterMode("idle"));
  await advance(page, 80);
  await queueSwordComboA3(page);
  await advance(page, 130);
});

await capture("sideview_jump_pose", async () => {
  await page.evaluate(() => window.__debugGame.setEncounterMode("idle"));
  await advance(page, 80);
  await page.evaluate(() => window.__debugGame.pressJump());
  await advance(page, 130);
});

await capture("sideview_platform_landing", async () => {
  await page.evaluate((y) => {
    window.__debugGame.setEncounterMode("idle");
    window.__debugGame.setPlayerPosition(220, y);
    window.__debugGame.setMousePosition(320, y - 40);
  }, groundY);
  await advance(page, 80);
  await page.evaluate(() => window.__debugGame.pressJump());
  await advance(page, 1000);
});

await capture("sideview_dash_action", async () => {
  await page.evaluate(() => window.__debugGame.setEncounterMode("ranged"));
  await advance(page, 100);
  await page.evaluate(() => window.__debugGame.pressDash());
  await advance(page, 90);
});

await capture("sideview_perfect_guard", async () => {
  await page.evaluate(() => window.__debugGame.setEncounterMode("melee"));
  await advance(page, 100);
  await page.evaluate(() => {
    window.__debugGame.startGuard();
    window.__debugGame.forceIncomingHit("melee");
  });
  await advance(page, 80);
});

await capture("sideview_gun_shot", async () => {
  await page.evaluate(() => {
    window.__debugGame.setEncounterMode("melee");
    window.__debugGame.pressSwitch();
  });
  await advance(page, 320);
  await page.evaluate(() => window.__debugGame.pressAttack());
  await advance(page, 170);
  await page.evaluate(() => window.__debugGame.releaseAttack());
});

await capture("sideview_enemy_sprite_set", async () => {
  await page.evaluate((y) => {
    window.__debugGame.setEncounterMode("mixed");
    window.__debugGame.setPlayerPosition(650, y);
    window.__debugGame.setMousePosition(760, y - 40);
  }, groundY);
  await advance(page, 280);
});

await capture("sideview_melee_enemy_attack", async () => {
  await page.evaluate((y) => {
    window.__debugGame.setEncounterMode("melee");
    window.__debugGame.setPlayerPosition(640, y);
    window.__debugGame.setMousePosition(760, y - 40);
  }, groundY);
  await advance(page, 760);
});

await capture("sideview_sword_ranged_chase", async () => {
  await page.evaluate((y) => {
    window.__debugGame.resetGame();
    window.__debugGame.setEncounterMode("ranged");
    window.__debugGame.setPlayerPosition(590, y);
    window.__debugGame.setMousePosition(760, y - 40);
    window.__debugGame.startGuard();
    window.__debugGame.forceIncomingHit("ranged");
  }, groundY);
  await waitForCondition(page, "ranged counter window", (snapshot) => snapshot.player.state === "counter_window");
  await page.evaluate(() => window.__debugGame.pressDash());
  await waitForCondition(
    page,
    "Sword_RangedChase start",
    (snapshot) => snapshot.player.state === "space_counter" && snapshot.player.activeAttackId === "Sword_RangedChase",
  );
  await advance(page, 32);
});

console.log(JSON.stringify({ ok: true, outDir }, null, 2));
await browser.close();
