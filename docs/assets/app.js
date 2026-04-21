import { loadEAD } from "./ead.js";

function esc(s){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function byTitle(a,b){ return (a.title||"").localeCompare(b.title||"", undefined, { sensitivity:"base" }); }

function renderHeader(meta){
  const el = document.getElementById("collectionMeta");
  el.innerHTML = `
    <h1>Geography Map Collections: Columbia and Missouri Maps</h1>
    <p class="small">Department of Geography, University of Missouri</p>
  `;
}

function buildSeriesOptions(meta){
  const sel = document.getElementById("seriesFilter");
  sel.innerHTML = `<option value="">All five series</option>` + meta.series
    .slice()
    .sort(byTitle)
    .map(s => `<option value="${esc(s.id)}">${esc(s.title || s.id)}</option>`)
    .join("");
}

function matchItem(item, q){
  if(!q) return true;
  const hay = `${item.title||""} ${item.topSeriesTitle||""} ${item.hierarchyPath||""} ${item.dateDisplay||""} ${item.physfacet||""} ${(item.containers||[]).map(c=>c.value).join(" ")}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function filterItems(meta){
  const q = document.getElementById("q").value.trim();
  const seriesId = document.getElementById("seriesFilter").value;
  let list = meta.items;
  if(seriesId) list = list.filter(it => it.topSeriesId === seriesId);
  if(q) list = list.filter(it => matchItem(it,q));
  const sort = document.getElementById("sort").value;
  if(sort === "title") list = list.slice().sort(byTitle);
  if(sort === "series") list = list.slice().sort((a,b)=> (a.topSeriesTitle||"").localeCompare(b.topSeriesTitle||"") || byTitle(a,b));
  if(sort === "date") list = list.slice().sort((a,b)=> (a.dateNormal||"").localeCompare(b.dateNormal||"") || byTitle(a,b));
  return list;
}

function renderResults(meta){
  const results = filterItems(meta);
  const out = document.getElementById("results");
  document.getElementById("count").textContent = `${results.length} result(s)`;
  out.innerHTML = results.map(it => {
    const loc = (it.containers||[]).map(c => c.type ? `${c.type}: ${c.value}` : c.value).filter(Boolean).join(" • ");
    const path = it.hierarchyPath ? `<div class="meta" style="margin-top:6px">Hierarchy: ${esc(it.hierarchyPath)}</div>` : "";
    return `
      <div class="card">
        <h3><a href="map.html?id=${encodeURIComponent(it.id)}">${esc(it.title || it.id)}</a></h3>
        <div class="meta"><span>${esc(it.topSeriesTitle || "")}</span>${it.dateDisplay ? `• <span>${esc(it.dateDisplay)}</span>` : ""}</div>
        ${path}
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
    renderResults(meta);
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
