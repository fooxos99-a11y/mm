import {writeFileSync,mkdirSync} from 'node:fs';
const root='../docs/mobile-audit-2026-09-12/gesture-followup/live';mkdirSync(root,{recursive:true});
const report=[];
for(const url of ['https://license-qb.us/','https://license-qb.us/momars/']){
try{
const response=await fetch(url);const html=await response.text();
const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m=>new URL(m[1],response.url).href);
report.push({url,status:response.status,final:response.url,title:html.match(/<title>([^<]+)/)?.[1],assets});
writeFileSync(root+`/${url.endsWith('/momars/')?'momars':'root'}.html`,html);
for(const asset of assets){if(new URL(asset).origin!==new URL(url).origin)continue;const r=await fetch(asset);writeFileSync(root+'/'+new URL(asset).pathname.split('/').pop(),await r.text());}
}catch(e){report.push({url,error:e.message,cause:e.cause?.message});}
}
writeFileSync(root+'/manifest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
