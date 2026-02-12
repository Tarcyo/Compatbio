import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import "./AdminDashboardPage.compat.css";

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
  .toString()
  .replace(/\/+$/, "");

// Paleta (fica no componente, sem mexer no app todo)
const CHART_GREEN = "#a0ea52";

function monthLabel(ym) {
  const [y, m] = String(ym).split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short" });
}

function moneyBR(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatRangeLabel(range) {
  try {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const a = from.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    const b = to.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    return `${a} → ${b}`;
  } catch {
    return "";
  }
}

function Panel({ title, subtitle, right, children }) {
  return (
    <section className="cbad-panel" aria-label={title}>
      <header className="cbad-panelHeader">
        <div className="cbad-panelHeaderLeft">
          <div className="cbad-panelTitle">{title}</div>
          {subtitle ? <div className="cbad-panelSub">{subtitle}</div> : null}
        </div>
        {right ? <div className="cbad-panelHeaderRight">{right}</div> : null}
      </header>
      <div className="cbad-panelBody">{children}</div>
    </section>
  );
}

function Kpi({ label, value, tone = "neutral", icon }) {
  return (
    <div className={`cbad-kpi cbad-kpi--${tone}`}>
      <div className="cbad-kpiTop">
        <div className="cbad-kpiIcon" aria-hidden="true">
          {icon}
        </div>
        <div className="cbad-kpiLabel">{label}</div>
      </div>
      <div className="cbad-kpiValue">{value}</div>
    </div>
  );
}

function ChartTitle({ title, hint }) {
  return (
    <div className="cbad-chartHead">
      <div className="cbad-chartTitle">{title}</div>
      {hint ? <div className="cbad-chartHint">{hint}</div> : null}
    </div>
  );
}

function DarkTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) return null;

  const safeLabel = String(label ?? "");

  return (
    <div className="cbad-tooltip">
      <div className="cbad-tooltipTitle">{safeLabel}</div>

      <div className="cbad-tooltipList">
        {payload.map((p, idx) => {
          const name = p?.name ?? p?.dataKey ?? "Valor";
          const dataKey = p?.dataKey ?? "val";
          const raw = p?.value;
          const value = formatter ? formatter(raw, name, p) : raw;

          // ✅ chave mais estável (evita “misturar” com renders de outros lugares)
          const key = `${safeLabel}::${String(dataKey)}::${String(name)}::${idx}`;

          return (
            <div className="cbad-tooltipRow" key={key}>
              <span className="cbad-tooltipName">{name}</span>
              <span className="cbad-tooltipValue">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// mini ícones
function IconPulse() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M3 12h4l2-7 4 14 2-7h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconMoney() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M21 7H3v10h18V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 7a3 3 0 0 1-3 3M17 7a3 3 0 0 0 3 3M7 17a3 3 0 0 0-3-3M17 17a3 3 0 0 1 3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// pega o mês atual (último item)
function pickCurrentMonthRow(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[list.length - 1] || null;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const url = useMemo(() => `${API_BASE}/admin/api/dashboard?months=6`, []);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(url, { credentials: "include", signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Erro HTTP ${res.status}`);
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setErr(e?.message || "Erro ao carregar dashboard.");
        setData(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [url]);

  const rangeLabel = data?.range ? formatRangeLabel(data.range) : "";

  // KPIs do mês atual (última posição)
  const kpiSolicRow = useMemo(() => pickCurrentMonthRow(data?.solicitacoesPorMes), [data]);
  const kpiNovosRow = useMemo(() => pickCurrentMonthRow(data?.novosClientesPorMes), [data]);
  const kpiReceitaRow = useMemo(() => pickCurrentMonthRow(data?.receitaPorMes), [data]);

  const kpiMonthKey = kpiSolicRow?.month || kpiNovosRow?.month || kpiReceitaRow?.month || null;
  const kpiMonthText = kpiMonthKey ? monthLabel(kpiMonthKey) : "—";

  const kpiSolic = Number(kpiSolicRow?.total ?? 0);
  const kpiNovos = Number(kpiNovosRow?.novos ?? 0);
  const kpiReceita = Number(kpiReceitaRow?.receita ?? 0);

  // séries p/ gráficos
  const solicitacoesSeries = useMemo(() => {
    const list = data?.solicitacoesPorMes || [];
    return list.map((x) => ({
      month: monthLabel(x.month),
      total: Number(x.total ?? 0),
    }));
  }, [data]);

  const receitaSeries = useMemo(() => {
    const list = data?.receitaPorMes || [];
    return list.map((x) => ({
      month: monthLabel(x.month),
      receita: Number(x.receita || 0),
    }));
  }, [data]);

  const novosClientesSeries = useMemo(() => {
    const list = data?.novosClientesPorMes || [];
    return list.map((x) => ({
      month: monthLabel(x.month),
      novos: Number(x.novos ?? 0),
    }));
  }, [data]);

  const clientesPorEmpresa = useMemo(() => {
    const list = data?.clientesPorEmpresa || [];
    return list.map((x) => ({
      nome: String(x.nome || ""),
      clientes: Number(x.clientes ?? 0),
    }));
  }, [data]);

  const topCombinacoes = useMemo(() => {
    const list = data?.topCombinacoes || [];
    return list.map((x) => ({
      label: String(x.label || ""),
      count: Number(x.count ?? 0),
    }));
  }, [data]);

  // tamanhos
  const minChartWidth = 920;
  const lineHeight = 340;
  const rankHeight = 460;

  return (
    // ✅ root único: tudo fica isolado aqui dentro
    <div className="cbad-root">
      <div className="cbad-card">
        <div className="cbad-scrollPage">
          <header className="cbad-header">
            <div className="cbad-headerLeft">
              <div className="cbad-titleRow">
                <h1 className="cbad-title">Dashboard (Admin)</h1>
                <span className="cbad-badge">Últimos 6 meses</span>
              </div>

              <p className="cbad-subtitle">
                {rangeLabel ? <span className="cbad-range">{rangeLabel}</span> : null}
                {rangeLabel ? <span className="cbad-dot">•</span> : null}
                KPIs exibem o <strong>mês atual</strong> ({kpiMonthText}).
              </p>
            </div>

            <div className="cbad-kpis" aria-label="KPIs do mês atual">
              <Kpi
                label={`Solicitações (mês atual • ${kpiMonthText})`}
                value={kpiSolic}
                icon={<IconPulse />}
              />
              <Kpi
                label={`Novos clientes (mês atual • ${kpiMonthText})`}
                value={kpiNovos}
                tone="blue"
                icon={<IconUsers />}
              />
              <Kpi
                label={`Receita (mês atual • ${kpiMonthText})`}
                value={moneyBR(kpiReceita)}
                tone="green"
                icon={<IconMoney />}
              />
            </div>
          </header>

          {loading ? (
            <div className="cbad-state">Carregando...</div>
          ) : err ? (
            <div className="cbad-state cbad-state--error">{err}</div>
          ) : !data ? (
            <div className="cbad-state">Sem dados.</div>
          ) : (
            <>
              <Panel
                title="Tendências"
                subtitle="As séries abaixo rolam horizontalmente em telas menores para manter a leitura."
                right={<span className="cbad-tag">Charts</span>}
              >
                <div className="cbad-chartsGrid">
                  <div className="cbad-chartBox">
                    <ChartTitle title="Análises (total)" hint="Total de análises realizadas por mês" />
                    <div className="cbad-scrollX">
                      <div className="cbad-chartCanvas" style={{ minWidth: minChartWidth, height: lineHeight }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={solicitacoesSeries}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
                            <XAxis dataKey="month" tickMargin={8} />
                            <YAxis allowDecimals={false} width={40} />
                            <Tooltip content={<DarkTooltip />} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="total"
                              name="Total"
                              stroke={CHART_GREEN}
                              strokeWidth={3}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="cbad-chartBox">
                    <ChartTitle title="Receita" hint="Estimativa pelo VALOR_MENSAL do plano" />
                    <div className="cbad-scrollX">
                      <div className="cbad-chartCanvas" style={{ minWidth: minChartWidth, height: lineHeight }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={receitaSeries}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
                            <XAxis dataKey="month" tickMargin={8} />
                            <YAxis width={52} />
                            <Tooltip content={<DarkTooltip formatter={(v) => moneyBR(v)} />} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="receita"
                              name="Receita"
                              stroke={CHART_GREEN}
                              strokeWidth={3}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="cbad-chartBox">
                    <ChartTitle title="Novos clientes" hint="Cadastros no período" />
                    <div className="cbad-scrollX">
                      <div className="cbad-chartCanvas" style={{ minWidth: minChartWidth, height: lineHeight }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={novosClientesSeries}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
                            <XAxis dataKey="month" tickMargin={8} />
                            <YAxis allowDecimals={false} width={40} />
                            <Tooltip content={<DarkTooltip />} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="novos"
                              name="Novos"
                              stroke={CHART_GREEN}
                              strokeWidth={3}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Rankings"
                subtitle="Use rolagem vertical/horizontal para ver tudo sem esmagar os rótulos."
                right={<span className="cbad-tag">Top</span>}
              >
                <div className="cbad-rankGrid">
                  <div className="cbad-chartBox">
                    <ChartTitle title="Clientes por empresa" hint="Lista completa com rolagem" />
                    <div className="cbad-scrollX">
                      <div className="cbad-scrollY" style={{ maxHeight: 540 }}>
                        <div className="cbad-chartCanvas" style={{ minWidth: 980, height: rankHeight }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={clientesPorEmpresa}
                              layout="vertical"
                              margin={{ left: 34, right: 20, top: 10, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
                              <XAxis type="number" allowDecimals={false} />
                              <YAxis type="category" dataKey="nome" width={240} tick={{ fontSize: 12 }} />
                              <Tooltip content={<DarkTooltip />} />
                              <Bar
                                dataKey="clientes"
                                name="Clientes"
                                radius={[10, 10, 10, 10]}
                                fill={CHART_GREEN}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="cbad-chartBox">
                    <ChartTitle title="Top 6 combos Bio + Quim" hint="Combinações mais pedidas" />
                    <div className="cbad-scrollX">
                      <div className="cbad-scrollY" style={{ maxHeight: 540 }}>
                        <div className="cbad-chartCanvas" style={{ minWidth: 1100, height: rankHeight }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={topCombinacoes}
                              layout="vertical"
                              margin={{ left: 34, right: 20, top: 10, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
                              <XAxis type="number" allowDecimals={false} />
                              <YAxis type="category" dataKey="label" width={380} tick={{ fontSize: 12 }} />
                              <Tooltip content={<DarkTooltip />} />
                              <Bar
                                dataKey="count"
                                name="Solicitações"
                                radius={[10, 10, 10, 10]}
                                fill={CHART_GREEN}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              <div style={{ height: 10 }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
