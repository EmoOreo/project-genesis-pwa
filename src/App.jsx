import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Camera, Database, Download, Flame, Globe2, HardDrive, Network, Radar, Save, Search, Smartphone, WifiOff } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const BASE_LIVING = 1300000;
const BASE_FOSSIL = 250000;

const phyla = [
  { name:'Arthropoda', living:1070000, fossil:72000, preservation:.35, type:'mixed', note:'Insects dominate living diversity; trilobites and crustaceans dominate many fossil signals.'},
  { name:'Mollusca', living:85000, fossil:65000, preservation:.82, type:'hard', note:'Shells preserve well, so mollusks are strongly visible.'},
  { name:'Chordata', living:65000, fossil:52000, preservation:.72, type:'hard', note:'Bones, teeth, scales, and shells produce a comparatively strong record.'},
  { name:'Annelida', living:17000, fossil:8000, preservation:.28, type:'soft', note:'Worm bodies rarely preserve; tubes and traces are easier to find.'},
  { name:'Cnidaria', living:11000, fossil:12000, preservation:.42, type:'mixed', note:'Corals preserve well; jellyfish-like animals rarely do.'},
  { name:'Echinodermata', living:7500, fossil:18000, preservation:.75, type:'hard', note:'Calcite plates make this group highly fossil-visible.'},
  { name:'Nematoda', living:25000, fossil:1000, preservation:.05, type:'soft', note:'Tiny soft-bodied animals are nearly invisible in ordinary fossil records.'},
  { name:'Platyhelminthes', living:20000, fossil:700, preservation:.04, type:'soft', note:'Flatworms almost never mineralize and are severely underrepresented.'},
  { name:'Porifera', living:9000, fossil:14000, preservation:.55, type:'hard', note:'Spicules and reef structures improve preservation.'},
  { name:'Other animal phyla', living:11500, fossil:7200, preservation:.18, type:'soft', note:'Small, rare, and soft-bodied groups combined.'}
];

const periods = [
  ['Ediacaran','635–539',7000,16,94,'Early animal traces and soft-bodied biotas'],
  ['Cambrian','539–485',31000,82,78,'Cambrian radiation'],
  ['Ordovician','485–444',26000,69,66,'End-Ordovician extinction'],
  ['Silurian','444–419',15000,45,59,'Post-extinction recovery'],
  ['Devonian','419–359',25000,72,56,'Late Devonian crisis'],
  ['Carboniferous','359–299',22000,61,53,'Coal forest expansion'],
  ['Permian','299–252',19000,59,52,'End-Permian mass extinction'],
  ['Triassic','252–201',17000,52,50,'End-Triassic extinction'],
  ['Jurassic','201–145',24000,67,45,'Marine reptile ecosystems'],
  ['Cretaceous','145–66',34000,93,42,'K-Pg extinction'],
  ['Paleogene','66–23',17000,56,35,'Mammal radiation'],
  ['Neogene','23–2.6',9000,38,31,'Modern ecosystem assembly'],
  ['Quaternary','2.6–0',4000,22,27,'Megafauna losses']
].map(([period,mya,fossils,livingAnalog,discovery,headline])=>({period,mya,fossils,livingAnalog:livingAnalog*1000,discovery,softBias:discovery?100-discovery:50,headline}));

const reconstructions = [
  {name:'Soft-bodied worm analog', risk:'critical', text:'Likely abundant but rarely mineralized. Often known only from exceptional Lagerstätten or trace fossils.'},
  {name:'Small arthropod analog', risk:'high', text:'Living diversity can be immense while fossil detection depends on cuticle preservation and sampling.'},
  {name:'Shelled mollusk analog', risk:'low', text:'Durable shells increase the chance of fossilization and later discovery.'},
  {name:'Deep-sea animal analog', risk:'critical', text:'Poor exposure and destructive seafloor recycling erase many records.'}
];

function fmt(n){ if(n>=1e9)return (n/1e9).toFixed(2)+'B'; if(n>=1e6)return (n/1e6).toFixed(2)+'M'; if(n>=1e3)return Math.round(n/1e3)+'k'; return Math.round(n); }
function pct(n){ return Math.round(n*100)+'%'; }

