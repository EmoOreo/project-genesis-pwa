import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line, AreaChart, Area } from 'recharts';
import { AlertTriangle, Archive, Bone, Bug, Database, Download, EyeOff, Fish, Gauge, Globe2, HardDrive, Radar, Save, Shell, Smartphone, TrendingUp, WifiOff } from 'lucide-react';

const BASE_LIVING = 1300000;
const BASE_FOSSIL = 250000;

const phyla = [
  { name: 'Arthropoda', living: 1070000, fossil: 72000, preservation: 0.35, icon: Bug, note: 'Living diversity is insect-heavy; fossil record is strongest for trilobites, crustaceans, and mineralized forms.' },
  { name: 'Mollusca', living: 85000, fossil: 65000, preservation: 0.82, icon: Shell, note: 'Shells preserve well, making mollusks comparatively overrepresented in fossil databases.' },
  { name: 'Chordata', living: 65000, fossil: 52000, preservation: 0.72, icon: Fish, note: 'Bones, teeth, and scales create a stronger fossil signal than soft tissue.' },
  { name: 'Annelida', living: 17000, fossil: 8000, preservation: 0.28, icon: Bone, note: 'Worms are often soft-bodied; tubes and traces preserve better than bodies.' },
  { name: 'Cnidaria', living: 11000, fossil: 12000, preservation: 0.42, icon: EyeOff, note: 'Corals preserve well; jellyfish-like organisms usually vanish without a trace.' },
  { name: 'Echinodermata', living: 7500, fossil: 18000, preservation: 0.75, icon: Bone, note: 'Calcite plates and skeletons make echinoderms fossil-visible.' },
  { name: 'Nematoda', living: 25000, fossil: 1000, preservation: 0.05, icon: EyeOff, note: 'Tiny soft-bodied animals are almost invisible geologically.' },
  { name: 'Platyhelminthes', living: 20000, fossil: 700, preservation: 0.04, icon: EyeOff, note: 'Flatworms are soft-bodied and rarely mineralized, producing one of the weakest fossil signals.' },
  { name: 'Porifera', living: 9000, fossil: 14000, preservation: 0.55, icon: Bone, note: 'Spicules, reefs, and biomineralized tissues improve preservation.' },
  { name: 'Other animal phyla', living: 11500, fossil: 7200, preservation: 0.18, icon: Database, note: 'Aggregated small, rare, soft-bodied, and poorly sampled groups.' },
];

const periods = [
  { period: 'Ediacaran', fossils: 7000, livingAnalog: 16000, discovery: 18, softBias: 94 },
  { period: 'Cambrian', fossils: 31000, livingAnalog: 82000, discovery: 83, softBias: 78 },
  { period: 'Ordovician', fossils: 26000, livingAnalog: 69000, discovery: 72, softBias: 66 },
  { period: 'Silurian', fossils: 15000, livingAnalog: 45000, discovery: 45, softBias: 59 },
  { period: 'Devonian', fossils: 25000, livingAnalog: 72000, discovery: 68, softBias: 56 },
  { period: 'Carboniferous', fossils: 22000, livingAnalog: 61000, discovery: 61, softBias: 53 },
  { period: 'Permian', fossils: 19000, livingAnalog: 59000, discovery: 54, softBias: 52 },
  { period: 'Triassic', fossils: 17000, livingAnalog: 52000, discovery: 49, softBias: 50 },
  { period: 'Jurassic', fossils: 24000, livingAnalog: 67000, discovery: 70, softBias: 45 },
  { period: 'Cretaceous', fossils: 34000, livingAnalog: 93000, discovery: 95, softBias: 42 },
  { period: 'Paleogene', fossils: 17000, livingAnalog: 56000, discovery: 63, softBias: 35 },
  { period: 'Neogene', fossils: 9000, livingAnalog: 38000, discovery: 57, softBias: 31 },
  { period: 'Quaternary', fossils: 4000, livingAnalog: 22000, discovery: 52, softBias: 27 },
];

const groups = ['Hard parts', 'Soft-bodied', 'Microscopic', 'Marine shelf', 'Terrestrial', 'Deep sea'];

