// Result.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Pages/Pages.css";
import "./Results.css";

function IconArrow(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6L13 5Z"
      />
    </svg>
  );
}

function IconChevronRight(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M9 18l6-6-6-6 1.4-1.4L18.8 12l-8.4 8.4L9 18Z"
      />
    </svg>
  );
}

function normalizeStatus(s) {
  const raw = String(s || "").trim().toLowerCase();
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function statusMeta(status) {
  const s = normalizeStatus(status);

  // verde
  if (s.includes("compat") && !s.includes("incompat")) {
    return { label: "Compatível", cls: "is-ok" };
  }

  // vermelho
  if (s.includes("incompat")) {
    return { label: "Incompatível", cls: "is-bad" };
  }

  // amarelo: em análise / pendente / parcial
  if (s.includes("anal") || s.includes("pend") || s.includes("parc")) {
    if (s.includes("pend")) return { label: "Pendente", cls: "is-warn" };
    if (s.includes("parc")) return { label: "Parcial", cls: "is-warn" };
    return { label: "Em Análise", cls: "is-warn" };
  }

  return { label: status ? String(status) : "Em Análise", cls: "is-warn" };
}

function formatDateBR(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export default function Result() {
  const navigate = useNavigate();

  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  const cardRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove("pg-enter");
    void el.offsetHeight;
    el.classList.add("pg-enter");
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(
          `${API_BASE}/api/solicitacoes/analise/minhas?page=1&pageSize=100`,
          { credentials: "include" }
        );

        if (!res.ok) {
          if (res.status === 401) throw new Error("Não autenticado");
          const t = await res.text().catch(() => "");
          throw new Error(t || `Erro HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!alive) return;

        const list = Array.isArray(data?.solicitacoes) ? data.solicitacoes : [];

        const mapped = list.map((s) => {
          const quimico =
            s?.produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto?.NOME || "—";
          const biologico =
            s?.produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto?.NOME || "—";

          return {
            id: s.ID,
            statusRaw: s.STATUS,
            status: statusMeta(s.STATUS),
            date: formatDateBR(s.DATA_RESPOSTA),
            chemical: quimico,
            biological: biologico,
            raw: s, // ✅ AQUI está a solicitação completa (inclui DESCRICAO)
          };
        });

        setRows(mapped);
      } catch (e) {
        if (!alive) return;
        setRows([]);
        setErr(e?.message || "Erro ao carregar resultados");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  const onDetail = (row) => {
    // ✅ manda o objeto completo para a tela de detalhes
    navigate("/app/detalhes-analise", {
      state: { solicitacao: row.raw },
    });
  };

  const hasRows = rows.length > 0;

  return (
    <div className="pg-wrap">
      <div className="resultsPage">
        <section ref={cardRef} className="pg-card resultsCard">
          <header className="resultsCardHeader">
            <h1 className="resultsCardTitle">Resultados das Análises</h1>
          </header>

          <div className="resultsCardBody">
            {loading ? (
              <p style={{ color: "rgba(255,255,255,0.82)", fontWeight: 800 }}>
                Carregando...
              </p>
            ) : err ? (
              <p style={{ color: "rgba(255,140,140,0.92)", fontWeight: 900 }}>
                {err}
              </p>
            ) : !hasRows ? (
              <p style={{ color: "rgba(255,255,255,0.78)", fontWeight: 800 }}>
                Nenhuma solicitação encontrada.
              </p>
            ) : (
              <>
                <ul className="resultsList">
                  {rows.map((r, idx) => (
                    <li key={`${r.id}-${idx}`} className="resultsRow">
                      <span className="resultsDate">{r.date}</span>

                      <span className="resultsName resultsName--left" title={r.chemical}>
                        {r.chemical}
                      </span>

                      <span className="resultsArrow" aria-hidden="true">
                        <IconArrow />
                      </span>

                      <span className="resultsName resultsName--right" title={r.biological}>
                        {r.biological}
                      </span>

                      {/* ✅ amarelo/verde/vermelho via cls */}
                      <span className={`resultsStatus ${r.status.cls}`}>
                        {r.status.label}
                      </span>

                      <button
                        type="button"
                        className="resultsDetailBtn"
                        onClick={() => onDetail(r)}
                      >
                        Detalhar Análise
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="resultsScrollHint"
                  aria-label="Mais resultados"
                >
                  <IconChevronRight />
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
