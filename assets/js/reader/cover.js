(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;
  var UI = EPSF.ui;
  var Med = EPSF.media;
  var Lay = EPSF.layout;

  var DURATION = S.RM ? 1 : 880;

  /*
    Page numbering:
      1.jpg = front cover
      2.jpg = inside cover / first real magazine page

    If your issue uses a different inside-cover page, change INSIDE_PAGE here.
  */
  var FRONT_PAGE = 1;
  var INSIDE_PAGE = 2;

  var TEMPLATE =
    '<div class="cover-leaf">' +
      '<div class="cover-face cover-front">' +
        '<img id="turn-cover-front-img" alt="Magazine cover" draggable="false">' +
      '</div>' +
      '<div class="cover-face cover-back">' +
        '<img id="turn-cover-back-img" alt="Inside cover" draggable="false">' +
      '</div>' +
    '</div>';

  var activeLeafHandler = null;
  var revealTimer = null;

  function clearWatchdogOnly() {
    if (S.coverWatchdogTimer) {
      clearTimeout(S.coverWatchdogTimer);
      S.coverWatchdogTimer = null;
    }
  }

  function clearRevealTimer() {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  function clearAllTimers() {
    clearWatchdogOnly();
    clearRevealTimer();
  }

  function removeCoverStates() {
    if (!D.turnCover) return;

    D.turnCover.classList.remove(
      "cover-closed",
      "cover-opening",
      "cover-closing",
      "animating"
    );
  }

  function removeBookCoverClasses() {
    if (!D.bookWrap) return;

    D.bookWrap.classList.remove(
      "turning-cover",
      "cover-opening",
      "cover-closing",
      "cover-reveal"
    );
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

  function frontSrc() {
    if (!S.pagesUrl) return "";
    return U.pageUrl(FRONT_PAGE);
  }

  function insideSrc() {
    if (!S.pagesUrl) return "";
    if (S.total < INSIDE_PAGE) return "";
    return U.pageUrl(INSIDE_PAGE);
  }

  function preloadSrc(src) {
    if (!src) return;

    U.loadImage(src).catch(function () {
      // Ignore preload failures. The image tag will still attempt to load.
    });
  }

  function ensureDom() {
    if (!D.turnCover) return null;

    if (!D.turnCover.querySelector(".cover-leaf")) {
      D.turnCover.innerHTML = TEMPLATE;
    }

    var frontImg = D.turnCover.querySelector("#turn-cover-front-img");
    var backImg = D.turnCover.querySelector("#turn-cover-back-img");

    if (frontImg) {
      var fSrc = frontSrc();

      if (fSrc) {
        frontImg.src = fSrc;
        frontImg.alt = "Magazine cover";
        frontImg.style.display = "block";
        frontImg.loading = "eager";
        frontImg.decoding = "async";
        preloadSrc(fSrc);
      } else {
        frontImg.removeAttribute("src");
        frontImg.alt = "";
        frontImg.style.display = "none";
      }
    }

    if (backImg) {
      var bSrc = insideSrc();

      if (bSrc) {
        backImg.src = bSrc;
        backImg.alt = "Inside cover";
        backImg.style.display = "block";
        backImg.loading = "eager";
        backImg.decoding = "async";
        preloadSrc(bSrc);
      } else {
        backImg.removeAttribute("src");
        backImg.alt = "";
        backImg.style.display = "none";
      }
    }

    return getLeaf();
  }

  function setSize() {
    if (!D.turnCover) return;

    D.turnCover.style.width = S.pageW + "px";
    D.turnCover.style.height = S.pageH + "px";
    D.turnCover.style.top = "0px";

    /*
      Desktop:
        bookWrap width = pageW * 2
        left page      = 0 to pageW
        right page     = pageW to pageW * 2

      The closed cover must sit in the right-page position,
      hinged at the spine, like a real magazine page.
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

    clearAllTimers();
    detachLeafListener();

    D.turnCover.hidden = false;

    removeCoverStates();
    removeBookCoverClasses();

    D.turnCover.classList.add("cover-closed");
    D.turnCover.style.pointerEvents = "auto";

    setInstant(0, 1);
  }

  function hideCover() {
    if (!D.turnCover) return;

    clearAllTimers();
    detachLeafListener();

    D.turnCover.hidden = true;

    removeCoverStates();
    removeBookCoverClasses();

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
    clearAllTimers();

    D.turnCover.hidden = false;
    D.turnCover.style.setProperty("--cover-duration", DURATION + "ms");

    removeCoverStates();
    removeBookCoverClasses();

    void D.turnCover.offsetWidth;

    D.turnCover.classList.add(
      "animating",
      mode === "open" ? "cover-opening" : "cover-closing"
    );

    D.bookWrap.classList.add(
      "turning-cover",
      mode === "open" ? "cover-opening" : "cover-closing"
    );

    if (mode === "open") {
      D.bookWrap.classList.remove("cover-closing", "cover-reveal");
    } else {
      D.bookWrap.classList.remove("cover-opening");
      D.bookWrap.classList.add("cover-reveal");
    }

    var animName = mode === "open" ? "coverOpen" : "coverClose";
    var finished = false;

    function finish() {
      if (finished) return;

      finished = true;

      clearAllTimers();
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
      If animationend never fires, the cover still resolves.
    */
    S.coverWatchdogTimer = setTimeout(
      finish,
      S.RM ? 120 : DURATION + 650
    );

    /*
      Opening:
      Reveal the real St.PageFlip page 2 underneath near the end.
      Because the back of the cover is also page 2, it blends seamlessly.
    */
    if (mode === "open") {
      if (S.RM) {
        D.bookWrap.classList.add("cover-reveal");
      } else {
        revealTimer = setTimeout(function () {
          D.bookWrap.classList.add("cover-reveal");
        }, Math.round(DURATION * 0.54));
      }
    }
  }

  EPSF.cover.finishOpen = function () {
    clearAllTimers();
    detachLeafListener();

    if (S.viewMode === "book" && !S.coverAnimating) return;

    S.viewMode = "book";
    S.currentIdx = 0;
    S.coverAnimating = false;

    D.bookWrap.classList.remove(
      "cover-mode",
      "turning-cover",
      "back-mode",
      "cover-opening",
      "cover-closing",
      "cover-reveal"
    );

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
    clearAllTimers();
    detachLeafListener();

    if (S.viewMode === "front" && !S.coverAnimating) return;

    S.viewMode = "front";
    S.currentIdx = 0;
    S.coverAnimating = false;

    D.bookWrap.classList.add("cover-mode");

    D.bookWrap.classList.remove(
      "turning-cover",
      "back-mode",
      "cover-opening",
      "cover-closing",
      "cover-reveal"
    );

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

    ensureDom();
    setSize();

    /*
      Start closed:
      front cover page 1 visible.
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

    D.bookWrap.classList.add("cover-mode");

    ensureDom();
    setSize();

    /*
      Start from opened position:
      back cover page 2 visible, then close to front cover page 1.
    */
    setInstant(-180, 1);

    runAnimation("close", EPSF.cover.finishClose);
  };

  EPSF.cover.forceFront = function () {
    clearAllTimers();
    detachLeafListener();

    S.coverAnimToken++;
    S.coverAnimating = false;

    S.viewMode = "front";
    S.currentIdx = 0;

    D.bookWrap.classList.add("cover-mode");

    D.bookWrap.classList.remove(
      "turning-cover",
      "back-mode",
      "cover-opening",
      "cover-closing",
      "cover-reveal"
    );

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
    clearAllTimers();
    detachLeafListener();

    S.coverAnimToken++;
    S.coverAnimating = false;

    hideCover();

    S.viewMode = "book";

    D.bookWrap.classList.remove(
      "cover-mode",
      "turning-cover",
      "back-mode",
      "cover-opening",
      "cover-closing",
      "cover-reveal"
    );

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
    clearAllTimers();
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

  EPSF.cover.clearWatchdog = clearAllTimers;

  EPSF.cover.bindClick = function () {
    if (!D.turnCover) return;

    D.turnCover.addEventListener("click", function () {
      if (S.viewMode === "front" && !S.coverAnimating) {
        EPSF.cover.open();
      }
    });
  };
})();
