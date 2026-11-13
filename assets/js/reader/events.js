(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var Flip = EPSF.flip;
  var Cover = EPSF.cover;
  var Reader = EPSF.reader;
  var Zoom = EPSF.zoom;
  var UI = EPSF.ui;

  EPSF.events.bindAll = function () {
    EPSF.events.bindCards();
    EPSF.events.bindReaderControls();
    EPSF.events.bindDock();
    EPSF.events.bindEdges();
    EPSF.events.bindStacks();
    EPSF.events.bindKeyboard();
    EPSF.events.bindResize();

    if (Zoom.bind) Zoom.bind();
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

      if (S.isMobile) {
        Flip.jumpToInner(0, false);
        return;
      }

      if (S.viewMode === "book") {
        if (S.currentIdx === 0) {
          Cover.closeToCover();
        } else {
          Cover.forceBook(0);

          setTimeout(function () {
            if (S.viewMode === "book" && S.currentIdx === 0) {
              Cover.closeToCover();
            } else {
              Cover.forceFront();
            }
          }, 60);
        }
      } else {
        Cover.forceFront();
      }
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

    if (D.rZoom) {
      D.rZoom.addEventListener("click", function () {
        Zoom.open();
      });
    }
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

    /*
      Move existing:
      - dTrack click
      - dPages click/input logic
    */
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

  EPSF.events.bindStacks = function () {
    /*
      Move existing:
      - bindStack(stackR)
      - bindStack(stackL)
      - visibleSheetsFor
      - hoverMarkerFor
      - stackIndexFromEvent
      - setStackHoverMarker
    */
  };

  EPSF.events.bindKeyboard = function () {
    /*
      Move existing document keydown/keyup handlers here.
    */
  };

  EPSF.events.bindResize = function () {
    var resizeTimer = null;

    function handleResize() {
      if (D.reader.hidden || S.isInitializing || S.coverAnimating) return;

      var oldMobile = S.isMobile;
      var oldW = S.pageW;
      var oldH = S.pageH;
      var oldPortrait = S.isPortrait;

      EPSF.layout.computeLayout();

      if (oldMobile !== S.isMobile && S.N > 0) {
        var currentLogicalPage;

        if (oldMobile) {
          currentLogicalPage = S.currentIdx + 1;
        } else {
          if (S.viewMode === "front") currentLogicalPage = 1;
          else currentLogicalPage = S.currentIdx + 2;
        }

        EPSF.media.clearOverlays();
        EPSF.layout.rebuildInner();
        EPSF.layout.buildStacks();

        if (S.isMobile) {
          EPSF.cover.destroy(true);
          D.bookWrap.classList.remove("cover-mode", "turning-cover", "back-mode");

          S.viewMode = "book";

          var targetIdx = Math.max(0, Math.min(S.N - 1, currentLogicalPage - 1));
          EPSF.reader.createFlipbook(targetIdx, true);
        } else {
          if (currentLogicalPage <= 1) {
            EPSF.cover.forceFront();
          } else {
            var desktopTargetIdx = Math.max(0, Math.min(S.N - 1, currentLogicalPage - 2));
            EPSF.cover.forceBook(desktopTargetIdx);
          }

          EPSF.loaders.ensureTurnJS().then(function () {
            if (!D.reader.hidden && S.viewMode === "front") {
              EPSF.cover.build();
            }
          }).catch(function () {});
        }

        return;
      }

      if (
        oldPortrait !== S.isPortrait ||
        Math.abs(oldW - S.pageW) >= 2 ||
        Math.abs(oldH - S.pageH) >= 2
      ) {
        EPSF.media.clearOverlays();

        if (!S.isMobile && S.viewMode === "front") {
          EPSF.cover.destroy(false);

          EPSF.loaders.ensureTurnJS().then(function () {
            if (!D.reader.hidden && S.viewMode === "front") {
              EPSF.cover.build();
            }
          }).catch(function () {});
        }

        var start = S.currentIdx;

        if (S.N > 0) {
          EPSF.reader.createFlipbook(start, true);
        }
      } else {
        if (!S.isMobile && S.viewMode === "front") {
          EPSF.cover.position();
        }

        EPSF.ui.updateUIAll();
        EPSF.media.syncForCurrentPage();
      }

      if (EPSF.zoom.isOpen && EPSF.zoom.isOpen()) {
        EPSF.zoom.fit();
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
})();
