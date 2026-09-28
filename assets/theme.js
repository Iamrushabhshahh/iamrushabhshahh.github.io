/* Three-state theme engine (light / system / dark). Pairs with the
   synchronous no-flash script inlined in every page's <head>, which already
   set html[data-theme] + html[data-pref] before first paint — this file
   only needs to keep them in sync afterwards and wire up the .seg controls. */
(() => {
    const STORAGE_KEY = 'theme';
    const VALID = ['light', 'system', 'dark'];
    const root = document.documentElement;
    const themeMetaEl = document.querySelector('meta[name="theme-color"]');
    let mql = null;

    const readPreference = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return VALID.includes(raw) ? raw : 'system';
        } catch (_) {
            return 'system'; // private mode / storage disabled
        }
    };

    const writePreference = (pref) => {
        try { localStorage.setItem(STORAGE_KEY, pref); } catch (_) {}
    };

    const systemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const resolveTheme = (pref) => (pref === 'system' ? systemTheme() : pref);

    const paint = (resolved) => {
        root.classList.add('theme-anim');
        clearTimeout(paint._t);
        paint._t = setTimeout(() => root.classList.remove('theme-anim'), 600);
        root.dataset.theme = resolved;
        root.style.colorScheme = resolved;
        if (themeMetaEl) themeMetaEl.setAttribute('content', resolved === 'light' ? '#f6f8fa' : '#010409');
    };

    const onSystemChange = () => paint(systemTheme());

    // Attach the matchMedia listener only while the preference is 'system' —
    // an explicit Light/Dark choice must never be silently overridden by the OS.
    const followSystem = (follow) => {
        if (mql) { mql.removeEventListener('change', onSystemChange); mql = null; }
        if (follow) {
            mql = window.matchMedia('(prefers-color-scheme: dark)');
            mql.addEventListener('change', onSystemChange);
        }
    };

    const syncControls = (pref) => {
        document.querySelectorAll('.seg [role="radio"]').forEach((btn) => {
            const checked = btn.dataset.value === pref;
            btn.setAttribute('aria-checked', String(checked));
            btn.tabIndex = checked ? 0 : -1;
        });
    };

    const setTheme = (pref) => {
        if (!VALID.includes(pref)) return;
        writePreference(pref);
        root.dataset.pref = pref;
        followSystem(pref === 'system');
        paint(resolveTheme(pref));
        syncControls(pref);
    };

    const initialPref = readPreference();
    followSystem(initialPref === 'system');

    document.addEventListener('DOMContentLoaded', () => {
        syncControls(initialPref);
        document.querySelectorAll('.seg[role="radiogroup"]').forEach((group) => {
            const radios = [...group.querySelectorAll('[role="radio"]')];
            radios.forEach((btn, i) => {
                btn.addEventListener('click', () => setTheme(btn.dataset.value));
                btn.addEventListener('keydown', (e) => {
                    let dir = 0;
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') dir = 1;
                    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') dir = -1;
                    else return;
                    e.preventDefault();
                    const next = radios[(i + dir + radios.length) % radios.length];
                    next.focus();
                    setTheme(next.dataset.value);
                });
            });
        });
    });
})();

/* ---------- cert chooser + savings calculator (coupon hub only) ----------
   Both guard on their container existing, so this stays inert on every other
   page that loads this file. No prices are hardcoded here: they are read from
   data attributes the generator wrote out of CERT_PAGES, which the daily job
   verifies against the live Linux Foundation pages. */
(function () {
  'use strict';

  var chooser = document.getElementById('chooser');
  if (chooser) {
    var opts = [].slice.call(chooser.querySelectorAll('.ch-opt'));
    var results = [].slice.call(chooser.querySelectorAll('.pick-result'));
    opts.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    opts.forEach(function (b) {
      b.addEventListener('click', function () {
        var goal = b.dataset.goal;
        var already = b.getAttribute('aria-pressed') === 'true';
        opts.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        results.forEach(function (r) { r.hidden = true; });
        if (already) return;            // second click clears, so it is not a trap
        b.setAttribute('aria-pressed', 'true');
        results.forEach(function (r) { if (r.dataset.goal === goal) r.hidden = false; });
        if (window.goatcounter && window.goatcounter.count) {
          window.goatcounter.count({ path: 'chooser-' + goal, title: 'Cert chooser: ' + goal, event: true });
        }
      });
    });
  }

  var calc = document.getElementById('calc');
  if (calc) {
    var boxes = [].slice.call(calc.querySelectorAll('input[type=checkbox]'));
    var money = function (n) { return '$' + n.toLocaleString('en-US'); };
    var bundles = [];
    try { bundles = JSON.parse(document.getElementById('bundleData').textContent); } catch (e) {}

    var update = function () {
      var picked = boxes.filter(function (b) { return b.checked; });
      var list = 0, disc = 0, slugs = [];
      picked.forEach(function (b) {
        list += Number(b.dataset.list) || 0;
        disc += Number(b.dataset.disc) || 0;
        slugs.push(b.dataset.slug);
      });
      document.getElementById('cQty').textContent = picked.length;
      document.getElementById('cList').textContent = money(list);
      document.getElementById('cDisc').textContent = money(disc);
      document.getElementById('cSave').textContent = money(list - disc);

      /* Offer a bundle only when it genuinely covers everything ticked AND is
         actually cheaper. Suggesting a bundle that costs more, or that misses
         an exam the reader wants, would be the kind of upsell that loses the
         trust the rest of this page is built on. */
      var note = document.getElementById('cBundle');
      var best = null;
      bundles.forEach(function (bn) {
        /* Exact match only. Prefix matching looks harmless and is not: 'ckad'
           starts with 'cka', so ticking the CKA would match the CKA-to-
           Kubestronaut upgrade, a bundle that deliberately excludes the CKA.
           It would then recommend something cheaper that is missing the exam
           the reader actually asked for. */
        var covers = slugs.every(function (s) { return bn.covers.indexOf(s) !== -1; });
        if (picked.length > 1 && covers && bn.disc < disc && (!best || bn.disc < best.disc)) best = bn;
      });
      if (best) {
        note.hidden = false;
        note.innerHTML = 'The <a href="/linux-foundation-coupon/' + best.slug + '/">' + best.name +
          '</a> covers everything you ticked for about <strong>' + money(best.disc) +
          '</strong> with the code, which is ' + money(disc - best.disc) + ' less than buying them separately.';
      } else {
        note.hidden = true;
      }
    };
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    update();
  }
})();
