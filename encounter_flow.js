(function () {
  function createEncounterController(deps) {
    const { state, config, enemySpawnPoints, encounterSpawnLayouts, createEnemy, isEnemyAlive } = deps;

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
      const override = state.encounterOverride;
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

      if (override?.explicitLayout?.length) {
        state.battleManager.wave += 1;
        state.battleManager.waveSize = override.explicitLayout.length;
        if (typeof override.maxMeleeAttackers === "number") {
          state.battleManager.maxMeleeAttackers = override.maxMeleeAttackers;
        }
        if (typeof override.maxRangedAttackers === "number") {
          state.battleManager.maxRangedAttackers = override.maxRangedAttackers;
        }
        for (const slot of override.explicitLayout) {
          state.enemies.push(createEnemy(slot.type, slot.x, slot.y));
        }
        state.battleManager.livingEnemies = state.enemies.length;
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
      if (state.encounterOverride) {
        if (typeof state.encounterOverride.maxMeleeAttackers === "number") {
          state.battleManager.maxMeleeAttackers = state.encounterOverride.maxMeleeAttackers;
        }
        if (typeof state.encounterOverride.maxRangedAttackers === "number") {
          state.battleManager.maxRangedAttackers = state.encounterOverride.maxRangedAttackers;
        }
      }
      spawnEncounter(mode);
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

    function getEncounterInfoText(mode) {
      if (mode === "idle") return "遭遇：空场";
      if (mode === "melee") return "遭遇：近战";
      if (mode === "ranged") return "遭遇：远程";
      return "遭遇：混合";
    }

    function setDummyAttackMode(mode, options = {}) {
      const { render } = options;
      const nextMode = mode === "cycle" ? "mixed" : mode;
      state.encounterMode = nextMode;
      if (state.mode === "running") {
        resetEncounterFlow(nextMode);
      }
      state.infoText = getEncounterInfoText(nextMode);
      state.infoTextTimer = 0.45;
      if (typeof render === "function") render();
    }

    function updateEncounterFlow(dt) {
      const override = state.encounterOverride;
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
        if (override?.autoRespawn === false) return;
        if (typeof override?.maxWaves === "number" && state.battleManager.wave >= override.maxWaves) return;
        state.battleManager.awaitingNextWave = true;
        state.battleManager.nextWaveTimer = override?.respawnDelay ?? config.battle.waveRespawnDelay;
        state.infoText = `第 ${state.battleManager.wave} 波完成`;
        state.infoTextTimer = 0.6;
        return;
      }

      state.battleManager.nextWaveTimer = Math.max(0, state.battleManager.nextWaveTimer - dt);
      if (state.battleManager.nextWaveTimer <= 0) {
        spawnEncounter(state.encounterMode);
      }
    }

    return {
      createBattleManager,
      getWaveTypes,
      getEnemySpawnPoint,
      spawnEncounter,
      resetEncounterFlow,
      resolveDummyAttackMode,
      setDummyAttackMode,
      updateEncounterFlow,
    };
  }

  window.createEncounterController = createEncounterController;
})();
