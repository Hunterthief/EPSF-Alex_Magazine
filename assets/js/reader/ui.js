(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;

  EPSF.ui.updateUIAll = function () {
    EPSF.layout.updateStacks();
    EPSF.ui.updateDock();
    EPSF.ui.updateHint();
    EPSF.ui.updateEnd();
  };

  EPSF.ui.wake = function () {
    D.reader.classList.remove("idle");
    clearTimeout(S.idleTimer);

    S.idleTimer = setTimeout(function () {
      if (!S.isJumping && !S.coverAnimating) {
        D.reader.classList.add("idle");
      }
    }, 2800);
  };

  EPSF.ui.failLoad = function (msg) {
    D.loader.classList.remove("gone");
    D.loader.classList.add("err");
    D.loaderTxt.textContent = msg;
  };

  /*
    Move existing:
    - updateDock
    - updateHint
    - updateEnd
    - showHint
    - hideHint
    - showEnd
    - hideEnd
    - showTip
    - hideTip
    - moveTip
    - showSparks
    - hideSparks
    - spawnSpark
    - ensureAudio
    - initSounds
    - playSparkBuffer
    - synthSpark
    - playSparkSound
  */
})();
