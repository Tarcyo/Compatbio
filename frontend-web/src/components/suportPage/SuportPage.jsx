import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./SuportPage.css";

import background from "../../assets/background.png";

export default function SupportPage() {
  const PROVIDER = useMemo(
    () => ({
      productName: "CompatBio",
      supportEmail: "suporte@seudominio.com",
      dpoEmail: "dpo@seudominio.com",
      supportVersion: "v1.0",
      lastUpdated: "2026-02-09",
      termsUrl: "/termos",
      privacyUrl: "/privacidade",
    }),
    []
  );

  const printPage = () => window.print();

  return (
    <main className="sp-page" style={{ backgroundImage: `url(${background})` }}>
      {/* ✅ ÚNICA exceção do scroll */}
      <Link className="sp-back-float" to="/" aria-label="Voltar">
        <span className="sp-back-float-ico" aria-hidden="true">
          ←
        </span>
        Voltar
      </Link>

      {/* ✅ Scrollbar único: tudo aqui dentro rola */}
      <section className="sp-card" role="document" tabIndex={0} aria-label="Suporte">
        <header className="sp-header">
          <div className="sp-header-top">
            <div className="sp-header-spacer" aria-hidden="true" />
            <div className="sp-header-actions">
              <button type="button" className="sp-action-btn" onClick={printPage}>
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>

          <div className="sp-headline">
            <div>
              <h1 className="sp-title">Suporte</h1>
              <p className="sp-meta">
                {PROVIDER.productName} • {PROVIDER.supportVersion} • Atualizado em:{" "}
                <strong>{PROVIDER.lastUpdated}</strong>
              </p>

              <p className="sp-subtitle">
                Aqui você encontra respostas rápidas e orientações práticas. Se ainda precisar, fale com a gente por{" "}
                <a className="sp-link" href={`mailto:${PROVIDER.supportEmail}`}>
                  e-mail
                </a>
                .
              </p>
            </div>

            <div className="sp-box" aria-label="Canais de contato">
              <div className="sp-box-line">
                <span className="sp-box-label">Suporte</span>
                <span className="sp-box-value">
                  <a className="sp-link" href={`mailto:${PROVIDER.supportEmail}`}>
                    {PROVIDER.supportEmail}
                  </a>
                </span>
              </div>
              <div className="sp-box-line">
                <span className="sp-box-label">Privacidade (DPO)</span>
                <span className="sp-box-value">
                  <a className="sp-link" href={`mailto:${PROVIDER.dpoEmail}`}>
                    {PROVIDER.dpoEmail}
                  </a>
                </span>
              </div>
              <div className="sp-box-line">
                <span className="sp-box-label">Links</span>
                <span className="sp-box-value">
                  <a className="sp-link" href={PROVIDER.termsUrl} target="_blank" rel="noreferrer">
                    Termos
                  </a>{" "}
                  •{" "}
                  <a className="sp-link" href={PROVIDER.privacyUrl} target="_blank" rel="noreferrer">
                    Privacidade
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div className="sp-note">
            <strong>Dica:</strong> se for falar com o suporte, diga qual etapa você estava (ex.: “Solicitações”, “Resultados
            das análises”, “Histórico de compra”) e o que apareceu na tela.
          </div>
        </header>

        <div className="sp-main">
          {/* Sumário (desktop) */}
          <aside className="sp-nav" aria-label="Sumário">
            <div className="sp-nav-title">Sumário</div>
            <a className="sp-nav-link" href="#faq">
              1. FAQ
            </a>
            <a className="sp-nav-link" href="#solicitacao">
              2. Como fazer uma solicitação
            </a>
            <a className="sp-nav-link" href="#resposta">
              3. Onde ver a resposta
            </a>
            <a className="sp-nav-link" href="#reembolso-credito">
              4. Reembolso de crédito
            </a>
            <a className="sp-nav-link" href="#reembolso-dinheiro">
              5. Reembolso de compra
            </a>
            <a className="sp-nav-link" href="#contato">
              6. Contato
            </a>

            <div className="sp-nav-footer">
              <a className="sp-nav-mini" href={`mailto:${PROVIDER.supportEmail}`}>
                Enviar e-mail para suporte
              </a>
              <a className="sp-nav-mini" href={`mailto:${PROVIDER.dpoEmail}`}>
                Falar com DPO
              </a>
            </div>
          </aside>

          <div className="sp-content">
            {/* Sumário inline (mobile) */}
            <details className="sp-toc-inline">
              <summary>Ver sumário</summary>
              <div className="sp-toc-inline-links">
                <a href="#faq">FAQ</a>
                <a href="#solicitacao">Como solicitar</a>
                <a href="#resposta">Onde ver resposta</a>
                <a href="#reembolso-credito">Reembolso de crédito</a>
                <a href="#reembolso-dinheiro">Reembolso de compra</a>
                <a href="#contato">Contato</a>
              </div>
            </details>

            <section id="faq" className="sp-section">
              <h2>1. FAQ</h2>

              <h3 className="sp-h3">Como fazer uma solicitação?</h3>
              <p>
                Acesse a aba <strong>“Solicitações”</strong> e escolha uma combinação de produto químico e biológico. Em seguida,
                clique em <strong>“Solicitar”</strong>.
              </p>

              <h3 className="sp-h3">Onde ficará a resposta da minha solicitação?</h3>
              <p>
                As respostas das análises ficam na aba <strong>“Resultados das análises”</strong> e estarão listadas da mais
                recente para a mais antiga.
              </p>

              <h3 className="sp-h3">Posso pedir reembolso do meu crédito?</h3>
              <p>
                Pode sim! Em até <strong>1 hora</strong> após a solicitação de uma análise, você poderá desistir e pedir
                reembolso do seu crédito na aba <strong>“Resultados das análises”</strong>, clicando no botão{" "}
                <strong>“Reembolsar crédito”</strong>.
              </p>

              <h3 className="sp-h3">Posso pedir meu dinheiro de volta?</h3>
              <p>
                Pode sim! Ao fazer qualquer compra no sistema, você pode pedir seu dinheiro de volta indo até{" "}
                <strong>“Histórico de compra”</strong>, selecionar a compra que quer reembolsar e clicar no botão{" "}
                <strong>“Pedir reembolso”</strong>.
              </p>
              <p className="sp-callout">
                <strong>Importante:</strong> caso já tenha passado <strong>7 dias</strong> após a compra ou você já tenha gasto os
                créditos, a solicitação pode ser negada.
              </p>
            </section>

            {/* Seções “copiadas” do FAQ para link direto do sumário (boa UX) */}
            <section id="solicitacao" className="sp-section">
              <h2>2. Como fazer uma solicitação</h2>
              <p>
                Vá em <strong>“Solicitações”</strong> → escolha a combinação de produto químico e biológico → clique em{" "}
                <strong>“Solicitar”</strong>.
              </p>
            </section>

            <section id="resposta" className="sp-section">
              <h2>3. Onde ver a resposta</h2>
              <p>
                As análises ficam em <strong>“Resultados das análises”</strong>, ordenadas da mais recente para a mais antiga.
              </p>
            </section>

            <section id="reembolso-credito" className="sp-section">
              <h2>4. Reembolso de crédito</h2>
              <p>
                Em até <strong>1 hora</strong> após solicitar uma análise, você pode desistir e pedir reembolso do crédito em{" "}
                <strong>“Resultados das análises”</strong>, no botão <strong>“Reembolsar crédito”</strong>.
              </p>
            </section>

            <section id="reembolso-dinheiro" className="sp-section">
              <h2>5. Reembolso de compra</h2>
              <p>
                Acesse <strong>“Histórico de compra”</strong> → selecione a compra → clique em <strong>“Pedir reembolso”</strong>.
              </p>
              <p className="sp-callout">
                <strong>Lembrete:</strong> após <strong>7 dias</strong> da compra, ou se os créditos já foram usados, o pedido pode
                ser negado.
              </p>
            </section>

            <section id="contato" className="sp-section">
              <h2>6. Contato</h2>
              <p>
                <strong>Suporte:</strong>{" "}
                <a className="sp-link" href={`mailto:${PROVIDER.supportEmail}`}>
                  {PROVIDER.supportEmail}
                </a>
              </p>
              <p>
                <strong>Privacidade (DPO):</strong>{" "}
                <a className="sp-link" href={`mailto:${PROVIDER.dpoEmail}`}>
                  {PROVIDER.dpoEmail}
                </a>
              </p>

              <div className="sp-divider" />

              <footer className="sp-footer">
                <p className="sp-footnote">
                  Dúvidas gerais: use o e-mail do suporte. Assuntos de dados pessoais/LGPD: fale com o DPO.
                </p>
              </footer>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
