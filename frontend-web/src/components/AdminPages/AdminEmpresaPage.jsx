import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AdminEmpresasPage.compat.css";

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
  .toString()
  .replace(/\/+$/, "");

// --------------------
// Utils CNPJ
// --------------------
function onlyDigits(v) {
  return String(v ?? "").replace(/\D+/g, "");
}
function formatCNPJ(v) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}
function isValidCNPJ(v) {
  return onlyDigits(v).length === 14;
}
function safeText(v) {
  return String(v ?? "").trim();
}

// --------------------
// Icons
// --------------------
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
        d="M10 2a8 8 0 1 1 5.293 14.01l4.348 4.349-1.414 1.414-4.349-4.348A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z"
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
function IconLink(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M10.6 13.4a1 1 0 0 1 0-1.4l3.2-3.2a3 3 0 0 1 4.2 4.2l-2.4 2.4a3 3 0 0 1-4.2 0 1 1 0 1 1 1.4-1.4 1 1 0 0 0 1.4 0l2.4-2.4a1 1 0 0 0-1.4-1.4l-3.2 3.2a1 1 0 0 1-1.4 0ZM13.4 10.6a1 1 0 0 1 0 1.4l-3.2 3.2a3 3 0 0 1-4.2-4.2l2.4-2.4a3 3 0 0 1 4.2 0 1 1 0 1 1-1.4 1.4 1 1 0 0 0-1.4 0L7.4 12a1 1 0 0 0 1.4 1.4l3.2-3.2a1 1 0 0 1 1.4 0Z"
      />
    </svg>
  );
}

