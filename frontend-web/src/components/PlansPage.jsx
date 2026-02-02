// PlansCreditsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Pages.css";
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

function PlanCard({
  title,
  price,
  interval = "/mês",
  badge,
  features,
  variant = "blue", // "blue" | "green"
  ctaLabel,
  onCta,
}) {
  return (
    <article className={`planTile ${variant === "green" ? "is-green" : ""}`}>
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

      {/* ✅ Scroll interno quando features forem muitas */}
      <ul className="planFeatures" aria-label="Recursos do plano">
        {features.map((t) => (
          <li key={t} className="planFeature">
            <IconCheckCircle className="planCheck" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`planBtn ${variant === "green" ? "is-green" : "is-blue"}`}
        onClick={onCta}
      >
        {ctaLabel}
      </button>
    </article>
  );
}

function TabBar({ value, onChange, items }) {
  return (
    <div className="plansTabsWrap">
      {/* ✅ Scroll horizontal automático quando não couber */}
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
  const navigate = useNavigate();

  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  const PRICE_PER_CREDIT = 2.0;

  // plano atual do usuário
  const [assinaturaData, setAssinaturaData] = useState(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [errPlano, setErrPlano] = useState("");

  // planos do sistema
  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [errPlanos, setErrPlanos] = useState("");

  // tab PF/PJ
  const [tab, setTab] = useState("pf"); // "pf" | "pj"

  // compra avulsa
  const [credits, setCredits] = useState(10);

  // ✅ busca plano atual
  useEffect(() => {
    let alive = true;

    async function loadPlanoAtual() {
      setLoadingPlano(true);
      setErrPlano("");

      try {
        const res = await fetch(`${API_BASE}/api/assinatura/atual`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error("Não autenticado");
          throw new Error(`Erro ao buscar assinatura (${res.status})`);
        }

        const data = await res.json();
        if (!alive) return;

        setAssinaturaData(data || null);
      } catch (e) {
        if (!alive) return;
        setAssinaturaData(null);
        setErrPlano(e?.message || "Erro ao carregar plano");
      } finally {
        if (!alive) return;
        setLoadingPlano(false);
      }
    }

    loadPlanoAtual();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // ✅ busca planos
  useEffect(() => {
    let alive = true;

    async function loadPlanos() {
      setLoadingPlanos(true);
      setErrPlanos("");

      try {
        const res = await fetch(`${API_BASE}/api/planos`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error("Não autenticado");
          throw new Error(`Erro ao buscar planos (${res.status})`);
        }

        const data = await res.json();
        if (!alive) return;

        setPlanos(Array.isArray(data?.planos) ? data.planos : []);
      } catch (e) {
        if (!alive) return;
        setPlanos([]);
        setErrPlanos(e?.message || "Erro ao carregar planos");
      } finally {
        if (!alive) return;
        setLoadingPlanos(false);
      }
    }

    loadPlanos();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // ✅ seu plano atual
  const currentPlan = useMemo(() => {
    if (!assinaturaData?.plano || !assinaturaData?.assinatura) {
      return {
        name: "—",
        subtitle: "",
        features: ["Nenhum plano vinculado"],
        badge: "",
      };
    }

    const planoNome = assinaturaData.plano?.NOME || "—";
    const quantMensal = assinaturaData.plano?.QUANT_CREDITO_MENSAL;
    const status = assinaturaData.assinatura?.STATUS || "—";
    const totalUsuarios = Array.isArray(assinaturaData?.clientesVinculados)
      ? assinaturaData.clientesVinculados.length
      : 0;

    const features = [
      `Status: ${status}`,
      `Créditos/mês: ${quantMensal ?? "—"}`,
      `Usuários na assinatura: ${totalUsuarios}`,
    ];

    return {
      name: planoNome,
      subtitle: "Plano vinculado à sua assinatura",
      features,
      badge:
        status?.toUpperCase() === "ATIVA"
          ? "Seu Plano Ativo"
          : `Status: ${status}`,
    };
  }, [assinaturaData]);

  // ✅ PF/PJ por enterprise
  const { pfPlans, pjPlans } = useMemo(() => {
    const isEnterprise = (name) =>
      typeof name === "string" && name.toLowerCase().includes("enterprise");

    const pj = planos.filter((p) => isEnterprise(p?.NOME));
    const pf = planos.filter((p) => !isEnterprise(p?.NOME));

    return { pfPlans: pf, pjPlans: pj };
  }, [planos]);

  const mapPlanoToCard = useCallback((p) => {
    const nome = p?.NOME || "Plano";
    const credito = p?.QUANT_CREDITO_MENSAL ?? "—";
    const price = "—";

    const features = [
      `Créditos/mês: ${credito}`,
      `Stripe ID: ${p?.ID_STRIPE || "—"}`,
    ];

    const isEnterprise =
      typeof nome === "string" && nome.toLowerCase().includes("enterprise");

    return {
      id: String(p?.ID),
      title: nome,
      price,
      features,
      cta: "Escolher Plano",
      variant: isEnterprise ? "green" : "blue",
      badge: isEnterprise ? "Para Empresas" : undefined,
    };
  }, []);

  const shownPlans = useMemo(() => {
    const list = tab === "pj" ? pjPlans : pfPlans;
    return list.map(mapPlanoToCard);
  }, [tab, pfPlans, pjPlans, mapPlanoToCard]);

  const handleChoose = (planoId) => {
    console.log("Escolher plano:", planoId);
    // futuro: iniciar checkout stripe / trocar plano etc.
  };

  const handleBuyCredits = () => {
    navigate("/app/confirmar-compra", {
      state: {
        credits,
        pricePerCredit: PRICE_PER_CREDIT,
      },
    });
  };

  return (
    <div className="pg-wrap">
      <section className="pg-card plansCard">
        <header className="plansCardHeader">
          <h1 className="plansCardTitle">Planos e Créditos</h1>
        </header>

        {/* ✅ Scroll vertical do conteúdo do card principal quando não couber */}
        <div className="plansCardBody">
          <h3 className="plansSectionTitle">Seu Plano Atual</h3>

          {loadingPlano ? (
            <p className="creditsHint" style={{ marginTop: 6 }}>
              Carregando plano atual...
            </p>
          ) : errPlano ? (
            <p
              className="creditsHint"
              style={{ marginTop: 6, color: "rgba(255,140,140,0.92)" }}
            >
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

                {/* ✅ Scroll interno se tiver muitos itens */}
                <ul className="currentPlanList" aria-label="Detalhes do plano">
                  {currentPlan.features.map((t) => (
                    <li key={t} className="currentPlanItem">
                      <IconCheckCircle className="currentPlanCheck" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="currentPlanRight">
                <button
                  type="button"
                  className="chooseBtn is-blue"
                  onClick={() => handleChoose("current_change")}
                >
                  Escolher Plano
                </button>
              </div>
            </div>
          )}

          <div className="plansDivider" />

          <h3 className="plansSectionTitle">Planos do Sistema</h3>

          <TabBar
            value={tab}
            onChange={setTab}
            items={[
              { value: "pf", label: `Pessoa Física (${pfPlans.length})` },
              { value: "pj", label: `Pessoa Jurídica (${pjPlans.length})` },
            ]}
          />

          {loadingPlanos ? (
            <p className="creditsHint" style={{ marginTop: 10 }}>
              Carregando planos...
            </p>
          ) : errPlanos ? (
            <p
              className="creditsHint"
              style={{ marginTop: 10, color: "rgba(255,140,140,0.92)" }}
            >
              {errPlanos}
            </p>
          ) : shownPlans.length === 0 ? (
            <p className="creditsHint" style={{ marginTop: 10 }}>
              Nenhum plano encontrado para esta categoria.
            </p>
          ) : (
            /* ✅ Scroll vertical da lista de planos quando não couber */
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
                    ctaLabel={p.cta}
                    variant={p.variant}
                    badge={p.badge}
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
              onChange={(e) =>
                setCredits(Math.max(1, Number(e.target.value || 1)))
              }
              aria-label="Quantidade de créditos"
            />

            <button
              type="button"
              className="buyBtn is-green"
              onClick={handleBuyCredits}
            >
              <IconCheckCircle className="buyBtnIco" />
              Comprar Créditos
            </button>
          </div>

          <small className="creditsHint">R$2,00 por crédito</small>
        </div>
      </section>
    </div>
  );
}
