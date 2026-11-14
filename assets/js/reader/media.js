(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  S.mediaPreload = S.mediaPreload || {};

  function cacheKey(m) {
    return "vid:" + m.page + ":" + m.src;
  }

  function entryKey(m, slot) {
    return cacheKey(m) + ":" + (slot && slot.slot ? slot.slot : "none");
  }

  function resolveSrc(src) {
    return U.resolveMediaSrc(src);
  }

  function getPageSlotForOriginalPage(pageNum) {
    if (!S.pageMeta || !S.pageMeta.length) return null;
    if (pageNum == null) return null;

    if (S.isMobile) {
      var meta = S.pageMeta[S.currentIdx];

      if (meta && meta.originalPage === pageNum) {
        return { slot: "single", index: S.currentIdx };
      }

      return null;
    }

    if (S.viewMode && S.viewMode !== "book") return null;

    var left = S.pageMeta[S.currentIdx];

    if (left && left.originalPage === pageNum) {
      return { slot: "left", index: S.currentIdx };
    }

    var right = S.pageMeta[S.currentIdx + 1];

    if (right && right.originalPage === pageNum) {
      return { slot: "right", index: S.currentIdx + 1 };
    }

    return null;
  }

  function applyBasePosition(el, rect, slot) {
    if (!el || !rect) return;

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
  }

  function getPreloadEntry(m) {
    var key = cacheKey(m);

    if (!S.mediaPreload[key]) {
      S.mediaPreload[key] = {
        video: null,
        posterDataUrl: "",
        ready: false,
        failed: false
      };
    }

    return S.mediaPreload[key];
  }

  function preloadImageSrc(src) {
    if (!src) return null;

    var key = "img:" + src;

    if (S.mediaPreload[key] && S.mediaPreload[key].img) {
      return S.mediaPreload[key].img;
    }

    var img = new Image();
    img.decoding = "async";
    img.src = src;

    S.mediaPreload[key] = {
      img: img
    };

    return img;
  }

  function capturePosterFromVideo(video, m) {
    var entry = getPreloadEntry(m);

    if (!entry || entry.posterDataUrl) return;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    try {
      var maxW = 1600;
      var scale = Math.min(1, maxW / video.videoWidth);

      var w = Math.max(1, Math.round(video.videoWidth * scale));
      var h = Math.max(1, Math.round(video.videoHeight * scale));

      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      var ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, w, h);

      var dataUrl = canvas.toDataURL("image/jpeg", 0.82);

      if (dataUrl && dataUrl.length > 100) {
        entry.posterDataUrl = dataUrl;
      }
    } catch (e) {
      /*
        Canvas capture can fail for cross-origin media.
        If that happens, the reader still works, it just may not have an
        automatic first-frame poster.
      */
    }
  }

  function primeHiddenVideo(video) {
    if (!video) return;

    try {
      video.muted = true;

      var p = video.play();

      if (p && typeof p.then === "function") {
        p.then(function () {
          try {
            video.pause();
          } catch (e) {}
        }).catch(function () {});
      } else {
        try {
          video.pause();
        } catch (e) {}
      }
    } catch (e) {}
  }

  function preloadVideo(m) {
    if (!m || m.type !== "video" || !m.src) return;

    var key = cacheKey(m);
    var entry = getPreloadEntry(m);

    if (entry.video) return;

    if (m.poster) {
      preloadImageSrc(resolveSrc(m.poster));
    }

    var video = document.createElement("video");

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    video.controls = false;
    video.setAttribute("controls", "false");
    video.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
    video.disablePictureInPicture = true;
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("disableremoteplayback", "");

    video.style.cssText =
      "position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;";

    video.src = resolveSrc(m.src);

    if (m.poster) {
      video.poster = resolveSrc(m.poster);
    }

    function onReadyData() {
      entry.ready = true;
      capturePosterFromVideo(video, m);
    }

    video.addEventListener("loadedmetadata", onReadyData);
    video.addEventListener("loadeddata", onReadyData);
    video.addEventListener("canplay", onReadyData);

    video.addEventListener("error", function () {
      entry.failed = true;
    });

    document.body.appendChild(video);

    entry.video = video;

    primeHiddenVideo(video);
  }

  EPSF.media.preloadIssue = function (manifest) {
    if (!manifest || !Array.isArray(manifest.media)) return;

    manifest.media.forEach(function (m) {
      if (!m) return;

      if (m.type === "video") {
        preloadVideo(m);
      } else if (m.type === "audio" && m.src) {
        /*
          Optional: warm audio cache too.
          This does not affect visual appearance, but helps audio start faster.
        */
        try {
          var a = new Audio(resolveSrc(m.src));
          a.preload = "auto";
        } catch (e) {}
      }
    });
  };

  function getBoxAspect(item) {
    if (item.video && item.video.videoWidth && item.video.videoHeight) {
      return item.video.videoWidth / item.video.videoHeight;
    }

    if (
      item.posterImg &&
      item.posterImg.naturalWidth &&
      item.posterImg.naturalHeight
    ) {
      return item.posterImg.naturalWidth / item.posterImg.naturalHeight;
    }

    var entry = S.mediaPreload[cacheKey(item.media)];

    if (
      entry &&
      entry.video &&
      entry.video.videoWidth &&
      entry.video.videoHeight
    ) {
      return entry.video.videoWidth / entry.video.videoHeight;
    }

    return null;
  }

  function fitVideoItem(item) {
    if (!item || item.type !== "video") return;

    var box = item.el;
    var rect = item.rect;
    var slot = item.slot;

    if (!box || !rect) return;

    var pageW = S.pageW;
    var pageH = S.pageH;

    if (pageW <= 0 || pageH <= 0) return;

    var baseX = slot && slot.slot === "right" ? pageW : 0;

    var rectX = baseX + rect.x * pageW;
    var rectY = rect.y * pageH;
    var rectW = rect.w * pageW;
    var rectH = rect.h * pageH;

    if (rectW <= 0 || rectH <= 0) return;

    var rectAspect = rectW / rectH;
    var aspect = getBoxAspect(item) || rectAspect;

    var w;
    var h;

    if (aspect >= rectAspect) {
      w = rectW;
      h = w / Math.max(aspect, 0.0001);
    } else {
      h = rectH;
      w = h * Math.max(aspect, 0.0001);
    }

    w = Math.min(w, rectW);
    h = Math.min(h, rectH);

    var left = rectX + (rectW - w) / 2;
    var top = rectY + (rectH - h) / 2;

    box.style.left = Math.round(left) + "px";
    box.style.top = Math.round(top) + "px";
    box.style.width = Math.max(1, Math.round(w)) + "px";
    box.style.height = Math.max(1, Math.round(h)) + "px";

    if (item.video) {
      item.video.style.width = "100%";
      item.video.style.height = "100%";
    }

    if (item.posterImg) {
      item.posterImg.style.width = "100%";
      item.posterImg.style.height = "100%";
    }
  }

  function hasOtherPlaying(exceptPlayer) {
    for (var i = 0; i < S.activeMedia.length; i++) {
      var item = S.activeMedia[i];

      if (
        item &&
        item.player &&
        item.player !== exceptPlayer &&
        typeof item.player.paused === "boolean" &&
        !item.player.paused
      ) {
        return true;
      }
    }

    return false;
  }

  function pauseOtherMedia(currentPlayer) {
    S.activeMedia.forEach(function (item) {
      if (item.player && item.player !== currentPlayer && item.player.pause) {
        try {
          item.player.pause();
        } catch (e) {}
      }
    });
  }

  EPSF.media.pauseAll = function () {
    S.activeMedia.forEach(function (item) {
      if (item.player && item.player.pause) {
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

  EPSF.media.reposition = function () {
    S.activeMedia.forEach(function (item) {
      if (!item || !item.el) return;

      if (item.type === "video") {
        fitVideoItem(item);
      } else if (item.rect) {
        applyBasePosition(item.el, item.rect, item.slot);
      }
    });
  };

  EPSF.media.createVideoOverlay = function (m, slot) {
    if (!D.mediaLayer || !m.src) return;

    var rect = U.normalizeRect(m);
    var entry = getPreloadEntry(m);

    var posterSrc = "";

    if (m.poster) {
      posterSrc = resolveSrc(m.poster);
    } else if (entry && entry.posterDataUrl) {
      posterSrc = entry.posterDataUrl;
    }

    var box = document.createElement("div");
    box.className = "media-box media-video";

    if (!posterSrc) {
      box.classList.add("no-poster");
    }

    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.setAttribute(
      "aria-label",
      (m.title || "Video") + " — click to play or pause"
    );

    var posterImg = null;

    if (posterSrc) {
      posterImg = document.createElement("img");
      posterImg.className = "media-frame";
      posterImg.alt = m.title || "Video poster";
      posterImg.draggable = false;
      posterImg.decoding = "async";
      posterImg.src = posterSrc;

      box.appendChild(posterImg);
    }

    var video = document.createElement("video");

    video.controls = false;
    video.setAttribute("controls", "false");
    video.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
    video.disablePictureInPicture = true;
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("disableremoteplayback", "");

    video.loop = !!m.loop;
    video.muted = !!m.muted;
    video.preload = "auto";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    if (m.title) {
      video.setAttribute("aria-label", m.title);
    }

    if (posterSrc) {
      video.poster = posterSrc;
    }

    video.src = resolveSrc(m.src);

    box.appendChild(video);

    var item = {
      el: box,
      player: video,
      video: video,
      posterImg: posterImg,
      media: m,
      page: m.page,
      type: "video",
      rect: rect,
      slot: slot,
      key: entryKey(m, slot)
    };

    function markReady() {
      box.classList.add("media-ready");

      if (posterImg) {
        posterImg.style.opacity = "0";
      }

      fitVideoItem(item);
    }

    function onMeta() {
      fitVideoItem(item);
      capturePosterFromVideo(video, m);

      if (!posterSrc) {
        box.classList.add("media-ready");
      }
    }

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("loadeddata", function () {
      onMeta();
      markReady();
    });
    video.addEventListener("canplay", markReady);

    video.addEventListener("play", function () {
      S.mediaUserGesture = true;
      box.classList.add("is-playing");
      pauseOtherMedia(video);
    });

    video.addEventListener("pause", function () {
      box.classList.remove("is-playing");
    });

    video.addEventListener("error", function () {
      box.classList.add("media-error");
      markReady();
    });

    function togglePlay(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (video.paused) {
        S.mediaUserGesture = true;
        video.play().catch(function () {});
      } else {
        video.pause();
      }
    }

    box.addEventListener("click", togglePlay);

    box.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        togglePlay(e);
      }
    });

    D.mediaLayer.appendChild(box);

    /*
      Place it immediately using the manifest rectangle.
      After poster/video dimensions arrive, it is refit to the true aspect ratio.
    */
    applyBasePosition(box, rect, slot);

    if (posterImg) {
      posterImg.onload = function () {
        fitVideoItem(item);
      };

      if (posterImg.complete) {
        fitVideoItem(item);
      }
    }

    if (video.videoWidth && video.videoHeight) {
      onMeta();
    }

    S.activeMedia.push(item);

    if (m.autoplay) {
      video.play().catch(function () {});
    }
  };

  EPSF.media.createAudioOverlay = function (m, slot) {
    if (!D.mediaLayer || !m.src) return;

    var rect = U.normalizeRect(m);

    var box = document.createElement("div");
    box.className = "media-box media-audio";

    var audio = new Audio(resolveSrc(m.src));
    audio.loop = !!m.loop;
    audio.preload = "auto";
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
      pauseOtherMedia(audio);
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

    applyBasePosition(box, rect, slot);

    S.activeMedia.push({
      el: box,
      player: audio,
      media: m,
      page: m.page,
      type: "audio",
      rect: rect,
      slot: slot,
      key: entryKey(m, slot)
    });

    if (m.autoplay) {
      audio.play().catch(function () {});
    }
  };

  function getDesiredMedia() {
    var out = [];

    if (!S.issueManifest || !Array.isArray(S.issueManifest.media)) {
      return out;
    }

    S.issueManifest.media.forEach(function (m) {
      var slot = getPageSlotForOriginalPage(m.page);
      if (!slot) return;

      out.push({
        m: m,
        slot: slot,
        key: entryKey(m, slot)
      });
    });

    return out;
  }

  EPSF.media.syncForCurrentPage = function (force) {
    if (!D.mediaLayer) return;

    if (!S.issueManifest || !Array.isArray(S.issueManifest.media)) {
      EPSF.media.clearOverlays();
      return;
    }

    if (D.reader.hidden) {
      return;
    }

    if (!force) {
      if (S.coverAnimating || S.isJumping) {
        return;
      }

      if (S.sfState !== "read") {
        return;
      }
    }

    if (S.viewMode && S.viewMode !== "book") {
      return;
    }

    var desired = getDesiredMedia();

    var same =
      desired.length === S.activeMedia.length &&
      desired.every(function (d, i) {
        return S.activeMedia[i] && S.activeMedia[i].key === d.key;
      });

    /*
      If the same media is already active, do not restart it.
      This prevents harmless state changes from killing playback.
    */
    if (same) {
      EPSF.media.reposition();

      S.activeMedia.forEach(function (item) {
        if (item.el) {
          item.el.classList.remove("is-stale");
        }
      });

      return;
    }

    EPSF.media.clearOverlays();

    desired.forEach(function (d) {
      if (d.m.type === "video") {
        EPSF.media.createVideoOverlay(d.m, d.slot);
      } else if (d.m.type === "audio") {
        EPSF.media.createAudioOverlay(d.m, d.slot);
      }
    });
  };

  EPSF.media.getPageSlotForOriginalPage = getPageSlotForOriginalPage;
  EPSF.media.applyBasePosition = applyBasePosition;
  EPSF.media.fitVideoItem = fitVideoItem;
})();
