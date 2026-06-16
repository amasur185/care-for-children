/* =====================================================================
   Friends of Adhya - shared logic
   Used by both the generator form (index.html) and the page renderer
   (view.html). No backend: a friend's page is encoded entirely into a
   shareable link, so nothing needs to be committed to GitHub.
   ===================================================================== */

/* Care For Children programs a friend can choose to support */
const PROGRAMS = {
  construction: {
    title: "School Construction",
    url: "https://www.careforchildren.org/projects-list-schools.html",
    desc: "Funds the construction of new schools for children in rural India.",
    tag: "Active Project",
  },
  meals: {
    title: "Midday Meals",
    url: "https://www.careforchildren.org/projects-list.html",
    desc: "Nutritious meals that keep children healthy and in school. Every $1 funds roughly six meals for a child.",
    tag: "Active Project",
  },
  furniture: {
    title: "School Furniture",
    url: "https://www.careforchildren.org/projects-list-furniture.html",
    desc: "Tables, chairs, benches, and classroom boards that improve learning for thousands of students.",
    tag: "Active Project",
  },
  shoes: {
    title: "Shoes & Socks",
    url: "https://www.careforchildren.org/projects-list-shoes.html",
    desc: "Footwear and socks for tens of thousands of children across many schools.",
    tag: "Active Project",
  },
};

const DONATE_URL = "https://careforchildren.kindful.com/";
const CFC_URL = "https://www.careforchildren.org/";

