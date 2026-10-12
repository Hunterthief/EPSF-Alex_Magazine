document.addEventListener("DOMContentLoaded", () => {
  // 1. Title Parsing Logic
  function parseIssueName(fileName) {
    const name = fileName.replace(/\.pdf$/i, "");
    const match = name.match(/^(\d{4})-(\d{2})(?:[-_](.+))?$/);

    if (!match) return { title: name.replace(/[-_]/g, " "), date: null };

    const year = Number(match[1]);
    const month = Number(match[2]);
    const slug = match[3] || "";
    const date = new Date(Date.UTC(year, month - 1, 1));
    const monthName = date.toLocaleString("en", { month: "long", timeZone: "UTC" });
    let title = `${monthName} ${year}`;

    if (slug) {
      const prettySlug = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      title += ` — ${prettySlug}`;
    }
    return { title, date };
  }

  // 2. Update DOM elements with parsed titles
  document.querySelectorAll(".issue-card").forEach(card => {
    const fileName = card.dataset.fileName;
    if(!fileName) return;
    const parsed = parseIssueName(fileName);

    const titleElement = card.querySelector(".js-issue-title");
    const dateElement = card.querySelector(".js-issue-date");
    const coverTitle = card.querySelector(".js-cover-title");

    if (titleElement) titleElement.textContent = parsed.title;
    if (coverTitle) coverTitle.textContent = parsed.title;

    if (dateElement && parsed.date) {
      dateElement.textContent = parsed.date.toLocaleDateString("en", {
        year: "numeric", month: "long", timeZone: "UTC"
      });
    }
  });

  // 3. Scroll Animations (Intersection Observer)
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".issue-card").forEach(card => observer.observe(card));

  // 4. Viewer Page Logic
  const viewer = document.getElementById("magazine-viewer");
  if (viewer) {
    const params = new URLSearchParams(window.location.search);
    const issuePath = params.get("issue");
    const baseUrl = viewer.dataset.baseurl || "";

    if (!issuePath || !issuePath.startsWith("/magazines/") || !issuePath.endsWith(".pdf")) {
      viewer.innerHTML = `<div class="viewer-error" style="padding:40px;text-align:center;"><h2>Magazine not found</h2><p>Please go back and choose an issue from the homepage.</p></div>`;
    } else {
      const cleanPath = issuePath.replace(/\/+/g, "/");
      const pdfUrl = `${baseUrl}${cleanPath}`;
      const fileName = cleanPath.split("/").pop();

      const viewerTitle = document.getElementById("viewer-title");
      const viewerDownload = document.getElementById("viewer-download");

      if(viewerTitle) viewerTitle.textContent = parseIssueName(fileName).title;
      if(viewerDownload) viewerDownload.href = pdfUrl;

      // Level 1 Viewer: Built-in browser iframe
      viewer.innerHTML = `<iframe class="pdf-frame" src="${pdfUrl}" title="EPSF Alex PE Magazine issue"></iframe>`;
    }
  }
});
