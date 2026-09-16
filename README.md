<!--
/**
* README.md - Documentação Técnica Consolidada da Versão 15.1.0
* Painel de Estudos de Piano — Versão 15.1.0
* Aluno: Leonardo Moura | Data: 29/08/2026
*
* Responsabilidades:
* - Documentação arquitetural do Cockpit Unificado da Sala de Estudos e Ergonomia Split-View
* - Especificação das 6 abas principais e 5 sub-modos nativos da Sala de Estudos
* - Registro do Changelog consolidado da Versão 15.1.0 (e saneamento do backlog da V15.0)
* - Guia de execução e persistência SSOT no Google Drive
*
* Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
*/
-->

# 🎹 Painel_Zero (Versão 15.1.0 — Cockpit Unificado, Validação da Fase 1 & Saneamento de Telemetria)

> **Painel Web de Estudos de Piano — HMI de Alta Ergonomia & Neurociência da Aprendizagem**  
> Aluno: Leonardo Moura | Data: 29 de Agosto de 2026

---

## 🌟 1. Changelog da Versão 15.1.0 (Fase 1: Bugfixes Críticos de Telemetria)

1. **Acumulador de Acertos (9 Acertos Reais):** Registro integral e garantido dos 9 acertos nos 3 rounds do Modo Sanduíche via atualização síncrona do SSOT antes da conclusão do round.
2. **Cronometragem Contínua Real:** Substituição definitiva de tempos estáticos por contadores de segundos em tempo real (`swPracticeSecondsElapsed` e `swIntervalElapsedSeconds`).
3. **Pausa Ativa [P] Hands-Free:** Congelamento instantâneo de timers, metrônomo e contadores em todos os players da Sala de Estudos.
4. **Vasos Comunicantes:** Creditação automática dos minutos dos intervalos técnicos em `dailyStats.technicalMinutes` e `weeklyGoals.technicalDoneMinutes`.
5. **Calibração da Caixa 1 (Marco Zero D+1):** O término de blocos na Caixa 1 mantém `consolidated: false`, exigindo a validação da Auditoria a Frio pós-sono.
6. **Cockpit Split-View V15:** Preservação integral do layout ergonômico Canvas 70% + Sidebar 30%, Metrônomo com pulso luminoso e 5 sub-modos da Sala de Estudos.
7. **Ergonomia Split-View (Canvas 70% + Sidebar 30% Sticky):**
   * Substituição de sobreposições por modal/lightbox por um layout de duas colunas perfeitamente ancorado:
     * **Coluna Esquerda (Canvas de Partitura 68% - 70%):** Viewport ampliado com alto contraste (*Paper Effect*), renderização em alta resolução e zoom suave.
     * **Coluna Direita (Sidebar de Controle Fixo 30% - 32%):** `position: sticky; top: 90px;` contendo:
       * **Placar Visual Explícito:** Contadores grandes e luminosos de ✓ Acertos e ✗ Erros com indicador de meta do round (ex: 2 / 3 seguidos).
       * **Metrônomo com Pulso Luminoso:** LED visual síncrono ao WebAudio, display central de BPM e controles rápidos `[-5]`, `[-1]`, `[+1]`, `[+5]`.
       * **Controles Operacionais:** Pausa Ativa `[P]`, Ocultar Partitura (Drop-the-Prompt `[H]`), Micro-Pausa Neural (10s) e Cronômetro em tempo real.
   * **Responsividade Mobile:** Adaptação automática para coluna única com controles fixos e acessíveis.
8. **Barra Superior de Abas Sticky:**
   * Navegação principal com `position: sticky; top: 35px; z-index: 100; backdrop-filter: blur(10px);`. Permite alternar de aba instantaneamente sem precisar rolar páginas longas até o topo.
9. **Central Executiva na Aba Hoje & Fila Dinâmica de Missões:**
   * **Aba Hoje:** Central Executiva de Alto Nível com Briefing do Treinador Cognitivo, Termômetro Multi-Pilar, Calendário Preditivo de 7 Dias e Botão de Entrada Direta `▶ INICIAR SESSÃO DO DIA (1-CLIQUE)`.
   * **Sidebar Dinâmica de Missões na Sala de Estudos:** Sequência do dia com atualização em tempo real (`completed: true` e check verde ✅).
   * **Sugestor Adaptativo de Tempo Extra (Over-Time Engine):** Ao terminar a rotina, o motor prescreve treinos complementares de baixo estresse cognitivo (Leitura Primer, Sorteio Intercalado em Caixas 2 e 3, Expansão Técnica).

