import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart,
  Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import {
  AlertTriangle, Archive, Bone, Bug, Download, EyeOff, Fish,
  Globe2, HardDrive, Radar, Save, Shell, Smartphone, TrendingUp, WifiOff
} from 'lucide-react'
import { motion } from 'framer-motion'

const BASE_LIVING = 1300000
const BASE_FOSSIL = 250000

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
  { name: 'Other animal phyla', living: 11500, fossil: 7200, preservation: 0.18, icon: Archive, note: 'Aggregated small, rare, soft-bodied, and poorly sampled groups.' }
]

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
  { period: 'Quaternary', fossils: 4000, livingAnalog: 22000, discovery: 52, softBias: 27 }
]

const reconCards = [
  { title: 'Soft-bodied blind zone', text: 'Worms, jellyfish-like forms, parasites, and tiny animals are heavily filtered out unless exceptional preservation occurs.' },
  { title: 'Hard-part archive', text: 'Shells, bones, teeth, spicules, and mineralized plates dominate the recoverable fossil signal.' },
  { title: 'Sampling frontier', text: 'Marine shelf sediments are far better sampled than deep sea, soil, forest litter, and fragile terrestrial environments.' }
]

function format(n) {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(2)}B`
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <div className="card stat">
      <Icon className="icon" />
      <div className="muted">{label}</div>
      <div className="statValue">{value}</div>
      <div className="tiny">{sub}</div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('mission')
  const [filter, setFilter] = useState('all')
  const [fossilRate, setFossilRate] = useState(0.25)
  const [extinction, setExtinction] = useState(1.0)
  const [sampling, setSampling] = useState(1.0)
  const [saved, setSaved] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem('project-genesis-scenarios')
    if (stored) setSaved(JSON.parse(stored))
  }, [])

  useEffect(() => {
    localStorage.setItem('project-genesis-scenarios', JSON.stringify(saved))
  }, [saved])

  const model = useMemo(() => {
    const rate = Math.max(0.01, fossilRate / 100)
    const totalEver = Math.round((BASE_FOSSIL / rate) * extinction)
    const missing = Math.max(0, totalEver - BASE_FOSSIL)
    return { totalEver, missing, visibility: BASE_FOSSIL / Math.max(totalEver, 1) }
  }, [fossilRate, extinction])

  const timeline = periods.map((p, i) => {
    const oldPenalty = 1 + (periods.length - i) * 0.035
    const missing = Math.round(((p.livingAnalog / Math.max(fossilRate / 100, 0.001)) * (p.softBias / 65) * oldPenalty * extinction) / 3.5)
    return {
      ...p,
      discovered: Math.round(p.fossils * sampling),
      missing,
      visibility: Math.round((p.fossils / Math.max(p.fossils + missing, 1)) * 100)
    }
  })

  const filteredPhyla = phyla.filter(p => {
    if (filter === 'soft') return p.preservation < 0.3
    if (filter === 'hard') return p.preservation >= 0.55
    return true
  }).map(p => ({ ...p, livingK: Math.round(p.living / 1000), fossilK: Math.round(p.fossil / 1000) }))

  const heatGroups = ['Hard parts', 'Soft-bodied', 'Microscopic', 'Marine shelf', 'Terrestrial', 'Deep sea']
  const heatmap = periods.map((p, i) => ({
    period: p.period,
    values: heatGroups.map((_, j) => {
      const modifiers = [18, -p.softBias * 0.55, -p.softBias * 0.72, 15, -18 + i * 1.2, -35]
      return Math.max(2, Math.min(100, Math.round(p.discovery * sampling + modifiers[j])))
    })
  }))

  const saveScenario = () => {
    const next = {
      id: Date.now(),
      name: `Scenario ${saved.length + 1}`,
      fossilRate,
      extinction,
      sampling,
      totalEver: model.totalEver,
      missing: model.missing
    }
    setSaved([next, ...saved].slice(0, 8))
  }

  const exportReport = () => {
    const text = `Project Genesis Report\n\nEstimated animal species ever: ${format(model.totalEver)}\nEstimated missing species: ${format(model.missing)}\nFossilization rate: ${fossilRate}%\nExtinction multiplier: ${extinction}x\nSampling intensity: ${sampling}x\n`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project-genesis-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app">
      <motion.header className="hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <div className="eyebrow"><Radar size={16} /> PROJECT GENESIS - FOSSIL RECORD INTELLIGENCE PWA</div>
          <h1>Earth animal history visibility simulator</h1>
          <p>Explore known living species, known fossil species, preservation bias, geological discovery intensity, and the invisible majority of species that likely vanished without evidence.</p>
        </div>
        <div className="badges">
          <span><Smartphone size={15} /> Installable</span>
          <span><WifiOff size={15} /> Offline-ready</span>
          <span><HardDrive size={15} /> Local saves</span>
          <span><Download size={15} /> Exportable</span>
        </div>
      </motion.header>

      <section className="toolbar">
        <button className={tab === 'mission' ? 'active' : ''} onClick={() => setTab('mission')}>Mission</button>
        <button className={tab === 'phyla' ? 'active' : ''} onClick={() => setTab('phyla')}>Phyla</button>
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>Timeline</button>
        <button className={tab === 'heatmap' ? 'active' : ''} onClick={() => setTab('heatmap')}>Heatmap</button>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Phyla</option>
          <option value="soft">Soft-bodied blind spots</option>
          <option value="hard">Hard-part biased</option>
        </select>
        <button onClick={saveScenario}><Save size={16} /> Save</button>
        <button onClick={exportReport}><Download size={16} /> Export</button>
      </section>

      <section className="stats">
        <StatCard label="Known living animal species" value={format(BASE_LIVING)} icon={Bug} sub="Dashboard anchor" />
        <StatCard label="Known fossilized species" value={format(BASE_FOSSIL)} icon={Bone} sub="Dashboard baseline" />
        <StatCard label="Estimated animal species ever" value={format(model.totalEver)} icon={Globe2} sub={`At ${fossilRate.toFixed(2)}% fossilization`} />
        <StatCard label="Estimated missing species" value={format(model.missing)} icon={TrendingUp} sub={`${Math.round((1 - model.visibility) * 100)}% outside visible signal`} />
      </section>

      <section className="grid">
        <aside className="card controls">
          <h2>Simulation controls</h2>
          <label>Fossilization success <b>{fossilRate.toFixed(2)}%</b></label>
          <input type="range" min="0.05" max="1" step="0.05" value={fossilRate} onChange={e => setFossilRate(Number(e.target.value))} />
          <label>Background extinction multiplier <b>{extinction.toFixed(1)}x</b></label>
          <input type="range" min="0.5" max="3" step="0.1" value={extinction} onChange={e => setExtinction(Number(e.target.value))} />
          <label>Discovery and sampling intensity <b>{sampling.toFixed(1)}x</b></label>
          <input type="range" min="0.5" max="2" step="0.1" value={sampling} onChange={e => setSampling(Number(e.target.value))} />
          <div className="warning"><AlertTriangle size={18} /> Model values are scaled estimates for visualization and should be replaced with live database exports for research-grade precision.</div>
        </aside>

        <section className="card chart">
          {tab === 'mission' && (
            <>
              <h2>Mission overview</h2>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#264355" />
                  <XAxis dataKey="period" stroke="#9fb6c9" angle={-25} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" stroke="#9fb6c9" tickFormatter={format} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9fb6c9" tickFormatter={format} />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1f5169', borderRadius: 12 }} formatter={v => format(v)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="discovered" name="Known fossil signal" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="missing" name="Modeled missing species" stroke="#fbbf24" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === 'phyla' && (
            <>
              <h2>Species by major animal phylum</h2>
              <ResponsiveContainer width="100%" height={390}>
                <BarChart data={filteredPhyla} layout="vertical" margin={{ left: 15, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#264355" />
                  <XAxis type="number" stroke="#9fb6c9" />
                  <YAxis dataKey="name" type="category" stroke="#9fb6c9" width={130} />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1f5169', borderRadius: 12 }} formatter={v => `${v}k`} />
                  <Legend />
                  <Bar dataKey="livingK" name="Living species" fill="#22d3ee" />
                  <Bar dataKey="fossilK" name="Fossil species" fill="#818cf8" />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === 'timeline' && (
            <>
              <h2>Geological visibility timeline</h2>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#264355" />
                  <XAxis dataKey="period" stroke="#9fb6c9" angle={-25} textAnchor="end" height={80} />
                  <YAxis stroke="#9fb6c9" />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1f5169', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="visibility" name="Visible fossil signal %" fill="#22d3ee" stroke="#22d3ee" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === 'heatmap' && (
            <>
              <h2>Discovery-rate heatmap</h2>
              <div className="heatmap">
                <div></div>
                {heatGroups.map(g => <b key={g}>{g}</b>)}
                {heatmap.map(row => (
                  <React.Fragment key={row.period}>
                    <span>{row.period}</span>
                    {row.values.map((v, i) => <div className="heat" key={i} style={{ opacity: 0.16 + v / 120 }} title={`${v}/100`} />)}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </section>
      </section>

      <section className="lower">
        <div className="card">
          <h2>Underrepresented fossil groups</h2>
          <div className="cards">
            {phyla.filter(p => p.preservation < 0.3).map(p => {
              const Icon = p.icon
              return <div className="mini" key={p.name}><Icon size={20} /><b>{p.name}</b><span>{Math.round(p.preservation * 100)}% visibility</span><p>{p.note}</p></div>
            })}
          </div>
        </div>
        <div className="card">
          <h2>Reconstruction gallery</h2>
          <div className="cards">
            {reconCards.map(card => <div className="mini" key={card.title}><b>{card.title}</b><p>{card.text}</p></div>)}
          </div>
        </div>
        <div className="card">
          <h2>Saved scenarios</h2>
          {saved.length === 0 ? <p className="muted">No saved scenarios yet.</p> : saved.map(s => (
            <div className="scenario" key={s.id}><b>{s.name}</b><span>{s.fossilRate.toFixed(2)}% fossilization</span><p>Ever existed: {format(s.totalEver)} - Missing: {format(s.missing)}</p></div>
          ))}
        </div>
      </section>
    </main>
  )
}
