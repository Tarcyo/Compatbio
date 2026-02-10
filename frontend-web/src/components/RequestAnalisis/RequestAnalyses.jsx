// RequestAnalysisPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../Pages/Pages.css";
import "./RequestAnalysis.css";

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

function IconMail(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"
      />
    </svg>
  );
}

function IconCredits(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 3c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4Zm-9 7v3c0 2.21 4.03 4 9 4s9-1.79 9-4v-3c-1.6 1.66-5.26 2.8-9 2.8S4.6 11.66 3 10Zm0 6v3c0 2.21 4.03 4 9 4s9-1.79 9-4v-3c-1.6 1.66-5.26 2.8-9 2.8S4.6 17.66 3 16Z"
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

function IconAlert(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 15h-2v2h2v-2Zm0-8h-2v6h2V9Z" />
    </svg>
  );
}

/** ✅ Modal com disableClose opcional (mantém a lógica original) */
function Modal({ open, title, children, footer, onClose, disableClose = false }) {
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
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose?.();
    }
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

// ✅ defaults FORA do componente (referência estável)
const DEFAULT_GET_LABEL = (p) => p?.NOME ?? "";
const DEFAULT_GET_KEY = (p) => p?.ID ?? p?.id ?? DEFAULT_GET_LABEL(p);

