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
  obj.containers = allByLocalName(did, "container").map(c => ({ type: attr(c,"type"), value: textOf(c) }));
  // Condition / physfacet (if present)
  obj.physfacet = textOf(firstByLocalName(did, "physfacet"));
  // Digital objects: EAD3 often uses <dao href="...">; some exports use xlink:href
  const daos = allByLocalName(did, "dao").map(d => ({
    href: attr(d, "href") || attr(d, "xlink:href"),
    role: attr(d, "role"),
    title: attr(d, "title") || textOf(d)
  })).filter(d => d.href);
  obj.daos = daos;
  return obj;
}

export async function loadEAD(url = "data/ead.xml"){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`Could not load EAD XML: ${res.status} ${res.statusText}`);
  const xmlText = await res.text();
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  // Basic XML parse error check
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

  for (const c of topComponents){
    const level = attr(c, "level");
    if(level !== "series") continue;

    const sid = attr(c, "id") || "";
    const sDid = firstByLocalName(c, "did");
    const sObj = { id: sid || `series-${series.length+1}`, level: "series", ...didToObj(sDid) };

    // Direct child components of the series node
    const children = elementChildrenLocal(c, "c");
    const sItems = [];

    for (const child of children){
      const clevel = attr(child, "level");
      if(clevel !== "item" && clevel !== "file") continue;
      const iid = attr(child, "id") || "";
      const iDid = firstByLocalName(child, "did");
      const iObj = {
        id: iid || `item-${items.length+1}`,
        level: clevel,
        seriesId: sObj.id,
        seriesTitle: sObj.title,
        ...didToObj(iDid)
      };
      items.push(iObj);
      sItems.push(iObj.id);
    }

    sObj.itemIds = sItems;
    series.push(sObj);
  }

  return { collection, series, items };
}
