import { useState, useCallback, useMemo } from "react";

const TITLE_KW = [
  ["chief",3],["vp ",3],["vice president",3],["president",2],["director",3],
  ["head of",3],["owner",3],["founder",2],["principal",2],["manager",2],["supervisor",1],["lead ",1],
];
const DEPT_KW = [
  ["operations",3],["facilities",4],["procurement",4],["purchasing",3],["supply chain",3],
  ["logistics",3],["asset",4],["equipment",4],["lab",3],["laboratory",3],["r&d",2],["research",2],
  ["inventory",3],["warehouse",3],["plant",2],["maintenance",2],["infrastructure",2],["capital",2],
  ["disposal",5],["decommission",5],["surplus",5],
];
const CO_KW = [
  ["pharma",3],["biotech",3],["university",3],["college",2],["hospital",2],["nhs",2],["health",1],
  ["manufacturing",3],["chemical",3],["semiconductor",3],["aerospace",2],["defence",2],["defense",2],
  ["government",2],["council",2],["institute",3],["research",2],["laboratory",3],["labs",2],
  ["medtech",3],["diagnostics",2],["clinical",2],
];

function score(c) {
  const title = (c["Position"]||c["Title"]||c["Job Title"]||"").toLowerCase();
  const co = (c["Company"]||c["Company Name"]||"").toLowerCase();
  const combined = title+" "+co;
  let ts=0,ds=0,cs=0; const kw=[];
  for(const [w,s] of TITLE_KW) if(title.includes(w)){ts+=s;kw.push({w,t:"seniority"});}
  for(const [w,s] of DEPT_KW)  if(combined.includes(w)){ds+=s;kw.push({w,t:"asset"});}
  for(const [w,s] of CO_KW)    if(co.includes(w)){cs+=s;kw.push({w,t:"sector"});}
  const yr=parseInt((c["Connected On"]||"").split(" ").pop());
  const tenure=isNaN(yr)?0:Math.min(new Date().getFullYear()-yr,5);
  return {total:Math.min(Math.round(ts*1.5+ds*2+cs*1.2+tenure*0.5),30),kw};
}

