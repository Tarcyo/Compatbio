// CreditsHistoryPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../Pages/Pages.css";
import "./history.css";

/* ========= helpers ========= */
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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function shortId(v, keep = 10) {
  const s = String(v || "");
  if (!s) return "—";
  if (s.length <= keep * 2 + 3) return s;
  return `${s.slice(0, keep)}...${s.slice(-keep)}`;
}

function within7Days(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const diff = Date.now() - d.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

/* ========= pills ========= */
function StatusPill({ status }) {
  const s = upper(status);
  const klass =
    s === "PAGO" ? "is-ok" : s === "PENDENTE" ? "is-pending" : s === "CANCELADO" ? "is-bad" : "is-neutral";
  return <span className={`histStatus ${klass}`}>{status || "—"}</span>;
}

function RequestPill({ status }) {
  const s = upper(status);
  const klass = s === "PENDENTE" ? "is-pending" : s === "APROVADA" ? "is-ok" : s === "NEGADA" ? "is-bad" : "is-neutral";
  return <span className={`histReqStatus ${klass}`}>Solicitação: {status || "—"}</span>;
}

/* ========= icons ========= */
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

function IconRefund(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 5a1 1 0 0 1 2 0v1.1a4.9 4.9 0 0 1 1.88 1.01 1 1 0 1 1-1.34 1.48A3 3 0 0 0 14 9.9h-2a1.9 1.9 0 0 0 0 3.8h1a3.9 3.9 0 0 1 0 7.8v.5a1 1 0 0 1-2 0v-.6a5 5 0 0 1-2.5-1.44 1 1 0 1 1 1.5-1.32 3 3 0 0 0 2.2.96h2a1.9 1.9 0 0 0 0-3.8h-1a3.9 3.9 0 0 1 0-7.8V7Z"
      />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8-8 1.4 1.4-9.4 9.4Z" />
    </svg>
  );
}

