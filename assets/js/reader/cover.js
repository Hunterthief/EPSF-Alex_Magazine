(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;
  var L = EPSF.loaders;
  var Lay = EPSF.layout;
  var UI = EPSF.ui;
  var Med = EPSF.media;

  var TURN_COVER_TEMPLATE =
    '<div class="turn-page page turn-cover-front hard">' +
      '<img id="turn-cover-front-img" alt="Magazine cover" draggable="false">' +
    '</div>' +
    '<div class="turn-page page turn-cover-inside"></div>';

  function clearCoverWatchdog() {
    if (S.coverWatchdogTimer) {
      clearTimeout(S.coverWatchdogTimer);
      S.coverWatchdogTimer = null;
    }
  }

  function startCoverWatchdog(mode) {
    clearCoverWatchdog();

    var ms = S.RM ? 250 : 1500;

    S.coverWatchdogTimer = setTimeout(function () {
      S.coverWatchdogTimer = null;

      if (D.reader.hidden) return;

      if (mode === "open" && S.viewMode === "front" && S.coverAnimating) {
        EPSF.cover.finishOpen();
      } else if (
        mode === "close" &&
        S.viewMode === "book" &&
        S.coverAnimating &&
        S.currentIdx === 0
      ) {
        EPSF.cover.finishClose();
      }
    }, ms);
  }

  function positionTurnCover() {
    if (!D.turnCover) return;

    D.turnCover.style.width = S.pageW + "px";
    D.turnCover.style.height = S.pageH + "px";
    D.turnCover.style.top = "0px";
    D.turnCover.style.left = (S.isPortrait ? 0 : S.pageW / 2) + "px";
  }

  function destroyCoverTurn(hide) {
    if (S.turnCoverJQ) {
      try {
        S.turnCoverJQ.turn("destroy");
      } catch (e) {}

      S.turnCoverJQ = null;
    }

    S.turnCoverReady = false;

    if (D.turnCover) {
      D.turnCover.classList.remove("turn-ready");

      if (hide !== false) {
        D.turnCover.hidden = true;
      }
    }
  }

  function buildCoverTurn() {
    if (!D.turnCover || S.isMobile) return false;
    if (!L.TQ || !L.TQ.fn || !L.TQ.fn.turn) return false;

    destroyCoverTurn(false);

    D.turnCover.innerHTML = TURN_COVER_TEMPLATE;
    positionTurnCover();

    var img = D.turnCover.querySelector("#turn-cover-front-img");
    if (img) img.src = U.pageUrl(1);

    D.turnCover.hidden = !(S.viewMode === "front" || S.coverAnimating);

    try {
      S.turnCoverJQ = L.TQ(D.turnCover);

      S.turnCoverJQ.turn({
        width: S.pageW,
        height: S.pageH,
        display: "single",
        autoCenter: false,
        direction: "ltr",
        duration: S.RM ? 0 : 620,
        acceleration: true,
        gradients: true,
        when: {
          turning: onCoverTurning,
          turned: onCoverTurned
        }
      });

      D.turnCover.classList.add("turn-ready");
      S.turnCoverReady = true;

      return true;
    } catch (e) {
      S.turnCoverJQ = null;
      S.turnCoverReady = false;
      return false;
    }
  }

  function setTurnPageInstant(jq, page) {
    if (!jq) return;

    try {
      jq.turn("options", "duration", 0);
      jq.turn("turn", page, true);
      jq.turn("options", "duration", S.RM ? 0 : 620);
      return;
    } catch (e) {}

    try {
      jq.turn("page", page);
    } catch (e2) {}
  }

  function onCoverTurning(e, page, obj) {
    var p = parseInt(page, 10);

    D.bookWrap.classList.add("turning-cover");

    UI.ensureAudio();
    UI.playSparkSound();

    if (p === 2) UI.showSparks(-1);
    else if (p === 1) UI.showSparks(1);
  }

  function onCoverTurned(e, page, obj) {
    var p = parseInt(page, 10);

    UI.hideSparks();

    if (p === 2) {
      EPSF.cover.finishOpen();
    } else {
      EPSF.cover.finishClose();
    }
  }

  EPSF.cover.finishOpen = function () {
    clearCoverWatchdog();

    if (S.viewMode === "book" && !S.coverAnimating) return;

    S.viewMode = "book";
    S.currentIdx = 0;
    S.coverAnimating = false;

    D.bookWrap.classList.remove("cover-mode", "turning-cover", "back-mode");

    destroyCoverTurn(false);

    if (D.turnCover) {
      D.turnCover.hidden = true;
      D.turnCover.style.pointerEvents = "";
    }

    if (S.pageFlip && S.N > 0) {
      try {
        S.pageFlip.turnToPage(0);
      } catch (e) {}
    }

    UI.updateUIAll();
    Med.syncForCurrentPage();
    UI.wake();
  };

  EPSF.cover.finishClose = function () {
    clearCoverWatchdog();

    if (S.viewMode === "front" && !S.coverAnimating) return;

    S.viewMode = "front";
    S.currentIdx = 0;
    S.coverAnimating = false;

    D.bookWrap.classList.add("cover-mode");
    D.bookWrap.classList.remove("turning-cover", "back-mode");

    destroyCoverTurn(false);

    if (D.turnCover) {
      D.turnCover.innerHTML = TURN_COVER_TEMPLATE;
      positionTurnCover();

      var img = D.turnCover.querySelector("#turn-cover-front-img");
      if (img) img.src = U.pageUrl(1);

      D.turnCover.hidden = false;
      D.turnCover.style.pointerEvents = "";
    }

    if (S.pageFlip && S.N > 0) {
      try {
        S.pageFlip.turnToPage(0);
      } catch (e) {}
    }

    Med.clearOverlays();
    UI.updateUIAll();
    UI.wake();
  };

  EPSF.cover.open = function () {
    if (S.isMobile || S.viewMode !== "front" || S.coverAnimating) return;

    UI.ensureAudio();
    UI.playSparkSound();

    S.coverAnimating = true;
    UI.hideHint();
    Med.clearOverlays();

    D.bookWrap.classList.add("turning-cover");

    startCoverWatchdog("open");

    L.ensureTurnJS().then(function () {
      if (S.viewMode !== "front" || !S.coverAnimating) return;

      if (!S.turnCoverReady) buildCoverTurn();

      if (!S.turnCoverReady) {
        EPSF.cover.finishOpen();
        return;
      }

      D.turnCover.hidden = false;
      setTurnPageInstant(S.turnCoverJQ, 1);

      requestAnimationFrame(function () {
        if (S.turnCoverJQ) {
          S.turnCoverJQ.turn("turn", 2, true);
        } else {
          EPSF.cover.finishOpen();
        }
      });
    }).catch(function () {
      EPSF.cover.finishOpen();
    });
  };

  EPSF.cover.closeToCover = function () {
    if (
      S.isMobile ||
      S.viewMode !== "book" ||
      S.coverAnimating ||
      S.currentIdx !== 0
    ) {
      return;
    }

    UI.ensureAudio();
    UI.playSparkSound();

    S.coverAnimating = true;
    UI.hideHint();
    Med.clearOverlays();

    D.bookWrap.classList.add("cover-mode", "turning-cover");

    startCoverWatchdog("close");

    L.ensureTurnJS().then(function () {
      if (S.viewMode !== "book" || !S.coverAnimating) return;

      if (!S.turnCoverReady) buildCoverTurn();

      if (!S.turnCoverReady) {
        EPSF.cover.finishClose();
        return;
      }

      D.turnCover.hidden = false;
      setTurnPageInstant(S.turnCoverJQ, 2);

      requestAnimationFrame(function () {
        if (S.turnCoverJQ) {
          S.turnCoverJQ.turn("turn", 1, true);
        } else {
          EPSF.cover.finishClose();
        }
      });
    }).catch(function () {
      EPSF.cover.finishClose();
    });
  };

  EPSF.cover.forceFront = function () {
    clearCoverWatchdog();

    S.coverAnimToken++;
    S.coverAnimating = false;

    destroyCoverTurn(false);

    S.viewMode = "front";
    S.currentIdx = 0;

    D.bookWrap.classList.add("cover-mode");
    D.bookWrap.classList.remove("turning-cover", "back-mode");

    if (D.turnCover) {
      D.turnCover.hidden = false;
      D.turnCover.innerHTML = TURN_COVER_TEMPLATE;
      positionTurnCover();

      var img = D.turnCover.querySelector("#turn-cover-front-img");
      if (img) img.src = U.pageUrl(1);
    }

    if (S.pageFlip && S.N > 0) {
      try {
        S.pageFlip.turnToPage(0);
      } catch (e) {}
    }

    Med.clearOverlays();
    UI.updateUIAll();
  };

  EPSF.cover.forceBook = function (idx) {
    clearCoverWatchdog();

    S.coverAnimToken++;
    S.coverAnimating = false;

    destroyCoverTurn(true);

    S.viewMode = "book";

    D.bookWrap.classList.remove("cover-mode", "turning-cover", "back-mode");

    if (S.pageFlip && S.N > 0) {
      var t = Lay.clampInner(idx);

      try {
        S.pageFlip.turnToPage(t);
      } catch (e) {}

      S.currentIdx = t;
    }

    UI.updateUIAll();
    Med.syncForCurrentPage();
  };

  EPSF.cover.bindClick = function () {
    if (!D.turnCover) return;

    D.turnCover.addEventListener("click", function () {
      if (S.viewMode === "front" && !S.coverAnimating) {
        EPSF.cover.open();
      }
    });
  };

  EPSF.cover.position = positionTurnCover;
  EPSF.cover.destroy = destroyCoverTurn;
  EPSF.cover.build = buildCoverTurn;
  EPSF.cover.clearWatchdog = clearCoverWatchdog;
})();
