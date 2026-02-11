import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AdminProdutoPage.css";

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
  .toString()
  .replace(/\/+$/, "");

function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M11 5h2v14h-2V5Zm-6 6h14v2H5v-2Z" />
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
function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M9 16.2 4.8 12 3.4 13.4 9 19 21 7 19.6 5.6 9 16.2Z" />
    </svg>
  );
}
function IconX(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6 16.89 4.29l1.41 1.42Z"
      />
    </svg>
  );
}
function IconFilter(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M3 5h18v2l-7 7v5l-4 2v-7L3 7V5Z" />
    </svg>
  );
}

function upper(v) {
  return String(v || "").toUpperCase();
}
function tipoLabel(tipo) {
  const t = upper(tipo);
  if (t === "QU_MICO") return "QUÍMICO";
  if (t === "BIOL_GICO") return "BIOLÓGICO";
  return tipo || "—";
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

function SelectGlass({ value, onChange, children, ariaLabel }) {
  return (
    <div className="admSelectShell">
      <span className="admSelectIcon" aria-hidden="true">
        <IconFilter />
      </span>
      <select className="admSelect" value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
        {children}
      </select>
      <span className="admSelectCaret" aria-hidden="true" />
    </div>
  );
}

function Pill({ kind = "neutral", children }) {
  return <span className={`apPill is-${kind}`}>{children}</span>;
}

export default function AdminProdutosPage() {
  const [tab, setTab] = useState("produtos"); // produtos | solicitacoes

  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [errProdutos, setErrProdutos] = useState("");
  const [produtos, setProdutos] = useState([]);

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("ALL");
  const [demo, setDemo] = useState("ALL");

  const [produtoModal, setProdutoModal] = useState({
    open: false,
    mode: "create",
    current: null,
  });
  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState("QU_MICO");
  const [formDemo, setFormDemo] = useState(false);
  const [savingProduto, setSavingProduto] = useState(false);

  const [loadingSol, setLoadingSol] = useState(true);
  const [errSol, setErrSol] = useState("");
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [solActionLoading, setSolActionLoading] = useState(null);

  const produtosUrl = useMemo(() => {
    const url = new URL(`${API_BASE}/admin/api/produtos`);
    if (q.trim()) url.searchParams.set("q", q.trim());
    if (tipo !== "ALL") url.searchParams.set("tipo", tipo);
    if (demo !== "ALL") url.searchParams.set("demo", demo);
    return url.toString();
  }, [q, tipo, demo]);

  useEffect(() => {
    if (tab !== "produtos") return;

    let alive = true;
    const ctrl = new AbortController();

    async function load() {
      setLoadingProdutos(true);
      setErrProdutos("");

      try {
        const res = await fetch(produtosUrl, { credentials: "include", signal: ctrl.signal });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Não autenticado (admin).");
          throw new Error(`Erro HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.produtos) ? data.produtos : Array.isArray(data) ? data : [];
        if (!alive) return;
        setProdutos(list);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setProdutos([]);
        setErrProdutos(e?.message || "Erro ao carregar produtos.");
      } finally {
        if (!alive) return;
        setLoadingProdutos(false);
      }
    }

    load();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [tab, produtosUrl]);

  useEffect(() => {
    if (tab !== "solicitacoes") return;

    let alive = true;
    const ctrl = new AbortController();

    async function load() {
      setLoadingSol(true);
      setErrSol("");

      try {
        const res = await fetch(`${API_BASE}/admin/api/solicitacoes/adicao-produto?status=PENDENTE`, {
          credentials: "include",
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Não autenticado (admin).");
          throw new Error(`Erro HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.solicitacoes) ? data.solicitacoes : Array.isArray(data) ? data : [];
        if (!alive) return;
        setSolicitacoes(list);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setSolicitacoes([]);
        setErrSol(e?.message || "Erro ao carregar solicitações.");
      } finally {
        if (!alive) return;
        setLoadingSol(false);
      }
    }

    load();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [tab]);

  const openCreateProduto = () => {
    setFormNome("");
    setFormTipo("QU_MICO");
    setFormDemo(false);
    setProdutoModal({ open: true, mode: "create", current: null });
  };

  const openEditProduto = (p) => {
    setFormNome(String(p?.NOME || ""));
    setFormTipo(String(p?.TIPO || "QU_MICO"));
    setFormDemo(Boolean(p?.E_PARA_DEMO));
    setProdutoModal({ open: true, mode: "edit", current: p });
  };

  const closeProdutoModal = () => {
    if (savingProduto) return;
    setProdutoModal((m) => ({ ...m, open: false }));
  };

  const saveProduto = async () => {
    const nome = formNome.trim();
    if (!nome) return;

    setSavingProduto(true);
    try {
      const isEdit = produtoModal.mode === "edit";
      const payload = { nome, tipo: formTipo, eParaDemo: !!formDemo };

      const url = isEdit
        ? `${API_BASE}/admin/api/produtos/${produtoModal.current?.ID}`
        : `${API_BASE}/admin/api/produtos`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      if (isEdit) {
        setProdutos((prev) =>
          prev.map((p) =>
            p.ID === produtoModal.current?.ID ? { ...p, NOME: nome, TIPO: formTipo, E_PARA_DEMO: !!formDemo } : p
          )
        );
      } else {
        const created = data?.produto || data;
        if (created?.ID) setProdutos((prev) => [created, ...prev]);
      }

      setProdutoModal({ open: false, mode: "create", current: null });
    } catch (e) {
      alert(e?.message || "Erro ao salvar produto.");
    } finally {
      setSavingProduto(false);
    }
  };

  const aprovarSolicitacao = async (s) => {
    setSolActionLoading(s.ID);
    try {
      const payload = {
        idSolicitacao: s.ID,
        nome: s.NOME,
        tipo: s.TIPO,
        eParaDemo: false,
      };

      const res = await fetch(`${API_BASE}/admin/api/solicitacoes/adicao-produto/aprovar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      setSolicitacoes((prev) => prev.filter((x) => x.ID !== s.ID));
      if (data?.produto?.ID) setProdutos((prev) => [data.produto, ...prev]);
    } catch (e) {
      alert(e?.message || "Erro ao aprovar solicitação.");
    } finally {
      setSolActionLoading(null);
    }
  };

  const recusarSolicitacao = async (s) => {
    setSolActionLoading(s.ID);
    try {
      const payload = { idSolicitacao: s.ID };

      const res = await fetch(`${API_BASE}/admin/api/solicitacoes/adicao-produto/recusar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      setSolicitacoes((prev) => prev.filter((x) => x.ID !== s.ID));
    } catch (e) {
      alert(e?.message || "Erro ao recusar solicitação.");
    } finally {
      setSolActionLoading(null);
    }
  };

  return (
    <div className="analysisPage">
      <div className="pg-card apCard">
        <header className="apHeader">
          <div className="apHeaderLeft">
            <h1 className="apTitle">Produtos</h1>
          </div>

          <div className="apTabbar" role="tablist" aria-label="Abas">
            <button
              type="button"
              className={`apTab ${tab === "produtos" ? "is-active" : ""}`}
              onClick={() => setTab("produtos")}
              role="tab"
              aria-selected={tab === "produtos"}
            >
              Produtos
            </button>

            <button
              type="button"
              className={`apTab ${tab === "solicitacoes" ? "is-active" : ""}`}
              onClick={() => setTab("solicitacoes")}
              role="tab"
              aria-selected={tab === "solicitacoes"}
            >
              Solicitações de adição
              {solicitacoes.length > 0 ? <span className="apTabCount">{solicitacoes.length}</span> : null}
            </button>

            <span className={`apTabPill is-${tab}`} aria-hidden="true" />
          </div>
        </header>

        {tab === "produtos" ? (
          <>
            <section className="apToolbar">
              <div className="apSearch">
                <input
                  className="apInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar produto por nome..."
                />
              </div>

              <div className="apFilters">
                <div className="apFilter">
                  <span className="apFilterLabel">Tipo</span>
                  <SelectGlass value={tipo} onChange={setTipo} ariaLabel="Filtro tipo">
                    <option value="ALL">Todos</option>
                    <option value="QU_MICO">Químico</option>
                    <option value="BIOL_GICO">Biológico</option>
                  </SelectGlass>
                </div>

                <div className="apFilter">
                  <span className="apFilterLabel">Demo</span>
                  <SelectGlass value={demo} onChange={setDemo} ariaLabel="Filtro demo">
                    <option value="ALL">Todos</option>
                    <option value="DEMO">Somente demo</option>
                    <option value="NORMAL">Somente não-demo</option>
                  </SelectGlass>
                </div>

                <button type="button" className="apAddBtn" onClick={openCreateProduto}>
                  <IconPlus className="apAddIcon" aria-hidden="true" />
                  Adicionar
                </button>
              </div>
            </section>

            <section className="apBody">
              {loadingProdutos ? (
                <div className="apState">Carregando...</div>
              ) : errProdutos ? (
                <div className="apState is-error">{errProdutos}</div>
              ) : produtos.length === 0 ? (
                <div className="apState">Nenhum produto encontrado.</div>
              ) : (
                <ul className="apGrid" aria-label="Lista de produtos">
                  {produtos.map((p) => (
                    <li key={p.ID} className="apItem">
                      <div className="apItemTop">
                        <div className="apItemTitle">{p.NOME}</div>
                        <button type="button" className="apIconBtn" onClick={() => openEditProduto(p)} title="Editar">
                          <IconEdit className="apIcon" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="apItemMeta">
                        <Pill kind="neutral">{tipoLabel(p.TIPO)}</Pill>
                        {p.E_PARA_DEMO ? <Pill kind="pending">DEMO</Pill> : <Pill kind="ok">ATIVO</Pill>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="apToolbar apToolbar--sol">
              <div className="apHint">
                <span className="apHintTitle">Pendentes</span>
                <span className="apHintText">Aqui você aprova (criando o produto) ou recusa a solicitação do cliente.</span>
              </div>
            </section>

            <section className="apBody">
              {loadingSol ? (
                <div className="apState">Carregando...</div>
              ) : errSol ? (
                <div className="apState is-error">{errSol}</div>
              ) : solicitacoes.length === 0 ? (
                <div className="apState">Nenhuma solicitação pendente.</div>
              ) : (
                <ul className="apGrid" aria-label="Solicitações de adição de produto">
                  {solicitacoes.map((s) => {
                    const busy = solActionLoading === s.ID;
                    return (
                      <li key={s.ID} className="apItem apItem--sol">
                        <div className="apItemTop">
                          <div className="apItemTitle">{s.NOME}</div>
                          <Pill kind="neutral">{tipoLabel(s.TIPO)}</Pill>
                        </div>

                        <div className="apItemMeta">
                          {s?.cliente?.NOME ? <span className="apMetaText">Solicitado por: {s.cliente.NOME}</span> : null}
                        </div>

                        <div className="apActions">
                          <button
                            type="button"
                            className="apActionBtn is-approve"
                            onClick={() => aprovarSolicitacao(s)}
                            disabled={busy}
                          >
                            <IconCheck className="apActionIcon" aria-hidden="true" />
                            {busy ? "Processando..." : "Aprovar"}
                          </button>

                          <button
                            type="button"
                            className="apActionBtn is-reject"
                            onClick={() => recusarSolicitacao(s)}
                            disabled={busy}
                          >
                            <IconX className="apActionIcon" aria-hidden="true" />
                            {busy ? "Processando..." : "Recusar"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        <Modal
          open={produtoModal.open}
          title={produtoModal.mode === "edit" ? "Editar produto" : "Adicionar produto"}
          onClose={closeProdutoModal}
          disableClose={savingProduto}
          footer={
            <>
              <button className="cbBtnGhost" type="button" onClick={closeProdutoModal} disabled={savingProduto}>
                Cancelar
              </button>
              <button
                className="cbBtnPrimary"
                type="button"
                onClick={saveProduto}
                disabled={savingProduto || !formNome.trim()}
              >
                {savingProduto ? "Salvando..." : "Salvar"}
              </button>
            </>
          }
        >
          <div className="apModalForm">
            <div className="apModalRow">
              <label className="apModalLabel">Nome</label>
              <input
                className="apInput"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome do produto..."
                disabled={savingProduto}
              />
            </div>

            <div className="apModalGrid">
              <div className="apModalRow">
                <label className="apModalLabel">Tipo</label>
                <SelectGlass value={formTipo} onChange={setFormTipo} ariaLabel="Tipo do produto">
                  <option value="QU_MICO">Químico</option>
                  <option value="BIOL_GICO">Biológico</option>
                </SelectGlass>
              </div>

              <div className="apModalRow">
                <label className="apModalLabel">Demo</label>
                <label className="apToggle">
                  <input
                    type="checkbox"
                    checked={formDemo}
                    onChange={(e) => setFormDemo(e.target.checked)}
                    disabled={savingProduto}
                  />
                  <span className="apToggleUi" aria-hidden="true" />
                  <span className="apToggleText">{formDemo ? "Sim" : "Não"}</span>
                </label>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