/* ---------- small helpers ---------- */
function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Turn multi-line textarea text into paragraphs */
function paras(text) {
  const t = (text || "").trim();
  if (!t) return "";
  return t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${esc(l)}</p>`)
    .join("");
}

/* Normalize a user-entered website link into a safe absolute URL */
function safeLink(url) {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return "https://" + u;
}

/* ---------- image resize (keeps shareable links small) ---------- */
function resizeImage(file, maxDim, quality) {
  maxDim = maxDim || 480;
  quality = quality || 0.72;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => (img.src = reader.result);
    reader.onerror = reject;
    img.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width >= height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- encode / decode data into a URL-safe string ---------- */
function bytesToB64url(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function encodeData(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if ("CompressionStream" in window) {
    const cs = new CompressionStream("gzip");
    const buf = await new Response(
      new Blob([bytes]).stream().pipeThrough(cs)
    ).arrayBuffer();
    return "g" + bytesToB64url(new Uint8Array(buf));
  }
  return "r" + bytesToB64url(bytes);
}
async function decodeData(str) {
  const tag = str[0];
  const bytes = b64urlToBytes(str.slice(1));
  let jsonBytes = bytes;
  if (tag === "g") {
    const ds = new DecompressionStream("gzip");
    const buf = await new Response(
      new Blob([bytes]).stream().pipeThrough(ds)
    ).arrayBuffer();
    jsonBytes = new Uint8Array(buf);
  }
  return JSON.parse(new TextDecoder().decode(jsonBytes));
}

/* ---------- render a friend's full page body from their data ---------- */
function renderBodyHTML(d) {
  const name = esc(d.name || "A Friend of Adhya");
  const website = safeLink(d.website);

  /* Fundraising counter */
  const raised = Number(d.raised) || 0;
  const goal = Number(d.goal) || 0;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const money = (n) => "$" + Math.round(n).toLocaleString();
  const counterMeta =
    goal > 0
      ? money(raised) + " raised of " + money(goal) + " goal"
      : money(raised) + " raised";
  const counterSection = `
  <section class="raised" data-raised="${raised}" data-goal="${goal}">
    <div class="raised__inner">
      <span class="kicker">My fundraising so far</span>
      <div class="raised__amount" data-target="${raised}"><span class="raised__cur">$</span>0</div>
      <div class="raised__bar"><div class="raised__fill" data-width="${pct}"></div></div>
      <p class="raised__meta">${esc(counterMeta)}</p>
    </div>
  </section>`;

  const photo = d.photo
    ? `<img src="${d.photo}" alt="Photo of ${name}" />`
    : `<span class="photo-frame__hint">Photo coming soon</span>`;
  const photoEmptyClass = d.photo ? "" : " photo-frame--empty";

  const heroSecondBtn = website
    ? `<a class="btn btn--ghost" href="${esc(website)}" target="_blank" rel="noopener">My Website</a>`
    : `<a class="btn btn--ghost" href="#about">My story</a>`;

  /* About Me */
  const aboutBlocks =
    paras(d.who) +
    (d.achievements ? `<h3 class="fa-sub">Achievements</h3>${paras(d.achievements)}` : "") +
    (d.goals ? `<h3 class="fa-sub">My Goals for This Fundraiser</h3>${paras(d.goals)}` : "") +
    (d.vision ? `<h3 class="fa-sub">Vision &amp; Mission</h3>${paras(d.vision)}` : "");

  /* Why */
  const whySection = d.why
    ? `<section class="section section--tint" id="why">
        <div class="section__head">
          <span class="kicker">My Mission</span>
          <h2>Why I'm Raising Funds</h2>
        </div>
        <div class="why"><p class="why__lead">${esc(d.why)}</p></div>
      </section>`
    : "";

  /* Programs */
  const chosen =
    d.programs && d.programs.length ? d.programs : Object.keys(PROGRAMS);
  const aboutCard = `<a class="program" href="${CFC_URL}about.html" target="_blank" rel="noopener">
        <h3>About Care For Children</h3>
        <p>Learn about the mission, history, and the holistic education model behind 1,356 free schools.</p>
        <span class="program__tag">Learn More</span>
      </a>`;
  const programCards = chosen
    .map((k) => {
      const p = PROGRAMS[k];
      if (!p) return "";
      return `<a class="program" href="${p.url}" target="_blank" rel="noopener">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.desc)}</p>
        <span class="program__tag">${esc(p.tag)}</span>
      </a>`;
    })
    .join("");

  const footerWebsite = website
    ? `<a href="${esc(website)}" target="_blank" rel="noopener">My Website</a>`
    : "";

  return `
  <header class="nav">
    <a href="#top" class="nav__brand">${name}</a>
    <nav class="nav__links">
      <a href="#about">About Me</a>
      ${d.why ? '<a href="#why">My Mission</a>' : ""}
      <a href="#programs">Programs</a>
      <a class="nav__donate" href="${DONATE_URL}" target="_blank" rel="noopener">Donate</a>
    </nav>
  </header>

  <section class="hero" id="top">
    <div class="hero__inner">
      <div class="hero__photo">
        <div class="photo-frame${photoEmptyClass}">${photo}</div>
      </div>
      <div class="hero__text">
        <p class="hero__eyebrow">A personal fundraiser for</p>
        <h1>Care For Children<span class="brand-tld">.org</span></h1>
        <p class="hero__chapter">San Diego Youth Chapter</p>
        <p class="hero__lead">
          Hi, I'm <strong>${name}</strong>, and I'm raising funds to give underprivileged
          children in rural India free, holistic education and a real chance at a brighter future.
        </p>
        <div class="hero__cta">
          <a class="btn btn--primary" href="${DONATE_URL}" target="_blank" rel="noopener">Donate Now</a>
          ${heroSecondBtn}
        </div>
        <p class="hero__note">100% of donations go directly to Care For Children through their official platform.</p>
      </div>
    </div>
  </section>

  ${counterSection}

  <section class="stats" aria-label="Care For Children impact">
    <div class="stats__inner">
      <div class="stat"><span class="stat__num">120,000+</span><span class="stat__label">Children Educated</span></div>
      <div class="stat"><span class="stat__num">1,356</span><span class="stat__label">Free Schools</span></div>
      <div class="stat"><span class="stat__num">2,032</span><span class="stat__label">Villages Reached</span></div>
      <div class="stat"><span class="stat__num">0</span><span class="stat__label">Dropouts</span></div>
    </div>
  </section>

  <section class="section" id="about">
    <div class="section__head"><span class="kicker">About Me</span></div>
    <div class="why">${aboutBlocks || "<p>Tell the world a little about yourself!</p>"}</div>
  </section>

  ${whySection}

  <section class="section section--tint" id="programs">
    <div class="section__head">
      <span class="kicker">Where Your Donation Goes</span>
      <h2>Care For Children Programs</h2>
      <p class="section__sub">The programs I'm supporting. Click any card to learn more on careforchildren.org.</p>
    </div>
    <div class="programs">${aboutCard}${programCards}</div>
    <div class="programs__footer">
      <a class="btn btn--ghost" href="${CFC_URL}" target="_blank" rel="noopener">Visit careforchildren.org →</a>
    </div>
  </section>

  <section class="donate" id="donate">
    <div class="donate__inner">
      <h2>Ready to make a difference?</h2>
      <p>Your gift gives a child meals, supplies, and a classroom to learn in. Thank you for supporting my fundraiser. 💛</p>
      <a class="btn btn--primary btn--lg" href="${DONATE_URL}" target="_blank" rel="noopener">Donate to Care For Children</a>
      <p class="donate__note">You'll be taken to Care For Children's secure official donation page.</p>
    </div>
  </section>

  <footer class="footer">
    <div class="footer__inner">
      <div>
        <p class="footer__name">${name}</p>
        <p class="footer__tag">Fundraising for Care For Children · A Friend of Adhya</p>
      </div>
      <div class="footer__links">
        <a href="${CFC_URL}" target="_blank" rel="noopener">careforchildren.org</a>
        <a href="${DONATE_URL}" target="_blank" rel="noopener">Donate</a>
        ${footerWebsite}
      </div>
    </div>
    <p class="footer__fine">This is a personal fundraising page in support of Care For Children. All donations are processed directly by Care For Children.</p>
  </footer>`;
}

/* Animate any .raised counters within a scope (used by view.html & downloads) */
function initCounters(scope) {
  (scope || document).querySelectorAll(".raised").forEach(function (sec) {
    var raised = parseFloat(sec.dataset.raised) || 0;
    var goal = parseFloat(sec.dataset.goal) || 0;
    var pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
    var amountEl = sec.querySelector(".raised__amount");
    var fillEl = sec.querySelector(".raised__fill");
    var startT = performance.now(), dur = 1500;
    function bigMoney(n) { return '<span class="raised__cur">$</span>' + Math.round(n).toLocaleString(); }
    function tick(now) {
      var p = Math.min((now - startT) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      if (amountEl) amountEl.innerHTML = bigMoney(raised * e);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    if (fillEl) requestAnimationFrame(function () { fillEl.style.width = pct + "%"; });
  });
}

/* Build a fully standalone HTML file (CSS inlined) for download */
function buildStandaloneHTML(d, cssText) {
  const name = esc(d.name || "A Friend of Adhya");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${name} · Fundraising for Care For Children</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
${cssText}
</style>
</head>
<body>
${renderBodyHTML(d)}
<script>
${initCounters.toString()}
initCounters(document);
</script>
</body>
</html>`;
}
