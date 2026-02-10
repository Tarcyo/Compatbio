// AnalysisDetailsPage.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../Pages/Pages.css";
import "./AnalysesDetail.css";

function IconCheckCircle(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1.1 14.2-3.3-3.3 1.4-1.4 1.9 1.9 4.8-4.8 1.4 1.4-6.2 6.2Z"
      />
    </svg>
  );
}

function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 10.2V6h-2v7l5 3 1-1.7-4-2.1Z"
      />
    </svg>
  );
}

function IconXCircle(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm3.7 13.3-1.4 1.4L12 13.4l-2.3 2.3-1.4-1.4L10.6 12 8.3 9.7l1.4-1.4L12 10.6l2.3-2.3 1.4 1.4L13.4 12l2.3 2.3Z"
      />
    </svg>
  );
}

function normalizeStatus(s) {
  const raw = String(s || "").trim().toLowerCase();
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function statusMeta(status) {
  const s = normalizeStatus(status);

  if (s.includes("compat") && !s.includes("incompat")) {
    return { label: "Compatível", badgeCls: "detailsBadgeOk", iconCls: "is-ok", kind: "ok" };
  }

  if (s.includes("incompat")) {
    return { label: "Incompatível", badgeCls: "detailsBadgeBad", iconCls: "is-bad", kind: "bad" };
  }

  if (s.includes("anal") || s.includes("pend") || s.includes("parc")) {
    if (s.includes("pend")) return { label: "Pendente", badgeCls: "detailsBadgeWarn", iconCls: "is-warn", kind: "warn" };
    if (s.includes("parc")) return { label: "Parcial", badgeCls: "detailsBadgeWarn", iconCls: "is-warn", kind: "warn" };
    return { label: "Em Análise", badgeCls: "detailsBadgeWarn", iconCls: "is-warn", kind: "warn" };
  }

  return { label: status ? String(status) : "Em Análise", badgeCls: "detailsBadgeWarn", iconCls: "is-warn", kind: "warn" };
}

function formatDateTimeBR(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default function AnalysisDetailsPage() {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const solicitacao = location.state?.solicitacao || null;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove("pg-enter");
    void el.offsetHeight;
    el.classList.add("pg-enter");
  }, []);

  const chemical = useMemo(() => {
    return (
      solicitacao?.produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto?.NOME || "—"
    );
  }, [solicitacao]);

  const biological = useMemo(() => {
    return (
      solicitacao?.produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto?.NOME || "—"
    );
  }, [solicitacao]);

  const meta = useMemo(() => statusMeta(solicitacao?.STATUS), [solicitacao]);

  const dateTime = useMemo(
    () => formatDateTimeBR(solicitacao?.DATA_RESPOSTA),
    [solicitacao]
  );

  const dateText = useMemo(() => {
    if (!solicitacao) return "";
    if (!dateTime) return "Análise ainda não respondida.";
    return `Análise realizada em ${dateTime}`;
  }, [solicitacao, dateTime]);

  const detailText = useMemo(() => {
    if (!solicitacao) return "";

    const desc =
      typeof solicitacao?.DESCRICAO === "string"
        ? solicitacao.DESCRICAO.trim()
        : "";
    if (desc) return desc;

    const st = normalizeStatus(solicitacao?.STATUS);

    if (st.includes("incompat")) {
      return `De acordo com a análise realizada, o produto químico "${chemical}" e o produto biológico "${biological}" foram considerados INCOMPATÍVEIS sob as condições avaliadas. Recomenda-se evitar a mistura/uso conjunto e verificar alternativas ou orientações técnicas.`;
    }

    if (st.includes("compat") && !st.includes("incompat")) {
      return `De acordo com a análise realizada, o produto químico "${chemical}" e o produto biológico "${biological}" foram considerados COMPATÍVEIS sob as condições avaliadas. Isso indica que o uso conjunto não deve gerar efeitos negativos significativos na eficiência biológica.`;
    }

    return `Sua solicitação está em andamento. Assim que a análise for concluída, o resultado e o texto detalhado aparecerão aqui automaticamente.`;
  }, [solicitacao, chemical, biological]);

  const handleBack = () => navigate(-1);

  const StatusIcon =
    meta.kind === "ok" ? IconCheckCircle : meta.kind === "bad" ? IconXCircle : IconClock;

  if (!solicitacao) {
    return (
      <div className="pg-wrap detailsPage">
        <div className="analysisDetailsPage">
          <section
            ref={cardRef}
            className="pg-card detailsCard"
            aria-label="Detalhes da análise"
          >
            <header className="detailsCardHeader">
              <div className="detailsHeaderLeft">
                <h1 className="detailsCardTitle">Detalhes da Análise</h1>
                <div className="detailsMeta">Nenhuma análise selecionada.</div>
              </div>
            </header>

            <div className="detailsCardBody">
              <p className="detailsText">
                Volte para a tela de resultados e clique em “Detalhar Análise”.
              </p>

              <div className="detailsActions">
                <button
                  type="button"
                  className="detailsBackBtn"
                  onClick={handleBack}
                >
                  Voltar
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-wrap detailsPage">
      <div className="analysisDetailsPage">
        <section
          ref={cardRef}
          className="pg-card detailsCard"
          aria-label="Detalhes da análise"
        >
          <header className="detailsCardHeader">
            <div className="detailsHeaderLeft">
              <h1 className="detailsCardTitle">Detalhes da Análise</h1>
              <div className="detailsMeta">{dateText}</div>
            </div>

            <button
              type="button"
              className="detailsMiniBtn"
              onClick={handleBack}
            >
              Voltar
            </button>
          </header>

          <div className="detailsCardBody">
            <div className="detailsTop">
              <div className="detailsBlock">
                <div className="detailsLabel">Produto Químico</div>
                <div className="detailsValue" title={chemical}>
                  {chemical}
                </div>
              </div>

              <div className="detailsArrow" aria-hidden="true">→</div>

              <div className="detailsMid">
                <span className={`detailsBadge ${meta.badgeCls}`}>{meta.label}</span>
              </div>

              <div className="detailsBlock">
                <div className="detailsLabel">Produto Biológico</div>
                <div className="detailsValue" title={biological}>
                  {biological}
                </div>
              </div>
            </div>

            <div className="detailsBody">
              <div className="detailsStatusRow">
                <span className={`detailsStatusIcon ${meta.iconCls}`} aria-hidden="true">
                  <StatusIcon />
                </span>

                <h2 className="detailsStatusTitle">{meta.label}</h2>
              </div>

              <p className="detailsText">{detailText}</p>

              <div className="detailsActions">
                <button type="button" className="detailsBackBtn" onClick={handleBack}>
                  Voltar para Resultados
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
