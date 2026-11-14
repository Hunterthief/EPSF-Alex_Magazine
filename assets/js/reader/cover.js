(function () {
  "use strict";

  EPSF.cover = EPSF.cover || {};

  function noop() {}

  EPSF.cover.open = noop;
  EPSF.cover.closeToCover = noop;
  EPSF.cover.finishOpen = noop;
  EPSF.cover.finishClose = noop;
  EPSF.cover.forceFront = noop;
  EPSF.cover.forceBook = noop;
  EPSF.cover.destroy = noop;
  EPSF.cover.build = function () { return false; };
  EPSF.cover.showStatic = noop;
  EPSF.cover.position = noop;
  EPSF.cover.clearWatchdog = noop;
  EPSF.cover.bindClick = noop;
})();
