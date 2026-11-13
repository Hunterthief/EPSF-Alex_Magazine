(function () {
  "use strict";

  var S = EPSF.state;
  var D = EPSF.dom;
  var U = EPSF.util;

  EPSF.cacheDom();

  S.cards = Array.prototype.slice.call(
    document.querySelectorAll(".card, .card-featured")
  );

  S.cards.forEach(function (card) {
    var p = U.parseIssueName(card.dataset.fileName);

    var ti = card.querySelector(".js-issue-title");
    var da = card.querySelector(".js-issue-date");
    var ct = card.querySelector(".js-cover-title");

    if (ti) ti.textContent = p.title;
    if (ct) ct.textContent = p.title;

    if (da && p.date) {
      da.textContent = p.date.toLocaleDateString("en", {
        year: "numeric",
        month: "long",
        timeZone: "UTC"
      });
    }
  });

  var uniqueIssueNames = Object.create(null);
  var uniqueIssueCount = 0;

  S.cards.forEach(function (card) {
    var fileName = card.dataset.fileName;

    if (fileName && !uniqueIssueNames[fileName]) {
      uniqueIssueNames[fileName] = true;
      uniqueIssueCount++;
    }
  });

  if (D.statIssues) {
    D.statIssues.textContent = uniqueIssueCount
      ? String(uniqueIssueCount).padStart(2, "0")
      : "—";
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var i = Array.prototype.indexOf.call(
            document.querySelectorAll(".card"),
            entry.target
          );

          entry.target.style.transitionDelay =
            Math.max(0, Math.min(i, 8)) * 55 + "ms";

          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: "0px 0px -40px 0px"
    });

    document.querySelectorAll(".card").forEach(function (c) {
      io.observe(c);
    });

    document.querySelectorAll(".card-featured").forEach(function (c) {
      c.style.opacity = 1;
    });
  } else {
    document.querySelectorAll(".card").forEach(function (c) {
      c.classList.add("is-visible");
    });
  }

  if (!S.RM && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".tilt").forEach(function (el) {
      var raf = null;

      el.addEventListener("mousemove", function (ev) {
        if (raf) return;

        raf = requestAnimationFrame(function () {
          raf = null;

          var r = el.getBoundingClientRect();
          var px = (ev.clientX - r.left) / r.width - 0.5;
          var py = (ev.clientY - r.top) / r.height - 0.5;

          var lift = el.classList.contains("card-featured")
            ? "translateY(-8px)"
            : "translateY(-6px)";

          el.style.transform =
            lift +
            " perspective(1200px) rotateY(" +
            (px * 5.5).toFixed(2) +
            "deg) rotateX(" +
            (-py * 5.5).toFixed(2) +
            "deg)";
        });
      });

      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  EPSF.events.bindAll();
  EPSF.cover.bindClick();

  /*
    Load logo data URI for generated back cover / colophon.
  */
  (function loadLogoForBackCover() {
    try {
      fetch(EPSF.config.logoMark, { cache: "force-cache" })
        .then(function (r) {
          if (!r.ok) throw new Error("logo " + r.status);
          return r.blob();
        })
        .then(function (blob) {
          return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(fr.result); };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
        })
        .then(function (uri) {
          S.logoDataUri = uri;
        })
        .catch(function () {
          S.logoDataUri = null;
        });
    } catch (e) {
      S.logoDataUri = null;
    }
  })();
})();