export default function App(){
  const [tab,setTab]=useState('overview');
  const [fossilRate,setFossilRate]=useState(.25);
  const [extinction,setExtinction]=useState(1);
  const [sampling,setSampling]=useState(1);
  const [saved,setSaved]=useState(()=>JSON.parse(localStorage.getItem('pg-scenarios')||'[]'));
  const [pbdb,setPbdb]=useState(null);
  const [pbdbStatus,setPbdbStatus]=useState('idle');
  const appRef=useRef(null);

  useEffect(()=>localStorage.setItem('pg-scenarios',JSON.stringify(saved)),[saved]);

  const totalEver = Math.round((BASE_FOSSIL/(fossilRate/100))*extinction);
  const missing = Math.max(0,totalEver-BASE_FOSSIL);
  const timeline = useMemo(()=>periods.map((p,i)=>{
    const oldPenalty=1+(periods.length-i)*.035;
    const estimatedMissing=Math.round(((p.livingAnalog/Math.max(fossilRate/100,.001))*(p.softBias/65)*oldPenalty*extinction)/3.5);
    return {...p, discovered:Math.round(p.fossils*sampling), missing:estimatedMissing, visibility:Math.round((p.fossils/(p.fossils+estimatedMissing))*100)};
  }),[fossilRate, extinction, sampling]);

  async function loadPBDB(){
    setPbdbStatus('loading');
    try{
      const url='https://paleobiodb.org/data1.2/occs/list.json?base_name=Animalia&interval=Cambrian,Cretaceous&show=class,coords,phylo,time&limit=500';
      const res=await fetch(url);
      const json=await res.json();
      const records=json.records||[];
      const byPeriod={};
      records.forEach(r=>{ const key=r.eag||r.lag||r.tei||'Unknown'; byPeriod[key]=(byPeriod[key]||0)+1; });
      setPbdb({count:records.length, byPeriod:Object.entries(byPeriod).slice(0,8).map(([name,value])=>({name,value})), sample:records.slice(0,5)});
      setPbdbStatus('loaded');
    }catch(e){ setPbdbStatus('error'); }
  }

  async function exportPNG(){
    const canvas=await html2canvas(appRef.current,{backgroundColor:'#020617',scale:2});
    const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download='project-genesis-dashboard.png'; a.click();
  }
  function exportPDF(){
    const doc=new jsPDF();
    doc.setFontSize(18); doc.text('Project Genesis Fossil Record Report',14,18);
    doc.setFontSize(11);
    const lines=[`Known living animal species: ${fmt(BASE_LIVING)}`,`Known fossilized species: ${fmt(BASE_FOSSIL)}`,`Fossilization success assumption: ${fossilRate.toFixed(2)}%`,`Estimated animal species ever: ${fmt(totalEver)}`,`Estimated missing species: ${fmt(missing)}`,'Major caveat: dashboard values are scaled estimates unless PBDB live sample mode is used.'];
    lines.forEach((l,i)=>doc.text(l,14,34+i*8));
    doc.save('project-genesis-report.pdf');
  }
  function saveScenario(){ setSaved([{id:Date.now(),fossilRate,extinction,sampling,totalEver,missing},...saved].slice(0,8)); }

  return <main className="app" ref={appRef}>
    <header className="hero panel">
      <div><p className="kicker"><Radar size={14}/> PROJECT GENESIS • FOSSIL RECORD INTELLIGENCE PWA</p><h1>Earth animal history visibility simulator</h1><p>Explore living species, fossilized species, preservation bias, geological discovery rates, missing species, and live fossil database samples.</p></div>
      <div className="badges"><span><Smartphone/> Installable</span><span><WifiOff/> Offline-first</span><span><HardDrive/> Local saves</span><span><Download/> Exports</span></div>
    </header>
    <nav className="nav panel"><button onClick={()=>setTab('overview')} className={tab==='overview'?'active':''}>Overview</button><button onClick={()=>setTab('phyla')} className={tab==='phyla'?'active':''}>Phyla</button><button onClick={()=>setTab('timeline')} className={tab==='timeline'?'active':''}>Timeline</button><button onClick={()=>setTab('pbdb')} className={tab==='pbdb'?'active':''}>PBDB Live</button><button onClick={()=>setTab('tree')} className={tab==='tree'?'active':''}>Tree</button><button onClick={saveScenario}><Save size={15}/> Save</button></nav>
    <section className="stats"><Card title="Known living animal species" value={fmt(BASE_LIVING)} icon={<Globe2/>}/><Card title="Known fossilized species" value={fmt(BASE_FOSSIL)} icon={<Database/>}/><Card title="Estimated species ever" value={fmt(totalEver)} icon={<Network/>}/><Card title="Estimated missing species" value={fmt(missing)} icon={<Flame/>}/></section>
    <section className="grid"><aside className="panel controls"><h2>Simulation controls</h2><Slider label="Fossilization success" value={fossilRate} min=.05 max=1 step=.05 suffix="%" onChange={setFossilRate}/><Slider label="Extinction multiplier" value={extinction} min=.5 max=3 step=.1 suffix="×" onChange={setExtinction}/><Slider label="Discovery sampling" value={sampling} min=.5 max=2 step=.1 suffix="×" onChange={setSampling}/><button onClick={exportPNG}><Camera size={16}/> Export PNG</button><button onClick={exportPDF}><Download size={16}/> Export PDF</button><small>Saved scenarios persist on this device using localStorage.</small></aside>
      <section className="panel chart">
        {tab==='overview'&&<><h2>Mission overview</h2><ResponsiveContainer width="100%" height={350}><ComposedChart data={timeline}><CartesianGrid strokeDasharray="3 3" stroke="#173447"/><XAxis dataKey="period" stroke="#8cb6c8" angle={-25} textAnchor="end" height={70}/><YAxis yAxisId="l" stroke="#8cb6c8" tickFormatter={fmt}/><YAxis yAxisId="r" orientation="right" stroke="#8cb6c8" tickFormatter={fmt}/><Tooltip contentStyle={{background:'#020617',border:'1px solid #1f6b86'}}/><Bar yAxisId="l" dataKey="discovered" fill="#22d3ee" name="Known fossil signal"/><Line yAxisId="r" dataKey="missing" stroke="#fbbf24" strokeWidth={3} name="Modeled missing species"/></ComposedChart></ResponsiveContainer></>}
        {tab==='phyla'&&<><h2>Major animal phyla</h2><ResponsiveContainer width="100%" height={380}><BarChart data={phyla.map(p=>({...p,livingK:p.living/1000,fossilK:p.fossil/1000}))} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#173447"/><XAxis type="number" stroke="#8cb6c8"/><YAxis type="category" dataKey="name" width={120} stroke="#8cb6c8"/><Tooltip contentStyle={{background:'#020617',border:'1px solid #1f6b86'}}/><Bar dataKey="livingK" fill="#22d3ee" name="Living species k"/><Bar dataKey="fossilK" fill="#818cf8" name="Fossil species k"/></BarChart></ResponsiveContainer><div className="cards">{phyla.filter(p=>p.type==='soft').map(p=><Info key={p.name} {...p}/>)}</div></>}
        {tab==='timeline'&&<><h2>Geological visibility timeline</h2><ResponsiveContainer width="100%" height={360}><AreaChart data={timeline}><CartesianGrid strokeDasharray="3 3" stroke="#173447"/><XAxis dataKey="period" stroke="#8cb6c8" angle={-25} textAnchor="end" height={70}/><YAxis stroke="#8cb6c8"/><Tooltip contentStyle={{background:'#020617',border:'1px solid #1f6b86'}}/><Area dataKey="visibility" stroke="#22d3ee" fill="#22d3ee55" name="Visible fossil signal %"/></AreaChart></ResponsiveContainer><div className="events">{timeline.filter(t=>t.headline.includes('extinction')||t.headline.includes('crisis')).map(t=><span key={t.period}>⚠ {t.period}: {t.headline}</span>)}</div></>}
        {tab==='pbdb'&&<PBDB status={pbdbStatus} data={pbdb} load={loadPBDB}/>} 
        {tab==='tree'&&<Tree/>}
      </section></section>
    <section className="panel gallery"><h2>Species reconstruction gallery</h2><div className="gallery-grid">{reconstructions.map((r,i)=><div className="recon" key={r.name}><div className={'orb '+r.risk}></div><h3>{r.name}</h3><p>{r.text}</p><b>{r.risk} fossil-loss risk</b></div>)}</div></section>
    <section className="panel saved"><h2>Saved scenarios</h2>{saved.length? saved.map(s=><p key={s.id}>Rate {s.fossilRate.toFixed(2)}% • Ever {fmt(s.totalEver)} • Missing {fmt(s.missing)}</p>):<p>No saved scenarios yet.</p>}</section>
    <footer className="panel foot">Sources/caveats: PBDB live mode uses the public Paleobiology Database API sample endpoint. Dashboard baseline phylum/time values are scaled visualization estimates and should be replaced with full downloaded PBDB exports for publication-grade analysis.</footer>
  </main>
}
function Card({title,value,icon}){return <div className="stat panel">{icon}<span>{title}</span><b>{value}</b></div>}
function Slider({label,value,min,max,step,suffix,onChange}){return <label><span>{label}<b>{value.toFixed(step<.1?2:1)}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Info(p){return <article className="mini"><h3>{p.name}</h3><p>{p.note}</p><b>{Math.round(p.preservation*100)}% visibility</b></article>}
function PBDB({status,data,load}){return <div><h2>PBDB live fossil sample</h2><p className="muted">Loads a small live Animalia occurrence sample from the Paleobiology Database API. Internet is required for this panel; the rest of the app works offline after install.</p><button onClick={load}><Search size={16}/> Load PBDB sample</button><p>Status: {status}</p>{data&&<><p>Loaded records: {data.count}</p><ResponsiveContainer width="100%" height={260}><BarChart data={data.byPeriod}><CartesianGrid strokeDasharray="3 3" stroke="#173447"/><XAxis dataKey="name" stroke="#8cb6c8"/><YAxis stroke="#8cb6c8"/><Tooltip contentStyle={{background:'#020617',border:'1px solid #1f6b86'}}/><Bar dataKey="value" fill="#22d3ee"/></BarChart></ResponsiveContainer><div className="sample">{data.sample.map((r,i)=><p key={i}>{r.tna||r.oid||'Occurrence'} • {r.oei||r.eag||'unknown interval'}</p>)}</div></>}</div>}
function Tree(){const nodes=['Animalia','Bilateria','Protostomia','Arthropoda','Mollusca','Annelida','Deuterostomia','Chordata','Echinodermata','Non-bilaterians','Cnidaria','Porifera'];return <div><h2>Phylogenetic-style visibility tree</h2><div className="tree">{nodes.map((n,i)=><div key={n} style={{marginLeft:(i%4)*24}}><span>{n}</span><em>{i%3===0?'high gap':i%3===1?'medium gap':'strong fossil signal'}</em></div>)}</div></div>}
