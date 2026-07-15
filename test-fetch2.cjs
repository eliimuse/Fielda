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
req.write(JSON.stringify({ 
  incident: { title: "Medical", severity: "critical", id: "1", stadium_id: "stadium-1" }, 
  staffList: [{ id: "s1", stadium_id: "stadium-1", status: "on_duty" }], 
  zones: [] 
}));
req.end();
