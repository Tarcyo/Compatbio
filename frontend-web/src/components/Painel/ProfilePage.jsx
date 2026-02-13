// ProfilePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./Profile.css";

/* ======= ÍCONES ======= */
function IconClose(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"
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
function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M4 21V7a2 2 0 0 1 2-2h3V3h6v2h3a2 2 0 0 1 2 2v14h-7v-6H11v6H4Zm4-10h2V9H8v2Zm0 4h2v-2H8v2Zm6-4h2V9h-2v2Zm0 4h2v-2h-2v2Z"
      />
    </svg>
  );
}
function IconUser(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 12a4.6 4.6 0 1 0-4.6-4.6A4.6 4.6 0 0 0 12 12Zm0 2.3c-4.2 0-7.7 2.2-7.7 4.9V21h15.4v-1.8c0-2.7-3.5-4.9-7.7-4.9Z"
      />
    </svg>
  );
}
function IconCoins(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 3C7.58 3 4 4.34 4 6s3.58 3 8 3 8-1.34 8-3-3.58-3-8-3Zm0 8c-4.42 0-8-1.34-8-3v4c0 1.66 3.58 3 8 3s8-1.34 8-3V8c0 1.66-3.58 3-8 3Zm0 6c-4.42 0-8-1.34-8-3v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4c0 1.66-3.58 3-8 3Z"
      />
    </svg>
  );
}
function IconCheckCircle(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1.15 14.2-3.5-3.5 1.41-1.41 2.09 2.1 5.32-5.32 1.41 1.41-6.73 6.72Z"
      />
    </svg>
  );
}
function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6v-2Z" />
    </svg>
  );
}

