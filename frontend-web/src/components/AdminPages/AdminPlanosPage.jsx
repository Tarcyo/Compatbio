import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AdminPlanosPage.css";

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
  .toString()
  .replace(/\/+$/, "");

function safeText(v) {
  return String(v ?? "").trim();
}
function toInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}
function toPositiveInt(v) {
  const n = toInt(v);
  if (n == null || n <= 0) return null;
  return n;
}
function clampInt(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M11 5h2v14h-2V5Zm-6 6h14v2H5v-2Z" />
    </svg>
  );
}
function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M10 3a7 7 0 1 0 4.3 12.5l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
      />
    </svg>
  );
}
function IconEdit(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
      />
    </svg>
  );
}
function IconTrash(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M6 7h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Zm3-4h6l1 2h4v2H2V5h4l1-2Zm1 6h2v10h-2V9Zm4 0h2v10h-2V9Z"
      />
    </svg>
  );
}

function Modal({ open, title, children, footer, onClose, disableClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !disableClose) onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, disableClose]);

  if (!open) return null;

  const onOverlay = (e) => {
    if (disableClose) return;
    if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
  };

  return (
    <div className="cbModalOverlay" onMouseDown={onOverlay} role="dialog" aria-modal="true">
      <div className="cbModalPanel" ref={panelRef}>
        <div className="cbModalHeader">
          <h3 className="cbModalTitle">{title}</h3>
          <button
            className="cbModalClose"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            disabled={disableClose}
            title={disableClose ? "Aguarde..." : "Fechar"}
          >
            ×
          </button>
        </div>

        <div className="cbModalBody">{children}</div>
        {footer ? <div className="cbModalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function AdminPlanosPage() {
  // list
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [planos, setPlanos] = useState([]);

  // search
  const [q, setQ] = useState("");

  // modal create/edit
  const [modal, setModal] = useState({ open: false, mode: "create", current: null });
  const [saving, setSaving] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formStripeId, setFormStripeId] = useState("");
  const [formCreditos, setFormCreditos] = useState("100"); // QUANT_CREDITO_MENSAL
  const [formPrioridade, setFormPrioridade] = useState("3");

  // delete
  const [deleteModal, setDeleteModal] = useState({ open: false, current: null });
  const [deleting, setDeleting] = useState(false);

  const listUrl = useMemo(() => {
    const url = new URL(`${API_BASE}/admin/api/planos`);
    if (q.trim()) url.searchParams.set("q", q.trim());
    url.searchParams.set("take", "500");
    return url.toString();
  }, [q]);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(listUrl, { credentials: "include", signal: ctrl.signal });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Não autenticado (admin).");
          throw new Error(`Erro HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.planos) ? data.planos : Array.isArray(data) ? data : [];
        if (!alive) return;
        setPlanos(list);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setPlanos([]);
        setErr(e?.message || "Erro ao carregar planos.");
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
  }, [listUrl]);

  const openCreate = () => {
    setFormNome("");
    setFormStripeId("");
    setFormCreditos("100");
    setFormPrioridade("3");
    setModal({ open: true, mode: "create", current: null });
  };

  const openEdit = (p) => {
    setFormNome(String(p?.NOME || ""));
    setFormStripeId(String(p?.ID_STRIPE || ""));
    setFormCreditos(String(p?.QUANT_CREDITO_MENSAL ?? ""));
    setFormPrioridade(String(p?.PRIORIDADE ?? 3));
    setModal({ open: true, mode: "edit", current: p });
  };

  const closeModal = () => {
    if (saving) return;
    setModal((m) => ({ ...m, open: false }));
  };

  const canSave = useMemo(() => {
    const nome = safeText(formNome);
    const stripe = safeText(formStripeId);
    const cred = toPositiveInt(formCreditos);
    const prio = clampInt(toPositiveInt(formPrioridade), 3, 1, 999);
    return !!nome && !!stripe && cred != null && prio != null;
  }, [formNome, formStripeId, formCreditos, formPrioridade]);

  const savePlano = async () => {
    const nome = safeText(formNome);
    const stripeId = safeText(formStripeId);
    const creditos = toPositiveInt(formCreditos);
    const prioridade = clampInt(toPositiveInt(formPrioridade), 3, 1, 999);

    if (!nome) return alert("Informe o nome do plano.");
    if (!stripeId) return alert("Informe o ID do Stripe.");
    if (!creditos) return alert("Informe créditos mensais (inteiro > 0).");

    setSaving(true);
    try {
      const isEdit = modal.mode === "edit";
      const url = isEdit
        ? `${API_BASE}/admin/api/planos/${modal.current?.ID}`
        : `${API_BASE}/admin/api/planos`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          idStripe: stripeId,
          quantCreditoMensal: creditos,
          prioridade,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      const saved = data?.plano || data;

      if (isEdit) {
        setPlanos((prev) => prev.map((x) => (x.ID === modal.current?.ID ? { ...x, ...saved } : x)));
      } else {
        if (saved?.ID) setPlanos((prev) => [saved, ...prev]);
      }

      setModal({ open: false, mode: "create", current: null });
    } catch (e) {
      alert(e?.message || "Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (p) => setDeleteModal({ open: true, current: p });
  const closeDelete = () => {
    if (deleting) return;
    setDeleteModal({ open: false, current: null });
  };

  const deletePlano = async () => {
    const p = deleteModal.current;
    if (!p?.ID) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/api/planos/${p.ID}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      setPlanos((prev) => prev.filter((x) => x.ID !== p.ID));
      setDeleteModal({ open: false, current: null });
    } catch (e) {
      alert(e?.message || "Erro ao remover plano.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="analysisPage">
      <div className="pg-card apCard">
        <header className="apHeader">
          <div className="apHeaderLeft">
            <h1 className="apTitle">Planos</h1>
            <p className="apSubtitle">
              Crie, edite e remova planos. Ajuste créditos mensais e prioridade (menor = mais importante).
            </p>
          </div>

          <button type="button" className="apAddBtn" onClick={openCreate}>
            <IconPlus className="apAddIcon" aria-hidden="true" />
            Adicionar plano
          </button>
        </header>

        <section className="apToolbar">
          <div className="apSearch">
            <span className="apSearchIcon" aria-hidden="true">
              <IconSearch />
            </span>
            <input
              className="apSearchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou Stripe ID..."
              autoComplete="off"
            />
          </div>

          <div className="apStats" aria-label="Resumo">
            <span className="apStat">
              <strong>{loading ? "—" : planos.length}</strong>
              <span>planos</span>
            </span>
          </div>
        </section>

        <section className="apBody">
          {loading ? (
            <div className="apState">Carregando...</div>
          ) : err ? (
            <div className="apState is-error">{err}</div>
          ) : planos.length === 0 ? (
            <div className="apState">Nenhum plano encontrado.</div>
          ) : (
            <ul className="apGrid" aria-label="Lista de planos">
              {planos.map((p) => (
                <li key={p.ID} className="apItem">
                  <div className="apItemTop">
                    <div className="apItemMain">
                      <div className="apItemName">{p.NOME}</div>

                      <div className="apItemMeta">
                        <span className="apPill">
                          <span className="apPillK">Créditos/mês</span>
                          <span className="apPillV">{p.QUANT_CREDITO_MENSAL ?? "—"}</span>
                        </span>

                        <span className="apPill is-blue">
                          <span className="apPillK">Prioridade</span>
                          <span className="apPillV">{p.PRIORIDADE ?? 3}</span>
                        </span>

                        <span className="apPill is-green">
                          <span className="apPillK">Stripe</span>
                          <span className="apPillV">{p.ID_STRIPE || "—"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="apItemActions">
                      <button type="button" className="apIconBtn" onClick={() => openEdit(p)} title="Editar">
                        <IconEdit className="apIcon" aria-hidden="true" />
                      </button>
                      <button type="button" className="apIconBtn is-danger" onClick={() => openDelete(p)} title="Remover">
                        <IconTrash className="apIcon" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Modal Criar/Editar */}
        <Modal
          open={modal.open}
          title={modal.mode === "edit" ? "Editar plano" : "Adicionar plano"}
          onClose={closeModal}
          disableClose={saving}
          footer={
            <>
              <button className="cbBtnGhost" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button className="cbBtnPrimary" type="button" onClick={savePlano} disabled={saving || !canSave}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          }
        >
          <div className="apForm">
            <div className="apRow">
              <label className="apLabel">Nome do plano</label>
              <input
                className="apInput"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex.: Profissional"
                disabled={saving}
              />
            </div>

            <div className="apTwoCols">
              <div className="apRow">
                <label className="apLabel">Créditos mensais</label>
                <input
                  className="apInput"
                  value={formCreditos}
                  onChange={(e) => setFormCreditos(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Ex.: 500"
                  disabled={saving}
                  inputMode="numeric"
                />
                <div className="apHelp">
                  Deve ser um inteiro &gt; 0 (campo: <code>QUANT_CREDITO_MENSAL</code>).
                </div>
              </div>

              <div className="apRow">
                <label className="apLabel">Prioridade</label>
                <input
                  className="apInput"
                  value={formPrioridade}
                  onChange={(e) => setFormPrioridade(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="3"
                  disabled={saving}
                  inputMode="numeric"
                />
                <div className="apHelp">Menor número = maior prioridade (ex.: 1 é o topo).</div>
              </div>
            </div>

            <div className="apRow">
              <label className="apLabel">Stripe ID</label>
              <input
                className="apInput"
                value={formStripeId}
                onChange={(e) => setFormStripeId(e.target.value)}
                placeholder="Ex.: price_123... ou prod_..."
                disabled={saving}
              />
              <div className="apHelp">
                Campo único no banco (<code>ID_STRIPE</code>).
              </div>
            </div>

            <div className="apPreview">
              <div className="apPreviewTitle">Prévia</div>
              <div className="apPreviewCard">
                <div className="apPreviewName">{safeText(formNome) || "Nome do plano"}</div>
                <div className="apPreviewMeta">
                  <span>Créditos/mês: {toPositiveInt(formCreditos) ?? "—"}</span>
                  <span>Prioridade: {clampInt(toPositiveInt(formPrioridade), 3, 1, 999) ?? 3}</span>
                </div>
                <div className="apPreviewStripe">{safeText(formStripeId) || "Stripe ID"}</div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal Remover */}
        <Modal
          open={deleteModal.open}
          title="Remover plano"
          onClose={closeDelete}
          disableClose={deleting}
          footer={
            <>
              <button className="cbBtnGhost" type="button" onClick={closeDelete} disabled={deleting}>
                Cancelar
              </button>
              <button className="cbBtnPrimary apDangerBtn" type="button" onClick={deletePlano} disabled={deleting}>
                {deleting ? "Removendo..." : "Remover"}
              </button>
            </>
          }
        >
          <div className="apDeleteBox">
            <p className="apDeleteText">
              Você tem certeza que deseja remover o plano{" "}
              <strong>{deleteModal.current?.NOME || "—"}</strong>?
            </p>
            <p className="apDeleteWarn">
              Se existir assinatura vinculada, o backend deve bloquear (recomendado).
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}
