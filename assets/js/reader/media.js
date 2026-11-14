(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  function entryKey(m, slot) {
    return [
      m.page,
      m.type,
      m.src,
      slot && slot.slot ? slot.slot : "none"
    ].join("|");
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

  function fitVideoItem(item) {
    if (!item || item.type !== "video") return;

    var box = item.el;
    var video = item.player;
    var rect = item.rect;
    var slot = item.slot;

    if (!box || !video || !rect) return;

    var pageW = S.pageW;
    var pageH = S.pageH;

    if (pageW <= 0 || pageH <= 0) return;

    var baseX = slot && slot.slot === "right" ? pageW : 0;

    var rectX = baseX + rect.x * pageW;
    var rectY = rect.y * pageH;
    var rectW = rect.w * pageW;
    var rectH = rect.h * pageH;

    if (rectW <= 0 || rectH <= 0) return;

    var vw = video.videoWidth || 0;
    var vh = video.videoHeight || 0;

    var videoAspect = (vw && vh) ? (vw / vh) : (rectW / rectH);
    var rectAspect = rectW / rectH;

    var w;
    var h;

    if (videoAspect >= rectAspect) {
      w = rectW;
      h = w / Math.max(videoAspect, 0.0001);
    } else {
      h = rectH;
      w = h * Math.max(videoAspect, 0.0001);
    }

    w = Math.min(w, rectW);
    h = Math.min(h, rectH);

    var left = rectX + (rectW - w) / 2;
    var top = rectY + (rectH - h) / 2;

    box.style.left = Math.round(left) + "px";
    box.style.top = Math.round(top) + "px";
    box.style.width = Math.max(1, Math.round(w)) + "px";
    box.style.height = Math.max(1, Math.round(h)) + "px";

    video.style.width = "100%";
    video.style.height = "100%";
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

  function capturePoster(video) {
    if (!video) return;
    if (video.dataset.posterCaptured === "1") return;

    video.dataset.posterCaptured = "1";

    /*
      If the manifest already supplied a poster, respect it.
    */
    if (video.poster) return;

    if (!video.videoWidth || !video.videoHeight) return;

    try {
      var canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      var ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      var dataUrl = canvas.toDataURL("image/jpeg", 0.82);

      if (dataUrl && dataUrl.length > 100) {
        video.poster = dataUrl;
      }
    } catch (e) {
      /*
        Canvas capture can fail for cross-origin media.
        The fallback below still tries to display the first frame.
      */
    }
  }

  function primeVideoFrame(video) {
    if (!video) return;
    if (video.dataset.framePrimed === "1") return;

    video.dataset.framePrimed = "1";

    /*
      Seek a tiny amount forward. Many browsers will then paint the first frame
      even while paused.
    */
    try {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(0.05, video.duration / 2);
      }
    } catch (e) {}

    /*
      Some browsers still refuse to paint a paused video until it has played once.
      We temporarily mute, play for an instant, then pause again.
      This is only to make the video visibly part of the page.
    */
    var wasMuted = video.muted;

    try {
      video.muted = true;

      var p = video.play();

      if (p && typeof p.then === "function") {
        p.then(function () {
          try {
            video.pause();
          } catch (e) {}

          video.muted = wasMuted;
        }).catch(function () {
          video.muted = wasMuted;
        });
      } else {
        try {
          video.pause();
        } catch (e) {}

        video.muted = wasMuted;
      }
    } catch (e) {
      video.muted = wasMuted;
    }
  }

  function prepareVisibleVideoFrame(video, autoplay) {
    if (autoplay) return;

    /*
      Do not interrupt another video that is already playing.
    */
    if (hasOtherPlaying(video)) return;

    primeVideoFrame(video);
  }

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

    var box = document.createElement("div");
    box.className = "media-box media-video";
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.setAttribute(
      "aria-label",
      (m.title || "Video") + " — click to play or pause"
    );

    var video = document.createElement("video");

    /*
      Always invisible native controls.
      Click/tap the video itself to play/pause.
    */
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

    /*
      Visible immediately. No fade-in-on-click behavior.
    */
    video.style.opacity = "1";

    if (m.title) {
      video.setAttribute("aria-label", m.title);
    }

    if (m.poster) {
      video.poster = U.resolveMediaSrc(m.poster);
    }

    video.src = U.resolveMediaSrc(m.src);

    var item = {
      el: box,
      player: video,
      media: m,
      page: m.page,
      type: "video",
      rect: rect,
      slot: slot,
      key: entryKey(m, slot)
    };

    function fit() {
      fitVideoItem(item);
    }

    function onMeta() {
      fit();
      capturePoster(video);
      prepareVisibleVideoFrame(video, !!m.autoplay);
    }

    function onData() {
      fit();
      capturePoster(video);
      prepareVisibleVideoFrame(video, !!m.autoplay);
    }

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("loadeddata", onData);
    video.addEventListener("canplay", onMeta);

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

    box.appendChild(video);
    D.mediaLayer.appendChild(box);

    /*
      Place it immediately using the manifest rectangle.
      After metadata loads, it is refit to the true video aspect ratio.
    */
    applyBasePosition(box, rect, slot);

    S.activeMedia.push(item);

    /*
      If dimensions are already known synchronously, fit/prime now.
    */
    if (video.videoWidth && video.videoHeight) {
      onMeta();
    }

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

  EPSF.media.syncForCurrentPage = function () {
    if (!D.mediaLayer) return;

    if (!S.issueManifest || !Array.isArray(S.issueManifest.media)) {
      EPSF.media.clearOverlays();
      return;
    }

    if (D.reader.hidden) {
      return;
    }

    if (S.coverAnimating || S.isJumping) {
      return;
    }

    if (S.sfState !== "read") {
      return;
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
