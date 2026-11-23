/* REPORTpro — Service Worker: עבודה במצב לא מקוון (שטח בלי קליטה)
   - קבצי האפליקציה: "רשת קודם" — כשיש חיבור תמיד מקבלים את הגרסה העדכנית,
     ובלי חיבור נטען העותק האחרון ששמור במכשיר.
   - גופנים וספריות ה-PDF (html2canvas, jsPDF): "מטמון קודם" — כך גם ייצוא PDF עובד בלי חיבור.
   הנתונים עצמם (דוחות/תמונות) נשמרים ב-IndexedDB ואינם עוברים דרך כאן.
   יש להעלות את CACHE רק כשמשנים את הקובץ הזה (עדכוני האפליקציה עצמה מגיעים דרך הרשת). */
const CACHE = "reportpro-v1";
const SHELL = ["./", "./index.html", "./REPORTpro.html"];
const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];
const CACHE_FIRST_HOSTS = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/;

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // ספריות ה-PDF נטענות מראש כדי שייצוא יעבוד גם בפעם הראשונה בלי חיבור
    for (const u of LIBS) { try { await c.add(new Request(u, { mode: "cors" })); } catch (_) {} }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function putInCache(req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => putInCache(req, res))
        .catch(async () =>
          (await caches.match(req, { ignoreSearch: true })) ||
          (req.mode === "navigate" ? await caches.match("./REPORTpro.html") : undefined) ||
          Response.error()
        )
    );
    return;
  }

  if (CACHE_FIRST_HOSTS.test(url.hostname)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then((res) => putInCache(req, res)).catch(() => hit || Response.error());
      return hit || net;
    })());
  }
});
