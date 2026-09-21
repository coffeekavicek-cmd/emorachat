import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const port = Number(process.env.PORT || 3000);

const mime = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".mp3":"audio/mpeg",
  ".mp4":"video/mp4"
};

const server = http.createServer(async (req,res)=>{
  try{
    const url = new URL(req.url, "http://localhost");
    if(url.pathname === "/health"){
      res.writeHead(200, {"content-type":"application/json"});
      return res.end(JSON.stringify({ok:true}));
    }
    let path = decodeURIComponent(url.pathname);
    if(path === "/") path = "/index.html";
    const safe = normalize(path).replace(/^([.][.][/\\])+/, "");
    const file = join(root, safe);
    const data = await readFile(file);
    res.writeHead(200, {"content-type": mime[extname(file)] || "application/octet-stream", "cache-control":"no-store"});
    res.end(data);
  }catch{
    try{
      const data = await readFile(join(root,"index.html"));
      res.writeHead(200, {"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
      res.end(data);
    }catch{
      res.writeHead(500, {"content-type":"text/plain; charset=utf-8"});
      res.end("EMORA server error");
    }
  }
});

server.listen(port, "0.0.0.0", ()=>console.log("EMORA listening on", port));
