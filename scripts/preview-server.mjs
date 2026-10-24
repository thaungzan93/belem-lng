import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
export async function startPreviewServer(root=resolve('dist/web')){
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
 const server=createServer(async(request,response)=>{try{const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(file!==root&&!file.startsWith(root+sep)){response.writeHead(403);response.end();return;}const bytes=await readFile(file);response.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);}catch{response.writeHead(404);response.end();}});
 await new Promise((accept,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',accept);});
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise((accept,reject)=>server.close(error=>error?reject(error):accept()))};
}
