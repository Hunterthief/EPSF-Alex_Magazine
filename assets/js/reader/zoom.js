(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  EPSF.zoom.isOpen = function () {
    return S.zoom.open;
  };

  EPSF.zoom.getSources = function () {
    if (!S.inner.length) return [];

    var indices = [];

    if (S.isPortrait) {
      indices.push(S.currentIdx);
    } else {
      indices.push(S.currentIdx);
      indices.push(S.currentIdx + 1);
    }

    var arr = [];

    indices.forEach(function (i) {
      if (i < 0 || i >= S.inner.length) return;

      var meta = S.pageMeta[i];

      /*
        Do not zoom the desktop filler background.
        Zoom the real cover instead.
      */
      if (meta && meta.kind === "background") return;

      if (S.inner[i]) arr.push(S.inner[i]);
    });

    if (!arr.length && S.total >= 1) {
      arr.push(U.pageUrl(1));
    }

    return arr;
  };

  EPSF.zoom.getLabel = function () {
    if (!S.inner.length) return "Zoom";

    var totalLogical = S.total + 1;
    var origs = EPSF.layout.originalPagesForCurrentSpread();

    if (!origs.length) return "Cover";

    if (origs.indexOf(totalLogical) >= 0) {
      return "Back Cover";
    }

    if (origs.length === 1) {
      if (origs[0] === 1) return "Cover";
      return "Page " + origs[0];
    }

    return "Pages " + origs[0] + "–" + origs[1];
  };

  EPSF.zoom.applyTransform = function () {
    if (!D.zoomPages) return;

    D.zoomPages.style.transform =
      "translate(" + S.zoom.tx + "px," + S.zoom.ty + "px) scale(" + S.zoom.scale + ")";

    if (D.zoomPercent) {
      D.zoomPercent.textContent = Math.round(S.zoom.scale * 100) + "%";
    }
  };

  EPSF.zoom.fit = function () {
    if (!D.zoomStage || !D.zoomPages) return;

    var imgs = D.zoomPages.querySelectorAll("img");
    if (!imgs.length) return;

    var rect = D.zoomStage.getBoundingClientRect();
    var gap = 12;
    var totalW = 0;
    var maxH = 0;

    imgs.forEach(function (img, i) {
      totalW += (img.naturalWidth || img.width || 1);
      maxH = Math.max(maxH, img.naturalHeight || img.height || 1);

      if (i < imgs.length - 1) totalW += gap;
    });

    var fit = Math.min(
      (rect.width - 32) / Math.max(totalW, 1),
      (rect.height - 32) / Math.max(maxH, 1)
    );

    fit = U.clampNum(fit, 0.05, 1);

    S.zoom.fitScale = fit;
    S.zoom.minScale = fit * 0.75;
    S.zoom.maxScale = Math.max(8, fit * 10);
    S.zoom.scale = fit;
    S.zoom.tx = 0;
    S.zoom.ty = 0;

    EPSF.zoom.applyTransform();
  };

  EPSF.zoom.open = function () {
    if (!D.zoomOverlay || !D.zoomPages || !D.zoomStage) return;

    var srcs = EPSF.zoom.getSources();
    if (!srcs.length) return;

    D.zoomPages.innerHTML = "";
    D.zoomLabel.textContent = EPSF.zoom.getLabel();

    var loaded = 0;

    srcs.forEach(function (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.draggable = false;

      img.onload = function () {
        loaded++;
        if (loaded === srcs.length) EPSF.zoom.fit();
      };

      img.onerror = function () {
        loaded++;
        if (loaded === srcs.length) EPSF.zoom.fit();
      };

      D.zoomPages.appendChild(img);
    });

    D.zoomOverlay.hidden = false;

    requestAnimationFrame(function () {
      D.zoomOverlay.classList.add("open");
    });

    S.zoom.open = true;
    S.zoom.scale = 1;
    S.zoom.tx = 0;
    S.zoom.ty = 0;

    EPSF.zoom.applyTransform();
  };

  EPSF.zoom.close = function () {
    if (!D.zoomOverlay) return;

    S.zoom.open = false;
    D.zoomOverlay.classList.remove("open");

    setTimeout(function () {
      D.zoomOverlay.hidden = true;

      if (D.zoomPages) {
        D.zoomPages.innerHTML = "";
      }
    }, 180);
  };

  EPSF.zoom.by = function (factor, clientX, clientY) {
    if (!D.zoomStage) return;

    var rect = D.zoomStage.getBoundingClientRect();

    var px = (clientX == null ? rect.width / 2 : clientX - rect.left) - rect.width / 2;
    var py = (clientY == null ? rect.height / 2 : clientY - rect.top) - rect.height / 2;

    var oldScale = S.zoom.scale;
    var nextScale = U.clampNum(oldScale * factor, S.zoom.minScale, S.zoom.maxScale);

    if (nextScale === oldScale) return;

    var ratio = nextScale / oldScale;

    S.zoom.tx = px - (px - S.zoom.tx) * ratio;
    S.zoom.ty = py - (py - S.zoom.ty) * ratio;
    S.zoom.scale = nextScale;

    EPSF.zoom.applyTransform();
  };

  EPSF.zoom.getTwoPointerInfo = function () {
    var pts = Array.from(S.zoom.pointers.values());

    if (pts.length < 2) return null;

    return {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      midX: (pts[0].x + pts[1].x) / 2,
      midY: (pts[0].y + pts[1].y) / 2
    };
  };

  EPSF.zoom.bind = function () {
    if (D.zoomStage) {
      D.zoomStage.addEventListener("pointerdown", function (e) {
        e.preventDefault();

        try {
          D.zoomStage.setPointerCapture(e.pointerId);
        } catch (err) {}

        S.zoom.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (S.zoom.pointers.size === 1) {
          S.zoom.dragging = true;
          S.zoom.moved = false;
          S.zoom.downX = e.clientX;
          S.zoom.downY = e.clientY;
          S.zoom.lastX = e.clientX;
          S.zoom.lastY = e.clientY;
          D.zoomStage.classList.add("dragging");
        } else if (S.zoom.pointers.size === 2) {
          S.zoom.dragging = false;

          var info = EPSF.zoom.getTwoPointerInfo();

          if (info) {
            S.zoom.lastDist = info.dist;
            S.zoom.lastMidX = info.midX;
            S.zoom.lastMidY = info.midY;
          }
        }
      });

      D.zoomStage.addEventListener("pointermove", function (e) {
        if (!S.zoom.pointers.has(e.pointerId)) return;

        S.zoom.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (S.zoom.pointers.size === 1 && S.zoom.dragging) {
          var dx = e.clientX - S.zoom.lastX;
          var dy = e.clientY - S.zoom.lastY;

          if (
            Math.abs(e.clientX - S.zoom.downX) > 6 ||
            Math.abs(e.clientY - S.zoom.downY) > 6
          ) {
            S.zoom.moved = true;
          }

          S.zoom.lastX = e.clientX;
          S.zoom.lastY = e.clientY;

          S.zoom.tx += dx;
          S.zoom.ty += dy;

          EPSF.zoom.applyTransform();
        } else if (S.zoom.pointers.size === 2) {
          S.zoom.moved = true;

          var info = EPSF.zoom.getTwoPointerInfo();
          if (!info) return;

          var midDX = info.midX - S.zoom.lastMidX;
          var midDY = info.midY - S.zoom.lastMidY;

          S.zoom.tx += midDX;
          S.zoom.ty += midDY;

          if (S.zoom.lastDist > 0) {
            var factor = info.dist / S.zoom.lastDist;
            EPSF.zoom.by(factor, info.midX, info.midY);
          }

          S.zoom.lastDist = info.dist;
          S.zoom.lastMidX = info.midX;
          S.zoom.lastMidY = info.midY;

          EPSF.zoom.applyTransform();
        }
      });

      function endZoomPointer(e) {
        S.zoom.pointers.delete(e.pointerId);

        try {
          D.zoomStage.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (S.zoom.pointers.size === 1) {
          var p = Array.from(S.zoom.pointers.values())[0];

          S.zoom.dragging = true;
          S.zoom.lastX = p.x;
          S.zoom.lastY = p.y;
          S.zoom.lastDist = 0;
        } else if (S.zoom.pointers.size === 0) {
          S.zoom.dragging = false;
          S.zoom.lastDist = 0;
          D.zoomStage.classList.remove("dragging");

          var now = Date.now();

          if (
            !S.zoom.moved &&
            now - S.zoom.lastTapTime < 300 &&
            Math.abs(e.clientX - S.zoom.lastTapX) < 24 &&
            Math.abs(e.clientY - S.zoom.lastTapY) < 24
          ) {
            if (S.zoom.scale > S.zoom.fitScale * 1.08) {
              S.zoom.scale = S.zoom.fitScale;
              S.zoom.tx = 0;
              S.zoom.ty = 0;
              EPSF.zoom.applyTransform();
            } else {
              EPSF.zoom.by(2.2, e.clientX, e.clientY);
            }

            S.zoom.lastTapTime = 0;
          } else {
            S.zoom.lastTapTime = now;
            S.zoom.lastTapX = e.clientX;
            S.zoom.lastTapY = e.clientY;
          }
        } else {
          S.zoom.lastDist = 0;
        }
      }

      D.zoomStage.addEventListener("pointerup", endZoomPointer);
      D.zoomStage.addEventListener("pointercancel", endZoomPointer);

      D.zoomStage.addEventListener("wheel", function (e) {
        e.preventDefault();

        var factor = e.deltaY < 0 ? 1.16 : 1 / 1.16;
        EPSF.zoom.by(factor, e.clientX, e.clientY);
      }, { passive: false });

      D.zoomStage.addEventListener("dblclick", function (e) {
        if (S.zoom.scale > S.zoom.fitScale * 1.08) {
          S.zoom.scale = S.zoom.fitScale;
          S.zoom.tx = 0;
          S.zoom.ty = 0;
          EPSF.zoom.applyTransform();
        } else {
          EPSF.zoom.by(2.2, e.clientX, e.clientY);
        }
      });
    }

    if (D.rZoom) {
      D.rZoom.addEventListener("click", EPSF.zoom.open);
    }

    if (D.zoomInBtn) {
      D.zoomInBtn.addEventListener("click", function () {
        EPSF.zoom.by(1.25);
      });
    }

    if (D.zoomOutBtn) {
      D.zoomOutBtn.addEventListener("click", function () {
        EPSF.zoom.by(1 / 1.25);
      });
    }

    if (D.zoomResetBtn) {
      D.zoomResetBtn.addEventListener("click", EPSF.zoom.fit);
    }

    if (D.zoomCloseBtn) {
      D.zoomCloseBtn.addEventListener("click", EPSF.zoom.close);
    }
  };
})();
