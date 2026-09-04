const https = require('https');
https.get('https://portalterreno.cl/', (res) => {
  console.log(res.headers);
});
