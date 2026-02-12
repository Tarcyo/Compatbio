import React, { useEffect, useMemo, useState } from "react";
import "./AdminReembolsoPage.css";

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

/** ✅ key robusta (evita colisão) */
function getUniqueKey(it, index) {
  const uid = it?.uid || it?.UID || it?.uuid;
  if (uid) return `uid:${String(uid)}`;

  const id = it?.ID ?? it?.id;
  const tipo = upper(it?.tipo ?? it?.TIPO);
  const dt = it?.DATA_CRIACAO ?? it?.dataCriacao ?? it?.createdAt;
  if (id != null) return `id:${tipo}:${String(id)}:${String(dt ?? "")}`;

  const stripe = it?.STRIPE_INVOICE_ID || it?.stripeInvoiceId || it?.STRIPE_SESSION_ID || it?.stripeSessionId;
  if (stripe) return `stripe:${tipo}:${String(stripe)}`;

  return `fallback:${tipo}:${index}`;
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
  return <span className={`cbarf-pill ${klass}`}>{status || "—"}</span>;
}

function TipoPillStrong({ tipo }) {
  const t = upper(tipo);
  const klass = t === "ASSINATURA" ? "is-subscription" : t === "CREDITO" ? "is-credit" : "is-neutral";
  const label = t === "ASSINATURA" ? "ASSINATURA" : t === "CREDITO" ? "CRÉDITO" : tipo || "—";
  return <span className={`cbarf-pill ${klass}`}>{label}</span>;
}

