(function () {
  "use strict";

  window.EPSF = window.EPSF || {};

  EPSF.config = window.EPSF_CONFIG || {};

  EPSF.state = {
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

    viewMode: "front",
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

  EPSF.dom = {};
  EPSF.util = {};
  EPSF.loaders = {};
  EPSF.layout = {};
  EPSF.ui = {};
  EPSF.media = {};
  EPSF.cover = {};
  EPSF.flip = {};
  EPSF.zoom = {};
  EPSF.reader = {};
  EPSF.events = {};
  EPSF.main = {};

  EPSF.cacheDom = function () {
    EPSF.dom.reader = document.getElementById("reader");
    EPSF.dom.stage = document.getElementById("r-stage");
    EPSF.dom.bookWrap = document.getElementById("book-wrap");
    EPSF.dom.mount = document.getElementById("flipbook-mount");

    EPSF.dom.stackL = document.getElementById("stack-l");
    EPSF.dom.stackR = document.getElementById("stack-r");

    EPSF.dom.sparks = document.getElementById("sparks");
    EPSF.dom.flash = document.getElementById("rapid-flash");
    EPSF.dom.sheetTip = document.getElementById("sheet-tip");

    EPSF.dom.hint = document.getElementById("hint");
    EPSF.dom.hintTxt = document.getElementById("hint-txt");

    EPSF.dom.endCard = document.getElementById("end-card");
    EPSF.dom.loader = document.getElementById("loader");
    EPSF.dom.loaderTxt = document.getElementById("loader-txt");

    EPSF.dom.rTitle = document.getElementById("r-title");
    EPSF.dom.rDl = document.getElementById("r-dl");

    EPSF.dom.edgeL = document.getElementById("edge-l");
    EPSF.dom.edgeR = document.getElementById("edge-r");

    EPSF.dom.dPrev = document.getElementById("d-prev");
    EPSF.dom.dNext = document.getElementById("d-next");
    EPSF.dom.dPages = document.getElementById("d-pages");
    EPSF.dom.dTrack = document.getElementById("d-track");
    EPSF.dom.dFill = document.getElementById("d-fill");

    EPSF.dom.spineShadow = document.getElementById("spine-shadow");

    EPSF.dom.turnCover = document.getElementById("turn-cover");
    EPSF.dom.mediaLayer = document.getElementById("media-layer");

    EPSF.dom.rZoom = document.getElementById("r-zoom");

    EPSF.dom.zoomOverlay = document.getElementById("zoom-overlay");
    EPSF.dom.zoomStage = document.getElementById("zoom-stage");
    EPSF.dom.zoomPages = document.getElementById("zoom-pages");
    EPSF.dom.zoomLabel = document.getElementById("zoom-label");
    EPSF.dom.zoomPercent = document.getElementById("zoom-percent");
    EPSF.dom.zoomInBtn = document.getElementById("zoom-in");
    EPSF.dom.zoomOutBtn = document.getElementById("zoom-out");
    EPSF.dom.zoomResetBtn = document.getElementById("zoom-reset");
    EPSF.dom.zoomCloseBtn = document.getElementById("zoom-close");

    EPSF.dom.statIssues = document.getElementById("stat-issues");
    EPSF.dom.statPages = document.getElementById("stat-pages");
  };
})();
