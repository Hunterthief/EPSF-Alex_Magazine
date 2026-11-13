(function () {
  "use strict";

  var S = EPSF.state;
  var C = EPSF.config;

  EPSF.util.clampNum = function (v, min, max) {
    return Math.max(min, Math.min(max, v));
  };

  EPSF.util.clampUnit = function (v) {
    v = Number(v);
    if (!isFinite(v)) return 0;
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  };

  EPSF.util.pageUrl = function (n) {
    return S.pagesUrl + "/" + n + ".jpg";
  };

  EPSF.util.parseIssueName = function (fileName) {
    var name = String(fileName || "").replace(/\.pdf$/i, "");
    var m = name.match(/^(\d{4})-(\d{2})(?:[-_](.+))?$/);

    if (!m) {
      return {
        title: name.replace(/[-_]/g, " "),
        date: null
      };
    }

    var yr = +m[1];
    var mo = +m[2];
    var slug = m[3] || "";

    var d = new Date(Date.UTC(yr, mo - 1, 1));
    var mn = d.toLocaleString("en", { month: "long", timeZone: "UTC" });
    var t = mn + " " + yr;

    if (slug) {
      t += " — " + slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, function (c) {
          return c.toUpperCase();
        });
    }

    return { title: t, date: d };
  };

  EPSF.util.loadImage = function (src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = reject;
      im.src = src;
    });
  };

  EPSF.util.probeTotal = function () {
    var n = 1;

    function step(i) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () {
          n = i;
          resolve(step(i + 1));
        };
        im.onerror = function () {
          resolve(null);
        };
        im.src = EPSF.util.pageUrl(i);
      });
    }

    return step(2).then(function () {
      return n;
    });
  };

  /*
    Move these from your old script:
    - makeBackCoverDataUrl
    - makeColophonDataUrl
    - normalizeManifest
    - resolveMediaSrc
    - normalizeRect
    - formatMediaTime
  */
})();
