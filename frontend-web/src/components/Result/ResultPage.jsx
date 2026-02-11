// Result.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

function IconX(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6l6.3-6.31 1.41 1.42Z"
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

  if (s.includes("compat") && !s.includes("incompat")) return { label: "Compatível", cls: "is-ok" };
  if (s.includes("incompat")) return { label: "Incompatível", cls: "is-bad" };

  if (s.includes("anal") || s.includes("pend") || s.includes("parc")) {
    if (s.includes("pend")) return { label: "Pendente", cls: "is-warn" };
    if (s.includes("parc")) return { label: "Parcial", cls: "is-warn" };
    return { label: "Em Análise", cls: "is-warn" };
  }

  return { label: status ? String(status) : "Em Análise", cls: "is-warn" };
}

function isPendente(statusRaw) {
  return normalizeStatus(statusRaw).includes("pend");
}

function formatDateBR(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

function pickBestDate(raw) {
  return (
    raw?.DATA_RESPOSTA ||
    raw?.DATA_CRIACAO ||
    raw?.DATA_SOLICITACAO ||
    raw?.createdAt ||
    raw?.created_at ||
    raw?.dataCriacao ||
    raw?.data_solicitacao ||
    null
  );
}

function ConfirmModal({ open, onClose, title, children, footer, busy }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  return (
    <div
      className="resultsModalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div className="resultsModalCard" role="dialog" aria-modal="true" aria-label={title}>
        <div className="resultsModalHeader">
          <h3 className="resultsModalTitle">{title}</h3>
          <button
            type="button"
            className="resultsModalClose"
            onClick={onClose}
            aria-label="Fechar"
            disabled={busy}
            title="Fechar (Esc)"
          >
            <IconX className="resultsModalCloseIco" />
          </button>
        </div>

        <div className="resultsModalBody">{children}</div>

        {footer ? <div className="resultsModalFooter">{footer}</div> : null}
      </div>
    </div>
  );
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

  const [toast, setToast] = useState("");

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundErr, setRefundErr] = useState("");
  const [refundTarget, setRefundTarget] = useState(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove("pg-enter");
    void el.offsetHeight;
    el.classList.add("pg-enter");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
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
      const list = Array.isArray(data?.solicitacoes) ? data.solicitacoes : [];

      const mapped = list.map((s) => {
        const quimico =
          s?.produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto?.NOME || "—";
        const biologico =
          s?.produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto?.NOME || "—";

        const bestDate = pickBestDate(s);

        return {
          id: s.ID,
          statusRaw: s.STATUS,
          status: statusMeta(s.STATUS),
          date: formatDateBR(bestDate),
          chemical: quimico,
          biological: biologico,
          raw: s,
          _sortTs: bestDate ? new Date(bestDate).getTime() : 0,
        };
      });

      mapped.sort((a, b) => (b._sortTs || 0) - (a._sortTs || 0));
      setRows(mapped);
    } catch (e) {
      setRows([]);
      setErr(e?.message || "Erro ao carregar resultados");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const onDetail = (row) => {
    navigate("/app/detalhes-analise", {
      state: { solicitacao: row.raw },
    });
  };

  const openRefund = (row) => {
    setRefundErr("");
    setRefundTarget(row);
    setRefundOpen(true);
  };

  const closeRefund = () => {
    if (refundBusy) return;
    setRefundOpen(false);
    setRefundTarget(null);
    setRefundErr("");
  };

  const confirmRefund = async () => {
    if (!refundTarget?.id) return;

    if (!isPendente(refundTarget.statusRaw)) {
      setRefundErr("Só é possível reembolsar quando o status está PENDENTE.");
      return;
    }

    setRefundBusy(true);
    setRefundErr("");

    try {
      const res = await fetch(`${API_BASE}/api/solicitacoes/analise/reembolsar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: refundTarget.id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Falha ao reembolsar (${res.status})`);

      setRows((prev) => prev.filter((x) => x.id !== refundTarget.id));

      setToast(
        `Solicitação #${refundTarget.id} cancelada e 1 crédito foi devolvido${
          json?.saldoAtual != null ? ` (Saldo: ${json.saldoAtual})` : ""
        }.`
      );

      closeRefund();
    } catch (e) {
      setRefundErr(e?.message || "Erro ao solicitar reembolso.");
    } finally {
      setRefundBusy(false);
    }
  };

  const hasRows = rows.length > 0;

  const refundHint = useMemo(() => {
    if (!refundTarget) return "";
    return `Você vai cancelar a solicitação #${refundTarget.id} e receber 1 crédito de volta.`;
  }, [refundTarget]);

  return (
    <div className="pg-wrap resultsWrap">
      <div className="resultsPage">
        <section ref={cardRef} className="pg-card resultsCard">
          <header className="resultsCardHeader">
            <div className="resultsHeaderLeft">
              <h1 className="resultsCardTitle">Resultados das Análises</h1>
            </div>

            <button
              type="button"
              className="resultsReloadBtn"
              onClick={load}
              disabled={loading}
              title="Recarregar lista"
            >
              {loading ? "Carregando..." : "Recarregar"}
            </button>
          </header>

          <div className="resultsCardBody">
            {toast ? (
              <div className="resultsToast" role="status" aria-live="polite">
                <span>{toast}</span>
                <button
                  type="button"
                  className="resultsToastBtn"
                  onClick={() => setToast("")}
                  aria-label="Fechar aviso"
                  title="Fechar"
                >
                  <IconX style={{ width: "1.2em", height: "1.2em" }} />
                </button>
              </div>
            ) : null}

            <div className="resultsScroller" aria-label="Área rolável da lista">
              {loading ? (
                <p className="resultsStateText">Carregando...</p>
              ) : err ? (
                <p className="resultsStateText is-error">{err}</p>
              ) : !hasRows ? (
                <p className="resultsStateText is-empty">Nenhuma solicitação encontrada.</p>
              ) : (
                <>
                  {/* ✅ CABEÇALHO NO TOPO DA “TABELA” */}
                  <div className="resultsTableHead" aria-hidden="true">
                    <div className="resultsHeadRow">
                      <span className="resultsHeadCell resultsHeadCell--date">Data</span>
                      <span className="resultsHeadCell">Produto químico</span>
                      <span className="resultsHeadCell resultsHeadCell--arrow" aria-hidden="true" />
                      <span className="resultsHeadCell">Produto biológico</span>
                      <span className="resultsHeadCell">Situação</span>
                      <span className="resultsHeadCell resultsHeadCell--actions">Ação</span>
                    </div>
                  </div>

                  <ul className="resultsList" aria-label="Tabela de solicitações de análise">
                    {rows.map((r) => {
                      const pendente = isPendente(r.statusRaw);

                      return (
                        <li key={r.id} className="resultsRow">
                          <span className="resultsDate">{r.date}</span>

                          <div className="resultsProd resultsProd--chem" title={r.chemical}>
                            <span className="resultsProdLabel">Produto químico</span>
                            <span className="resultsProdName">{r.chemical}</span>
                          </div>

                          <span className="resultsArrow" aria-hidden="true">
                            <IconArrow />
                          </span>

                          <div className="resultsProd resultsProd--bio" title={r.biological}>
                            <span className="resultsProdLabel">Produto biológico</span>
                            <span className="resultsProdName">{r.biological}</span>
                          </div>

                          <span className={`resultsStatus ${r.status.cls}`} title={r.statusRaw || ""}>
                            {r.status.label}
                          </span>

                          <div className="resultsActions">
                            {pendente ? (
                              <button
                                type="button"
                                className="resultsActionBtn is-refund"
                                onClick={() => openRefund(r)}
                                title="Cancelar solicitação e reembolsar 1 crédito"
                              >
                                Reembolsar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="resultsActionBtn"
                                onClick={() => onDetail(r)}
                                title="Ver detalhes desta análise"
                              >
                                Detalhar Análise
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={refundOpen}
        onClose={closeRefund}
        busy={refundBusy}
        title="Cancelar solicitação e reembolsar 1 crédito"
        footer={
          <>
            <button
              type="button"
              className="resultsModalBtnGhost"
              onClick={closeRefund}
              disabled={refundBusy}
            >
              Voltar
            </button>
            <button
              type="button"
              className="resultsModalBtnDanger"
              onClick={confirmRefund}
              disabled={refundBusy}
            >
              {refundBusy ? "Processando..." : "Confirmar reembolso"}
            </button>
          </>
        }
      >
        <div className="resultsModalInfo">
          <p className="resultsModalText">{refundHint}</p>

          <div className="resultsModalBox">
            <div className="resultsModalBoxItem">
              <span className="resultsModalLabel">Solicitação</span>
              <span className="resultsModalValue">#{refundTarget?.id ?? "—"}</span>
            </div>
            <div className="resultsModalBoxItem">
              <span className="resultsModalLabel">Status</span>
              <span className="resultsModalValue">{refundTarget?.statusRaw ?? "—"}</span>
            </div>
          </div>

          {refundErr ? <div className="resultsModalError">{refundErr}</div> : null}

          <p className="resultsModalMini">
            Obs.: Só funciona se a solicitação ainda estiver <b>PENDENTE</b> no servidor.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
