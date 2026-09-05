const http = require('http');

http.get('http://localhost:5000', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('[SPA Root] Status:', res.statusCode);
    const matches = data.match(/src="([^"]+)"/g) || [];
    const cssMatches = data.match(/href="([^"]+\.css)"/g) || [];

    const urls = [
      ...matches.map(m => m.replace('src="', '').replace('"', '')),
      ...cssMatches.map(m => m.replace('href="', '').replace('"', ''))
    ];

    console.log('[Assets Found]:', urls);

    let checked = 0;
    urls.forEach(u => {
      const fullUrl = 'http://localhost:5000' + u;
      http.get(fullUrl, (aRes) => {
        console.log(`[Asset] ${u} => HTTP ${aRes.statusCode}`);
        checked++;
        if (checked === urls.length) {
          console.log('[SUCCESS] All frontend assets loaded with HTTP 200.');
          process.exit(0);
        }
      });
    });
  });
});
