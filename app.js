/**
 * app.js - Camada de Controle de UI, Toast Notifications, Guardião de Contexto & Despachante Global
 * Painel de Estudos de Piano — Versão 15.0.0
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Despachante global de eventos via data-action para os 5 sub-modos da Sala de Estudos
 * - Central Executiva da Aba Hoje (Briefing, Metas Semanais, Calendário 7 Dias, Entrada Direta 1-Clique)
 * - Guardião de Contexto rigoroso contra Memory Leaks e execução residual de timers e áudio
 * - Gestão de atalhos de teclado Hands-Free / Pedal com feedback tátil (.pressed)
 * - Integração do Sugestor Adaptativo de Tempo Extra (Over-Time Engine)
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // CORREÇÃO CRÍTICA REGEX: Unifica tratamento de marcadores offline sem quebras de sintaxe markdown
    const cleanStr = String(dateStr).replace(/\s*(\(Offline\)|Offline|\$Offline\$)/i, "").trim();
    const parts = cleanStr.split(/[\/\-]/);
    
    if (parts.length === 3) {
        let year, month, day;
        if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
        }
        if (year < 100) year += 2000;
        const parsed = new Date(year, month, day);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

let isBriefingExpanded = false;

class AppClass {
    showToast(message, type = "info", duration = 3200) {
        const container = document.getElementById("toastContainer");
        if (!container) {
            console.log(`[Toast ${type}] ${message}`);
            return;
        }
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        let icon = "ℹ️";
        if (type === "success") icon = "✅";
        else if (type === "warn") icon = "⚠️";
        else if (type === "error") icon = "❌";
        
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)";
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

window.App = new AppClass();

document.addEventListener("DOMContentLoaded", () => {
    // Bootstrapper Defensivo: Garante presença dos Singletons antes da execução
    if (!window.StateManager) {
        console.error("[Bootstrapper] Falha: StateManager ausente. Abortando montagem.");
        return;
    }

    // 1. Inicializa o Estado Global
    const state = window.StateManager.init();
    
    // 2. Inicializa o Repertório com fallback de segurança
    if (window.RepertoireManager && typeof window.RepertoireManager.initRepertoire === "function") {
        window.RepertoireManager.initRepertoire();
    } else {
        console.warn("[Bootstrapper] RepertoireManager não carregado. Operando em modo de segurança.");
    }
    
    // 3. Inscreve a UI para re-renderizar de forma INTELIGENTE e GRANULAR
    window.StateManager.subscribe((currentState, actionLabel) => {
        console.log(`[App] Estado atualizado (${actionLabel})`);
        
        // --- META 1.5 (CORREÇÃO V16.4.1): Blindagem Autoritária de Foco ---
        // Roda a checagem do "Session Focus Lock" imediatamente após QUALQUER mudança de estado
        if (typeof updateFocusLockState === 'function') {
            updateFocusLockState(currentState);
        }
        const microActions = [
            "ACCUMULATE_FOCUS_MINUTE",
            "ACCUMULATE_TECH_MINUTE",
            "ACCUMULATE_GUIDED_MINUTE",
            "ACCUMULATE_FREE_MINUTE",
            "SW_HIT",
            "SW_MISS",
            "RANDOM_HIT",
            "RANDOM_MISS",
            "FREE_HIT",
            "FREE_MISS",
            "SW_PAUSE",
            "TOGGLE_SW_PAUSE",
            "TICK_INTERVAL_SILENT",
            "FINISH_GUIDED_SESSION",
            "FINISH_SANDWICH_SESSION",
            "FINISH_RANDOM_SESSION",
            "FINISH_FREE_PRACTICE",
            "EVALUATE_TECH_PRACTICE_SUCCESS",
            "EVALUATE_TECH_PRACTICE_ADJUST"
        ];
        
        if (microActions.includes(actionLabel) || actionLabel.startsWith("SW_") || actionLabel.startsWith("RANDOM_") || actionLabel.startsWith("FREE_") || actionLabel.startsWith("FINISH_")) {
            renderDailySummary(currentState);
            renderGamificationHeader(currentState);
            renderTodayTabComponents(currentState); // 🎯 Força a re-renderização imediata da Aba Hoje (Metas e Gráficos)
            
            // Renderização granular do player ativo
            if (actionLabel.startsWith("SW_") || actionLabel === "TOGGLE_SW_PAUSE" || actionLabel === "TICK_INTERVAL_SILENT" || actionLabel === "FINISH_SANDWICH_SESSION") {
                if (window.SandwichPlayer) window.SandwichPlayer.renderUI(currentState);
            } else if (actionLabel.startsWith("RANDOM_") || actionLabel === "FINISH_RANDOM_SESSION") {
                if (window.RandomPlayer) window.RandomPlayer.renderUI(currentState);
            } else if (actionLabel.startsWith("FREE_") || actionLabel === "TOGGLE_FREE_PAUSE" || actionLabel === "FINISH_FREE_PRACTICE") {
                if (window.FreePlayer) window.FreePlayer.renderUI(currentState);
            }
            
            // CORREÇÃO CRÍTICA V15.2: Se houver uma Sessão Guiada ativa em andamento,
            // força a Fila Dinâmica lateral a re-renderizar as metas e status a cada ação!
            if (currentState.sessionState && currentState.sessionState.guidedActive) {
                if (window.SessionPlayer) window.SessionPlayer.renderUI(currentState);
            } else if (actionLabel === "FINISH_GUIDED_SESSION") {
                // Ao terminar a sessão guiada, re-renderiza o app inteiro para voltar à aba principal
                renderApp(currentState);
            }
        } else {
            renderApp(currentState);
        }
    });
    
    // 4. Configura ouvintes de eventos globais e atalhos Hands-Free
    setupGlobalEventListeners();
    setupHandsFreeShortcuts();
    
    // 5. Primeira renderização da aplicação
    renderApp(state);
    populateOfflineSelects(state);
    console.log("[App] Painel de Estudos Versão 15.0 inicializado com Cockpit Unificado & Split-View.");
});

function renderApp(state) {
    renderTabs(state.activeTab);
    renderSalaSubtabs(state.salaMode || "guided");
    renderTodayTabComponents(state);
    
    if (window.SessionPlayer) window.SessionPlayer.renderUI(state);
    if (window.SandwichPlayer) window.SandwichPlayer.renderUI(state);
    if (window.RandomPlayer) window.RandomPlayer.renderUI(state);
    if (window.ReadingManager) window.ReadingManager.renderUI(state);
    if (window.FreePlayer) window.FreePlayer.renderUI(state);
    if (window.TechnicalManager) window.TechnicalManager.renderUI(state);
    
    // Otimização de Performance: Renderiza gráficos apenas se a aba estiver em foco
    if (window.ChartsManager && state.activeTab === "progresso") {
        window.ChartsManager.renderAll(state);
    }
    
    if (window.CloudSync) {
        window.CloudSync.renderHistoryTable(state);
        const urlInput = document.getElementById("cloudUrlInput");
        // Previne o "Focus Stealing" e perda de dados se o usuário estiver digitando
        if (urlInput && state.cloudSyncUrl && document.activeElement !== urlInput) {
            urlInput.value = state.cloudSyncUrl;
        }
    }
    
    renderDailySummary(state);
    renderRepertoireTab(state);
    renderGamificationHeader(state);
    
    // --- META 1.5: Gerenciador de Isolamento do Modo Foco ---
    updateFocusLockState(state);
}

/**
 * Controla a visibilidade física do menu de navegação baseando-se no estado dos players ativos (Meta 1.5)
 * Versão Definitiva: Garante reativação imediata das abas fora dos momentos de execução ativa.
 */
