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
    /*
      Move your existing computeLayout() here.
      Replace direct DOM variables with:
      D.stage
      D.bookWrap
      D.spineShadow
      D.turnCover
    */
  };

  EPSF.layout.rebuildInner = function () {
    /*
      Move your existing rebuildInner() here.
      It should populate:
      S.inner
      S.pageMeta
      S.N
      S.lastSpreadIdx
      S.maxSpread
    */
  };

  EPSF.layout.buildStacks = function () {
    /*
      Move existing buildStacks() here.
    */
  };

  EPSF.layout.updateStacks = function () {
    /*
      Move existing updateStacks() here.
    */
  };
})();