/* ======= HELPERS ======= */
function toPositiveMoney(v) {
  const raw = String(v ?? "").trim().replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export default function ProfilePage() {
  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  const [googleUser, setGoogleUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [assinaturaData, setAssinaturaData] = useState(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingAssinatura, setLoadingAssinatura] = useState(true);

  // empresas (drawer)
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [errEmpresas, setErrEmpresas] = useState("");

  const [showEmpresaDrawer, setShowEmpresaDrawer] = useState(false);
  const [empresaQuery, setEmpresaQuery] = useState("");
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState(null);

  // UI
  const [actionBusy, setActionBusy] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addErr, setAddErr] = useState("");

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferValue, setTransferValue] = useState("1");
  const [transferErr, setTransferErr] = useState("");

  const formatCredits = useMemo(() => new Intl.NumberFormat("pt-BR"), []);

  const loadMe = useCallback(async () => {
    const meRes = await fetch(`${API_BASE}/me`, { credentials: "include" });
    if (!meRes.ok) throw new Error("401");
    const meData = await meRes.json();
    setGoogleUser(meData?.user || null);
    setCliente(meData?.cliente || null);
  }, [API_BASE]);

  const loadAssinaturaAtual = useCallback(async () => {
    const aRes = await fetch(`${API_BASE}/api/assinatura/atual`, {
      credentials: "include",
    });
    if (!aRes.ok) {
      setAssinaturaData(null);
      return;
    }
    const aData = await aRes.json();
    setAssinaturaData(aData || null);
  }, [API_BASE]);

  const loadEmpresas = useCallback(async () => {
    setLoadingEmpresas(true);
    setErrEmpresas("");

    try {
      const res = await fetch(`${API_BASE}/api/empresas/resumo`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autenticado");
        throw new Error(`Erro ao listar empresas (${res.status})`);
      }

      const data = await res.json();
      const list = Array.isArray(data?.empresas) ? data.empresas : [];
      setEmpresas(list);
    } catch (e) {
      setEmpresas([]);
      setErrEmpresas(e?.message || "Erro ao carregar empresas");
    } finally {
      setLoadingEmpresas(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      setLoadingUser(true);
      setLoadingAssinatura(true);

      try {
        await loadMe();
        if (!alive) return;
      } catch {
        if (!alive) return;
        setGoogleUser(null);
        setCliente(null);
        setAssinaturaData(null);
        setLoadingUser(false);
        setLoadingAssinatura(false);
        setLoadingEmpresas(false);
        return;
      } finally {
        if (!alive) return;
        setLoadingUser(false);
      }

      try {
        await Promise.all([loadAssinaturaAtual(), loadEmpresas()]);
      } finally {
        if (!alive) return;
        setLoadingAssinatura(false);
      }
    }

    loadAll();
    return () => {
      alive = false;
    };
  }, [loadMe, loadAssinaturaAtual, loadEmpresas]);

  const currentEmpresaId = useMemo(() => {
    const raw = cliente?.ID_EMPRESA;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [cliente]);

  const linkedCompanyName = useMemo(() => {
    const nome = cliente?.empresa?.NOME;
    return typeof nome === "string" && nome.trim() ? nome : null;
  }, [cliente]);

  const quantCreditos = useMemo(() => {
    const raw = cliente?.SALDO;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [cliente]);

  const profile = useMemo(() => {
    return {
      name: googleUser?.name || "",
      email: googleUser?.email || "",
      avatarUrl: googleUser?.picture || "",
      company: linkedCompanyName ?? "—",
      credits: quantCreditos,
    };
  }, [googleUser, linkedCompanyName, quantCreditos]);

  const planoAtual = useMemo(() => {
    const plano = assinaturaData?.plano || null;
    const assinatura = assinaturaData?.assinatura || null;

    if (!plano || !assinatura) {
      return {
        has: false,
        badge: "Sem plano ativo",
        nome: "—",
        status: "—",
        creditosMes: null,
        usuarios: 0,
        maxUsuarios: null,
        dono: "",
        isAtiva: false,
        adminId: null,
      };
    }

    const status = assinatura.STATUS || "—";
    const isAtiva = String(status).toUpperCase() === "ATIVA";

    const usuarios = Array.isArray(assinaturaData?.clientesVinculados)
      ? assinaturaData.clientesVinculados.length
      : 0;

    const dono = assinaturaData?.dono?.NOME || assinaturaData?.dono?.EMAIL || "";
    const adminId =
      assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA ?? assinaturaData?.dono?.ID ?? null;

    const maxUsuariosRaw = plano?.MAX_USUARIOS_DEPENDENTES ?? null;
    const maxUsuariosNum = Number(maxUsuariosRaw);
    const maxUsuarios = Number.isFinite(maxUsuariosNum) ? maxUsuariosNum : null;

    return {
      has: true,
      badge: isAtiva ? "Seu Plano Ativo" : `Status: ${status}`,
      nome: plano.NOME || "—",
      status,
      creditosMes: plano.QUANT_CREDITO_MENSAL ?? null,
      usuarios,
      maxUsuarios,
      dono,
      isAtiva,
      adminId,
    };
  }, [assinaturaData]);

  const isAssinaturaAdmin = useMemo(() => {
    if (!planoAtual.has) return false;
    const myId = cliente?.ID ?? null;
    const adminId = planoAtual.adminId ?? null;
    if (myId != null && adminId != null) return String(myId) === String(adminId);

    const myEmail = (googleUser?.email || cliente?.EMAIL || "").toLowerCase();
    const donoEmail = (assinaturaData?.dono?.EMAIL || "").toLowerCase();
    return Boolean(myEmail && donoEmail && myEmail === donoEmail);
  }, [planoAtual.has, planoAtual.adminId, cliente, googleUser, assinaturaData]);

  const assinaturaCheia = useMemo(() => {
    if (!planoAtual.has) return false;
    const max = planoAtual.maxUsuarios;
    if (max == null || !Number.isFinite(max) || max <= 0) return false;
    return (planoAtual.usuarios || 0) >= max;
  }, [planoAtual.has, planoAtual.maxUsuarios, planoAtual.usuarios]);

  const usuariosAssinatura = useMemo(() => {
    const list = Array.isArray(assinaturaData?.clientesVinculados)
      ? assinaturaData.clientesVinculados
      : [];

    const myEmail = (googleUser?.email || cliente?.EMAIL || "").toLowerCase();

    const donoIdRaw =
      assinaturaData?.dono?.ID ??
      assinaturaData?.assinatura?.ID_CLIENTE_ADMIN_DA_ASSINATURA ??
      null;

    const donoId = donoIdRaw == null ? null : String(donoIdRaw);

    const mapped = list.map((u) => {
      const email = (u?.EMAIL || "").toLowerCase();
      const userId = u?.ID == null ? null : String(u.ID);

      const saldoRaw = u?.SALDO;
      const saldoNum = Number(saldoRaw);
      const credits = Number.isFinite(saldoNum) ? saldoNum : null;

      return {
        id: u?.ID,
        name: u?.NOME || u?.EMAIL || "—",
        email: u?.EMAIL || "",
        credits,
        isYou: myEmail && email === myEmail,
        isAdmin: donoId != null && userId === donoId,
      };
    });

    const score = (u) => (u.isYou ? 2 : 0) + (u.isAdmin ? 1 : 0);

    mapped.sort((a, b) => {
      const s = score(b) - score(a);
      if (s !== 0) return s;
      const aId = Number(a.id ?? 0);
      const bId = Number(b.id ?? 0);
      return aId - bId;
    });

    return mapped;
  }, [assinaturaData, googleUser, cliente]);

  const empresasFiltradas = useMemo(() => {
    const q = String(empresaQuery || "").trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter((e) => String(e?.NOME || "").toLowerCase().includes(q));
  }, [empresas, empresaQuery]);

  async function postJson(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body ?? {}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || `Erro (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  const openEmpresaDrawer = () => {
    setEmpresaQuery("");
    setEmpresaSelecionadaId(currentEmpresaId ?? null);
    setShowEmpresaDrawer(true);
  };

  const closeEmpresaDrawer = () => {
    if (actionBusy) return;
    setShowEmpresaDrawer(false);
  };

  // ✅ ALTERAÇÃO AQUI: ao salvar, recarrega a página (reload)
  const saveEmpresa = async () => {
    const before = currentEmpresaId ?? null;
    const after = empresaSelecionadaId ?? null;

    setActionBusy(true);
    try {
      if (String(before ?? "") !== String(after ?? "")) {
        await postJson("/api/cliente/empresa", { idEmpresa: after });
      }

      setShowEmpresaDrawer(false);

      // Recarrega a página após salvar
      window.location.reload();
    } catch (e) {
      alert(e?.message || "Erro ao atualizar empresa.");
    } finally {
      setActionBusy(false);
    }
  };

  const openAdd = () => {
    setAddEmail("");
    setAddErr("");
    setShowAddModal(true);
  };

  const submitAdd = async () => {
    const email = String(addEmail || "").trim();
    if (!email) {
      setAddErr("Informe um e-mail.");
      return;
    }

    setActionBusy(true);
    setAddErr("");
    try {
      await postJson("/api/assinatura/vincular-cliente", { emailCliente: email });
      setShowAddModal(false);
      await Promise.all([loadAssinaturaAtual(), loadMe()]);
    } catch (e) {
      setAddErr(e?.message || "Erro ao vincular cliente.");
    } finally {
      setActionBusy(false);
    }
  };

  const askRemove = async (u) => {
    if (!u?.id) return;
    if (u.isYou || u.isAdmin) return;
    const ok = window.confirm(`Remover ${u.name} da sua assinatura?`);
    if (!ok) return;

    setActionBusy(true);
    try {
      await postJson("/api/assinatura/remover-cliente", { idCliente: u.id });
      await Promise.all([loadAssinaturaAtual(), loadMe()]);
    } catch (e) {
      alert(e?.message || "Erro ao remover cliente.");
    } finally {
      setActionBusy(false);
    }
  };

  const openTransfer = (u) => {
    setTransferTarget(u);
    setTransferValue("1");
    setTransferErr("");
    setShowTransferModal(true);
  };

  const submitTransfer = async () => {
    const alvo = transferTarget;
    const valor = toPositiveMoney(transferValue);

    if (!alvo?.id) {
      setTransferErr("Destino inválido.");
      return;
    }
    if (!valor) {
      setTransferErr("Informe um valor positivo.");
      return;
    }

    setActionBusy(true);
    setTransferErr("");
    try {
      await postJson("/api/assinatura/transferir-creditos", {
        idClienteDestino: alvo.id,
        valor,
      });
      setShowTransferModal(false);
      await Promise.all([loadAssinaturaAtual(), loadMe()]);
    } catch (e) {
      setTransferErr(e?.message || "Erro ao transferir créditos.");
    } finally {
      setActionBusy(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="pg-wrap cbpProf__wrap cbpProf__page">
        <section className="pg-card cbpProf__card">
          <header className="cbpProf__cardHeader">
            <h1 className="cbpProf__cardTitle">Perfil</h1>
          </header>
          <div className="cbpProf__cardBody">
            <p className="cbpProf__text">Carregando dados...</p>
          </div>
        </section>
      </div>
    );
  }

  if (!googleUser) {
    return (
      <div className="pg-wrap cbpProf__wrap cbpProf__page">
        <section className="pg-card cbpProf__card">
          <header className="cbpProf__cardHeader">
            <h1 className="cbpProf__cardTitle">Perfil</h1>
          </header>
          <div className="cbpProf__cardBody">
            <p className="cbpProf__text">Não autenticado. Faça login com Google novamente.</p>
            <pre className="cbpProf__text" style={{ opacity: 0.8 }}>
              GET {API_BASE}/me retornou 401/erro
            </pre>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pg-wrap cbpProf__wrap cbpProf__page">
      <section className="pg-card cbpProf__card">
        <header className="cbpProf__cardHeader">
          <h1 className="cbpProf__cardTitle">Perfil</h1>
        </header>

        <div className="cbpProf__cardBody">
          <div className="cbpProf__top">
            <img
              className="cbpProf__avatar"
              src={profile.avatarUrl || "https://via.placeholder.com/132"}
              alt="Foto do perfil"
              referrerPolicy="no-referrer"
            />

            <div className="cbpProf__info">
              <div className="cbpProf__titleRow">
                <h2 className="cbpProf__name">{profile.name}</h2>

                <div
                  className="cbpProf__creditsMini"
                  role="status"
                  aria-label="Créditos disponíveis"
                  title="Créditos disponíveis"
                >
                  <IconCoins className="cbpProf__creditsMiniIco" />
                  <span className="cbpProf__creditsMiniLabel">Créditos</span>
                  <span className="cbpProf__creditsMiniValue">
                    {profile.credits == null ? "—" : formatCredits.format(profile.credits)}
                  </span>
                </div>
              </div>

              <div className="cbpProf__meta">
                <div className="cbpProf__pill">
                  <span className="cbpProf__pillIco" aria-hidden="true">
                    <IconMail />
                  </span>
                  <span className="cbpProf__pillText">{profile.email || "—"}</span>
                </div>

                <div className="cbpProf__pill cbpProf__pill--company">
                  <span className="cbpProf__pillIco" aria-hidden="true">
                    <IconHome />
                  </span>

                  <div className="cbpProf__pillRow">
                    <span className="cbpProf__pillText">{profile.company}</span>

                    <button
                      type="button"
                      className="cbpProf__pillActionBtn"
                      onClick={openEmpresaDrawer}
                      disabled={actionBusy}
                      title="Alterar empresa"
                      aria-label="Alterar empresa"
                    >
                      Alterar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="cbpProf__divider" />

          <div className="cbpProf__section">
            <h3 className="cbpProf__sectionTitle">Sua Assinatura Atual:</h3>

            {loadingAssinatura ? (
              <p className="cbpProf__text" style={{ opacity: 0.9 }}>
                Carregando assinatura...
              </p>
            ) : (
              <div className="cbpProf__planRow">
                <div className="cbpProf__panel" role="status">
                  <div className="cbpProf__badgeRow">
                    <span className="cbpProf__badge">
                      <IconCheckCircle className="cbpProf__badgeIco" />
                      {planoAtual.badge}
                    </span>
                  </div>

                  <h4 className="cbpProf__panelTitle">{planoAtual.nome}</h4>

                  <ul className="cbpProf__panelList">
                    <li className="cbpProf__panelItem">
                      <IconCheckCircle className="cbpProf__checkIco" />
                      <span>
                        Status:{" "}
                        <strong className={planoAtual.isAtiva ? "cbpProf__ok" : "cbpProf__warn"}>
                          {planoAtual.status}
                        </strong>
                      </span>
                    </li>

                    <li className="cbpProf__panelItem">
                      <IconCheckCircle className="cbpProf__checkIco" />
                      <span>
                        Créditos/mês:{" "}
                        <strong>
                          {planoAtual.creditosMes == null ? "—" : formatCredits.format(planoAtual.creditosMes)}
                        </strong>
                      </span>
                    </li>

                    <li className="cbpProf__panelItem">
                      <IconCheckCircle className="cbpProf__checkIco" />
                      <span>
                        Usuários na assinatura:{" "}
                        <strong>
                          ({formatCredits.format(planoAtual.usuarios || 0)} de{" "}
                          {planoAtual.maxUsuarios == null ? "—" : formatCredits.format(planoAtual.maxUsuarios)})
                        </strong>
                      </span>
                    </li>

                    {planoAtual.dono ? (
                      <li className="cbpProf__panelItem">
                        <IconCheckCircle className="cbpProf__checkIco" />
                        <span>
                          Dono: <strong>{planoAtual.dono}</strong>
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="cbpProf__users">
            <div className="cbpProf__usersHeader">
              <p className="cbpProf__usersTitle">Usuários na Assinatura:</p>

              {planoAtual.has && isAssinaturaAdmin ? (
                <button
                  type="button"
                  className="cbpProf__miniBtn"
                  onClick={() => {
                    setAddEmail("");
                    setAddErr("");
                    setShowAddModal(true);
                  }}
                  disabled={actionBusy || assinaturaCheia}
                  title={assinaturaCheia ? "Limite de usuários do plano atingido" : "Adicionar cliente à assinatura"}
                  aria-label="Adicionar cliente à assinatura"
                >
                  <IconPlus className="cbpProf__miniIco" />
                </button>
              ) : null}
            </div>

            {!planoAtual.has ? (
              <p className="cbpProf__text" style={{ opacity: 0.92 }}>
                Nenhuma assinatura vinculada.
              </p>
            ) : usuariosAssinatura.length === 0 ? (
              <p className="cbpProf__text" style={{ opacity: 0.92 }}>
                Nenhum usuário vinculado.
              </p>
            ) : (
              <ul className="cbpProf__usersList">
                {usuariosAssinatura.map((u) => (
                  <li key={u.id} className="cbpProf__user">
                    <span className="cbpProf__userIco" aria-hidden="true">
                      <IconUser />
                    </span>

                    <div className="cbpProf__userMain">
                      <span className="cbpProf__userName" title={u.email || u.name}>
                        {u.name}
                      </span>

                      <span className="cbpProf__userSub" title={u.email}>
                        {u.email || "—"} {" • "}
                        <strong>{u.credits == null ? "—" : formatCredits.format(u.credits)} créditos</strong>
                      </span>
                    </div>

                    <div className="cbpProf__userRight">
                      {u.isYou || u.isAdmin ? (
                        <span className="cbpProf__badges">
                          {u.isYou ? <span className="cbpProf__badgePill cbpProf__badgePill--you">você</span> : null}
                          {u.isAdmin ? (
                            <span className="cbpProf__badgePill cbpProf__badgePill--admin">admin</span>
                          ) : null}
                        </span>
                      ) : null}

                      {isAssinaturaAdmin && !u.isYou ? (
                        <div className="cbpProf__userActions">
                          <button
                            type="button"
                            className="cbpProf__miniBtn cbpProf__miniBtn--transfer"
                            onClick={() => {
                              setTransferTarget(u);
                              setTransferValue("1");
                              setTransferErr("");
                              setShowTransferModal(true);
                            }}
                            disabled={actionBusy}
                            title="Transferir créditos"
                            aria-label={`Transferir créditos para ${u.name}`}
                          >
                            <IconCoins className="cbpProf__miniIco" />
                          </button>

                          {!u.isAdmin ? (
                            <button
                              type="button"
                              className="cbpProf__miniBtn cbpProf__miniBtn--remove"
                              onClick={() => askRemove(u)}
                              disabled={actionBusy}
                              title="Remover da assinatura"
                              aria-label={`Remover ${u.name} da assinatura`}
                            >
                              <IconClose className="cbpProf__miniIco" />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* DRAWER */}
      {showEmpresaDrawer ? (
        <div
          className="cbpProf__drawerOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Selecionar empresa"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEmpresaDrawer();
          }}
        >
          <aside className="cbpProf__drawer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cbpProf__drawerHeader">
              <div className="cbpProf__drawerTitleWrap">
                <h3 className="cbpProf__drawerTitle">Empresa</h3>
                <p className="cbpProf__drawerSubtitle">Selecione a empresa vinculada ao seu perfil.</p>
              </div>

              <button
                type="button"
                className="cbpProf__drawerClose"
                onClick={closeEmpresaDrawer}
                disabled={actionBusy}
                aria-label="Fechar"
                title="Fechar"
              >
                <IconClose className="cbpProf__miniIco" />
              </button>
            </div>

            <div className="cbpProf__drawerBody">
              <input
                className="cbpProf__drawerSearch"
                placeholder="Buscar empresa..."
                value={empresaQuery}
                onChange={(e) => setEmpresaQuery(e.target.value)}
                disabled={actionBusy || loadingEmpresas}
              />

              {loadingEmpresas ? (
                <p className="cbpProf__text" style={{ opacity: 0.9 }}>
                  Carregando empresas...
                </p>
              ) : errEmpresas ? (
                <p className="cbpProf__drawerError">{errEmpresas}</p>
              ) : (empresasFiltradas?.length || 0) === 0 ? (
                <p className="cbpProf__text" style={{ opacity: 0.9 }}>
                  Nenhuma empresa encontrada.
                </p>
              ) : (
                <ul className="cbpProf__drawerList">
                  <li className="cbpProf__drawerItem">
                    <label className="cbpProf__drawerItemLabel">
                      <input
                        type="radio"
                        name="empresa"
                        checked={empresaSelecionadaId == null}
                        onChange={() => setEmpresaSelecionadaId(null)}
                        disabled={actionBusy}
                      />
                      <span className="cbpProf__drawerItemText">
                        <strong>— Sem empresa —</strong>
                      </span>
                    </label>
                  </li>

                  {empresasFiltradas.map((emp) => (
                    <li key={emp.ID} className="cbpProf__drawerItem">
                      <label className="cbpProf__drawerItemLabel">
                        <input
                          type="radio"
                          name="empresa"
                          checked={String(empresaSelecionadaId ?? "") === String(emp.ID)}
                          onChange={() => setEmpresaSelecionadaId(Number(emp.ID))}
                          disabled={actionBusy}
                        />
                        <span className="cbpProf__drawerItemText">{emp.NOME}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="cbpProf__drawerFooter">
              <button
                type="button"
                className="cbpProf__btn cbpProf__btn--ghost"
                onClick={closeEmpresaDrawer}
                disabled={actionBusy}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="cbpProf__btn cbpProf__btn--primary"
                onClick={saveEmpresa}
                disabled={actionBusy}
              >
                {actionBusy ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* MODAL ADD */}
      {showAddModal ? (
        <div
          className="cbpProf__modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar cliente à assinatura"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !actionBusy) setShowAddModal(false);
          }}
        >
          <div className="cbpProf__modal">
            <div className="cbpProf__modalHeader">
              <h3 className="cbpProf__modalTitle">Adicionar cliente</h3>
              <button
                type="button"
                className="cbpProf__modalClose"
                onClick={() => setShowAddModal(false)}
                disabled={actionBusy}
                aria-label="Fechar"
              >
                <IconClose className="cbpProf__miniIco" />
              </button>
            </div>

            <div className="cbpProf__modalBody">
              <p className="cbpProf__modalHint">
                Informe o e-mail do cliente que ainda <strong>não</strong> esteja vinculado a nenhuma assinatura.
              </p>

              <input
                className="cbpProf__modalInput"
                type="email"
                placeholder="email@exemplo.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={actionBusy}
              />

              {addErr ? <p className="cbpProf__modalError">{addErr}</p> : null}

              <div className="cbpProf__modalActions">
                <button
                  type="button"
                  className="cbpProf__btn cbpProf__btn--ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionBusy}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="cbpProf__btn cbpProf__btn--primary"
                  onClick={submitAdd}
                  disabled={actionBusy}
                >
                  {actionBusy ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL TRANSFER */}
      {showTransferModal ? (
        <div
          className="cbpProf__modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Transferir créditos"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !actionBusy) setShowTransferModal(false);
          }}
        >
          <div className="cbpProf__modal">
            <div className="cbpProf__modalHeader">
              <h3 className="cbpProf__modalTitle">Transferir créditos</h3>
              <button
                type="button"
                className="cbpProf__modalClose"
                onClick={() => setShowTransferModal(false)}
                disabled={actionBusy}
                aria-label="Fechar"
              >
                <IconClose className="cbpProf__miniIco" />
              </button>
            </div>

            <div className="cbpProf__modalBody">
              <p className="cbpProf__modalHint">
                Destino: <strong>{transferTarget?.name || "—"}</strong>
              </p>

              <label className="cbpProf__modalLabel">
                Valor
                <input
                  className="cbpProf__modalInput"
                  inputMode="decimal"
                  placeholder="Ex: 5"
                  value={transferValue}
                  onChange={(e) => setTransferValue(e.target.value)}
                  disabled={actionBusy}
                />
              </label>

              {transferErr ? <p className="cbpProf__modalError">{transferErr}</p> : null}

              <div className="cbpProf__modalActions">
                <button
                  type="button"
                  className="cbpProf__btn cbpProf__btn--ghost"
                  onClick={() => setShowTransferModal(false)}
                  disabled={actionBusy}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="cbpProf__btn cbpProf__btn--primary"
                  onClick={submitTransfer}
                  disabled={actionBusy}
                >
                  {actionBusy ? "Transferindo..." : "Transferir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