function updateFocusLockState(state) {
    // 1. Verificação rigorosa de execução ativa vinculada estritamente à aba visível
    const isGuidedRunning = Boolean(state.activeTab === "sala" && state.salaMode === "guided" && state.sessionState && state.sessionState.inProgress === true && state.sessionState.guidedActive === true);
    const isSandwichRunning = Boolean(state.activeTab === "sala" && state.salaMode === "sandwich" && state.sandwichState && state.sandwichState.active === true && state.sandwichState.finished !== true);
    const isRandomRunning = Boolean(state.activeTab === "sala" && state.salaMode === "random" && state.randomSessionState && state.randomSessionState.active === true && state.randomSessionState.finished !== true);
    const isFreeRunning = Boolean(state.activeTab === "sala" && state.salaMode === "free" && state.freePracticeState && state.freePracticeState.active === true && state.freePracticeState.finished !== true);
    
    // Leitura só bloqueia o foco se o usuário realmente clicou em iniciar o timer de 30s ou foi para execução ativa
    const isReadingRunning = Boolean(
        state.activeTab === "sala" &&
        state.salaMode === "reading" &&
        window.ReadingManager &&
        (window.ReadingManager.currentPhase === "execution" ||
         (window.ReadingManager.currentPhase === "analysis" && window.ReadingManager.isAnalysisActive === true))
    );

    const isFocusLocked = isGuidedRunning || isSandwichRunning || isRandomRunning || isReadingRunning || isFreeRunning;

    // --- ENGENHARIA DE BOTÃO FLUTUANTE DE EMERGÊNCIA (ESCAPE LOCK) ---
    let escBtn = document.getElementById("btnFocusLockEmergencyEscape");
    if (isFocusLocked) {
        if (!escBtn) {
            escBtn = document.createElement("button");
            escBtn.id = "btnFocusLockEmergencyEscape";
            escBtn.setAttribute("data-action", "emergency-escape-to-home");
            escBtn.innerHTML = "🔓 DESTRANCAR COCKPIT";
            escBtn.style.cssText = "position: fixed; bottom: 15px; left: 15px; z-index: 99999; background: #991b1b; color: #fff; border: 1px solid #f87171; border-radius: 50px; padding: 10px 16px; font-weight: 800; font-size: 0.72rem; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);";
            document.body.appendChild(escBtn);
        }
    } else {
        if (escBtn) escBtn.remove();
    }

    // 2. Manipulação de Estilos (Injeção CSS Autoritária)
    let focusStyle = document.getElementById("focus-lock-style");
    if (!focusStyle) {
        focusStyle = document.createElement("style");
        focusStyle.id = "focus-lock-style";
        document.head.appendChild(focusStyle);
    }

    const tabsNav = document.querySelector(".tabs");
    const guidedBtn = document.getElementById("btnSubtabGuided");
    const parentContainer = guidedBtn ? guidedBtn.parentElement : null;

    if (isFocusLocked) {
        // --- MODO FOCO ATIVO (Oculta tudo durante o treino) ---
        focusStyle.innerHTML = `
            .tabs { display: none !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; pointer-events: none !important; }
            [id^=\"btnSubtab\"] { display: none !important; }
            .focus-lock-hide-parent { display: none !important; margin: 0 !important; padding: 0 !important; height: 0 !important; overflow: hidden !important; border: none !important; }
            body.focus-lock-active { padding-top: 10px !important; }
        `;
        document.body.classList.add("focus-lock-active");

        if (tabsNav) tabsNav.style.display = "none";
        if (parentContainer) parentContainer.classList.add("focus-lock-hide-parent");

    } else {
        // --- MODO LIVRE / SETUP (Restaura imediatamente todas as abas) ---
        focusStyle.innerHTML = "";
        document.body.classList.remove("focus-lock-active");

        if (tabsNav) {
            tabsNav.style.display = "";
            tabsNav.style.opacity = "1";
            tabsNav.style.height = "";
        }

        if (parentContainer) {
            parentContainer.classList.remove("focus-lock-hide-parent");
        }

        // Garante que os botões de sub-abas voltem a exibir o flex/display original
        document.querySelectorAll('[id^="btnSubtab"]').forEach(btn => {
            btn.style.display = "";
        });
    }
}

function renderTodayTabComponents(state) {
    renderPredictiveCalendar(state);
    
    // CORREÇÃO: Chama o renderizador robusto e granularizado do charts.js
    if (window.ChartsManager) window.ChartsManager.renderWeeklyGoals(state);
    
    renderMorningBriefing(state);
    renderExecutiveActionCard(state);
    renderColdAuditInline(state);
    // 🧠 META 5.3: Ativação Síncrona do Card de Recall Ativo de Escalas
    renderTechnicalRecallCard(state);
}

function renderGamificationHeader(state) {
    const lvlBadge = document.getElementById("playerLevelBadge");
    const xpFill = document.getElementById("playerXpFill");
    const xpLabel = document.getElementById("playerXpLabel");
    
    // Puxa as propriedades recalculadas dinamicamente de forma segura
    const pLevel = state.playerLevel || { level: 1, title: "Iniciante Consciente", currentXp: 0, nextLevelXp: 500 };
    const xp = state.xp || 0;
    
    if (lvlBadge) lvlBadge.textContent = `Nível ${pLevel.level} — ${pLevel.title}`;
    if (xpLabel) xpLabel.textContent = `${xp} XP acumulados (Próximo Nível: ${pLevel.nextLevelXp} XP)`;
    if (xpFill) {
        // Renderiza a porcentagem dinâmica baseada no XP total acumulado em relação ao alvo do nível
        const pct = Math.min(100, Math.round((xp / pLevel.nextLevelXp) * 100));
        xpFill.style.width = `${pct}%`;
    }
}

