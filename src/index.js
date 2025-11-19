// =========================================================
// GLOBAL CACHE (Disimpan di memori Worker)
// =========================================================
let cachedMappings = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 60 detik (Data di GitHub dicek tiap 1 menit)

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname; 

    // LINK RAW JSON GITHUB KAMU
    const CONFIG_URL = "https://raw.githubusercontent.com/masbero323-art/master-router/main/routes.json";
    
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
    if (!rootDomain) return new Response("Error 403: Invalid Domain Configuration", { status: 403 });
    
    // Jika akses domain utama (tanpa subdomain)
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
       return new Response("Halaman Utama Router - Akses Subdomain Diperlukan", { status: 200 });
    }

    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // =========================================================
    // LOGIKA SUPER CEPAT (SMART CACHING)
    // =========================================================
    const now = Date.now();

    // Cek 1: Apakah kita sudah punya data di memori dan belum kadaluarsa?
    if (cachedMappings && (now - lastFetchTime < CACHE_DURATION)) {
      // JIKA YA: Pakai data lama saja (Instant!)
    } else {
      // JIKA TIDAK: Terpaksa ambil dari GitHub
      try {
        const response = await fetch(CONFIG_URL, {
            cf: {
                cacheTtl: 60, // Cache di level jaringan Cloudflare juga
                cacheEverything: true
            }
        });
        
        if (response.ok) {
            cachedMappings = await response.json();
            lastFetchTime = now;
        }
      } catch (e) {
        // Kalau GitHub error, dan cache kosong, inisialisasi objek kosong
        if (!cachedMappings) {
            cachedMappings = {}; 
        }
      }
    }

    // =========================================================
    // 🛡️ SECURITY FIX: STRICT MODE (MODE KETAT) 🛡️
    // =========================================================
    
    let targetProject = null; // Defaultnya NULL (Bukan subdomain lagi)
    
    // Cek Mapping dari Cache
    if (cachedMappings && cachedMappings[subdomain]) {
      targetProject = cachedMappings[subdomain];
    }

    // ⛔ BLOKIR JIKA TIDAK TERDAFTAR ⛔
    // Jika targetProject masih null (artinya tidak ketemu di JSON), tolak!
    if (!targetProject) {
        return new Response("❌ Error 404: Access Denied. Subdomain not registered.", { status: 404 });
    }

    // =========================================================
    // EKSEKUSI ROUTING (Hanya jika lolos pengecekan di atas)
    // =========================================================
    const targetHostname = `${targetProject}.pages.dev`;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set("Host", targetHostname);
    newRequest.headers.set("X-Forwarded-Host", hostname);

    return fetch(newRequest);
  }
};
