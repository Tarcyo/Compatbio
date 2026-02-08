import React, { useEffect, useMemo, useState } from "react";
import "./AdminReembolso.css";

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

function shortText(s, max = 220) {
  const t = String(s || "").trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

/* ========= pills ========= */
function StatusPill({ status }) {
  const s = upper(status);
  const klass =
    s === "PENDENTE"
      ? "is-pending"
      : s === "APROVADA"
      ? "is-ok"
      : s === "NEGADA"
      ? "is-bad"
      : "is-neutral";
  return <span className={`admPill ${klass}`}>{status || "—"}</span>;
}

function TipoPillStrong({ tipo }) {
  const t = upper(tipo);
  const klass = t === "ASSINATURA" ? "is-subscription" : t === "CREDITO" ? "is-credit" : "is-neutral";
  const label = t === "ASSINATURA" ? "ASSINATURA" : t === "CREDITO" ? "CRÉDITO" : (tipo || "—");
  return <span className={`admPill ${klass}`}>{label}</span>;
}

/* ========= modal ========= */
function ConfirmModal({ open, title, desc, onClose, onConfirm, loading, error }) {
  if (!open) return null;

  return (
    <div
      className="admModalOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div className="admModalCard" role="dialog" aria-modal="true" aria-labelledby="adm-modal-title">
        <div className="admModalHeader">
          <h3 id="adm-modal-title" className="admModalTitle">
            {title}
          </h3>
          <button className="admModalClose" onClick={onClose} disabled={loading} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="admModalBody">
          <p className="admModalDesc">{desc}</p>
          {error ? <div className="admModalError">{error}</div> : null}
        </div>

        <div className="admModalFooter">
          <button className="admBtnGhost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="admBtnPrimary" onClick={onConfirm} disabled={loading}>
            {loading ? "Processando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveEndpoint(API_BASE, pathOrUrl) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

export default function AdminRefundRequestsPage() {
  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000").toString().replace(/\/+$/, "");

  const [status, setStatus] = useState("PENDENTE");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [toast, setToast] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("aprovar"); // aprovar | negar
  const [modalItem, setModalItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalErr, setModalErr] = useState("");

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  async function load(p = page, st = status) {
    setLoading(true);
    setErr("");
    try {
      const url = new URL(`${API_BASE}/admin/api/reembolsos/solicitacoes`);
      if (st) url.searchParams.set("status", st);
      url.searchParams.set("page", String(p));
      url.searchParams.set("pageSize", String(pageSize));

      const res = await fetch(url.toString(), { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Erro ao carregar (${res.status})`);

      setItems(Array.isArray(json?.solicitacoes) ? json.solicitacoes : []);
      setTotal(Number(json?.total ?? 0) || 0);
      setTotalPages(Number(json?.totalPages ?? 1) || 1);
      setPage(Number(json?.page ?? p) || p);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setErr(e?.message || "Erro ao carregar solicitações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const summary = useMemo(() => {
    const pending = items.filter((x) => upper(x?.STATUS) === "PENDENTE").length;
    return { pending };
  }, [items]);

  function openModal(mode, item) {
    setModalMode(mode);
    setModalItem(item);
    setModalErr("");
    setModalOpen(true);
  }

  function closeModal() {
    if (modalLoading) return;
    setModalOpen(false);
    setModalItem(null);
    setModalErr("");
  }

  async function doApproveOrDeny() {
    if (!modalItem?.ID) return;
    setModalLoading(true);
    setModalErr("");

    const isAssin = upper(modalItem?.tipo) === "ASSINATURA";

    const endpointFromApi =
      modalMode === "aprovar" ? modalItem?.endpoints?.aprovar : modalItem?.endpoints?.negar;

    const fallback =
      modalMode === "aprovar"
        ? isAssin
          ? `/admin/api/reembolsos/solicitacoes/assinatura/${modalItem.ID}/aprovar`
          : `/admin/api/reembolsos/solicitacoes/${modalItem.ID}/aprovar`
        : isAssin
        ? `/admin/api/reembolsos/solicitacoes/assinatura/${modalItem.ID}/negar`
        : `/admin/api/reembolsos/solicitacoes/${modalItem.ID}/negar`;

    const endpoint = resolveEndpoint(API_BASE, endpointFromApi || fallback);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Falha (${res.status})`);

      setToast(modalMode === "aprovar" ? "Solicitação aprovada!" : "Solicitação negada.");
      closeModal();
      await load(page, status);
    } catch (e) {
      setModalErr(e?.message || "Erro ao processar.");
    } finally {
      setModalLoading(false);
    }
  }

  const modalTitle = modalMode === "aprovar" ? "Aprovar solicitação" : "Negar solicitação";

  const modalDesc = useMemo(() => {
    const isAssin = upper(modalItem?.tipo) === "ASSINATURA";
    if (modalMode === "aprovar") {
      return isAssin
        ? "Aprovar vai iniciar o reembolso no Stripe e cancelar a assinatura. Deseja continuar?"
        : "Aprovar vai iniciar o reembolso no Stripe e estornar créditos (se aplicável). Deseja continuar?";
    }
    return "Deseja negar esta solicitação?";
  }, [modalItem, modalMode]);

  return (
    <div className="pg-wrap">
      <section className="pg-card admCard">
        <header className="admHeader">
          <div className="admHeaderLeft">
            <h1 className="admTitle">Solicitações de Reembolso</h1>
            <p className="admSubtitle">No card: tipo, valor pago, data e status. O resto fica em “Detalhar”.</p>
          </div>

          <div className="admHeaderRight">
            <div className="admFilters">
              <label className="admFilter">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
                  <option value="">Todos</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="APROVADA">APROVADA</option>
                  <option value="NEGADA">NEGADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </label>

              <div className="admPillsRow">
                <span className="admTopPill">
                  <span className="admTopPillLabel">Total</span>
                  <span className="admTopPillValue">{total}</span>
                </span>

                <span className="admTopPill is-yellow">
                  <span className="admTopPillLabel">Pendentes (pág.)</span>
                  <span className="admTopPillValue">{summary.pending}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="admBody">
          {toast ? <div className="admToast">{toast}</div> : null}

          {loading ? (
            <div className="admState">Carregando...</div>
          ) : err ? (
            <div className="admState is-error">{err}</div>
          ) : items.length === 0 ? (
            <div className="admState">Nenhuma solicitação encontrada.</div>
          ) : (
            <ul className="admList">
              {items.map((it) => {
                const tipo = upper(it?.tipo);
                const isAssin = tipo === "ASSINATURA";
                const isPending = upper(it?.STATUS) === "PENDENTE";

                const compra = it?.compra;
                const assinatura = it?.assinatura;
                const cliente = it?.cliente;

                // ✅ no card: só valor pago, data, status
                const valorPago = formatBRL(it?.VALOR);
                const dataCard = formatDateTimeBR(it?.DATA_CRIACAO);

                // ✅ status da compra (se existir) / assinatura (se existir) cai no "Detalhar"
                const statusCompra = compra?.STATUS || "—";
                const statusAssin = assinatura?.STATUS || "—";

                // blocos do detalhar: TODO o resto
                const detailMainGrid = (
                  <div className="admDetailGrid">
                    <div>
                      <span className="k">Cliente</span>
                      <span className="v">{cliente?.NOME || "—"}</span>
                    </div>
                    <div>
                      <span className="k">Email</span>
                      <span className="v">{cliente?.EMAIL || "—"}</span>
                    </div>

                    <div>
                      <span className="k">Saldo atual</span>
                      <span className="v">{String(cliente?.SALDO ?? "—")}</span>
                    </div>
                    <div>
                      <span className="k">Atualizada em</span>
                      <span className="v">{formatDateTimeBR(it?.DATA_ATUALIZACAO)}</span>
                    </div>

                    <div>
                      <span className="k">Solicitação ID</span>
                      <span className="v">{String(it?.ID ?? "—")}</span>
                    </div>
                    <div>
                      <span className="k">Tipo</span>
                      <span className="v">{isAssin ? "ASSINATURA" : "CRÉDITO"}</span>
                    </div>

                    {isAssin ? (
                      <>
                        <div>
                          <span className="k">Assinatura ID (DB)</span>
                          <span className="v">{String(assinatura?.ID ?? "—")}</span>
                        </div>
                        <div>
                          <span className="k">Status assinatura (DB)</span>
                          <span className="v">{statusAssin}</span>
                        </div>
                        <div>
                          <span className="k">Stripe invoice</span>
                          <span className="v">{it?.STRIPE_INVOICE_ID || "—"}</span>
                        </div>
                        <div>
                          <span className="k">Stripe subscription</span>
                          <span className="v">{assinatura?.STRIPE_SUBSCRIPTION_ID || "—"}</span>
                        </div>
                        <div>
                          <span className="k">Créditos (fatura)</span>
                          <span className="v">{String(it?.CREDITOS ?? "—")}</span>
                        </div>
                        <div>
                          <span className="k">Valor (fatura)</span>
                          <span className="v">{formatBRL(it?.VALOR)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="k">Compra ID (DB)</span>
                          <span className="v">{String(compra?.ID ?? "—")}</span>
                        </div>
                        <div>
                          <span className="k">Status compra</span>
                          <span className="v">{statusCompra}</span>
                        </div>
                        <div>
                          <span className="k">Stripe session</span>
                          <span className="v">{compra?.STRIPE_SESSION_ID || "—"}</span>
                        </div>
                        <div>
                          <span className="k">Pago em</span>
                          <span className="v">{formatDateTimeBR(compra?.DATA_PAGAMENTO)}</span>
                        </div>
                        <div>
                          <span className="k">Créditos compra</span>
                          <span className="v">{String(compra?.QUANTIDADE ?? it?.QUANTIDADE ?? "—")}</span>
                        </div>
                        <div>
                          <span className="k">Total compra</span>
                          <span className="v">{formatBRL(compra?.VALOR_TOTAL)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );

                return (
                  <li key={String(it?.uid || `${it?.tipo || "X"}_${it?.ID}`)} className="admItem">
                    <div className="admItemTop">
                      <div className="admItemLeft">
                        <div className="admItemTitleRow">
                          {/* ✅ indicativo visual forte do tipo */}
                          <TipoPillStrong tipo={it?.tipo} />
                          {/* ✅ status também visível */}
                          <StatusPill status={it?.STATUS} />
                          <span className="admItemTitle">Solicitação #{it?.ID ?? "—"}</span>
                        </div>

                        {/* ✅ SÓ ESSENCIAL NO CARD */}
                        <div className="admEssentials">
                          <div className="admEssCard">
                            <span className="admEssK">Valor pago</span>
                            <span className="admEssV">{valorPago}</span>
                          </div>
                          <div className="admEssCard">
                            <span className="admEssK">Data</span>
                            <span className="admEssV">{dataCard}</span>
                          </div>
                          <div className="admEssCard">
                            <span className="admEssK">Status</span>
                            <span className="admEssV">{it?.STATUS || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="admItemRight">
                        <button
                          className="admBtnPrimary"
                          disabled={!isPending}
                          onClick={() => openModal("aprovar", it)}
                          title={!isPending ? "Apenas PENDENTE pode ser aprovada" : "Aprovar"}
                        >
                          Aprovar
                        </button>

                        <button
                          className="admBtnGhost"
                          disabled={!isPending}
                          onClick={() => openModal("negar", it)}
                          title={!isPending ? "Apenas PENDENTE pode ser negada" : "Negar"}
                        >
                          Negar
                        </button>
                      </div>
                    </div>

                    {/* ✅ TODO O RESTO AQUI */}
                    <details className="admDetails">
                      <summary className="admSummary">Detalhar</summary>
                      <div className="admDetailBox">
                        <div className="admDetailSection">
                          {detailMainGrid}

                          <div className="admReason">
                            <span className="admReasonLabel">Motivo</span>
                            <p className="admReasonText">{shortText(it?.MOTIVO, 220)}</p>
                          </div>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="admPager">
            <button className="admBtnGhost" onClick={() => setPage(1)} disabled={!canPrev}>
              « Primeira
            </button>
            <button className="admBtnGhost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
              ‹ Anterior
            </button>
            <span className="admPagerCenter">
              Página <b>{page}</b> de <b>{totalPages}</b>
            </span>
            <button
              className="admBtnGhost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canNext}
            >
              Próxima ›
            </button>
            <button className="admBtnGhost" onClick={() => setPage(totalPages)} disabled={!canNext}>
              Última »
            </button>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={modalOpen}
        title={modalTitle}
        desc={modalDesc}
        onClose={closeModal}
        onConfirm={doApproveOrDeny}
        loading={modalLoading}
        error={modalErr}
      />
    </div>
  );
}
