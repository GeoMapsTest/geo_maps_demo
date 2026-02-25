import { loadEAD } from "./ead.js";

function esc(s){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function getParam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function containersToHtml(containers){
  if(!containers || !containers.length) return "<span class='small'>(none listed)</span>";
  const rows = containers.map(c => `<div>${esc(c.type || "container")}</div><div>${esc(c.value)}</div>`).join("");
  return `<div class="kv">${rows}</div>`;
}

async function imageExists(url){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function discoverScanUrls(item){
  // 1) If the EAD has <dao href="...">, use those first
  const urls = (item.daos || []).map(d => d.href).filter(Boolean);
  if(urls.length) return urls;

  // 2) Otherwise, try common local naming conventions in /scans
  const base = `scans/${encodeURIComponent(item.id)}`;

  const exts = [".jpg",".jpeg",".png",".webp"];
  const tried = new Set();

  // Single-file naming: itm001.jpg
  for(const ext of exts){
    const u = base + ext;
    tried.add(u);
    if(await imageExists(u)) return [u];
  }

  // Multi-page naming: itm001_1.jpg ... itm001_10.jpg
  const multi = [];
  for(let i=1;i<=10;i++){
    let foundThisIndex = false;
    for(const ext of exts){
      const u = `${base}_${i}${ext}`;
      if(tried.has(u)) continue;
      tried.add(u);
      if(await imageExists(u)){
        multi.push(u);
        foundThisIndex = true;
        break;
      }
    }
    if(!foundThisIndex) break;
  }
  return multi;
}

function renderCollection(collection){
  const el = document.getElementById("collectionBox");
  el.innerHTML = `
    <div class="card">
      <h3>${esc(collection.title || "Collection")}</h3>
      <div class="meta">${collection.dateDisplay ? esc(collection.dateDisplay) : ""}${collection.extent?.value ? ` • ${esc(collection.extent.value)} ${esc(collection.extent.unit||"")}` : ""}</div>
      <div class="meta" style="margin-top:6px">${collection.repository ? esc(collection.repository) : ""}</div>
      <div class="hr"></div>
      <a href="./index.html">← Back to search</a>
    </div>
  `;
}

function renderItem(item){
  const el = document.getElementById("itemBox");
  const loc = (item.containers||[])
    .map(c => c.type ? `${c.type}: ${c.value}` : c.value)
    .filter(Boolean)
    .join(" • ");
  el.innerHTML = `
    <div class="card">
      <h3>${esc(item.title || item.id)}</h3>
      <div class="meta">${item.seriesTitle ? esc(item.seriesTitle) : ""}${item.seriesTitle && item.dateDisplay ? " • " : ""}${item.dateDisplay ? esc(item.dateDisplay) : ""}</div>

      <div class="hr"></div>

      <div class="kv">
        <div class="k">Item ID</div><div>${esc(item.id)}</div>
        <div class="k">Series</div><div>${esc(item.seriesTitle || "(none)")}</div>
        <div class="k">Date (display)</div><div>${esc(item.dateDisplay || "(none)")}</div>
        <div class="k">Date (normalized)</div><div>${esc(item.dateNormal || "(none)")}</div>
        <div class="k">Extent</div><div>${item.extent ? `${esc(item.extent.value)} ${esc(item.extent.unit||"")}` : "(none)"}</div>
        <div class="k">Physical location</div><div>${esc(item.physloc || "(none)")}</div>
        <div class="k">Containers</div><div>${esc(loc || "(none)")}</div>
        <div class="k">Notes</div><div>${esc(item.physfacet || "(none)")}</div>
      </div>

      <div class="hr"></div>
      <div class="small">Scans: add image files to <code>docs/scans/</code> (e.g., <code>${esc(item.id)}.jpg</code> or <code>${esc(item.id)}_1.jpg</code>) or add <code>&lt;dao href=&quot;...&quot;&gt;</code> links in the EAD.</div>
      <div id="viewer" class="viewer"></div>
    </div>
  `;
}

async function renderViewer(item){
  const viewer = document.getElementById("viewer");
  viewer.innerHTML = "<div class='small'>Checking for scans…</div>";
  const urls = await discoverScanUrls(item);
  if(!urls.length){
    viewer.innerHTML = "<div class='small'>No scan found yet for this item.</div>";
    return;
  }
  viewer.innerHTML = urls.map(u => `<div style="margin-top:12px"><img src="${esc(u)}" alt="Scan for ${esc(item.id)}"></div>`).join("");
}

async function init(){
  const id = getParam("id");
  const status = document.getElementById("status");
  if(!id){
    status.textContent = "Missing ?id= parameter.";
    return;
  }
  try{
    status.textContent = "Loading EAD…";
    const meta = await loadEAD("data/ead.xml");
    const item = meta.items.find(it => it.id === id);
    if(!item){
      status.textContent = `No item found with id=${id}.`;
      return;
    }
    status.textContent = "";
    renderCollection(meta.collection);
    renderItem(item);
    await renderViewer(item);
  }catch(e){
    console.error(e);
    status.textContent = "Error: " + e.message;
  }
}

init();