/*/ --- CENTRAL EXECUTIVA DA ABA HOJE (TIERS COGNITIVOS & UCC) ---
function renderExecutiveActionCard(state) {
    const container = document.getElementById("executiveActionCardContainer");
    if (!container) return;
    
    const currentTier = state.currentTier || 3;
    const currentUcc = (state.dailyStats && state.dailyStats.uccConsumed) || 0;
    const targetUcc = state.baselineUcc || 60;
    const baseGoalReached = currentUcc >= targetUcc;

    // 1. Pipeline base otimizado pelo motor pedagógico
    let pipeline = window.NeuroEngine ? window.NeuroEngine.generateDailyPipeline() : [];
    
    // 2. Filtro estrito de blocos na UI baseado no Tier Ativo (Tarefa 2.2)
    if (currentTier === 2) {
        // Modo Manutenção: Oculta e remove completamente o Bloco C (Aquisição)
        pipeline = pipeline.filter(b => b.id !== "block-c" && b.id !== "c");
/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    } else if (currentTier === 1) {
        // Modo Sobrevivência: Mostra apenas Auditoria a Frio (A) e Técnica Essencial (E)
        pipeline = pipeline.filter(b => b.id === "block-a" || b.id === "block-e" || b.id === "a" || b.id === "e");
    }
    let selectedBlockIds = state.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];
    
    // Alinha seleção de blocos ao pipeline filtrado do Tier
--- FIM ORIGINAL --- 

// --- NOVA LÓGICA (Inclusão Visual) ---
    } else if (currentTier === 1) {
        // Modo Sobrevivência: Mostra apenas Auditoria a Frio (A) e Técnica Essencial (E)
        pipeline = pipeline.filter(b => b.id === "block-a" || b.id === "block-e" || b.id === "a" || b.id === "e");
    }
    let selectedBlockIds = state.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-reading", "block-e"];
    
    // Alinha seleção de blocos ao pipeline filtrado do Tier
    selectedBlockIds = selectedBlockIds.filter(id => pipeline.some(b => b.id === id));

    const totalMins = pipeline.filter(b => selectedBlockIds.includes(b.id)).reduce((acc, b) => acc + (b.targetMinutes || 0), 0);
    
    // 🛡️ [CAMADA V] Banner de Acolhimento do Degelo
    const isThawActive = state.thawRecoveryState && state.thawRecoveryState.active;
    const thawMode = isThawActive ? state.thawRecoveryState.mode : "NONE";
    const missedDays = isThawActive ? state.thawRecoveryState.missedDays : 0;
    
    let thawBannerHtml = "";
    if (isThawActive) {
        let modeTitle = "Protocolo Retorno Seguro 2.0";
        let modeDesc = "";
        let color = "var(--accent2)";
        if (thawMode === "FULL_IMMUNITY") {
            modeTitle = "❄️ Modo Degelo Imune (Retorno de " + missedDays + " dias)";
            modeDesc = "Suas Caixas Leitner estão 100% protegidas contra rebaixamentos hoje. Aproveite para reaquecer e calibrar as mãos sem pressões de progresso!";
            color = "#38bdf8";
        } else if (thawMode === "SOFT_REGRESSION") {
            modeTitle = "🌊 Modo Degelo com Amortecedor (Retorno de " + missedDays + " dias)";
            modeDesc = "Proteção parcial ativa: hesitações ou erros causam apenas regressão suave (-1 nível de caixa) em vez de queda livre para a Caixa 1.";
            color = "var(--warn)";
        }
        
        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
                thawBannerHtml = `
                    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${color}; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="font-size: 1.5rem; line-height: 1;">🛡️</div>
                        <div style="flex: 1; text-align: left;">
                            <strong style="color: ${color}; font-size: 0.88rem; display: block; margin-bottom: 4px;">${modeTitle}</strong>
                            <span style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.4; display: block;">${modeDesc}</span>
                        </div>
                    </div>
                `;
            }
    // 🚀 [META 3 - TAREFA 3.1] Estilo do Hard Stop Visual (Zera a cobrança pós-meta)
--- FIM ORIGINAL --- *

// --- NOVA LÓGICA (Injeção do Alerta de Escassez de Virgens) ---
        thawBannerHtml = `
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${color}; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="font-size: 1.5rem; line-height: 1;">🛡️</div>
                <div style="flex: 1; text-align: left;">
                    <strong style="color: ${color}; font-size: 0.88rem; display: block; margin-bottom: 4px;">${modeTitle}</strong>
                    <span style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.4; display: block;">${modeDesc}</span>
                </div>
            </div>
        `;
    }

        // 📦 [WIDGET] Tanque de Estoque de Caixa 0 (Trechos Inéditos)
        const activePiecesForAlert = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        let scarcityBannerHtml = "";
        
        if (activePiecesForAlert.length > 0) {
            let virginBlocksCount = 0;
            // Soma todos os trechos virgens de todas as peças ativas (que não estão pausadas)
            activePiecesForAlert.forEach(p => {
                if (!p.isPaused) {
                    virginBlocksCount += (p.trechos || []).filter(t => t.passo === 1 && (t.box === 0 || t.box === undefined) && (t.lifetimeAttempts || 0) === 0).length;
                }
            });
            
            let tankColor = "#10b981"; // Verde
            let tankBg = "rgba(16, 185, 129, 0.1)";
            let tankStatus = "Estoque Farto. Material garantido para vários dias.";
            let tankIcon = "🟢";

            if (virginBlocksCount <= 2) {
                tankColor = "#ef4444"; // Vermelho
                tankBg = "rgba(239, 68, 68, 0.15)";
                tankStatus = virginBlocksCount === 0 
                    ? "Estoque Zerado! A aquisição do Sanduíche está travada." 
                    : "Escassez Crítica! O Sanduíche vai parar em breve.";
                tankIcon = "🔴";
            } else if (virginBlocksCount <= 5) {
                tankColor = "#fbbf24"; // Amarelo
                tankBg = "rgba(245, 158, 11, 0.15)";
                tankStatus = "Estoque Baixando. Hora de fatiar a próxima partitura.";
                tankIcon = "🟡";
            }

            // O máximo visual da barra de progresso será 10 trechos (se tiver mais, a barra fica 100% cheia)
            const fillPct = Math.min(100, Math.max(0, (virginBlocksCount / 10) * 100));

            scarcityBannerHtml = `
                <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; transition: all 0.3s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.25rem;">📦</span>
                            <strong style="color: #fff; font-size: 0.95rem;">Tanque de Inéditos (Caixa 0)</strong>
                        </div>
                        <div style="background: ${tankBg}; color: ${tankColor}; border: 1px solid ${tankColor}; padding: 4px 12px; border-radius: 8px; font-weight: 900; font-size: 0.95rem; box-shadow: 0 2px 8px ${tankBg};">
                            ${virginBlocksCount} Trecho${virginBlocksCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    
                    <!-- Barra de Combustível (Progresso) -->
                    <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);">
                        <div style="width: ${fillPct}%; height: 100%; background: ${tankColor}; border-radius: 5px; transition: width 0.5s ease-in-out; position: relative; overflow: hidden;">
                            <!-- Efeito de brilho na barra -->
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);"></div>
                        </div>
                    </div>
                    
                    <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 0.9rem;">${tankIcon}</span>
                        <span>${tankStatus}</span>
                    </div>
                </div>
            `;
        }

    // 🚀 [META 3 - TAREFA 3.1] Estilo do Hard Stop Visual (Zera a cobrança pós-meta)    
    let tierColor = "var(--accent)";
    let borderStyle = "1px solid var(--border)";
    let backgroundStyle = "var(--card)";
    let headerText = "🚀 Central de Prática do Dia";
    let subDescription = `Sequência otimizada: <strong>${pipeline.length} Blocos Ativos</strong> (~${totalMins} min)`;

    if (currentTier === 1) {
        tierColor = "var(--danger)";
        borderStyle = "2px dashed var(--danger)";
        backgroundStyle = "rgba(239, 68, 68, 0.05)";
        headerText = "🛡️ Modo Sobrevivência Ativo";
        subDescription = "Foco exclusivo na Auditoria a Frio. Zero cobrança de tempo semanais!";
    } else if (currentTier === 2) {
        tierColor = "var(--warn)";
        headerText = "⚡ Modo Manutenção Ativo";
        subDescription = "Bloco C suprimido para economizar energia pré-frontal.";
    }

    // Se bateu 100% das UCCs diárias (Hard Stop visual suave)
    if (baseGoalReached) {
        tierColor = "var(--accent2)";
        borderStyle = "2px solid var(--accent2)";
        backgroundStyle = "rgba(34, 197, 94, 0.05)";
        headerText = "🏆 Carga Cognitiva Batida!";
        subDescription = "Orçamento cumprido com louvor. Cockpit em Modo Livre (Camada 2)!";
    }

    /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    // 3. Montagem do HTML Dinâmico
    let html = `
        <div class="card" style="background: ${backgroundStyle}; border: ${borderStyle}; padding: 18px; border-radius: 16px; margin-bottom: 20px; transition: all 0.3s ease;">
            ${thawBannerHtml}
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
--- FIM ORIGINAL --- *

// --- NOVA LÓGICA (Injeção no DOM) ---
    // 3. Montagem do HTML Dinâmico
    let html = `
        <div class="card" style="background: ${backgroundStyle}; border: ${borderStyle}; padding: 18px; border-radius: 16px; margin-bottom: 20px; transition: all 0.3s ease;">
            ${thawBannerHtml}
            ${scarcityBannerHtml}
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h2 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 800;">${headerText}</h2>
                    <p style="margin: 3px 0 0; font-size: 0.78rem; color: var(--text-muted);">${subDescription}</p>
                </div>
                <div style="text-align: right;">
                    <span class="badge" style="background: ${tierColor}; color: #fff; font-size: 0.68rem; font-weight: 700; padding: 4px 8px;">
                        Tier ${currentTier} — ${currentTier === 3 ? 'Progressão' : (currentTier === 2 ? 'Manutenção' : 'Sobrevivência')}
                    </span>
                    <!-- Barra de progresso de Carga Cognitiva (UCC) -->
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px; font-weight: 700;">
                        Carga Diária: <span style="color: ${tierColor};">${currentUcc.toFixed(0)}</span> / ${targetUcc} UCC
                    </div>
                </div>
            </div>

            <!-- Lista de Blocos interativos -->
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px;">
                ${pipeline.map(block => {
                    const isSelected = selectedBlockIds.includes(block.id);
                    let fds = 1.0;
                    if (block.id.includes("a")) fds = 0.8;
                    else if (block.id.includes("b")) fds = 1.0;
                    else if (block.id.includes("c")) fds = 1.8;
                    else if (block.id.includes("d")) fds = 0.8;
                    else if (block.id.includes("e")) fds = 1.0;
                    else if (block.id.includes("reading")) fds = 0.3; // Fadiga mínima na leitura passiva
                    
                    const blockUcc = Math.round(block.targetMinutes * fds);
                    return `
                        <div class="routine-block-item" data-action="toggle-routine-block" data-block="${block.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: ${isSelected ? 'var(--card-inner)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${isSelected ? 'var(--border-hover)' : 'var(--border)'}; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" style="width: 15px; height: 15px; accent-color: ${tierColor};" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();">
                                <div style="text-align: left;">
                                    <strong style="font-size: 0.85rem; color: #fff;">${block.title}</strong>
                                    <span style="display: block; font-size: 0.72rem; color: var(--text-muted);">${block.desc || block.pedagogicalRationale}</span>
                                </div>
                            </div>
                            <div style="text-align: right; font-size: 0.72rem; font-weight: 700;">
                                <div style="color: var(--accent);">${block.targetMinutes} min</div>
                                <div style="color: var(--text-muted); font-size: 0.65rem; margin-top: 1px;">~${blockUcc} UCC</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${pipeline.every(b => b.inactive) ? `
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px dashed #10b981; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 18px;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🎹</div>
                <h4 style="color: #10b981; font-size: 1rem; margin: 0 0 4px;">Repertório Mielinizado!</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">Seu pipeline está vazio porque todas as peças ativas já atingiram consolidação sólida ou não possuem mais passagens atômicas virgens.</p>
                <button class="btn btn-outline" style="border-color: #10b981; color: #10b981; width: 100%; font-weight: 700;" data-action="switch-tab" data-tab="pecas">
                    ➕ Promover Nova Peça da Fila
                </button>
            </div>
            ` : ''}

            <!-- Botões Executivos Primários (Unificados e sem perda de dados) -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-guided-main" style="padding: 16px; font-size: 1rem; font-weight: 800; width: 100%;" data-action="launch-guided-session-direct">
                    ▶ INICIAR SESSÃO DO DIA (${totalMins} MIN)
                </button>
                
                ${baseGoalReached ? `
                    <button class="btn btn-outline" style="padding: 12px; font-weight: 700; font-size: 0.8rem; border-color: var(--accent2); color: var(--accent2); width: 100%; margin-top: 4px;" data-action="switch-sala-mode" data-mode="reading">
                        📚 Abrir Leitura Expandida (Camada 2 Desbloqueada!)
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    // 🎯 Aplica todo o HTML unificado (com os blocos e os botões corretos) no container
    container.innerHTML = html;
}*/
function renderExecutiveActionCard(state) {
    let container = document.getElementById("executiveActionCardContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "executiveActionCardContainer";
        const briefingNode = document.getElementById("morningBriefingContainer");
        if (briefingNode && briefingNode.parentNode) {
            briefingNode.parentNode.insertBefore(container, briefingNode.nextSibling);
        } else return;
    }
    
    // 🛡️ Banner Degelo
    const isThawActive = state.thawRecoveryState && state.thawRecoveryState.active;
    const thawMode = isThawActive ? state.thawRecoveryState.mode : "NONE";
    const missedDays = isThawActive ? state.thawRecoveryState.missedDays : 0;
    let thawBannerHtml = "";
    
    if (isThawActive) {
        let color = thawMode === "FULL_IMMUNITY" ? "#38bdf8" : "var(--warn)";
        let modeTitle = thawMode === "FULL_IMMUNITY" ? `❄️ Modo Degelo Imune (Retorno de ${missedDays} dias)` : `🌊 Modo Degelo com Amortecedor (Retorno de ${missedDays} dias)`;
        let modeDesc = thawMode === "FULL_IMMUNITY" ? "Suas Caixas Leitner estão 100% protegidas contra rebaixamentos hoje." : "Proteção parcial ativa: hesitações ou erros causam apenas regressão suave.";
        
        thawBannerHtml = `
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${color}; border-radius: 12px; padding: 12px 16px; margin-top: 24px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 1.5rem; line-height: 1;">🛡️</div>
                <div style="flex: 1; text-align: left;">
                    <strong style="color: ${color}; font-size: 0.88rem; display: block; margin-bottom: 4px;">${modeTitle}</strong>
                    <span style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.4; display: block;">${modeDesc}</span>
                </div>
            </div>
        `;
    }

    // 📦 [WIDGET] Tanque de Estoque de Caixa 0 Independente
    const activePiecesForAlert = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
    let scarcityBannerHtml = "";
    
    if (activePiecesForAlert.length > 0) {
        let virginBlocksCount = 0;
        activePiecesForAlert.forEach(p => {
            if (!p.isPaused) virginBlocksCount += (p.trechos || []).filter(t => t.passo === 1 && (t.box === 0 || t.box === undefined) && (t.lifetimeAttempts || 0) === 0).length;
        });
        
        let tankColor = "#10b981"; let tankBg = "rgba(16, 185, 129, 0.1)"; let tankIcon = "🟢";
        let tankStatus = "Estoque Farto. Material garantido para os próximos dias.";

        if (virginBlocksCount <= 2) {
            tankColor = "#ef4444"; tankBg = "rgba(239, 68, 68, 0.15)"; tankIcon = "🔴";
            tankStatus = virginBlocksCount === 0 ? "Estoque Zerado! A aquisição do Sanduíche está travada." : "Escassez Crítica! Fatie novas partituras urgente.";
        } else if (virginBlocksCount <= 5) {
            tankColor = "#fbbf24"; tankBg = "rgba(245, 158, 11, 0.15)"; tankIcon = "🟡";
            tankStatus = "Estoque Baixando. Hora de preparar a próxima partitura.";
        }

        const fillPct = Math.min(100, Math.max(0, (virginBlocksCount / 10) * 100));

        // Adicionada margem superior de 24px para criar o respiro visual perfeito
        scarcityBannerHtml = `
            <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.25rem;">📦</span>
                        <strong style="color: #fff; font-size: 0.95rem;">Tanque de Inéditos (Caixa 0)</strong>
                    </div>
                    <div style="background: ${tankBg}; color: ${tankColor}; border: 1px solid ${tankColor}; padding: 4px 12px; border-radius: 8px; font-weight: 900; font-size: 0.95rem;">
                        ${virginBlocksCount} Trecho${virginBlocksCount !== 1 ? 's' : ''}
                    </div>
                </div>
                <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="width: ${fillPct}%; height: 100%; background: ${tankColor}; border-radius: 5px; transition: width 0.5s ease-in-out;"></div>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 0.9rem;">${tankIcon}</span><span>${tankStatus}</span>
                </div>
            </div>
        `;
    }

    // O container limpo renderiza APENAS os widgets, deletando a Central de Prática inteira
    container.innerHTML = `
        ${thawBannerHtml}
        ${scarcityBannerHtml}
    `;
}