function parseCSV(text) {
  const lines=text.split(/\r?\n/).filter(Boolean);
  if(lines.length<2) return [];
  let hi=0;
  for(let i=0;i<Math.min(10,lines.length);i++){
    if(lines[i].toLowerCase().includes("first name")){hi=i;break;}
  }
  const headers=lines[hi].split(",").map(h=>h.replace(/"/g,"").trim());
  const rows=[];
  for(let i=hi+1;i<lines.length;i++){
    const vals=lines[i].match(/(".*?"|[^,]+)(?=,|$)/g)||[];
    const row={};
    headers.forEach((h,idx)=>{row[h]=(vals[idx]||"").replace(/"/g,"").trim();});
    if(Object.values(row).some(v=>v)) rows.push(row);
  }
  return rows;
}

const TAG={
  seniority:{bg:"#1a1a2e",bd:"#4a4a8a",tx:"#a0a0ff"},
  asset:{bg:"#1a2e1a",bd:"#4a8a4a",tx:"#80ff80"},
  sector:{bg:"#2e1a1a",bd:"#8a4a4a",tx:"#ff9090"},
};
const SC=[
  {min:20,bg:"#00ff9030",bd:"#00ff90",tx:"#00ff90"},
  {min:12,bg:"#ffff0020",bd:"#d4c200",tx:"#d4c200"},
  {min:6, bg:"#ff880020",bd:"#ff8800",tx:"#ff8800"},
  {min:0, bg:"#ffffff10",bd:"#555",   tx:"#888"},
];
const ss=n=>SC.find(c=>n>=c.min)||SC[3];

const DEMO=[
  {"First Name":"Sarah","Last Name":"Okonkwo","Position":"Director of Laboratory Operations","Company":"Novartis Pharma UK","Connected On":"14 Mar 2019"},
  {"First Name":"James","Last Name":"Whitfield","Position":"Head of Procurement & Asset Management","Company":"Imperial College London","Connected On":"03 Jun 2017"},
  {"First Name":"Mei","Last Name":"Ling","Position":"Senior Software Engineer","Company":"Accenture","Connected On":"10 Jan 2024"},
  {"First Name":"Tom","Last Name":"Brannigan","Position":"VP Operations & Facilities","Company":"AstraZeneca","Connected On":"22 Sep 2016"},
  {"First Name":"Priya","Last Name":"Sharma","Position":"Marketing Manager","Company":"Unilever","Connected On":"05 Feb 2023"},
  {"First Name":"Alistair","Last Name":"McRae","Position":"Equipment & Surplus Asset Coordinator","Company":"GSK Manufacturing","Connected On":"30 Oct 2018"},
  {"First Name":"Denise","Last Name":"Fortier","Position":"Chief Operating Officer","Company":"Bioreliance Biotech","Connected On":"12 Jul 2015"},
  {"First Name":"Yusuf","Last Name":"Hassan","Position":"Warehouse & Inventory Manager","Company":"NHS Supply Chain","Connected On":"08 Apr 2020"},
  {"First Name":"Lena","Last Name":"Brandstatter","Position":"Account Executive","Company":"Salesforce","Connected On":"01 Dec 2023"},
  {"First Name":"Callum","Last Name":"Patterson","Position":"Principal Scientist - R&D Infrastructure","Company":"Syngenta Research Institute","Connected On":"17 Nov 2019"},
];

function buildPrompt(filtered) {
  const lines = filtered.map(c=>`${c._name||"?"} | ${c["Position"]||c["Title"]||"—"} | ${c["Company"]||"—"}`).join("\n") || "[no contacts — lower min score]";
  return `For each person below, score them 1–10 on likelihood they:
1. Control significant physical assets (equipment, lab gear, machinery)
2. Have authority to dispose of or transfer assets
3. Are in a sector with high asset turnover (pharma, biotech, university, govt lab)

Also flag if their role/company suggests they might currently have surplus assets
(e.g. post-merger, lab closure, equipment refresh cycles).

Format: Name | Asset Control Score | Disposal Authority | Surplus Likelihood | Reasoning

${lines}`;
}

function CopyBtn({filtered, big}) {
  const [done,setDone]=useState(false);
  const go=()=>{
    const text=buildPrompt(filtered);
    const el=document.createElement("textarea");
    el.value=text; el.style.position="fixed"; el.style.top="-9999px";
    document.body.appendChild(el); el.focus(); el.select();
    document.execCommand("copy"); document.body.removeChild(el);
    setDone(true); setTimeout(()=>setDone(false),2500);
  };
  const n=filtered.length;
  return (
    <button onClick={go} style={{
      background:done?"#00ff9022":"linear-gradient(135deg,#6060ff,#8040ff)",
      border:done?"1px solid #00ff90":"1px solid transparent",
      borderRadius:8, padding:big?"12px 28px":"8px 18px",
      color:done?"#00ff90":"#fff", cursor:"pointer", fontWeight:600,
      fontFamily:"'DM Mono',monospace", fontSize:big?14:12,
      transition:"all 0.2s", whiteSpace:"nowrap",
    }}>
      {done ? `✓ Copied! Paste into Claude or ChatGPT` : `📋 Copy top ${n} contacts + AI prompt`}
    </button>
  );
}

export default function App() {
  const [contacts,setContacts]=useState([]);
  const [minScore,setMinScore]=useState(6);
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState("score");
  const [drag,setDrag]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [fileName,setFileName]=useState("");

  const process=useCallback((rows)=>{
    const r=rows.map(c=>({...c,_name:`${c["First Name"]||""} ${c["Last Name"]||""}`.trim(),_score:score(c)}));
    setContacts(r); setLoaded(true);
  },[]);

  const handleFile=useCallback((file)=>{
    if(!file) return;
    setFileName(file.name);
    const rd=new FileReader();
    rd.onload=e=>process(parseCSV(e.target.result));
    rd.readAsText(file);
  },[process]);

  const filtered=useMemo(()=>{
    let list=contacts.filter(c=>c._score.total>=minScore);
    if(search){const q=search.toLowerCase();list=list.filter(c=>c._name.toLowerCase().includes(q)||(c["Position"]||"").toLowerCase().includes(q)||(c["Company"]||"").toLowerCase().includes(q));}
    return [...list].sort((a,b)=>sortBy==="score"?b._score.total-a._score.total:sortBy==="name"?a._name.localeCompare(b._name):(a["Company"]||"").localeCompare(b["Company"]||""));
  },[contacts,minScore,search,sortBy]);

  const stats=useMemo(()=>({
    total:contacts.length,
    hot:contacts.filter(c=>c._score.total>=20).length,
    warm:contacts.filter(c=>c._score.total>=12&&c._score.total<20).length,
    cool:contacts.filter(c=>c._score.total>=6&&c._score.total<12).length,
  }),[contacts]);

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#e0e0e0",fontFamily:"'DM Mono','Courier New',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#111;}::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .rh:hover{background:#141420!important;transition:background 0.12s;}
        input[type=range]{accent-color:#6060ff;}
      `}</style>

      {/* Header */}
      <div style={{background:"#0d0d18",borderBottom:"1px solid #1e1e2e",padding:"18px 32px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:34,height:34,background:"linear-gradient(135deg,#6060ff,#ff60a0)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎯</div>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>LinkedIn Contact Profiler</div>
          <div style={{fontSize:11,color:"#444"}}>Score contacts for asset-control authority</div>
        </div>
        {loaded&&<div style={{marginLeft:"auto",fontSize:11,color:"#444",textAlign:"right"}}><span style={{color:"#6060ff"}}>{fileName}</span><br/>{contacts.length.toLocaleString()} contacts</div>}
      </div>

      <div style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto"}}>

        {/* Upload */}
        {!loaded&&(
          <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
            onClick={()=>document.getElementById("fi").click()}
            style={{border:`2px dashed ${drag?"#6060ff":"#2a2a3a"}`,borderRadius:12,padding:"56px 40px",textAlign:"center",background:drag?"#0d0d20":"#0d0d14",cursor:"pointer",transition:"all 0.2s"}}>
            <input id="fi" type="file" accept=".csv" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            <div style={{fontSize:40,marginBottom:14}}>📋</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",marginBottom:8}}>Drop your LinkedIn CSV here</div>
            <div style={{fontSize:12,color:"#555",marginBottom:22,lineHeight:1.7}}>Export from LinkedIn: <span style={{color:"#6060ff"}}>Settings → Data Privacy → Get a copy of your data → Connections</span></div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <button style={{background:"linear-gradient(135deg,#6060ff,#8040ff)",border:"none",borderRadius:8,padding:"10px 24px",color:"#fff",fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Choose CSV File</button>
              <button onClick={e=>{e.stopPropagation();setFileName("demo.csv");process(DEMO);}} style={{background:"transparent",border:"1px solid #333",borderRadius:8,padding:"10px 24px",color:"#888",fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Load Demo (10 contacts)</button>
            </div>
          </div>
        )}

        {loaded&&(<>

          {/* ── COPY BAR — always visible at top ── */}
          <div style={{background:"#0d0d18",border:"2px solid #6060ff",borderRadius:12,padding:"18px 24px",marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:14}}>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"#fff",marginBottom:3}}>📋 Copy contacts for AI analysis</div>
                <div style={{fontSize:12,color:"#555"}}>All <span style={{color:"#6060ff"}}>{filtered.length}</span> filtered contacts + prompt — paste into Claude or ChatGPT</div>
              </div>
              <CopyBtn filtered={filtered} big={true}/>
            </div>
            <div style={{fontSize:11,color:"#444",marginBottom:6}}>Or select all below and copy manually (Ctrl+A / Cmd+A then Ctrl+C / Cmd+C):</div>
            <textarea readOnly value={buildPrompt(filtered)}
              onClick={e=>e.target.select()}
              style={{width:"100%",height:120,background:"#07070e",border:"1px solid #1a1a2a",borderRadius:8,
                padding:"10px 12px",color:"#888",fontFamily:"'DM Mono',monospace",fontSize:11,
                lineHeight:1.7,resize:"vertical",outline:"none",cursor:"text"}}/>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
            {[
              {label:"Total Loaded",value:stats.total.toLocaleString(),color:"#888"},
              {label:"🔥 High",value:stats.hot,color:"#00ff90",sub:"score ≥ 20"},
              {label:"⚡ Medium",value:stats.warm,color:"#d4c200",sub:"score 12–19"},
              {label:"💡 Low",value:stats.cool,color:"#ff8800",sub:"score 6–11"},
            ].map(({label,value,color,sub})=>(
              <div key={label} style={{background:"#0d0d18",border:"1px solid #1e1e2e",borderRadius:10,padding:"14px 18px"}}>
                <div style={{fontSize:10,color:"#444",marginBottom:4}}>{label}</div>
                <div style={{fontSize:26,fontFamily:"'Syne',sans-serif",fontWeight:800,color}}>{value}</div>
                {sub&&<div style={{fontSize:10,color:"#333",marginTop:2}}>{sub}</div>}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{background:"#0d0d18",border:"1px solid #1e1e2e",borderRadius:10,padding:"18px 22px",marginBottom:16,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:10,color:"#444",marginBottom:5}}>SEARCH</div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, title, company…"
                style={{background:"#070710",border:"1px solid #252535",borderRadius:6,padding:"7px 11px",color:"#e0e0e0",fontFamily:"inherit",fontSize:13,width:"100%",outline:"none"}}/>
            </div>
            <div style={{minWidth:170}}>
              <div style={{fontSize:10,color:"#444",marginBottom:5}}>MIN SCORE: <span style={{color:"#6060ff"}}>{minScore}</span></div>
              <input type="range" min={0} max={25} value={minScore} onChange={e=>setMinScore(+e.target.value)} style={{width:"100%",cursor:"pointer"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:"#444",marginBottom:5}}>SORT BY</div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:"#070710",border:"1px solid #252535",borderRadius:6,padding:"7px 11px",color:"#e0e0e0",fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>
                <option value="score">Score</option><option value="name">Name</option><option value="company">Company</option>
              </select>
            </div>
            <div style={{marginLeft:"auto"}}>
              <button onClick={()=>{setLoaded(false);setContacts([]);setFileName("");}} style={{background:"transparent",border:"1px solid #2a2a3a",borderRadius:6,padding:"7px 14px",color:"#555",fontFamily:"inherit",fontSize:12,cursor:"pointer"}}>↩ New File</button>
            </div>
          </div>

          <div style={{fontSize:11,color:"#333",marginBottom:10}}>Showing <span style={{color:"#6060ff"}}>{filtered.length}</span> contacts</div>

          {/* Table */}
          <div style={{border:"1px solid #1e1e2e",borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"56px 1fr 1fr 88px 180px",background:"#070710",padding:"9px 18px",fontSize:10,color:"#333",letterSpacing:"1px",borderBottom:"1px solid #1a1a2a"}}>
              <div>SCORE</div><div>NAME / TITLE</div><div>COMPANY</div><div>CONNECTED</div><div>SIGNALS</div>
            </div>
            {filtered.length===0
              ? <div style={{padding:40,textAlign:"center",color:"#333",fontSize:13}}>No contacts match — lower the min score.</div>
              : filtered.map((c,i)=>{
                const s=ss(c._score.total);
                const uniq=[...new Map(c._score.kw.map(k=>[k.w,k])).values()];
                return (
                  <div key={i} className="rh" style={{display:"grid",gridTemplateColumns:"56px 1fr 1fr 88px 180px",padding:"13px 18px",borderBottom:"1px solid #111820",alignItems:"start",background:i%2===0?"#0a0a14":"#09090f"}}>
                    <div><div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:34,height:34,borderRadius:7,background:s.bg,border:`1px solid ${s.bd}`,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:s.tx}}>{c._score.total}</div></div>
                    <div>
                      <div style={{fontSize:13,color:"#ddd",fontWeight:500,marginBottom:2}}>{c._name||"—"}</div>
                      <div style={{fontSize:11,color:"#444",lineHeight:1.4}}>{c["Position"]||c["Title"]||""}</div>
                    </div>
                    <div style={{fontSize:12,color:"#666",paddingTop:2}}>{c["Company"]||c["Company Name"]||""}</div>
                    <div style={{fontSize:11,color:"#333"}}>{c["Connected On"]||"—"}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                      {uniq.slice(0,5).map((k,j)=>{const tc=TAG[k.t];return <span key={j} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:tc.bg,border:`1px solid ${tc.bd}`,color:tc.tx,whiteSpace:"nowrap"}}>{k.w}</span>;})}
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Legend */}
          <div style={{marginTop:18,display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{fontSize:10,color:"#333"}}>SIGNALS:</div>
            {Object.entries(TAG).map(([t,tc])=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:tc.bg,border:`1px solid ${tc.bd}`,color:tc.tx}}>{t}</span>
                <span style={{fontSize:10,color:"#333"}}>{t==="seniority"?"Decision-maker":t==="asset"?"Asset/ops dept":"High-value sector"}</span>
              </div>
            ))}
          </div>

        </>)}
      </div>
    </div>
  );
}
