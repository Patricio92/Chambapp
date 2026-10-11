// Reproduce the bundled historical snapshot from the published, pinned package.
// Usage: node scripts/import-postal.mjs /tmp/mxcp/package
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const packageRoot=resolve(process.argv[2]||'');
const manifest=JSON.parse(await readFile(resolve(packageRoot,'package.json'),'utf8'));
if(manifest.name!=='@webrek/mx-cp'||manifest.version!=='0.2.0')throw Error('Expected @webrek/mx-cp@0.2.0. Review SOURCES.md before changing snapshots.');
const {cpsDeMunicipio,buscaCP}=await import(pathToFileURL(resolve(packageRoot,'dist/index.js')));
const records=[];
for(let mun=2;mun<=17;mun++){
 const codes=await cpsDeMunicipio('09'+String(mun).padStart(3,'0'));
 for(const cp of codes){
  const r=await buscaCP(cp);
  if(r?.cveEnt!=='09')throw Error('Unexpected state');
  records.push({cp:r.cp,borough:r.municipio,colonies:r.asentamientos.map(a=>a.nombre)});
 }
}
records.sort((a,b)=>a.cp.localeCompare(b.cp));
if(records.length!==1394||new Set(records.map(r=>r.cp)).size!==1394||new Set(records.map(r=>r.borough)).size!==16)throw Error('Unexpected dataset coverage');
const target=resolve(import.meta.dirname,'../src/data');
await mkdir(target,{recursive:true});
await writeFile(resolve(target,'postal.js'),'// SEPOMEX, abril de 2016. Ver SOURCES.md. Los códigos se conservan como texto.\nexport const postalRecords = '+JSON.stringify(records,null,2)+';\n');
await copyFile(resolve(packageRoot,'LICENSE'),resolve(target,'POSTAL-LICENSE.txt'));
console.log(`Imported ${records.length} postal codes across 16 boroughs.`);
