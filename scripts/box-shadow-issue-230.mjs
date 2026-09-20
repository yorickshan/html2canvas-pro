import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const bundle = await readFile(new URL('../dist/html2canvas-pro.esm.js', import.meta.url));
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}#target{position:absolute;left:300px;top:200px;width:400px;height:300px;background:#fff}
#child{position:absolute;left:180px;top:40px;width:200px;height:200px;background:#0a0;box-shadow:inset 0 0 0 4px #f00}
</style><div id="target"><div id="child"></div></div>
<script type="module">import renderer from '/bundle.js';window.renderer=renderer;</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/bundle.js') res.writeHead(200,{'Content-Type':'text/javascript'}).end(bundle);
 else res.writeHead(200,{'Content-Type':'text/html'}).end(html);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:900,height:700}});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>typeof window.renderer==='function');
 const result=await page.evaluate(async()=>{
   const canvas=await window.renderer(document.getElementById('target'),{scale:1,logging:false});
   const d=canvas.getContext('2d').getImageData(180,40,200,200).data;
   let red=0,green=0;
   for(let i=0;i<d.length;i+=4){
     if(d[i]>200&&d[i+1]<60) red++;
     else if(d[i+1]>120&&d[i]<60) green++;
   }
   return {red,green,width:canvas.width,height:canvas.height};
 });
 console.log(result);
 assert.deepEqual(result,{red:3136,green:36864,width:400,height:300});
} finally {
 if(browser) await browser.close();
 await new Promise(r=>server.close(r));
}
