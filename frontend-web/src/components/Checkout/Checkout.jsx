// CheckoutConfirmPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../Pages/Pages.css";
import "./Checkout.css";

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1.15 14.2-3.5-3.5 1.41-1.41 2.09 2.1 5.32-5.32 1.41 1.41-6.73 6.72Z"
      />
    </svg>
  );
}

function IconCard(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 4H4V7h16v2ZM6 16h6v1H6v-1Z"
      />
    </svg>
  );
}

function IconBarcode(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M3 5h2v14H3V5Zm4 0h1v14H7V5Zm3 0h2v14h-2V5Zm4 0h1v14h-1V5Zm3 0h2v14h-2V5Zm4 0h1v14h-1V5Z"
      />
    </svg>
  );
}

function formatBRL(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export default function CheckoutConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:3000")
    .toString()
    .replace(/\/+$/, "");

  // ✅ dados vindos da tela anterior
  const state = location?.state || {};
  const initialCredits = Number(state?.credits ?? 1);
  const initialPricePerCredit = state?.pricePerCredit != null ? Number(state.pricePerCredit) : null;
  const planName = state?.planName || "Compra de Créditos Avulsos";

  const [credits, setCredits] = useState(
    Number.isFinite(initialCredits) ? Math.max(1, initialCredits) : 1
  );
  const [pricePerCredit, setPricePerCredit] = useState(
    Number.isFinite(initialPricePerCredit) && initialPricePerCredit > 0 ? initialPricePerCredit : null
  );

  const [loadingPrice, setLoadingPrice] = useState(pricePerCredit == null);
  const [errPrice, setErrPrice] = useState("");

  const [method, setMethod] = useState(""); // "card" | "boleto"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  // ✅ se não veio preço via state (ex: refresh), busca do back
  useEffect(() => {
    let alive = true;
    if (pricePerCredit != null) return;

    async function loadPrecoCredito() {
      setLoadingPrice(true);
      setErrPrice("");
      try {
        const res = await fetch(`${API_BASE}/api/preco-credito`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Erro ao buscar preço do crédito (${res.status})`);

        const valor = Number(json?.valor ?? 0);
        if (!Number.isFinite(valor) || valor <= 0) throw new Error("Preço do crédito inválido.");

        if (!alive) return;
        setPricePerCredit(valor);
      } catch (e) {
        if (!alive) return;
        setPricePerCredit(null);
        setErrPrice(e?.message || "Erro ao carregar preço do crédito.");
      } finally {
        if (!alive) return;
        setLoadingPrice(false);
      }
    }

    loadPrecoCredito();
    return () => {
      alive = false;
    };
  }, [API_BASE, pricePerCredit]);

  const subtotal = useMemo(() => {
    const p = Number(pricePerCredit ?? 0);
    return credits * p;
  }, [credits, pricePerCredit]);

  // ✅ chama sua rota Stripe e redireciona pro Checkout
  const handleConclude = async () => {
    setSubmitErr("");
    if (!method || credits < 1) return;
    if (!pricePerCredit) return;

    setIsSubmitting(true);
    try {
      const payload = {
        quantidade: credits,
        method, // "card" | "boleto" (opcional no back por enquanto)
      };

      const res = await fetch(`${API_BASE}/api/creditos/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Você precisa estar logado para comprar créditos.");
        throw new Error(data?.error || `Erro ao iniciar pagamento (${res.status}).`);
      }

      const url = data?.url;
      if (!url) throw new Error("Stripe não retornou a URL de pagamento.");

      // ✅ redireciona pro checkout Stripe
      window.location.href = url;
    } catch (e) {
      setSubmitErr(e?.message || "Falha ao iniciar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/app/planos");
  };

  return (
    <div className="pg-wrap">
      <section className="pg-card checkoutCard">
        <header className="checkoutCardHeader">
          <div className="checkoutHeaderLeft">
            <h1 className="checkoutCardTitle">Confirmação de Compra</h1>
            <p className="checkoutCardSubtitle">Revise os detalhes antes de concluir.</p>
          </div>

          <div className="checkoutHeaderRight">
            <span className="totalPill">
              <span className="totalPillLabel">Total</span>
              <span className="totalPillValue">
                {loadingPrice ? "—" : errPrice ? "—" : formatBRL(subtotal)}
              </span>
            </span>
          </div>
        </header>

        <div className="checkoutCardBody">
          <div className="checkoutTop">
            <div className="checkoutTopLeft">
              <h2 className="checkoutTitle">{planName}</h2>
              <p className="checkoutSubtitle">Escolha a forma de pagamento abaixo.</p>
            </div>
          </div>

          <div className="checkoutDivider" />

          {loadingPrice ? (
            <p className="creditsHint" style={{ marginTop: 0 }}>
              Carregando preço do crédito...
            </p>
          ) : errPrice ? (
            <p className="creditsHint" style={{ marginTop: 0, color: "rgba(255,140,140,0.92)" }}>
              {errPrice}
            </p>
          ) : null}

          {submitErr ? (
            <p className="creditsHint" style={{ marginTop: 0, color: "rgba(255,140,140,0.92)" }}>
              {submitErr}
            </p>
          ) : null}

          <div className="summaryGrid">
            <div className="summaryItem">
              <span className="summaryLabel">Quantidade de créditos</span>
              <div className="summaryValueRow">
                <input
                  className="creditsInput"
                  type="number"
                  min={1}
                  value={credits}
                  onChange={(e) => setCredits(Math.max(1, Number(e.target.value || 1)))}
                  aria-label="Quantidade de créditos"
                  disabled={isSubmitting}
                />
                <span className="summaryHint">créditos</span>
              </div>
            </div>

            <div className="summaryItem">
              <span className="summaryLabel">Valor por crédito</span>
              <span className="summaryValue">{pricePerCredit ? formatBRL(pricePerCredit) : "—"}</span>
            </div>

            <div className="summaryItem is-total">
              <span className="summaryLabel">Valor total a pagar</span>
              <span className="summaryValue is-strong">{pricePerCredit ? formatBRL(subtotal) : "—"}</span>
            </div>
          </div>

          <div className="checkoutDivider" />

          <h3 className="sectionTitle">Selecione a forma de pagamento</h3>

          <div className="payOptions" role="radiogroup" aria-label="Forma de pagamento">
            <label className={`payOption ${method === "card" ? "is-selected" : ""}`}>
              <input
                className="payRadio"
                type="radio"
                name="payment"
                value="card"
                checked={method === "card"}
                onChange={() => setMethod("card")}
                disabled={isSubmitting}
              />
              <div className="payOptionTop">
                <span className="payIconWrap">
                  <IconCard className="payIcon" />
                </span>
                <div className="payTexts">
                  <span className="payTitle">Cartão de Crédito</span>
                  <span className="payDesc">Aprovação rápida. Pague em 1x.</span>
                </div>
                {method === "card" && <IconCheck className="paySelectedIco" />}
              </div>
              <div className="payFoot">
                <span className="payMini">Você será direcionado para inserir os dados do cartão.</span>
              </div>
            </label>

            <label className={`payOption ${method === "boleto" ? "is-selected" : ""}`}>
              <input
                className="payRadio"
                type="radio"
                name="payment"
                value="boleto"
                checked={method === "boleto"}
                onChange={() => setMethod("boleto")}
                disabled={isSubmitting}
              />
              <div className="payOptionTop">
                <span className="payIconWrap">
                  <IconBarcode className="payIcon" />
                </span>
                <div className="payTexts">
                  <span className="payTitle">Boleto</span>
                  <span className="payDesc">Compensação em até 1–2 dias úteis.</span>
                </div>
                {method === "boleto" && <IconCheck className="paySelectedIco" />}
              </div>
              <div className="payFoot">
                <span className="payMini">Geraremos um boleto para pagamento (PDF/código).</span>
              </div>
            </label>
          </div>

          <div className="checkoutDivider" />

          <div className="checkoutActions">
            <div className="confirmNote">
              <IconCheck className="confirmNoteIco" />
              <span>
                Ao concluir, você confirma a compra de <b>{credits}</b> créditos no valor total de{" "}
                <b>{pricePerCredit ? formatBRL(subtotal) : "—"}</b>.
              </span>
            </div>

            <div className="checkoutBtns">
              <button type="button" className="cancelBtn" onClick={handleCancel} disabled={isSubmitting}>
                Cancelar Compra
              </button>

              <button
                type="button"
                className="concludeBtn"
                disabled={!method || credits < 1 || isSubmitting || !pricePerCredit || !!errPrice}
                onClick={handleConclude}
                title={!pricePerCredit ? "Preço do crédito indisponível" : ""}
              >
                {isSubmitting ? "Concluindo..." : "Concluir Compra"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