function format(n) {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(2)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

function StatCard({ label, value, Icon, sub }) {
  return <div className="card stat"><Icon className="statIcon" /><p>{label}</p><strong>{value}</strong>{sub && <small>{sub}</small>}</div>;
}

function Range({ label, value, setValue, min, max, step, suffix }) {
  return <label className="range"><span>{label}<b>{value.toFixed(step < 1 ? 2 : 1)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => setValue(Number(e.target.value))} /></label>;
}

function HeatCell({ value }) {
  return <div className="heatCell" style={{ opacity: 0.16 + value / 118 }} title={`${value}/100 discovery intensity`} />;
}

export default function App() {
  const [view, setView] = useState('mission');
  const [bias, setBias] = useState('all');
  const [fossilRate, setFossilRate] = useState(0.25);
  const [extinction, setExtinction] = useState(1.0);
  const [sampling, setSampling] = useState(1.0);
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('pg-scenarios') || '[]'));

  const model = useMemo(() => {
    const rate = Math.max(0.01, fossilRate / 100);
    const totalEver = Math.round((BASE_FOSSIL / rate) * extinction);
    const missing = Math.max(0, totalEver - BASE_FOSSIL);
    return { rate, totalEver, missing, visibility: BASE_FOSSIL / Math.max(totalEver, 1) };
  }, [fossilRate, extinction]);

  const filteredPhyla = phyla.filter(p => bias === 'soft' ? p.preservation < 0.3 : bias === 'hard' ? p.preservation >= 0.55 : true);
  const phylumData = filteredPhyla.map(p => ({ ...p, livingScaled: Math.round(p.living / 1000), fossilScaled: Math.round(p.fossil / 1000) }));
  const timeline = periods.map((p, i) => {
    const oldPenalty = 1 + (periods.length - i) * 0.035;
    const missing = Math.round(((p.livingAnalog / Math.max(model.rate, 0.001)) * (p.softBias / 65) * oldPenalty * extinction) / 3.5);
    return { ...p, discovered: Math.round(p.fossils * sampling), missing, visibility: Math.round((p.fossils / Math.max(p.fossils + missing, 1)) * 100) };
  });
  const heatmap = periods.map((p, i) => ({ period: p.period, values: groups.map((_, j) => Math.max(2, Math.min(100, Math.round(p.discovery * sampling + [18, -p.softBias * .55, -p.softBias * .72, 15, -18 + i * 1.2, -35][j])))) }));

  function saveScenario() {
    const next = [{ id: Date.now(), fossilRate, extinction, sampling, totalEver: model.totalEver, missing: model.missing }, ...saved].slice(0, 6);
    setSaved(next);
    localStorage.setItem('pg-scenarios', JSON.stringify(next));
  }

  return <main>
    <header className="hero">
      <div><p className="kicker"><Radar size={16} /> Project Genesis • Fossil Record Intelligence PWA</p><h1>Earth animal history visibility simulator</h1><p className="lead">Explore known living species, known fossil species, preservation bias, geological discovery intensity, and the invisible majority of species that likely vanished without fossil evidence.</p></div>
      <div className="badges"><span><Smartphone />Installable</span><span><WifiOff />Offline-ready</span><span><HardDrive />Local saves</span><span><Download />Exportable</span></div>
    </header>

    <nav><div className="tabs">{['mission','phyla','timeline','heatmap'].map(v => <button className={view===v?'active':''} onClick={() => setView(v)} key={v}>{v}</button>)}</div><select value={bias} onChange={e=>setBias(e.target.value)}><option value="all">All phyla</option><option value="soft">Soft-bodied blind spots</option><option value="hard">Hard-part biased</option></select><button className="save" onClick={saveScenario}><Save size={16}/> Save</button></nav>

    <section className="stats"><StatCard label="Known living animal species" value={format(BASE_LIVING)} Icon={Bug} sub="Dashboard anchor"/><StatCard label="Known fossilized species" value={format(BASE_FOSSIL)} Icon={Bone} sub="Dashboard baseline"/><StatCard label="Estimated animal species ever" value={format(model.totalEver)} Icon={Globe2} sub={`At ${fossilRate.toFixed(2)}% fossilization`} /><StatCard label="Estimated missing species" value={format(model.missing)} Icon={TrendingUp} sub={`${Math.round((1-model.visibility)*100)}% outside visible signal`} /></section>

    <section className="grid">
      <aside className="card controls"><h2><Gauge size={20}/> Simulation controls</h2><p>Tune assumptions and watch the fossil gap shift.</p><Range label="Fossilization success" value={fossilRate} setValue={setFossilRate} min={0.05} max={1} step={0.05} suffix="%"/><Range label="Extinction multiplier" value={extinction} setValue={setExtinction} min={0.5} max={3} step={0.1} suffix="×"/><Range label="Sampling intensity" value={sampling} setValue={setSampling} min={0.5} max={2} step={0.1} suffix="×"/><div className="warning"><AlertTriangle size={18}/> Scaled model estimates for visualization. Connect to live fossil database exports later for research-grade data.</div></aside>

      <section className="card chart">
        {view==='mission' && <><h2>Mission overview</h2><ResponsiveContainer width="100%" height={420}><ComposedChart data={timeline}><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="period" stroke="#94a3b8" angle={-25} textAnchor="end" height={75}/><YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={format}/><YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tickFormatter={format}/><Tooltip contentStyle={{background:'#020617',border:'1px solid #334155',borderRadius:12}} formatter={format}/><Legend/><Bar yAxisId="left" dataKey="discovered" name="Known fossil signal" fill="#22d3ee" radius={[8,8,0,0]}/><Line yAxisId="right" type="monotone" dataKey="missing" name="Modeled missing species" stroke="#fbbf24" strokeWidth={3}/></ComposedChart></ResponsiveContainer></>}
        {view==='phyla' && <><h2>Species by major animal phylum</h2><ResponsiveContainer width="100%" height={420}><BarChart data={phylumData} layout="vertical" margin={{left:20,right:20}}><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis type="number" stroke="#94a3b8"/><YAxis dataKey="name" type="category" stroke="#94a3b8" width={135}/><Tooltip contentStyle={{background:'#020617',border:'1px solid #334155',borderRadius:12}} formatter={(v)=>`${v}k`}/><Legend/><Bar dataKey="livingScaled" name="Living species" fill="#22d3ee" radius={[0,10,10,0]}/><Bar dataKey="fossilScaled" name="Fossil species" fill="#818cf8" radius={[0,10,10,0]}/></BarChart></ResponsiveContainer></>}
        {view==='timeline' && <><h2>Geological visibility timeline</h2><ResponsiveContainer width="100%" height={420}><AreaChart data={timeline}><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="period" stroke="#94a3b8" angle={-25} textAnchor="end" height={75}/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{background:'#020617',border:'1px solid #334155',borderRadius:12}}/><Area type="monotone" dataKey="visibility" name="Visible fossil signal %" fill="#22d3ee" stroke="#22d3ee" fillOpacity={.25}/></AreaChart></ResponsiveContainer></>}
        {view==='heatmap' && <><h2>Discovery-rate heatmap</h2><div className="heatmap"><div></div>{groups.map(g=><b key={g}>{g}</b>)}{heatmap.map(row=><React.Fragment key={row.period}><span>{row.period}</span>{row.values.map((v,i)=><HeatCell key={i} value={v}/>)}</React.Fragment>)}</div></>}
      </section>
    </section>

    <section className="lower"><div className="card"><h2>Underrepresented fossil groups</h2><div className="cards">{phyla.filter(p=>p.preservation<.3).map(p=>{const Icon=p.icon;return <article key={p.name}><div><Icon size={18}/><b>{p.name}</b><em>{Math.round(p.preservation*100)}% visibility</em></div><p>{p.note}</p></article>})}</div></div><div className="card"><h2><Archive size={20}/> Saved scenarios</h2>{saved.length===0?<p className="empty">No saved scenarios yet.</p>:saved.map((s,i)=><p className="scenario" key={s.id}>Scenario {saved.length-i}: {format(s.totalEver)} ever existed • {format(s.missing)} missing</p>)}</div></section>
  </main>;
}
