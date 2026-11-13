(function () {
  "use strict";

  var S = EPSF.state;
  var C = EPSF.config;

  EPSF.loaders.tryEach = function (urls, fn) {
    return urls.reduce(function (chain, url) {
      return chain.catch(function () {
        return fn(url);
      });
    }, Promise.reject(new Error("no urls configured")));
  };

  EPSF.loaders.hasPageFlip = function () {
    return (
      typeof window.St !== "undefined" &&
      window.St &&
      typeof window.St.PageFlip === "function"
    );
  };

  EPSF.loaders.dynamicImport = function (url) {
    try {
      return Function("u", "return import(u)")(url);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  EPSF.loaders.pickPageFlipConstructor = function (mod) {
    return (
      mod &&
      (
        mod.PageFlip ||
        (mod.default && (mod.default.PageFlip || mod.default)) ||
        (mod.st && mod.st.PageFlip)
      )
    );
  };

  EPSF.loaders.setGlobalPageFlip = function (Ctor) {
    if (typeof Ctor !== "function") {
      throw new Error("PageFlip constructor not found");
    }

    window.St = window.St || {};
    window.St.PageFlip = Ctor;
  };

  EPSF.loaders.loadPageFlipEsm = function (src) {
    if (!src) return Promise.reject(new Error("empty ESM url"));

    return EPSF.loaders.dynamicImport(src).then(function (mod) {
      var Ctor = EPSF.loaders.pickPageFlipConstructor(mod);

      if (!Ctor) {
        throw new Error("No PageFlip export found in: " + src);
      }

      EPSF.loaders.setGlobalPageFlip(Ctor);
    });
  };

  EPSF.loaders.loadPageFlipScript = function (src) {
    if (!src) return Promise.reject(new Error("empty script url"));

    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;

      s.onload = function () {
        if (EPSF.loaders.hasPageFlip()) {
          resolve();
        } else {
          reject(new Error("Script loaded but St.PageFlip is missing: " + src));
        }
      };

      s.onerror = function () {
        reject(new Error("Script failed to load: " + src));
      };

      document.head.appendChild(s);
    });
  };

  EPSF.loaders.pageFlipLoadPromise = null;
  EPSF.loaders.pageFlipLastError = null;

  EPSF.loaders.ensurePageFlip = function () {
    if (EPSF.loaders.hasPageFlip()) return Promise.resolve();
    if (EPSF.loaders.pageFlipLoadPromise) return EPSF.loaders.pageFlipLoadPromise;

    EPSF.loaders.pageFlipLoadPromise =
      EPSF.loaders.tryEach(C.pageFlipEsmUrls || [], EPSF.loaders.loadPageFlipEsm)
        .catch(function (esmError) {
          EPSF.loaders.pageFlipLastError = esmError;
          return EPSF.loaders.tryEach(C.pageFlipScriptUrls || [], EPSF.loaders.loadPageFlipScript);
        })
        .then(function () {
          if (!EPSF.loaders.hasPageFlip()) {
            throw new Error("Page flip library did not register St.PageFlip");
          }

          EPSF.loaders.pageFlipLoadPromise = null;
          EPSF.loaders.pageFlipLastError = null;
        })
        .catch(function (err) {
          EPSF.loaders.pageFlipLoadPromise = null;
          EPSF.loaders.pageFlipLastError = err;
          throw err;
        });

    return EPSF.loaders.pageFlipLoadPromise;
  };

  EPSF.loaders.turnLoadPromise = null;

  EPSF.loaders.loadTurnScript = function (src) {
    if (!src) return Promise.reject(new Error("empty script url"));

    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;

      s.onload = function () {
        resolve();
      };

      s.onerror = function () {
        reject(new Error("Script failed to load: " + src));
      };

      document.head.appendChild(s);
    });
  };

  EPSF.loaders.ensureTurnJS = function () {
    if (EPSF.loaders.TQ && EPSF.loaders.TQ.fn && EPSF.loaders.TQ.fn.turn) {
      return Promise.resolve();
    }

    if (EPSF.loaders.turnLoadPromise) {
      return EPSF.loaders.turnLoadPromise;
    }

    EPSF.loaders.turnLoadPromise =
      EPSF.loaders.tryEach(C.jqueryUrls || [], EPSF.loaders.loadTurnScript)
        .then(function () {
          if (!window.jQuery) {
            throw new Error("jQuery did not register");
          }

          return EPSF.loaders.tryEach(C.turnJsUrls || [], EPSF.loaders.loadTurnScript);
        })
        .then(function () {
          if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.turn) {
            throw new Error("Turn.js did not register jQuery.fn.turn");
          }

          EPSF.loaders.TQ = window.jQuery.noConflict(true);
        })
        .catch(function (err) {
          EPSF.loaders.turnLoadPromise = null;
          throw err;
        });

    return EPSF.loaders.turnLoadPromise;
  };
})();
