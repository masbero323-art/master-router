export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname; // Contoh: "project1.bokklastread.co.uk"

    // =================================================================
    // 1. KONFIGURASI: DAFTAR DOMAIN UTAMA
    // =================================================================
    // Masukkan semua domain yang kamu hubungkan ke Worker ini.
    const allowedDomains = [
      "bokklastread.co.uk",
      "brocenter.co.uk",
      // "domainketiga.net"
    ];

    // =================================================================
    // 2. DETEKSI DOMAIN & SUBDOMAIN
    // =================================================================
    
    // Cari tahu request ini datang dari domain induk yang mana
    const rootDomain = allowedDomains.find(d => hostname.endsWith(d));

    // Jika domain tidak dikenali (atau akses via IP), tolak request.
    if (!rootDomain) {
      return new Response("Error 403: Domain configuration mismatch.", { status: 403 });
    }

    // Cek apakah ini akses ke Root Domain (tanpa subdomain)
    // Contoh: hanya akses "bokklastread.co.uk" atau "www.bokklastread.co.uk"
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
       return new Response(`Halo! Ini adalah halaman utama untuk ${rootDomain}`, { status: 200 });
    }

    // Ekstrak nama subdomainnya saja
    // Contoh logic: "project1.bokklastread.co.uk" dikurang ".bokklastread.co.uk" = "project1"
    const subdomain = hostname.replace(`.${rootDomain}`, "");

    // =================================================================
    // 3. LOGIKA ROUTING (TEMPAT MENGATUR TUJUAN)
    // =================================================================
    
    /**
     * SKENARIO: DYNAMIC PAGES
     * Nama subdomain akan dianggap sebagai nama project Cloudflare Pages.
     * * Input:  toko-budi.bokklastread.co.uk
     * Output: toko-budi.pages.dev
     */
    
    const targetHostname = `${subdomain}.pages.dev`;
    
    // Buat URL tujuan baru
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;
    
    // =================================================================
    // 4. EKSEKUSI (REVERSE PROXY)
    // =================================================================

    // Kita buat request baru ke target (pages.dev)
    // Kita perlu memalsukan header 'Host' agar Cloudflare Pages di sana mau menerima request kita.
    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set("Host", targetHostname);
    newRequest.headers.set("X-Forwarded-Host", hostname); // Memberitahu backend domain asli user

    try {
      // Fetch konten dari targetUrl
      const response = await fetch(newRequest);
      
      // Kembalikan responsenya ke user (seolah-olah dari domain kamu sendiri)
      return response;
    } catch (err) {
      return new Response(`Gagal menghubungi tujuan: ${targetHostname}`, { status: 502 });
    }
  }
};
