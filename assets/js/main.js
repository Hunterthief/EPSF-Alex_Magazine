document.addEventListener("DOMContentLoaded", () => {

  // ========================================
  // 1. TITLE PARSING
  // ========================================
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

  // ========================================
  // 2. UPDATE CARD TITLES & DATES
  // ========================================
  document.querySelectorAll(".issue-card").forEach(card => {
    const fileName = card.dataset.fileName;
    if (!fileName) return;
    const parsed = parseIssueName(fileName);

    const titleEl = card.querySelector(".js-issue-title");
    const dateEl = card.querySelector(".js-issue-date");
    const coverTitle = card.querySelector(".js-cover-title");

    if (titleEl) titleEl.textContent = parsed.title;
    if (coverTitle) coverTitle.textContent = parsed.title;
    if (dateEl && parsed.date) {
      dateEl.textContent = parsed.date.toLocaleDateString("en", {
        year: "numeric", month: "long", timeZone: "UTC"
      });
    }
  });

  // ========================================
  // 3. SCROLL ANIMATIONS
  // ========================================
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".issue-card").forEach(card => observer.observe(card));

  // ========================================
  // 4. FULLSCREEN MODAL VIEWER
  // ========================================
  const modal = document.getElementById("viewer-modal");
  const backdrop = modal.querySelector(".viewer-modal-backdrop");
  const closeBtn = document.getElementById("viewer-close");
  const frame = document.getElementById("viewer-frame");
  const titleEl = document.getElementById("viewer-title");
  const downloadEl = document.getElementById("viewer-download");

  function openViewer(pdfUrl, fileName) {
    const parsed = parseIssueName(fileName);
    titleEl.textContent = parsed.title;
    downloadEl.href = pdfUrl;
    frame.src = pdfUrl;
    modal.hidden = false;
    document.body.style.overflow = "hidden"; // prevent background scroll
  }

  function closeViewer() {
    modal.hidden = true;
    frame.src = ""; // stop loading the PDF
    document.body.style.overflow = "";
  }

  // Open when clicking a card
  document.querySelectorAll(".issue-card").forEach(card => {
    card.addEventListener("click", () => {
      openViewer(card.dataset.pdfUrl, card.dataset.fileName);
    });
    // Keyboard accessibility
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openViewer(card.dataset.pdfUrl, card.dataset.fileName);
      }
    });
  });

  // Close triggers
  closeBtn.addEventListener("click", closeViewer);
  backdrop.addEventListener("click", closeViewer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeViewer();
  });
});
