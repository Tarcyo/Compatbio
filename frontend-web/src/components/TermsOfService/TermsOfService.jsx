import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./TermsOfService.css";

import background from "../../assets/background.png";

export default function TermsOfService() {
  const PROVIDER = useMemo(
    () => ({
      productName: "CompatBio",
      legalName: "SUA RAZÃO SOCIAL LTDA",
      tradeName: "CompatBio",
      cnpj: "00.000.000/0001-00",
      address: "Rua Exemplo, 123 – Bairro – Cidade/UF – CEP 00000-000",
      supportEmail: "suporte@seudominio.com",
      supportUrl: "https://seudominio.com/suporte",
      privacyUrl: "/privacidade",
      termsVersion: "v1.0",
      effectiveDate: "2026-02-09",
      forumCity: "Cidade/UF",
    }),
    []
  );

  const printPage = () => window.print();

  return (
    <main className="tos-page" style={{ backgroundImage: `url(${background})` }}>
      {/* ✅ ÚNICA exceção do scroll */}
      <Link className="tos-back-float" to="/" aria-label="Voltar">
        <span className="tos-back-float-ico" aria-hidden="true">
          ←
        </span>
        Voltar
      </Link>

      {/* ✅ O SCROLLBAR está aqui no card (tudo dentro rola) */}
      <section className="tos-card" role="document" tabIndex={0} aria-label="Termos de Serviço">
        {/* ✅ Header NÃO é sticky: ele também rola */}
        <header className="tos-header">
          <div className="tos-header-top">
            <div className="tos-header-spacer" aria-hidden="true" />
            <div className="tos-header-actions">
              <button type="button" className="tos-action-btn" onClick={printPage}>
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>

          <div className="tos-headline">
            <div className="tos-title-wrap">
              <h1 className="tos-title">Termos de Serviço</h1>
              <p className="tos-meta">
                {PROVIDER.tradeName} • {PROVIDER.termsVersion} • Vigente desde{" "}
                <strong>{PROVIDER.effectiveDate}</strong>
              </p>
            </div>

            <div className="tos-company" aria-label="Dados do fornecedor">
              <div className="tos-company-line">
                <span className="tos-company-label">Fornecedor</span>
                <span className="tos-company-value">{PROVIDER.legalName}</span>
              </div>
              <div className="tos-company-line">
                <span className="tos-company-label">CNPJ</span>
                <span className="tos-company-value">{PROVIDER.cnpj}</span>
              </div>
              <div className="tos-company-line">
                <span className="tos-company-label">Endereço</span>
                <span className="tos-company-value">{PROVIDER.address}</span>
              </div>
              <div className="tos-company-line">
                <span className="tos-company-label">Contato</span>
                <a className="tos-link" href={`mailto:${PROVIDER.supportEmail}`}>
                  {PROVIDER.supportEmail}
                </a>
              </div>
            </div>
          </div>

          <p className="tos-subtitle">
            Estes Termos regulam o uso do {PROVIDER.productName}. Ao acessar, contratar uma assinatura,
            comprar créditos ou utilizar o serviço, você declara que leu, entendeu e concorda com estas condições.
          </p>
        </header>

        <div className="tos-main">
          {/* Sumário (desktop) */}
          <aside className="tos-nav" aria-label="Sumário">
            <div className="tos-nav-title">Sumário</div>
            <a className="tos-nav-link" href="#definicoes">Definições</a>
            <a className="tos-nav-link" href="#aceite">Aceite e vigência</a>
            <a className="tos-nav-link" href="#conta">Conta e autenticação (Google)</a>
            <a className="tos-nav-link" href="#servico">Serviço, análises e limitações</a>
            <a className="tos-nav-link" href="#assinaturas">Assinaturas</a>
            <a className="tos-nav-link" href="#creditos">Créditos avulsos</a>
            <a className="tos-nav-link" href="#reembolsos">Cancelamento e reembolsos</a>
            <a className="tos-nav-link" href="#pagamentos">Pagamentos (Stripe)</a>
            <a className="tos-nav-link" href="#disputas">Disputas e chargebacks</a>
            <a className="tos-nav-link" href="#propriedade">Propriedade intelectual</a>
            <a className="tos-nav-link" href="#conduta">Conduta e uso proibido</a>
            <a className="tos-nav-link" href="#lgpd">Privacidade e LGPD</a>
            <a className="tos-nav-link" href="#responsabilidade">Responsabilidades</a>
            <a className="tos-nav-link" href="#alteracoes">Alterações</a>
            <a className="tos-nav-link" href="#foro">Lei aplicável e foro</a>

            <div className="tos-nav-footer">
              <a className="tos-nav-mini" href={PROVIDER.privacyUrl}>Política de Privacidade</a>
              <a className="tos-nav-mini" href={PROVIDER.supportUrl} target="_blank" rel="noreferrer">
                Suporte
              </a>
            </div>
          </aside>

          <div className="tos-content">
            {/* Sumário inline (mobile) */}
            <details className="tos-toc-inline">
              <summary>Ver sumário</summary>
              <div className="tos-toc-inline-links">
                <a href="#definicoes">Definições</a>
                <a href="#aceite">Aceite e vigência</a>
                <a href="#conta">Conta e autenticação</a>
                <a href="#servico">Serviço e análises</a>
                <a href="#assinaturas">Assinaturas</a>
                <a href="#creditos">Créditos</a>
                <a href="#reembolsos">Reembolsos</a>
                <a href="#pagamentos">Pagamentos</a>
                <a href="#disputas">Chargebacks</a>
                <a href="#lgpd">LGPD</a>
                <a href="#foro">Foro</a>
              </div>
            </details>

            <section id="definicoes" className="tos-section">
              <h2>1. Definições</h2>
              <ul>
                <li><strong>Plataforma/Serviço:</strong> o sistema {PROVIDER.productName} disponibilizado pelo Fornecedor.</li>
                <li><strong>Usuário:</strong> pessoa que acessa, contrata ou utiliza a Plataforma.</li>
                <li><strong>Conta Google:</strong> conta de terceiros (Google) usada para autenticação via OAuth.</li>
                <li><strong>Assinatura:</strong> plano recorrente mensal com acesso a recursos e/ou benefícios.</li>
                <li><strong>Créditos:</strong> saldo virtual pré-pago para adquirir análises e recursos avulsos.</li>
                <li><strong>Análise:</strong> serviço solicitado com créditos dentro da Plataforma.</li>
                <li><strong>Encaminhada para análise:</strong> status em que o processamento foi iniciado ou enviado para fila de execução.</li>
              </ul>
            </section>

            <section id="aceite" className="tos-section">
              <h2>2. Aceite, vigência e versão</h2>
              <p>
                Ao acessar, cadastrar-se, contratar uma assinatura, comprar créditos ou utilizar a Plataforma,
                você declara que leu, compreendeu e concorda com estes Termos.
              </p>
              <p>
                A versão vigente é <strong>{PROVIDER.termsVersion}</strong>, com início de vigência em{" "}
                <strong>{PROVIDER.effectiveDate}</strong>. Podemos registrar a versão aceita por você para fins de auditoria.
              </p>
            </section>

            <section id="conta" className="tos-section">
              <h2>3. Conta e autenticação via Google (OAuth)</h2>
              <p>
                O acesso é feito via autenticação do Google (OAuth 2.0). <strong>Nós não armazenamos sua senha do Google</strong>.
                Podemos armazenar identificadores e tokens necessários para autenticação/autorização, conforme Política de Privacidade.
              </p>
              <p className="tos-callout">
                <strong>Responsabilidade do Usuário:</strong> você é responsável por manter a segurança e o acesso à sua Conta Google
                (ex.: 2FA). Perdas de acesso, bloqueios, indisponibilidades ou falhas do Google fogem ao controle do Fornecedor, sem
                prejuízo dos direitos assegurados pela legislação aplicável.
              </p>
            </section>

            <section id="servico" className="tos-section">
              <h2>4. Serviço, análises e limitações</h2>
              <p>
                A Plataforma oferece funcionalidades e análises conforme descrito nas telas do aplicativo e no plano contratado.
                Alguns recursos podem depender de filas, disponibilidade técnica e priorização operacional.
              </p>

              <h3 className="tos-h3">4.1. Status de pedidos de análise</h3>
              <ul>
                <li><strong>Pendente:</strong> pedido registrado, ainda não encaminhado para processamento.</li>
                <li><strong>Encaminhada/Em processamento:</strong> pedido enviado para execução; pode iniciar a qualquer momento.</li>
                <li><strong>Concluída:</strong> resultado disponibilizado ao Usuário.</li>
              </ul>

              <h3 className="tos-h3">4.2. Uso informativo</h3>
              <p>
                Salvo indicação expressa, resultados têm caráter informativo e não substituem aconselhamento profissional.
                Você é responsável por decisões tomadas com base nos resultados.
              </p>
            </section>

            <section id="assinaturas" className="tos-section">
              <h2>5. Assinaturas mensais</h2>
              <p>
                A Assinatura é cobrada de forma recorrente mensal conforme plano e preço exibidos no momento da contratação.
              </p>

              <h3 className="tos-h3">5.1. Cancelamento</h3>
              <p>
                Você pode cancelar a assinatura a qualquer momento pela área da conta ou suporte. O cancelamento impede futuras
                cobranças após a confirmação, respeitando o ciclo vigente e regras do meio de pagamento.
              </p>

              <h3 className="tos-h3">5.2. Alterações de preço/benefícios</h3>
              <p>
                Podemos ajustar preços/benefícios mediante aviso. Se houver renovação automática, mudanças passam a valer no próximo ciclo.
              </p>
            </section>

            <section id="creditos" className="tos-section">
              <h2>6. Créditos avulsos</h2>
              <p>
                Créditos são saldo virtual pré-pago para aquisição de análises e recursos. São pessoais, vinculados à conta e destinados
                ao uso interno na Plataforma.
              </p>
              <ul>
                <li>Créditos não equivalem a moeda corrente e não geram juros.</li>
                <li>Podemos limitar compras em caso de suspeita de fraude ou abuso.</li>
              </ul>
            </section>

            <section id="reembolsos" className="tos-section">
              <h2>7. Cancelamento e reembolsos</h2>

              <p>
                Mantemos canais para cancelamento e solicitações de reembolso. Em contratações à distância (internet), o consumidor
                possui direito de arrependimento em até 7 (sete) dias, conforme legislação aplicável.
              </p>

              <h3 className="tos-h3">7.1. Assinatura: reembolso em até 7 dias</h3>
              <ul>
                <li>Você pode solicitar reembolso da assinatura em até <strong>7 dias</strong> da contratação (ou renovação), pelos canais oficiais.</li>
                <li>O estorno é realizado pelo mesmo meio de pagamento sempre que possível, respeitando prazos do banco/bandeira.</li>
              </ul>

              <h3 className="tos-h3">7.2. Créditos avulsos: reembolso em até 7 dias</h3>
              <ul>
                <li>Você pode solicitar reembolso em até <strong>7 dias</strong> da compra, desde que os créditos estejam <strong>não utilizados</strong>.</li>
                <li>Créditos consumidos correspondem a serviços solicitados/executados e <strong>não são reembolsáveis</strong>.</li>
                <li>Se parte foi usada, o reembolso (quando aplicável) limita-se ao <strong>saldo não utilizado</strong>.</li>
              </ul>

              <h3 className="tos-h3">7.3. Compra de análise com créditos: regra “1 hora / encaminhamento”</h3>
              <ul>
                <li>
                  Você pode solicitar estorno dos créditos em até <strong>1 hora</strong> após a compra, <strong>ou</strong> enquanto o pedido estiver
                  <strong> Pendente</strong> (não encaminhado), o que ocorrer primeiro.
                </li>
                <li>
                  Após <strong>Encaminhada/Em processamento</strong>, o pedido pode iniciar a execução a qualquer momento; por isso,
                  <strong> não haverá estorno</strong> dos créditos.
                </li>
              </ul>

              <h3 className="tos-h3">7.4. Como solicitar</h3>
              <p>
                Solicitações pela área logada (quando disponível) ou suporte:{" "}
                <a className="tos-link" href={`mailto:${PROVIDER.supportEmail}`}>{PROVIDER.supportEmail}</a>.
                Informe e-mail da conta, data da compra e o item (assinatura, créditos ou análise).
              </p>

              <p className="tos-callout">
                <strong>Observação:</strong> prazos de estorno variam conforme cartão/boleto e regras bancárias. Processaremos o mais rápido possível após aprovação.
              </p>
            </section>

            <section id="pagamentos" className="tos-section">
              <h2>8. Pagamentos (Stripe, cartão e boleto)</h2>
              <p>
                Pagamentos podem ser processados por provedores terceirizados (ex.: Stripe), com suporte a cartão e boleto.
                O processamento segue regras do provedor e das instituições financeiras.
              </p>
              <h3 className="tos-h3">8.1. Cartão</h3>
              <ul>
                <li>Confirmação pode variar conforme emissor.</li>
                <li>Estornos podem levar alguns dias até aparecerem na fatura.</li>
              </ul>
              <h3 className="tos-h3">8.2. Boleto</h3>
              <ul>
                <li>Compensação pode levar dias úteis.</li>
                <li>Para reembolso, podemos solicitar dados bancários do titular quando necessário.</li>
              </ul>
            </section>

            <section id="disputas" className="tos-section">
              <h2>9. Disputas, chargebacks e prevenção a fraudes</h2>
              <p>
                Disputas/chargebacks são contestações de cobrança junto ao emissor do cartão. Nesses casos, valores podem ser revertidos
                e taxas podem ser aplicadas pelo processador/bandeira.
              </p>
              <ul>
                <li>Antes de abrir disputa/chargeback, pedimos que você nos contate para tentarmos resolver rapidamente.</li>
                <li>Em suspeita de fraude/abuso, podemos suspender temporariamente a conta para investigação e proteção do sistema.</li>
              </ul>
            </section>

            <section id="propriedade" className="tos-section">
              <h2>10. Propriedade intelectual</h2>
              <p>
                A Plataforma, marcas, layout, conteúdos e softwares associados são protegidos. Você recebe licença limitada, não exclusiva
                e revogável para usar o Serviço conforme estes Termos.
              </p>
            </section>

            <section id="conduta" className="tos-section">
              <h2>11. Conduta do Usuário e uso proibido</h2>
              <p>Você concorda em não:</p>
              <ul>
                <li>Tentar acessar áreas restritas sem autorização.</li>
                <li>Explorar falhas, interferir no funcionamento ou contornar limitações técnicas.</li>
                <li>Realizar scraping/automação abusiva que degrade o serviço.</li>
                <li>Usar a Plataforma para fins ilegais, fraudulentos ou que violem direitos de terceiros.</li>
              </ul>
            </section>

            <section id="lgpd" className="tos-section">
              <h2>12. Privacidade e LGPD</h2>
              <p>
                O tratamento de dados pessoais ocorre conforme nossa Política de Privacidade. Você pode exercer seus direitos pelos canais
                indicados na Política.
              </p>
              <p>
                Política de Privacidade:{" "}
                <a className="tos-link" href={PROVIDER.privacyUrl}>{PROVIDER.privacyUrl}</a>.
              </p>
            </section>

            <section id="responsabilidade" className="tos-section">
              <h2>13. Responsabilidades e limitações</h2>
              <p>
                Envidamos esforços razoáveis para manter o serviço disponível e seguro, mas podem ocorrer interrupções por manutenção,
                atualizações, falhas de terceiros e eventos fora do nosso controle.
              </p>
              <p>
                Na máxima extensão permitida por lei, não nos responsabilizamos por danos indiretos, lucros cessantes, perda de dados
                ou interrupções decorrentes do uso do Serviço. Nada nestes Termos limita direitos que não possam ser limitados pela lei.
              </p>
            </section>

            <section id="alteracoes" className="tos-section">
              <h2>14. Alterações destes Termos</h2>
              <p>
                Podemos atualizar estes Termos. Mudanças relevantes podem exigir novo aceite. A versão vigente ficará disponível nesta página.
              </p>
            </section>

            <section id="foro" className="tos-section">
              <h2>15. Lei aplicável e foro</h2>
              <p>
                Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro de <strong>{PROVIDER.forumCity}</strong>, salvo quando a
                legislação aplicável determinar foro diverso.
              </p>
            </section>

            <div className="tos-divider" />

            <footer className="tos-footer">
              <p className="tos-footnote">
                Dúvidas? Fale com o suporte em{" "}
                <a className="tos-link" href={`mailto:${PROVIDER.supportEmail}`}>{PROVIDER.supportEmail}</a>.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}
