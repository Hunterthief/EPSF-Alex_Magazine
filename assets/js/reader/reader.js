(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;
  var L = EPSF.loaders;
  var Lay = EPSF.layout;
  var UI = EPSF.ui;
  var Med = EPSF.media;
  var Cover = EPSF.cover;
  var Flip = EPSF.flip;
  var Zoom = EPSF.zoom;

  EPSF.reader.destroyFlipbook = function () {
    Med.clearOverlays();

    if (S.pageFlip) {
      try {
        S.pageFlip.destroy();
      } catch (e) {}

      S.pageFlip = null;
    }

    if (D.mount) D.mount.innerHTML = "";

    S.isInitializing = false;
  };

  EPSF.reader.createFlipbook = function (startIndex, hideLoader) {
    EPSF.reader.destroyFlipbook();

    if (!L.hasPageFlip()) {
      var detail = L.pageFlipLastError && L.pageFlipLastError.message
        ? L.pageFlipLastError.message
        : "St.PageFlip is not available.";

      UI.failLoad("Page flip library is not ready. " + detail);
      return;
    }

    if (!S.inner.length) {
      UI.failLoad("No pages to display.");
      return;
    }

    S.isInitializing = true;
    S.suppressLoader = !!hideLoader;
    S.sfState = "read";

    var flipEl = document.createElement("div");
    flipEl.id = "flipbook";
    D.mount.appendChild(flipEl);

    try {
      S.pageFlip = new St.PageFlip(flipEl, {
        width: S.pageW,
        height: S.pageH,
        size: "fixed",
        showCover: false,
        usePortrait: S.isPortrait,
        flippingTime: S.RM ? 1 : 660,
        maxShadowOpacity: 0.78,
        mobileScrollSupport: false,
        startPage: Lay.clampInner(startIndex),
        startZIndex: 0,
        autoSize: false,
        clickEventForward: true,
        disableFlipByClick: false
      });
    } catch (e) {
      S.isInitializing = false;
      UI.failLoad("Could not start page flip: " + (e && e.message ? e.message : e));
      return;
    }

    S.pageFlip.on("init", function () {
      S.isInitializing = false;
      S.currentIdx = Lay.clampInner(startIndex);

      if (!S.suppressLoader) D.loader.classList.add("gone");

      D.bookWrap.classList.add("visible");
      D.reader.classList.add("is-open");

      UI.updateUIAll();
      Med.syncForCurrentPage();
    });

    S.pageFlip.on("flip", function (e) {
      var idx = (e && typeof e.data === "number") ? e.data : UI.getCurrentIndex();

      S.currentIdx = Lay.clampInner(idx);

      Med.clearOverlays();
      UI.updateUIAll();
    });

    S.pageFlip.on("changeState", function (e) {
      S.sfState = (e && e.data) ? e.data : "read";

      if (S.sfState === "read") {
        UI.updateUIAll();
        Med.syncForCurrentPage();

        if (S.heldLoopRunning) {
          setTimeout(Flip.heldLoop, 30);
        }
      } else {
        Med.clearOverlays();
      }
    });

    S.pageFlip.loadFromImages(S.inner);
  };

  EPSF.reader.open = function (card) {
    UI.ensureAudio();
    Flip.stopHeld();
    UI.hideSparks();

    Cover.clearWatchdog();
    Cover.destroy(true);

    Med.clearOverlays();

    S.issueManifest = null;
    S.pageMeta = [];
    S.mediaUserGesture = true;

    if (Zoom.isOpen()) {
      Zoom.close();
    }

    EPSF.reader.destroyFlipbook();

    S.pagesUrl = card.dataset.pagesUrl;

    var parsed = U.parseIssueName(card.dataset.fileName);
    D.rTitle.textContent = parsed.title;
    D.rDl.href = card.dataset.pdfUrl;

    S.total = 1;
    S.inner = [];
    S.pageMeta = [];
    S.N = 0;
    S.maxSpread = 0;
    S.lastSpreadIdx = 0;
    S.currentIdx = 0;

    S.jumpToken++;
    S.isJumping = false;
    S.sfState = "read";

    S.coverAnimToken++;
    S.coverAnimating = false;
    S.dragTurn = 0;
    S.viewMode = "front";

    D.loader.classList.remove("err", "gone");
    D.loaderTxt.textContent = "Preparing issue";

    D.reader.hidden = false;
    D.reader.classList.remove("is-open", "is-closing", "idle");

    document.body.style.overflow = "hidden";

    UI.hideHint();
    UI.hideEnd();
    UI.hideTip();

    D.bookWrap.classList.remove("visible", "back-mode", "turning-cover", "is-flipping");
    D.bookWrap.classList.add("cover-mode");

    var loadedManifest = null;

    U.loadImage(U.pageUrl(1)).then(function (im) {
      if (!im.naturalWidth || !im.naturalHeight) {
        throw new Error("bad first page");
      }

      S.aspect = im.naturalWidth / im.naturalHeight;

      var mUrl = S.pagesUrl + "/manifest.json";

      return fetch(mUrl, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("manifest " + r.status);
          return r.json();
        })
        .then(function (m) {
          loadedManifest = m;

          var mp = parseInt(m && m.pages, 10);
          if (mp > 0) return mp;

          return U.probeTotal();
        })
        .catch(function () {
          loadedManifest = null;
          return U.probeTotal();
        });
    }).then(function (t) {
      S.total = Math.max(1, t);
      S.issueManifest = U.normalizeManifest(loadedManifest, S.total);

      S.pageMeta = [];
      Med.clearOverlays();
      S.mediaUserGesture = true;

      return L.ensurePageFlip().then(function () {
        Lay.computeLayout();
        Lay.rebuildInner();
        Lay.buildStacks();

        if (D.statPages && S.cards.indexOf(card) === 0) {
          D.statPages.textContent = String(S.total).padStart(2, "0");
        }

        if (S.isMobile) {
          Cover.destroy(true);

          D.bookWrap.classList.remove("cover-mode", "turning-cover", "back-mode");

          S.viewMode = "book";
          S.currentIdx = 0;

          EPSF.reader.createFlipbook(0, false);
        } else {
          S.viewMode = "front";
          S.currentIdx = 0;

          D.bookWrap.classList.add("cover-mode");
          D.bookWrap.classList.remove("turning-cover", "back-mode");

          Cover.showStatic();

          L.ensureTurnJS().then(function () {
            if (!D.reader.hidden && S.viewMode === "front") {
              Cover.build();
            }
          }).catch(function () {
            // Leave static fallback cover visible.
          });

          if (S.N > 0) {
            EPSF.reader.createFlipbook(0, false);
          } else {
            D.loader.classList.add("gone");
            D.bookWrap.classList.add("visible");
            D.reader.classList.add("is-open");
            UI.updateUIAll();
          }
        }
      });
    }).catch(function (e) {
      var msg = (e && e.message) ? e.message : String(e);

      if (/PageFlip|page-flip|St\.PageFlip|import|ESM|Script/i.test(msg)) {
        UI.failLoad(
          "Page flip library could not be loaded. Add a compiled bundle at assets/vendor/page-flip.esm.js or assets/vendor/page-flip.browser.js, or allow CDN access to page-flip. Details: " +
          msg
        );
      } else {
        UI.failLoad(
          "Couldn't load this issue. The page images may still be generating — try again in a minute. (" +
          msg +
          ")"
        );
      }
    });
  };

  EPSF.reader.close = function () {
    S.jumpToken++;
    S.coverAnimToken++;

    S.isJumping = false;
    S.coverAnimating = false;
    S.dragTurn = 0;

    Flip.stopHeld();
    Cover.clearWatchdog();
    Cover.destroy(true);

    Med.clearOverlays();

    UI.hideSparks();
    UI.hideHint();
    UI.hideEnd();
    UI.hideTip();

    clearTimeout(S.idleTimer);

    if (Zoom.isOpen()) {
      Zoom.close();
    }

    EPSF.reader.destroyFlipbook();

    D.reader.classList.add("is-closing");
    D.reader.classList.remove("idle");

    D.bookWrap.classList.remove("visible", "is-flipping", "turning-cover");

    setTimeout(function () {
      D.reader.hidden = true;
      D.reader.classList.remove("is-open", "is-closing");

      document.body.style.overflow = "";

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(function () {});
      }
    }, 380);
  };
})();
