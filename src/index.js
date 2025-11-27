// =========================================================
// CONFIG: GLOBAL CACHE & TIMEOUT
// =========================================================
const CACHE_TTL = 3600; // Cache selama 1 Jam (detik) agar cepat & hemat kuota

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname; 

    // 1. KONFIGURASI URL & PROJECT DEFAULT
    const CONFIG_URL = "https://raw.githubusercontent.com/masbero323-art/master-router/main/routes.json";
    
    // 🔴 PROJECT FALLBACK KAMU
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
      "smilespirit.uk",
      "kampretoz.uk"
    ];

    // Cek Domain Induk
    const rootDomain = allowedDomains.find(d => hostname.endsWith(d));
    if (!rootDomain) return new Response("Error 403: Invalid Domain Config", { status: 403 });
    
    // Ambil Subdomain
    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // =========================================================
    // 2. SMART ROUTING (Cari Tujuan via JSON)
    // =========================================================
    let targetProject = null;
    
    // Kita fetch JSON Mapping (dengan Cache sebentar biar gak berat)
    let mappings = {};
    try {
        const configReq = await fetch(CONFIG_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
        if (configReq.ok) mappings = await configReq.json();
    } catch (e) {}

    if (mappings[subdomain]) {
        targetProject = mappings[subdomain];
    } else {
        targetProject = DEFAULT_FALLBACK_PROJECT;
    }

    // =========================================================
    // 3. SIAPKAN REQUEST KE PAGES (ORIGIN)
    // =========================================================
    const targetHostname = `${targetProject}.pages.dev`;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;
    targetUrl.protocol = "https:"; // Paksa HTTPS

    const proxyRequest = new Request(targetUrl, request);
    
    // 🛡️ HEADER MASKING (PENTING!)
    // Ini memberitahu script Pages bahwa domain aslinya adalah subdomain kamu
    proxyRequest.headers.set("Host", targetHostname);
    proxyRequest.headers.set("X-Forwarded-Host", hostname);
    proxyRequest.headers.set("X-Forwarded-Proto", "https");

    // =========================================================
    // 4. EKSEKUSI DENGAN CACHE & ANTI-LEAK
    // =========================================================
    try {
        // A. Fetch dengan Cache Cloudflare (Solusi Lemot)
        // Ini membuat Worker mengambil data dari CDN terdekat, bukan query ulang terus.
        let response = await fetch(proxyRequest, {
            cf: {
                cacheTtl: CACHE_TTL,
                cacheEverything: true, 
            }
        });

        // B. Buat Response Baru (Agar bisa diedit headernya)
        const newResponse = new Response(response.body, response);

        // C. ANTI-LEAK: Cek Redirect (Solusi URL Pages Bocor)
        // Jika Pages menyuruh redirect ke 'xxx.pages.dev', kita ceggat dan ganti.
        const locationHeader = newResponse.headers.get("Location");
        if (locationHeader) {
            if (locationHeader.includes(".pages.dev")) {
                // Ganti alamat pages.dev dengan domain asli kita
                const fixedLocation = locationHeader.replace(targetHostname, hostname);
                newResponse.headers.set("Location", fixedLocation);
            }
        }

        // D. Opsional: Tambahkan Security Header
        newResponse.headers.set("X-Powered-By", "Master-Router");

        return newResponse;

    } catch (err) {
        return new Response(`Error: Upstream Timeout or Unavailable (${err.message})`, { status: 502 });
    }
  }
};
