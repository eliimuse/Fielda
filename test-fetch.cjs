const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/gemini/assign-staff',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});
req.on('error', e => console.error('Error:', e.message));
req.write(JSON.stringify({ incident: { title: "Test", severity: "critical", id: "1" }, staffList: [], zones: [] }));
req.end();
