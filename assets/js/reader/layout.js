(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  EPSF.layout.clampInner = function (idx) {
    if (S.N <= 0) return 0;

    var max = S.isPortrait ? (S.N - 1) : S.lastSpreadIdx;
    idx = Math.max(0, Math.min(max, idx));

    if (!S.isPortrait) {
      idx -= (idx % 2);
    }

    return idx;
  };

  EPSF.layout.computeLayout = function () {
    var narrow = window.innerWidth < 900;

    S.isPortrait = narrow;
    S.isMobile = narrow;

    var padX = narrow ? 24 : 140;
    var padY = narrow ? 96 : 140;

    var availW = Math.max(180, D.stage.clientWidth - padX);
    var availH = Math.max(180, D.stage.clientHeight - padY);

    if (S.isPortrait) {
      var w = availW;
      var h = w / (S.aspect || 0.72);

      if (h > availH) {
        h = availH;
        w = h * (S.aspect || 0.72);
      }

      S.pageW = Math.floor(w);
      S.pageH = Math.floor(h);

      D.bookWrap.style.width = S.pageW + "px";
      D.bookWrap.style.height = S.pageH + "px";
    } else {
      var ratio = (S.aspect || 0.72) * 2;

      var w2 = availW;
      var h2 = w2 / ratio;

      if (h2 > availH) {
        h2 = availH;
        w2 = h2 * ratio;
      }

      S.pageW = Math.floor(w2 / 2);
      S.pageH = Math.floor(h2);

      D.bookWrap.style.width = (S.pageW * 2) + "px";
      D.bookWrap.style.height = S.pageH + "px";
    }

    if (EPSF.cover && EPSF.cover.position) {
      EPSF.cover.position();
    }

    if (S.isMobile) {
      if (D.turnCover) D.turnCover.hidden = true;
      if (D.spineShadow) D.spineShadow.style.display = "none";
    } else {
      if (D.spineShadow) D.spineShadow.style.display = "";
      if (D.turnCover && S.viewMode === "front") D.turnCover.hidden = false;
    }
  };

  EPSF.layout.rebuildInner = function () {
    S.inner = [];
    S.pageMeta = [];

    var bcW = 1200;
    var bcH = Math.max(1, Math.round(bcW / (S.aspect || 0.72)));

    S.backCoverSrc = U.makeBackCoverDataUrl(bcW, bcH);
    var colophonSrc = U.makeColophonDataUrl(bcW, bcH);

    function pushPage(src, originalPage, kind) {
      S.inner.push(src);
      S.pageMeta.push({
        src: src,
        originalPage: originalPage,
        kind: kind || "page"
      });
    }

    if (S.isMobile) {
      pushPage(U.pageUrl(1), 1, "cover");

      for (var i = 2; i <= S.total; i++) {
        pushPage(U.pageUrl(i), i, "page");
      }

      if ((S.inner.length + 1) % 2 === 1) {
        pushPage(colophonSrc, null, "colophon");
      }

      pushPage(S.backCoverSrc, S.total + 1, "back");

      if (S.inner.length % 2 === 1) {
        pushPage(colophonSrc, null, "colophon");
      }
    } else {
      for (var j = 2; j <= S.total; j++) {
        pushPage(U.pageUrl(j), j, "page");
      }

      if ((S.inner.length + 1) % 2 === 1) {
        pushPage(colophonSrc, null, "colophon");
      }

      pushPage(S.backCoverSrc, S.total + 1, "back");
    }

    S.N = S.inner.length;
    S.lastSpreadIdx = Math.max(0, S.N - 2);
    S.maxSpread = Math.max(0, S.N / 2);
  };

  EPSF.layout.spreadLabel = function (s) {
    var left = s * 2;
    var right = s * 2 + 1;

    if (left > S.total) return "Page " + S.total;
    if (right > S.total) return "Page " + left;

    return "Pages " + left + "–" + right;
  };

  EPSF.layout.buildStacks = function () {
    D.stackR.innerHTML = "";
    D.stackL.innerHTML = "";

    S.stackRSheets = [];
    S.stackLSheets = [];
    S.stackRVisible = [];
    S.stackLVisible = [];

    for (var s = 1; s <= S.maxSpread; s++) {
      var sheetClass = "sheet" + (s % 2 === 0 ? " sheet-gray" : "");

      var rSheet = document.createElement("div");
      rSheet.className = sheetClass;
      rSheet.dataset.spread = String(s);
      rSheet.dataset.label = EPSF.layout.spreadLabel(s);
      D.stackR.appendChild(rSheet);
      S.stackRSheets.push(rSheet);

      var lSheet = document.createElement("div");
      lSheet.className = sheetClass;
      lSheet.dataset.spread = String(s);
      lSheet.dataset.label = EPSF.layout.spreadLabel(s);
      D.stackL.appendChild(lSheet);
      S.stackLSheets.push(lSheet);
    }

    S.stackRHover = document.createElement("div");
    S.stackRHover.className = "stack-hover";
    D.stackR.appendChild(S.stackRHover);

    S.stackLHover = document.createElement("div");
    S.stackLHover.className = "stack-hover";
    D.stackL.appendChild(S.stackLHover);

    EPSF.layout.updateStacks();
  };

  EPSF.layout.spreadFromIndex = function (idx) {
    if (S.maxSpread <= 0) return 0;

    if (S.isPortrait) {
      return Math.max(1, Math.min(S.maxSpread, Math.ceil((idx + 1) / 2)));
    }

    return Math.max(1, Math.min(S.maxSpread, idx / 2 + 1));
  };

  EPSF.layout.indexFromSpread = function (s) {
    var idx = (s - 1) * 2;
    return EPSF.layout.clampInner(idx);
  };

  EPSF.layout.updateStacks = function () {
    var open =
      S.viewMode === "book" &&
      !S.isPortrait &&
      S.N > 0 &&
      S.currentIdx >= 0 &&
      S.currentIdx <= S.lastSpreadIdx;

    var currentSpread = open ? EPSF.layout.spreadFromIndex(S.currentIdx) : 0;
    var unread = open ? Math.max(0, S.maxSpread - currentSpread) : 0;
    var read = open ? Math.max(0, currentSpread - 1) : 0;

    var wR = (open && unread > 0) ? Math.min(S.STACK_MAX, Math.max(14, unread * 2)) : 0;
    var wL = (open && read > 0) ? Math.min(S.STACK_MAX, Math.max(14, read * 2)) : 0;

    D.stackR.style.width = wR + "px";
    D.stackL.style.width = wL + "px";

    D.stackR.style.opacity = (open && unread > 0) ? "1" : "0";
    D.stackL.style.opacity = (open && read > 0) ? "1" : "0";

    D.stackR.style.pointerEvents = (open && unread > 0) ? "auto" : "none";
    D.stackL.style.pointerEvents = (open && read > 0) ? "auto" : "none";

    S.stackRVisible = [];
    S.stackLVisible = [];

    S.stackRSheets.forEach(function (sheet) {
      var s = parseInt(sheet.dataset.spread, 10);

      if (open && s > currentSpread) {
        sheet.style.display = "";
        S.stackRVisible.push(sheet);
      } else {
        sheet.style.display = "none";
      }
    });

    S.stackLSheets.forEach(function (sheet) {
      var s = parseInt(sheet.dataset.spread, 10);

      if (open && s < currentSpread) {
        sheet.style.display = "";
        S.stackLVisible.push(sheet);
      } else {
        sheet.style.display = "none";
      }
    });

    if (S.stackRHover) S.stackRHover.style.opacity = "0";
    if (S.stackLHover) S.stackLHover.style.opacity = "0";

    if (EPSF.ui && EPSF.ui.hideTip) {
      EPSF.ui.hideTip();
    }
  };
})();
