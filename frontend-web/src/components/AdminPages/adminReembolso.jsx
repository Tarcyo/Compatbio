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

function shortText(s, max = 120) {
  const t = String(s || "").trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

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

function TipoPill({ tipo }) {
  const t = upper(tipo);
  const klass = t === "ASSINATURA" ? "is-blue" : t === "CREDITO" ? "is-purple" : "is-neutral";
  const label = t === "ASSINATURA" ? "ASSINATURA" : t === "CREDITO" ? "CRÉDITO" : (tipo || "—");
  return <span className={`admPill ${klass}`}>{label}</span>;
}

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
    const credit = items.filter((x) => upper(x?.tipo) === "CREDITO").length;
    const assin = items.filter((x) => upper(x?.tipo) === "ASSINATURA").length;
    return { pending, credit, assin };
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

    // Preferir endpoints vindos do backend (evita colisão e mantém roteamento certo)
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

      if (modalMode === "aprovar") {
        setToast(
          isAssin
            ? "Solicitação aprovada! Refund iniciado e assinatura cancelada (Stripe + banco)."
            : "Solicitação aprovada! Refund iniciado e créditos estornados."
        );
      } else {
        setToast("Solicitação negada.");
      }

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
        ? "Isso fará reembolso no Stripe (invoice), cancelará a assinatura no Stripe e no banco, e poderá estornar os créditos concedidos (se houver e se o cliente tiver saldo suficiente). Deseja continuar?"
        : "Isso fará reembolso no Stripe, marcará a compra como CANCELADO e removerá os créditos do cliente (se houver saldo suficiente). Deseja continuar?";
    }
    return "Deseja negar esta solicitação?";
  }, [modalItem, modalMode]);

  return (
    <div className="pg-wrap">
      <section className="pg-card admCard">
        <header className="admHeader">
          <div className="admHeaderLeft">
            <h1 className="admTitle">Solicitações de Reembolso</h1>
            <p className="admSubtitle">Aprove ou negue reembolsos de créditos avulsos e de assinatura.</p>
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

                <span className="admTopPill">
                  <span className="admTopPillLabel">Crédito (pág.)</span>
                  <span className="admTopPillValue">{summary.credit}</span>
                </span>

                <span className="admTopPill">
                  <span className="admTopPillLabel">Assinatura (pág.)</span>
                  <span className="admTopPillValue">{summary.assin}</span>
                </span>
              </div>
            </div>

            <div className="admPagerMini">
              Página <b>{page}</b> de <b>{totalPages}</b>
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
                const isCredit = tipo === "CREDITO";

                const compra = it?.compra; // crédito
                const assinatura = it?.assinatura; // assinatura
                const cliente = it?.cliente;

                const isPending = upper(it?.STATUS) === "PENDENTE";

                const titleRight = isAssin
                  ? `Solicitação #${it?.ID} • Assinatura #${assinatura?.ID ?? "—"}`
                  : `Solicitação #${it?.ID} • Compra #${compra?.ID ?? "—"}`;

                const meta1Left = (
                  <>
                    <span>
                      Cliente: <b>{cliente?.NOME || "—"}</b> ({cliente?.EMAIL || "—"})
                    </span>
                    <span className="dot">•</span>
                    <span>
                      {isAssin ? (
                        <>
                          Créditos (fatura): <b>{it?.CREDITOS ?? "—"}</b>
                        </>
                      ) : (
                        <>
                          Créditos: <b>{it?.QUANTIDADE ?? "—"}</b>
                        </>
                      )}
                    </span>
                    <span className="dot">•</span>
                    <span>
                      Valor: <b>{formatBRL(it?.VALOR)}</b>
                    </span>
                    {isAssin ? (
                      <>
                        <span className="dot">•</span>
                        <span>
                          Invoice: <b>{it?.STRIPE_INVOICE_ID || "—"}</b>
                        </span>
                      </>
                    ) : null}
                  </>
                );

                const meta2Left = (
                  <>
                    {isCredit ? (
                      <>
                        <span>
                          Pago em: <b>{formatDateTimeBR(compra?.DATA_PAGAMENTO)}</b>
                        </span>
                        <span className="dot">•</span>
                      </>
                    ) : null}

                    <span>
                      Pedido em: <b>{formatDateTimeBR(it?.DATA_CRIACAO)}</b>
                    </span>
                    <span className="dot">•</span>
                    <span>
                      Atualizado em: <b>{formatDateTimeBR(it?.DATA_ATUALIZACAO)}</b>
                    </span>
                    <span className="dot">•</span>
                    <span>
                      Saldo atual: <b>{String(cliente?.SALDO ?? "—")}</b>
                    </span>
                  </>
                );

                const detailsBlock = isAssin ? (
                  <div className="admDetailGrid">
                    <div>
                      <span className="k">Stripe invoice</span>
                      <span className="v">{it?.STRIPE_INVOICE_ID || "—"}</span>
                    </div>
                    <div>
                      <span className="k">Status assinatura (DB)</span>
                      <span className="v">{assinatura?.STATUS || "—"}</span>
                    </div>
                    <div>
                      <span className="k">Stripe subscription</span>
                      <span className="v">{assinatura?.STRIPE_SUBSCRIPTION_ID || "—"}</span>
                    </div>
                    <div>
                      <span className="k">Créditos (fatura)</span>
                      <span className="v">{it?.CREDITOS ?? "—"}</span>
                    </div>
                    <div>
                      <span className="k">Valor (fatura)</span>
                      <span className="v">{formatBRL(it?.VALOR)}</span>
                    </div>
                    <div>
                      <span className="k">Tipo</span>
                      <span className="v">ASSINATURA</span>
                    </div>
                  </div>
                ) : (
                  <div className="admDetailGrid">
                    <div>
                      <span className="k">Stripe session</span>
                      <span className="v">{compra?.STRIPE_SESSION_ID || "—"}</span>
                    </div>
                    <div>
                      <span className="k">Status compra</span>
                      <span className="v">{compra?.STATUS || "—"}</span>
                    </div>
                    <div>
                      <span className="k">Total compra</span>
                      <span className="v">{formatBRL(compra?.VALOR_TOTAL)}</span>
                    </div>
                    <div>
                      <span className="k">Créditos compra</span>
                      <span className="v">{compra?.QUANTIDADE ?? "—"}</span>
                    </div>
                    <div>
                      <span className="k">Tipo</span>
                      <span className="v">CRÉDITO</span>
                    </div>
                  </div>
                );

                return (
                  <li key={String(it?.uid || `${it?.tipo || "X"}_${it?.ID}`)} className="admItem">
                    <div className="admItemTop">
                      <div className="admItemLeft">
                        <div className="admItemTitleRow">
                          <StatusPill status={it?.STATUS} />
                          <TipoPill tipo={it?.tipo} />
                          <span className="admItemTitle">{titleRight}</span>
                        </div>

                        <div className="admMeta">{meta1Left}</div>

                        <div className="admMeta">{meta2Left}</div>

                        <div className="admReason">
                          <span className="admReasonLabel">Motivo</span>
                          <p className="admReasonText">{shortText(it?.MOTIVO, 220)}</p>
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

                    <details className="admDetails">
                      <summary className="admSummary">Detalhes técnicos</summary>
                      <div className="admDetailBox">{detailsBlock}</div>
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
