import http from "node:http";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const port = Number(process.env.PORT || 3000);
const mime = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".mp3":"audio/mpeg",".mp4":"video/mp4",".ico":"image/x-icon"};
const reactionSet = new Set(["🥹","❤️","😍","😭","✨"]);
let storeFile = "/tmp/emora-store.json";
let writeChain = Promise.resolve();

async function initStore(){
  const preferred = process.env.DATA_DIR || "/data";
  try{await mkdir(preferred,{recursive:true});await access(preferred,constants.W_OK);storeFile=join(preferred,"emora-store.json");}
  catch{storeFile="/tmp/emora-store.json";}
  try{await access(storeFile,constants.F_OK);}catch{await writeFile(storeFile,JSON.stringify({sites:{}},null,2));}
}
await initStore();

async function readStore(){try{return JSON.parse(await readFile(storeFile,"utf8"));}catch{return {sites:{}}}}
function saveStore(data){writeChain=writeChain.then(()=>writeFile(storeFile,JSON.stringify(data,null,2)));return writeChain}
function slug(){return randomBytes(5).toString("base64url").toLowerCase()}
function json(res,status,data){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(data))}
async function body(req){return await new Promise((resolve,reject)=>{let raw="";req.on("data",c=>{raw+=c;if(raw.length>100_000){reject(new Error("too large"));req.destroy();}});req.on("end",()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error("bad json"))}});req.on("error",reject)})}
function safeFile(pathname){const decoded=decodeURIComponent(pathname);const clean=normalize(decoded).replace(/^([.][.][/\\])+/g,"").replace(/^[/\\]+/,"");const full=join(root,clean||"index.html");if(!full.startsWith(root+sep)&&full!==root)throw new Error("bad path");return full}
function cleanSite(input={}){const categories=new Set(["birthday","apology","love","proposal","wedding"]);return {category:categories.has(input.category)?input.category:"birthday",template:String(input.template||"birthday-1").slice(0,40),recipient:String(input.recipient||"Sen").slice(0,32),sender:String(input.sender||"").slice(0,32),message:String(input.message||"").slice(0,280),photo:/^https?:\/\//i.test(String(input.photo||""))?String(input.photo).slice(0,1000):"",accent:/^#[0-9a-f]{6}$/i.test(String(input.accent||""))?input.accent:"#ff6fae",secret:String(input.secret||"").slice(0,90),lang:["uz","ru","en"].includes(input.lang)?input.lang:"uz"}}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://localhost");
  if(url.pathname==="/health")return json(res,200,{ok:true,service:"emora",version:"2.1.0",store:storeFile});

  const m=url.pathname.match(/^\/api\/sites\/([a-z0-9_-]+)(?:\/(view|reactions|analytics))?$/i);
  if(req.method==="POST"&&url.pathname==="/api/sites"){
    try{const input=await body(req);const site=cleanSite(input);const data=await readStore();let id=slug();while(data.sites[id])id=slug();data.sites[id]={site,createdAt:Date.now(),views:0,reactions:{"🥹":0,"❤️":0,"😍":0,"😭":0,"✨":0}};await saveStore(data);return json(res,201,{ok:true,slug:id});}catch(e){return json(res,400,{ok:false,error:e.message})}
  }
  if(m){
    const [,id,action]=m;const data=await readStore();const row=data.sites[id];if(!row)return json(res,404,{ok:false,error:"not_found"});
    if(req.method==="GET"&&!action)return json(res,200,{ok:true,site:row.site,createdAt:row.createdAt});
    if(req.method==="POST"&&action==="view"){row.views=(row.views||0)+1;await saveStore(data);return json(res,200,{ok:true,views:row.views})}
    if(req.method==="POST"&&action==="reactions"){try{const input=await body(req);const r=String(input.reaction||"");if(!reactionSet.has(r))return json(res,400,{ok:false,error:"invalid_reaction"});row.reactions ||= {};row.reactions[r]=(row.reactions[r]||0)+1;await saveStore(data);return json(res,200,{ok:true,reactions:row.reactions})}catch(e){return json(res,400,{ok:false,error:e.message})}}
    if(req.method==="GET"&&action==="analytics"){const reactions=row.reactions||{};const totalReactions=Object.values(reactions).reduce((a,b)=>a+Number(b||0),0);return json(res,200,{ok:true,title:`${row.site.recipient} · EMORA`,views:row.views||0,totalReactions,reactions,createdAt:row.createdAt})}
    return json(res,405,{ok:false,error:"method_not_allowed"});
  }

  try{const file=safeFile(url.pathname==="/"?"/index.html":url.pathname);const data=await readFile(file);res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":extname(file)===".html"?"no-store":"public, max-age=600"});res.end(data)}
  catch{try{const data=await readFile(join(root,"index.html"));res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});res.end(data)}catch{res.writeHead(500,{"content-type":"text/plain; charset=utf-8"});res.end("EMORA server error")}}
});
server.listen(port,"0.0.0.0",()=>console.log(`EMORA v2.1 listening on ${port} · store ${storeFile}`));