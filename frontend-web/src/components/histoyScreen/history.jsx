import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../Pages/Pages.css";
import "./history.css";

function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 5h-2v6l5 3 1-1.7-4-2.3V7Z"
      />
    </svg>
  );
}

function IconReceipt(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M6 2h12a2 2 0 0 1 2 2v18l-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1V4a2 2 0 0 1 2-2Zm2 6h8v2H8V8Zm0 4h8v2H8v-2Zm0 4h6v2H8v-2Z"
      />
    </svg>
  );
}

function IconMoney(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 1a11 11 0 1 0 .001 22.001A11 11 0 0 0 12 1Zm1 17h-2v-1.1c-1.8-.3-3-1.5-3.2-3.1h2.1c.2 1 1 1.7 2.1 1.7 1.2 0 2-.6 2-1.5 0-1-.9-1.4-2.5-1.8-2.1-.5-3.6-1.3-3.6-3.4 0-1.7 1.2-2.9 3.1-3.2V4h2v1.1c1.6.3 2.7 1.3 3 2.8h-2.1c-.2-.8-.8-1.3-1.9-1.3-1.1 0-1.8.5-1.8 1.3 0 .9.9 1.2 2.4 1.6 2.3.6 3.7 1.5 3.7 3.6 0 1.8-1.3 3-3.3 3.3V18Z"
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

function upper(v) {
  return String(v ?? "").toUpperCase();
}

function formatBRL(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatDateTimeBR(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateBR(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shortId(v, keep = 10) {
  const s = String(v || "");
  if (!s) return "—";
  if (s.length <= keep * 2 + 3) return s;
  return `${s.slice(0, keep)}...${s.slice(-keep)}`;
}

function within7Days(dateStr) {
  if (!dateStr) return false;
  const paidAt = new Date(dateStr);
  if (Number.isNaN(paidAt.getTime())) return false;
  const diff = Date.now() - paidAt.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function StatusPill({ status }) {
  const s = upper(status);
  const klass =
    s === "PAGO"
      ? "is-ok"
      : s === "PENDENTE"
      ? "is-pending"
      : s === "CANCELADO"
      ? "is-bad"
      : "is-neutral";
  return <span className={`histStatus ${klass}`}>{status || "—"}</span>;
}

function RefundPill({ status }) {
  const s = upper(status);
  const klass =
    s === "SUCESSO"
      ? "is-ok"
      : s === "PENDENTE"
      ? "is-pending"
      : s === "FALHOU"
      ? "is-bad"
      : "is-neutral";
  return <span className={`histRefundStatus ${klass}`}>{status || "—"}</span>;
}

function RequestPill({ status }) {
  const s = upper(status);
  const klass =
    s === "PENDENTE" ? "is-pending" : s === "APROVADA" ? "is-ok" : s === "NEGADA" ? "is-bad" : "is-neutral";
  return <span className={`histReqStatus ${klass}`}>Solicitação: {status || "—"}</span>;
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`histGhostBtn ${active ? "is-on" : ""}`}
      onClick={onClick}
      style={{ minWidth: 140 }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/**
 * Modal genérico para solicitar reembolso
 * - Enter = enviar
 * - Shift+Enter = quebra linha
 * - Esc = fechar
 */
function RefundModal({
  open,
  onClose,
  title = "Solicitar reembolso",
  kicker = "Reembolso",
  summaryItems = [],
  motivo,
  onMotivoChange,
  onConfirm,
  submitting,
  errorText,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      textareaRef.current?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title">
        <div className="modalHeader">
          <div className="modalHeaderLeft">
            <div className="modalKicker">{kicker}</div>
            <h2 id="refund-modal-title" className="modalTitle">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="modalCloseBtn"
            onClick={onClose}
            aria-label="Fechar"
            disabled={submitting}
            title="Fechar (Esc)"
          >
            <IconX className="modalCloseIco" />
          </button>
        </div>

        <div className="modalBody">
          {summaryItems?.length ? (
            <div className="modalSummary">
              {summaryItems.map((it, idx) => (
                <div key={idx} className={`modalSummaryItem ${it?.strong ? "is-strong" : ""}`}>
                  <span className="modalSummaryLabel">{it?.label}</span>
                  <span className="modalSummaryValue">{it?.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="modalInfo">
            <p className="modalInfoText">
              Dica: <b>Enter</b> envia • <b>Shift+Enter</b> quebra linha • <b>Esc</b> fecha.
            </p>
          </div>

          <label className="modalField">
            <span className="modalFieldLabel">Motivo (opcional)</span>
            <textarea
              ref={textareaRef}
              className="modalTextarea"
              placeholder="Digite o motivo... (Enter para enviar)"
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
              maxLength={1000}
              disabled={submitting}
              onKeyDown={(e) => {
                const composing = e.nativeEvent?.isComposing;
                if (composing) return;

                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!submitting) onConfirm?.();
                }
              }}
            />
            <div className="modalCounterRow">
              <span className="modalMiniHint">Enter para enviar • Shift+Enter nova linha</span>
              <span className="modalCounter">{(motivo?.length || 0)}/1000</span>
            </div>
          </label>

          {errorText ? <div className="modalError">{errorText}</div> : null}
        </div>

        <div className="modalFooter">
          <button type="button" className="modalBtnGhost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>

          <button type="button" className="modalBtnPrimary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Enviando..." : "Confirmar solicitação"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreditsHistoryPage() {
  const navigate = useNavigate();

  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000").toString().replace(/\/+$/, "");

  // Tabs: "CREDITO" | "ASSINATURA"
  const [tab, setTab] = useState("CREDITO");

  // ===== Créditos =====
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [errCredits, setErrCredits] = useState("");

  const [pageCredits, setPageCredits] = useState(1);
  const [pageSizeCredits] = useState(10);

  const [totalCreditsCount, setTotalCreditsCount] = useState(0);
  const [totalCreditsPages, setTotalCreditsPages] = useState(1);
  const [compras, setCompras] = useState([]);

  // ===== Assinatura (faturas) =====
  const [loadingAssin, setLoadingAssin] = useState(true);
  const [errAssin, setErrAssin] = useState("");

  const [pageAssin, setPageAssin] = useState(1);
  const [pageSizeAssin] = useState(10);

  const [totalAssinCount, setTotalAssinCount] = useState(0);
  const [totalAssinPages, setTotalAssinPages] = useState(1);
  const [faturas, setFaturas] = useState([]);

  // toast
  const [toast, setToast] = useState("");

  // modal state (genérico)
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundErr, setRefundErr] = useState("");
  const [refundMotivo, setRefundMotivo] = useState("");

  // alvo do modal (pode ser compra ou fatura)
  const [refundTarget, setRefundTarget] = useState(null); // { tipo: "CREDITO" | "ASSINATURA", data: {...} }

  // ====== Loads ======
  const loadCredits = useCallback(
    async (p) => {
      setLoadingCredits(true);
      setErrCredits("");

      try {
        const url = new URL(`${API_BASE}/api/creditos/historico`);
        url.searchParams.set("page", String(p));
        url.searchParams.set("pageSize", String(pageSizeCredits));

        const res = await fetch(url.toString(), { credentials: "include" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 401) throw new Error("Você precisa estar logado para ver seu histórico.");
          throw new Error(json?.error || `Erro ao carregar histórico (${res.status})`);
        }

        const list = Array.isArray(json?.compras) ? json.compras : [];
        setCompras(list);
        setTotalCreditsCount(Number(json?.total ?? 0) || 0);
        setTotalCreditsPages(Number(json?.totalPages ?? 1) || 1);
        setPageCredits(Number(json?.page ?? p) || p);
      } catch (e) {
        setCompras([]);
        setTotalCreditsCount(0);
        setTotalCreditsPages(1);
        setErrCredits(e?.message || "Erro ao carregar histórico.");
      } finally {
        setLoadingCredits(false);
      }
    },
    [API_BASE, pageSizeCredits]
  );

  // ⚠️ Endpoint sugerido:
  // GET /api/assinatura/historico?page=&pageSize=
  // Espera: { page, pageSize, total, totalPages, faturas: [...] }
  const loadAssinaturas = useCallback(
    async (p) => {
      setLoadingAssin(true);
      setErrAssin("");

      try {
        const url = new URL(`${API_BASE}/api/assinatura/historico`);
        url.searchParams.set("page", String(p));
        url.searchParams.set("pageSize", String(pageSizeAssin));

        const res = await fetch(url.toString(), { credentials: "include" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 401) throw new Error("Você precisa estar logado para ver seu histórico.");
          throw new Error(json?.error || `Erro ao carregar faturas (${res.status})`);
        }

        const list = Array.isArray(json?.faturas) ? json.faturas : [];
        setFaturas(list);
        setTotalAssinCount(Number(json?.total ?? 0) || 0);
        setTotalAssinPages(Number(json?.totalPages ?? 1) || 1);
        setPageAssin(Number(json?.page ?? p) || p);
      } catch (e) {
        setFaturas([]);
        setTotalAssinCount(0);
        setTotalAssinPages(1);
        setErrAssin(e?.message || "Erro ao carregar faturas de assinatura.");
      } finally {
        setLoadingAssin(false);
      }
    },
    [API_BASE, pageSizeAssin]
  );

  // first load (carrega os dois, para alternar sem “piscar”)
  useEffect(() => {
    loadCredits(pageCredits);
    loadAssinaturas(pageAssin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload ao paginar em cada aba
  useEffect(() => {
    if (tab === "CREDITO") loadCredits(pageCredits);
  }, [tab, loadCredits, pageCredits]);

  useEffect(() => {
    if (tab === "ASSINATURA") loadAssinaturas(pageAssin);
  }, [tab, loadAssinaturas, pageAssin]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  // ===== summaries =====
  const creditsSummary = useMemo(() => {
    const paid = compras.filter((c) => upper(c?.STATUS) === "PAGO");
    const totalPaidValue = paid.reduce((acc, c) => acc + Number(c?.VALOR_TOTAL ?? 0), 0);
    const totalCredits = compras.reduce((acc, c) => acc + Number(c?.QUANTIDADE ?? 0), 0);

    return {
      totalCredits: Number.isFinite(totalCredits) ? totalCredits : 0,
      totalPaidValue: Number.isFinite(totalPaidValue) ? totalPaidValue : 0,
    };
  }, [compras]);

  const assinSummary = useMemo(() => {
    // Espera campos tipo: VALOR, STATUS ("PAGO"|"FALHOU"), CREDITOS_CONCEDIDOS
    const paid = faturas.filter((f) => upper(f?.STATUS) === "PAGO");
    const totalPaidValue = paid.reduce((acc, f) => acc + Number(f?.VALOR ?? 0), 0);
    const totalCreditsConcedidos = faturas.reduce((acc, f) => acc + Number(f?.CREDITOS_CONCEDIDOS ?? 0), 0);

    return {
      totalCreditsConcedidos: Number.isFinite(totalCreditsConcedidos) ? totalCreditsConcedidos : 0,
      totalPaidValue: Number.isFinite(totalPaidValue) ? totalPaidValue : 0,
    };
  }, [faturas]);

  // ===== pager helpers =====
  const isCreditsTab = tab === "CREDITO";
  const loading = isCreditsTab ? loadingCredits : loadingAssin;
  const err = isCreditsTab ? errCredits : errAssin;

  const page = isCreditsTab ? pageCredits : pageAssin;
  const totalPages = isCreditsTab ? totalCreditsPages : totalAssinPages;
  const total = isCreditsTab ? totalCreditsCount : totalAssinCount;

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  // ===== modal open/close =====
  const openRefundModalCredito = (compra) => {
    setRefundErr("");
    setRefundMotivo("");
    setRefundTarget({ tipo: "CREDITO", data: compra });
    setRefundOpen(true);
  };

  const openRefundModalAssinatura = (fatura) => {
    setRefundErr("");
    setRefundMotivo("");
    setRefundTarget({ tipo: "ASSINATURA", data: fatura });
    setRefundOpen(true);
  };

  const closeRefundModal = () => {
    if (refundSubmitting) return;
    setRefundOpen(false);
    setRefundTarget(null);
    setRefundMotivo("");
    setRefundErr("");
  };

  // ===== submit refund request =====
  const confirmRefundRequest = async () => {
    if (!refundTarget?.tipo) return;

    setRefundErr("");
    setRefundSubmitting(true);

    try {
      if (refundTarget.tipo === "CREDITO") {
        const compra = refundTarget.data;
        if (!compra?.ID) return;

        const res = await fetch(`${API_BASE}/api/creditos/reembolso/solicitar`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ compraId: compra.ID, motivo: refundMotivo }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Falha ao solicitar reembolso (${res.status})`);

        setCompras((prev) =>
          prev.map((c) =>
            c?.ID === compra.ID
              ? {
                  ...c,
                  solicitacao_reembolso: json?.solicitacao || { STATUS: "PENDENTE" },
                }
              : c
          )
        );

        setToast("Solicitação enviada! Agora é só aguardar a análise.");
        closeRefundModal();
        return;
      }

      if (refundTarget.tipo === "ASSINATURA") {
        const fatura = refundTarget.data;

        // ⚠️ Endpoint sugerido:
        // POST /api/assinatura/reembolso/solicitar
        // body: { stripeInvoiceId, motivo }
        const stripeInvoiceId = String(fatura?.STRIPE_INVOICE_ID || "").trim();
        if (!stripeInvoiceId) throw new Error("Fatura sem STRIPE_INVOICE_ID.");

        const res = await fetch(`${API_BASE}/api/assinatura/reembolso/solicitar`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stripeInvoiceId, motivo: refundMotivo }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Falha ao solicitar reembolso (${res.status})`);

        // Atualiza localmente: coloca solicitacao_reembolso_assinatura dentro da fatura (se seu endpoint devolver isso)
        setFaturas((prev) =>
          prev.map((f) =>
            String(f?.STRIPE_INVOICE_ID || "") === stripeInvoiceId
              ? {
                  ...f,
                  solicitacao_reembolso: json?.solicitacao || { STATUS: "PENDENTE" },
                }
              : f
          )
        );

        setToast("Solicitação de reembolso da assinatura enviada! Agora é só aguardar a análise.");
        closeRefundModal();
      }
    } catch (e) {
      setRefundErr(e?.message || "Erro ao solicitar reembolso.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // ===== modal content (dinâmico) =====
  const modalConfig = useMemo(() => {
    if (!refundTarget?.tipo) {
      return {
        title: "Solicitar reembolso",
        kicker: "Reembolso",
        summaryItems: [],
      };
    }

    if (refundTarget.tipo === "CREDITO") {
      const compra = refundTarget.data;
      const qty = Number(compra?.QUANTIDADE ?? 0);
      const totalVal = compra?.VALOR_TOTAL;

      return {
        title: "Solicitar reembolso (créditos)",
        kicker: "Reembolso",
        summaryItems: [
          { label: "Compra", value: `#${compra?.ID ?? "—"}` },
          { label: "Créditos", value: Number.isFinite(qty) ? qty : "—" },
          { label: "Valor", value: formatBRL(totalVal), strong: true },
        ],
      };
    }

    // ASSINATURA
    const fatura = refundTarget.data;
    const creditos = Number(fatura?.CREDITOS_CONCEDIDOS ?? 0);
    const valor = fatura?.VALOR;

    return {
      title: "Solicitar reembolso (assinatura)",
      kicker: "Reembolso",
      summaryItems: [
        { label: "Fatura", value: shortId(fatura?.STRIPE_INVOICE_ID, 10) },
        { label: "Créditos", value: Number.isFinite(creditos) ? creditos : "—" },
        { label: "Valor", value: formatBRL(valor), strong: true },
      ],
    };
  }, [refundTarget]);

  // ===== render =====
  return (
    <div className="pg-wrap">
      <section className="pg-card histCard">
        <header className="histHeader">
          <div className="histHeaderLeft">
            <h1 className="histTitle">Histórico</h1>
            <p className="histSubtitle">Veja compras, faturas, status, reembolsos e solicitações.</p>

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <TabButton active={tab === "CREDITO"} onClick={() => setTab("CREDITO")}>
                Créditos
              </TabButton>
              <TabButton active={tab === "ASSINATURA"} onClick={() => setTab("ASSINATURA")}>
                Assinatura
              </TabButton>
            </div>
          </div>

          <div className="histHeaderRight">
            {tab === "CREDITO" ? (
              <div className="histPills">
                <span className="histPill">
                  <span className="histPillLabel">Compras</span>
                  <span className="histPillValue">{totalCreditsCount}</span>
                </span>

                <span className="histPill">
                  <span className="histPillLabel">Créditos (pág.)</span>
                  <span className="histPillValue">{creditsSummary.totalCredits}</span>
                </span>

                <span className="histPill is-green">
                  <span className="histPillLabel">Pago (pág.)</span>
                  <span className="histPillValue">{formatBRL(creditsSummary.totalPaidValue)}</span>
                </span>
              </div>
            ) : (
              <div className="histPills">
                <span className="histPill">
                  <span className="histPillLabel">Faturas</span>
                  <span className="histPillValue">{totalAssinCount}</span>
                </span>

                <span className="histPill">
                  <span className="histPillLabel">Créditos (pág.)</span>
                  <span className="histPillValue">{assinSummary.totalCreditsConcedidos}</span>
                </span>

                <span className="histPill is-green">
                  <span className="histPillLabel">Pago (pág.)</span>
                  <span className="histPillValue">{formatBRL(assinSummary.totalPaidValue)}</span>
                </span>
              </div>
            )}

            <div className="histPagerTop">
              <span className="histPagerText">
                Página <b>{page}</b> de <b>{totalPages}</b>
              </span>
            </div>
          </div>
        </header>

        <div className="histBody">
          {toast ? <div className="histToast">{toast}</div> : null}

          {loading ? (
            <div className="histState">Carregando...</div>
          ) : err ? (
            <div className="histState is-error">{err}</div>
          ) : tab === "CREDITO" ? (
            compras.length === 0 ? (
              <div className="histState">
                Nenhuma compra encontrada ainda.
                <div style={{ marginTop: 12 }}>
                  <button className="histGhostBtn" type="button" onClick={() => navigate("/app/planos-creditos")}>
                    Ir para compra de créditos
                  </button>
                </div>
              </div>
            ) : (
              <>
                <ul className="histList" aria-label="Lista de compras">
                  {compras.map((c) => {
                    const id = c?.ID ?? "—";
                    const status = c?.STATUS;
                    const createdAt = c?.DATA_CRIACAO;
                    const paidAt = c?.DATA_PAGAMENTO;

                    const qty = Number(c?.QUANTIDADE ?? 0);
                    const unit = c?.VALOR_UNITARIO;
                    const totalVal = c?.VALOR_TOTAL;
                    const sessionId = c?.STRIPE_SESSION_ID;

                    const reembolsos = Array.isArray(c?.reembolsos) ? c.reembolsos : [];
                    const solicitacao = c?.solicitacao_reembolso || null;

                    const hasRefundRunningOrDone = reembolsos.some((r) =>
                      ["PENDENTE", "SUCESSO"].includes(upper(r?.STATUS))
                    );

                    const isPaid = upper(status) === "PAGO" && !!paidAt;
                    const eligibleWindow = isPaid && within7Days(paidAt);
                    const hasRequest = !!solicitacao;
                    const canRequest = eligibleWindow && !hasRefundRunningOrDone && !hasRequest;

                    return (
                      <li key={String(id)} className="histItem">
                        <div className="histTopRow">
                          <div className="histLeft">
                            <div className="histTitleRow">
                              <StatusPill status={status} />
                              <span className="histId">Compra #{id}</span>
                              {solicitacao?.STATUS ? <RequestPill status={solicitacao.STATUS} /> : null}
                            </div>

                            <div className="histMeta">
                              <span className="histMetaItem">
                                <IconClock className="histIco" />
                                <span>
                                  Criada: <b>{formatDateTimeBR(createdAt)}</b>
                                </span>
                              </span>

                              <span className="histMetaDot">•</span>

                              <span className="histMetaItem">
                                <IconReceipt className="histIco" />
                                <span>
                                  Pagamento: <b>{paidAt ? formatDateTimeBR(paidAt) : "—"}</b>
                                </span>
                              </span>

                              <span className="histMetaDot">•</span>

                              <span className="histMetaItem">
                                <IconMoney className="histIco" />
                                <span>
                                  Total: <b>{formatBRL(totalVal)}</b>
                                </span>
                              </span>
                            </div>

                            <div className="histNumbers">
                              <span className="histNum">
                                Créditos: <b>{Number.isFinite(qty) ? qty : "—"}</b>
                              </span>
                              <span className="histNumDot">•</span>
                              <span className="histNum">
                                Unitário: <b>{formatBRL(unit)}</b>
                              </span>
                              <span className="histNumDot">•</span>
                              <span className="histNum" title={sessionId ? String(sessionId) : ""}>
                                Session: <b>{shortId(sessionId, 9)}</b>
                              </span>
                            </div>

                            {!eligibleWindow && isPaid ? (
                              <div className="histHint">
                                Prazo de reembolso: <b>expirado</b> (válido até 7 dias após o pagamento).
                              </div>
                            ) : null}
                          </div>

                          <div className="histRight">
                            <div className="histActions">
                              <button
                                type="button"
                                className={`histRefundBtn ${canRequest ? "is-on" : ""}`}
                                disabled={!canRequest}
                                onClick={() => openRefundModalCredito(c)}
                                title={
                                  canRequest
                                    ? "Solicitar reembolso"
                                    : hasRequest
                                    ? "Já existe solicitação"
                                    : hasRefundRunningOrDone
                                    ? "Já existe reembolso"
                                    : !isPaid
                                    ? "Compra ainda não está paga"
                                    : "Fora do prazo (7 dias)"
                                }
                              >
                                Solicitar reembolso
                              </button>

                              <details className="histDetails">
                                <summary className="histSummary">Detalhes</summary>

                                <div className="histDetailBox">
                                  <div className="histDetailGrid">
                                    <div className="histField">
                                      <span className="histFieldLabel">Status</span>
                                      <span className="histFieldValue">{status || "—"}</span>
                                    </div>
                                    <div className="histField">
                                      <span className="histFieldLabel">Créditos</span>
                                      <span className="histFieldValue">{Number.isFinite(qty) ? qty : "—"}</span>
                                    </div>
                                    <div className="histField">
                                      <span className="histFieldLabel">Valor unitário</span>
                                      <span className="histFieldValue">{formatBRL(unit)}</span>
                                    </div>
                                    <div className="histField">
                                      <span className="histFieldLabel">Valor total</span>
                                      <span className="histFieldValue">{formatBRL(totalVal)}</span>
                                    </div>
                                  </div>

                                  <div className="histSubDivider" />

                                  <h4 className="histSubTitle">Solicitação</h4>
                                  {!solicitacao ? (
                                    <p className="histMuted">Nenhuma solicitação registrada.</p>
                                  ) : (
                                    <div className="histReqBox">
                                      <div className="histReqRow">
                                        <RequestPill status={solicitacao.STATUS} />
                                        <span className="histMuted">
                                          Criada em <b>{formatDateTimeBR(solicitacao.DATA_CRIACAO)}</b>
                                        </span>
                                      </div>
                                      {solicitacao.MOTIVO ? <p className="histReqMotivo">{solicitacao.MOTIVO}</p> : null}
                                    </div>
                                  )}

                                  <div className="histSubDivider" />

                                  <h4 className="histSubTitle">Reembolsos</h4>
                                  {reembolsos.length === 0 ? (
                                    <p className="histMuted">Nenhum reembolso registrado.</p>
                                  ) : (
                                    <ul className="histRefundList" aria-label="Lista de reembolsos">
                                      {reembolsos.map((r) => (
                                        <li key={String(r?.ID ?? Math.random())} className="histRefundItem">
                                          <div className="histRefundTop">
                                            <RefundPill status={r?.STATUS} />
                                            <span className="histRefundId">
                                              Refund: {shortId(r?.STRIPE_REFUND_ID, 8)}
                                            </span>
                                          </div>

                                          <div className="histRefundMeta">
                                            <span>
                                              Créditos: <b>{Number(r?.QUANTIDADE ?? 0) || 0}</b>
                                            </span>
                                            <span className="histMetaDot">•</span>
                                            <span>
                                              Valor: <b>{formatBRL(r?.VALOR)}</b>
                                            </span>
                                            <span className="histMetaDot">•</span>
                                            <span>
                                              Criado: <b>{formatDateTimeBR(r?.DATA_CRIACAO)}</b>
                                            </span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="histPager">
                  <button
                    className="histGhostBtn"
                    type="button"
                    onClick={() => setPageCredits(1)}
                    disabled={!canPrev}
                  >
                    « Primeira
                  </button>

                  <button
                    className="histGhostBtn"
                    type="button"
                    onClick={() => setPageCredits((p) => Math.max(1, p - 1))}
                    disabled={!canPrev}
                  >
                    ‹ Anterior
                  </button>

                  <span className="histPagerCenter">
                    Página <b>{pageCredits}</b> de <b>{totalCreditsPages}</b>
                  </span>

                  <button
                    className="histGhostBtn"
                    type="button"
                    onClick={() => setPageCredits((p) => Math.min(totalCreditsPages, p + 1))}
                    disabled={!canNext}
                  >
                    Próxima ›
                  </button>

                  <button
                    className="histGhostBtn"
                    type="button"
                    onClick={() => setPageCredits(totalCreditsPages)}
                    disabled={!canNext}
                  >
                    Última »
                  </button>
                </div>

                <div className="histBottomActions">
                  <button
                    className="histBackBtn"
                    type="button"
                    onClick={() => navigate("/app/planos-creditos")}
                    disabled={loading}
                  >
                    Voltar
                  </button>
                  <button className="histPrimaryBtn" type="button" onClick={() => loadCredits(pageCredits)} disabled={loading}>
                    Recarregar
                  </button>
                </div>
              </>
            )
          ) : // ===== ASSINATURA TAB =====
          faturas.length === 0 ? (
            <div className="histState">
              Nenhuma fatura de assinatura encontrada.
              <div style={{ marginTop: 12 }}>
                <button className="histGhostBtn" type="button" onClick={() => navigate("/app/planos-creditos")}>
                  Ver planos
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul className="histList" aria-label="Lista de faturas de assinatura">
                {faturas.map((f) => {
                  // Campos esperados do backend
                  const id = f?.ID ?? "—";
                  const status = f?.STATUS; // "PAGO" | "FALHOU" (sugestão)
                  const createdAt = f?.DATA_CRIACAO;

                  const stripeInvoiceId = f?.STRIPE_INVOICE_ID;
                  const valor = f?.VALOR;
                  const creditos = Number(f?.CREDITOS_CONCEDIDOS ?? 0);

                  const periodoIni = f?.PERIODO_INICIO;
                  const periodoFim = f?.PERIODO_FIM;

                  // Estes 2 são "sugestões" de como seu endpoint pode devolver
                  const solicitacao = f?.solicitacao_reembolso || f?.solicitacao_reembolso_assinatura || null;
                  const reembolso = f?.reembolso || f?.reembolso_assinatura || null;

                  const hasRefundRunningOrDone =
                    reembolso && ["PENDENTE", "SUCESSO"].includes(upper(reembolso?.STATUS));

                  // Regras de janela (7 dias):
                  // Como assinatura_fatura não tem DATA_PAGAMENTO no schema, usamos DATA_CRIACAO como referência.
                  const isPaid = upper(status) === "PAGO" && !!createdAt;
                  const eligibleWindow = isPaid && within7Days(createdAt);

                  const hasRequest = !!solicitacao;
                  const canRequest = eligibleWindow && !hasRefundRunningOrDone && !hasRequest;

                  return (
                    <li key={String(stripeInvoiceId || id)} className="histItem">
                      <div className="histTopRow">
                        <div className="histLeft">
                          <div className="histTitleRow">
                            <StatusPill status={status} />
                            <span className="histId">Fatura #{id}</span>
                            {solicitacao?.STATUS ? <RequestPill status={solicitacao.STATUS} /> : null}
                          </div>

                          <div className="histMeta">
                            <span className="histMetaItem">
                              <IconClock className="histIco" />
                              <span>
                                Criada: <b>{formatDateTimeBR(createdAt)}</b>
                              </span>
                            </span>

                            <span className="histMetaDot">•</span>

                            <span className="histMetaItem">
                              <IconReceipt className="histIco" />
                              <span title={stripeInvoiceId ? String(stripeInvoiceId) : ""}>
                                Invoice: <b>{shortId(stripeInvoiceId, 10)}</b>
                              </span>
                            </span>

                            <span className="histMetaDot">•</span>

                            <span className="histMetaItem">
                              <IconMoney className="histIco" />
                              <span>
                                Valor: <b>{formatBRL(valor)}</b>
                              </span>
                            </span>
                          </div>

                          <div className="histNumbers">
                            <span className="histNum">
                              Créditos: <b>{Number.isFinite(creditos) ? creditos : "—"}</b>
                            </span>
                            <span className="histNumDot">•</span>
                            <span className="histNum">
                              Período:{" "}
                              <b>
                                {periodoIni ? formatDateBR(periodoIni) : "—"} → {periodoFim ? formatDateBR(periodoFim) : "—"}
                              </b>
                            </span>
                          </div>

                          {!eligibleWindow && isPaid ? (
                            <div className="histHint">
                              Prazo de reembolso: <b>expirado</b> (válido até 7 dias após a criação/pagamento da fatura).
                            </div>
                          ) : null}
                        </div>

                        <div className="histRight">
                          <div className="histActions">
                            <button
                              type="button"
                              className={`histRefundBtn ${canRequest ? "is-on" : ""}`}
                              disabled={!canRequest}
                              onClick={() => openRefundModalAssinatura(f)}
                              title={
                                canRequest
                                  ? "Solicitar reembolso da assinatura"
                                  : hasRequest
                                  ? "Já existe solicitação"
                                  : hasRefundRunningOrDone
                                  ? "Já existe reembolso"
                                  : !isPaid
                                  ? "Fatura não está paga"
                                  : "Fora do prazo (7 dias)"
                              }
                            >
                              Solicitar reembolso
                            </button>

                            <details className="histDetails">
                              <summary className="histSummary">Detalhes</summary>

                              <div className="histDetailBox">
                                <div className="histDetailGrid">
                                  <div className="histField">
                                    <span className="histFieldLabel">Status</span>
                                    <span className="histFieldValue">{status || "—"}</span>
                                  </div>
                                  <div className="histField">
                                    <span className="histFieldLabel">Créditos</span>
                                    <span className="histFieldValue">{Number.isFinite(creditos) ? creditos : "—"}</span>
                                  </div>
                                  <div className="histField">
                                    <span className="histFieldLabel">Valor</span>
                                    <span className="histFieldValue">{formatBRL(valor)}</span>
                                  </div>
                                  <div className="histField">
                                    <span className="histFieldLabel">Stripe Invoice</span>
                                    <span className="histFieldValue" title={stripeInvoiceId ? String(stripeInvoiceId) : ""}>
                                      {shortId(stripeInvoiceId, 12)}
                                    </span>
                                  </div>
                                  <div className="histField">
                                    <span className="histFieldLabel">Período</span>
                                    <span className="histFieldValue">
                                      {periodoIni ? formatDateBR(periodoIni) : "—"} →{" "}
                                      {periodoFim ? formatDateBR(periodoFim) : "—"}
                                    </span>
                                  </div>
                                </div>

                                <div className="histSubDivider" />

                                <h4 className="histSubTitle">Solicitação</h4>
                                {!solicitacao ? (
                                  <p className="histMuted">Nenhuma solicitação registrada.</p>
                                ) : (
                                  <div className="histReqBox">
                                    <div className="histReqRow">
                                      <RequestPill status={solicitacao.STATUS} />
                                      <span className="histMuted">
                                        Criada em <b>{formatDateTimeBR(solicitacao.DATA_CRIACAO)}</b>
                                      </span>
                                    </div>
                                    {solicitacao.MOTIVO ? <p className="histReqMotivo">{solicitacao.MOTIVO}</p> : null}
                                  </div>
                                )}

                                <div className="histSubDivider" />

                                <h4 className="histSubTitle">Reembolso</h4>
                                {!reembolso ? (
                                  <p className="histMuted">Nenhum reembolso registrado.</p>
                                ) : (
                                  <div className="histReqBox">
                                    <div className="histReqRow">
                                      <RefundPill status={reembolso?.STATUS} />
                                      <span className="histMuted">
                                        Criado em <b>{formatDateTimeBR(reembolso?.DATA_CRIACAO)}</b>
                                      </span>
                                    </div>
                                    <div className="histRefundMeta" style={{ marginTop: 8 }}>
                                      <span>
                                        Refund: <b>{shortId(reembolso?.STRIPE_REFUND_ID, 10)}</b>
                                      </span>
                                      <span className="histMetaDot">•</span>
                                      <span>
                                        Valor: <b>{formatBRL(reembolso?.VALOR)}</b>
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="histPager">
                <button className="histGhostBtn" type="button" onClick={() => setPageAssin(1)} disabled={!canPrev}>
                  « Primeira
                </button>

                <button
                  className="histGhostBtn"
                  type="button"
                  onClick={() => setPageAssin((p) => Math.max(1, p - 1))}
                  disabled={!canPrev}
                >
                  ‹ Anterior
                </button>

                <span className="histPagerCenter">
                  Página <b>{pageAssin}</b> de <b>{totalAssinPages}</b>
                </span>

                <button
                  className="histGhostBtn"
                  type="button"
                  onClick={() => setPageAssin((p) => Math.min(totalAssinPages, p + 1))}
                  disabled={!canNext}
                >
                  Próxima ›
                </button>

                <button className="histGhostBtn" type="button" onClick={() => setPageAssin(totalAssinPages)} disabled={!canNext}>
                  Última »
                </button>
              </div>

              <div className="histBottomActions">
                <button className="histBackBtn" type="button" onClick={() => navigate("/app/planos-creditos")} disabled={loading}>
                  Voltar
                </button>
                <button className="histPrimaryBtn" type="button" onClick={() => loadAssinaturas(pageAssin)} disabled={loading}>
                  Recarregar
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <RefundModal
        open={refundOpen}
        onClose={closeRefundModal}
        title={modalConfig.title}
        kicker={modalConfig.kicker}
        summaryItems={modalConfig.summaryItems}
        motivo={refundMotivo}
        onMotivoChange={(v) => setRefundMotivo(v)}
        onConfirm={confirmRefundRequest}
        submitting={refundSubmitting}
        errorText={refundErr}
      />
    </div>
  );
}
