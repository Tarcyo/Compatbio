import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AdminSolicitacaoPage.css";

function IconFilter(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M3 5h18v2l-7 7v5l-4 2v-7L3 7V5Z" />
    </svg>
  );
}

function IconAlert(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2 1 21h22L12 2Zm1 15h-2v2h2v-2Zm0-8h-2v6h2V9Z"
      />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M9.0 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  );
}

function upper(v) {
  return String(v || "").toUpperCase();
}

function Modal({ open, title, children, footer, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const onOverlay = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose?.();
    }
  };

  return (
    <div className="cbModalOverlay" onMouseDown={onOverlay} role="dialog" aria-modal="true">
      <div className="cbModalPanel" ref={panelRef}>
        <div className="cbModalHeader">
          <h3 className="cbModalTitle">{title}</h3>
          <button className="cbModalClose" type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="cbModalBody">{children}</div>

        {footer ? <div className="cbModalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div className="admFilter">
      <span className="admFilterLabel">{label}</span>

      <div className="admSelectShell">
        <span className="admSelectIcon" aria-hidden="true">
          <IconFilter />
        </span>

        <select className="admSelect" value={value} onChange={(e) => onChange(e.target.value)}>
          {children}
        </select>

        <span className="admSelectCaret" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Badge de status */
function StatusPill({ status }) {
  const s = upper(status);

  const klass =
    s === "PENDENTE"
      ? "is-pending"
      : s === "COMPATIVEL"
      ? "is-ok"
      : s === "INCOMPATIVEL"
      ? "is-bad"
      : s === "PARCIAL"
      ? "is-neutral"
      : "is-neutral";

  return <span className={`admStatus ${klass}`}>{status || "—"}</span>;
}

function getProdutoQuimicoNome(it) {
  return (
    it?.produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto?.NOME ||
    it?.produtoQuimico?.NOME ||
    it?.PRODUTO_QUIMICO_NOME ||
    "—"
  );
}

function getProdutoBiologicoNome(it) {
  return (
    it?.produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto?.NOME ||
    it?.produtoBiologico?.NOME ||
    it?.PRODUTO_BIOLOGICO_NOME ||
    "—"
  );
}

export default function AdminSolicitacoesPage() {
  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  const PAGE_SIZE = 100;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [items, setItems] = useState([]);

  const [modal, setModal] = useState({
    open: false,
    mode: "form", // form | success | error
    title: "",
    message: "",
    current: null,
  });

  const [replyStatus, setReplyStatus] = useState("COMPATIVEL");
  const [replyDesc, setReplyDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const endpoints = useMemo(() => {
    return {
      pendentes: `${API_BASE}/admin/api/solicitacoes/analise/pendentes`,
      concluidas: `${API_BASE}/admin/api/solicitacoes/analise/concluidas`,
    };
  }, [API_BASE]);

  async function fetchAllPages(baseUrl, { signal } = {}) {
    const all = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = new URL(baseUrl);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(url.toString(), { credentials: "include", signal });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autenticado (admin).");
        if (res.status === 404) throw new Error("Endpoint admin não implementado ainda.");
        throw new Error(`Erro HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.solicitacoes)
        ? data.solicitacoes
        : [];

      all.push(...list);

      if (typeof data?.totalPages === "number" && data.totalPages > 0) totalPages = data.totalPages;
      else totalPages = 1;

      page += 1;
      if (page > 500) break;
    }

    return all;
  }

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const sf = upper(statusFilter);
        let list = [];

        if (sf === "PENDENTE") {
          list = await fetchAllPages(endpoints.pendentes, { signal: ctrl.signal });
        } else if (sf === "ALL") {
          const [p, c] = await Promise.all([
            fetchAllPages(endpoints.pendentes, { signal: ctrl.signal }),
            fetchAllPages(endpoints.concluidas, { signal: ctrl.signal }),
          ]);
          list = [...p, ...c];
        } else {
          list = await fetchAllPages(endpoints.concluidas, { signal: ctrl.signal });
        }

        if (!alive) return;

        const sorted = list.slice().sort((a, b) => {
          const pa = Number.isFinite(Number(a?.PRIORIDADE)) ? Number(a.PRIORIDADE) : 999;
          const pb = Number.isFinite(Number(b?.PRIORIDADE)) ? Number(b.PRIORIDADE) : 999;
          if (pa !== pb) return pa - pb;
          return Number(b?.ID || 0) - Number(a?.ID || 0);
        });

        setItems(sorted);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setItems([]);
        setErr(e?.message || "Erro ao carregar solicitações.");
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
  }, [endpoints, statusFilter]);

  const visibleItems = useMemo(() => {
    let list = items;

    const sf = upper(statusFilter);

    if (sf !== "ALL" && sf !== "PENDENTE") {
      list = list.filter((it) => upper(it?.STATUS) === sf);
    }

    if (priorityFilter !== "ALL") {
      const p = Number(priorityFilter);
      if (Number.isFinite(p)) list = list.filter((it) => Number(it?.PRIORIDADE) === p);
    }

    return list;
  }, [items, statusFilter, priorityFilter]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      if (it?.STATUS) set.add(String(it.STATUS));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const openReply = (it) => {
    const currentStatus = upper(it?.STATUS);
    const defaultStatus =
      currentStatus && currentStatus !== "PENDENTE" ? currentStatus : "COMPATIVEL";

    setReplyStatus(defaultStatus);
    setReplyDesc(String(it?.DESCRICAO || ""));

    // ✅ mantém ID só no modal (ajuda a identificar), mas sem "#"
    setModal({
      open: true,
      mode: "form",
      title: `Responder solicitação ${it?.ID ?? "—"}`,
      message: "",
      current: it,
    });
  };

  const saveReply = async () => {
    const current = modal.current;
    if (!current?.ID) return;

    setIsSaving(true);
    try {
      const payload = {
        id: current.ID,
        status: replyStatus,
        descricao: replyDesc?.trim() ? replyDesc.trim() : null,
      };

      const res = await fetch(`${API_BASE}/admin/api/solicitacoes/analise/responder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      setItems((prev) =>
        prev.map((it) =>
          it.ID === current.ID
            ? {
                ...it,
                STATUS: replyStatus,
                DESCRICAO: replyDesc,
              }
            : it
        )
      );

      setModal({
        open: true,
        mode: "success",
        title: "Salvo!",
        message: "A solicitação foi atualizada com sucesso.",
        current: null,
      });
    } catch (e) {
      setModal({
        open: true,
        mode: "error",
        title: "Erro ao salvar",
        message: e?.message || "Não foi possível salvar agora. Tente novamente.",
        current: modal.current,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modalFooter = (() => {
    if (!modal.open) return null;

    if (modal.mode === "form") {
      return (
        <>
          <button className="cbBtnGhost" type="button" onClick={closeModal} disabled={isSaving}>
            Cancelar
          </button>
          <button className="cbBtnPrimary" type="button" onClick={saveReply} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </>
      );
    }

    return (
      <button className="cbBtnPrimary" type="button" onClick={closeModal}>
        Ok
      </button>
    );
  })();

  const modalIcon = (() => {
    if (modal.mode === "success") return <IconCheck className="cbModalIcon is-success" />;
    if (modal.mode === "error") return <IconAlert className="cbModalIcon is-error" />;
    return null;
  })();

  return (
    <div className="pg-wrap">
      <div className="analysisPage">
        <div className="pg-card admCard">
          <header className="admHeader">
            <div className="admHeaderLeft">
              <h1 className="admTitle">Solicitações de Análise</h1>
              <p className="admSubtitle">Veja e responda solicitações. Use filtros para encontrar rapidamente.</p>
            </div>

            <div className="admFilters" aria-label="Filtros">
              <FilterSelect label="Prioridade" value={priorityFilter} onChange={setPriorityFilter}>
                <option value="ALL">Todas</option>
                <option value="1">1 (alta)</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 (baixa)</option>
              </FilterSelect>

              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
                <option value="ALL">Todos</option>
                <option value="PENDENTE">PENDENTE</option>

                <option value="COMPATIVEL">COMPATÍVEL</option>
                <option value="INCOMPATIVEL">INCOMPATÍVEL</option>
                <option value="PARCIAL">PARCIAL</option>

                {uniqueStatuses
                  .filter(
                    (s) =>
                      !["PENDENTE", "COMPATIVEL", "INCOMPATIVEL", "PARCIAL"].includes(upper(s))
                  )
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </FilterSelect>
            </div>
          </header>

          <div className="admBody">
            {loading ? (
              <div className="admState">Carregando...</div>
            ) : err ? (
              <div className="admState is-error">{err}</div>
            ) : visibleItems.length === 0 ? (
              <div className="admState">Nenhuma solicitação encontrada.</div>
            ) : (
              <ul className="admCards" aria-label="Lista de solicitações">
                {visibleItems.map((it) => {
                  const id = it?.ID ?? "—";
                  const quimico = getProdutoQuimicoNome(it);
                  const biologico = getProdutoBiologicoNome(it);
                  const desc = (it?.DESCRICAO ?? "").toString().trim();

                  return (
                    <li key={String(id)} className="admCardItem">
                      <div className="admCardTop">
                        <div className="admCardLeft">
                          {/* ✅ Sem numeração (#) e sem prioridade */}
                          <div className="admCardTitleRow">
                            <StatusPill status={it?.STATUS} />
                          </div>

                          {/* Produtos em destaque */}
                          <div className="admProductLine" title={`${quimico} → ${biologico}`}>
                            <span className="admProductName">{quimico}</span>
                            <span className="admProductArrow" aria-hidden="true">
                              →
                            </span>
                            <span className="admProductName">{biologico}</span>
                          </div>
                        </div>

                        <div className="admCardRight">
                          <button type="button" className="admReplyBtn" onClick={() => openReply(it)}>
                            Responder
                          </button>
                        </div>
                      </div>

                      {desc ? (
                        <details className="admDetails">
                          <summary className="admSummary">Ver descrição</summary>
                          <p className="admDesc">{desc}</p>
                        </details>
                      ) : (
                        <p className="admDesc admDesc--empty">Sem descrição.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modal.open}
        title={modal.title}
        onClose={isSaving ? undefined : closeModal}
        footer={modalFooter}
      >
        {modal.mode === "form" ? (
          <div className="admModalForm">
            <div className="admModalRow">
              <label className="admModalLabel">Resultado</label>

              <div className="admSelectShell admSelectShell--modal">
                <span className="admSelectIcon" aria-hidden="true">
                  <IconFilter />
                </span>

                <select
                  className="admSelect"
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  disabled={isSaving}
                >
                  <option value="COMPATIVEL">COMPATÍVEL</option>
                  <option value="INCOMPATIVEL">INCOMPATÍVEL</option>
                  <option value="PARCIAL">PARCIAL</option>
                </select>

                <span className="admSelectCaret" aria-hidden="true" />
              </div>
            </div>

            <div className="admModalRow">
              <label className="admModalLabel">Descrição</label>
              <textarea
                className="admModalTextarea"
                value={replyDesc}
                onChange={(e) => setReplyDesc(e.target.value)}
                placeholder="Escreva a descrição da resposta..."
                rows={5}
                disabled={isSaving}
              />
            </div>
          </div>
        ) : (
          <div className="cbModalContent">
            {modalIcon}
            <p className="cbModalText">{modal.message}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
