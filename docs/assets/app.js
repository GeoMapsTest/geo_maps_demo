import { loadEAD } from "./ead.js";

function esc(s){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function byTitle(a,b){ return (a.title||"").localeCompare(b.title||"", undefined, { sensitivity:"base" }); }

function renderHeader(meta){
  const el = document.getElementById("collectionMeta");
  const badges = [];
  if(meta.collection.dateDisplay) badges.push(`<span class="badge">${esc(meta.collection.dateDisplay)}</span>`);
  if(meta.collection.extent?.value) badges.push(`<span class="badge">${esc(meta.collection.extent.value)} ${esc(meta.collection.extent.unit || "")}</span>`);
  if(meta.collection.unitid) badges.push(`<span class="badge">${esc(meta.collection.unitid)}</span>`);
  el.innerHTML = `
    <h1>${esc(meta.collection.title || "Map Catalog")}</h1>
    <p>${badges.join(" ")} ${meta.collection.repository ? ` <span class="badge">${esc(meta.collection.repository)}</span>` : ""}</p>
    <p class="small">Search by title, quadrangle name, series, or date text. Click an item to view details and scans.</p>
  `;
}

function buildSeriesOptions(meta){
  const sel = document.getElementById("seriesFilter");
  sel.innerHTML = `<option value="">All series</option>` + meta.series
    .slice()
    .sort(byTitle)
    .map(s => `<option value="${esc(s.id)}">${esc(s.title || s.id)}</option>`)
    .join("");
}

function matchItem(item, q){
  if(!q) return true;
  const hay = `${item.title||""} ${item.seriesTitle||""} ${item.dateDisplay||""} ${item.physfacet||""} ${(item.containers||[]).map(c=>c.value).join(" ")}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function filterItems(meta){
  const q = document.getElementById("q").value.trim();
  const seriesId = document.getElementById("seriesFilter").value;
  let list = meta.items;

  if(seriesId){
    list = list.filter(it => it.seriesId === seriesId);
  }
  if(q){
    list = list.filter(it => matchItem(it,q));
  }

  const sort = document.getElementById("sort").value;
  if(sort === "title") list = list.slice().sort(byTitle);
  if(sort === "series") list = list.slice().sort((a,b)=> (a.seriesTitle||"").localeCompare(b.seriesTitle||"") || byTitle(a,b));
  if(sort === "date") list = list.slice().sort((a,b)=> (a.dateNormal||"").localeCompare(b.dateNormal||"") || byTitle(a,b));

  return list;
}

function renderResults(meta){
  const results = filterItems(meta);
  const out = document.getElementById("results");
  document.getElementById("count").textContent = `${results.length} result(s)`;
  out.innerHTML = results.map(it => {
    const loc = (it.containers||[])
      .map(c => c.type ? `${c.type}: ${c.value}` : c.value)
      .filter(Boolean)
      .join(" • ");
    const date = it.dateDisplay ? `<span>${esc(it.dateDisplay)}</span>` : "";
    const series = it.seriesTitle ? `<span>${esc(it.seriesTitle)}</span>` : "";
    return `
      <div class="card">
        <h3><a href="map.html?id=${encodeURIComponent(it.id)}">${esc(it.title || it.id)}</a></h3>
        <div class="meta">
          ${series} ${series && date ? "•" : ""} ${date}
        </div>
        ${loc ? `<div class="meta" style="margin-top:6px">Location: ${esc(loc)}</div>` : ""}
        ${it.physfacet ? `<div class="meta" style="margin-top:6px">Note: ${esc(it.physfacet)}</div>` : ""}
      </div>
    `;
  }).join("");
}

async function init(){
  const status = document.getElementById("status");
  try{
    status.textContent = "Loading EAD…";
    const meta = await loadEAD("data/ead.xml");
    renderHeader(meta);
    buildSeriesOptions(meta);
    status.textContent = "";
    // Initial render
    renderResults(meta);

    // Wire up controls
    ["q","seriesFilter","sort"].forEach(id => {
      document.getElementById(id).addEventListener("input", () => renderResults(meta));
      document.getElementById(id).addEventListener("change", () => renderResults(meta));
    });
    document.getElementById("clear").addEventListener("click", () => {
      document.getElementById("q").value = "";
      document.getElementById("seriesFilter").value = "";
      document.getElementById("sort").value = "title";
      renderResults(meta);
    });
  }catch(e){
    console.error(e);
    status.textContent = "Error: " + e.message;
  }
}

init();
