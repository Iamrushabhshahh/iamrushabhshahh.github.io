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
