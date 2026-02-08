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
      : s === "EM_ANALISE"
      ? "is-progress"
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
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // ✅ default = Todos

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
  const [isMarking, setIsMarking] = useState(false);

  const isBusy = isSaving || isMarking;

  // ✅ Estado da verificação no catálogo
  const [catalog, setCatalog] = useState({
    loading: false,
    found: false,
    resultado: null,
    error: "",
    bioNome: "",
    quimNome: "",
  });

  // evita "race" de setState quando abre/fecha rápido
  const catalogReqIdRef = useRef(0);

  const closeModal = () => {
    // invalida requisições em andamento
    catalogReqIdRef.current += 1;
    setCatalog({
      loading: false,
      found: false,
      resultado: null,
      error: "",
      bioNome: "",
      quimNome: "",
    });
    setModal((m) => ({ ...m, open: false }));
  };

  const endpoints = useMemo(() => {
    return {
      pendentes: `${API_BASE}/admin/api/solicitacoes/analise/pendentes`,
      concluidas: `${API_BASE}/admin/api/solicitacoes/analise/concluidas`,
      catalogo: `${API_BASE}/admin/api/resultado-catalogado`,
      marcarEmAnalise: `${API_BASE}/admin/api/solicitacoes/analise/marcar-em-analise`, // ✅ NOVO
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
          // concluidas traz tudo que NÃO é pendente (inclui EM_ANALISE)
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

  // ✅ Prioridades existentes nas solicitações atuais (dinâmico)
  const uniquePriorities = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const p = Number(it?.PRIORIDADE);
      if (Number.isFinite(p)) set.add(p);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [items]);

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

  async function checkCatalogForCurrent(it) {
    const quimico = getProdutoQuimicoNome(it);
    const biologico = getProdutoBiologicoNome(it);

    // se não tiver nomes válidos, não consulta
    if (!quimico || !biologico || quimico === "—" || biologico === "—") {
      setCatalog({
        loading: false,
        found: false,
        resultado: null,
        error: "",
        bioNome: biologico || "",
        quimNome: quimico || "",
      });
      return;
    }

    const reqId = (catalogReqIdRef.current += 1);

    setCatalog({
      loading: true,
      found: false,
      resultado: null,
      error: "",
      bioNome: biologico,
      quimNome: quimico,
    });

    try {
      const url = new URL(endpoints.catalogo);
      url.searchParams.set("biologico", biologico);
      url.searchParams.set("quimico", quimico);

      const res = await fetch(url.toString(), { credentials: "include" });

      // se já houve outro open/close, ignora
      if (reqId !== catalogReqIdRef.current) return;

      if (res.status === 404) {
        setCatalog((c) => ({ ...c, loading: false, found: false, resultado: null, error: "" }));
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCatalog((c) => ({
          ...c,
          loading: false,
          found: false,
          resultado: null,
          error: data?.error || `Erro HTTP ${res.status}`,
        }));
        return;
      }

      const resultado = data?.resultado || null;

      setCatalog((c) => ({
        ...c,
        loading: false,
        found: Boolean(resultado),
        resultado,
        error: "",
      }));
    } catch (e) {
      if (reqId !== catalogReqIdRef.current) return;
      setCatalog((c) => ({
        ...c,
        loading: false,
        found: false,
        resultado: null,
        error: e?.message || "Erro ao verificar catálogo.",
      }));
    }
  }

  const openReply = (it) => {
    const currentStatus = upper(it?.STATUS);

    // replyStatus é só para o "resultado final", então não usa EM_ANALISE/PENDENTE
    const allowedReply = new Set(["COMPATIVEL", "INCOMPATIVEL", "PARCIAL"]);
    const defaultStatus = allowedReply.has(currentStatus) ? currentStatus : "COMPATIVEL";

    setReplyStatus(defaultStatus);
    setReplyDesc(String(it?.DESCRICAO || ""));

    setModal({
      open: true,
      mode: "form",
      title: `Responder solicitação ${it?.ID ?? "—"}`,
      message: "",
      current: it,
    });

    // ✅ checa catálogo ao abrir o modal
    checkCatalogForCurrent(it);
  };

  const loadCatalogResult = () => {
    if (!catalog?.resultado) return;
    setReplyStatus(upper(catalog.resultado?.STATUS) || "COMPATIVEL");
    setReplyDesc(String(catalog.resultado?.DESCRICAO || ""));
  };

  const markAsInAnalysis = async () => {
    const current = modal.current;
    if (!current?.ID) return;

    setIsMarking(true);
    try {
      const payload = { id: current.ID };

      const res = await fetch(endpoints.marcarEmAnalise, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);

      // Atualiza lista local
      setItems((prev) =>
        prev.map((it) =>
          it.ID === current.ID
            ? {
                ...it,
                STATUS: "EM_ANALISE",
              }
            : it
        )
      );

      setModal({
        open: true,
        mode: "success",
        title: "Marcado como em análise",
        message: "A solicitação foi marcada como EM_ANALISE.",
        current: null,
      });
    } catch (e) {
      setModal({
        open: true,
        mode: "error",
        title: "Erro ao marcar como em análise",
        message: e?.message || "Não foi possível marcar agora. Tente novamente.",
        current: modal.current,
      });
    } finally {
      setIsMarking(false);
    }
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

  const canShowMarkAsAnalysis = (() => {
    if (!modal.open || modal.mode !== "form") return false;

    const current = modal.current;
    const st = upper(current?.STATUS);

    // só faz sentido para pendente
    if (st !== "PENDENTE") return false;

    // só aparece quando NÃO existe combinação catalogada
    if (catalog.loading) return false;
    if (catalog.error) return false;
    if (catalog.found && catalog.resultado) return false;

    return true;
  })();

  const modalFooter = (() => {
    if (!modal.open) return null;

    if (modal.mode === "form") {
      return (
        <>
          <button className="cbBtnGhost" type="button" onClick={closeModal} disabled={isBusy}>
            Cancelar
          </button>

          {canShowMarkAsAnalysis ? (
            <button className="cbBtnGhost cbBtnGhost--info" type="button" onClick={markAsInAnalysis} disabled={isBusy}>
              {isMarking ? "Marcando..." : "Marcar como em análise"}
            </button>
          ) : null}

          <button className="cbBtnPrimary" type="button" onClick={saveReply} disabled={isBusy}>
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
              {/* ✅ Dropdown dinâmico: só prioridades existentes em items */}
              <FilterSelect label="Prioridade" value={priorityFilter} onChange={setPriorityFilter}>
                <option value="ALL">Todas</option>
                {uniquePriorities.map((p) => (
                  <option key={String(p)} value={String(p)}>
                    {p}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
                <option value="ALL">Todos</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="EM_ANALISE">EM ANÁLISE</option>

                <option value="COMPATIVEL">COMPATÍVEL</option>
                <option value="INCOMPATIVEL">INCOMPATÍVEL</option>
                <option value="PARCIAL">PARCIAL</option>

                {uniqueStatuses
                  .filter((s) => !["PENDENTE", "EM_ANALISE", "COMPATIVEL", "INCOMPATIVEL", "PARCIAL"].includes(upper(s)))
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
                          <div className="admCardTitleRow">
                            <StatusPill status={it?.STATUS} />
                          </div>

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

      <Modal open={modal.open} title={modal.title} onClose={isBusy ? undefined : closeModal} footer={modalFooter}>
        {modal.mode === "form" ? (
          <div className="admModalForm">
            {/* ✅ Área de verificação de catálogo */}
            {catalog.loading ? (
              <div className="admCatalogHint">Verificando catálogo de resultados...</div>
            ) : catalog.error ? (
              <div className="admCatalogHint is-error">{catalog.error}</div>
            ) : catalog.found && catalog.resultado ? (
              <div className="admCatalogBanner">
                <div className="admCatalogBannerTop">
                  <div>
                    <p className="admCatalogBannerTitle">Já existe um resultado catalogado para esta combinação.</p>
                    <div className="admCatalogBannerMeta">
                      <div>
                        <span style={{ opacity: 0.85 }}>Status catalogado:</span>{" "}
                        <StatusPill status={catalog.resultado?.STATUS} />
                      </div>
                      <div className="admCatalogSmall" style={{ marginTop: 6 }}>
                        {catalog.quimNome} → {catalog.bioNome} (ID: {catalog.resultado?.ID ?? "—"})
                      </div>
                    </div>
                  </div>

                  <div className="admCatalogActions">
                    <button
                      type="button"
                      className="admCatalogLoadBtn"
                      onClick={loadCatalogResult}
                      disabled={isBusy}
                      title="Preenche o formulário com o resultado do catálogo"
                    >
                      Carregar resultado
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="admCatalogHint admCatalogHint--missing">
                Nenhum resultado catalogado encontrado para esta combinação.
                {upper(modal.current?.STATUS) === "PENDENTE" ? (
                  <span className="admCatalogHintSub">
                    Você pode marcar a solicitação como <b>EM ANÁLISE</b>.
                  </span>
                ) : null}
              </div>
            )}

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
                  disabled={isBusy}
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
                disabled={isBusy}
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
