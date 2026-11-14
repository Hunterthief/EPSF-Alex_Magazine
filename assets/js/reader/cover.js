(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;
  var UI = EPSF.ui;
  var Med = EPSF.media;
  var Lay = EPSF.layout;

  var DURATION = S.RM ? 1 : 760;

  var TEMPLATE =
    '<div class="cover-leaf">' +
      '<div class="cover-face cover-front">' +
        '<img id="turn-cover-front-img" alt="Magazine cover" draggable="false">' +
      '</div>' +
      '<div class="cover-face cover-back"></div>' +
    '</div>';

  function clearWatchdog() {
    if (S.coverWatchdogTimer) {
      clearTimeout(S.coverWatchdogTimer);
      S.coverWatchdogTimer = null;
    }
  }

  function getLeaf() {
    return D.turnCover ? D.turnCover.querySelector(".cover-leaf") : null;
  }

  function ensureDom() {
    if (!D.turnCover) return null;

    if (!D.turnCover.querySelector(".cover-leaf")) {
      D.turnCover.classList.add("custom-cover");
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
    D.turnCover.style.left = (S.isPortrait ? 0 : S.pageW / 2) + "px";
  }

  function setInstantTransform(deg) {
    var leaf = ensureDom();
    if (!leaf) return;

    leaf.style.transition = "none";
    leaf.style.transform = "rotateY(" + deg + "deg)";

    // Force reflow so the next transform change animates.
    void leaf.offsetWidth;

    leaf.style.transition = "";
    leaf.style.transitionDuration = DURATION + "ms";
  }

  function showClosed() {
    if (S.isMobile || !D.turnCover) return;

    ensureDom();
    setSize();

    D.turnCover.hidden = false;
    D.turnCover.classList.remove("cover-opening", "cover-closing", "animating");
    D.turnCover.classList.add("cover-closed");
    D.turnCover.style.pointerEvents = "auto";

    setInstantTransform(0);
  }

  function hideCover() {
    if (!D.turnCover) return;

    D.turnCover.hidden = true;
    D.turnCover.classList.remove("cover-closed", "cover-opening", "cover-closing", "animating");
    D.turnCover.style.pointerEvents = "";
  }

  function animateCover(target, done) {
    var leaf = ensureDom();

    if (!leaf || !D.turnCover) {
      done();
      return;
    }

    D.turnCover.classList.add("animating");
    D.turnCover.style.pointerEvents = "none";

    var finalDeg = target === "open" ? -180 : 0;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;

      clearWatchdog();
      leaf.removeEventListener("transitionend", onEnd);
      done();
    }

    function onEnd(e) {
      if (e.target === leaf) {
        finish();
      }
    }

    leaf.addEventListener("transitionend", onEnd);
    leaf.style.transitionDuration = DURATION + "ms";

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        leaf.style.transform = "rotateY(" + finalDeg + "deg)";
      });
    });

    // Safety fallback if transitionend never fires.
    S.coverWatchdogTimer = setTimeout(finish, DURATION + 450);
  }

  EPSF.cover.finishOpen = function () {
    clearWatchdog();

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

    D.turnCover.hidden = false;
    D.turnCover.classList.remove("cover-closed", "cover-closing");
    D.turnCover.classList.add("cover-opening");

    setInstantTransform(0);

    animateCover("open", EPSF.cover.finishOpen);
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

    D.turnCover.hidden = false;
    D.turnCover.classList.remove("cover-closed", "cover-opening");
    D.turnCover.classList.add("cover-closing");

    setInstantTransform(-180);

    animateCover("close", EPSF.cover.finishClose);
  };

  EPSF.cover.forceFront = function () {
    clearWatchdog();

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
