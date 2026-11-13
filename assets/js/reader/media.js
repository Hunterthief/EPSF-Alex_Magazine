(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  EPSF.media.getPageSlotForOriginalPage = function (pageNum) {
    if (!S.pageMeta || !S.pageMeta.length) return null;
    if (pageNum == null) return null;

    if (S.isMobile) {
      var meta = S.pageMeta[S.currentIdx];

      if (meta && meta.originalPage === pageNum) {
        return { slot: "single", index: S.currentIdx };
      }

      return null;
    }

    if (S.viewMode !== "book") return null;

    var left = S.pageMeta[S.currentIdx];

    if (left && left.originalPage === pageNum) {
      return { slot: "left", index: S.currentIdx };
    }

    var right = S.pageMeta[S.currentIdx + 1];

    if (right && right.originalPage === pageNum) {
      return { slot: "right", index: S.currentIdx + 1 };
    }

    return null;
  };

  EPSF.media.applyMediaPosition = function (el, rect, slot) {
    var baseX = 0;
    var areaW = S.pageW;
    var areaH = S.pageH;

    if (slot && slot.slot === "right") {
      baseX = S.pageW;
    }

    var left = baseX + rect.x * areaW;
    var top = rect.y * areaH;
    var width = rect.w * areaW;
    var height = rect.h * areaH;

    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
    el.style.width = Math.max(1, Math.round(width)) + "px";
    el.style.height = Math.max(1, Math.round(height)) + "px";
  };

  EPSF.media.pauseOtherMedia = function (currentPlayer) {
    S.activeMedia.forEach(function (item) {
      if (item.player && item.player !== currentPlayer && item.player.pause) {
        try {
          item.player.pause();
        } catch (e) {}
      }
    });
  };

  EPSF.media.clearOverlays = function () {
    S.activeMedia.forEach(function (item) {
      try {
        if (item.player) {
          if (item.player.pause) item.player.pause();

          if (item.player.removeAttribute) {
            item.player.removeAttribute("src");
          }

          if (item.player.load) {
            item.player.load();
          }
        }

        if (item.el && item.el.parentNode) {
          item.el.parentNode.removeChild(item.el);
        }
      } catch (e) {}
    });

    S.activeMedia = [];

    if (D.mediaLayer) {
      D.mediaLayer.innerHTML = "";
    }
  };

  EPSF.media.createVideoOverlay = function (m, slot) {
    if (!D.mediaLayer || !m.src) return;

    var rect = U.normalizeRect(m);

    var box = document.createElement("div");
    box.className = "media-box media-video";

    var video = document.createElement("video");
    video.src = U.resolveMediaSrc(m.src);

    if (m.poster) {
      video.poster = U.resolveMediaSrc(m.poster);
    }

    video.controls = m.controls !== false;
    video.loop = !!m.loop;
    video.muted = !!m.muted;
    video.preload = m.preload || "metadata";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    if (m.title) {
      video.setAttribute("aria-label", m.title);
    }

    video.addEventListener("play", function () {
      S.mediaUserGesture = true;
      EPSF.media.pauseOtherMedia(video);
    });

    box.appendChild(video);
    D.mediaLayer.appendChild(box);

    EPSF.media.applyMediaPosition(box, rect, slot);

    S.activeMedia.push({
      el: box,
      player: video,
      media: m,
      page: m.page
    });

    if (m.autoplay) {
      video.play().catch(function () {});
    }
  };

  EPSF.media.createAudioOverlay = function (m, slot) {
    if (!D.mediaLayer || !m.src) return;

    var rect = U.normalizeRect(m);

    var box = document.createElement("div");
    box.className = "media-box media-audio";

    var audio = new Audio(U.resolveMediaSrc(m.src));
    audio.loop = !!m.loop;
    audio.preload = m.preload || "metadata";
    audio.volume = U.clampNum(
      typeof m.volume === "number" ? m.volume : 0.85,
      0,
      1
    );

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media-audio-btn";
    btn.setAttribute("aria-label", "Play audio");
    btn.textContent = "▶";

    var label = document.createElement("span");
    label.className = "media-audio-label";
    label.textContent = m.title || "Audio";

    var time = document.createElement("span");
    time.className = "media-audio-time";
    time.textContent = "0:00";

    audio.addEventListener("play", function () {
      S.mediaUserGesture = true;
      btn.textContent = "❚❚";
      btn.setAttribute("aria-label", "Pause audio");
      EPSF.media.pauseOtherMedia(audio);
    });

    audio.addEventListener("pause", function () {
      btn.textContent = "▶";
      btn.setAttribute("aria-label", "Play audio");
    });

    audio.addEventListener("ended", function () {
      if (!audio.loop) {
        btn.textContent = "▶";
        btn.setAttribute("aria-label", "Play audio");
        time.textContent = "0:00";
      }
    });

    audio.addEventListener("timeupdate", function () {
      time.textContent = U.formatMediaTime(audio.currentTime);
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();

      if (audio.paused) {
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    });

    box.appendChild(btn);
    box.appendChild(label);
    box.appendChild(time);

    D.mediaLayer.appendChild(box);

    EPSF.media.applyMediaPosition(box, rect, slot);

    S.activeMedia.push({
      el: box,
      player: audio,
      media: m,
      page: m.page
    });

    if (m.autoplay) {
      audio.play().catch(function () {});
    }
  };

  EPSF.media.syncForCurrentPage = function () {
    EPSF.media.clearOverlays();

    if (!S.issueManifest || !Array.isArray(S.issueManifest.media) || !D.mediaLayer) {
      return;
    }

    if (D.reader.hidden || S.coverAnimating || S.isJumping) {
      return;
    }

    if (S.sfState !== "read") {
      return;
    }

    if (S.viewMode !== "book") {
      return;
    }

    S.issueManifest.media.forEach(function (m) {
      var slot = EPSF.media.getPageSlotForOriginalPage(m.page);
      if (!slot) return;

      if (m.type === "video") {
        EPSF.media.createVideoOverlay(m, slot);
      } else if (m.type === "audio") {
        EPSF.media.createAudioOverlay(m, slot);
      }
    });
  };
})();
