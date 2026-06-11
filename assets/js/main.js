/* Valuneto - interakce (vanilla JS, bez závislostí) */
(function () {
  "use strict";

  /* rok ve footeru */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* sticky header - solidní pozadí po odscrollování */
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* mobilní menu */
  var toggle = document.getElementById("navToggle");
  var body = document.body;
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    });
    /* zavři menu po kliku na odkaz */
    document.querySelectorAll("#navMenu a").forEach(function (a) {
      a.addEventListener("click", function () {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- kalkulačka úspory ---------- */
  var fmt = new Intl.NumberFormat("cs-CZ");
  var czk = function (n) { return fmt.format(Math.round(n)) + " Kč"; };

  var rngIncome = document.getElementById("rngIncome");
  var rngSpend = document.getElementById("rngSpend");
  var toggles = document.getElementById("toggles");

  if (rngIncome && rngSpend && toggles) {
    var incomeVal = document.getElementById("incomeVal");
    var spendVal = document.getElementById("spendVal");
    var totalEl = document.getElementById("calcTotal");
    var monthlyEl = document.getElementById("calcMonthly");

    /* podíl ročního přeplatku podle oblasti (odhad z reálných řádů úspor) */
    var weights = { poj: 0.045, spor: 0.030, pred: 0.018, bank: 0.010 };

    var calc = function () {
      var income = +rngIncome.value;
      var spend = +rngSpend.value;
      var rate = 0;
      toggles.querySelectorAll("button").forEach(function (b) {
        if (b.getAttribute("aria-pressed") === "true") rate += weights[b.dataset.key] || 0;
      });
      /* základ = roční výdaje na oblasti, navýšené o vliv příjmu (vyšší příjem = víc smluv) */
      var annualSpend = spend * 12;
      var incomeFactor = 0.6 + (income / 120000) * 0.8; /* 0.6–1.4 */
      var overpay = annualSpend * rate * 3.4 * incomeFactor;
      /* rozumné meze */
      overpay = Math.max(0, Math.min(overpay, annualSpend * 0.65));

      incomeVal.textContent = czk(income);
      spendVal.textContent = czk(spend);
      totalEl.textContent = czk(overpay);
      monthlyEl.textContent = czk(overpay / 12);
    };

    rngIncome.addEventListener("input", calc);
    rngSpend.addEventListener("input", calc);
    toggles.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
        calc();
      });
    });
    calc();
  }

  /* ---------- waitlist (front-end demo) ---------- */
  var form = document.getElementById("waitlistForm");
  if (form) {
    var note = document.getElementById("waitlistNote");
    var WAITLIST_ENDPOINT = "https://script.google.com/macros/s/AKfycbwWzG7jhZzlUU6NhtmOeMMk_0Ebk__m-cLNFKv7VG_M-DQYZAN0Ejovp3N69ksTwjJc/exec"; // ← sem vlož URL nasazeného Google Apps Scriptu (…/exec). Prázdné = záloha přes FormSubmit (e-mail).
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email");
      if (!email.value || !email.checkValidity()) {
        email.focus();
        if (note) { note.textContent = "Zkontroluj prosím e-mail, vypadá to, že tam něco chybí."; note.style.fontWeight = "600"; }
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      var orig = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Odesílám\u2026"; }
      var done = function () {
        form.innerHTML = '<p style="font-family:var(--f-display);font-weight:700;font-size:var(--step-1);color:var(--ink)">Hotovo! Jsi ve frontě.</p>';
        if (note) note.textContent = "Ozveme se na " + email.value + " s tvým prvním odhadem úspory.";
      };
      var fail = function () {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
        if (note) { note.textContent = "Odeslání se nepovedlo. Zkus to prosím znovu, nebo napiš na admin@valuneto.cz."; note.style.fontWeight = "600"; }
      };
      if (WAITLIST_ENDPOINT) {
        /* Google Apps Script: zapíše zájemce do Google Sheetu a pošle e-mail na admin@valuneto.cz. */
        fetch(WAITLIST_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: "email=" + encodeURIComponent(email.value) + "&source=web"
        }).then(done).catch(done);
      } else {
        /* Záloha, dokud není nasazený Apps Script: e-mail přes FormSubmit (nutná jednorázová aktivace). */
        fetch("https://formsubmit.co/ajax/admin@valuneto.cz", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email: email.value, _subject: "Nový zájemce o waitlist – Valuneto", _template: "table", _captcha: "false" })
        }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(done).catch(fail);
      }
    });
  }

  /* ---------- hero telefon: count-up + spuštění animace ---------- */
  var heroPhone = document.getElementById("heroPhone");
  if (heroPhone) {
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* proklikávací demo - přepínání obrazovek */
    var views = heroPhone.querySelectorAll(".ap-view");
    var navBtns = heroPhone.querySelectorAll(".ap-nav [data-go]");
    var showView = function (name) {
      views.forEach(function (v) { v.classList.toggle("is-active", v.dataset.view === name); });
      navBtns.forEach(function (b) { b.classList.toggle("act", b.dataset.go === name); });
    };
    heroPhone.querySelectorAll("[data-go]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        showView(this.getAttribute("data-go"));
      });
    });

    var countUp = function (el) {
      var target = +el.dataset.count;
      if (!target) return;
      var dur = 1500, t0 = performance.now();
      var step = function (now) {
        var p = Math.min((now - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = czk(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (reduceMotion) {
      heroPhone.classList.add("play");
    } else {
      requestAnimationFrame(function () {
        setTimeout(function () {
          heroPhone.classList.add("play");
          heroPhone.querySelectorAll("[data-count]").forEach(countUp);
        }, 250);
      });
    }
  }
})();
