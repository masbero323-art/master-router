// =========================================================
// GLOBAL CACHE (Disimpan di memori Worker)
// =========================================================
let cachedMappings = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 60 detik

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname; 

    // 1. KONFIGURASI URL & PROJECT DEFAULT
    const CONFIG_URL = "https://raw.githubusercontent.com/masbero323-art/master-router/main/routes.json";
    
    // 🔴 GANTI INI DENGAN NAMA PROJECT PAGES UTAMA KAMU 🔴
    // Contoh: jika project utamamu adalah 'landing-page.pages.dev', tulis 'landing-page'
    const DEFAULT_FALLBACK_PROJECT = "books-c6s"; 

    const allowedDomains = [
      "bokklastread.co.uk",
      "brocenter.co.uk",
      "brocenter.uk",
      "cengeng.co.uk",
      "cipllondon.co.uk",
      "cipluk.uk",
      "dalbankeak.co.uk",
      "gembul.co.uk",
      "gentonk.co.uk",
      "getpdfbook.co.uk",
      "getpdfbook.uk",
      "kopyor.co.uk",
      "kopyor.uk",
      "kuntrink.co.uk",
      "kuntrink.uk",
      "lemper.co.uk",
      "lemper.org.uk",
      "profitbotfx.co.uk",
      "profitbotfx.uk",
      "realcipluk.co.uk",
      "smilespirit.co.uk",
      "smilespirit.uk"
    ];

    // Cek Domain Induk
    const rootDomain = allowedDomains.find(d => hostname.endsWith(d));
    if (!rootDomain) return new Response("Error 403: Invalid Domain Config", { status: 403 });
    
    // Jika akses langsung ke domain utama (tanpa subdomain), arahkan ke fallback juga
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
       // Kita biarkan lanjut ke bawah agar diarahkan ke DEFAULT_FALLBACK_PROJECT
    }

    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // =========================================================
    // LOGIKA CACHING (Ambil routes.json)
    // =========================================================
    const now = Date.now();
    if (cachedMappings && (now - lastFetchTime < CACHE_DURATION)) {
       // Pakai cache
    } else {
      try {
        const response = await fetch(CONFIG_URL, {
            cf: { cacheTtl: 60, cacheEverything: true }
        });
        if (response.ok) {
            cachedMappings = await response.json();
            lastFetchTime = now;
        }
      } catch (e) {
        if (!cachedMappings) cachedMappings = {}; 
      }
    }

    // =========================================================
    // 🔀 LOGIKA ROUTING (FALLBACK MODE) 🔀
    // =========================================================
    
    let targetProject = null;

    // 1. Cek apakah subdomain ada di daftar JSON?
    if (cachedMappings && cachedMappings[subdomain]) {
      targetProject = cachedMappings[subdomain]; // Ada! Pakai tujuan khusus.
    } 
    
    // 2. Jika TIDAK ADA di JSON (atau akses root), pakai DEFAULT
    if (!targetProject) {
        targetProject = DEFAULT_FALLBACK_PROJECT;
    }

    // =========================================================
    // EKSEKUSI KE PAGES
    // =========================================================
    const targetHostname = `${targetProject}.pages.dev`;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set("Host", targetHostname);
    newRequest.headers.set("X-Forwarded-Host", hostname);

    try {
        return await fetch(newRequest);
    } catch (err) {
        return new Response("Error: Target server unavailable", { status: 502 });
    }
  }
};