/* ========= modal ========= */
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

    document.body.classList.add("modal-open");

    const t = setTimeout(() => textareaRef.current?.focus?.(), 20);

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(t);
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const node = (
    <div
      className="refundOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="refundModal" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title">
        <div className="refundTopBar">
          <div className="refundTopLeft">
            <div className="refundIconWrap" aria-hidden="true">
              <IconRefund className="refundIcon" />
            </div>

            <div className="refundTitles">
              <div className="refundKicker">{kicker}</div>
              <h2 id="refund-modal-title" className="refundTitle">
                {title}
              </h2>
              <p className="refundSubtitle">
                Confirme os dados abaixo e, se quiser, deixe um motivo. Vamos analisar sua solicitação com cuidado.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="refundCloseBtn"
            onClick={onClose}
            aria-label="Fechar"
            disabled={submitting}
            title={submitting ? "Aguarde..." : "Fechar"}
          >
            <IconX className="refundCloseIco" />
          </button>
        </div>

        <div className="refundBody">
          {summaryItems?.length ? (
            <div className="refundSummary">
              {summaryItems.map((it, idx) => (
                <div key={idx} className={`refundSummaryItem ${it?.strong ? "is-strong" : ""}`}>
                  <span className="refundSummaryLabel">{it?.label}</span>
                  <span className="refundSummaryValue">{it?.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="refundInfoBox" role="note" aria-label="Informações">
            <div className="refundInfoRow">
              <IconCheck className="refundInfoIco" />
              <span>Se aprovado, o reembolso será processado pela Stripe.</span>
            </div>
            <div className="refundInfoRow">
              <IconCheck className="refundInfoIco" />
              <span>Solicitações podem levar um tempinho para serem analisadas.</span>
            </div>
            <div className="refundInfoRow">
              <IconCheck className="refundInfoIco" />
              <span>Se já existir solicitação/reembolso, não é possível abrir outro.</span>
            </div>
          </div>

          <label className="refundField">
            <span className="refundFieldLabel">Motivo (opcional)</span>
            <textarea
              ref={textareaRef}
              className="refundTextarea"
              placeholder="Ex: Compra duplicada, engano, necessidade cancelada…"
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

            <div className="refundCounterRow">
              <span className="refundMiniHint">Enter envia • Shift+Enter quebra linha</span>
              <span className="refundCounter">{(motivo?.length || 0)}/1000</span>
            </div>
          </label>

          {errorText ? <div className="refundError">{errorText}</div> : null}
        </div>

        <div className="refundFooter">
          <button type="button" className="refundBtnGhost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="button" className="refundBtnPrimary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Enviando..." : "Confirmar solicitação"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

/* ========= page ========= */
export default function CreditsHistoryPage() {
  const navigate = useNavigate();
  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000").toString().replace(/\/+$/, "");

  const [tab, setTab] = useState("CREDITO");

  // Créditos
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [errCredits, setErrCredits] = useState("");
  const [pageCredits, setPageCredits] = useState(1);
  const [pageSizeCredits] = useState(10);
  const [totalCreditsCount, setTotalCreditsCount] = useState(0);
  const [totalCreditsPages, setTotalCreditsPages] = useState(1);
  const [compras, setCompras] = useState([]);

  // Assinatura
  const [loadingAssin, setLoadingAssin] = useState(true);
  const [errAssin, setErrAssin] = useState("");
  const [pageAssin, setPageAssin] = useState(1);
  const [pageSizeAssin] = useState(10);
  const [totalAssinCount, setTotalAssinCount] = useState(0);
  const [totalAssinPages, setTotalAssinPages] = useState(1);
  const [faturas, setFaturas] = useState([]);

  // toast
  const [toast, setToast] = useState("");

  // modal refund
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundErr, setRefundErr] = useState("");
  const [refundMotivo, setRefundMotivo] = useState("");
  const [refundTarget, setRefundTarget] = useState(null); // { tipo, data }

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

  // first load
  useEffect(() => {
    loadCredits(pageCredits);
    loadAssinaturas(pageAssin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const creditsPaidSum = useMemo(() => {
    const paid = compras.filter((c) => upper(c?.STATUS) === "PAGO");
    const totalPaidValue = paid.reduce((acc, c) => acc + Number(c?.VALOR_TOTAL ?? 0), 0);
    return Number.isFinite(totalPaidValue) ? totalPaidValue : 0;
  }, [compras]);

  const assinPaidSum = useMemo(() => {
    const paid = faturas.filter((f) => upper(f?.STATUS) === "PAGO");
    const totalPaidValue = paid.reduce((acc, f) => acc + Number(f?.VALOR ?? 0), 0);
    return Number.isFinite(totalPaidValue) ? totalPaidValue : 0;
  }, [faturas]);

  const isCreditsTab = tab === "CREDITO";
  const loading = isCreditsTab ? loadingCredits : loadingAssin;
  const err = isCreditsTab ? errCredits : errAssin;
  const page = isCreditsTab ? pageCredits : pageAssin;
  const totalPages = isCreditsTab ? totalCreditsPages : totalAssinPages;

  // modal open/close
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
            c?.ID === compra.ID ? { ...c, solicitacao_reembolso: json?.solicitacao || { STATUS: "PENDENTE" } } : c
          )
        );

        setToast("Solicitação enviada! Agora é só aguardar a análise.");
        closeRefundModal();
        return;
      }

      if (refundTarget.tipo === "ASSINATURA") {
        const fatura = refundTarget.data;
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

        setFaturas((prev) =>
          prev.map((f) =>
            String(f?.STRIPE_INVOICE_ID || "") === stripeInvoiceId
              ? { ...f, solicitacao_reembolso: json?.solicitacao || { STATUS: "PENDENTE" } }
              : f
          )
        );

        setToast("Solicitação enviada! Agora é só aguardar a análise.");
        closeRefundModal();
      }
    } catch (e) {
      setRefundErr(e?.message || "Erro ao solicitar reembolso.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const modalConfig = useMemo(() => {
    if (!refundTarget?.tipo) return { title: "Solicitar reembolso", kicker: "Reembolso", summaryItems: [] };

    if (refundTarget.tipo === "CREDITO") {
      const c = refundTarget.data;
      return {
        title: "Solicitar reembolso (créditos)",
        kicker: "Solicitação",
        summaryItems: [
          { label: "Compra", value: `#${c?.ID ?? "—"}` },
          { label: "Valor", value: formatBRL(c?.VALOR_TOTAL), strong: true },
          { label: "Pago em", value: c?.DATA_PAGAMENTO ? formatDateTimeBR(c.DATA_PAGAMENTO) : "—" },
        ],
      };
    }

    const f = refundTarget.data;
    return {
      title: "Solicitar reembolso (assinatura)",
      kicker: "Solicitação",
      summaryItems: [
        { label: "Fatura", value: shortId(f?.STRIPE_INVOICE_ID, 10) },
        { label: "Valor", value: formatBRL(f?.VALOR), strong: true },
        { label: "Data", value: f?.DATA_CRIACAO ? formatDateTimeBR(f.DATA_CRIACAO) : "—" },
      ],
    };
  }, [refundTarget]);

  return (
    <div className="pg-wrap histPage">
      <section className="pg-card histCard">
        <header className="histHeader">
          <div className="histHeaderLeft">
            <h1 className="histTitle">Histórico</h1>
            <p className="histSubtitle">Mostrando só o essencial. O restante fica em “Detalhar”.</p>

            <div className="histTabs" role="tablist" aria-label="Tipo de histórico">
              <div className={`histTabPill ${tab === "CREDITO" ? "is-credit" : "is-assin"}`} />
              <button
                type="button"
                className={`histTab ${tab === "CREDITO" ? "is-active" : ""}`}
                onClick={() => setTab("CREDITO")}
                role="tab"
                aria-selected={tab === "CREDITO"}
              >
                Créditos
              </button>
              <button
                type="button"
                className={`histTab ${tab === "ASSINATURA" ? "is-active" : ""}`}
                onClick={() => setTab("ASSINATURA")}
                role="tab"
                aria-selected={tab === "ASSINATURA"}
              >
                Assinatura
              </button>
            </div>
          </div>

          <div className="histHeaderRight">
            <div className="histPills">
              {tab === "CREDITO" ? (
                <>
                  <span className="histPill">
                    <span className="histPillLabel">Compras</span>
                    <b>{totalCreditsCount}</b>
                  </span>
                  <span className="histPill">
                    <span className="histPillLabel">Pago (pág.)</span>
                    <b>{formatBRL(creditsPaidSum)}</b>
                  </span>
                </>
              ) : (
                <>
                  <span className="histPill">
                    <span className="histPillLabel">Faturas</span>
                    <b>{totalAssinCount}</b>
                  </span>
                  <span className="histPill">
                    <span className="histPillLabel">Pago (pág.)</span>
                    <b>{formatBRL(assinPaidSum)}</b>
                  </span>
                </>
              )}
            </div>

            <div className="histPagerTopText">
              Página <b>{page}</b> de <b>{totalPages}</b>
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
                  <button className="histBtn" type="button" onClick={() => navigate("/app/planos-creditos")}>
                    Ir para compra de créditos
                  </button>
                </div>
              </div>
            ) : (
              <div className="histScroll">
                <ul className="histList" aria-label="Lista de compras">
                  {compras.map((c) => {
                    const id = c?.ID ?? "—";
                    const status = c?.STATUS;

                    const createdAt = c?.DATA_CRIACAO;
                    const paidAt = c?.DATA_PAGAMENTO;

                    const totalVal = c?.VALOR_TOTAL;

                    const qty = Number(c?.QUANTIDADE ?? 0);
                    const unit = c?.VALOR_UNITARIO;
                    const sessionId = c?.STRIPE_SESSION_ID;

                    const reembolsos = Array.isArray(c?.reembolsos) ? c.reembolsos : [];
                    const solicitacao = c?.solicitacao_reembolso || null;

                    const hasRefundRunningOrDone = reembolsos.some((r) => ["PENDENTE", "SUCESSO"].includes(upper(r?.STATUS)));

                    const isPaid = upper(status) === "PAGO" && !!paidAt;
                    const eligibleWindow = isPaid && within7Days(paidAt);
                    const hasRequest = !!solicitacao;
                    const canRequest = eligibleWindow && !hasRefundRunningOrDone && !hasRequest;

                    const displayDate = paidAt || createdAt;

                    return (
                      <li key={String(id)} className="histItem">
                        <div className="histTopRow">
                          <div>
                            <div className="histTitleRow">
                              <StatusPill status={status} />
                              <span className="histId">Compra #{id}</span>
                              {solicitacao?.STATUS ? <RequestPill status={solicitacao.STATUS} /> : null}
                            </div>

                            <div className="histEssGrid">
                              <div className="histEssBox">
                                <span className="histEssLabel">Valor pago</span>
                                <span className="histEssValue">{formatBRL(totalVal)}</span>
                              </div>
                              <div className="histEssBox">
                                <span className="histEssLabel">Data</span>
                                <span className="histEssValue">{displayDate ? formatDateTimeBR(displayDate) : "—"}</span>
                              </div>
                            </div>

                            <details className="histDetails">
                              <summary className="histSummary">Detalhar</summary>

                              <div className="histDetailBox">
                                <div className="histDetailGrid">
                                  <div>
                                    <span className="histFieldLabel">Criada em</span>
                                    <span className="histFieldValue">{formatDateTimeBR(createdAt)}</span>
                                  </div>
                                  <div>
                                    <span className="histFieldLabel">Pago em</span>
                                    <span className="histFieldValue">{paidAt ? formatDateTimeBR(paidAt) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="histFieldLabel">Créditos</span>
                                    <span className="histFieldValue">{Number.isFinite(qty) ? qty : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="histFieldLabel">Unitário</span>
                                    <span className="histFieldValue">{formatBRL(unit)}</span>
                                  </div>
                                  <div>
                                    <span className="histFieldLabel">Stripe session</span>
                                    <span className="histFieldValue" title={sessionId ? String(sessionId) : ""}>
                                      {shortId(sessionId, 12)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="histFieldLabel">Status</span>
                                    <span className="histFieldValue">{status || "—"}</span>
                                  </div>
                                </div>

                                <div className="histDivider" />

                                <p className="histMuted">
                                  Solicitação: <b>{solicitacao?.STATUS ? solicitacao.STATUS : "Nenhuma"}</b>{" "}
                                  {solicitacao?.DATA_CRIACAO ? `• ${formatDateTimeBR(solicitacao.DATA_CRIACAO)}` : ""}
                                </p>

                                {solicitacao?.MOTIVO ? (
                                  <p className="histMuted" style={{ marginTop: 8 }}>
                                    Motivo: <b>{String(solicitacao.MOTIVO)}</b>
                                  </p>
                                ) : null}

                                <div className="histDivider" />

                                <p className="histMuted">
                                  Reembolsos: <b>{reembolsos.length}</b>
                                </p>

                                {reembolsos.length ? (
                                  <div className="histRefundList">
                                    {reembolsos.map((r) => (
                                      <div key={String(r?.ID ?? Math.random())} className="histRefundCard">
                                        <div className="histRefundRow">
                                          <span className="histStatus is-neutral">{r?.STATUS || "—"}</span>
                                          <span className="histMuted">
                                            Refund: <b>{shortId(r?.STRIPE_REFUND_ID, 10)}</b>
                                          </span>
                                          <span className="histMuted">
                                            Valor: <b>{formatBRL(r?.VALOR)}</b>
                                          </span>
                                          <span className="histMuted">
                                            Criado: <b>{formatDateTimeBR(r?.DATA_CRIACAO)}</b>
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="histMuted" style={{ marginTop: 8 }}>
                                    Nenhum reembolso registrado.
                                  </p>
                                )}
                              </div>
                            </details>
                          </div>

                          <div className="histRight">
                            <button
                              type="button"
                              className={`histBtn ${canRequest ? "histBtnWarn" : ""}`}
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
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          ) : faturas.length === 0 ? (
            <div className="histState">
              Nenhuma fatura de assinatura encontrada.
              <div style={{ marginTop: 12 }}>
                <button className="histBtn" type="button" onClick={() => navigate("/app/planos-creditos")}>
                  Ver planos
                </button>
              </div>
            </div>
          ) : (
            <div className="histScroll">
              <ul className="histList" aria-label="Lista de faturas de assinatura">
                {faturas.map((f) => {
                  const id = f?.ID ?? "—";
                  const status = f?.STATUS;
                  const createdAt = f?.DATA_CRIACAO;

                  const stripeInvoiceId = f?.STRIPE_INVOICE_ID;
                  const valor = f?.VALOR;

                  const creditos = Number(f?.CREDITOS_CONCEDIDOS ?? 0);
                  const periodoIni = f?.PERIODO_INICIO;
                  const periodoFim = f?.PERIODO_FIM;

                  const solicitacao = f?.solicitacao_reembolso || f?.solicitacao_reembolso_assinatura || null;
                  const reembolso = f?.reembolso || f?.reembolso_assinatura || null;

                  const hasRefundRunningOrDone = reembolso && ["PENDENTE", "SUCESSO"].includes(upper(reembolso?.STATUS));
                  const isPaid = upper(status) === "PAGO" && !!createdAt;
                  const eligibleWindow = isPaid && within7Days(createdAt);
                  const hasRequest = !!solicitacao;
                  const canRequest = eligibleWindow && !hasRefundRunningOrDone && !hasRequest;

                  return (
                    <li key={String(stripeInvoiceId || id)} className="histItem">
                      <div className="histTopRow">
                        <div>
                          <div className="histTitleRow">
                            <StatusPill status={status} />
                            <span className="histId">Fatura #{id}</span>
                            {solicitacao?.STATUS ? <RequestPill status={solicitacao.STATUS} /> : null}
                          </div>

                          <div className="histEssGrid">
                            <div className="histEssBox">
                              <span className="histEssLabel">Valor pago</span>
                              <span className="histEssValue">{formatBRL(valor)}</span>
                            </div>
                            <div className="histEssBox">
                              <span className="histEssLabel">Data</span>
                              <span className="histEssValue">{createdAt ? formatDateTimeBR(createdAt) : "—"}</span>
                            </div>
                          </div>

                          <details className="histDetails">
                            <summary className="histSummary">Detalhar</summary>

                            <div className="histDetailBox">
                              <div className="histDetailGrid">
                                <div>
                                  <span className="histFieldLabel">Stripe Invoice</span>
                                  <span className="histFieldValue" title={stripeInvoiceId ? String(stripeInvoiceId) : ""}>
                                    {shortId(stripeInvoiceId, 14)}
                                  </span>
                                </div>
                                <div>
                                  <span className="histFieldLabel">Créditos</span>
                                  <span className="histFieldValue">{Number.isFinite(creditos) ? creditos : "—"}</span>
                                </div>
                                <div>
                                  <span className="histFieldLabel">Período</span>
                                  <span className="histFieldValue">
                                    {periodoIni ? formatDateBR(periodoIni) : "—"} → {periodoFim ? formatDateBR(periodoFim) : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="histFieldLabel">Status</span>
                                  <span className="histFieldValue">{status || "—"}</span>
                                </div>
                                <div>
                                  <span className="histFieldLabel">Criada em</span>
                                  <span className="histFieldValue">{formatDateTimeBR(createdAt)}</span>
                                </div>
                              </div>

                              <div className="histDivider" />

                              <p className="histMuted">
                                Solicitação: <b>{solicitacao?.STATUS ? solicitacao.STATUS : "Nenhuma"}</b>
                                {solicitacao?.DATA_CRIACAO ? ` • ${formatDateTimeBR(solicitacao.DATA_CRIACAO)}` : ""}
                              </p>

                              {solicitacao?.MOTIVO ? (
                                <p className="histMuted" style={{ marginTop: 8 }}>
                                  Motivo: <b>{String(solicitacao.MOTIVO)}</b>
                                </p>
                              ) : null}

                              <div className="histDivider" />

                              <p className="histMuted">
                                Reembolso: <b>{reembolso?.STATUS ? reembolso.STATUS : "Nenhum"}</b>
                              </p>

                              {reembolso ? (
                                <div className="histRefundCard" style={{ marginTop: 10 }}>
                                  <p className="histMuted" style={{ margin: 0 }}>
                                    Refund: <b>{shortId(reembolso?.STRIPE_REFUND_ID, 12)}</b> • Valor:{" "}
                                    <b>{formatBRL(reembolso?.VALOR)}</b> • Criado: <b>{formatDateTimeBR(reembolso?.DATA_CRIACAO)}</b>
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        </div>

                        <div className="histRight">
                          <button
                            type="button"
                            className={`histBtn ${canRequest ? "histBtnWarn" : ""}`}
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
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
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