function SearchableDropdown({
  label,
  placeholder,
  fetchUrl,
  value,
  onChange,
  getLabel = DEFAULT_GET_LABEL,
  getKey = DEFAULT_GET_KEY,
}) {
  // ✅ guarda as funções em ref (não causam reset do input)
  const getLabelRef = useRef(getLabel);
  const getKeyRef = useRef(getKey);

  useEffect(() => {
    getLabelRef.current = getLabel;
  }, [getLabel]);

  useEffect(() => {
    getKeyRef.current = getKey;
  }, [getKey]);

  const [query, setQuery] = useState(value ? getLabelRef.current(value) : "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const rootRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // ✅ só atualiza o texto quando o VALUE mudar
  useEffect(() => {
    setQuery(value ? getLabelRef.current(value) : "");
  }, [value]);

  // clique fora fecha
  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const doFetch = async (q) => {
    setLoading(true);
    setErrMsg("");

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const url = new URL(fetchUrl);
      if (q && q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString(), {
        credentials: "include",
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autenticado");
        throw new Error(`Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.produtos) ? data.produtos : [];
      setItems(list);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setItems([]);
      setErrMsg(e?.message || "Erro ao buscar");
    } finally {
      setLoading(false);
    }
  };

  const onFocus = () => {
    setOpen(true);
    if (items.length === 0 && !loading) doFetch("");
  };

  const onInput = (e) => {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);

    // se já tinha um item selecionado e começou a digitar, limpa seleção
    if (value) onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doFetch(next), 250);
  };

  const selectItem = (item) => {
    onChange(item);
    setQuery(getLabelRef.current(item));
    setOpen(false);
  };

  const clearSelection = () => {
    onChange(null);
    setQuery("");
    setOpen(true);
    doFetch("");
  };

  return (
    <div
      className={`requestGroup ${open ? "is-dropdown-open" : ""}`}
      ref={rootRef}
    >
      <h2 className="requestTitle">{label}</h2>

      <div className={`requestSearch requestDropdown ${open ? "is-open" : ""}`}>
        <span className="requestSearchIco" aria-hidden="true">
          <IconSearch />
        </span>

        <input
          className="requestInput"
          type="text"
          value={query}
          onChange={onInput}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete="off"
        />

        {value ? (
          <button
            type="button"
            className="requestDropdownClear"
            onClick={clearSelection}
            title="Limpar seleção"
            aria-label="Limpar seleção"
          >
            ×
          </button>
        ) : null}
      </div>

      {/* ✅ Backdrop real (não usa ::before → sem conflito) */}
      {open ? (
        <button
          type="button"
          className="requestDropdownBackdrop"
          aria-label="Fechar lista"
          tabIndex={-1}
          onMouseDown={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <div className="requestDropdownPanel" role="listbox" aria-label={`${label} opções`}>
          {loading ? (
            <div className="requestDropdownState">Carregando...</div>
          ) : errMsg ? (
            <div className="requestDropdownState is-error">{errMsg}</div>
          ) : items.length === 0 ? (
            <div className="requestDropdownState">Nenhum produto encontrado.</div>
          ) : (
            <ul className="requestDropdownList">
              {items.map((p) => (
                <li key={getKeyRef.current(p)} className="requestDropdownItem">
                  <button
                    type="button"
                    className="requestDropdownBtn"
                    onClick={() => selectItem(p)}
                  >
                    <span className="requestDropdownName">{getLabelRef.current(p)}</span>
                    {p?.E_PARA_DEMO ? <span className="requestDropdownTag">demo</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function RequestAnalysisPage() {
  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  const [chemicalProduct, setChemicalProduct] = useState(null);
  const [biologicalProduct, setBiologicalProduct] = useState(null);

  const [cliente, setCliente] = useState(null);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // modal principal
  const [modal, setModal] = useState({
    open: false,
    mode: "confirm", // confirm | success | no_credits | error
    title: "",
    message: "",
  });

  // modal solicitar produto
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [prodTipo, setProdTipo] = useState("QU_MICO"); // QU_MICO | BIOL_GICO
  const [prodNome, setProdNome] = useState("");
  const [prodSending, setProdSending] = useState(false);
  const [prodErr, setProdErr] = useState("");

  const formatCredits = useMemo(() => new Intl.NumberFormat("pt-BR"), []);
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove("pg-enter");
    void el.offsetHeight;
    el.classList.add("pg-enter");
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadMe() {
      setLoadingCredits(true);
      try {
        const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
        if (!res.ok) throw new Error("401");
        const data = await res.json();
        if (!alive) return;
        setCliente(data?.cliente || null);
      } catch {
        if (!alive) return;
        setCliente(null);
      } finally {
        if (!alive) return;
        setLoadingCredits(false);
      }
    }

    loadMe();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  const creditsAvailable = useMemo(() => {
    const raw = cliente?.SALDO;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [cliente]);

  const quimicosUrl = `${API_BASE}/api/produtos/quimicos`;
  const biologicosUrl = `${API_BASE}/api/produtos/biologicos`;

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const openConfirm = () => {
    if (!chemicalProduct || !biologicalProduct) {
      setModal({
        open: true,
        mode: "error",
        title: "Seleção incompleta",
        message: "Selecione um produto químico e um produto biológico para continuar.",
      });
      return;
    }

    if (typeof creditsAvailable === "number" && creditsAvailable < 1) {
      setModal({
        open: true,
        mode: "no_credits",
        title: "Créditos insuficientes",
        message: "Você não possui créditos suficientes para solicitar uma análise.",
      });
      return;
    }

    setModal({
      open: true,
      mode: "confirm",
      title: "Confirmar solicitação",
      message: `Deseja solicitar a análise com:\n\n• Químico: ${chemicalProduct.NOME}\n• Biológico: ${biologicalProduct.NOME}\n\nCusto: 1 crédito.`,
    });
  };

  const createSolicitacao = async () => {
    if (!chemicalProduct || !biologicalProduct) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/solicitacoes/analise`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idProdutoQuimico: chemicalProduct.ID,
          idProdutoBiologico: biologicalProduct.ID,
          descricao: null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 403) {
        const msg = data?.error || "Você não tem permissão/créditos suficientes para essa solicitação.";
        const isNoCredits = typeof msg === "string" && msg.toLowerCase().includes("créditos insuficientes");

        setModal({
          open: true,
          mode: isNoCredits ? "no_credits" : "error",
          title: isNoCredits ? "Créditos insuficientes" : "Não permitido",
          message: msg,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Erro HTTP ${res.status}`);
      }

      if (data?.saldoAtual != null) {
        setCliente((prev) => (prev ? { ...prev, SALDO: data.saldoAtual } : prev));
      }

      setModal({
        open: true,
        mode: "success",
        title: "Solicitação enviada!",
        message: "Sua solicitação foi criada com sucesso. Em breve você poderá acompanhar o status.",
      });

      setChemicalProduct(null);
      setBiologicalProduct(null);
    } catch (e) {
      setModal({
        open: true,
        mode: "error",
        title: "Erro ao solicitar",
        message: "Não foi possível criar a solicitação agora. Tente novamente.",
      });
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProductRequest = () => {
    setProdErr("");
    setProdTipo("QU_MICO");
    setProdNome("");
    setProdModalOpen(true);
  };

  const closeProductRequest = () => {
    if (prodSending) return;
    setProdModalOpen(false);
  };

  const submitProductRequest = async () => {
    const nome = prodNome.trim();
    if (!nome) {
      setProdErr("Informe o nome do produto.");
      return;
    }

    setProdSending(true);
    setProdErr("");

    try {
      const res = await fetch(`${API_BASE}/api/solicitacoes/adicao-produto`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, tipo: prodTipo }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || `Erro HTTP ${res.status}`;
        setProdErr(msg);
        return;
      }

      setProdModalOpen(false);

      setModal({
        open: true,
        mode: "success",
        title: "Solicitação enviada!",
        message: "Recebemos sua solicitação de produto. Em breve nossa equipe irá analisar.",
      });
    } catch (e) {
      setProdErr("Não foi possível enviar sua solicitação agora. Tente novamente.");
      console.error(e);
    } finally {
      setProdSending(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    openConfirm();
  };

  const modalFooter = (() => {
    if (!modal.open) return null;

    if (modal.mode === "confirm") {
      return (
        <>
          <button className="cbBtnGhost" type="button" onClick={closeModal} disabled={isSubmitting}>
            Cancelar
          </button>
          <button className="cbBtnPrimary" type="button" onClick={createSolicitacao} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Confirmar"}
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
    if (modal.mode === "no_credits") return <IconAlert className="cbModalIcon is-warn" />;
    if (modal.mode === "error") return <IconAlert className="cbModalIcon is-error" />;
    return null;
  })();

  return (
    <div className="pg-wrap requestPage">
      <div className="analysisPage">
        <form ref={cardRef} className="pg-card requestCard" onSubmit={submit}>
          <header className="requestCardHeader">
            <h1 className="requestCardTitle">Solicitar Análise</h1>

            <div
              className="requestCreditsCard"
              role="status"
              aria-label="Créditos disponíveis"
              title="Créditos disponíveis na sua conta"
            >
              <div className="requestCreditsRow">
                <span className="requestCreditsLabelInline">Créditos disponíveis</span>

                <span className="requestCreditsStat">
                  <IconCredits className="requestCreditsIcon" />
                  <strong className="requestCreditsValue">
                    {loadingCredits ? "..." : creditsAvailable == null ? "—" : formatCredits.format(creditsAvailable)}
                  </strong>
                </span>
              </div>
            </div>
          </header>

          <div className="requestCardBody">
            <SearchableDropdown
              label="Produto Químico"
              placeholder="Buscar produto químico..."
              fetchUrl={quimicosUrl}
              value={chemicalProduct}
              onChange={setChemicalProduct}
            />

            <SearchableDropdown
              label="Produto Biológico"
              placeholder="Buscar produto biológico..."
              fetchUrl={biologicosUrl}
              value={biologicalProduct}
              onChange={setBiologicalProduct}
            />

            <div className="requestHelpRow">
              <button type="button" className="requestHelpBtn" onClick={openProductRequest}>
                <span className="requestHelpText">Não encontrou o produto? Enviar solicitação!</span>
                <span className="requestHelpIcoWrap" aria-hidden="true">
                  <IconMail className="requestHelpIco" />
                </span>
              </button>
            </div>

            <div className="requestActions">
              <button type="submit" className="requestMainBtn" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Solicitar Análise"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal principal */}
      <Modal
        open={modal.open}
        title={modal.title}
        onClose={isSubmitting ? undefined : closeModal}
        disableClose={isSubmitting}
        footer={modalFooter}
      >
        <div className="cbModalContent">
          {modalIcon}
          <p className="cbModalText">{modal.message}</p>
        </div>
      </Modal>

      {/* Modal de Solicitar Produto */}
      <Modal
        open={prodModalOpen}
        title="Solicitar inclusão de produto"
        onClose={closeProductRequest}
        disableClose={prodSending}
        footer={
          <>
            <button className="cbBtnGhost" type="button" onClick={closeProductRequest} disabled={prodSending}>
              Cancelar
            </button>
            <button
              className="cbBtnPrimary"
              type="button"
              onClick={submitProductRequest}
              disabled={prodSending || !prodNome.trim()}
            >
              {prodSending ? "Enviando..." : "Solicitar"}
            </button>
          </>
        }
      >
        <div className="apModalForm">
          <div className="apModalRow">
            <label className="apModalLabel">Tipo</label>

            <div className="requestSearch is-select" style={{ gridTemplateColumns: "54px 1fr" }}>
              <span className="requestSearchIco" aria-hidden="true">
                <IconSearch />
              </span>
              <select
                className="requestInput"
                value={prodTipo}
                onChange={(e) => setProdTipo(e.target.value)}
                disabled={prodSending}
              >
                <option value="QU_MICO">Químico</option>
                <option value="BIOL_GICO">Biológico</option>
              </select>
            </div>
          </div>

          <div className="apModalRow" style={{ marginTop: 12 }}>
            <label className="apModalLabel">Nome do produto</label>
            <div className="requestSearch" style={{ gridTemplateColumns: "54px 1fr" }}>
              <span className="requestSearchIco" aria-hidden="true">
                <IconMail />
              </span>
              <input
                className="requestInput"
                value={prodNome}
                onChange={(e) => setProdNome(e.target.value)}
                placeholder="Ex.: Produto X..."
                disabled={prodSending}
              />
            </div>
          </div>

          {prodErr ? (
            <div className="requestDropdownState is-error" style={{ marginTop: 12 }}>
              {prodErr}
            </div>
          ) : (
            <div className="requestDropdownState" style={{ marginTop: 12 }}>
              Envie o nome exato do produto. Nossa equipe irá validar e incluir no catálogo.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
