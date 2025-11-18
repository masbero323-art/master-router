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
      "profitbotfx.uk"
    ];

    // Cek Domain Induk
    const rootDomain = allowedDomains.find(d => hostname.endsWith(d));
    if (!rootDomain) return new Response("Error 403: Invalid Domain", { status: 403 });
    
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
       return new Response("Halaman Utama Router", { status: 200 });
    }

    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // =========================================================
    // LOGIKA SUPER CEPAT (SMART CACHING)
    // =========================================================
    const now = Date.now();

    // Cek 1: Apakah kita sudah punya data di memori dan belum kadaluarsa?
    if (cachedMappings && (now - lastFetchTime < CACHE_DURATION)) {
      // JIKA YA: Pakai data lama saja (Instant!)
      // console.log("Using In-Memory Cache"); 
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
        // Kalau GitHub error, pakai data terakhir yang ada (Fail-safe)
        if (!cachedMappings) {
            cachedMappings = {}; // Kosongkan jika benar-benar tidak ada data
        }
      }
    }

    // Tentukan Target
    let targetProject = subdomain; // Default
    
    // Cek Mapping dari Cache
    if (cachedMappings && cachedMappings[subdomain]) {
      targetProject = cachedMappings[subdomain];
    }

    // Eksekusi ke Pages
    const targetHostname = `${targetProject}.pages.dev`;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set("Host", targetHostname);
    newRequest.headers.set("X-Forwarded-Host", hostname);

    return fetch(newRequest);
  }
};