/* ========= modal ========= */
function ConfirmModal({ open, title, desc, onClose, onConfirm, loading, error }) {
  if (!open) return null;

  return (
    <div
      className="cbarf-modalOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div className="cbarf-modalPanel" role="dialog" aria-modal="true" aria-labelledby="cbarf-modal-title">
        <div className="cbarf-modalHeader">
          <h3 id="cbarf-modal-title" className="cbarf-modalTitle">
            {title}
          </h3>

          <button className="cbarf-modalClose" onClick={onClose} disabled={loading} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="cbarf-modalBody">
          <p className="cbarf-modalDesc">{desc}</p>
          {error ? <div className="cbarf-modalError">{error}</div> : null}
        </div>

        <div className="cbarf-modalFooter">
          <button className="cbarf-btnGhostM" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="cbarf-btnPrimaryM" onClick={onConfirm} disabled={loading}>
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

  // ✅ trava scroll do body/html enquanto esta tela estiver montada
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const [status, setStatus] = useState("PENDENTE");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [toast, setToast] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("aprovar"); // aprovar | negar
  const [modalItem, setModalItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalErr, setModalErr] = useState("");

  // ✅ sem rodapé: buscamos mais itens e deixamos rolar dentro do card
  const pageSize = 60;

  async function load(st = status) {
    setLoading(true);
    setErr("");
    try {
      const url = new URL(`${API_BASE}/admin/api/reembolsos/solicitacoes`);
      if (st) url.searchParams.set("status", st);
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", String(pageSize));

      const res = await fetch(url.toString(), { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Erro ao carregar (${res.status})`);

      setItems(Array.isArray(json?.solicitacoes) ? json.solicitacoes : []);
      setTotal(Number(json?.total ?? 0) || 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setErr(e?.message || "Erro ao carregar solicitações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

    const endpointFromApi = modalMode === "aprovar" ? modalItem?.endpoints?.aprovar : modalItem?.endpoints?.negar;

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
      await load(status);
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
    <div className="cbarf-root">
      <div className="cbarf-page">
        <section className="cbarf-card">
          {/* header fixo */}
          <header className="cbarf-header">
            <div className="cbarf-headerLeft">
              <h1 className="cbarf-title">Solicitações de Reembolso</h1>
              <p className="cbarf-subtitle">No card: tipo, valor pago, data e status. O resto fica em “Detalhar”.</p>
            </div>

            <div className="cbarf-headerRight">
              <div className="cbarf-filters">
                <div className="cbarf-filter">
                  <span className="cbarf-filterLabel">Status</span>

                  <div className="cbarf-selectShell">
                    <select
                      className="cbarf-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Todos</option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="APROVADA">APROVADA</option>
                      <option value="NEGADA">NEGADA</option>
                      <option value="CANCELADA">CANCELADA</option>
                    </select>
                    <span className="cbarf-selectCaret" aria-hidden="true" />
                  </div>
                </div>

                <div className="cbarf-topPills" aria-label="Resumo">
                  <span className="cbarf-topPill">
                    <span className="cbarf-topPillLabel">Total</span>
                    <span className="cbarf-topPillValue">{loading ? "—" : total}</span>
                  </span>

                  <span className="cbarf-topPill is-yellow">
                    <span className="cbarf-topPillLabel">Pendentes (lista)</span>
                    <span className="cbarf-topPillValue">{loading ? "—" : summary.pending}</span>
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* ✅ scroll interno: a lista rola aqui */}
          <div className="cbarf-scroll">
            <div className="cbarf-body">
              {toast ? <div className="cbarf-toast">{toast}</div> : null}

              {loading ? (
                <div className="cbarf-state">Carregando...</div>
              ) : err ? (
                <div className="cbarf-state is-error">{err}</div>
              ) : items.length === 0 ? (
                <div className="cbarf-state">Nenhuma solicitação encontrada.</div>
              ) : (
                <ul className="cbarf-list" aria-label="Lista de solicitações">
                  {items.map((it, idx) => {
                    const tipo = upper(it?.tipo);
                    const isAssin = tipo === "ASSINATURA";
                    const isPending = upper(it?.STATUS) === "PENDENTE";

                    const compra = it?.compra;
                    const assinatura = it?.assinatura;
                    const cliente = it?.cliente;

                    const valorPago = formatBRL(it?.VALOR);
                    const dataCard = formatDateTimeBR(it?.DATA_CRIACAO);

                    const statusCompra = compra?.STATUS || "—";
                    const statusAssin = assinatura?.STATUS || "—";

                    return (
                      <li key={getUniqueKey(it, idx)} className="cbarf-item">
                        <div className="cbarf-itemTop">
                          <div className="cbarf-itemLeft">
                            <div className="cbarf-itemTitleRow">
                              <TipoPillStrong tipo={it?.tipo} />
                              <StatusPill status={it?.STATUS} />
                              <span className="cbarf-itemTitle">Solicitação #{it?.ID ?? "—"}</span>
                            </div>

                            <div className="cbarf-essentials">
                              <div className="cbarf-essCard">
                                <span className="cbarf-essK">Valor pago</span>
                                <span className="cbarf-essV">{valorPago}</span>
                              </div>
                              <div className="cbarf-essCard">
                                <span className="cbarf-essK">Data</span>
                                <span className="cbarf-essV">{dataCard}</span>
                              </div>
                              <div className="cbarf-essCard">
                                <span className="cbarf-essK">Status</span>
                                <span className="cbarf-essV">{it?.STATUS || "—"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="cbarf-itemRight">
                            <button
                              className="cbarf-btn cbarf-btnPrimary"
                              disabled={!isPending}
                              onClick={() => openModal("aprovar", it)}
                              title={!isPending ? "Apenas PENDENTE pode ser aprovada" : "Aprovar"}
                            >
                              Aprovar
                            </button>

                            <button
                              className="cbarf-btn cbarf-btnGhost"
                              disabled={!isPending}
                              onClick={() => openModal("negar", it)}
                              title={!isPending ? "Apenas PENDENTE pode ser negada" : "Negar"}
                            >
                              Negar
                            </button>
                          </div>
                        </div>

                        <details className="cbarf-details">
                          <summary className="cbarf-summary">Detalhar</summary>

                          <div className="cbarf-detailBox">
                            <div className="cbarf-detailGrid">
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
                                </>
                              )}
                            </div>

                            <div className="cbarf-reason">
                              <span className="cbarf-reasonLabel">Motivo</span>
                              <p className="cbarf-reasonText">{shortText(it?.MOTIVO, 220)}</p>
                            </div>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ✅ sem rodapé */}
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
    </div>
  );
}
