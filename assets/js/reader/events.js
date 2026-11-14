(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var Lay = EPSF.layout;
  var UI = EPSF.ui;
  var Med = EPSF.media;
  var Flip = EPSF.flip;
  var Reader = EPSF.reader;
  var Zoom = EPSF.zoom;

  function visibleSheetsFor(container) {
    return container === D.stackR ? S.stackRVisible : S.stackLVisible;
  }

  function hoverMarkerFor(container) {
    return container === D.stackR ? S.stackRHover : S.stackLHover;
  }

  function stackIndexFromEvent(container, e) {
    var arr = visibleSheetsFor(container);

    if (!arr.length) return -1;

    var rect = container.getBoundingClientRect();
    if (rect.width <= 0) return -1;

    var frac = (e.clientX - rect.left) / rect.width;

    if (frac < 0) frac = 0;
    if (frac >= 1) frac = 0.999999;

    var idx = Math.floor(frac * arr.length);

    if (idx < 0) idx = 0;
    if (idx >= arr.length) idx = arr.length - 1;

    return idx;
  }

  function setStackHoverMarker(container, idx) {
    var marker = hoverMarkerFor(container);
    var arr = visibleSheetsFor(container);

    if (!marker || idx < 0 || !arr.length) {
      if (marker) marker.style.opacity = "0";
      return;
    }

    var rect = container.getBoundingClientRect();
    var segW = rect.width / arr.length;
    var markW = Math.max(3, segW);
    var left = idx * segW + segW / 2 - markW / 2;

    if (left < 0) left = 0;
    if (left + markW > rect.width) left = Math.max(0, rect.width - markW);

    marker.style.width = markW + "px";
    marker.style.left = left + "px";
    marker.style.opacity = "1";
  }

  /*
    Block stack interaction cleanly:

      - mobile: stacks are hidden anyway
      - cover: both stacks disabled
      - first interior spread after cover: left stack disabled only
  */
  function stackInteractionBlocked(container) {
    if (S.isPortrait) return true;

    if (Lay.isCoverView()) return true;

    if (container === D.stackL && Lay.isFirstInteriorView()) {
      return true;
    }

    return false;
  }

  function bindStack(container) {
    container.addEventListener("pointermove", function (e) {
      if (stackInteractionBlocked(container)) {
        UI.hideTip();

        var m = hoverMarkerFor(container);
        if (m) m.style.opacity = "0";

        return;
      }

      var idx = stackIndexFromEvent(container, e);

      if (idx < 0) {
        UI.hideTip();

        var m1 = hoverMarkerFor(container);
        if (m1) m1.style.opacity = "0";

        return;
      }

      var arr = visibleSheetsFor(container);
      var sheet = arr[idx];

      UI.showTip(sheet && sheet.dataset.label ? sheet.dataset.label : "");
      UI.moveTip(e);
      setStackHoverMarker(container, idx);
    });

    container.addEventListener("pointerleave", function () {
      UI.hideTip();

      var marker = hoverMarkerFor(container);
      if (marker) marker.style.opacity = "0";
    });

    container.addEventListener("click", function (e) {
      if (stackInteractionBlocked(container)) return;

      if (S.isJumping || S.coverAnimating) return;

      var idx = stackIndexFromEvent(container, e);
      if (idx < 0) return;

      var arr = visibleSheetsFor(container);
      var sheet = arr[idx];

      if (!sheet) return;

      var target = parseInt(sheet.dataset.spread, 10);

      if (!isNaN(target)) {
        Flip.jumpToSpread(target, true);
      }
    });
  }

  EPSF.events.bindAll = function () {
    EPSF.events.bindCards();
    EPSF.events.bindReaderControls();
    EPSF.events.bindDock();
    EPSF.events.bindEdges();
    EPSF.events.bindStageClick();
    EPSF.events.bindStacks();
    EPSF.events.bindKeyboard();
    EPSF.events.bindResize();
    EPSF.events.bindIdle();

    Zoom.bind();
  };

  EPSF.events.bindCards = function () {
    S.cards.forEach(function (card) {
      card.addEventListener("click", function () {
        Reader.open(card);
      });

      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          Reader.open(card);
        }
      });
    });
  };

  EPSF.events.bindReaderControls = function () {
    document.getElementById("r-close").addEventListener("click", Reader.close);

    document.getElementById("end-again").addEventListener("click", function () {
      if (S.coverAnimating) return;

      UI.hideEnd();
      Flip.jumpToInner(0, false);
    });

    document.getElementById("end-close").addEventListener("click", Reader.close);

    document.getElementById("r-fs").addEventListener("click", function () {
      if (!document.fullscreenElement) {
        (D.reader.requestFullscreen
          ? D.reader.requestFullscreen()
          : Promise.resolve()
        ).catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
  };

  EPSF.events.bindDock = function () {
    D.dNext.addEventListener("click", function () {
      Flip.stopHeld();
      Flip.requestFlip(1);
    });

    D.dPrev.addEventListener("click", function () {
      Flip.stopHeld();
      Flip.requestFlip(-1);
    });

    D.dTrack.addEventListener("click", function (e) {
      if (S.isJumping || S.coverAnimating) return;

      var rect = D.dTrack.getBoundingClientRect();
      var frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      var totalLogical = S.total + 1;
      var targetOrig = Math.max(
        1,
        Math.min(totalLogical, Math.round(frac * (totalLogical - 1)) + 1)
      );

      Flip.jumpToInner(Lay.indexForOriginalPage(targetOrig), true);
    });

    D.dPages.addEventListener("click", function () {
      if (S.isJumping || S.coverAnimating) return;

      var input = document.createElement("input");
      input.type = "number";
      input.className = "page-input";

      var totalLogical = S.total + 1;

      input.min = "1";
      input.max = String(totalLogical);
      input.value = String(Lay.currentOriginalPage());

      D.dPages.style.display = "none";
      D.dPages.parentNode.insertBefore(input, D.dPages);

      input.focus();
      input.select();

      var finished = false;

      function cleanup(jump) {
        if (finished) return;

        finished = true;

        var val = parseInt(input.value, 10);

        if (input.parentNode) input.parentNode.removeChild(input);

        D.dPages.style.display = "";

        if (jump && !isNaN(val)) {
          Flip.jumpToInner(Lay.indexForOriginalPage(val), true);
        }

        UI.updateUIAll();
      }

      input.addEventListener("keydown", function (e) {
        e.stopPropagation();

        if (e.key === "Enter") {
          e.preventDefault();
          cleanup(true);
        } else if (e.key === "Escape") {
          cleanup(false);
        }
      });

      input.addEventListener("blur", function () {
        cleanup(true);
      });
    });
  };

  EPSF.events.bindEdges = function () {
    D.edgeR.addEventListener("click", function () {
      Flip.stopHeld();
      Flip.requestFlip(1);
    });

    D.edgeL.addEventListener("click", function () {
      Flip.stopHeld();
      Flip.requestFlip(-1);
    });
  };

  EPSF.events.bindStageClick = function () {
    D.stage.addEventListener("click", function (e) {
      if (S.coverAnimating || S.isJumping) return;
      if (e.target !== D.stage && e.target !== D.bookWrap) return;

      var rect = D.bookWrap.getBoundingClientRect();
      var midX = rect.left + rect.width / 2;

      Flip.requestFlip(e.clientX < midX ? -1 : 1);
    });
  };

  EPSF.events.bindStacks = function () {
    bindStack(D.stackR);
    bindStack(D.stackL);
  };

  EPSF.events.bindKeyboard = function () {
    document.addEventListener("keydown", function (e) {
      if (D.zoomOverlay && !D.zoomOverlay.hidden) {
        if (e.key === "Escape") {
          Zoom.close();
          e.preventDefault();
          return;
        }

        if (e.key === "+" || e.key === "=") {
          Zoom.by(1.25);
          e.preventDefault();
          return;
        }

        if (e.key === "-" || e.key === "_") {
          Zoom.by(1 / 1.25);
          e.preventDefault();
          return;
        }

        if (e.key === "0") {
          Zoom.fit();
          e.preventDefault();
          return;
        }

        return;
      }

      if (D.reader.hidden) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.isContentEditable)) return;

      if (e.key === "Escape") {
        Reader.close();
        return;
      }

      if (e.key === "z" || e.key === "Z") {
        Zoom.open();
        return;
      }

      var dir = 0;

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") dir = 1;
      else if (e.key === "ArrowLeft" || e.key === "PageUp") dir = -1;
      else return;

      e.preventDefault();

      if (S.isJumping) return;

      if (e.repeat) {
        Flip.startHeld(dir);
      } else {
        Flip.stopHeld();
        Flip.requestFlip(dir);

        clearTimeout(S.holdTimeout);
        S.holdTimeout = setTimeout(function () {
          Flip.startHeld(dir);
        }, 320);
      }
    });

    document.addEventListener("keyup", function (e) {
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        e.key === "PageDown" ||
        e.key === " "
      ) {
        clearTimeout(S.holdTimeout);
        Flip.stopHeld();
      }
    });
  };

  EPSF.events.bindResize = function () {
    var resizeTimer = null;

    function handleResize() {
      if (D.reader.hidden || S.isInitializing || S.coverAnimating) return;

      var oldMobile = S.isMobile;
      var oldW = S.pageW;
      var oldH = S.pageH;
      var oldPortrait = S.isPortrait;
      var currentOrig = Lay.currentOriginalPage();

      Lay.computeLayout();

      if (oldMobile !== S.isMobile && S.N > 0) {
        Med.clearOverlays();
        Lay.rebuildInner();
        Lay.buildStacks();

        var targetIdx = Lay.indexForOriginalPage(currentOrig);
        Reader.createFlipbook(targetIdx, true);

        return;
      }

      if (
        oldPortrait !== S.isPortrait ||
        Math.abs(oldW - S.pageW) >= 2 ||
        Math.abs(oldH - S.pageH) >= 2
      ) {
        Med.clearOverlays();

        var start = UI.getCurrentIndex();

        if (S.N > 0) {
          Reader.createFlipbook(start, true);
        }
      } else {
        UI.updateUIAll();
        Med.syncForCurrentPage();
      }

      if (Zoom.isOpen()) {
        Zoom.fit();
      }
    }

    window.addEventListener("resize", function () {
      if (D.reader.hidden) return;

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 180);
    });

    document.addEventListener("fullscreenchange", function () {
      if (!D.reader.hidden) setTimeout(handleResize, 80);
    });
  };

  EPSF.events.bindIdle = function () {
    ["mousemove", "touchstart", "keydown"].forEach(function (ev) {
      D.reader.addEventListener(ev, UI.wake, { passive: true });
    });

    D.reader.addEventListener("pointerdown", function () {
      S.mediaUserGesture = true;
    }, { passive: true });
  };
})();
