// PlansCreditsPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "../Pages/Pages.css";
import "./PlansPage.css";

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

function moneyBR(v) {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function postJson(baseUrl, path, body, credentials = "include") {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    credentials,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await safeJson(res);
  return { res, data };
}

async function postWithFallback({ baseUrl, attempts }) {
  let lastErr = null;

  for (const at of attempts) {
    try {
      const { path, body } = at;
      const { res, data } = await postJson(baseUrl, path, body);

      if (res.status === 404) {
        lastErr = new Error(`Rota não encontrada: ${path}`);
        continue;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Erro (${res.status})`);
      }

      return { data, pathUsed: path };
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr || new Error("Falha ao chamar endpoint (fallback esgotado).");
}

function PlanCard({
  title,
  price,
  interval = "/mês",
  badge,
  features,
  variant = "blue",
  ctaLabel,
  onCta,
  disabled,
  hint,
}) {
  return (
    <article className={`planTile ${variant === "green" ? "is-green" : ""}`} aria-disabled={!!disabled}>
      {badge ? (
        <div className="planBadgeRow">
          <span className="planBadge">
            <IconCheckCircle className="planBadgeIco" />
            {badge}
          </span>
        </div>
      ) : (
        <div className="planBadgeRow" />
      )}

      <h4 className="planTitle" title={title}>
        {title}
      </h4>

      <div className="planPrice">
        <span className="planPriceMain">{price}</span>
        <span className="planPriceInterval">{interval}</span>
      </div>

      <ul className="planFeatures" aria-label="Recursos do plano">
        {features.map((t) => (
          <li key={t} className="planFeature">
            <IconCheckCircle className="planCheck" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      {hint ? (
        <small className="creditsHint" style={{ marginTop: 2 }}>
          {hint}
        </small>
      ) : null}

      <button
        type="button"
        className={`planBtn ${variant === "green" ? "is-green" : "is-blue"}`}
        onClick={onCta}
        disabled={!!disabled}
        title={disabled ? "Este plano já está selecionado ou ação indisponível." : ""}
      >
        {ctaLabel}
      </button>
    </article>
  );
}

function TabBar({ value, onChange, items }) {
  return (
    <div className="plansTabsWrap">
      <div className="plansTabs" role="tablist" aria-label="Tipos de planos">
        {items.map((it) => {
          const active = value === it.value;
          return (
            <button
              key={it.value}
              id={`plans-tab-${it.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`plans-panel-${it.value}`}
              className={`plansTab ${active ? "is-active" : ""}`}
              onClick={() => onChange(it.value)}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PlansCreditsPage() {
  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  const plansSectionRef = useRef(null);

  // plano atual do usuário
  const [assinaturaData, setAssinaturaData] = useState(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [errPlano, setErrPlano] = useState("");

  // planos do sistema
  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [errPlanos, setErrPlanos] = useState("");

  // preço do crédito
  const [pricePerCredit, setPricePerCredit] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [errPrice, setErrPrice] = useState("");

  // tab PF/PJ
  const [tab, setTab] = useState("pf");

  // compra avulsa
  const [credits, setCredits] = useState(10);

  // checkout créditos
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyErr, setBuyErr] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");

  // checkout assinatura
  const [subLoading, setSubLoading] = useState(false);
  const [subErr, setSubErr] = useState("");
  const [subCheckoutUrl, setSubCheckoutUrl] = useState("");

  // cancelamento assinatura
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelErr, setCancelErr] = useState("");
  const [cancelMsg, setCancelMsg] = useState("");

  const reloadPlanoAtual = useCallback(async () => {
    setLoadingPlano(true);
    setErrPlano("");

    try {
      const res = await fetch(`${API_BASE}/api/assinatura/atual`, { credentials: "include" });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autenticado");
        throw new Error(`Erro ao buscar assinatura (${res.status})`);
      }

      const data = await safeJson(res);
      setAssinaturaData(data || null);
    } catch (e) {
      setAssinaturaData(null);
      setErrPlano(e?.message || "Erro ao carregar plano");
    } finally {
      setLoadingPlano(false);
    }
  }, [API_BASE]);

  const reloadPlanos = useCallback(async () => {
    setLoadingPlanos(true);
    setErrPlanos("");

    try {
      const res = await fetch(`${API_BASE}/api/planos`, { credentials: "include" });
      const data = await safeJson(res);

      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autenticado");
        throw new Error(data?.error || `Erro ao buscar planos (${res.status})`);
      }

      setPlanos(Array.isArray(data?.planos) ? data.planos : []);
    } catch (e) {
      setPlanos([]);
      setErrPlanos(e?.message || "Erro ao carregar planos");
    } finally {
      setLoadingPlanos(false);
    }
  }, [API_BASE]);

  // busca preço do crédito
  useEffect(() => {
    let alive = true;

    async function loadPrecoCredito() {
      setLoadingPrice(true);
      setErrPrice("");
      try {
        const res = await fetch(`${API_BASE}/api/preco-credito`, { credentials: "include" });
        const json = await safeJson(res);

        if (!res.ok) throw new Error(json?.error || `Erro ao buscar preço do crédito (${res.status})`);

        const valor = Number(json?.valor ?? 0);
        if (!Number.isFinite(valor) || valor <= 0) throw new Error("Preço do crédito inválido.");

        if (!alive) return;
        setPricePerCredit(valor);
      } catch (e) {
        if (!alive) return;
        setPricePerCredit(null);
        setErrPrice(e?.message || "Erro ao carregar preço do crédito");
      } finally {
        if (!alive) return;
        setLoadingPrice(false);
      }
    }

    loadPrecoCredito();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // carrega plano atual e planos
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await Promise.allSettled([reloadPlanoAtual(), reloadPlanos()]);
    })();
    return () => {
      alive = false;
    };
  }, [reloadPlanoAtual, reloadPlanos]);

  // quando voltar do Stripe, atualiza
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") {
        reloadPlanoAtual();
        reloadPlanos();
      }
    }
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reloadPlanoAtual, reloadPlanos]);

  // seu plano atual
  const currentPlan = useMemo(() => {
    const assinatura = assinaturaData?.assinatura || null;
    const plano = assinaturaData?.plano || null;

    const assinaturaId =
      assinatura?.ID ?? assinatura?.id ?? assinatura?.Id ?? assinatura?.ASSINATURA_ID ?? null;

    if (!plano || !assinatura) {
      return {
        assinaturaId: null,
        planId: null,
        status: null,
        name: "—",
        subtitle: "",
        features: ["Nenhum plano vinculado"],
        badge: "",
      };
    }

    const planoId = plano?.ID ?? null;
    const planoNome = plano?.NOME || "—";
    const quantMensal = plano?.QUANT_CREDITO_MENSAL;
    const valorMensal = plano?.VALOR_MENSAL;
    const status = assinatura?.STATUS || "—";

    const totalUsuarios = Array.isArray(assinaturaData?.clientesVinculados)
      ? assinaturaData.clientesVinculados.length
      : 0;

    const features = [
      `Status: ${status}`,
      `Créditos/mês: ${quantMensal ?? "—"}`,
      `Valor/mês: ${valorMensal == null ? "—" : moneyBR(valorMensal)}`,
      `Usuários na assinatura: ${totalUsuarios}`,
    ];

    return {
      assinaturaId: assinaturaId != null ? String(assinaturaId) : null,
      planId: planoId != null ? String(planoId) : null,
      status,
      name: planoNome,
      subtitle: "Plano vinculado à sua assinatura",
      features,
      badge: String(status || "").toUpperCase() === "ATIVA" ? "Seu Plano Ativo" : `Status: ${status}`,
    };
  }, [assinaturaData]);

  // PF/PJ por "enterprise" no nome
  const { pfPlans, pjPlans } = useMemo(() => {
    const isEnterprise = (name) => typeof name === "string" && name.toLowerCase().includes("enterprise");
    const pj = planos.filter((p) => isEnterprise(p?.NOME));
    const pf = planos.filter((p) => !isEnterprise(p?.NOME));
    return { pfPlans: pf, pjPlans: pj };
  }, [planos]);

  // mapeia plano -> card
  const mapPlanoToCard = useCallback(
    (p) => {
      const nome = p?.NOME || "Plano";
      const credito = p?.QUANT_CREDITO_MENSAL ?? "—";
      const valor = p?.VALOR_MENSAL;
      const price = valor == null ? "—" : moneyBR(valor);

      const features = [
        `Créditos/mês: ${credito}`,
        `Valor/mês: ${valor == null ? "—" : moneyBR(valor)}`,
      ];

      const isEnterprise = typeof nome === "string" && nome.toLowerCase().includes("enterprise");

      const id = String(p?.ID);
      const isCurrent = currentPlan?.planId && id === currentPlan.planId;

      return {
        id,
        title: nome,
        price,
        features,
        cta: isCurrent ? "Plano Atual" : "Escolher Plano",
        variant: isEnterprise ? "green" : "blue",
        badge: isEnterprise ? "Para Empresas" : undefined,
        disabled: isCurrent || subLoading || cancelLoading,
        hint: isCurrent ? "Você já está neste plano." : "",
      };
    },
    [currentPlan?.planId, subLoading, cancelLoading]
  );

  const shownPlans = useMemo(() => {
    const list = tab === "pj" ? pjPlans : pfPlans;
    return list.map(mapPlanoToCard);
  }, [tab, pfPlans, pjPlans, mapPlanoToCard]);

  const scrollToPlans = useCallback(() => {
    const el = plansSectionRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // assinar plano
  const handleChoose = useCallback(
    async (planoId) => {
      setSubErr("");
      setSubCheckoutUrl("");
      setCancelErr("");
      setCancelMsg("");

      const pid = Number(planoId);
      if (!Number.isFinite(pid) || pid <= 0) {
        setSubErr("Plano inválido.");
        return;
      }

      try {
        setSubLoading(true);

        const { data } = await postWithFallback({
          baseUrl: API_BASE,
          attempts: [
            { path: "/api/assinaturas/checkout", body: { planoId: pid, uiMode: "hosted" } },
            { path: "/api/assinatura/checkout", body: { planoId: pid, uiMode: "hosted" } },
          ],
        });

        const url = String(data?.url || "");
        if (!url) throw new Error("Checkout inválido: URL não retornada pelo servidor.");

        const w = window.open(url, "_blank", "noopener,noreferrer");
        if (!w) {
          setSubCheckoutUrl(url);
          setSubErr("Seu navegador bloqueou a abertura do checkout. Clique no link abaixo para continuar.");
        }
      } catch (e) {
        setSubErr(e?.message || "Erro ao iniciar assinatura do plano.");
      } finally {
        setSubLoading(false);
      }
    },
    [API_BASE]
  );

  // cancelar assinatura
  const handleCancelSubscription = useCallback(async () => {
    setCancelErr("");
    setCancelMsg("");
    setSubErr("");
    setSubCheckoutUrl("");

    const assinaturaId = currentPlan?.assinaturaId ? Number(currentPlan.assinaturaId) : null;

    if (!assinaturaData?.assinatura) {
      setCancelErr("Nenhuma assinatura encontrada para cancelar.");
      return;
    }

    const ok = window.confirm(
      "Tem certeza que deseja cancelar sua assinatura?\n\n" +
        "Se você confirmar, o cancelamento será solicitado (normalmente para o fim do período atual)."
    );
    if (!ok) return;

    try {
      setCancelLoading(true);

      const attempts = [
        { path: "/api/assinaturas/cancelar", body: { atPeriodEnd: true } },
        { path: "/api/assinatura/cancelar", body: { atPeriodEnd: true } },
      ];

      if (assinaturaId && Number.isFinite(assinaturaId) && assinaturaId > 0) {
        attempts.push(
          { path: "/api/assinaturas/cancelar", body: { assinaturaId, atPeriodEnd: true } },
          { path: "/api/assinatura/cancelar", body: { assinaturaId, atPeriodEnd: true } },
          { path: `/api/assinaturas/${assinaturaId}/cancelar`, body: { atPeriodEnd: true } },
          { path: `/api/assinatura/${assinaturaId}/cancelar`, body: { atPeriodEnd: true } }
        );
      }

      const { data } = await postWithFallback({ baseUrl: API_BASE, attempts });

      const cancelAtPeriodEnd = !!data?.cancelAtPeriodEnd;
      setCancelMsg(
        cancelAtPeriodEnd ? "Cancelamento agendado para o fim do período atual." : "Cancelamento solicitado."
      );

      await reloadPlanoAtual();
      await reloadPlanos();
    } catch (e) {
      setCancelErr(e?.message || "Erro ao cancelar assinatura.");
    } finally {
      setCancelLoading(false);
    }
  }, [API_BASE, assinaturaData, currentPlan?.assinaturaId, reloadPlanoAtual, reloadPlanos]);

  // compra de créditos avulsos
  const handleBuyCredits = useCallback(async () => {
    setBuyErr("");
    setCheckoutUrl("");

    const q = Math.floor(Number(credits));
    if (!Number.isFinite(q) || q < 1) {
      setBuyErr("Quantidade inválida.");
      return;
    }

    try {
      setBuyLoading(true);

      const res = await fetch(`${API_BASE}/api/creditos/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade: q }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || `Erro ao iniciar checkout (${res.status})`);
      }

      const url = String(data?.url || "");
      if (!url) throw new Error("Checkout inválido: URL não retornada pelo servidor.");

      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        setCheckoutUrl(url);
        setBuyErr("Seu navegador bloqueou a abertura do checkout. Clique no link abaixo para continuar.");
      }
    } catch (e) {
      setBuyErr(e?.message || "Erro ao iniciar compra de créditos.");
    } finally {
      setBuyLoading(false);
    }
  }, [API_BASE, credits]);

  const creditPriceText = useMemo(() => {
    if (loadingPrice) return "Carregando preço do crédito...";
    if (errPrice) return errPrice;
    if (pricePerCredit == null) return "Preço do crédito indisponível.";
    return `${moneyBR(pricePerCredit)} por crédito`;
  }, [loadingPrice, errPrice, pricePerCredit]);

  const hasSubscription = !!assinaturaData?.assinatura;
  const statusUpper = String(currentPlan?.status || "").toUpperCase();
  const showCancelBtn = hasSubscription && statusUpper !== "CANCELADA";

  return (
    <div className="pg-wrap plansPage">
      {/* ✅ removido: <div className="plansBg" /> */}

      <section className="plansCard">
        <header className="plansCardHeader">
          <h1 className="plansCardTitle">Planos e Créditos</h1>
        </header>

        <div className="plansCardBody">
          <h3 className="plansSectionTitle">Seu Plano Atual</h3>

          {loadingPlano ? (
            <p className="creditsHint" style={{ marginTop: 6 }}>
              Carregando plano atual...
            </p>
          ) : errPlano ? (
            <p className="creditsHint" style={{ marginTop: 6, color: "rgba(255,140,140,0.92)" }}>
              {errPlano}
            </p>
          ) : (
            <div className="currentPlan">
              <div className="currentPlanLeft">
                <h4 className="currentPlanTitle">{currentPlan.name}</h4>

                {currentPlan.subtitle ? (
                  <p className="creditsHint" style={{ marginTop: 6 }}>
                    {currentPlan.subtitle}
                  </p>
                ) : null}

                <ul className="currentPlanList" aria-label="Detalhes do plano">
                  {currentPlan.features.map((t) => (
                    <li key={t} className="currentPlanItem">
                      <IconCheckCircle className="currentPlanCheck" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                {cancelMsg ? (
                  <p className="creditsHint" style={{ marginTop: 10, color: "rgba(190,255,140,0.98)" }}>
                    {cancelMsg}
                  </p>
                ) : null}
                {cancelErr ? (
                  <p className="creditsHint" style={{ marginTop: 10, color: "rgba(255,140,140,0.92)" }}>
                    {cancelErr}
                  </p>
                ) : null}
              </div>

              <div className="currentPlanRight" style={{ gap: 10, display: "flex", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="chooseBtn is-blue"
                  onClick={scrollToPlans}
                  disabled={subLoading || cancelLoading}
                  title="Ver planos disponíveis"
                >
                  {subLoading ? "Aguarde..." : "Escolher / Trocar Plano"}
                </button>

                {showCancelBtn ? (
                  <button
                    type="button"
                    className="chooseBtn is-blue"
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading || subLoading}
                    title={cancelLoading ? "Cancelando..." : "Cancelar assinatura"}
                    style={{ filter: "brightness(0.95)" }}
                  >
                    {cancelLoading ? "Cancelando..." : "Cancelar Assinatura"}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="plansDivider" />

          <h3 className="plansSectionTitle" ref={plansSectionRef}>
            Planos do Sistema
          </h3>

          <TabBar
            value={tab}
            onChange={setTab}
            items={[
              { value: "pf", label: `Pessoa Física (${pfPlans.length})` },
              { value: "pj", label: `Pessoa Jurídica (${pjPlans.length})` },
            ]}
          />

          {subErr ? (
            <p className="creditsHint" style={{ marginTop: 10, color: "rgba(255,140,140,0.92)" }}>
              {subErr}
            </p>
          ) : null}

          {subCheckoutUrl ? (
            <p className="creditsHint" style={{ marginTop: 6 }}>
              <a
                href={subCheckoutUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "rgba(190,255,140,0.98)", fontWeight: 900 }}
              >
                Clique aqui para continuar a assinatura no Stripe
              </a>
            </p>
          ) : null}

          {loadingPlanos ? (
            <p className="creditsHint" style={{ marginTop: 10 }}>
              Carregando planos...
            </p>
          ) : errPlanos ? (
            <p className="creditsHint" style={{ marginTop: 10, color: "rgba(255,140,140,0.92)" }}>
              {errPlanos}
            </p>
          ) : shownPlans.length === 0 ? (
            <p className="creditsHint" style={{ marginTop: 10 }}>
              Nenhum plano encontrado para esta categoria.
            </p>
          ) : (
            <div
              id={`plans-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`plans-tab-${tab}`}
              className="plansScrollArea"
            >
              <div className="plansGrid">
                {shownPlans.map((p) => (
                  <PlanCard
                    key={p.id}
                    title={p.title}
                    price={p.price}
                    features={p.features}
                    ctaLabel={subLoading ? "Abrindo..." : p.cta}
                    variant={p.variant}
                    badge={p.badge}
                    disabled={p.disabled}
                    hint={p.hint}
                    onCta={() => handleChoose(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="plansDivider" />

          <h3 className="plansSectionTitle">Comprar Créditos Avulsos</h3>

          <p className="creditsLabel">Quantos créditos você deseja comprar?</p>

          <div className="creditsRow">
            <input
              className="creditsInput"
              type="number"
              min={1}
              value={credits}
              onChange={(e) => setCredits(Math.max(1, Math.floor(Number(e.target.value || 1))))}
              aria-label="Quantidade de créditos"
            />

            <button
              type="button"
              className="buyBtn is-green"
              onClick={handleBuyCredits}
              disabled={buyLoading || loadingPrice || !!errPrice || !pricePerCredit || subLoading || cancelLoading}
              title={buyLoading ? "Abrindo checkout..." : loadingPrice ? "Carregando preço..." : errPrice ? errPrice : ""}
            >
              <IconCheckCircle className="buyBtnIco" />
              {buyLoading ? "Abrindo..." : "Comprar Créditos"}
            </button>
          </div>

          <small className="creditsHint">{creditPriceText}</small>

          {buyErr ? (
            <p className="creditsHint" style={{ marginTop: 10, color: "rgba(255,140,140,0.92)" }}>
              {buyErr}
            </p>
          ) : null}

          {checkoutUrl ? (
            <p className="creditsHint" style={{ marginTop: 6 }}>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "rgba(190,255,140,0.98)", fontWeight: 900 }}
              >
                Clique aqui para continuar o pagamento no Stripe
              </a>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
