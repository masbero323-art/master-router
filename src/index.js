export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname; // misal: admin.bokklastread.co.uk

    // 1. SETTING: Masukkan URL RAW dari file routes.json di GitHub kamu
    // Cara dapat link raw: Buka file di GitHub -> Klik tombol 'Raw' di pojok kanan
    const CONFIG_URL = "https://raw.githubusercontent.com/masbero323-art/master-router/main/routes.json";
    
    const allowedDomains = [
      "bokklastread.co.uk",
      "brocenter.co.uk"
    ];

    // Cek Domain Induk
    const rootDomain = allowedDomains.find(d => hostname.endsWith(d));
    if (!rootDomain) return new Response("Error 403: Invalid Domain", { status: 403 });
    
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
       return new Response("Halaman Utama", { status: 200 });
    }

    // Ambil Subdomain
    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // 2. LOGIKA UTAMA: AMBIL DATA DARI GITHUB (Cached)
    let targetProject = subdomain; // Default: subdomain = nama project

    try {
      // Kita fetch file JSON mapping, tapi kita cache sebentar (misal 60 detik) 
      // supaya tidak membebani GitHub dan loadingnya cepat.
      const configResponse = await fetch(CONFIG_URL, {
        cf: {
          cacheTtl: 60,
          cacheEverything: true
        }
      });

      if (configResponse.ok) {
        const mappings = await configResponse.json();
        // Cek apakah subdomain ini ada di daftar mapping?
        if (mappings[subdomain]) {
          targetProject = mappings[subdomain]; // Yess! Ganti tujuannya.
        }
      }
    } catch (e) {
      // Kalau gagal ambil JSON (misal GitHub down), dia akan tetap jalan pakai default (subdomain = project)
      console.log("Gagal ambil config, pakai default.");
    }

    // 3. EKSEKUSI ROUTING
    const targetHostname = `${targetProject}.pages.dev`;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set("Host", targetHostname);
    newRequest.headers.set("X-Forwarded-Host", hostname);

    return fetch(newRequest);
  }
};
