async function fetchNextData() {
  const url = 'https://nhathuoclongchau.com.vn/thuoc/amoxicillin-500mg-mekophar-10x10-1845.html';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    const data = JSON.parse(m[1]);
    const str = JSON.stringify(data);
    const imgMatches = str.match(/https?:\/\/[^"'\s\\]+\.(?:jpg|png|webp)/gi);
    console.log('Images in next data:', imgMatches);
  } else {
    console.log('No next data');
  }
}
fetchNextData();