---

## 🛠️ 2. Saneamento do Backlog Técnico (Leitner & Motor Adaptativo)

* **Correção do Falso Positivo Leitner (`neuroEngine.js`):** Trechos aprovados no 1º tiro da Auditoria avançam para `box: 2`, mas mantêm `consolidated: false` (Status: "Estável / D+2"). A tag `consolidated: true` só é atribuída a partir da **Caixa 4 (7 dias)** ou **Caixa 5 (14 dias)** [10].
* **Correção do Gatilho do Bloco B (`neuroEngine.js`):** O Bloco B (Micro-Reparo) só é ativado se houver falhas reais (`t.slips > 0` ou erro na auditoria a frio do dia). A condição `lifetimeAttempts > 0` foi removida [11].
* **Sincronização do Desbloqueio de Passo 2 (`repertoire.js` & `neuroEngine.js`):** Validação estrita de que todos os `baseBlockIds` de um trecho candidato de Passo 2 estejam com `box >= 2` ou `consolidated === true` [11].
* **Matriz Higienizada de 35 Trechos (`repertoire.js`):**
  * **Peça 10 (Czech Song):** 9 trechos (10.1.1-4, 10.1.5-8, 10.1.9-12, 10.1.13-16, 10.1.17-20, 10.2.1-8, 10.2.9-16, 10.2.13-20, 10.4.1-20) [11].
  * **Peça 11 (A Pleasant Mood):** 7 trechos (11.1.1-4, 11.1.5-8, 11.1.9-12, 11.1.13-16, 11.2.1-8, 11.2.9-16, 11.4.1-16) [12].
  * **Peça 12 (Bourrée):** 9 trechos (12.1.1-4, 12.1.5-8, 12.1.9-12, 12.1.13-16, 12.1.17-20, 12.2.1-8, 12.2.9-16, 12.2.13-20, 12.4.1-20) [12].
  * **Peça 13 (Minuet em Fá Maior):** 10 trechos (13.1.1-4, 13.1.5-8, 13.1.9-12, 13.1.13-16, 13.1.17-20, 13.1.21-24 [mirrorOf: 13.1.1-4], 13.2.1-8, 13.2.9-16, 13.2.17-24, 13.4.1-24) [12].

---

## 📁 3. Estrutura dos Arquivos da Versão 15.1.0

```
0.Painel_Zero/V15.1/
├── index.html          # Shell visual com 6 Abas Sticky e Sala de Estudos (5 Modos Split-View)
├── state.js            # SSOT v15.1.0, persistDebounced, sanitização UTF-8 e Pub/Sub
├── audioTools.js       # Metrônomo WebAudio com Pulso Luminoso, Wake Lock & Lightbox
├── repertoire.js       # Matriz higienizada de 35 trechos, CDN Google Drive e desbloqueio JIT
├── neuroEngine.js      # Leitner calibrado, Over-Time Engine, Briefing e Pipeline diária
├── technical.js        # Pilar Técnico com CRUD dinâmico e Laboratório de Calibração (UTI)
├── reading.js          # Motor de Leitura Primer 299 One-Shot integrado à Sala de Estudos
├── charts.js           # Gráficos SVG (Pirâmide Leitner, 12 Tons, Radar Anti-Da Capo, Heatmap)
├── cloudSync.js        # Conector Nuvem, Prática Acústica e Histórico Paginado
├── sessionPlayer.js    # Sessão Guiada 1-Clique com Fila Dinâmica de Missões
├── sandwichPlayer.js   # Modo Sanduíche Split-View com 3x3 acertos e intervalo de 90s
├── randomPlayer.js     # Modo Sorteio Intercalado Split-View com telemetria bruta
├── freePlayer.js       # Modo Prática Livre Split-View com cronômetro contínuo e placar
├── app.js              # Despachante global, Central Executiva e atalhos Hands-Free
└── README.md           # Documentação técnica consolidada da Versão 15.1.0
```

---

## 🚀 4. Como Executar

1. Abra o arquivo `index.html` em qualquer navegador web moderno (Google Chrome, Microsoft Edge, Safari ou Firefox) [15].
2. Não requer instalação de dependências ou build steps (100% nativo em JavaScript ES6+, HTML5 e CSS3) [15].
3. Utilize os atalhos Hands-Free na estante: `Espaço` (Acerto), `E` (Erro), `M` (Metrônomo), `H` (Ocultar Partitura), `P` (Pausar), `N` (Próximo Bloco) [16].