function renderPredictiveCalendar(state) {
    const container = document.getElementById("predictiveCalendarContainer");
    if (!container || !window.NeuroEngine) return;
    
    const forecast = window.NeuroEngine.generate7DayForecast(state);
    
    container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
    <div>
        <h2 style="margin: 0; font-size: 1.05rem; color: #fff;">📅 Projeção Preditiva de 7 Dias</h2>
        <p style="font-size: 0.76rem; color: var(--text-muted); margin-top: 1px;">
            Previsão adaptativa com recálculo pós-sono (deslize ou use as setas):
        </p>
    </div>
    <div style="display: flex; gap: 6px;">
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem;" data-action="scroll-forecast-left">◀ Anterior</button>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem;" data-action="scroll-forecast-right">Próximo ▶</button>
    </div>
</div>
<div id="predictiveGridWrapper" style="overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; padding: 6px 2px 10px;">
    <div class="predictive-grid" style="display: flex; gap: 10px; min-width: max-content;">
        ${forecast.map(d => `
        <div class="predictive-card ${d.isToday ? 'today' : ''}" style="flex: 0 0 240px; scroll-snap-align: start; text-align: left; padding: 14px; border-radius: 14px; background: var(--card-inner); border: 1px solid ${d.isToday ? 'var(--accent2)' : 'var(--border)'}; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="font-size: 0.88rem; color: #fff;">${d.dayLabel}</strong>
                    <span class="badge ${d.isToday ? 'accent2' : ''}" style="font-size: 0.68rem;">${d.dateStr}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--accent); font-weight: 700; margin-bottom: 8px;">
                    ⏱️ Estimado: ~${d.estMinutes} min
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
                    ${(d.tasks || []).map(t => `
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: ${d.isToday ? '#f1f5f9' : '#cbd5e1'}; line-height: 1.35;">
                        <input type="checkbox" class="forecast-task-check" data-day="${d.index !== undefined ? d.index : (d.isToday ? 0 : 1)}" data-task-id="${t.id || ''}" ${t.done ? 'checked' : ''} ${d.isToday ? '' : 'disabled'}>
                        <span style="${t.done ? 'text-decoration: line-through; opacity: 0.75;' : ''}">${t.label}</span>
                    </label>
                    `).join('')}
                </div>
            </div>
            ${d.isToday ? `
            <button class="btn btn-play-today-compact" data-action="start-selected-routine">
                ▶ Iniciar Prática
            </button>
            ` : ''}
        </div>
        `).join('')}
    </div>
</div>
`;
}

function calculateWeeklyProgress(state) {
    const history = state.history || [];
    const dailyStats = state.dailyStats || {};
    const goals = state.weeklyGoals || {
        repertoireTargetMinutes: 120,
        technicalTargetMinutes: 60,
        readingTotalCount: 5,
        technicalFocus: "Escala Fá# Maior & Arpejos nos 12 Tons"
    };
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    let repMins = (dailyStats.repertoireMinutes || 0);
    let techMins = (dailyStats.technicalMinutes || 0);
    let readMins = (dailyStats.readingMinutes || 0);
    let readCount = (dailyStats.readingMinutes > 0 ? 1 : 0);
    
    history.forEach(h => {
        let isThisWeek = true;
        if (h.date) {
            const hDate = parseDate(h.date);
            if (hDate && hDate < startOfWeek) isThisWeek = false;
            if (!hDate) isThisWeek = false; // Ignora se inválido
        }
        if (isThisWeek) {
            const mins = h.durationMinutes || 0;
            const type = (h.type || "").toLowerCase();
            const piece = (h.pieceId || "").toLowerCase();
            if (type.includes("técnica") || piece.includes("técnica") || piece.includes("escala")) {
                techMins += mins;
            } else if (type.includes("leitura") || piece.includes("primer") || piece.includes("leitura")) {
                readMins += mins;
                readCount += 1;
            } else {
                repMins += mins;
            }
        }
    });
    
    const repPct = Math.min(100, Math.round((repMins / (goals.repertoireTargetMinutes || 120)) * 100));
    const techPct = Math.min(100, Math.round((techMins / (goals.technicalTargetMinutes || 60)) * 100));
    const readPct = Math.min(100, Math.round((readCount / (goals.readingTotalCount || 5)) * 100));
    const globalPace = Math.round((repPct * 0.5) + (techPct * 0.3) + (readPct * 0.2));
    
    const wPace = state.weeklyOrchestrator ? (state.weeklyOrchestrator.weeklyPace || 1.0) : 1.0;
    let projDay = "Domingo";
    if (wPace >= 1.15) projDay = "Sexta-feira";
    else if (wPace >= 1.05) projDay = "Sábado";
    else if (wPace >= 0.90) projDay = "Domingo";
    else if (wPace >= 0.75) projDay = "Segunda-feira (Próx)";
    else projDay = "Terça-feira (Atraso)";

    return {
        ...goals,
        projectedEndDay: projDay,
        repertoireDoneMinutes: repMins,
        repertoirePct: repPct,
        technicalDoneMinutes: techMins,
        technicalPct: techPct,
        readingDoneCount: readCount,
        readingPct: readPct,
        globalPacePct: globalPace
    };
}
/*
function renderWeeklyGoals(state) {
    const container = document.getElementById("weeklyGoalsContainer");
    if (!container) return;
    
    const goals = calculateWeeklyProgress(state);
    
    container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px;">
        <h3 style="margin: 0; font-size: 1.05rem; color: #fff; display: flex; align-items: center; gap: 6px;">🎯 Metas da Semana (Multi-Pilar)</h3>
        <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #34d399; border: 1px solid rgba(34, 197, 94, 0.3); padding: 2px 8px; font-size: 0.7rem;">${goals.globalPacePct}% Concluído</span>
    </div>
    <button class="btn btn-outline" style="font-size: 0.72rem; padding: 5px 10px; background: var(--card-inner);" data-action="open-goals-modal">⚙️ Configurar Metas</button>
</div>

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">🎵 Repertório</span>
            <span style="font-size: 0.85rem; font-weight: 800; color: var(--accent);">${goals.repertoirePct}%</span>
        </div>
        <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div style="width: ${goals.repertoirePct}%; height: 100%; background: var(--accent); border-radius: 4px;"></div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Feito: <strong>${goals.repertoireDoneMinutes}</strong>/${goals.repertoireTargetMinutes || 120} min</div>
    </div>
    
    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">⚙️ Técnica</span>
            <span style="font-size: 0.85rem; font-weight: 800; color: var(--warn);">${goals.technicalPct}%</span>
        </div>
        <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div style="width: ${goals.technicalPct}%; height: 100%; background: var(--warn); border-radius: 4px;"></div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Feito: <strong>${goals.technicalDoneMinutes}</strong>/${goals.technicalTargetMinutes || 60} min</div>
    </div>
    
    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">📖 Leitura</span>
            <span style="font-size: 0.85rem; font-weight: 800; color: var(--accent2);">${goals.readingPct}%</span>
        </div>
        <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div style="width: ${goals.readingPct}%; height: 100%; background: var(--accent2); border-radius: 4px;"></div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Feito: <strong>${goals.readingDoneCount}</strong>/${goals.readingTotalCount || 5} Peças</div>
    </div>
</div>

<div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 1.1rem;">⚡</span>
    <span style="font-size: 0.8rem; color: #93c5fd; line-height: 1.4;">
        <strong>Ritmo Preditivo Global:</strong> Conclusão projetada para <strong>${goals.projectedEndDay || 'Domingo'}</strong> com ritmo de estudo atual.
    </span>
</div>
`;
}*/

