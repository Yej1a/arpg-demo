(function () {
  const STAGE_ORDER = ["movement_tutorial", "melee_tutorial", "ranged_tutorial", "mixed_exam", "mini_boss", "done"];

  function createStageSegments({ width, world, stagePlatforms }) {
    const groundY = world.groundY;
    return {
      movement_tutorial: {
        id: "movement_tutorial",
        startX: world.left,
        endX: width * 0.43,
        anchors: {
          spawn: { x: 118, y: groundY },
          moveGate: { x: 154, y: groundY },
          jumpTakeoff: { x: 178, y: groundY },
          jumpLand: { x: 258, y: groundY - 46 },
          dashGate: { x: 326, y: groundY - 18 },
          dashLand: { x: 382, y: groundY },
          switchZone: { x: 404, y: groundY },
        },
        layout: {
          surfaces: [
            { id: "tutorial-ground-a", x: world.left, y: groundY, w: 126 },
            { id: "tutorial-jump-platform", x: 232, y: groundY - 46, w: 74 },
            { id: "tutorial-ground-b", x: 356, y: groundY, w: 94 },
          ],
          dashWall: { x: 320, y: groundY - 126, w: 18, h: 126 },
          switchPedestal: { x: 414, y: groundY - 28, w: 18, h: 28 },
        },
      },
      melee_tutorial: {
        id: "melee_tutorial",
        startX: width * 0.43,
        endX: width * 0.58,
        anchors: {
          center: { x: width * 0.49, y: groundY },
          enemySpawn: { x: width * 0.56, y: groundY },
        },
      },
      ranged_tutorial: {
        id: "ranged_tutorial",
        startX: width * 0.58,
        endX: width * 0.72,
        anchors: {
          center: { x: width * 0.64, y: groundY },
          enemySpawn: { x: stagePlatforms[2].x + stagePlatforms[2].w * 0.42, y: stagePlatforms[2].y },
        },
      },
      mixed_exam: {
        id: "mixed_exam",
        startX: width * 0.72,
        endX: width * 0.88,
        anchors: {
          center: { x: width * 0.8, y: groundY },
          meleeFront: { x: width * 0.79, y: groundY },
          meleeBack: { x: width * 0.86, y: groundY },
          ranged: { x: stagePlatforms[2].x + stagePlatforms[2].w * 0.42, y: stagePlatforms[2].y },
        },
      },
      mini_boss: {
        id: "mini_boss",
        startX: width * 0.88,
        endX: width - world.left,
        anchors: {
          center: { x: width * 0.92, y: groundY },
          bossSpawn: { x: width * 0.96, y: groundY },
        },
      },
    };
  }

  function createTutorialFlags() {
    return {
      moveDone: false,
      jumpDone: false,
      dashDone: false,
      switchDone: false,
      meleeParryDone: false,
      meleeFollowUpDone: false,
      meleeSwordParryDone: false,
      meleeGunParryDone: false,
      meleeSwordFollowUpDone: false,
      meleeGunFollowUpDone: false,
      rangedParryDone: false,
      rangedFollowUpDone: false,
      rangedSwordParryDone: false,
      rangedGunParryDone: false,
      rangedSwordFollowUpDone: false,
      rangedGunFollowUpDone: false,
      mixedMeleeFollowUpDone: false,
      mixedRangedFollowUpDone: false,
      miniBossStarted: false,
      miniBossDefeated: false,
    };
  }

  function createTutorialFlowState(env) {
    return {
      stage: "movement_tutorial",
      stageStatus: "intro",
      flags: createTutorialFlags(),
      stageSegments: createStageSegments(env),
    };
  }

  function resetTutorialFlow(flow) {
    flow.stage = "movement_tutorial";
    flow.stageStatus = "intro";
    flow.flags = createTutorialFlags();
    return flow;
  }

  function markTutorialFlag(flow, flag, value = true) {
    if (!flow.flags || !(flag in flow.flags)) return false;
    flow.flags[flag] = value;
    return true;
  }

  function setTutorialStage(flow, stage, stageStatus = "intro") {
    if (!STAGE_ORDER.includes(stage)) return false;
    flow.stage = stage;
    flow.stageStatus = stageStatus;
    return true;
  }

  function advanceTutorialStage(flow) {
    const currentIndex = STAGE_ORDER.indexOf(flow.stage);
    if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 1) return flow.stage;
    flow.stage = STAGE_ORDER[currentIndex + 1];
    flow.stageStatus = flow.stage === "done" ? "cleared" : "intro";
    return flow.stage;
  }

  function getTutorialSnapshot(flow) {
    return {
      stage: flow.stage,
      stageStatus: flow.stageStatus,
      flags: { ...flow.flags },
    };
  }

  window.TutorialFlow = {
    STAGE_ORDER,
    createStageSegments,
    createTutorialFlowState,
    resetTutorialFlow,
    markTutorialFlag,
    setTutorialStage,
    advanceTutorialStage,
    getTutorialSnapshot,
  };
})();
