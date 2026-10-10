import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve(import.meta.dirname);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async (req,res)=>{
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root+'/') || (!['/index.html'].includes(path) && !path.startsWith('/src/') && path !== '/')) {res.writeHead(404); res.end('No encontrado'); return;}
    const body = await readFile(file); res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream'}); res.end(body);
  } catch {res.writeHead(404);res.end('No encontrado');}
}).listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Chambapp disponible en el puerto '+(process.env.PORT || 3000)));
