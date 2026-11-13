(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  EPSF.ui.getCurrentIndex = function () {
    if (!S.pageFlip) return S.currentIdx;

    try {
      var i = S.pageFlip.getCurrentPageIndex();
      return typeof i === "number" ? i : S.currentIdx;
    } catch (e) {
      return S.currentIdx;
    }
  };

  EPSF.ui.updateUIAll = function () {
    EPSF.layout.updateStacks();
    EPSF.ui.updateDock();
    EPSF.ui.updateHint();
    EPSF.ui.updateEnd();
  };

  EPSF.ui.updateDock = function () {
    if (S.isMobile) {
      var pageNum = S.currentIdx + 1;
      if (pageNum > S.N) pageNum = S.N;

      D.dPages.textContent = "Page " + pageNum + " / " + S.N;
      D.dFill.style.width = Math.round((pageNum / Math.max(S.N, 1)) * 100) + "%";

      D.dPrev.disabled = S.currentIdx <= 0;
      D.dNext.disabled = S.currentIdx >= S.N - 1;

      D.edgeL.classList.toggle("off", S.currentIdx <= 0);
      D.edgeR.classList.toggle("off", S.currentIdx >= S.N - 1);

      return;
    }

    var desktopPages = S.N + 1;

    if (S.viewMode === "front") {
      D.dPages.textContent = "Cover";
      D.dFill.style.width = Math.round((1 / Math.max(desktopPages, 1)) * 100) + "%";

      D.dPrev.disabled = true;
      D.dNext.disabled = S.N <= 0;

      D.edgeL.classList.add("off");
      D.edgeR.classList.toggle("off", S.N <= 0);

      return;
    }

    if (S.N <= 0) {
      D.dPages.textContent = "Cover";
      D.dFill.style.width = "0%";

      D.dPrev.disabled = true;
      D.dNext.disabled = true;

      D.edgeL.classList.add("off");
      D.edgeR.classList.add("off");

      return;
    }

    var atEnd = S.isPortrait
      ? (S.currentIdx >= S.N - 1)
      : (S.currentIdx >= S.lastSpreadIdx);

    if (atEnd) {
      D.dPages.textContent = "Back Cover";
      D.dFill.style.width = "100%";

      D.dPrev.disabled = false;
      D.dNext.disabled = true;

      D.edgeL.classList.remove("off");
      D.edgeR.classList.add("off");

      return;
    }

    if (S.isPortrait) {
      var logical = Math.min(desktopPages, S.currentIdx + 2);
      D.dPages.textContent = "Page " + logical + " / " + desktopPages;
      D.dFill.style.width = Math.round((logical / desktopPages) * 100) + "%";
    } else {
      var leftLogical = S.currentIdx + 2;
      var rightLogical = leftLogical + 1;

      if (leftLogical > desktopPages) leftLogical = desktopPages;
      if (rightLogical > desktopPages) rightLogical = 0;

      D.dPages.textContent =
        (rightLogical ? leftLogical + "–" + rightLogical : leftLogical) +
        " / " + desktopPages;

      var lastVisible = rightLogical || leftLogical;
      D.dFill.style.width = Math.round(Math.min(100, (lastVisible / desktopPages) * 100)) + "%";
    }

    D.dPrev.disabled = false;
    D.dNext.disabled = false;

    D.edgeL.classList.remove("off");
    D.edgeR.classList.remove("off");
  };

  EPSF.ui.updateHint = function () {
    if (S.coverAnimating) {
      EPSF.ui.hideHint();
      return;
    }

    if (S.isMobile) {
      EPSF.ui.hideHint();
      return;
    }

    if (S.viewMode === "front") {
      EPSF.ui.showHint("Click the cover to open");
    } else if (S.viewMode === "book" && S.currentIdx === 0) {
      EPSF.ui.showHint("Click left edge to return to cover");
    } else {
      EPSF.ui.hideHint();
    }
  };

  EPSF.ui.updateEnd = function () {
    if (S.isMobile) {
      EPSF.ui.hideEnd();
      return;
    }

    if (S.viewMode !== "book" || S.N <= 0) {
      EPSF.ui.hideEnd();
      return;
    }

    var atEnd = S.isPortrait
      ? (S.currentIdx >= S.N - 1)
      : (S.currentIdx >= S.lastSpreadIdx);

    if (atEnd) EPSF.ui.showEnd();
    else EPSF.ui.hideEnd();
  };

  EPSF.ui.showHint = function (txt) {
    D.hintTxt.textContent = txt;
    D.hint.classList.add("show");
  };

  EPSF.ui.hideHint = function () {
    D.hint.classList.remove("show");
  };

  EPSF.ui.showEnd = function () {
    D.endCard.classList.add("show");
  };

  EPSF.ui.hideEnd = function () {
    D.endCard.classList.remove("show");
  };

  EPSF.ui.showTip = function (text) {
    D.sheetTip.textContent = text;
    D.sheetTip.classList.add("show");
  };

  EPSF.ui.hideTip = function () {
    D.sheetTip.classList.remove("show");
  };

  EPSF.ui.moveTip = function (e) {
    var x = e.clientX + 16;
    var y = e.clientY + 16;
    var w = D.sheetTip.offsetWidth || 140;
    var h = D.sheetTip.offsetHeight || 34;

    if (x + w > window.innerWidth - 10) x = e.clientX - w - 16;
    if (y + h > window.innerHeight - 10) y = e.clientY - h - 16;

    D.sheetTip.style.left = x + "px";
    D.sheetTip.style.top = y + "px";
  };

  EPSF.ui.showSparks = function (dir) {
    D.flash.classList.remove("side-l", "side-r", "side-b");
    D.flash.classList.add(dir < 0 ? "side-l" : (dir > 0 ? "side-r" : "side-b"));
    D.flash.classList.add("active");

    if (S.sparkTimer) return;

    S.sparkTick = 0;
    S.sparkTimer = setInterval(function () {
      EPSF.ui.spawnSpark();
      EPSF.ui.spawnSpark();
      S.sparkTick++;

      if (S.sparkTick % 2 === 0) {
        EPSF.ui.playSparkSound();
      }
    }, 70);

    EPSF.ui.spawnSpark();
    EPSF.ui.spawnSpark();
  };

  EPSF.ui.hideSparks = function () {
    D.flash.classList.remove("active");

    if (S.sparkTimer) {
      clearInterval(S.sparkTimer);
      S.sparkTimer = null;
    }
  };

  EPSF.ui.spawnSpark = function () {
    var side = Math.random() > 0.5 ? 1 : -1;
    var xPct = side > 0 ? (93 + Math.random() * 7) : (Math.random() * 7);
    var drift = side * (24 + Math.random() * 40);
    var rot = -55 + Math.random() * 110;

    var line = document.createElement("div");
    line.className = "spark";
    line.style.height = (14 + Math.random() * 48) + "px";
    line.style.left = xPct + "%";
    line.style.top = (4 + Math.random() * 88) + "%";
    line.style.setProperty("--rot", rot + "deg");
    line.style.setProperty("--drift", drift + "px");

    D.sparks.appendChild(line);

    setTimeout(function () {
      if (line.parentNode) line.parentNode.removeChild(line);
    }, 520);

    if (Math.random() > 0.42) {
      var dot = document.createElement("div");
      dot.className = "spark-dot";
      dot.style.left = xPct + "%";
      dot.style.top = (8 + Math.random() * 84) + "%";
      dot.style.setProperty("--drift", drift + "px");
      dot.style.setProperty("--fall", (-8 + Math.random() * 20) + "px");

      D.sparks.appendChild(dot);

      setTimeout(function () {
        if (dot.parentNode) dot.parentNode.removeChild(dot);
      }, 470);
    }
  };

  EPSF.ui.ensureAudio = function () {
    try {
      if (!S.audioCtx) {
        S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (S.audioCtx && S.audioCtx.state === "suspended") {
        S.audioCtx.resume();
      }

      EPSF.ui.initSounds();
      return S.audioCtx;
    } catch (e) {
      return null;
    }
  };

  EPSF.ui.loadBufferFromUrls = function (urls) {
    return new Promise(function (resolve, reject) {
      var i = 0;

      function tryNext() {
        if (i >= urls.length) return reject(new Error("no source"));

        var u = urls[i++];

        fetch(u, { cache: "force-cache" })
          .then(function (r) {
            if (!r.ok) throw new Error("bad response");
            return r.arrayBuffer();
          })
          .then(function (buf) {
            return S.audioCtx.decodeAudioData(buf);
          })
          .then(resolve)
          .catch(tryNext);
      }

      tryNext();
    });
  };

  EPSF.ui.initSounds = function () {
    if (S.soundsInitialized || !S.audioCtx) return;

    S.soundsInitialized = true;

    var base =
      (D.reader && D.reader.dataset && D.reader.dataset.soundsBase)
        ? D.reader.dataset.soundsBase.replace(/\/$/, "")
        : "";

    if (!base) return;

    EPSF.ui.loadBufferFromUrls([
      base + "/spark.mp3",
      base + "/spark.ogg",
      base + "/electric.mp3",
      base + "/electric.ogg"
    ])
      .then(function (b) {
        S.sparkBuffer = b;
      })
      .catch(function () {});
  };

  EPSF.ui.playSparkBuffer = function () {
    if (!S.audioCtx || !S.sparkBuffer) return false;

    try {
      var src = S.audioCtx.createBufferSource();
      src.buffer = S.sparkBuffer;
      src.playbackRate.value = 0.9 + Math.random() * 0.25;

      var g = S.audioCtx.createGain();
      g.gain.value = 0.20;

      src.connect(g);
      g.connect(S.audioCtx.destination);
      src.start();

      return true;
    } catch (e) {
      return false;
    }
  };

  EPSF.ui.synthSpark = function () {
    try {
      var ctx = EPSF.ui.ensureAudio();
      if (!ctx) return;

      var t = ctx.currentTime;
      var bursts = 3 + Math.floor(Math.random() * 3);

      for (var b = 0; b < bursts; b++) {
        var bt = t + b * 0.025 + Math.random() * 0.018;
        var dur = 0.022 + Math.random() * 0.035;
        var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);

        for (var i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.1);
        }

        var src = ctx.createBufferSource();
        src.buffer = buf;

        var hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 3600 + Math.random() * 2600;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.055, bt);
        g.gain.exponentialRampToValueAtTime(0.0001, bt + dur);

        src.connect(hp);
        hp.connect(g);
        g.connect(ctx.destination);

        src.start(bt);
        src.stop(bt + dur);
      }

      var zap = ctx.createOscillator();
      var zg = ctx.createGain();

      zap.type = "sawtooth";
      zap.frequency.setValueAtTime(2200, t);
      zap.frequency.exponentialRampToValueAtTime(380, t + 0.09);

      zg.gain.setValueAtTime(0.035, t);
      zg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

      zap.connect(zg);
      zg.connect(ctx.destination);

      zap.start(t);
      zap.stop(t + 0.12);
    } catch (e) {}
  };

  EPSF.ui.playSparkSound = function () {
    var now = performance.now();

    if (now - S.lastSparkSound < 80) return;

    S.lastSparkSound = now;

    if (EPSF.ui.playSparkBuffer()) return;

    EPSF.ui.synthSpark();
  };

  EPSF.ui.wake = function () {
    D.reader.classList.remove("idle");
    clearTimeout(S.idleTimer);

    S.idleTimer = setTimeout(function () {
      if (!S.isJumping && !S.coverAnimating) {
        D.reader.classList.add("idle");
      }
    }, 2800);
  };

  EPSF.ui.failLoad = function (msg) {
    D.loader.classList.remove("gone");
    D.loader.classList.add("err");
    D.loaderTxt.textContent = msg;
  };
})();