// --------------------
// Modal (isolado)
/// --------------------
function Modal({ open, title, children, footer, onClose, busy }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  const onOverlay = (e) => {
    if (busy) return;
    if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
  };

  return (
    <div className="cbaemp-modalOverlay" onMouseDown={onOverlay} role="dialog" aria-modal="true">
      <div className="cbaemp-modalPanel" ref={panelRef}>
        <div className="cbaemp-modalHeader">
          <h3 className="cbaemp-modalTitle">{title}</h3>
          <button
            className="cbaemp-modalClose"
            type="button"
            onClick={busy ? undefined : onClose}
            aria-label="Fechar"
            disabled={busy}
            title={busy ? "Aguarde..." : "Fechar"}
          >
            ×
          </button>
        </div>

        <div className="cbaemp-modalBody">{children}</div>
        {footer ? <div className="cbaemp-modalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

// --------------------
// Logo Avatar (isolado)
// --------------------
function LogoAvatar({ name, url }) {
  const [broken, setBroken] = useState(false);

  const initials = useMemo(() => {
    const n = safeText(name);
    if (!n) return "E";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "E";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [name]);

  const showImg = !!url && !broken;

  return (
    <div className="cbaemp-logo">
      {showImg ? (
        <img src={url} alt={name ? `Logo ${name}` : "Logo"} onError={() => setBroken(true)} loading="lazy" />
      ) : (
        <span className="cbaemp-logoFallback" aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  );
}

export default function AdminEmpresasPage() {
  // ✅ trava scroll global (scroll só no card)
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

  // list
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [empresas, setEmpresas] = useState([]);

  // search
  const [q, setQ] = useState("");

  // modal create/edit
  const [modal, setModal] = useState({ open: false, mode: "create", current: null });
  const [saving, setSaving] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formLogo, setFormLogo] = useState("");

  // delete confirm
  const [deleteModal, setDeleteModal] = useState({ open: false, current: null });
  const [deleting, setDeleting] = useState(false);

  const listUrl = useMemo(() => {
    const url = new URL(`${API_BASE}/admin/api/empresas`);
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
        const list = Array.isArray(data?.empresas) ? data.empresas : Array.isArray(data) ? data : [];
        if (!alive) return;
        setEmpresas(list);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setEmpresas([]);
        setErr(e?.message || "Erro ao carregar empresas.");
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
    setFormCnpj("");
    setFormLogo("");
    setModal({ open: true, mode: "create", current: null });
  };

  const openEdit = (e) => {
    setFormNome(String(e?.NOME || ""));
    setFormCnpj(formatCNPJ(e?.CNPJ || ""));
    setFormLogo(String(e?.IMAGEM_DA_LOGO || ""));
    setModal({ open: true, mode: "edit", current: e });
  };

  const closeModal = () => {
    if (saving) return;
    setModal((m) => ({ ...m, open: false }));
  };

  const canSave = useMemo(() => {
    const nome = safeText(formNome);
    const cnpjOk = isValidCNPJ(formCnpj);
    return !!nome && cnpjOk;
  }, [formNome, formCnpj]);

  const saveEmpresa = async () => {
    const nome = safeText(formNome);
    const cnpjFmt = formatCNPJ(formCnpj);
    const logo = safeText(formLogo) || null;

    if (!nome) return alert("Informe o nome.");
    if (!isValidCNPJ(cnpjFmt)) return alert("CNPJ inválido. Informe 14 dígitos.");

    setSaving(true);
    try {
      const isEdit = modal.mode === "edit";
      const url = isEdit ? `${API_BASE}/admin/api/empresas/${modal.current?.ID}` : `${API_BASE}/admin/api/empresas`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cnpj: cnpjFmt, imagemDaLogo: logo }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      const saved = data?.empresa || data;

      if (isEdit) {
        setEmpresas((prev) => prev.map((x) => (x.ID === modal.current?.ID ? { ...x, ...saved } : x)));
      } else {
        if (saved?.ID) setEmpresas((prev) => [saved, ...prev]);
      }

      setModal({ open: false, mode: "create", current: null });
    } catch (e) {
      alert(e?.message || "Erro ao salvar empresa.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (e) => setDeleteModal({ open: true, current: e });
  const closeDelete = () => {
    if (deleting) return;
    setDeleteModal({ open: false, current: null });
  };

  const deleteEmpresa = async () => {
    const e = deleteModal.current;
    if (!e?.ID) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/api/empresas/${e.ID}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      setEmpresas((prev) => prev.filter((x) => x.ID !== e.ID));
      setDeleteModal({ open: false, current: null });
    } catch (err) {
      alert(err?.message || "Erro ao remover empresa.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="cbaemp-root">
      <div className="cbaemp-card">
        {/* Header fixo */}
        <header className="cbaemp-header">
          <div className="cbaemp-headerLeft">
            <h1 className="cbaemp-title">Empresas</h1>
            <p className="cbaemp-subtitle">
              Cadastre empresas, edite dados e gerencie logos. Remoção segura com validações.
            </p>
          </div>

          <button type="button" className="cbaemp-addBtn" onClick={openCreate}>
            <IconPlus className="cbaemp-addIcon" aria-hidden="true" />
            Adicionar empresa
          </button>
        </header>

        {/* Toolbar fixa */}
        <section className="cbaemp-toolbar">
          <div className="cbaemp-search">
            <span className="cbaemp-searchIcon" aria-hidden="true">
              <IconSearch />
            </span>
            <input
              className="cbaemp-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              autoComplete="off"
              aria-label="Buscar por nome ou CNPJ"
            />
          </div>

          <div className="cbaemp-stats" aria-label="Resumo">
            <span className="cbaemp-stat">
              <strong>{loading ? "—" : empresas.length}</strong>
              <span>EMPRESAS</span>
            </span>
          </div>
        </section>

        {/* Scroll só no corpo */}
        <div className="cbaemp-scroll">
          <section className="cbaemp-body">
            {loading ? (
              <div className="cbaemp-state">Carregando...</div>
            ) : err ? (
              <div className="cbaemp-state is-error">{err}</div>
            ) : empresas.length === 0 ? (
              <div className="cbaemp-state">Nenhuma empresa encontrada.</div>
            ) : (
              <ul className="cbaemp-grid" aria-label="Lista de empresas">
                {empresas.map((e, idx) => {
                  const clientesCount = e?._count?.cliente ?? e?.clientesCount ?? null;
                  const key = e?.ID != null ? `cbaemp-emp-${e.ID}` : `cbaemp-emp-fallback-${idx}-${e?.NOME || "x"}`;

                  return (
                    <li key={key} className="cbaemp-item">
                      <div className="cbaemp-itemTop">
                        <LogoAvatar name={e.NOME} url={e.IMAGEM_DA_LOGO} />

                        <div className="cbaemp-itemMain">
                          <div className="cbaemp-itemName" title={e.NOME}>
                            {e.NOME}
                          </div>

                          <div className="cbaemp-itemMeta">
                            <span className="cbaemp-pill">
                              <span className="cbaemp-pillK">CNPJ</span>
                              <span className="cbaemp-pillV">{formatCNPJ(e.CNPJ) || "—"}</span>
                            </span>

                            {clientesCount != null ? (
                              <span className="cbaemp-pill is-green">
                                <span className="cbaemp-pillK">CLIENTES</span>
                                <span className="cbaemp-pillV">{clientesCount}</span>
                              </span>
                            ) : null}
                          </div>

                          {e.IMAGEM_DA_LOGO ? (
                            <div className="cbaemp-link" title={e.IMAGEM_DA_LOGO}>
                              <IconLink className="cbaemp-linkIcon" aria-hidden="true" />
                              <span className="cbaemp-linkText">{e.IMAGEM_DA_LOGO}</span>
                            </div>
                          ) : (
                            <div className="cbaemp-hint">Sem logo cadastrada.</div>
                          )}
                        </div>

                        <div className="cbaemp-actions">
                          <button
                            type="button"
                            className="cbaemp-iconBtn"
                            onClick={() => openEdit(e)}
                            title="Editar"
                            aria-label="Editar empresa"
                          >
                            <IconEdit className="cbaemp-icon" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="cbaemp-iconBtn is-danger"
                            onClick={() => openDelete(e)}
                            title="Remover"
                            aria-label="Remover empresa"
                          >
                            <IconTrash className="cbaemp-icon" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Modal Criar/Editar */}
        <Modal
          open={modal.open}
          title={modal.mode === "edit" ? "Editar empresa" : "Adicionar empresa"}
          onClose={closeModal}
          busy={saving}
          footer={
            <>
              <button className="cbaemp-btnGhost" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button className="cbaemp-btnPrimary" type="button" onClick={saveEmpresa} disabled={saving || !canSave}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          }
        >
          <div className="cbaemp-form">
            <div className="cbaemp-row">
              <label className="cbaemp-label">Nome</label>
              <input
                className="cbaemp-field"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex.: CompatBio LTDA"
                disabled={saving}
              />
            </div>

            <div className="cbaemp-twoCols">
              <div className="cbaemp-row">
                <label className="cbaemp-label">CNPJ</label>
                <input
                  className="cbaemp-field"
                  value={formCnpj}
                  onChange={(e) => setFormCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  disabled={saving}
                  inputMode="numeric"
                />
                {!formCnpj ? null : isValidCNPJ(formCnpj) ? (
                  <div className="cbaemp-help is-ok">CNPJ OK</div>
                ) : (
                  <div className="cbaemp-help is-bad">Informe 14 dígitos</div>
                )}
              </div>

              <div className="cbaemp-row">
                <label className="cbaemp-label">Logo (URL opcional)</label>
                <input
                  className="cbaemp-field"
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  placeholder="https://..."
                  disabled={saving}
                />
                <div className="cbaemp-help">Dica: use um link direto para imagem (png/jpg/webp).</div>
              </div>
            </div>

            <div className="cbaemp-preview">
              <div className="cbaemp-previewTitle">Prévia</div>
              <div className="cbaemp-previewCard">
                <LogoAvatar name={formNome || "Empresa"} url={safeText(formLogo)} />
                <div className="cbaemp-previewInfo">
                  <div className="cbaemp-previewName">{formNome || "Nome da empresa"}</div>
                  <div className="cbaemp-previewCnpj">{formatCNPJ(formCnpj) || "CNPJ"}</div>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal Remover */}
        <Modal
          open={deleteModal.open}
          title="Remover empresa"
          onClose={closeDelete}
          busy={deleting}
          footer={
            <>
              <button className="cbaemp-btnGhost" type="button" onClick={closeDelete} disabled={deleting}>
                Cancelar
              </button>
              <button className="cbaemp-btnDanger" type="button" onClick={deleteEmpresa} disabled={deleting}>
                {deleting ? "Removendo..." : "Remover"}
              </button>
            </>
          }
        >
          <div className="cbaemp-deleteBox">
            <p className="cbaemp-deleteText">
              Você tem certeza que deseja remover a empresa <strong>{deleteModal.current?.NOME || "—"}</strong>?
            </p>
            <p className="cbaemp-deleteWarn">
              Se houver clientes vinculados, o backend deve bloquear (recomendado) e retornar erro.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}
