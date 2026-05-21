import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./style.css";

const fmt = (n) =>
  n >= 1e12 ? `${(n / 1e12).toFixed(2)}T`
  : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
  : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
  : n.toLocaleString();

export default function App() {
  const [currentBiodiversity, setCurrentBiodiversity] = useState(8700000);
  const [knownLiving, setKnownLiving] = useState(1300000);
  const [knownFossil, setKnownFossil] = useState(250000);
  const [extinctionRate, setExtinctionRate] = useState(0.1);
  const [historyMyr, setHistoryMyr] = useState(635);
  const [fossilRate, setFossilRate] = useState(0.3);
  const [turnover, setTurnover] = useState(1);

  const model = useMemo(() => {
    const ratePerMyr = extinctionRate * 1000;
    const extinctGenerated =
      currentBiodiversity * ratePerMyr * historyMyr * turnover;

    const totalEver = currentBiodiversity + extinctGenerated;
    const expectedFossilized = extinctGenerated * (fossilRate / 100);
    const knownTotal = knownLiving + knownFossil;

    return {
      totalEver,
      expectedFossilized,
      knownTotal,
      knownShare: (knownTotal / totalEver) * 100,
      fossilCapture: (knownFossil / expectedFossilized) * 100,
    };
  }, [
    currentBiodiversity,
    knownLiving,
    knownFossil,
    extinctionRate,
    historyMyr,
    fossilRate,
    turnover,
  ]);

  const chartData = [
    { name: "Named Living", species: knownLiving },
    { name: "Named Fossil", species: knownFossil },
    { name: "Current Biodiversity", species: currentBiodiversity },
    { name: "Expected Fossilized", species: model.expectedFossilized },
    { name: "Total Ever Existed", species: model.totalEver },
  ];

  const Field = ({ label, value, setValue, min, max, step }) => (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">PROJECT GENESIS // DEEP TIME BIODIVERSITY OBSERVATORY</p>
        <h1>Species Existence Calculator</h1>
        <p>
          Model the disparity between known named animal species and the likely
          total number of animal species that have existed across Earth history.
        </p>
      </section>

      <section className="grid">
        <div className="panel controls">
          <h2>Simulation Inputs</h2>

          <Field label="Estimated current biodiversity" value={currentBiodiversity} setValue={setCurrentBiodiversity} min={1300000} max={50000000} step={100000} />
          <Field label="Known named living species" value={knownLiving} setValue={setKnownLiving} min={100000} max={3000000} step={50000} />
          <Field label="Known named fossil species" value={knownFossil} setValue={setKnownFossil} min={10000} max={2000000} step={10000} />
          <Field label="Background extinction rate" value={extinctionRate} setValue={setExtinctionRate} min={0.01} max={2} step={0.01} />
          <Field label="Animal history modeled, Myr" value={historyMyr} setValue={setHistoryMyr} min={50} max={700} step={5} />
          <Field label="Fossilization success rate, %" value={fossilRate} setValue={setFossilRate} min={0.01} max={5} step={0.01} />
          <Field label="Turnover multiplier" value={turnover} setValue={setTurnover} min={0.1} max={5} step={0.1} />
        </div>

        <div className="panel results">
          <h2>Observatory Output</h2>

          <div className="stats">
            <div>
              <span>Total Ever Existed</span>
              <strong>{fmt(model.totalEver)}</strong>
            </div>
            <div>
              <span>Expected Fossilized</span>
              <strong>{fmt(model.expectedFossilized)}</strong>
            </div>
            <div>
              <span>Known Share</span>
              <strong>{model.knownShare.toFixed(4)}%</strong>
            </div>
            <div>
              <span>Fossil Capture</span>
              <strong>{model.fossilCapture.toFixed(4)}%</strong>
            </div>
          </div>

          <div className="chart">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)" />
                <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tickFormatter={fmt} tick={{ fill: "#cbd5e1" }} />
                <Tooltip formatter={(value) => fmt(value)} />
                <Bar dataKey="species" fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
}