(function () {
  "use strict";

  var S = EPSF.state;
  var Lay = EPSF.layout;
  var UI = EPSF.ui;
  var Cover = EPSF.cover;

  EPSF.flip.requestFlip = function (dir) {
    if (S.coverAnimating || S.isJumping) return;

    if (S.isMobile) {
      if (!S.pageFlip || S.N <= 0) return;

      UI.hideHint();

      if (dir > 0) {
        if (S.currentIdx >= S.N - 1) return;
        S.pageFlip.flipNext("bottom");
      } else {
        if (S.currentIdx <= 0) return;
        S.pageFlip.flipPrev("bottom");
      }

      return;
    }

    if (S.viewMode === "front") {
      if (dir > 0) Cover.open();
      return;
    }

    if (!S.pageFlip || S.N <= 0) return;

    UI.hideHint();

    var atEnd = S.isPortrait
      ? (S.currentIdx >= S.N - 1)
      : (S.currentIdx >= S.lastSpreadIdx);

    if (dir > 0) {
      if (atEnd) return;
      S.pageFlip.flipNext("bottom");
    } else {
      if (S.currentIdx <= 0) Cover.closeToCover();
      else S.pageFlip.flipPrev("bottom");
    }
  };

  /*
    Move existing:
    - finishJump
    - jumpToInner
    - jumpToSpread
    - startHeld
    - stopHeld
    - heldLoop
  */
})();
