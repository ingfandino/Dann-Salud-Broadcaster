// Test rápido del proxy
const https = require('https');
const http = require('http');
const { URL } = require('url');

const proxyUrl = 'http://erylbmeo:lgfi3yxwe1zh@31.59.20.176:6754';
const targetUrl = 'http://ifconfig.me';

console.log('Probando proxy:', proxyUrl.replace(/:\/\/.*@/, '://***@'));

const proxy = new URL(proxyUrl);
const target = new URL(targetUrl);

const options = {
  host: proxy.hostname,
  port: proxy.port,
  path: targetUrl,
  headers: {
    'Host': target.hostname,
    'Proxy-Authorization': 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('IP obtenida:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.setTimeout(10000, () => {
  console.error('Timeout: El proxy no respondió en 10 segundos');
  req.destroy();
});

req.end();
