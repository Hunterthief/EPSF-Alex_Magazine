(function () {
  "use strict";

  var S = EPSF.state;
  var Lay = EPSF.layout;
  var UI = EPSF.ui;
  var Med = EPSF.media;

  EPSF.flip.requestFlip = function (dir) {
    if (S.coverAnimating || S.isJumping) return;
    if (!S.pageFlip || S.N <= 0) return;

    UI.hideHint();

    var atEnd = S.isPortrait
      ? (S.currentIdx >= S.N - 1)
      : (S.currentIdx >= S.lastSpreadIdx);

    if (dir > 0) {
      if (atEnd) return;
      S.pageFlip.flipNext("bottom");
    } else {
      if (S.currentIdx <= 0) return;
      S.pageFlip.flipPrev("bottom");
    }
  };

  EPSF.flip.finishJump = function (token, idx) {
    if (token !== S.jumpToken) return;

    S.isJumping = false;
    UI.hideSparks();

    if (idx !== undefined) S.currentIdx = Lay.clampInner(idx);

    UI.updateUIAll();
    Med.syncForCurrentPage();
  };

  EPSF.flip.jumpToInner = function (target, sparks) {
    if (S.N <= 0) return;

    if (S.isPortrait) {
      target = Math.max(0, Math.min(S.N - 1, target));
    } else {
      target = Lay.clampInner(target);
    }

    if (!S.pageFlip) return;
    if (target === S.currentIdx) return;

    EPSF.flip.stopHeld();
    UI.hideHint();

    var token = ++S.jumpToken;
    S.isJumping = true;

    if (sparks) UI.showSparks(target > S.currentIdx ? 1 : -1);

    var dist = Math.abs(target - S.currentIdx);

    if (S.RM || dist > S.JUMP_ANIMATE_THRESHOLD) {
      try {
        S.pageFlip.turnToPage(target);
      } catch (e) {}

      S.currentIdx = target;

      setTimeout(function () {
        EPSF.flip.finishJump(token, target);
      }, 30);

      return;
    }

    try {
      S.pageFlip.flip(target, "bottom");
    } catch (e) {
      try {
        S.pageFlip.turnToPage(target);
      } catch (_) {}

      EPSF.flip.finishJump(token, target);
      return;
    }

    setTimeout(function () {
      EPSF.flip.finishJump(token);
    }, Math.min(1600, 700 + dist * 120));
  };

  EPSF.flip.jumpToSpread = function (targetSpread, sparks) {
    if (S.maxSpread < 1) return;

    targetSpread = Math.max(1, Math.min(S.maxSpread, targetSpread));

    EPSF.flip.jumpToInner(Lay.indexFromSpread(targetSpread), sparks);
  };

  EPSF.flip.startHeld = function (dir) {
    if (S.isJumping || S.coverAnimating) return;
    if (!S.pageFlip) return;
    if (S.heldDir === dir && S.heldLoopRunning) return;

    S.heldDir = dir;

    if (!S.heldLoopRunning) {
      S.heldLoopRunning = true;
      UI.showSparks(dir);
      EPSF.flip.heldLoop();
    }
  };

  EPSF.flip.stopHeld = function () {
    S.heldDir = 0;
    S.heldLoopRunning = false;
    UI.hideSparks();
  };

  EPSF.flip.heldLoop = function () {
    if (!S.heldLoopRunning || S.heldDir === 0 || S.isJumping) return;

    if (S.coverAnimating) {
      setTimeout(EPSF.flip.heldLoop, 60);
      return;
    }

    if (!S.pageFlip || S.sfState !== "read") {
      setTimeout(EPSF.flip.heldLoop, 60);
      return;
    }

    var atEnd = S.isPortrait
      ? (S.currentIdx >= S.N - 1)
      : (S.currentIdx >= S.lastSpreadIdx);

    if (S.heldDir > 0) {
      if (atEnd) {
        EPSF.flip.stopHeld();
        return;
      }

      EPSF.flip.requestFlip(1);
    } else {
      if (S.currentIdx <= 0) {
        EPSF.flip.stopHeld();
        return;
      }

      EPSF.flip.requestFlip(-1);
    }

    setTimeout(EPSF.flip.heldLoop, 90);
  };
})();
