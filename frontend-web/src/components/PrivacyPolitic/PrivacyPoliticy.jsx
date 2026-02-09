import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./PrivacyPolitic.css";

import background from "../../assets/background.png";

export default function PrivacyPolicy() {
  const PROVIDER = useMemo(
    () => ({
      productName: "CompatBio",
      legalName: "SUA RAZÃO SOCIAL LTDA",
      tradeName: "CompatBio",
      cnpj: "00.000.000/0001-00",
      address: "Rua Exemplo, 123 – Bairro – Cidade/UF – CEP 00000-000",

      supportEmail: "suporte@seudominio.com",
      supportUrl: "https://seudominio.com/suporte",

      // ✅ DPO/Encarregado (recomendado pela LGPD/ANPD)
      dpoName: "NOME DO ENCARREGADO (DPO)",
      dpoEmail: "dpo@seudominio.com",

      termsUrl: "/termos",
      privacyVersion: "v1.0",
      lastUpdated: "2026-02-09",

      forumCity: "Cidade/UF",
    }),
    []
  );

  const printPage = () => window.print();

  return (
    <main className="pp-page" style={{ backgroundImage: `url(${background})` }}>
      {/* ✅ ÚNICA exceção do scroll */}
      <Link className="pp-back-float" to="/" aria-label="Voltar">
        <span className="pp-back-float-ico" aria-hidden="true">
          ←
        </span>
        Voltar
      </Link>

      {/* ✅ Scrollbar único: tudo aqui dentro rola */}
      <section className="pp-card" role="document" tabIndex={0} aria-label="Política de Privacidade">
        <header className="pp-header">
          <div className="pp-header-top">
            <div className="pp-header-spacer" aria-hidden="true" />
            <div className="pp-header-actions">
              <button type="button" className="pp-action-btn" onClick={printPage}>
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>

          <div className="pp-headline">
            <div>
              <h1 className="pp-title">Política de Privacidade</h1>
              <p className="pp-meta">
                {PROVIDER.tradeName} • {PROVIDER.privacyVersion} • Última atualização:{" "}
                <strong>{PROVIDER.lastUpdated}</strong>
              </p>

              <p className="pp-subtitle">
                Esta Política explica como coletamos, usamos, compartilhamos e protegemos dados pessoais no{" "}
                <strong>{PROVIDER.productName}</strong>. Ela deve ser lida junto dos{" "}
                <a className="pp-link" href={PROVIDER.termsUrl} target="_blank" rel="noreferrer">
                  Termos de Serviço
                </a>
                .
              </p>
            </div>

            <div className="pp-company" aria-label="Dados do controlador">
              <div className="pp-company-line">
                <span className="pp-company-label">Controlador</span>
                <span className="pp-company-value">{PROVIDER.legalName}</span>
              </div>
              <div className="pp-company-line">
                <span className="pp-company-label">Nome fantasia</span>
                <span className="pp-company-value">{PROVIDER.tradeName}</span>
              </div>
              <div className="pp-company-line">
                <span className="pp-company-label">CNPJ</span>
                <span className="pp-company-value">{PROVIDER.cnpj}</span>
              </div>
              <div className="pp-company-line">
                <span className="pp-company-label">Endereço</span>
                <span className="pp-company-value">{PROVIDER.address}</span>
              </div>
              <div className="pp-company-line">
                <span className="pp-company-label">Suporte</span>
                <a className="pp-link" href={`mailto:${PROVIDER.supportEmail}`}>
                  {PROVIDER.supportEmail}
                </a>
              </div>
              <div className="pp-company-line">
                <span className="pp-company-label">Encarregado (DPO)</span>
                <span className="pp-company-value">
                  {PROVIDER.dpoName} •{" "}
                  <a className="pp-link" href={`mailto:${PROVIDER.dpoEmail}`}>
                    {PROVIDER.dpoEmail}
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div className="pp-note">
            <strong>Resumo rápido:</strong> usamos login via Google (OAuth), não armazenamos sua senha do Google,
            processamos pagamentos via provedores (ex.: Stripe), e mantemos dados mínimos necessários para operar,
            cumprir a lei, prevenir fraudes e melhorar o serviço.
          </div>
        </header>

        <div className="pp-main">
          {/* Sumário (desktop) */}
          <aside className="pp-nav" aria-label="Sumário">
            <div className="pp-nav-title">Sumário</div>
            <a className="pp-nav-link" href="#escopo">1. Escopo</a>
            <a className="pp-nav-link" href="#dados-coletados">2. Quais dados coletamos</a>
            <a className="pp-nav-link" href="#fontes">3. Fontes dos dados</a>
            <a className="pp-nav-link" href="#finalidades">4. Como usamos</a>
            <a className="pp-nav-link" href="#bases-legais">5. Bases legais</a>
            <a className="pp-nav-link" href="#compartilhamento">6. Compartilhamento</a>
            <a className="pp-nav-link" href="#transferencia">7. Transferência internacional</a>
            <a className="pp-nav-link" href="#retencao">8. Retenção e descarte</a>
            <a className="pp-nav-link" href="#cookies">9. Cookies</a>
            <a className="pp-nav-link" href="#seguranca">10. Segurança</a>
            <a className="pp-nav-link" href="#direitos">11. Seus direitos</a>
            <a className="pp-nav-link" href="#criancas">12. Crianças e adolescentes</a>
            <a className="pp-nav-link" href="#alteracoes">13. Alterações</a>
            <a className="pp-nav-link" href="#contato">14. Contato</a>

            <div className="pp-nav-footer">
              <a className="pp-nav-mini" href={PROVIDER.termsUrl} target="_blank" rel="noreferrer">
                Termos de Serviço
              </a>
              <a className="pp-nav-mini" href={PROVIDER.supportUrl} target="_blank" rel="noreferrer">
                Suporte
              </a>
            </div>
          </aside>

          <div className="pp-content">
            {/* Sumário inline (mobile) */}
            <details className="pp-toc-inline">
              <summary>Ver sumário</summary>
              <div className="pp-toc-inline-links">
                <a href="#escopo">Escopo</a>
                <a href="#dados-coletados">Dados coletados</a>
                <a href="#finalidades">Finalidades</a>
                <a href="#bases-legais">Bases legais</a>
                <a href="#compartilhamento">Compartilhamento</a>
                <a href="#retencao">Retenção</a>
                <a href="#cookies">Cookies</a>
                <a href="#direitos">Direitos</a>
                <a href="#contato">Contato</a>
              </div>
            </details>

            <section id="escopo" className="pp-section">
              <h2>1. Escopo</h2>
              <p>
                Esta Política se aplica ao uso do {PROVIDER.productName}, incluindo navegação, criação de conta,
                assinatura, compra de créditos, solicitação de análises e atendimento de suporte.
              </p>
              <p>
                “Dados pessoais” são informações que identificam ou podem identificar uma pessoa natural.
                “Tratamento” inclui coletar, usar, armazenar, compartilhar e excluir dados.
              </p>
            </section>

            <section id="dados-coletados" className="pp-section">
              <h2>2. Quais dados coletamos</h2>

              <h3 className="pp-h3">2.1. Dados de conta e autenticação (Google OAuth)</h3>
              <ul>
                <li>Nome, e-mail e foto de perfil (conforme permissões/escopos autorizados).</li>
                <li>Identificador da conta e tokens necessários para manter sua sessão/autorização.</li>
                <li>Registros de login (data/hora, IP, dispositivo/navegador, eventos de segurança).</li>
              </ul>
              <p className="pp-callout">
                <strong>Não armazenamos sua senha do Google.</strong> O login é feito via OAuth, e você controla as permissões concedidas.
              </p>

              <h3 className="pp-h3">2.2. Dados de assinatura, créditos e transações</h3>
              <ul>
                <li>Plano contratado, status da assinatura, datas de renovação/cancelamento.</li>
                <li>Saldo e movimentação de créditos (compras, consumos, estornos).</li>
                <li>Histórico de pedidos/solicitações de análises (datas, status, consumo de créditos).</li>
              </ul>

              <h3 className="pp-h3">2.3. Dados de pagamento (processados por terceiros, ex.: Stripe)</h3>
              <ul>
                <li>
                  Dados necessários para cobrança e confirmação (por exemplo, status do pagamento, valor, moeda,
                  identificadores de transação).
                </li>
                <li>
                  Em geral, dados sensíveis de cartão (número completo, CVV) são tratados diretamente pelo provedor de pagamento.
                </li>
                <li>
                  Para boleto, podem ser solicitadas informações necessárias à emissão/compensação, conforme o meio de pagamento.
                </li>
              </ul>
              <p>
                Você pode consultar as políticas do provedor de pagamentos aplicável (por exemplo, Stripe) para entender como
                eles tratam dados pessoais.
              </p>

              <h3 className="pp-h3">2.4. Dados de uso, logs e diagnóstico</h3>
              <ul>
                <li>Eventos de navegação e uso de recursos (ex.: cliques, telas acessadas, erros).</li>
                <li>Dados técnicos (IP, tipo de dispositivo, sistema operacional, navegador, idioma, fuso horário aproximado).</li>
                <li>Logs para auditoria, prevenção a fraude e segurança.</li>
              </ul>

              <h3 className="pp-h3">2.5. Suporte e comunicações</h3>
              <ul>
                <li>Mensagens enviadas ao suporte, e-mails, solicitações e histórico de atendimento.</li>
                <li>Arquivos/anexos enviados (se houver), necessários para resolver sua solicitação.</li>
              </ul>

              <h3 className="pp-h3">2.6. Conteúdo enviado para análises</h3>
              <p>
                Dependendo do tipo de análise, você pode inserir ou enviar informações que podem conter dados pessoais.
                Recomendamos <strong>não enviar dados sensíveis</strong> (saúde, biometria, origem racial etc.) a menos que seja necessário
                e você tenha base legal/autoridade para isso.
              </p>
            </section>

            <section id="fontes" className="pp-section">
              <h2>3. Fontes dos dados</h2>
              <ul>
                <li><strong>Você:</strong> ao se cadastrar, contratar, comprar créditos, solicitar análises e falar com suporte.</li>
                <li><strong>Google:</strong> ao autenticar via OAuth e autorizar permissões.</li>
                <li><strong>Provedor de pagamento:</strong> confirmações e status de transações (ex.: Stripe).</li>
                <li><strong>Sistemas técnicos:</strong> logs e métricas gerados automaticamente para segurança e melhoria.</li>
              </ul>
            </section>

            <section id="finalidades" className="pp-section">
              <h2>4. Como usamos seus dados</h2>
              <ul>
                <li><strong>Prestar o serviço:</strong> criar/gerir conta, autenticar, permitir acesso e executar funcionalidades.</li>
                <li><strong>Processar assinatura e créditos:</strong> cobrança, renovação, cancelamento, estornos e controle de saldo.</li>
                <li><strong>Executar análises:</strong> processar solicitações e entregar resultados.</li>
                <li><strong>Suporte:</strong> responder solicitações e resolver problemas.</li>
                <li><strong>Segurança:</strong> prevenir fraudes, abusos, acessos indevidos e incidentes.</li>
                <li><strong>Conformidade:</strong> cumprir obrigações legais/regulatórias e responder autoridades quando exigido.</li>
                <li><strong>Melhoria do produto:</strong> diagnosticar falhas, medir desempenho e aprimorar experiência.</li>
              </ul>
            </section>

            <section id="bases-legais" className="pp-section">
              <h2>5. Bases legais (LGPD)</h2>
              <p>Tratamos dados pessoais com base em uma ou mais hipóteses legais, como:</p>
              <ul>
                <li><strong>Execução de contrato:</strong> para fornecer o serviço, assinatura, créditos e análises.</li>
                <li><strong>Cumprimento de obrigação legal/regulatória:</strong> registros, fiscal/contábil, prevenção a fraudes, etc.</li>
                <li><strong>Legítimo interesse:</strong> segurança, melhoria do serviço e prevenção a abusos (com avaliação e minimização).</li>
                <li><strong>Consentimento:</strong> quando exigido (por exemplo, comunicações opcionais), com possibilidade de revogação.</li>
              </ul>
            </section>

            <section id="compartilhamento" className="pp-section">
              <h2>6. Compartilhamento de dados</h2>
              <p>Podemos compartilhar dados com:</p>
              <ul>
                <li>
                  <strong>Google (OAuth):</strong> para autenticação e verificação de identidade conforme sua autorização.
                </li>
                <li>
                  <strong>Provedores de pagamento (ex.: Stripe):</strong> para processar cobranças por cartão e boleto,
                  prevenir fraude e confirmar transações.
                </li>
                <li>
                  <strong>Infraestrutura e hospedagem:</strong> provedores de nuvem, bancos de dados, e serviços de e-mail/monitoramento
                  estritamente necessários para operar.
                </li>
                <li>
                  <strong>Autoridades públicas:</strong> mediante obrigação legal, ordem judicial ou requisição válida.
                </li>
                <li>
                  <strong>Operações societárias:</strong> em caso de fusão, aquisição ou reorganização, com proteção contratual e aviso quando aplicável.
                </li>
              </ul>

              <p className="pp-callout">
                <strong>Importante:</strong> não vendemos seus dados pessoais.
              </p>
            </section>

            <section id="transferencia" className="pp-section">
              <h2>7. Transferência internacional</h2>
              <p>
                Alguns fornecedores (como serviços de nuvem, autenticação e pagamentos) podem processar dados em outros países.
                Quando aplicável, adotamos medidas contratuais e técnicas para proteger os dados, em conformidade com a legislação.
              </p>
            </section>

            <section id="retencao" className="pp-section">
              <h2>8. Retenção e descarte</h2>
              <p>
                Guardamos dados pelo tempo necessário para cumprir as finalidades desta Política, atender obrigações legais e resolver disputas.
                Depois, eliminamos ou anonimizamos, quando possível.
              </p>
              <ul>
                <li><strong>Conta:</strong> enquanto ativa; após exclusão, podemos manter registros mínimos para obrigações legais e prevenção a fraude.</li>
                <li><strong>Pagamentos:</strong> registros fiscais/contábeis conforme exigido por lei.</li>
                <li><strong>Logs de segurança:</strong> pelo tempo necessário para segurança e auditoria (incluindo prazos legais aplicáveis).</li>
                <li><strong>Suporte:</strong> por período razoável para histórico e qualidade do atendimento.</li>
              </ul>
            </section>

            <section id="cookies" className="pp-section">
              <h2>9. Cookies</h2>
              <p>
                Podemos usar cookies e tecnologias semelhantes para manter sessão, lembrar preferências e melhorar o desempenho do site.
                Você pode gerenciar cookies nas configurações do seu navegador. Algumas funções podem não operar corretamente se cookies forem bloqueados.
              </p>
            </section>

            <section id="seguranca" className="pp-section">
              <h2>10. Segurança</h2>
              <p>
                Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais, como criptografia em trânsito,
                controles de acesso, registros de auditoria, e boas práticas de desenvolvimento e operação.
              </p>
              <p>
                Nenhum sistema é 100% seguro. Se você suspeitar de uso indevido da sua conta, contate o suporte imediatamente.
              </p>
            </section>

            <section id="direitos" className="pp-section">
              <h2>11. Seus direitos (LGPD)</h2>
              <p>
                Você pode solicitar, entre outros, confirmação de tratamento, acesso, correção, anonimização, portabilidade,
                eliminação e informações sobre compartilhamento, conforme previsto na LGPD.
              </p>

              <h3 className="pp-h3">11.1. Como exercer seus direitos</h3>
              <p>
                Envie sua solicitação para{" "}
                <a className="pp-link" href={`mailto:${PROVIDER.dpoEmail}`}>
                  {PROVIDER.dpoEmail}
                </a>{" "}
                (Encarregado/DPO), com:
              </p>
              <ul>
                <li>Seu e-mail de cadastro no {PROVIDER.productName}</li>
                <li>Qual direito deseja exercer e o que precisa</li>
                <li>Informações adicionais para confirmar sua identidade (quando necessário)</li>
              </ul>

              <p className="pp-callout">
                <strong>Dica:</strong> para segurança, podemos pedir confirmação de identidade antes de atender solicitações.
              </p>
            </section>

            <section id="criancas" className="pp-section">
              <h2>12. Crianças e adolescentes</h2>
              <p>
                O {PROVIDER.productName} não é destinado a crianças. Se você for responsável legal e acreditar que uma criança nos forneceu dados pessoais,
                contate o encarregado (DPO) para providências.
              </p>
            </section>

            <section id="alteracoes" className="pp-section">
              <h2>13. Alterações desta Política</h2>
              <p>
                Podemos atualizar esta Política para refletir mudanças legais, técnicas ou operacionais. Quando relevante, avisaremos no app e/ou por e-mail.
                A versão vigente estará sempre disponível nesta página.
              </p>
            </section>

            <section id="contato" className="pp-section">
              <h2>14. Contato</h2>
              <p>
                <strong>Suporte:</strong>{" "}
                <a className="pp-link" href={`mailto:${PROVIDER.supportEmail}`}>
                  {PROVIDER.supportEmail}
                </a>
              </p>
              <p>
                <strong>Encarregado (DPO):</strong>{" "}
                <a className="pp-link" href={`mailto:${PROVIDER.dpoEmail}`}>
                  {PROVIDER.dpoEmail}
                </a>
              </p>
              <p>
                <strong>Endereço:</strong> {PROVIDER.address}
              </p>

              <div className="pp-divider" />

              <footer className="pp-footer">
                <p className="pp-footnote">
                  Esta Política deve ser interpretada em conjunto com os{" "}
                  <a className="pp-link" href={PROVIDER.termsUrl} target="_blank" rel="noreferrer">
                    Termos de Serviço
                  </a>
                  .
                </p>
              </footer>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
