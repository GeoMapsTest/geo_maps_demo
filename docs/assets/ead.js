const NS = "*";

function firstByLocalName(root, localName){
  const els = root.getElementsByTagNameNS(NS, localName);
  return els && els.length ? els[0] : null;
}

function allByLocalName(root, localName){
  return Array.from(root.getElementsByTagNameNS(NS, localName) || []);
}

function textOf(el){
  if(!el) return "";
  return (el.textContent || "").trim();
}

function attr(el, name){
  if(!el) return "";
  return (el.getAttribute(name) || "").trim();
}

function elementChildren(el){
  return Array.from(el.childNodes).filter(n => n.nodeType === 1);
}

function elementChildrenLocal(el, localName){
  return elementChildren(el).filter(n => n.localName === localName);
}

function didToObj(did){
  const obj = {};
  obj.title = textOf(firstByLocalName(did, "unittitle"));
  const unitdate = firstByLocalName(did, "unitdate");
  obj.dateDisplay = textOf(unitdate);
  obj.dateNormal = attr(unitdate, "normal");
  const extent = firstByLocalName(did, "extent");
  obj.extent = extent ? { value: textOf(extent), unit: attr(extent, "unit") } : null;
  obj.physloc = textOf(firstByLocalName(did, "physloc"));
  obj.unitid = textOf(firstByLocalName(did, "unitid"));
  obj.repository = textOf(firstByLocalName(did, "corpname"));
  obj.containers = allByLocalName(did, "container").map(c => ({ type: attr(c, "type"), value: textOf(c) }));
  obj.physfacet = textOf(firstByLocalName(did, "physfacet"));
  const daos = allByLocalName(did, "dao").map(d => ({
    href: attr(d, "href") || attr(d, "xlink:href"),
    role: attr(d, "role"),
    title: attr(d, "title") || textOf(d)
  })).filter(d => d.href);
  obj.daos = daos;
  return obj;
}

function walkComponent(node, topSeries, ancestors, items){
  const level = attr(node, "level");
  const did = firstByLocalName(node, "did");
  const meta = didToObj(did);
  const currentTitle = meta.title || attr(node, "id") || "";
  const currentId = attr(node, "id") || "";

  const nextAncestors = currentTitle ? [...ancestors, currentTitle] : [...ancestors];

  if(level === "item" || level === "file"){
    items.push({
      id: currentId || `item-${items.length+1}`,
      level,
      topSeriesId: topSeries.id,
      topSeriesTitle: topSeries.title,
      hierarchyPath: ancestors.join(" › "),
      seriesTitle: ancestors.length ? ancestors[ancestors.length - 1] : topSeries.title,
      ...meta
    });
    return;
  }

  const children = elementChildrenLocal(node, "c");
  for(const child of children){
    walkComponent(child, topSeries, nextAncestors, items);
  }
}

export async function loadEAD(url = "data/ead.xml"){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`Could not load EAD XML: ${res.status} ${res.statusText}`);
  const xmlText = await res.text();
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if(err) throw new Error("EAD XML parse error: " + err.textContent);

  const archdesc = doc.getElementsByTagNameNS(NS, "archdesc")[0];
  if(!archdesc) throw new Error("No <archdesc> found in EAD.");

  const collectionDid = firstByLocalName(archdesc, "did");
  const collection = didToObj(collectionDid);
  const dsc = firstByLocalName(archdesc, "dsc");
  const topComponents = dsc ? elementChildrenLocal(dsc, "c") : [];
  const series = [];
  const items = [];

  for(const c of topComponents){
    const level = attr(c, "level");
    const sDid = firstByLocalName(c, "did");
    const sObj = { id: attr(c, "id") || `series-${series.length+1}`, level, ...didToObj(sDid) };
    series.push(sObj);
    const rootAncestors = sObj.title ? [sObj.title] : [];
    for(const child of elementChildrenLocal(c, "c")){
      walkComponent(child, sObj, rootAncestors, items);
    }
    // also catch direct item children of the top series, if any
    if((level === "item" || level === "file") && sObj.id){
      items.push({
        id: sObj.id,
        level,
        topSeriesId: sObj.id,
        topSeriesTitle: sObj.title,
        hierarchyPath: sObj.title || "",
        seriesTitle: sObj.title,
        ...sObj
      });
    }
  }

  return { collection, series, items };
}
