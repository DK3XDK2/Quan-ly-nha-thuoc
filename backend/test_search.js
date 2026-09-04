async function searchLCTimKiem(keyword) {
  const url = `https://nhathuoclongchau.com.vn/tim-kiem?s=${encodeURIComponent(keyword)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const m = html.match(/https:\/\/cdn\.nhathuoclongchau\.com\.vn\/v1\/static\/[^"'\s\)]+\.(?:jpg|png|webp)/gi);
    console.log(keyword, m ? m.slice(0, 3) : 'No matches');
  } catch (e) {
    console.log(keyword, 'ERR:', e.message);
  }
}
searchLCTimKiem('Omron');
searchLCTimKiem('Prospan');
searchLCTimKiem('Boganic');
searchLCTimKiem('Efferalgan');