function renderMorningBriefing(state) {
    const container = document.getElementById("morningBriefingContainer");
    if (!container || !window.NeuroEngine) return;
    
    const briefing = window.NeuroEngine.generateMorningBriefing(state);
    
    container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <h2 style="margin: 0; font-size: 1.05rem; color: #fff;">☕ Briefing do Treinador Cognitivo</h2>
    <span class="badge warn" style="font-size: 0.68rem;">Lógica Neurodidática</span>
</div>
<div class="briefing-box">
    <div class="briefing-section" style="${isBriefingExpanded ? 'margin-bottom: 10px;' : 'margin-bottom: 0;'}">
        <div class="briefing-title" style="color: var(--warn);">🎯 Por que a sessão de hoje foi montada assim:</div>
        <div style="font-size: 0.8rem; line-height: 1.45;">${briefing.justification}</div>
    </div>
    ${isBriefingExpanded ? `
    <div class="briefing-section">
        <div class="briefing-title">📖 Retrospectiva:</div>
        <div style="font-size: 0.8rem;">${briefing.retrospective}</div>
    </div>
    <div class="briefing-section" style="margin-bottom: 0;">
        <div class="briefing-title" style="color: var(--accent2);">🚀 Impacto no Estudo de Amanhã:</div>
        <div style="font-size: 0.8rem;">${briefing.projection}</div>
    </div>
    ` : ''}
</div>
<div style="display: flex; gap: 8px; margin-top: 10px;">
    <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem; padding: 7px 10px;" data-action="toggle-briefing-expand">
        ${isBriefingExpanded ? '▲ Recolher Detalhes' : '▼ Entender Lógica & Impacto de Amanhã'}
    </button>
    <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem; padding: 7px 10px;" data-action="copy-briefing">
        📋 Copiar Briefing
    </button>
</div>
`;
}

function renderColdAuditInline(state) {
    const container = document.getElementById("coldAuditInlineContainer");
    const cardEl = document.getElementById("coldAuditInlineCard");
    if (!container || !cardEl || !window.NeuroEngine) return;
    
    if (state.sessionState && state.sessionState.guidedActive) {
        cardEl.style.display = "none";
        return;
    } else {
        cardEl.style.display = "block";
    }
    
    const dueAudits = window.NeuroEngine.getDueColdAudits();
    if (dueAudits.length === 0) {
        container.innerHTML = `
<div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 0.85rem;">
    ✨ Todas as auditorias a frio de hoje estão concluídas!
</div>
`;
        return;
    }
    
    const currentAudit = dueAudits[0];
    const scoreUrl = typeof window.getScoreImageUrl === "function" ? window.getScoreImageUrl(currentAudit.trecho.label) : "";
    
    container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
    <h2 style="margin: 0; font-size: 1.05rem; color: #fff;">⚡ Auditoria Avulsa de 1º Tiro</h2>
    <span class="badge warn" style="font-size: 0.68rem;">${dueAudits.length} Pendente(s)</span>
</div>
<p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px;">
    Teste de retenção pós-sono avulso. Toque 1 única vez a frio:
</p>
<div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 8px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
        <h3 style="margin: 0; font-size: 0.98rem; color: #fff;">${currentAudit.pieceTitle}</h3>
        <span class="badge" style="background: #06b6d4; color: #04240f; font-weight: 700;">Caixa ${currentAudit.trecho.box}</span>
    </div>
    <div style="font-size: 0.88rem; font-weight: 700; color: var(--accent); margin-bottom: 6px;">
        ${currentAudit.trecho.label}
    </div>
    ${scoreUrl ? `
    <div class="score-container skeleton-pulse" style="min-height: 120px; position: relative; text-align: center; background: #000; border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">
        <img src="${scoreUrl}" alt="Partitura ${currentAudit.trecho.label}" class="sheet-paper-effect" style="max-height: 120px; max-width: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${scoreUrl}" data-title="${currentAudit.pieceTitle} — ${currentAudit.trecho.label}">
    </div>
    ` : ''}
    <div style="display: flex; gap: 8px;">
        <button class="btn-audit btn-audit-hit" style="padding: 12px;" data-action="audit-hit" data-piece="${currentAudit.pieceId}" data-trecho="${currentAudit.trecho.id}">
            ✔️ 1º Tiro Limpo (+15 XP)
        </button>
        <button class="btn-audit btn-audit-miss" style="padding: 12px;" data-action="audit-miss" data-piece="${currentAudit.pieceId}" data-trecho="${currentAudit.trecho.id}">
            ❌ Erro / Hesitação (Volta Cx 1)
        </button>
    </div>
</div>
`;
}

function renderDailySummary(state) {
    const totalMinEl = document.getElementById("statTotalMinutes");
    const sessionsEl = document.getElementById("statSessions");
    const sessionsLbl = document.getElementById("statSessionsLabel");
    const auditsEl = document.getElementById("statAudits");
    
    const dailyMins = (state.dailyStats && state.dailyStats.focusMinutes) || 0;
    const dailySessions = (state.dailyStats && state.dailyStats.completedSessions) || 0;
    const lifetimeSessions = (state.globalStats && state.globalStats.totalSessions) || 0;
    const dailyAudits = (state.dailyStats && state.dailyStats.completedAudits) || 0;
    
    if (totalMinEl) totalMinEl.textContent = dailyMins;
    if (sessionsEl) sessionsEl.textContent = dailySessions;
    if (sessionsLbl) sessionsLbl.innerHTML = `SESSÕES HOJE <br><small style="color:var(--text-muted); font-size:0.65rem;">(Total Vida: ${lifetimeSessions})</small>`;
    if (auditsEl) auditsEl.textContent = dailyAudits;
}

