(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;
  var UI = EPSF.ui;
  var Med = EPSF.media;
  var Lay = EPSF.layout;

  var DURATION = S.RM ? 1 : 900;

  var TEMPLATE =
    '<div class="cover-leaf">' +
      '<div class="cover-face cover-front">' +
        '<img id="turn-cover-front-img" alt="Magazine cover" draggable="false">' +
      '</div>' +
      '<div class="cover-face cover-back"></div>' +
    '</div>';

  var activeLeafHandler = null;

  function clearWatchdog() {
    if (S.coverWatchdogTimer) {
      clearTimeout(S.coverWatchdogTimer);
      S.coverWatchdogTimer = null;
    }
  }

  function getLeaf() {
    return D.turnCover ? D.turnCover.querySelector(".cover-leaf") : null;
  }

  function detachLeafListener() {
    var leaf = getLeaf();

    if (leaf && activeLeafHandler) {
      leaf.removeEventListener("animationend", activeLeafHandler);
      activeLeafHandler = null;
    }
  }

  function ensureDom() {
    if (!D.turnCover) return null;

    if (!D.turnCover.querySelector(".cover-leaf")) {
      D.turnCover.innerHTML = TEMPLATE;
    }

    var img = D.turnCover.querySelector("#turn-cover-front-img");

    if (img && S.pagesUrl) {
      img.src = U.pageUrl(1);
    }

    return getLeaf();
  }

  function setSize() {
    if (!D.turnCover) return;

    D.turnCover.style.width = S.pageW + "px";
    D.turnCover.style.height = S.pageH + "px";
    D.turnCover.style.top = "0px";

    /*
      IMPORTANT:
      On desktop, the cover must sit in the RIGHT page position.

      bookWrap width = pageW * 2
      left page  = 0 to pageW
      right page = pageW to pageW * 2

      So the cover leaf starts at pageW.
    */
    D.turnCover.style.left = (S.isPortrait ? 0 : S.pageW) + "px";
  }

  function setInstant(deg, opacity) {
    var leaf = getLeaf();
    if (!leaf) return;

    detachLeafListener();

    leaf.style.animation = "none";
    leaf.style.transform = "rotateY(" + deg + "deg)";
    leaf.style.opacity = String(opacity);

    void leaf.offsetWidth;

    leaf.style.animation = "";
  }

  function showClosed() {
    if (S.isMobile || !D.turnCover) return;

    ensureDom();
    setSize();

    D.turnCover.hidden = false;
    D.turnCover.classList.remove("cover-opening", "cover-closing", "animating");
    D.turnCover.classList.add("cover-closed");
    D.turnCover.style.pointerEvents = "auto";

    setInstant(0, 1);
  }

  function hideCover() {
    if (!D.turnCover) return;

    detachLeafListener();

    D.turnCover.hidden = true;
    D.turnCover.classList.remove("cover-closed", "cover-opening", "cover-closing", "animating");
    D.turnCover.style.pointerEvents = "";
  }

  function runAnimation(mode, done) {
    var leaf = ensureDom();

    if (!leaf || !D.turnCover) {
      done();
      return;
    }

    setSize();
    detachLeafListener();
    clearWatchdog();

    D.turnCover.hidden = false;
    D.turnCover.style.setProperty("--cover-duration", DURATION + "ms");

    D.turnCover.classList.remove("cover-closed", "cover-opening", "cover-closing", "animating");

    void D.turnCover.offsetWidth;

    D.turnCover.classList.add(
      "animating",
      mode === "open" ? "cover-opening" : "cover-closing"
    );

    var animName = mode === "open" ? "coverOpen" : "coverClose";
    var finished = false;

    function finish() {
      if (finished) return;

      finished = true;

      clearWatchdog();
      detachLeafListener();
      done();
    }

    function onEnd(e) {
      if (e.target === leaf && e.animationName === animName) {
        finish();
      }
    }

    activeLeafHandler = onEnd;
    leaf.addEventListener("animationend", onEnd);

    /*
      Safety watchdog.
      If animationend never fires for any browser reason, the cover still resolves.
    */
    S.coverWatchdogTimer = setTimeout(finish, DURATION + 700);
  }

  EPSF.cover.finishOpen = function () {
    clearWatchdog();
    detachLeafListener();

    if (S.viewMode === "book" && !S.coverAnimating) return;

    S.viewMode = "book";
    S.currentIdx = 0;
    S.coverAnimating = false;

    D.bookWrap.classList.remove("cover-mode", "turning-cover", "back-mode");

    hideCover();

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
    clearWatchdog();
    detachLeafListener();

    if (S.viewMode === "front" && !S.coverAnimating) return;

    S.viewMode = "front";
    S.currentIdx = 0;
    S.coverAnimating = false;

    D.bookWrap.classList.add("cover-mode");
    D.bookWrap.classList.remove("turning-cover", "back-mode");

    showClosed();

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

    ensureDom();
    setSize();

    /*
      Start closed:
      rotateY(0deg), fully visible.
    */
    setInstant(0, 1);

    runAnimation("open", EPSF.cover.finishOpen);
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

    ensureDom();
    setSize();

    /*
      Start from the opened position:
      rotateY(-180deg), invisible, then animate back to closed.
    */
    setInstant(-180, 0);

    runAnimation("close", EPSF.cover.finishClose);
  };

  EPSF.cover.forceFront = function () {
    clearWatchdog();
    detachLeafListener();

    S.coverAnimToken++;
    S.coverAnimating = false;

    S.viewMode = "front";
    S.currentIdx = 0;

    D.bookWrap.classList.add("cover-mode");
    D.bookWrap.classList.remove("turning-cover", "back-mode");

    showClosed();

    if (S.pageFlip && S.N > 0) {
      try {
        S.pageFlip.turnToPage(0);
      } catch (e) {}
    }

    Med.clearOverlays();
    UI.updateUIAll();
  };

  EPSF.cover.forceBook = function (idx) {
    clearWatchdog();
    detachLeafListener();

    S.coverAnimToken++;
    S.coverAnimating = false;

    hideCover();

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

  EPSF.cover.destroy = function (hide) {
    clearWatchdog();
    detachLeafListener();

    S.coverAnimating = false;

    if (hide !== false) {
      hideCover();
    } else {
      if (S.viewMode === "front") {
        showClosed();
      } else {
        hideCover();
      }
    }
  };

  EPSF.cover.build = function () {
    if (S.isMobile) {
      hideCover();
      return false;
    }

    ensureDom();
    setSize();

    if (S.viewMode === "front" || S.coverAnimating) {
      D.turnCover.hidden = false;

      if (!S.coverAnimating) {
        showClosed();
      }
    } else {
      hideCover();
    }

    return true;
  };

  EPSF.cover.showStatic = function () {
    if (S.isMobile) return;
    showClosed();
  };

  EPSF.cover.position = function () {
    setSize();
  };

  EPSF.cover.clearWatchdog = clearWatchdog;

  EPSF.cover.bindClick = function () {
    if (!D.turnCover) return;

    D.turnCover.addEventListener("click", function () {
      if (S.viewMode === "front" && !S.coverAnimating) {
        EPSF.cover.open();
      }
    });
  };
})();
