(function () {
  "use strict";

  var S = EPSF.state;

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

  EPSF.util.makeBackCoverDataUrl = function (w, h) {
    var cx = w / 2;
    var cy = h / 2;
    var logoSize = Math.round(Math.min(w, h) * 0.14);

    var logoMarkup;

    if (S.logoDataUri) {
      var LH = logoSize * 2.0;
      var LW = logoSize * 2.0;
      var LX = cx - LW / 2;
      var LY = (cy - logoSize * 1.05) - LH / 2;

      logoMarkup =
        '<image x="' + LX + '" y="' + LY + '" width="' + LW + '" height="' + LH + '"' +
        ' preserveAspectRatio="xMidYMid meet" filter="url(#whiteTint)" href="' + S.logoDataUri + '"/>';
    } else {
      logoMarkup =
        '<g transform="translate(' + (cx - logoSize / 2) + ',' + (cy - logoSize * 1.45) + ') scale(' + (logoSize / 50) + ')">' +
          '<circle cx="25" cy="25" r="23" fill="none" stroke="#8AB4FF" stroke-width="2"/>' +
          '<path d="M15 15 L35 15 L35 20 L20 20 L20 23 L32 23 L32 28 L20 28 L20 35 L35 35 L35 40 L15 40 Z" fill="#FFFFFF"/>' +
        '</g>';
    }

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs>' +
          '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#001233"/>' +
            '<stop offset="0.6" stop-color="#022a73"/>' +
            '<stop offset="1" stop-color="#0241c4"/>' +
          '</linearGradient>' +
          '<radialGradient id="glow" cx="0.5" cy="0.15" r="0.8">' +
            '<stop offset="0" stop-color="#6E9BFF" stop-opacity="0.22"/>' +
            '<stop offset="1" stop-color="#6E9BFF" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<filter id="whiteTint" x="-10%" y="-10%" width="120%" height="120%">' +
            '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/>' +
          '</filter>' +
        '</defs>' +
        '<rect width="' + w + '" height="' + h + '" fill="url(#bg)"/>' +
        '<rect width="' + w + '" height="' + h + '" fill="url(#glow)"/>' +
        logoMarkup +
        '<text x="' + cx + '" y="' + (cy + logoSize * 0.20) + '" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="' + Math.round(logoSize * 0.18) + '" letter-spacing="6" fill="#FFFFFF" fill-opacity="0.62">PE MAGAZINE</text>' +
        '<rect x="' + (cx - logoSize * 0.35) + '" y="' + (cy + logoSize * 0.50) + '" width="' + (logoSize * 0.7) + '" height="3" rx="1.5" fill="#6E9BFF"/>' +
        '<text x="' + cx + '" y="' + (cy + logoSize * 0.95) + '" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="' + Math.round(logoSize * 0.2) + '" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.82">THANK YOU FOR READING</text>' +
      '</svg>';

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  EPSF.util.makeColophonDataUrl = function (w, h) {
    var cx = w / 2;
    var cy = h / 2;
    var logoSize = Math.round(Math.min(w, h) * 0.16);

    var logoMarkup = S.logoDataUri
      ? '<image x="' + (cx - logoSize) + '" y="' + (cy - logoSize * 1.6) + '" width="' + (logoSize * 2) + '" height="' + (logoSize * 2) + '" preserveAspectRatio="xMidYMid meet" href="' + S.logoDataUri + '"/>'
      : '';

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<rect width="' + w + '" height="' + h + '" fill="#F5F7FF"/>' +
        logoMarkup +
        '<text x="' + cx + '" y="' + (cy + logoSize * 1.1) + '" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="' + Math.round(logoSize * 0.22) + '" letter-spacing="4" fill="#0241c4" fill-opacity="0.55">EPSF ALEX PE MAGAZINE</text>' +
      '</svg>';

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  EPSF.util.normalizeManifest = function (raw, pageCount) {
    var out = {
      pages: pageCount,
      media: []
    };

    if (!raw) return out;

    if (raw.pages) {
      out.pages = Math.max(1, parseInt(raw.pages, 10) || pageCount);
    }

    var arr = [];

    if (Array.isArray(raw)) {
      arr = raw;
    } else if (raw && Array.isArray(raw.media)) {
      arr = raw.media;
    }

    arr.forEach(function (m) {
      if (!m || !m.type || !m.src) return;

      var page = m.page;

      if (page === "cover") {
        page = 1;
      } else if (page === "back" || page === "backCover") {
        page = pageCount + 1;
      } else {
        page = parseInt(page, 10);
      }

      if (!page) return;

      var type = String(m.type).toLowerCase();
      var rect = null;

      if (m.rect) {
        if (Array.isArray(m.rect)) {
          rect = {
            x: m.rect[0],
            y: m.rect[1],
            w: m.rect[2],
            h: m.rect[3]
          };
        } else {
          rect = m.rect;
        }
      }

      out.media.push({
        page: page,
        type: type,
        src: m.src,
        poster: m.poster || "",
        title: m.title || "",
        rect: rect,
        trigger: m.trigger || "visible",
        autoplay: !!m.autoplay,
        controls: m.controls !== false,
        loop: !!m.loop,
        muted: !!m.muted,
        volume: typeof m.volume === "number" ? m.volume : 0.85,
        preload: m.preload || "metadata"
      });
    });

    return out;
  };

  EPSF.util.resolveMediaSrc = function (src) {
    if (!src) return "";

    if (
      /^https?:\/\//i.test(src) ||
      /^data:/i.test(src) ||
      src.charAt(0) === "/"
    ) {
      return src;
    }

    return S.pagesUrl.replace(/\/$/, "") + "/" + src.replace(/^\.\//, "");
  };

  EPSF.util.normalizeRect = function (m) {
    var r = m.rect || {};

    var def = m.type === "audio"
      ? { x: 0.08, y: 0.78, w: 0.84, h: 0.12 }
      : { x: 0.08, y: 0.18, w: 0.84, h: 0.54 };

    var x = EPSF.util.clampUnit(r.x != null ? r.x : def.x);
    var y = EPSF.util.clampUnit(r.y != null ? r.y : def.y);
    var w = EPSF.util.clampUnit(r.w != null ? r.w : def.w);
    var h = EPSF.util.clampUnit(r.h != null ? r.h : def.h);

    w = Math.min(w, 1 - x);
    h = Math.min(h, 1 - y);

    return { x: x, y: y, w: w, h: h };
  };

  EPSF.util.formatMediaTime = function (seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  };
})();
