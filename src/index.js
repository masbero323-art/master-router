// =========================================================
// GLOBAL CACHE
// =========================================================
let cachedMappings = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; 

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname; 

    // 1. KONFIGURASI URL
    const CONFIG_URL = "https://raw.githubusercontent.com/masbero323-art/master-router/main/routes.json";
    
    // 🔴 GANTI INI DENGAN URL HALAMAN 404 KAMU SENDIRI 🔴
    // Bisa berupa file .html khusus, atau halaman home page
    const URL_CUSTOM_404 = "https://brocenter.pages.dev/404"; 

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
    
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
       return new Response("Halaman Utama Router", { status: 200 });
    }

    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // =========================================================
    // LOGIKA CACHING
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
    // STRICT MODE CHECK
    // =========================================================
    let targetProject = null;
    if (cachedMappings && cachedMappings[subdomain]) {
      targetProject = cachedMappings[subdomain];
    }

    if (!targetProject) {
        // Jika subdomain tidak terdaftar, TAMPILKAN CUSTOM 404 JUGA
        return await fetchCustom404(URL_CUSTOM_404);
    }

    // =========================================================
    // EKSEKUSI ROUTING DENGAN ERROR HANDLING
    // =========================================================
    const targetHostname = `${targetProject}.pages.dev`;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set("Host", targetHostname);
    newRequest.headers.set("X-Forwarded-Host", hostname);

    try {
        // Ambil respon dari target (Pages)
        const response = await fetch(newRequest);

        // 🔍 CEK STATUS: APAKAH HALAMAN TIDAK DITEMUKAN (404)?
        if (response.status === 404) {
            // Jika target bilang 404, kita jangan kasih respon aslinya.
            // Kita ambil halaman Custom 404 kita sendiri.
            return await fetchCustom404(URL_CUSTOM_404);
        }

        // Jika status 200 (OK) atau lainnya, kembalikan apa adanya
        return response;

    } catch (err) {
        // Jika server target mati/error 502
        return new Response("Error: Target server unavailable", { status: 502 });
    }
  }
};

// =========================================================
// FUNGSI BANTUAN: AMBIL HALAMAN 404
// =========================================================
async function fetchCustom404(customUrl) {
    try {
        const errorPageResponse = await fetch(customUrl);
        // Kita ambil isi badannya (HTML), tapi statusnya tetap kita kasih 404
        // supaya Google tahu halaman ini memang tidak ada.
        return new Response(errorPageResponse.body, {
            status: 404,
            headers: errorPageResponse.headers
        });
    } catch (e) {
        // Fallback darurat kalau halaman 404-nya sendiri error
        return new Response("404 Not Found (Custom Page Error)", { status: 404 });
    }
}
