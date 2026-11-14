(function () {
  "use strict";

  window.EPSF = window.EPSF || {};

  var E = window.EPSF;

  E.config = Object.assign({
    logoMark: "/assets/images/logo-mark.png",
    soundsBase: "/assets/sounds",
    coverSaverUrl: "",

    pageFlipEsmUrls: [
      "/assets/vendor/page-flip.esm.js",
      "https://esm.sh/page-flip@2.0.7",
      "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/+esm",
      "https://esm.run/page-flip@2.0.7"
    ],

    pageFlipScriptUrls: [
      "/assets/vendor/page-flip.browser.js"
    ]
  }, window.EPSF_CONFIG || {});

  E.state = {
    RM: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    STACK_MAX: 96,
    JUMP_ANIMATE_THRESHOLD: 10,

    logoDataUri: null,

    pagesUrl: "",
    total: 1,
    inner: [],
    pageMeta: [],
    N: 0,
    lastSpreadIdx: 0,
    maxSpread: 0,
    aspect: 0.72,
    pageW: 0,
    pageH: 0,
    backCoverSrc: "",

    pageFlip: null,
    currentIdx: 0,
    sfState: "read",
    isInitializing: false,
    suppressLoader: false,

    viewMode: "book",
    coverAnimating: false,
    coverAnimToken: 0,
    dragTurn: 0,

    heldDir: 0,
    heldLoopRunning: false,
    holdTimeout: null,

    sparkTimer: null,
    sparkTick: 0,

    stackRSheets: [],
    stackLSheets: [],
    stackRVisible: [],
    stackLVisible: [],
    stackRHover: null,
    stackLHover: null,

    jumpToken: 0,
    isJumping: false,
    idleTimer: null,

    isPortrait: false,
    isMobile: false,

    issueManifest: null,
    activeMedia: [],
    mediaUserGesture: false,

    turnCoverJQ: null,
    turnCoverReady: false,
    coverWatchdogTimer: null,

    audioCtx: null,
    soundsInitialized: false,
    sparkBuffer: null,
    lastSparkSound: 0,

    cards: [],

    zoom: {
      open: false,
      scale: 1,
      tx: 0,
      ty: 0,
      fitScale: 1,
      minScale: 0.2,
      maxScale: 8,
      dragging: false,
      lastX: 0,
      lastY: 0,
      lastDist: 0,
      lastMidX: 0,
      lastMidY: 0,
      downX: 0,
      downY: 0,
      moved: false,
      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,
      pointers: new Map()
    }
  };

  E.dom = {};
  E.util = {};
  E.loaders = {};
  E.layout = {};
  E.ui = {};
  E.media = {};
  E.cover = {};
  E.flip = {};
  E.zoom = {};
  E.reader = {};
  E.events = {};
  E.main = {};

  E.cacheDom = function () {
    E.dom.reader = document.getElementById("reader");
    E.dom.stage = document.getElementById("r-stage");
    E.dom.bookWrap = document.getElementById("book-wrap");
    E.dom.mount = document.getElementById("flipbook-mount");

    E.dom.stackL = document.getElementById("stack-l");
    E.dom.stackR = document.getElementById("stack-r");

    E.dom.sparks = document.getElementById("sparks");
    E.dom.flash = document.getElementById("rapid-flash");
    E.dom.sheetTip = document.getElementById("sheet-tip");

    E.dom.hint = document.getElementById("hint");
    E.dom.hintTxt = document.getElementById("hint-txt");

    E.dom.endCard = document.getElementById("end-card");
    E.dom.loader = document.getElementById("loader");
    E.dom.loaderTxt = document.getElementById("loader-txt");

    E.dom.rTitle = document.getElementById("r-title");
    E.dom.rDl = document.getElementById("r-dl");

    E.dom.edgeL = document.getElementById("edge-l");
    E.dom.edgeR = document.getElementById("edge-r");

    E.dom.dPrev = document.getElementById("d-prev");
    E.dom.dNext = document.getElementById("d-next");
    E.dom.dPages = document.getElementById("d-pages");
    E.dom.dTrack = document.getElementById("d-track");
    E.dom.dFill = document.getElementById("d-fill");

    E.dom.spineShadow = document.getElementById("spine-shadow");

    E.dom.turnCover = document.getElementById("turn-cover");
    E.dom.mediaLayer = document.getElementById("media-layer");

    E.dom.rZoom = document.getElementById("r-zoom");

    E.dom.zoomOverlay = document.getElementById("zoom-overlay");
    E.dom.zoomStage = document.getElementById("zoom-stage");
    E.dom.zoomPages = document.getElementById("zoom-pages");
    E.dom.zoomLabel = document.getElementById("zoom-label");
    E.dom.zoomPercent = document.getElementById("zoom-percent");
    E.dom.zoomInBtn = document.getElementById("zoom-in");
    E.dom.zoomOutBtn = document.getElementById("zoom-out");
    E.dom.zoomResetBtn = document.getElementById("zoom-reset");
    E.dom.zoomCloseBtn = document.getElementById("zoom-close");

    E.dom.statIssues = document.getElementById("stat-issues");
    E.dom.statPages = document.getElementById("stat-pages");
  };
})();
