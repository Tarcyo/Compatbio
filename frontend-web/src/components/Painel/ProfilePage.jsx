// ProfilePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../Pages/Pages.css";
import "./Profile.css";

function IconEdit(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.77-8.77.92.92-8.77 8.77ZM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
      />
    </svg>
  );
}
function IconSave(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM6 8V5h9v3H6Z"
      />
    </svg>
  );
}
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

  // empresas (dropdown)
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [errEmpresas, setErrEmpresas] = useState("");

  // edição
  const [isEditing, setIsEditing] = useState(false);
  const [draftEmpresaId, setDraftEmpresaId] = useState(null); // number|null

  // UI: modais / ações
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

  // carrega /me + assinatura + empresas
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
      } catch {
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

  // info do perfil
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

  // assinatura/plano
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

  // ✅ usuários vinculados (você sempre primeiro)
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

  // helper POST JSON
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

  // ======= editar empresa (dropdown) =======

  const startEdit = () => {
    setDraftEmpresaId(currentEmpresaId ?? null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftEmpresaId(currentEmpresaId ?? null);
    setIsEditing(false);
  };

  // ✅ ALTERADO: ao salvar, recarrega a página
  const saveEdit = async () => {
    const before = currentEmpresaId ?? null;
    const after = draftEmpresaId ?? null;

    setActionBusy(true);
    try {
      if (String(before ?? "") !== String(after ?? "")) {
        await postJson("/api/cliente/empresa", { idEmpresa: after });
        await loadMe();
      }

      // Recarrega a página ao clicar em "Salvar" (mesmo se não houve mudança)
      window.location.reload();
    } catch (e) {
      alert(e?.message || "Erro ao atualizar empresa.");
    } finally {
      // caso o reload seja bloqueado por algum motivo, garantimos estado consistente
      setIsEditing(false);
      setActionBusy(false);
    }
  };

  // ======= ações admin assinatura =======

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

  // ======= render =======

  if (loadingUser) {
    return (
      <div className="pg-wrap">
        <section className="pg-card profileCard">
          <header className="profileCardHeader">
            <h1 className="profileCardTitle">Perfil</h1>
          </header>
          <div className="profileCardBody">
            <p className="profileText">Carregando dados...</p>
          </div>
        </section>
      </div>
    );
  }

  if (!googleUser) {
    return (
      <div className="pg-wrap">
        <section className="pg-card profileCard">
          <header className="profileCardHeader">
            <h1 className="profileCardTitle">Perfil</h1>
          </header>
          <div className="profileCardBody">
            <p className="profileText">
              Não autenticado. Faça login com Google novamente.
            </p>
            <pre className="profileText" style={{ opacity: 0.8 }}>
              GET {API_BASE}/me retornou 401/erro
            </pre>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pg-wrap">
      <section className="pg-card profileCard">
        <header className="profileCardHeader">
          <h1 className="profileCardTitle">Perfil</h1>
        </header>

        <div className="profileCardBody">
          <div className="profileTop">
            <img
              className="profileAvatar"
              src={profile.avatarUrl || "https://via.placeholder.com/132"}
              alt="Foto do perfil"
              referrerPolicy="no-referrer"
            />

            <div className="profileInfo">
              <div className="profileTitleRow">
                <h2 className="profileName">{profile.name}</h2>

                <div className="profileActions">
                  {!isEditing ? (
                    <button
                      type="button"
                      className="profileActionBtn"
                      onClick={startEdit}
                      disabled={actionBusy}
                    >
                      <IconEdit className="profileActionIco" />
                      Editar perfil
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="profileActionBtn is-primary"
                        onClick={saveEdit}
                        disabled={actionBusy}
                      >
                        <IconSave className="profileActionIco" />
                        {actionBusy ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        type="button"
                        className="profileActionBtn is-ghost"
                        onClick={cancelEdit}
                        disabled={actionBusy}
                      >
                        <IconClose className="profileActionIco" />
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="profileMeta">
                <div className="profileRow">
                  <span className="profileIco" aria-hidden="true">
                    <IconMail />
                  </span>
                  <span className="profileText">{profile.email || "—"}</span>
                </div>

                <div className="profileRow">
                  <span className="profileIco" aria-hidden="true">
                    <IconHome />
                  </span>

                  {!isEditing ? (
                    <span className="profileText">{profile.company}</span>
                  ) : (
                    <div className="profileCompanyEdit">
                      <div className="profileCompanyLabelRow">
                        <span className="profileCompanyLabel">Empresa vinculada</span>
                        <span className="profileCompanyChip" aria-hidden="true">
                          selecionar ▼
                        </span>
                      </div>

                      <div
                        className={`profileSelectWrap ${
                          loadingEmpresas ? "is-loading" : ""
                        }`}
                      >
                        <select
                          className="profileSelect"
                          value={draftEmpresaId == null ? "" : String(draftEmpresaId)}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDraftEmpresaId(v ? Number(v) : null);
                          }}
                          disabled={actionBusy || loadingEmpresas}
                          title="Clique para selecionar uma empresa"
                        >
                          <option value="">
                            {loadingEmpresas
                              ? "Carregando empresas..."
                              : "— Sem empresa —"}
                          </option>

                          {empresas.map((emp) => (
                            <option key={emp.ID} value={String(emp.ID)}>
                              {emp.NOME}
                            </option>
                          ))}
                        </select>
                      </div>

                      {errEmpresas ? (
                        <small className="profileCompanyHint is-error">
                          {errEmpresas}
                        </small>
                      ) : (
                        <small className="profileCompanyHint">
                          Clique no campo acima para abrir a lista.
                        </small>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profileDivider" />

          <div className="profileSection">
            <h3 className="profileSectionTitle">Sua Assinatura Atual:</h3>

            {loadingAssinatura ? (
              <p className="profileText" style={{ opacity: 0.85 }}>
                Carregando assinatura...
              </p>
            ) : (
              <div className="profilePlanRow">
                <div className="profileCurrentPlanCard" role="status">
                  <div className="profileCurrentPlanTop">
                    <span className="profileCurrentPlanBadge">
                      <IconCheckCircle className="profileCurrentPlanBadgeIco" />
                      {planoAtual.badge}
                    </span>
                  </div>

                  <h4 className="profileCurrentPlanTitle">{planoAtual.nome}</h4>

                  <ul className="profileCurrentPlanList">
                    <li className="profileCurrentPlanItem">
                      <IconCheckCircle className="profileCurrentPlanCheck" />
                      <span>
                        Status:{" "}
                        <strong className={planoAtual.isAtiva ? "is-ok" : "is-warn"}>
                          {planoAtual.status}
                        </strong>
                      </span>
                    </li>

                    <li className="profileCurrentPlanItem">
                      <IconCheckCircle className="profileCurrentPlanCheck" />
                      <span>
                        Créditos/mês:{" "}
                        <strong>
                          {planoAtual.creditosMes == null
                            ? "—"
                            : formatCredits.format(planoAtual.creditosMes)}
                        </strong>
                      </span>
                    </li>

                    <li className="profileCurrentPlanItem">
                      <IconCheckCircle className="profileCurrentPlanCheck" />
                      <span>
                        Usuários na assinatura:{" "}
                        <strong>
                          ({formatCredits.format(planoAtual.usuarios || 0)} de{" "}
                          {planoAtual.maxUsuarios == null
                            ? "—"
                            : formatCredits.format(planoAtual.maxUsuarios)}
                          )
                        </strong>
                      </span>
                    </li>

                    {planoAtual.dono ? (
                      <li className="profileCurrentPlanItem">
                        <IconCheckCircle className="profileCurrentPlanCheck" />
                        <span>
                          Dono: <strong>{planoAtual.dono}</strong>
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>

                <div
                  className="profileCreditsCard"
                  role="status"
                  aria-label="Créditos disponíveis"
                  title="Créditos disponíveis na sua conta"
                >
                  <div className="profileCreditsRow">
                    <span className="profileCreditsLabelInline">Créditos disponíveis</span>

                    <span className="profileCreditsStat">
                      <IconCoins className="profileCreditsIcon" />
                      <span className="profileCreditsNumber">
                        {profile.credits == null ? "—" : formatCredits.format(profile.credits)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="profileUsers">
            <div className="profileUsersHeader">
              <p className="profileUsersTitle">Usuários na Assinatura:</p>

              {planoAtual.has && isAssinaturaAdmin ? (
                <button
                  type="button"
                  className="profileAddUserBtn"
                  onClick={openAdd}
                  disabled={actionBusy || assinaturaCheia}
                  title={
                    assinaturaCheia
                      ? "Limite de usuários do plano atingido"
                      : "Adicionar cliente à assinatura"
                  }
                  aria-label="Adicionar cliente à assinatura"
                >
                  <IconPlus className="profileAddUserIco" />
                </button>
              ) : null}
            </div>

            {!planoAtual.has ? (
              <p className="profileText" style={{ opacity: 0.8 }}>
                Nenhuma assinatura vinculada.
              </p>
            ) : usuariosAssinatura.length === 0 ? (
              <p className="profileText" style={{ opacity: 0.8 }}>
                Nenhum usuário vinculado.
              </p>
            ) : (
              <ul className="profileUsersList">
                {usuariosAssinatura.map((u) => (
                  <li key={u.id} className="profileUser">
                    <span className="profileUserIco" aria-hidden="true">
                      <IconUser />
                    </span>

                    <div className="profileUserMain">
                      <span className="profileUserName" title={u.email || u.name}>
                        {u.name}
                      </span>

                      <span className="profileUserSub" title={u.email}>
                        {u.email || "—"}
                        {" • "}
                        <strong>
                          {u.credits == null ? "—" : formatCredits.format(u.credits)} créditos
                        </strong>
                      </span>
                    </div>

                    <div className="profileUserRight">
                      {u.isYou || u.isAdmin ? (
                        <span className="profileBadges">
                          {u.isYou ? <span className="profileBadge is-you">você</span> : null}
                          {u.isAdmin ? <span className="profileBadge is-admin">admin</span> : null}
                        </span>
                      ) : null}

                      {isAssinaturaAdmin && !u.isYou ? (
                        <div className="profileUserActions">
                          <button
                            type="button"
                            className="profileMiniBtn is-transfer"
                            onClick={() => openTransfer(u)}
                            disabled={actionBusy}
                            title="Transferir créditos"
                            aria-label={`Transferir créditos para ${u.name}`}
                          >
                            <IconCoins className="profileMiniIco" />
                          </button>

                          {!u.isAdmin ? (
                            <button
                              type="button"
                              className="profileMiniBtn is-remove"
                              onClick={() => askRemove(u)}
                              disabled={actionBusy}
                              title="Remover da assinatura"
                              aria-label={`Remover ${u.name} da assinatura`}
                            >
                              <IconClose className="profileMiniIco" />
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

      {/* ===== MODAL: Adicionar cliente ===== */}
      {showAddModal ? (
        <div
          className="profileModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar cliente à assinatura"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !actionBusy) setShowAddModal(false);
          }}
        >
          <div className="profileModal">
            <div className="profileModalHeader">
              <h3 className="profileModalTitle">Adicionar cliente</h3>
              <button
                type="button"
                className="profileModalClose"
                onClick={() => setShowAddModal(false)}
                disabled={actionBusy}
                aria-label="Fechar"
              >
                <IconClose className="profileMiniIco" />
              </button>
            </div>

            <div className="profileModalBody">
              <p className="profileModalHint">
                Informe o e-mail do cliente que ainda <strong>não</strong> esteja vinculado a
                nenhuma assinatura.
              </p>

              <input
                className="profileModalInput"
                type="email"
                placeholder="email@exemplo.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={actionBusy}
              />

              {addErr ? <p className="profileModalError">{addErr}</p> : null}

              <div className="profileModalActions">
                <button
                  type="button"
                  className="profileActionBtn is-ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionBusy}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="profileActionBtn is-primary"
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

      {/* ===== MODAL: Transferir créditos ===== */}
      {showTransferModal ? (
        <div
          className="profileModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Transferir créditos"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !actionBusy) setShowTransferModal(false);
          }}
        >
          <div className="profileModal">
            <div className="profileModalHeader">
              <h3 className="profileModalTitle">Transferir créditos</h3>
              <button
                type="button"
                className="profileModalClose"
                onClick={() => setShowTransferModal(false)}
                disabled={actionBusy}
                aria-label="Fechar"
              >
                <IconClose className="profileMiniIco" />
              </button>
            </div>

            <div className="profileModalBody">
              <p className="profileModalHint">
                Destino: <strong>{transferTarget?.name || "—"}</strong>
              </p>

              <label className="profileModalLabel">
                Valor
                <input
                  className="profileModalInput"
                  inputMode="decimal"
                  placeholder="Ex: 5"
                  value={transferValue}
                  onChange={(e) => setTransferValue(e.target.value)}
                  disabled={actionBusy}
                />
              </label>

              {transferErr ? <p className="profileModalError">{transferErr}</p> : null}

              <div className="profileModalActions">
                <button
                  type="button"
                  className="profileActionBtn is-ghost"
                  onClick={() => setShowTransferModal(false)}
                  disabled={actionBusy}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="profileActionBtn is-primary"
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
