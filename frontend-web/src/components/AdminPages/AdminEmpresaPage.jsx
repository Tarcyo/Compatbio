import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AdminEmpresasPage.css";

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
  // validação simples: 14 dígitos (sem algoritmo de dígito verificador)
  return onlyDigits(v).length === 14;
}
function safeText(v) {
  return String(v ?? "").trim();
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

  const showImg = url && !broken;

  return (
    <div className="aeLogo">
      {showImg ? (
        <img
          src={url}
          alt={name ? `Logo ${name}` : "Logo"}
          onError={() => setBroken(true)}
          loading="lazy"
        />
      ) : (
        <span className="aeLogoFallback" aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  );
}

export default function AdminEmpresasPage() {
  // list
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [empresas, setEmpresas] = useState([]);

  // search
  const [q, setQ] = useState("");
  const debounceRef = useRef(null);

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

  // load list
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

  const onSearchInput = (v) => {
    setQ(v);
  };

  // abrir modal criar
  const openCreate = () => {
    setFormNome("");
    setFormCnpj("");
    setFormLogo("");
    setModal({ open: true, mode: "create", current: null });
  };

  // abrir modal editar
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
      const url = isEdit
        ? `${API_BASE}/admin/api/empresas/${modal.current?.ID}`
        : `${API_BASE}/admin/api/empresas`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          cnpj: cnpjFmt,
          imagemDaLogo: logo,
        }),
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

  // delete
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

  // debounce opcional (se quiser não buscar a cada tecla, descomente)
  useEffect(() => {
    // Mantém simples: o useMemo + useEffect já busca.
    // Se você quiser debounce real, faça aqui:
    // return () => clearTimeout(debounceRef.current);
    return undefined;
  }, [q]);

  return (
    <div className="analysisPage">
      <div className="pg-card aeCard">
        <header className="aeHeader">
          <div className="aeHeaderLeft">
            <h1 className="aeTitle">Empresas</h1>
            <p className="aeSubtitle">Cadastre empresas, edite dados e gerencie logos. Remoção segura com validações.</p>
          </div>

          <button type="button" className="aeAddBtn" onClick={openCreate}>
            <IconPlus className="aeAddIcon" aria-hidden="true" />
            Adicionar empresa
          </button>
        </header>

        <section className="aeToolbar">
          <div className="aeSearch">
            <span className="aeSearchIcon" aria-hidden="true">
              <IconSearch />
            </span>
            <input
              className="aeSearchInput"
              value={q}
              onChange={(e) => onSearchInput(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              autoComplete="off"
            />
          </div>

          <div className="aeStats" aria-label="Resumo">
            <span className="aeStat">
              <strong>{loading ? "—" : empresas.length}</strong>
              <span>empresas</span>
            </span>
          </div>
        </section>

        <section className="aeBody">
          {loading ? (
            <div className="aeState">Carregando...</div>
          ) : err ? (
            <div className="aeState is-error">{err}</div>
          ) : empresas.length === 0 ? (
            <div className="aeState">Nenhuma empresa encontrada.</div>
          ) : (
            <ul className="aeGrid" aria-label="Lista de empresas">
              {empresas.map((e) => {
                const clientesCount = e?._count?.cliente ?? e?.clientesCount ?? null;
                return (
                  <li key={e.ID} className="aeItem">
                    <div className="aeItemTop">
                      <LogoAvatar name={e.NOME} url={e.IMAGEM_DA_LOGO} />

                      <div className="aeItemMain">
                        <div className="aeItemName">{e.NOME}</div>
                        <div className="aeItemMeta">
                          <span className="aePill">
                            <span className="aePillK">CNPJ</span>
                            <span className="aePillV">{e.CNPJ || "—"}</span>
                          </span>

                          {clientesCount != null ? (
                            <span className="aePill is-green">
                              <span className="aePillK">Clientes</span>
                              <span className="aePillV">{clientesCount}</span>
                            </span>
                          ) : null}
                        </div>

                        {e.IMAGEM_DA_LOGO ? (
                          <div className="aeItemLink" title={e.IMAGEM_DA_LOGO}>
                            <IconLink className="aeLinkIcon" aria-hidden="true" />
                            <span className="aeLinkText">{e.IMAGEM_DA_LOGO}</span>
                          </div>
                        ) : (
                          <div className="aeItemHint">Sem logo cadastrada.</div>
                        )}
                      </div>

                      <div className="aeItemActions">
                        <button type="button" className="aeIconBtn" onClick={() => openEdit(e)} title="Editar">
                          <IconEdit className="aeIcon" aria-hidden="true" />
                        </button>

                        <button type="button" className="aeIconBtn is-danger" onClick={() => openDelete(e)} title="Remover">
                          <IconTrash className="aeIcon" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Modal Criar/Editar */}
        <Modal
          open={modal.open}
          title={modal.mode === "edit" ? "Editar empresa" : "Adicionar empresa"}
          onClose={closeModal}
          disableClose={saving}
          footer={
            <>
              <button className="cbBtnGhost" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button className="cbBtnPrimary" type="button" onClick={saveEmpresa} disabled={saving || !canSave}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          }
        >
          <div className="aeForm">
            <div className="aeRow">
              <label className="aeLabel">Nome</label>
              <input
                className="aeInput"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex.: CompatBio LTDA"
                disabled={saving}
              />
            </div>

            <div className="aeTwoCols">
              <div className="aeRow">
                <label className="aeLabel">CNPJ</label>
                <input
                  className="aeInput"
                  value={formCnpj}
                  onChange={(e) => setFormCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  disabled={saving}
                  inputMode="numeric"
                />
                {!formCnpj ? null : isValidCNPJ(formCnpj) ? (
                  <div className="aeHelp ok">CNPJ OK</div>
                ) : (
                  <div className="aeHelp bad">Informe 14 dígitos</div>
                )}
              </div>

              <div className="aeRow">
                <label className="aeLabel">Logo (URL opcional)</label>
                <input
                  className="aeInput"
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  placeholder="https://..."
                  disabled={saving}
                />
                <div className="aeHelp">Dica: use um link direto para imagem (png/jpg/webp).</div>
              </div>
            </div>

            <div className="aePreview">
              <div className="aePreviewTitle">Prévia</div>
              <div className="aePreviewCard">
                <LogoAvatar name={formNome || "Empresa"} url={safeText(formLogo)} />
                <div className="aePreviewInfo">
                  <div className="aePreviewName">{formNome || "Nome da empresa"}</div>
                  <div className="aePreviewCnpj">{formatCNPJ(formCnpj) || "CNPJ"}</div>
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
          disableClose={deleting}
          footer={
            <>
              <button className="cbBtnGhost" type="button" onClick={closeDelete} disabled={deleting}>
                Cancelar
              </button>
              <button className="cbBtnPrimary aeDangerBtn" type="button" onClick={deleteEmpresa} disabled={deleting}>
                {deleting ? "Removendo..." : "Remover"}
              </button>
            </>
          }
        >
          <div className="aeDeleteBox">
            <p className="aeDeleteText">
              Você tem certeza que deseja remover a empresa{" "}
              <strong>{deleteModal.current?.NOME || "—"}</strong>?
            </p>
            <p className="aeDeleteWarn">
              Se houver clientes vinculados, o backend deve bloquear (recomendado) e retornar erro.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}
