import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const raw=readFileSync('mobile-audit-tests.json','utf8');
const start=raw.search(/\{\s*"config"\s*:/);
if(start<0) throw new Error('Playwright JSON report is not finished yet');
const report=JSON.parse(raw.slice(start));
const tests=[];
function walk(suite){for(const spec of suite.specs||[])for(const test of spec.tests||[])tests.push({file:spec.file,title:spec.title,project:test.projectName,status:test.status,results:test.results.map(r=>({status:r.status,duration:r.duration,error:r.error?.message?.replace(/\u001b\[[0-9;]*m/g,'')}))});for(const child of suite.suites||[])walk(child);}
for(const suite of report.suites)walk(suite);
const summary={stats:report.stats,total:tests.length,tests};
writeFileSync('../docs/mobile-audit-2026-09-12/test-summary.json',JSON.stringify(summary,null,2));
for(const kind of ['performance','lint'])copyFileSync(`mobile-audit-${kind}.log`,`../docs/mobile-audit-2026-09-12/${kind}.log`);
console.log(JSON.stringify({stats:summary.stats,total:summary.total,failed:tests.filter(t=>t.status!=='expected')},null,2));
