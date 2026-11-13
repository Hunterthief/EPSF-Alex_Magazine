(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  EPSF.media.clearOverlays = function () {
    S.activeMedia.forEach(function (item) {
      try {
        if (item.player) {
          if (item.player.pause) item.player.pause();
          if (item.player.removeAttribute) item.player.removeAttribute("src");
          if (item.player.load) item.player.load();
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

  /*
    Move existing:
    - getPageSlotForOriginalPage
    - applyMediaPosition
    - pauseOtherMedia
    - createVideoOverlay
    - createAudioOverlay
  */
})();