// --- REDESIGN DA ABA PEÇAS (REPERTÓRIO) ---
function renderRepertoireTab(state) {
    const activeContainer = document.getElementById("activePiecesContainer");
    const pausedContainer = document.getElementById("pausedPiecesContainer");
    const queueContainer = document.getElementById("queuePiecesContainer");
    const activeBadge = document.getElementById("activePiecesBadge");
    const pausedBadge = document.getElementById("pausedPiecesBadge");
    
    const activePieces = (state.repertoire && state.repertoire.active) ? state.repertoire.active : [];
    const pausedPieces = (state.repertoire && state.repertoire.paused) ? state.repertoire.paused : [];
    const queuePieces = (state.repertoire && state.repertoire.queue) ? state.repertoire.queue : [];
    
    if (activeBadge) activeBadge.textContent = `${activePieces.length} Ativas`;
    if (pausedBadge) pausedBadge.textContent = `${pausedPieces.length} Pausadas`;
    
    if (activeContainer) {
        if (activePieces.length === 0) {
            activeContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma peça ativa no momento.</p>`;
        } else {
            activeContainer.innerHTML = activePieces.map(piece => {
                const safeTrechos = piece.trechos || [];
                const passos = {};
                safeTrechos.forEach(t => {
                    const p = t.passo || 1;
                    if (!passos[p]) passos[p] = [];
                    passos[p].push(t);
                });
                
                const passoLabels = {
                    1: "Passo 1 (~4 Compassos - Microblocos)",
                    2: "Passo 2 (~8 Compassos - Encadeamentos)",
                    3: "Passo 3 (~12 Compassos)",
                    4: "Passo 4 (~16-24 Compassos - Peça Completa)"
                };
                
                const isAlert = piece.status === "alerta" || piece.status === "Alerta";
                const alertBadge = isAlert ? `<span class="badge danger" style="font-size: 0.65rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">⚠️ ALERTA DE ESTRESSE</span>` : '';
            
            return `
<div class="card" style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 18px; margin-bottom: 16px;">
    <div class="piece-header-card" data-action="toggle-piece-drawer" data-piece-id="${piece.id}" style="display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; user-select: none;">
        <div>
            <h3 style="margin: 0; font-size: 1.1rem; color: #ffffff; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>🎹 ${piece.title}</span>
                <span style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">BPM: ${piece.bpm || '60'}</span>
                ${alertBadge}
            </h3>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Fase: <strong>${piece.phase || 'Fatiamento Progressivo'}</strong> ${piece.note ? ` <em>${piece.note}</em>` : ''}
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-outline" style="font-size: 0.72rem; padding: 4px 8px;" data-action="toggle-pause-piece" data-piece="${piece.id}" onclick="event.stopPropagation();">⏸️ Pausar</button>
            <span class="drawer-arrow" style="color: var(--accent); font-size: 0.9rem; font-weight: bold; margin-left: 8px;">▼</span>
        </div>
    </div>
    <div class="piece-details-drawer" id="drawer-${piece.id}" style="display: none; margin-top: 12px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${Object.keys(passos).sort((a, b) => a - b).map(stepNum => {
                const stepTrechos = passos[stepNum];
                const isStepCompleted = stepTrechos.every(t => t.box >= 4 || t.consolidated);
                const consolidatedCount = stepTrechos.filter(t => t.box >= 2 || t.consolidated).length;
                
                return `
                <div class="step-accordion">
                    <div class="step-header" data-action="toggle-step-accordion" data-target="step-${piece.id}-${stepNum}">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: ${isStepCompleted ? '#94a3b8' : '#93c5fd'}; font-size: 0.85rem;">
                                ${passoLabels[stepNum] || `Passo ${stepNum}`}
                            </strong>
                            <span class="badge ${isStepCompleted ? 'locked' : 'info'}" style="font-size: 0.65rem; padding: 2px 7px;">
                                ${consolidatedCount}/${stepTrechos.length} ${isStepCompleted ? '✅ Retido' : 'Ativo'}
                            </span>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">${isStepCompleted ? '▼' : '▲'}</span>
                    </div>
                    <div id="step-${piece.id}-${stepNum}" class="step-content ${isStepCompleted ? 'collapsed' : ''}">
                        ${stepTrechos.map(t => {
                            const imgUrl = typeof window.getScoreImageUrl === "function" ? window.getScoreImageUrl(t.label) : "";
                            const handClass = t.mao === "MD" ? "hand-md" : (t.mao === "ME" ? "hand-me" : "hand-mj");
                            const isRetained = t.box >= 4 || t.consolidated;
                            const isHabit = t.isCorrectingHabit;
                            
                            return `
                            <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; transition: 0.2s; margin-top: 6px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <strong style="color: #fff; font-size: 0.88rem;">${t.label}</strong>
                                        <span class="box-badge box-${t.box || 0}">Caixa ${t.box || 0}</span>
                                        <span class="hand-badge ${handClass}" data-action="toggle-hand" data-piece="${piece.id}" data-trecho="${t.id}" title="Clique para alternar Mãos">
                                            ${t.mao || 'MJ'}
                                        </span>
                                        ${isRetained ? '<span class="badge" style="background: rgba(34, 197, 94, 0.15); color: var(--accent2); font-size: 0.65rem;"> Retido</span>' : ''}
                                        ${t.mirrorOf ? `<span class="badge mirror" style="font-size: 0.65rem;">🗺️ Espelho: ${t.mirrorOf}</span>` : ''}
                                        ${isHabit ? '<span class="badge danger" style="font-size: 0.65rem;">⚠️ Vício</span>' : ''}
                                    </div>
                                    <div style="display: flex; gap: 6px;">
                                        <button class="btn btn-outline" style="padding: 5px 8px; font-size: 0.72rem;" data-action="start-free-from-trecho" data-piece="${piece.id}" data-trecho="${t.id}">
                                            🎹 Livre
                                        </button>
                                        <button class="btn btn-primary" style="padding: 5px 12px; font-size: 0.75rem; width: auto; margin-top: 0;" data-action="start-sandwich-specific" data-piece="${piece.id}" data-trecho="${t.id}">
                                            🥪 Sanduíche
                                        </button>
                                    </div>
                                </div>
                                ${imgUrl ? `
                                <div class="score-container" style="min-height: 80px; max-height: 140px; margin-top: 6px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; padding: 4px;">
                                    <img src="${imgUrl}" alt="Partitura ${t.label}" class="trecho-thumbnail sheet-paper-effect" style="opacity: 1; max-height: 130px; width: 100%; object-fit: contain; cursor: zoom-in;" data-action="open-lightbox-trecho" data-src="${imgUrl}" data-title="${piece.title} — \dots ${t.label}" title="Clique para Zoom em Tela Cheia">
                                </div>
                                ` : ''}
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
</div>
`;
            }).join('');
        }
    }
    
    if (pausedContainer) {
        if (pausedPieces.length === 0) {
            pausedContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma peça pausada.</p>`;
        } else {
            pausedContainer.innerHTML = pausedPieces.map(piece => `
<div class="card" style="background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 10px; opacity: 0.85;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <strong style="color: #fff; font-size: 0.95rem;">${piece.title}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${piece.composer || ''} • ${piece.trechos ? piece.trechos.length : 0} Trechos</div>
        </div>
        <button class="btn btn-outline" style="font-size: 0.72rem; padding: 4px 8px;" data-action="toggle-pause-piece" data-piece="${piece.id}">▶ Reativar</button>
    </div>
</div>
`).join('');
        }
    }
    
    if (queueContainer) {
        if (queuePieces.length === 0) {
            queueContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma peça na fila.</p>`;
        } else {
            queueContainer.innerHTML = queuePieces.map(piece => `
<div class="card" style="background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 10px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <strong style="color: #fff; font-size: 0.95rem;">${piece.title}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${piece.objective || ''}</div>
        </div>
        <button class="btn btn-primary" style="font-size: 0.72rem; padding: 4px 10px; width: auto;" data-action="promote-queue-piece" data-queue="${piece.id}">🚀 Iniciar Estudo</button>
    </div>
</div>
`).join('');
        }
    }
}

function renderTabs(activeTab) {
    const tabMap = {
        "log": "config",
        "blocos": "sala",
        "leitura": "sala"
    };
    const target = tabMap[activeTab] || activeTab;
    
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === target);
    });
    
    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.toggle("active", sec.id === `section-${target}`);
    });
}

// --- CONTROLE DAS SUB-ABAS DA SALA DE ESTUDOS (5 MODOS V15) ---
function renderSalaSubtabs(mode) {
    const modes = ["guided", "sandwich", "random", "reading", "free"];
    modes.forEach(m => {
        const btn = document.getElementById(`btnSubtab${capitalize(m)}`);
        const view = document.getElementById(`view${capitalize(m)}Mode`);
        if (btn) btn.classList.toggle("active", mode === m);
        if (view) view.style.display = (mode === m) ? "block" : "none";
    });
}

function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function populateOfflineSelects(state) {
    const pilarSelect = document.getElementById("offlinePilarSelect");
    const itemSelect = document.getElementById("offlineItemSelect");
    if (!pilarSelect || !itemSelect) return;
    
    const pilar = pilarSelect.value;
    itemSelect.innerHTML = "";
    
    if (pilar === "repertoire") {
        const pieces = (state.repertoire && state.repertoire.active) ? state.repertoire.active : [];
        itemSelect.innerHTML = pieces.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    } else if (pilar === "technical") {
        itemSelect.innerHTML = `
<option value="scales">Escalas (Padrão Russo / Contrário)</option>
<option value="arpeggios">Arpejos (Fundamental / Inversões)</option>
<option value="cadences">Cadências nos 12 Tons</option>
`;
    } else if (pilar === "reading") {
        itemSelect.innerHTML = `
<option value="les-01">Lesson 01 - A Ten-Second Song</option>
<option value="les-02">Lesson 02 - Driving in the G Clef</option>
<option value="les-03">Lesson 03 - Best Friends</option>
<option value="cla-01">Classics 01 - Ode to Joy (Beethoven)</option>
`;
    } else {
        itemSelect.innerHTML = `<option value="free">Prática Livre / Improvisação</option>`;
    }
}

function triggerHandsFreeFlash(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add("pressed");
        setTimeout(() => el.classList.remove("pressed"), 200);
    }
}

// ==================================================
// 🛠️ RESTAURAÇÃO: FUNÇÕES AUXILIARES DA RAIZ (NÃO APAGAR!)
// ==================================================
function showWeeklyReportPreview() {
    const state = window.StateManager.getState();
    const text = window.NeuroEngine ? window.NeuroEngine.generateWeeklyTeacherReport(state) : "";
    const box = document.getElementById("weeklyReportPreviewContainer");
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = `
        <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent2);">📋 PRÉ-VISUALIZAÇÃO DO RELATÓRIO</span>
                <span style="cursor: pointer; color: var(--danger);" data-action="close-weekly-report">✕ Fechar</span>
            </div>
            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.76rem; background: var(--card-inner); padding: 10px; border-radius: 8px; border: 1px solid var(--border); color: #cbd5e1; max-height: 250px; overflow-y: auto;">${text}</pre>
        </div>
    `;
}

function shareWeeklyReport() {
    const state = window.StateManager.getState();
    const text = window.NeuroEngine ? window.NeuroEngine.generateWeeklyTeacherReport(state) : "";
    
    if (navigator.share) {
        navigator.share({
            title: "🎹 Relatório Semanal de Piano — Leonardo Moura",
            text: text
        }).then(() => {
            if (window.App) window.App.showToast("📱 Compartilhado com sucesso!", "success");
        }).catch((err) => {
            if (err.name !== "AbortError") copyWeeklyReportToClipboard();
        });
    } else {
        copyWeeklyReportToClipboard();
    }
}

function copyWeeklyReportToClipboard() {
    const state = window.StateManager.getState();
    const text = window.NeuroEngine ? window.NeuroEngine.generateWeeklyTeacherReport(state) : "";
    
    navigator.clipboard.writeText(text).then(() => {
        if (window.AudioTools) window.AudioTools.playHitSound();
        if (window.App) window.App.showToast("📋 Relatório copiado para a área de transferência!", "success");
    }).catch(() => {
        prompt("Copie seu relatório abaixo:", text);
    });
}

function copyBriefingToClipboard() {
    const state = window.StateManager.getState();
    const briefing = window.NeuroEngine ? window.NeuroEngine.generateMorningBriefing(state) : null;
    if (!briefing) return;
    
    const text = `📋 Briefing Diário de Prática — ${new Date().toLocaleDateString('sv-SE')}\n\n1. 🎯 Por que a sessão de hoje foi montada assim:\n${briefing.justification}\n\n2. 📖 Retrospectiva:\n${briefing.retrospective}\n\n3. 🚀 Impacto na Sessão de Amanhã:\n${briefing.projection}\n`;
    
    navigator.clipboard.writeText(text).then(() => {
        if (window.AudioTools) window.AudioTools.playHitSound();
        if (window.App) window.App.showToast("📋 Briefing Matinal copiado para a área de transferência!", "success");
    }).catch(() => {
        prompt("Copie seu Briefing abaixo:", text);
    });
}
function exportSavegameToClipboard() {
    const jsonStr = window.StateManager.exportSavegame();
    navigator.clipboard.writeText(jsonStr).then(() => {
        if (window.AudioTools) window.AudioTools.playHitSound();
        if (window.App) window.App.showToast("Savegame JSON copiado para a área de transferência!", "success");
    }).catch(err => {
        prompt("Copie o JSON do Savegame abaixo:", jsonStr);
    });
}

function openLightbox(src, title) {
    if (window.AudioTools && typeof window.AudioTools.openLightbox === "function") {
        window.AudioTools.openLightbox(src, title);
    }
}

function generateTeacherReport(state) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentHistory = (state.history || []).filter(h => parseDate(h.date) >= sevenDaysAgo);
    let totalRepMins = 0, totalTechMins = 0;
    const pieceMap = {};
    const techPracticed = [];
    
    recentHistory.forEach(h => {
        const mins = h.durationMinutes || 0;
        const type = (h.type || "").toLowerCase();
        if (type.includes("técnica")) {
            totalTechMins += mins;
            techPracticed.push(`${h.pieceId} por ${mins} minutos`);
        } else {
            totalRepMins += mins;
            const pTitle = h.pieceId;
            if (!pieceMap[pTitle]) pieceMap[pTitle] = { trechos: new Set(), accuracies: [] };
            if (h.trechoId) pieceMap[pTitle].trechos.add(h.trechoId);
            
            // --- CORREÇÃO: Lê a chave real gravada no banco de dados (accuracyPct) ---
            const accuracyValue = h.accuracyPct !== undefined ? h.accuracyPct : h.accuracy;
            if (accuracyValue !== undefined) {
                pieceMap[pTitle].accuracies.push(accuracyValue);
            }
        }
    });
    
    let reportText = "Olá, professora! Segue meu resumo de prática semanal de Piano:\n\n🎹 Peças Praticadas:\n";
    
    Object.entries(pieceMap).forEach(([title, data]) => {
        const avgAcc = data.accuracies.length > 0 ? Math.round(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length) : null;
        reportText += `- ${title}: Estudou trechos ${Array.from(data.trechos).join(", ")}${avgAcc !== null ? ` (Precisão média de ${avgAcc}%)` : ""}.\n`;
    });
    
    reportText += `\n🛠️ Fundamentos Técnicos:\n`;
    techPracticed.forEach(tp => { reportText += `- Praticou ${tp}.\n`; });
    
    reportText += `\n⏱️ Volume de Prática Ativa Semanal: ${totalRepMins + totalTechMins} minutos dedicados.`;
    
    navigator.clipboard.writeText(reportText).then(() => {
        if (window.App) window.App.showToast("Relatório copiado para o Clipboard!", "success");
    }).catch(() => copyFallback(reportText));
}

function copyFallback(text) {
    prompt("Copie seu relatório abaixo:", text);
}
// =========================================================================
// 🎴 META 2.1: GERADOR DE DIAGRAMA DE TECLADO EM SVG DINÂMICO (UMA OITAVA - OFFLINE)
// =========================================================================
window.generateTechKeyboardSVG = function(techEx) {
    if (!techEx) return "";

    const category = techEx.category || "scales";
    const toneRaw = (techEx.tone || "C").trim();
    const isMinor = techEx.title.toLowerCase().includes("menor") || toneRaw.toLowerCase().endsWith("m");
    const tone = toneRaw.replace(/m$/, ""); // Remove o 'm' do final se houver

    // Mapeamento de semitons a partir do Dó (0 a 11)
    const rootMap = {
        "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
    };

    const rootOffset = rootMap[tone] !== undefined ? rootMap[tone] : 0;

    // Banco de dados de dedilhados para uma oitava (7 notas para escalas, 3 para arpejos)
    const scaleDb = {
        "C":   { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" },
        "G":   { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" },
        "D":   { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" },
        "A":   { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" },
        "E":   { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" },
        "B":   { md: "1-2-3-1-2-3-4", me: "4-3-2-1-3-2-1" },
        "F#":  { md: "2-3-4-1-2-3-1", me: "4-3-2-1-3-2-1" },
        "Db":  { md: "2-3-1-2-3-4-1", me: "3-2-1-4-3-2-1" },
        "Ab":  { md: "3-4-1-2-3-1-2", me: "3-2-1-4-3-2-1" },
        "Eb":  { md: "3-1-2-3-4-1-2", me: "3-2-1-4-3-2-1" },
        "Bb":  { md: "4-1-2-3-1-2-3", me: "3-2-1-4-3-2-1" },
        "F":   { md: "1-2-3-4-1-2-3", me: "5-4-3-2-1-3-2" },
        "Am":  { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" },
        "Dm":  { md: "1-2-3-1-2-3-4", me: "5-4-3-2-1-3-2" }
    };

    const arpeggioDb = {
        "C":   { md: "1-2-3", me: "5-4-2" },
        "G":   { md: "1-2-3", me: "5-4-2" },
        "D":   { md: "1-2-3", me: "5-4-2" },
        "A":   { md: "1-2-3", me: "5-4-2" },
        "E":   { md: "1-2-3", me: "5-4-2" },
        "B":   { md: "1-2-3", me: "4-3-2" },
        "F#":  { md: "2-3-4", me: "4-3-2" },
        "Db":  { md: "2-3-4", me: "3-2-1" },
        "Ab":  { md: "2-3-4", me: "3-2-1" },
        "Eb":  { md: "2-3-4", me: "3-2-1" },
        "Bb":  { md: "2-3-4", me: "3-2-1" },
        "F":   { md: "1-2-3", me: "5-4-2" },
        "Fm":  { md: "1-2-3", me: "5-4-2" },
        "Cm":  { md: "1-2-3", me: "5-4-2" }
    };

    const keyLookup = isMinor ? `${tone}m` : tone;
    const fingering = category === "scales" 
        ? (scaleDb[keyLookup] || scaleDb[tone] || scaleDb["C"]) 
        : (arpeggioDb[keyLookup] || arpeggioDb[tone] || arpeggioDb["C"]);

    const mdFingers = fingering.md.split("-");
    const meFingers = fingering.me.split("-");

    // Intervalos relativos a partir da tônica
    const scaleOffsets = isMinor ? [0, 2, 3, 5, 7, 8, 11] : [0, 2, 4, 5, 7, 9, 11];
    const arpeggioOffsets = isMinor ? [0, 3, 7] : [0, 4, 7];
    const offsets = category === "scales" ? scaleOffsets : arpeggioOffsets;

    // Calcula quais notas da oitava (0 a 11) pertencem ao fundamento
    const matchedNotes = offsets.map(rel => (rootOffset + rel) % 12);

    // Estrutura física de 1 oitava (7 teclas brancas e 5 pretas)
    const keys = [
        { note: 0,  isBlack: false, x: 0,   label: "C" },
        { note: 1,  isBlack: true,  x: 11,  label: "C#" },
        { note: 2,  isBlack: false, x: 16,  label: "D" },
        { note: 3,  isBlack: true,  x: 27,  label: "D#" },
        { note: 4,  isBlack: false, x: 32,  label: "E" },
        { note: 5,  isBlack: false, x: 48,  label: "F" },
        { note: 6,  isBlack: true,  x: 59,  label: "F#" },
        { note: 7,  isBlack: false, x: 64,  label: "G" },
        { note: 8,  isBlack: true,  x: 75,  label: "G#" },
        { note: 9,  isBlack: false, x: 80,  label: "A" },
        { note: 10, isBlack: true,  x: 91,  label: "A#" },
        { note: 11, isBlack: false, x: 96,  label: "B" }
    ];

    const whiteKeysSvg = keys.filter(k => !k.isBlack).map(k => {
        const isMatched = matchedNotes.includes(k.note);
        const idxInMatch = matchedNotes.indexOf(k.note);
        
        let fill = "rgba(30, 41, 59, 0.4)";
        let stroke = "rgba(255,255,255,0.08)";
        let fingerLabels = "";

        if (isMatched) {
            fill = "rgba(14, 165, 233, 0.2)"; // Azul translúcido de fundo
            stroke = "var(--accent)";
            
            const mdFinger = mdFingers[idxInMatch % mdFingers.length] || "";
            const meFinger = meFingers[idxInMatch % meFingers.length] || "";
            
            fingerLabels = `
                <circle cx="${k.x + 8}" cy="15" r="5.2" fill="var(--accent2)" />
                <text x="${k.x + 8}" y="17.5" fill="#04240f" font-size="7.5" font-weight="950" text-anchor="middle" font-family="system-ui">${mdFinger}</text>
                
                <circle cx="${k.x + 8}" cy="41" r="5.2" fill="var(--accent)" />
                <text x="${k.x + 8}" y="43.5" fill="#ffffff" font-size="7.5" font-weight="950" text-anchor="middle" font-family="system-ui">${meFinger}</text>
            `;
        }

        return `
            <g>
                <rect x="${k.x}" y="0" width="16" height="56" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1.2" />
                ${fingerLabels}
            </g>
        `;
    }).join('');

    const blackKeysSvg = keys.filter(k => k.isBlack).map(k => {
        const isMatched = matchedNotes.includes(k.note);
        const idxInMatch = matchedNotes.indexOf(k.note);
        
        let fill = "#020617";
        let stroke = "rgba(255,255,255,0.06)";
        let fingerLabels = "";

        if (isMatched) {
            fill = "rgba(14, 165, 233, 0.5)";
            stroke = "var(--accent)";
            
            const mdFinger = mdFingers[idxInMatch % mdFingers.length] || "";
            const meFinger = meFingers[idxInMatch % meFingers.length] || "";
            
            fingerLabels = `
                <circle cx="${k.x + 5}" cy="10" r="4.5" fill="var(--accent2)" />
                <text x="${k.x + 5}" y="12.5" fill="#04240f" font-size="6.5" font-weight="950" text-anchor="middle" font-family="system-ui">${mdFinger}</text>
                
                <circle cx="${k.x + 5}" cy="26" r="4.5" fill="var(--accent)" />
                <text x="${k.x + 5}" y="28.5" fill="#ffffff" font-size="6.5" font-weight="950" text-anchor="middle" font-family="system-ui">${meFinger}</text>
            `;
        }

        return `
            <g>
                <rect x="${k.x}" y="0" width="10" height="36" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="1" />
                ${fingerLabels}
            </g>
        `;
    }).join('');

    return `
        <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
            <div style="display: flex; justify-content: space-between; width: 100%; max-width: 250px; font-size: 0.72rem; font-weight: 800; margin-bottom: 2px;">
                <span style="color: var(--accent2); display: flex; align-items: center; gap: 4px;">● MD (Dedo Verde)</span>
                <span style="color: var(--accent); display: flex; align-items: center; gap: 4px;">● ME (Dedo Azul)</span>
            </div>
            <svg viewBox="0 0 112 56" style="width: 100%; max-width: 180px; height: auto;">
                ${whiteKeysSvg}
                ${blackKeysSvg}
            </svg>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; font-weight: 800;">
                Tonalidade Ativa: <span style="color: #fff;">${tone} ${isMinor ? 'Menor' : 'Maior'}</span>
            </div>
        </div>
    `;
};
// =========================================================================
// 🎴 META 5.3 & 5.4: CARD DE RECALL ATIVO & MINI-TECLADO SVG DINÂMICO
// =========================================================================
function renderTechnicalRecallCard(state) {
    const sibling = document.getElementById("coldAuditInlineContainer");
    if (!sibling) return;

    // Garante a existência do container injetando-o antes do Cold Audit
    let container = document.getElementById("technicalRecallCardContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "technicalRecallCardContainer";
        sibling.parentNode.insertBefore(container, sibling);
    }

    // Se o aluno estiver estudando (Guided ativa), oculta para não distrair na estante
    if (state.sessionState && state.sessionState.guidedActive) {
        container.style.display = "none";
        return;
    }

    const scales = (state.technical && state.technical.scales) || [];
    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

    // Filtra escalas ativas vencidas para hoje (ou atrasadas)
    const dueScales = scales.filter(ex => ex.status === "active" && ex.nextReviewDate && ex.nextReviewDate <= today);

    if (dueScales.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    const currentScale = dueScales.at(0); // 🛡️ .at(0) resolve a referência síncrona e é imune a filtros markdown!
    const showGuide = window._showTechnicalRecallMap || false;

    // Dicionário Unificado e Completo de Escalas (Maiores e Menores)
    const scaleKeys = {
        "C": ["C", "D", "E", "F", "G", "A", "B"],
        "G": ["G", "A", "B", "C", "D", "E", "F#"],
        "D": ["D", "E", "F#", "G", "A", "B", "C#"],
        "A": ["A", "B", "C#", "D", "E", "F#", "G#"],
        "E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
        "B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
        "F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
        "Db": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
        "Ab": ["Ab", "Bb", "C", "Db", "Eb", "F", "Gb"],
        "Eb": ["Eb", "F", "G", "Ab", "Bb", "C", "Db"],
        "Bb": ["Bb", "C", "D", "Eb", "F", "G", "Ab"],
        "F": ["F", "G", "A", "Bb", "C", "D", "Eb"],
        "Am": ["A", "B", "C", "D", "E", "F", "G", "G#", "F#"],
        "Em": ["E", "F#", "G", "A", "B", "C", "D", "D#", "C#"],
        "Bm": ["B", "C#", "D", "E", "F#", "G", "A", "A#", "G#"],
        "F#m": ["F#", "G#", "A", "B", "C#", "D", "E", "E#", "D#"],
        "C#m": ["C#", "D#", "E", "F#", "G#", "A", "B", "B#", "A#"],
        "G#m": ["G#", "A#", "B", "C#", "D#", "E", "F#", "F##", "E#"],
        "D#m": ["D#", "E#", "F#", "G#", "A#", "B", "C#", "C##", "B#"],
        "A#m": ["A#", "B#", "C#", "D#", "E#", "F#", "G#", "G##", "F##"],
        "Dm": ["D", "E", "F", "G", "A", "Bb", "C", "C#", "B"],
        "Gm": ["G", "A", "Bb", "C", "D", "Eb", "F", "F#", "E"],
        "Cm": ["C", "D", "Eb", "F", "G", "Ab", "Bb", "B", "A"],
        "Fm": ["F", "G", "Ab", "Bb", "C", "Db", "Eb", "E", "D"],
        "Bbm": ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab", "A", "G"],
        "Ebm": ["Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db", "D", "C"],
        "Abm": ["Ab", "Bb", "Cb", "Db", "Eb", "Fb", "Gb", "G", "F"]
    };

    const activeNotes = scaleKeys[currentScale.tone] || [];

    // Desenho geométrico do Teclado SVG (1 Oitava e Meia - 14 Teclas Brancas)
    const whiteKeys = [
        { note: "C", x: 0 }, { note: "D", x: 20 }, { note: "E", x: 40 },
        { note: "F", x: 60 }, { note: "G", x: 80 }, { note: "A", x: 100 }, { note: "B", x: 120 },
        { note: "C2", x: 140 }, { note: "D2", x: 160 }, { note: "E2", x: 180 },
        { note: "F2", x: 200 }, { note: "G2", x: 220 }, { note: "A2", x: 240 }, { note: "B2", x: 260 }
    ];
    const blackKeys = [
        { note: "C#", x: 13 }, { note: "D#", x: 33 },
        { note: "F#", x: 73 }, { note: "G#", x: 93 }, { note: "A#", x: 113 },
        { note: "C#2", x: 153 }, { note: "D#2", x: 173 },
        { note: "F#2", x: 213 }, { note: "G#2", x: 233 }, { note: "A#2", x: 253 }
    ];

    const isLit = (noteName) => activeNotes.includes(noteName.replace("2", ""));

    let keyboardSvgHtml = "";
    if (showGuide) {
        const whiteKeysSvg = whiteKeys.map(k => {
            const lit = isLit(k.note);
            const fill = lit ? "var(--accent)" : "#ffffff";
            return `<rect x="${k.x}" y="0" width="20" height="70" fill="${fill}" stroke="#0f172a" stroke-width="1.5" rx="2" />`;
        }).join('');

        const blackKeysSvg = blackKeys.map(k => {
            const lit = isLit(k.note);
            const fill = lit ? "var(--accent2)" : "#1e293b";
            return `<rect x="${k.x}" y="0" width="12" height="42" fill="${fill}" stroke="#0f172a" stroke-width="1.5" rx="1.5" />`;
        }).join('');

        keyboardSvgHtml = `
            <div style="display: flex; justify-content: center; margin: 12px 0;">
                <svg width="280" height="72" viewBox="0 0 280 72" style="background: #0f172a; border-radius: 8px; padding: 4px; border: 1px solid var(--border);">
                    ${whiteKeysSvg}
                    ${blackKeysSvg}
                </svg>
            </div>
            <div style="font-size: 0.74rem; color: #a5b4fc; text-align: center; font-weight: 700; margin-bottom: 8px;">
                🖐️ Notas: ${activeNotes.join(" - ")}
            </div>
        `;
    }

    container.innerHTML = `
        <div style="background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: 18px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.25rem;">🧠</span>
                    <div>
                        <strong style="color: #fff; font-size: 0.95rem; display: block;">Recall Ativo: Escala do Dia</strong>
                        <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Revisão Espaçada de Técnica (Caixa ${currentScale.box})</span>
                    </div>
                </div>
                <span class="badge purple" style="font-size: 0.68rem; padding: 3px 8px; border-radius: 6px;">Caixa ${currentScale.box}</span>
            </div>

            <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 14px; text-align: left;">
                <strong style="color: var(--accent2); font-size: 1.1rem; display: block; text-align: center;">${currentScale.title}</strong>
                <span style="font-size: 0.76rem; color: var(--text-muted); display: block; text-align: center; margin-top: 4px;">
                    ✍️ Assinatura: ${currentScale.accents || "Nenhum acidente"}
                </span>

                ${showGuide ? keyboardSvgHtml : `
                    <div style="background: rgba(147, 197, 253, 0.03); border: 1px dashed rgba(147, 197, 253, 0.2); border-radius: 8px; padding: 14px; text-align: center; margin-top: 10px;">
                        <span style="font-size: 0.76rem; color: #94a3b8; display: block; line-height: 1.4;">
                            Não toque no piano ainda! Force o seu cérebro a visualizar mentalmente as teclas e dedilhados. 
                        </span>
                    </div>
                `}
            </div>

            <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 0.76rem; font-weight: 700; border-color: rgba(255,255,255,0.15);" data-action="toggle-recall-guide">
                    ${showGuide ? '🙈 Ocultar Guia' : '👁️ Pescar Mapa'}
                </button>
                <button class="btn btn-start" style="flex: 1.2; padding: 10px; font-size: 0.76rem; font-weight: 800; background: var(--accent2); color: #04240f;" data-action="recall-scale-hit" data-id="${currentScale.id}">
                    💚 Consegui com Firmeza
                </button>
                <button class="btn btn-reset" style="padding: 10px 14px; font-size: 0.76rem; font-weight: 700; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171;" data-action="recall-scale-miss" data-id="${currentScale.id}">
                    ❌ Errei
                </button>
            </div>
        </div>
    `;
}

window.generateTeacherReport = generateTeacherReport;