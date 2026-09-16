/**
 * sessionPlayer.js - Controlador da Sessão Guiada de 1-Clique & Fila Dinâmica de Missões
 * Painel de Estudos de Piano — Versão 15.1.0 (Corrigida)
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Execução sequencial e sem atrito dos Blocos Prescritos (A, B, C, D, E, Leitura) na Sala de Estudos
 * - Garantia de que o Bloco A (Auditoria a Frio) sempre lidere a fila diária quando houver auditorias pendentes
 * - Integração interativa direta com Modo Sanduíche, Leitura Primer e Laboratório Técnico
 * - Sidebar Dinâmica de Missões com checklist em tempo real e marcação de status (sem cadeados bloqueantes fantasmas)
 * - Roteamento 100% padronizado: activeTab: "sala", salaMode: "guided"
 * - Integração com Sugestor Adaptativo de Tempo Extra (Over-Time Engine) ao final da rotina
 * - Controle de Metrônomo, Wake Lock e atalhos Hands-Free (Espaço, KeyN, Enter, KeyP)
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class SessionPlayerClass {
    constructor() {
        this.currentBlocks = [];
        this.currentIndex = 0;
        this._timerInterval = null;
        this._secondsElapsed = 0;
        this._isRunning = false;
        this._replayTimerInterval = null;
        this._replaySeconds = 0;
        
        // ⚙️ Ponteiros de Estado Local do Mini-Player Técnico (Fase 2)
        this._isTechActive = false;
        this._techItemIndex = 0;
        this._techTimerInterval = null;
        this._techSecondsElapsed = 0;
        this._currentTechBpm = 60;
        this._techPayload = []; // Buffer para roteamento atômico no SSOT
    }

    startMicroReplayTimer(nextBpm, callback) {
        this.stopMicroReplayTimer();
        this._replaySeconds = 0;
        
        this.renderUI(window.StateManager.getState());
        const bar = document.getElementById("guidedMicroReplayBar");
        const txt = document.getElementById("guidedMicroReplayText");
        if (txt) txt.textContent = "🧠 Preparando próximo trecho... Sincronize seu andamento!";
        
        if (window.AudioTools && nextBpm) {
            window.AudioTools.startMetronome(nextBpm);
        }
        this._replayTimerInterval = setInterval(() => {
            this._replaySeconds++;
            const currentBar = document.getElementById("guidedMicroReplayBar");
            if (currentBar) currentBar.style.width = `${(this._replaySeconds / 10) * 100}%`;
            
            if (this._replaySeconds >= 10) {
                this.stopMicroReplayTimer();
                if (callback) callback();
            }
        }, 1000);
    }
    stopMicroReplayTimer() {
        if (this._replayTimerInterval) {
            clearInterval(this._replayTimerInterval);
            this._replayTimerInterval = null;
        }
        if (window.AudioTools) {
            window.AudioTools.stopMetronome();
        }
    }
/*
    startSession(blocks = null) {
        const state = window.StateManager.getState();
        const pipeline = window.NeuroEngine ? window.NeuroEngine.generateDailyPipeline() : [];
        let blockIds = blocks;

        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
            const stateBlocks = state ? state.selectedRoutineBlocks : null;
            blockIds = (stateBlocks && Array.isArray(stateBlocks) && stateBlocks.length > 0)
                ? stateBlocks
                : ["block-a", "block-b", "block-c", "block-d", "block-e"]; // Fallback físico e seguro
        }
        --- FIM ORIGINAL --- *

        // --- NOVA LÓGICA ---
        if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
            const stateBlocks = state ? state.selectedRoutineBlocks : null;
            blockIds = (stateBlocks && Array.isArray(stateBlocks) && stateBlocks.length > 0)
                ? stateBlocks
                : ["block-a", "block-b", "block-c", "block-d", "block-reading", "block-e"]; // Fallback físico e seguro
        }

        // Regra Soberana do Bloco A: Se o pipeline prescreveu o Bloco A, garante sua liderança obrigatória
        if (pipeline.some(b => b.id === "block-a") && !blockIds.includes("block-a")) {
            blockIds = ["block-a", ...blockIds];
        }

        this.currentBlocks = pipeline.filter(b => blockIds.includes(b.id)).map(b => ({ ...b, completed: false }));

        if (this.currentBlocks.length === 0) {
            if (window.App && window.App.showToast) {
                window.App.showToast("Nenhum bloco disponível para a sessão de hoje.", "warn");
            }
            return;
        }
        this.currentIndex = 0;
        this._secondsElapsed = 0;
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.stopMetronome();
        }
        
        this.stopMicroReplayTimer();
        this.lastAuditIndex = 0; 
        window.StateManager.setState({
            activeTab: "sala",
            salaMode: "guided",
            sessionState: {
                inProgress: true,
                guidedActive: true,
                currentBlockIndex: 0,
                guidedBlocks: this.currentBlocks,
                currentAuditIndex: 0,
                cascadeRestrictionD: false,
                startTime: new Date().toISOString(),
                blockSeconds: 0,
                overtimeSuggested: false
            }
        }, "START_GUIDED_SESSION");

        this.startTimer();
    }
/*
    startTimer() {
        if (isGuidedTimerRunning) return;
        isGuidedTimerRunning = true;
        guidedTimerInterval = setInterval(() => {
            guidedSecondsElapsed++;
            this.updateTimerDisplay();
            // REMOVIDO: A acumulação de tempo é de responsabilidade estrita dos sub-players. O timer guiado serve apenas para telemetria visual da sessão total.
        }, 1000);
    }
    stopTimer() {
        if (!this._isRunning) return;
        this._isRunning = false;
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }
*  
    startTimer() {
        if (this._isRunning) return;
        this._isRunning = true;
        this._timerInterval = setInterval(() => {
            this._secondsElapsed++;
            this.updateTimerDisplay();
        }, 1000);
    }
    

    updateTimerDisplay() {
        const el = document.getElementById("guidedTimerDisplay");
        if (!el) return;
        const mins = Math.floor(this._secondsElapsed / 60);
        const secs = this._secondsElapsed % 60;
        el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    nextBlock() {
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        
        // 🛡️ CORREÇÃO CRÍTICA: Sincroniza o ponteiro volátil da classe com o SSOT
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        this.currentBlocks = (sState.guidedBlocks && sState.guidedBlocks.length > 0) ? sState.guidedBlocks : this.currentBlocks;
        
        const currentBlock = this.currentBlocks[this.currentIndex];
        
        // ⏱️ Captura Dinâmica de Tempo para Blocos Passivos via cronômetro global
        const currentTotalSecs = this._secondsElapsed || 0;
        const blockSecs = currentTotalSecs - (this._lastBlockSeconds || 0);
        this._lastBlockSeconds = currentTotalSecs;
        const blockMins = Math.max(1, Math.round(blockSecs / 60));

        // Determina a lista de To-Do desmarcando o bloco atual
        const currentSelected = state.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-reading", "block-e"];
        const nextSelected = currentSelected.filter(id => id !== (currentBlock ? currentBlock.id : ""));
        
        if (this.currentIndex < this.currentBlocks.length - 1) {
            this.currentIndex++;
            if (window.AudioTools) window.AudioTools.playHitSound();
            
            // 🛡️ Mutação Imutável com Structured Clone
            window.StateManager.setState(prev => {
                const blocksCopy = structuredClone(prev.sessionState.guidedBlocks || []);
                const prevBlock = blocksCopy[this.currentIndex - 1];
                if (prevBlock) {
                    prevBlock.completed = true;
                }

                // ==================== COUPLER COMPLETO: ATUALIZAÇÃO DA ABA HOJE E LOGS PASSIVOS ====================
                const forecastTasks = { ...(prev.forecastTasks || {}) };
                let newHistory = prev.history || [];
                let dailyStatsUpdate = { ...(prev.dailyStats || {}) };
                let globalStatsUpdate = { ...(prev.globalStats || {}) };

                if (prevBlock) { 
                    if (prevBlock.id === "block-a") forecastTasks["d0-audit"] = true;
                    
                    if (prevBlock.id === "block-b") {
                        forecastTasks["d0-micro"] = true;
                        // 📝 LOG PASSIVO: Micro-Reparo Guiado
                        const cleanTitle = prevBlock.title ? prevBlock.title.split('—')[0].replace("🛠️ Micro-Reparo", "").trim() : "Repertório";
                        newHistory = [{ date: new Date().toLocaleDateString('sv-SE'), type: "Micro-Reparo (Guiado)", pieceId: cleanTitle || "Repertório", trechoId: prevBlock.trechoId || "Passivo", durationMinutes: blockMins, accuracyPct: 100, manualOffline: false }, ...newHistory];
                        dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + blockMins;
                        dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + blockMins;
                        globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + blockMins;
                    }
                    
                    if (prevBlock.id === "block-c") forecastTasks["d0-acquisition"] = true;
                    
                    if (prevBlock.id === "block-reading" || (prevBlock.id === "block-d" && prevBlock.isReading)) forecastTasks["d0-reading"] = true;
                    
                    if (prevBlock.id === "block-d" && !prevBlock.isReading) {
                        forecastTasks["d0-chain"] = true;
                        // 📝 LOG PASSIVO: Encadeamento Guiado
                        const cleanTitle = prevBlock.title ? prevBlock.title.split('—')[0].replace("🔗 Encadeamento JIT", "").trim() : "Repertório";
                        newHistory = [{ date: new Date().toLocaleDateString('sv-SE'), type: "Encadeamento (Guiado)", pieceId: cleanTitle || "Repertório", trechoId: prevBlock.trechoId || "Passivo", durationMinutes: blockMins, accuracyPct: 100, manualOffline: false }, ...newHistory];
                        dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + blockMins;
                        dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + blockMins;
                        globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + blockMins;
                    }
                    
                    if (prevBlock.id === "block-e") forecastTasks["d0-tech"] = true;
                }
                // =========================================================================

                return {
                    selectedRoutineBlocks: nextSelected,
                    forecastTasks, 
                    history: newHistory,
                    dailyStats: dailyStatsUpdate,
                    globalStats: globalStatsUpdate,
                    sessionState: {
                        ...prev.sessionState,
                        guidedBlocks: blocksCopy,
                        currentBlockIndex: this.currentIndex
                    }
                };
            }, `GUIDED_BLOCK_${this.currentIndex}`);
        } else {
            this.finishSession();
        }
    }

    prevBlock() {
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        // 🛡️ Sincroniza ponteiro antes de retroceder
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        
        if (this.currentIndex > 0) {
            this.currentIndex--;
            window.StateManager.setState(prev => ({
                sessionState: {
                    ...prev.sessionState,
                    currentBlockIndex: this.currentIndex
                }
            }), `GUIDED_PREV_BLOCK_${this.currentIndex}`);
        }
    }

    finishSession() {
        this.stopTimer();
        this.stopMicroReplayTimer(); // 🛡️ Aborta instâncias e encerra o metrônomo atomicamente
        
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.playHitSound();
        }


        // Identifica o bloco ativo no momento do encerramento (conclusão natural ou saída precoce)
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        
        // 🛡️ Sincronização final do ponteiro de memória
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        this.currentBlocks = (sState.guidedBlocks && sState.guidedBlocks.length > 0) ? sState.guidedBlocks : this.currentBlocks;
        
        const activeBlock = this.currentBlocks[this.currentIndex];
        const activeBlockId = activeBlock ? activeBlock.id : "";
        // Atualiza o último bloco da fila guiada para completed: true
        if (this.currentBlocks[this.currentIndex]) {
            this.currentBlocks[this.currentIndex].completed = true;
        }
        // --- EQUAÇÃO DE PADRONIZAÇÃO META 1.6 ---
        const durMinutes = Math.max(1, Math.ceil(this._secondsElapsed / 60));
        const accumulatedMins = Math.floor(this._secondsElapsed / 60);
        const residualMins = durMinutes - accumulatedMins;
        // --- [CAMADA V.B] CÁLCULO DINÂMICO DO READINESS GATE ---
        const thaw = state.thawRecoveryState || {};
        let diagnosticPassed = null;
        let diagnosticMsg = "";

        if (thaw.active && thaw.isReadinessGate) {
            const passed = sState.auditsPassed || [];
            const failed = sState.auditsFailed || [];
            const total = passed.length + failed.length;
            const errorRate = total > 0 ? (failed.length / total) * 100 : 0;
            
            /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
            diagnosticPassed = errorRate <= 30; // Limiar de tolerância de 30%
            
            if (diagnosticPassed) {
                diagnosticMsg = `🎉 Excelente! Sua taxa de erro foi de apenas ${errorRate.toFixed(1)}% (limite de 30%). Seu cérebro resistiu ao hiato e o regime nominal foi mantido para amanhã!`;
            } else {
                diagnosticMsg = `⚠️ Taxa de erro de ${errorRate.toFixed(1)}% detectada (limiar de 30% excedido). Ativando Amortecimento Biológico (meta de 20 min) a partir de amanhã.`;
            }
            }
            window.StateManager.setState(prev => {
                const prevSelected = prev.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];
                const updatedSelected = activeBlockId ? prevSelected.filter(id => id !== activeBlockId) : prevSelected;
            --- FIM ORIGINAL --- *

            // --- NOVA LÓGICA ---
            diagnosticPassed = errorRate <= 30; // Limiar de tolerância de 30%
            
            if (diagnosticPassed) {
                diagnosticMsg = `🎉 Excelente! Sua taxa de erro foi de apenas ${errorRate.toFixed(1)}% (limite de 30%). Seu cérebro resistiu ao hiato e o regime nominal foi mantido para amanhã!`;
            } else {
                diagnosticMsg = `⚠️ Taxa de erro de ${errorRate.toFixed(1)}% detectada (limiar de 30% excedido). Ativando Amortecimento Biológico (meta de 20 min) a partir de amanhã.`;
            }
            }
            window.StateManager.setState(prev => {
            const prevSelected = prev.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-reading", "block-e"];
            const updatedSelected = activeBlockId ? prevSelected.filter(id => id !== activeBlockId) : prevSelected;

            // ==================== COUPLER: ATUALIZAÇÃO FINAL ABA HOJE ====================
            const forecastTasks = { ...(prev.forecastTasks || {}) };
            if (activeBlock) {
                if (activeBlock.id === "block-a") forecastTasks["d0-audit"] = true;
                if (activeBlock.id === "block-c") forecastTasks["d0-acquisition"] = true;
                if (activeBlock.id === "block-reading" || (activeBlock.id === "block-d" && activeBlock.isReading)) forecastTasks["d0-reading"] = true;
                if (activeBlock.id === "block-e") forecastTasks["d0-tech"] = true;
            }
            // =============================================================================

// --- PROCESSAMENTO SÍNCRONO DE MINUTOS RESIDUAIS (META 1.6) ---
            // ZERADO: O tempo, a completude de sessões e a fragmentação (Técnica/Repertório/Leitura)
            // são agora delegados estritamente aos módulos subjacentes.
            // A Sessão Guiada atua apenas como Despachante Lógico.
/*
            // --- GRAVAÇÃO DOS RESULTADOS DE DECOOLDOWN DO DECORRER ---
            let updatedThaw = prev.thawRecoveryState ? { ...prev.thawRecoveryState } : null;
            if (updatedThaw && updatedThaw.active) {
                updatedThaw.completed = true;
                updatedThaw.sessionSecondsElapsed = this._secondsElapsed || guidedSecondsElapsed;
                if (updatedThaw.isReadinessGate) {
*             
            // --- GRAVAÇÃO DOS RESULTADOS DE DECOOLDOWN DO DECORRER ---
            let updatedThaw = prev.thawRecoveryState ? { ...prev.thawRecoveryState } : null;
            if (updatedThaw && updatedThaw.active) {
                updatedThaw.completed = true;
                updatedThaw.sessionSecondsElapsed = this._secondsElapsed;
                if (updatedThaw.isReadinessGate) {    
                updatedThaw.diagnosticPassed = diagnosticPassed;
                }
            }

            return {
                selectedRoutineBlocks: updatedSelected,
                forecastTasks, // Salva o check permanente do último bloco na Aba Hoje
                xp: (prev.xp || 0) + 50, // XP de Bônus por orquestração de sessão mantido
                thawRecoveryState: updatedThaw,
                // MATRIZES DE HISTORY E STATS REMOVIDAS PARA EVITAR POLUIÇÃO E DUPLICIDADE
                sessionState: {
                    inProgress: false,
                    guidedActive: false,
                    currentBlockIndex: 0,
                    guidedBlocks: [],
                    overtimeSuggested: true
                }
            };
        }, "FINISH_GUIDED_SESSION");

        if (window.App && window.App.showToast) {
            if (diagnosticMsg) {
                // Emite o veredito do Readiness Gate de forma clara e visível
                window.App.showToast(diagnosticMsg, diagnosticPassed ? "success" : "warn");
            } else {
                window.App.showToast(`🎉 Parabéns! Sessão Guiada orquestrada com sucesso (+50 XP bônus).`, "success");
            }
        }
    }
    exitSession() {
        if (confirm("Deseja realmente sair da Sessão Guiada? O tempo praticado até aqui será contabilizado.")) {
            this.finishSession();
        }
    }
*/
    startSession(blocks = null) {
        const state = window.StateManager.getState();
        const pipeline = window.NeuroEngine ? window.NeuroEngine.generateDailyPipeline() : [];
        let blockIds = blocks;
        
        if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
            const stateBlocks = state ? state.selectedRoutineBlocks : null;
            blockIds = (stateBlocks && Array.isArray(stateBlocks) && stateBlocks.length > 0)
                ? stateBlocks
                : ["block-a", "block-b", "block-c", "block-d", "block-e"];
        }

        if (pipeline.some(b => b.id === "block-a") && !blockIds.includes("block-a")) {
            blockIds = ["block-a", ...blockIds];
        }

        this.currentBlocks = pipeline.filter(b => blockIds.includes(b.id)).map(b => ({ ...b, completed: false }));
        if (this.currentBlocks.length === 0) {
            if (window.App && window.App.showToast) {
                window.App.showToast("Nenhum bloco disponível para a sessão de hoje.", "warn");
            }
            return;
        }

        this.currentIndex = 0;
        this._secondsElapsed = 0;
        this._lastBlockSeconds = 0;
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.stopMetronome();
        }
        
        this.stopMicroReplayTimer();
        this.lastAuditIndex = 0; 
        window.StateManager.setState({
            activeTab: "sala",
            salaMode: "guided",
            sessionState: {
                inProgress: true,
                guidedActive: true,
                currentBlockIndex: 0,
                guidedBlocks: this.currentBlocks,
                currentAuditIndex: 0,
                cascadeRestrictionD: false,
                startTime: new Date().toISOString(),
                blockSeconds: 0,
                overtimeSuggested: false
            }
        }, "START_GUIDED_SESSION");
        
        this.startTimer();
    }

    startTimer() {
        if (this._isRunning) return;
        this._isRunning = true;
        this._timerInterval = setInterval(() => {
            this._secondsElapsed++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (!this._isRunning) return;
        this._isRunning = false;
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const el = document.getElementById("guidedTimerDisplay");
        if (!el) return;
        const mins = Math.floor(this._secondsElapsed / 60);
        const secs = this._secondsElapsed % 60;
        el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    /*
    nextBlock() {
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        this.currentBlocks = (sState.guidedBlocks && sState.guidedBlocks.length > 0) ? sState.guidedBlocks : this.currentBlocks;
        
        const currentBlock = this.currentBlocks[this.currentIndex];
        const currentSelected = state.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];
        const nextSelected = currentSelected.filter(id => id !== (currentBlock ? currentBlock.id : ""));
        
        // ⏱️ Captura Dinâmica de Tempo para Blocos Passivos
        const currentTotalSecs = this._secondsElapsed || 0;
        const blockSecs = currentTotalSecs - (this._lastBlockSeconds || 0);
        this._lastBlockSeconds = currentTotalSecs;
        const blockMins = Math.max(1, Math.round(blockSecs / 60));

        if (this.currentIndex < this.currentBlocks.length - 1) {
            this.currentIndex++;
            if (window.AudioTools) window.AudioTools.playHitSound();
            
            window.StateManager.setState(prev => {
                const blocksCopy = structuredClone(prev.sessionState.guidedBlocks || []);
                const prevBlock = blocksCopy[this.currentIndex - 1];
                if (prevBlock) {
                    prevBlock.completed = true;
                }
                const forecastTasks = { ...(prev.forecastTasks || {}) };
                if (prevBlock) {
                    if (prevBlock.id === "block-a") forecastTasks["d0-audit"] = true;
                    if (prevBlock.id === "block-b") forecastTasks["d0-micro"] = true;
                    if (prevBlock.id === "block-c") forecastTasks["d0-acquisition"] = true;
                    if (prevBlock.id === "block-reading" || (prevBlock.id === "block-d" && prevBlock.isReading)) forecastTasks["d0-reading"] = true;
                    if (prevBlock.id === "block-d" && !prevBlock.isReading) forecastTasks["d0-chain"] = true;
                    if (prevBlock.id === "block-e") forecastTasks["d0-tech"] = true;
                }

                let newHistory = prev.history || [];
                let dailyStatsUpdate = { ...prev.dailyStats };
                let globalStatsUpdate = { ...prev.globalStats };

                // 📊 Injeção Condicional de Histórico e Tempo (Apenas Blocos Passivos)
                if (prevBlock && (prevBlock.id === "block-b" || (prevBlock.id === "block-d" && !prevBlock.isReading))) {
                    const blockTypeStr = prevBlock.id === "block-b" ? "Micro-Reparo (Guiado)" : "Encadeamento (Guiado)";
                    newHistory = [
                        {
                            date: new Date().toLocaleDateString('sv-SE'),
                            type: blockTypeStr,
                            pieceId: "Repertório",
                            trechoId: prevBlock.trechoId || "Trecho",
                            durationMinutes: blockMins,
                            accuracyPct: 100,
                            manualOffline: false
                        },
                        ...newHistory
                    ];
                    dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + blockMins;
                    dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + blockMins;
                    globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + blockMins;
                }

                return {
                    selectedRoutineBlocks: nextSelected,
                    forecastTasks,
                    history: newHistory,
                    dailyStats: dailyStatsUpdate,
                    globalStats: globalStatsUpdate,
                    sessionState: {
                        ...prev.sessionState,
                        guidedBlocks: blocksCopy,
                        currentBlockIndex: this.currentIndex
                    }
                };
            }, `GUIDED_BLOCK_${this.currentIndex}`);
        } else {
            this.finishSession();
        }
    }
    */
   nextBlock() {
        const state = window.StateManager.getState();
        
        // --- 🛡️ TRAVA DE BLINDAGEM (CORREÇÃO DA SESSÃO SANDUÍCHE ATROPELADA) ---
        // Se o modo sanduíche estiver com a tela final ativa, ignoramos chamadas fantasmas de nextBlock()
        if (state.sandwichState && state.sandwichState.finished && state.salaMode === "sandwich") {
             console.warn("[SessionPlayer] nextBlock() interceptado. Aguardando o clique do aluno no scorecard do Sanduíche.");
             return;
        }

        const sState = state.sessionState || {};
        
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        this.currentBlocks = (sState.guidedBlocks && sState.guidedBlocks.length > 0) ? sState.guidedBlocks : this.currentBlocks;
        
        const currentBlock = this.currentBlocks[this.currentIndex];
        const currentSelected = state.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];
        const nextSelected = currentSelected.filter(id => id !== (currentBlock ? currentBlock.id : ""));
        
        // ⏱️ Captura Dinâmica de Tempo para Blocos Passivos
        const currentTotalSecs = this._secondsElapsed || 0;
        const blockSecs = currentTotalSecs - (this._lastBlockSeconds || 0);
        this._lastBlockSeconds = currentTotalSecs;
        const blockMins = Math.max(1, Math.round(blockSecs / 60));

        if (this.currentIndex < this.currentBlocks.length - 1) {
            this.currentIndex++;
            if (window.AudioTools) window.AudioTools.playHitSound();
            
            window.StateManager.setState(prev => {
                const blocksCopy = structuredClone(prev.sessionState.guidedBlocks || []);
                const prevBlock = blocksCopy[this.currentIndex - 1];
                if (prevBlock) {
                    prevBlock.completed = true;
                }
                const forecastTasks = { ...(prev.forecastTasks || {}) };
                if (prevBlock) {
                    if (prevBlock.id === "block-a") forecastTasks["d0-audit"] = true;
                    if (prevBlock.id === "block-b") forecastTasks["d0-micro"] = true;
                    if (prevBlock.id === "block-c") forecastTasks["d0-acquisition"] = true;
                    if (prevBlock.id === "block-reading" || (prevBlock.id === "block-d" && prevBlock.isReading)) forecastTasks["d0-reading"] = true;
                    if (prevBlock.id === "block-d" && !prevBlock.isReading) forecastTasks["d0-chain"] = true;
                    if (prevBlock.id === "block-e") forecastTasks["d0-tech"] = true;
                }

                let newHistory = prev.history || [];
                let dailyStatsUpdate = { ...prev.dailyStats };
                let globalStatsUpdate = { ...prev.globalStats };

                // 📊 Injeção Condicional de Histórico e Tempo (Apenas Blocos Passivos e NÃO terceirizados)
                if (prevBlock && !prevBlock.subPlayerUsed && (prevBlock.id === "block-a" || prevBlock.id === "block-b" || (prevBlock.id === "block-d" && !prevBlock.isReading))) {
                    let blockTypeStr = "Bloco de Estudo";
                    if (prevBlock.id === "block-a") blockTypeStr = "Auditoria a Frio";
                    else if (prevBlock.id === "block-b") blockTypeStr = "Micro-Reparo (Guiado)";
                    else if (prevBlock.id === "block-d") blockTypeStr = "Encadeamento (Guiado)";

                    newHistory = [
                        {
                            date: new Date().toLocaleDateString('sv-SE'),
                            type: blockTypeStr,
                            pieceId: "Repertório",
                            trechoId: prevBlock.trechoId || "Trecho",
                            durationMinutes: blockMins,
                            accuracyPct: 100,
                            manualOffline: false
                        },
                        ...newHistory
                    ];
                    dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + blockMins;
                    dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + blockMins;
                    globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + blockMins;
                }

                return {
                    selectedRoutineBlocks: nextSelected,
                    forecastTasks,
                    history: newHistory,
                    dailyStats: dailyStatsUpdate,
                    globalStats: globalStatsUpdate,
                    sessionState: {
                        ...prev.sessionState,
                        guidedBlocks: blocksCopy,
                        currentBlockIndex: this.currentIndex
                    }
                };
            }, `GUIDED_BLOCK_${this.currentIndex}`);
        } else {
            this.finishSession();
        }
    }

    prevBlock() {
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        // 🛡️ Sincroniza ponteiro antes de retroceder
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        
        if (this.currentIndex > 0) {
            // 🛡️ Trava de segurança: Desmonta o player técnico e desarma áudio ao retroceder
            if (this.stopGuidedTechTimer) this.stopGuidedTechTimer();
            this._isTechActive = false;
            if (window.AudioTools) window.AudioTools.stopMetronome();

            this.currentIndex--;
            window.StateManager.setState(prev => ({
                sessionState: {
                    ...prev.sessionState,
                    currentBlockIndex: this.currentIndex
                }
            }), `GUIDED_PREV_BLOCK_${this.currentIndex}`);
        }
    }

    // =========================================================================
    // ⚙️ CONTROLES DO PLAYER TÉCNICO INTERNO (FASE 2)
    // =========================================================================
    startGuidedTech() {
        this._isTechActive = true;
        this._techItemIndex = 0;
        this._techSecondsElapsed = 0;
        const blockE = this.currentBlocks[this.currentIndex];
        if (blockE && blockE.techRoutine && blockE.techRoutine.length > 0) {
            this._currentTechBpm = blockE.techRoutine[0].bpm || 60;
        }
        if (window.AudioTools) window.AudioTools.stopMetronome();
        this.startGuidedTechTimer();
        this.renderUI(window.StateManager.getState());
    }

    startGuidedTechTimer() {
        if (this._techTimerInterval) clearInterval(this._techTimerInterval);
        this._techTimerInterval = setInterval(() => {
            this._techSecondsElapsed++;
            const el = document.getElementById("guidedTechTimerDisplay");
            if (el) {
                const mins = Math.floor(this._techSecondsElapsed / 60);
                const secs = this._techSecondsElapsed % 60;
                el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopGuidedTechTimer() {
        if (this._techTimerInterval) {
            clearInterval(this._techTimerInterval);
            this._techTimerInterval = null;
        }
    }

    adjustGuidedTechBpm(delta) {
        this._currentTechBpm = Math.max(30, Math.min(260, this._currentTechBpm + delta));
        const input = document.getElementById("guidedTechBpmInput");
        if (input) input.value = this._currentTechBpm;
        if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(this._currentTechBpm);
    }

    toggleGuidedTechMetro() {
        if (window.AudioTools) {
            if (window.AudioTools.metroIsOn) window.AudioTools.stopMetronome();
            else window.AudioTools.startMetronome(this._currentTechBpm);
            this.renderUI(window.StateManager.getState());
        }
    }

    evaluateGuidedTech(cleanStatus) {
        this.stopGuidedTechTimer();
        if (window.AudioTools) window.AudioTools.stopMetronome();

        const blockE = this.currentBlocks[this.currentIndex];
        if (!blockE || !blockE.techRoutine) return;

        const techItem = blockE.techRoutine[this._techItemIndex];
        const elapsedMinutes = Math.max(1, Math.ceil(this._techSecondsElapsed / 60));
        const endingBpm = this._currentTechBpm;

        let nextBpm = endingBpm;
        let isSuccess = false;
        if (cleanStatus === "clean") {
            nextBpm = Math.min(techItem.targetBpm || 120, endingBpm + 2);
            isSuccess = true;
        } else if (cleanStatus === "fail") {
            nextBpm = Math.max(40, endingBpm - 5);
        }

        // Armazena no buffer em memória para descarga atômica única pelo `finishSession`
        if (!this._techPayload) this._techPayload = [];
        this._techPayload.push({
            id: techItem.id,
            category: techItem.category || "scales",
            title: techItem.title,
            subtask: techItem.activeSubtask,
            endingBpm: endingBpm,
            nextBpm: nextBpm,
            cleanStatus: cleanStatus,
            elapsedMinutes: elapsedMinutes,
            isSuccess: isSuccess
        });

        if (window.AudioTools) {
            if (isSuccess) window.AudioTools.playHitSound();
            else window.AudioTools.playMissSound();
        }

        // Fila Circular Interna
        this._techItemIndex++;
        if (this._techItemIndex >= blockE.techRoutine.length) {
            this._isTechActive = false;
            if (window.App && window.App.showToast) window.App.showToast("✅ Pilares Técnicos concluídos!", "success");
            this.nextBlock(); // Avança automaticamente o SessionPlayer ao final da fila
        } else {
            this._techSecondsElapsed = 0;
            this._currentTechBpm = blockE.techRoutine[this._techItemIndex].bpm || 60;
            this.startGuidedTechTimer();
            this.renderUI(window.StateManager.getState());
        }
    }
    /*
    finishSession() {
        this.stopTimer();
        this.stopMicroReplayTimer(); 
        
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.playHitSound();
        }
        
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        this.currentBlocks = (sState.guidedBlocks && sState.guidedBlocks.length > 0) ? sState.guidedBlocks : this.currentBlocks;
        
        const activeBlock = this.currentBlocks[this.currentIndex];
        const activeBlockId = activeBlock ? activeBlock.id : "";
        
        if (this.currentBlocks[this.currentIndex]) {
            this.currentBlocks[this.currentIndex].completed = true;
        }
        
        // --- EQUAÇÃO DE PADRONIZAÇÃO META 1.6 ---
        const durMinutes = Math.max(1, Math.ceil(this._secondsElapsed / 60));
        const currentTotalSecs = this._secondsElapsed || 0;
        const blockSecs = currentTotalSecs - (this._lastBlockSeconds || 0);
        const blockMins = Math.max(1, Math.round(blockSecs / 60));
        
        const thaw = state.thawRecoveryState || {};
        let diagnosticPassed = null;
        let diagnosticMsg = "";
        
        if (thaw.active && thaw.isReadinessGate) {
            const passed = sState.auditsPassed || [];
            const failed = sState.auditsFailed || [];
            const total = passed.length + failed.length;
            const errorRate = total > 0 ? (failed.length / total) * 100 : 0;
            
            diagnosticPassed = errorRate <= 30;
            
            if (diagnosticPassed) {
                diagnosticMsg = `🎉 Excelente! Sua taxa de erro foi de apenas ${errorRate.toFixed(1)}% (limite de 30%). Seu cérebro resistiu ao hiato e o regime nominal foi mantido para amanhã!`;
            } else {
                diagnosticMsg = `⚠️ Taxa de erro de ${errorRate.toFixed(1)}% detectada (limiar de 30% excedido). Ativando Amortecimento Biológico (meta de 20 min) a partir de amanhã.`;
            }
        }
        
        window.StateManager.setState(prev => {
            const prevSelected = prev.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];
            const updatedSelected = activeBlockId ? prevSelected.filter(id => id !== activeBlockId) : prevSelected;
            
            const forecastTasks = { ...(prev.forecastTasks || {}) };
            if (activeBlock) {
                if (activeBlock.id === "block-a") forecastTasks["d0-audit"] = true;
                if (activeBlock.id === "block-c") forecastTasks["d0-acquisition"] = true;
                if (activeBlock.id === "block-reading" || (activeBlock.id === "block-d" && activeBlock.isReading)) forecastTasks["d0-reading"] = true;
                if (activeBlock.id === "block-e") forecastTasks["d0-tech"] = true;
            }
            
            let updatedThaw = prev.thawRecoveryState ? { ...prev.thawRecoveryState } : null;
            if (updatedThaw && updatedThaw.active) {
                updatedThaw.completed = true;
                updatedThaw.sessionSecondsElapsed = this._secondsElapsed;
                if (updatedThaw.isReadinessGate) {
                    updatedThaw.diagnosticPassed = diagnosticPassed;
                }
            }
            
            let newHistory = prev.history || [];
            let dailyStatsUpdate = { ...prev.dailyStats };
            let globalStatsUpdate = { ...prev.globalStats };

            // 📊 Grava o último bloco se for passivo
            if (activeBlock && (activeBlock.id === "block-b" || (activeBlock.id === "block-d" && !activeBlock.isReading))) {
                const blockTypeStr = activeBlock.id === "block-b" ? "Micro-Reparo (Guiado)" : "Encadeamento (Guiado)";
                newHistory = [
                    {
                        date: new Date().toLocaleDateString('sv-SE'),
                        type: blockTypeStr,
                        pieceId: "Repertório",
                        trechoId: activeBlock.trechoId || "Trecho",
                        durationMinutes: blockMins,
                        accuracyPct: 100,
                        manualOffline: false
                    },
                    ...newHistory
                ];
                dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + blockMins;
                dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + blockMins;
                globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + blockMins;
            }

            // 📜 Grava o registro unificado da Sessão Guiada
            newHistory = [
                {
                    date: new Date().toLocaleDateString('sv-SE'),
                    type: "Sessão Guiada",
                    pieceId: "Rotina Diária",
                    trechoId: `${this.currentBlocks.length} Blocos Concluídos`,
                    durationMinutes: durMinutes,
                    accuracyPct: 100,
                    manualOffline: false
                },
                ...newHistory
            ];
            dailyStatsUpdate.completedSessions = (dailyStatsUpdate.completedSessions || 0) + 1;
            globalStatsUpdate.totalSessions = (globalStatsUpdate.totalSessions || 0) + 1;

            return {
                selectedRoutineBlocks: updatedSelected,
                forecastTasks,
                xp: (prev.xp || 0) + 50,
                thawRecoveryState: updatedThaw,
                history: newHistory,
                dailyStats: dailyStatsUpdate,
                globalStats: globalStatsUpdate,
                sessionState: {
                    inProgress: false,
                    guidedActive: false,
                    currentBlockIndex: 0,
                    guidedBlocks: [],
                    overtimeSuggested: true
                }
            };
        }, "FINISH_GUIDED_SESSION");
        
        if (window.App && window.App.showToast) {
            if (diagnosticMsg) {
                window.App.showToast(diagnosticMsg, diagnosticPassed ? "success" : "warn");
            } else {
                window.App.showToast(`🎉 Parabéns! Sessão Guiada orquestrada com sucesso (+50 XP bônus).`, "success");
            }
        }
    }*/
    finishSession() {
        this.stopTimer();
        this.stopMicroReplayTimer(); 
        this.stopGuidedTechTimer(); // Trava de segurança fase 2
        
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.playHitSound();
        }
        
        const state = window.StateManager.getState();
        const sState = state.sessionState || {};
        
        this.currentIndex = sState.currentBlockIndex !== undefined ? sState.currentBlockIndex : this.currentIndex;
        this.currentBlocks = (sState.guidedBlocks && sState.guidedBlocks.length > 0) ? sState.guidedBlocks : this.currentBlocks;
        
        const activeBlock = this.currentBlocks[this.currentIndex];
        const activeBlockId = activeBlock ? activeBlock.id : "";
        
        if (this.currentBlocks[this.currentIndex]) {
            this.currentBlocks[this.currentIndex].completed = true;
        }
        
        // --- EQUAÇÃO DE PADRONIZAÇÃO META 1.6 ---
        const durMinutes = Math.max(1, Math.ceil(this._secondsElapsed / 60));
        const currentTotalSecs = this._secondsElapsed || 0;
        const blockSecs = currentTotalSecs - (this._lastBlockSeconds || 0);
        const blockMins = Math.max(1, Math.round(blockSecs / 60));
        
        const thaw = state.thawRecoveryState || {};
        let diagnosticPassed = null;
        let diagnosticMsg = "";
        
        if (thaw.active && thaw.isReadinessGate) {
            const passed = sState.auditsPassed || [];
            const failed = sState.auditsFailed || [];
            const total = passed.length + failed.length;
            const errorRate = total > 0 ? (failed.length / total) * 100 : 0;
            
            diagnosticPassed = errorRate <= 30;
            
            if (diagnosticPassed) {
                diagnosticMsg = `🎉 Excelente! Sua taxa de erro foi de apenas ${errorRate.toFixed(1)}% (limite de 30%). Seu cérebro resistiu ao hiato e o regime nominal foi mantido para amanhã!`;
            } else {
                diagnosticMsg = `⚠️ Taxa de erro de ${errorRate.toFixed(1)}% detectada (limiar de 30% excedido). Ativando Amortecimento Biológico (meta de 20 min) a partir de amanhã.`;
            }
        }
        
        window.StateManager.setState(prev => {
            const prevSelected = prev.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];
            const updatedSelected = activeBlockId ? prevSelected.filter(id => id !== activeBlockId) : prevSelected;
            
            const forecastTasks = { ...(prev.forecastTasks || {}) };
            if (activeBlock) {
                if (activeBlock.id === "block-a") forecastTasks["d0-audit"] = true;
                if (activeBlock.id === "block-c") forecastTasks["d0-acquisition"] = true;
                if (activeBlock.id === "block-reading" || (activeBlock.id === "block-d" && activeBlock.isReading)) forecastTasks["d0-reading"] = true;
                if (activeBlock.id === "block-e") forecastTasks["d0-tech"] = true;
            }
            
            let updatedThaw = prev.thawRecoveryState ? { ...prev.thawRecoveryState } : null;
            if (updatedThaw && updatedThaw.active) {
                updatedThaw.completed = true;
                updatedThaw.sessionSecondsElapsed = this._secondsElapsed;
                if (updatedThaw.isReadinessGate) {
                    updatedThaw.diagnosticPassed = diagnosticPassed;
                }
            }
            
            let newHistory = prev.history || [];
            let dailyStatsUpdate = { ...prev.dailyStats };
            let globalStatsUpdate = { ...prev.globalStats };
            let technicalUpdate = { ...(prev.technical || {}) };
            let weeklyGoalsUpdate = { ...(prev.weeklyGoals || {}) };
            let addedTechMins = 0;

            // ⚙️ ROTEAMENTO DE SSOT: Descarrega o Buffer do Player Técnico no Encerramento
            if (this._techPayload && this._techPayload.length > 0) {
                this._techPayload.forEach(tech => {
                    const list = technicalUpdate[tech.category] ? [...technicalUpdate[tech.category]] : [];
                    const idx = list.findIndex(ex => ex.id === tech.id);
                    if (idx !== -1) {
                        const currentEx = list[idx];
                        let box = currentEx.box !== undefined ? currentEx.box : 1;
                        let hits = currentEx.consecutiveHits !== undefined ? currentEx.consecutiveHits : 0;

                        if (tech.cleanStatus === "clean") {
                            hits++;
                            if (hits >= 3) {
                                box = Math.min(5, box + 1);
                                hits = 0;
                            }
                        } else if (tech.cleanStatus === "fail") {
                            hits = 0;
                            box = Math.max(1, box - 1);
                        }
                        
                        list[idx] = {
                            ...currentEx,
                            bpm: tech.nextBpm,
                            trainedToday: true,
                            totalMinutes: (currentEx.totalMinutes || 0) + tech.elapsedMinutes,
                            box: box,
                            consecutiveHits: hits
                        };
                        technicalUpdate[tech.category] = list;
                    }
                    
                    newHistory = [
                        {
                            date: new Date().toLocaleDateString('sv-SE'),
                            type: "Técnica (Guiado)",
                            pieceId: tech.title,
                            trechoId: `Foco: ${tech.subtask} (${tech.endingBpm} BPM)`,
                            durationMinutes: tech.elapsedMinutes,
                            accuracyPct: tech.isSuccess ? 100 : 70,
                            manualOffline: false
                        },
                        ...newHistory
                    ];
                    addedTechMins += tech.elapsedMinutes;
                });
                
                dailyStatsUpdate.technicalMinutes = (dailyStatsUpdate.technicalMinutes || 0) + addedTechMins;
                weeklyGoalsUpdate.technicalDoneMinutes = (weeklyGoalsUpdate.technicalDoneMinutes || 0) + addedTechMins;
            }

            // 📊 Grava o último bloco se for passivo e não terceirizado
            if (activeBlock && !activeBlock.subPlayerUsed && (activeBlock.id === "block-a" || activeBlock.id === "block-b" || (activeBlock.id === "block-d" && !activeBlock.isReading))) {
                let blockTypeStr = "Bloco de Estudo";
                if (activeBlock.id === "block-a") blockTypeStr = "Auditoria a Frio";
                else if (activeBlock.id === "block-b") blockTypeStr = "Micro-Reparo (Guiado)";
                else if (activeBlock.id === "block-d") blockTypeStr = "Encadeamento (Guiado)";

                newHistory = [
                    {
                        date: new Date().toLocaleDateString('sv-SE'),
                        type: blockTypeStr,
                        pieceId: "Repertório",
                        trechoId: activeBlock.trechoId || "Trecho",
                        durationMinutes: blockMins,
                        accuracyPct: 100,
                        manualOffline: false
                    },
                    ...newHistory
                ];
                dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + blockMins;
                dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + blockMins;
                globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + blockMins;
            }

            // 📜 Grava o registro unificado da Sessão Guiada
            newHistory = [
                {
                    date: new Date().toLocaleDateString('sv-SE'),
                    type: "Sessão Guiada",
                    pieceId: "Orquestração",
                    trechoId: `${this.currentBlocks.length} Blocos Concluídos (Duração Real: ${durMinutes} min)`,
                    durationMinutes: 0, // <-- CRÍTICO: Zero! Assim ele fica no histórico visual, mas as calculadoras não duplicam a soma!
                    accuracyPct: 100,
                    manualOffline: false
                },
                ...newHistory
            ];
            dailyStatsUpdate.completedSessions = (dailyStatsUpdate.completedSessions || 0) + 1;
            globalStatsUpdate.totalSessions = (globalStatsUpdate.totalSessions || 0) + 1;            
            
            // 🧹 Limpa o buffer pós-descarregamento
            this._techPayload = [];

            return {
                selectedRoutineBlocks: updatedSelected,
                forecastTasks, // Salva o check permanente do último bloco na Aba Hoje
                xp: (prev.xp || 0) + 50, // XP de Bônus por orquestração de sessão mantido
                thawRecoveryState: updatedThaw,
                technical: technicalUpdate,
                weeklyGoals: weeklyGoalsUpdate,
                history: newHistory,
                dailyStats: dailyStatsUpdate,
                globalStats: globalStatsUpdate,
                sessionState: {
                    inProgress: false,
                    guidedActive: false,
                    currentBlockIndex: 0,
                    guidedBlocks: [],
                    overtimeSuggested: true
                }
            };
        }, "FINISH_GUIDED_SESSION");
        
        if (window.App && window.App.showToast) {
            if (diagnosticMsg) {
                window.App.showToast(diagnosticMsg, diagnosticPassed ? "success" : "warn");
            } else {
                window.App.showToast(`🎉 Parabéns! Sessão Guiada orquestrada com sucesso (+50 XP bônus).`, "success");
            }
        }
    }

    exitSession() {
        if (confirm("Deseja realmente sair da Sessão Guiada? O tempo praticado até aqui será contabilizado.")) {
            this.finishSession();
        }
    }
    renderUI(state) {
        const container = document.getElementById("guidedSessionContainer");
        if (!container) return;

        const sState = state.sessionState || {};

        // --- ATUALIZAÇÃO REATIVA DO BLOCO B INTRADIA EM RAM ---
        if (sState.guidedBlocks && sState.auditsFailed && sState.auditsFailed.length > 0) {
            const bBlock = sState.guidedBlocks.find(b => b.id === "block-b");
            if (bBlock && (bBlock.inactive || bBlock.title.includes("Aguardando"))) {
                const failedId = sState.auditsFailed;
                const pieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
                let failedPiece = null;
                let failedTrecho = null;
                for (const p of pieces) {
                    const t = (p.trechos || []).find(tr => tr.id === failedId);
                    if (t) {
                        failedPiece = p;
                        failedTrecho = t;
                        break;
                    }
                }
                bBlock.pieceId = failedPiece ? failedPiece.id : null;
                bBlock.trechoId = failedId;
                bBlock.title = `🛠️ Micro-Reparo — ${failedTrecho ? failedTrecho.label : failedId}`;
                bBlock.pedagogicalRationale = "Foco imediato no gargalo com erro/hesitação detectado na auditoria do Bloco A hoje.";
                bBlock.inactive = false;
            }
        }

        // 🧠 [CAMADA VI - META 5.4.1] INTERCEPTAÇÃO REATIVA PARA A MICRO-PAUSA DE 10S NA SESSÃO GUIADA
        const activeBlockForPause = sState.guidedActive && sState.guidedBlocks ? sState.guidedBlocks[sState.currentBlockIndex] : null;
        if (activeBlockForPause && activeBlockForPause.id === "block-a") {
            const auditsList = activeBlockForPause.audits || [];
            const currentAuditIdx = sState.currentAuditIndex || 0;
            if (this.lastAuditIndex === undefined) this.lastAuditIndex = 0;
            
            // Se mudou o índice e não é o primeiro trecho, dispara o timer de 10s com o BPM da próxima peça
            if (currentAuditIdx > 0 && currentAuditIdx !== this.lastAuditIndex && currentAuditIdx < auditsList.length) {
                this.lastAuditIndex = currentAuditIdx;
                const nextAudit = auditsList[currentAuditIdx];
                const nextPiece = nextAudit && window.RepertoireManager ? window.RepertoireManager.getPieceAndTrecho(nextAudit.pieceId, nextAudit.trecho.id).piece : null;
                const nextBpm = nextPiece ? parseInt(nextPiece.bpm, 10) || 60 : 60;
                
                setTimeout(() => {
                    this.startMicroReplayTimer(nextBpm, () => {
                        this.renderUI(window.StateManager.getState());
                    });
                }, 50);
            }
        }

        // 1. Tela Inicial de Entrada Direta / Seletor de Rotina
        if (!sState.guidedActive || !sState.guidedBlocks || sState.guidedBlocks.length === 0) {
            const pipeline = window.NeuroEngine ? window.NeuroEngine.generateDailyPipeline() : [];
            let selectedBlockIds = state.selectedRoutineBlocks || ["block-a", "block-b", "block-c", "block-d", "block-e"];

            // Auto-inclusão defensiva do Bloco A se houver auditorias
            if (pipeline.some(b => b.id === "block-a") && !selectedBlockIds.includes("block-a")) {
                selectedBlockIds = ["block-a", ...selectedBlockIds];
            }

            const totalSelectedMinutes = pipeline.filter(b => selectedBlockIds.includes(b.id)).reduce((acc, b) => acc + (b.targetMinutes || 0), 0);
            const overtimeList = window.NeuroEngine ? window.NeuroEngine.generateOvertimeSuggestions(state) : [];

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
                    color = "#38bdf8"; // Light sky blue
                } else if (thawMode === "SOFT_REGRESSION") {
                    modeTitle = "🌊 Modo Degelo com Amortecedor (Retorno de " + missedDays + " dias)";
                    modeDesc = "Proteção parcial ativa: hesitações ou erros causam apenas regressão suave (-1 nível de caixa) em vez de queda livre para a Caixa 1.";
                    color = "var(--warn)";
                }
                
                thawBannerHtml = `
                    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${color}; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px; max-width: 600px; margin-left: auto; margin-right: auto; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="font-size: 1.5rem; line-height: 1;">🛡️</div>
                        <div style="flex: 1;">
                            <strong style="color: ${color}; font-size: 0.88rem; display: block; margin-bottom: 4px;">${modeTitle}</strong>
                            <span style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.4; display: block;">${modeDesc}</span>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
<div style="text-align: center; padding: 16px 10px;">
    ${thawBannerHtml}
    <h2 style="margin: 0 0 6px; font-size: 1.2rem; color: #fff;">🎯 Sessão Guiada da Sala de Estudos</h2>
    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.45;">
        Execução sequencial dos blocos prescritos com telemetria automática, cronômetro central e controle sem atrito.
    </p>

    <!-- Seletor Rápido de Blocos -->
    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 14px; padding: 14px; margin-bottom: 16px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: var(--accent); font-size: 0.85rem;">Sequência Prescrita para Hoje:</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">⏱️ ~${totalSelectedMinutes} min total</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
            ${pipeline.map(b => {
                const isChecked = selectedBlockIds.includes(b.id);
                return `
                <label class="routine-item" data-action="toggle-routine-block" data-block="${b.id}" style="${isChecked ? 'border-color: rgba(59, 130, 246, 0.4); background: #141f36;' : 'opacity: 0.6;'}">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <input type="checkbox" data-action="toggle-routine-block" data-block="${b.id}" ${isChecked ? 'checked' : ''} style="pointer-events: none;">
                        <div class="routine-info">
                            <div class="routine-title" style="font-weight: 700; color: #fff; font-size: 0.85rem;">${b.title}</div>
                            <div class="routine-desc" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">💡 ${b.pedagogicalRationale}</div>
                        </div>
                    </div>
                    <span class="badge info" style="font-size: 0.68rem; padding: 3px 8px;">${b.targetMinutes} min</span>
                </label>
                `;
            }).join('')}
        </div>
    </div>

    <button class="btn btn-guided-main" style="padding: 16px; font-size: 1rem; max-width: 480px; margin: 0 auto; display: block; font-weight: 800;" data-action="launch-guided-session-direct">
        ▶ INICIAR SESSÃO DO DIA (${totalSelectedMinutes} MIN)
    </button>

    <!-- Sugestor Adaptativo de Tempo Extra (Over-Time Engine) -->
    <div style="margin-top: 24px; text-align: left; background: var(--card2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; max-width: 600px; margin-left: auto; margin-right: auto;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 1.1rem;">⏳</span>
            <strong style="color: #fff; font-size: 0.92rem;">Tem mais 10-15 minutos livres? (Tempo Extra)</strong>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 12px;">
            Treinos complementares adaptativos de baixo estresse cognitivo para consolidação rápida:
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${overtimeList.map(ot => `
            <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="flex: 1;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">${ot.icon} ${ot.title}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">${ot.desc}</div>
                </div>
                <button class="btn btn-outline" style="font-size: 0.75rem; padding: 6px 12px; white-space: nowrap; border-color: var(--accent2); color: var(--accent2); font-weight: 700;" data-action="${ot.action}">
                    +${ot.estMinutes} min
                </button>
            </div>
            `).join('')}
        </div>
    </div>
</div>
`;
            return;
        }

        // 2. Tela de Execução da Sessão Guiada (Split-View / Fila de Missões)
        const currentBlock = sState.guidedBlocks[sState.currentBlockIndex] || sState.guidedBlocks[0];
        const auditsList = currentBlock.audits || (currentBlock.pieceId && currentBlock.trechoId ? [{ pieceId: currentBlock.pieceId, trecho: { id: currentBlock.trechoId, label: currentBlock.trechoId } }] : []);

        const { piece, trecho } = (currentBlock.pieceId && currentBlock.trechoId && window.RepertoireManager)
            ? window.RepertoireManager.getPieceAndTrecho(currentBlock.pieceId, currentBlock.trechoId)
            : { piece: null, trecho: null };

        const scoreImgUrl = (typeof getScoreImageUrl === "function" && trecho) ? getScoreImageUrl(trecho.label) : "";

        container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
    <span class="badge info" style="font-size: 0.8rem; padding: 4px 10px; font-weight: 700;">
        ${currentBlock.tag || 'Bloco'}: Bloco ${sState.currentBlockIndex + 1} de ${sState.guidedBlocks.length}
    </span>
    <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.78rem; color: var(--text-muted);">Tempo Total Guiado:</span>
        <span id="guidedTimerDisplay" style="font-size: 1.3rem; font-weight: 700; font-family: monospace; color: #fff;">
            ${String(Math.floor(this._secondsElapsed / 60)).padStart(2, '0')}:${String(this._secondsElapsed % 60).padStart(2, '0')}
        </span>
    </div>
</div>

<div class="split-view-container">
    <!-- Coluna Esquerda: Conteúdo do Bloco Ativo (70%) -->
    <div class="split-left">
        <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
            <h3 style="color: #fff; font-size: 1.15rem; margin-bottom: 4px;">${currentBlock.title || 'Bloco de Estudo'}</h3>
            <p style="font-size: 0.82rem; color: var(--accent); margin-bottom: 12px;">💡 ${currentBlock.pedagogicalRationale || 'Foco na execução consciente.'}</p>

            <!-- Execução de Auditoria a Frio (Bloco A com 1 ou múltiplos trechos sequenciais) -->
            ${currentBlock.id === "block-a" ? `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
                ${(() => {
                    const currentAuditIdx = sState.currentAuditIndex || 0;
                    // 🧠 [CAMADA VI - META 5.4.1] CARD DE MICRO-PAUSA REATIVA (Passo 3.5)
                    if (window.SessionPlayer && window.SessionPlayer._replayTimerInterval !== null) {
                        return `
                        <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 8px;">🧠</div>
                            <h4 style="color: #93c5fd; font-size: 1rem; margin: 0 0 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Micro-Pausa Neural (10s)</h4>
                            <p id="guidedMicroReplayText" style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 12px;">Prevenindo fadiga e preparando o próximo trecho...</p>
                            <div style="height: 6px; background: #0e1626; border-radius: 3px; overflow: hidden; max-width: 280px; margin: 0 auto 10px;">
                                <div id="guidedMicroReplayBar" style="width: 0%; height: 100%; background: var(--accent); transition: width 0.2s linear;"></div>
                            </div>
                            <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Escute o metrônomo para sincronizar o andamento sugerido!</span>
                        </div>
                        `;
                    }
                    if (auditsList.length === 0) {
                        return `
                        <div style="background: var(--card-inner); border: 1px dashed var(--border); border-radius: 12px; padding: 20px; text-align: center; opacity: 0.85;">
                            <span style="font-size: 2rem;">❄️</span>
                            <h4 style="color: var(--text-muted); font-size: 1rem; margin: 6px 0 4px; font-weight: 700;">Nenhuma Auditoria Pendente</h4>
                            <p style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4;">O acervo não possui microblocos aguardando validação pós-sono hoje. Avance para o próximo bloco.</p>
                        </div>
                        `;
                    } else if (currentAuditIdx < auditsList.length) {
                        const audit = auditsList[currentAuditIdx];
                        const aTrecho = audit.trecho;
                        const aScoreUrl = typeof getScoreImageUrl === "function" ? getScoreImageUrl(aTrecho.label) : "";
                        const aPiece = window.RepertoireManager ? window.RepertoireManager.getPieceAndTrecho(audit.pieceId, aTrecho.id).piece : null;
                        return `
                        <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 14px; position: relative; border-left: 3px solid var(--accent);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📋 Auditoria Pós-Sono (${currentAuditIdx + 1} de ${auditsList.length} trechos)</span>
                                    <strong style="color: #fff; font-size: 0.95rem;">${aPiece ? aPiece.title : ''} — ${aTrecho.label}</strong>
                                </div>
                                <span class="box-badge box-${aTrecho.box || 1}">Caixa ${aTrecho.box || 1}</span>
                            </div>
                            ${aScoreUrl ? `
                            <div class="score-container skeleton-pulse" style="min-height: 250px; max-height: 440px; background: #000; border-radius: 8px; padding: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                <img src="${aScoreUrl}" alt="Partitura ${aTrecho.label}" class="sheet-paper-effect" style="max-height: 420px; max-width: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${aScoreUrl}" data-title="${aPiece ? aPiece.title : ''} — ${aTrecho.label}">
                            </div>
                            ` : ''}
                            <div style="display: flex; gap: 8px;">
                                <button class="btn-audit btn-audit-hit" style="padding: 12px 10px; font-weight: 800; font-size: 0.8rem;" data-action="audit-hit" data-piece="${audit.pieceId}" data-trecho="${aTrecho.id}">
                                    ✔️ 1º Tiro Limpo (+15 XP)
                                </button>
                                <button class="btn-audit btn-audit-miss" style="padding: 12px 10px; font-weight: 700; font-size: 0.8rem;" data-action="audit-miss" data-piece="${audit.pieceId}" data-trecho="${aTrecho.id}">
                                    ❌ Erro / Hesitação (Volta Cx 1)
                                </button>
                            </div>
                        </div>
                        `;
                    } else {
                        return `
                        <div style="background: var(--card-inner); border: 1px solid var(--accent2); border-radius: 12px; padding: 20px; text-align: center;">
                            <span style="font-size: 2rem;">🎉</span>
                            <h4 style="color: var(--accent2); font-size: 1rem; margin: 6px 0 4px; font-weight: 700;">Todas as Auditorias de Hoje Concluídas!</h4>
                            <p style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4;">Foco pós-sono validado com sucesso. Avance para os próximos blocos de estudo.</p>
                        </div>
                        `;
                    }
                })()}
            </div>
            ` : ''}

            <!-- Execução de Blocos B, C, D com partitura única -->
            ${currentBlock.id !== "block-a" && currentBlock.id !== "block-reading" && !currentBlock.isReading && scoreImgUrl ? `
            <div class="score-container skeleton-pulse" style="min-height: 250px; max-height: 440px; position: relative; background: #000; border-radius: 12px; border: 1px solid var(--border); padding: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;">
                <img src="${scoreImgUrl}" alt="Partitura" class="sheet-paper-effect" style="max-height: 420px; max-width: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${scoreImgUrl}" data-title="${piece ? piece.title : ''} — ${trecho ? trecho.label : ''}">
            </div>
            ` : ''}

            <!-- Ações de atalho do bloco -->
            ${(currentBlock.id === "block-c" || currentBlock.id === "block-b" || (currentBlock.id === "block-d" && !currentBlock.isReading)) && currentBlock.pieceId && currentBlock.trechoId ? `
            <div style="margin-bottom: 14px;">
                <button class="btn btn-primary" style="padding: 14px; font-weight: 800; background: var(--purple); width: 100%; border-radius: 10px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);" data-action="open-sandwich-from-block" data-piece="${currentBlock.pieceId}" data-trecho="${currentBlock.trechoId}">
                    🥪 Abrir este trecho no Modo Sanduíche (3x3 Acertos)
                </button>
            </div>
            ` : ''}
            
            ${(currentBlock.isReading || currentBlock.id === "block-reading" || (currentBlock.id === "block-d" && currentBlock.isReading)) ? `
            <div style="margin-bottom: 14px; background: rgba(14, 165, 233, 0.05); border: 1px dashed var(--accent); border-radius: 10px; padding: 16px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 8px;">📖</div>
                <h4 style="color: #fff; font-size: 1rem; margin: 0 0 6px;">Central de Leitura Reativa</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">Transfira seu foco para o painel de leitura relâmpago de One-Shots ininterruptos.</p>
                <button class="btn btn-primary" style="padding: 14px; font-weight: 800; background: var(--accent2); color: #04240f; width: 100%; border-radius: 10px;" data-action="switch-sala-mode" data-mode="reading">
                    📖 Abrir Acervo Primer
                </button>
            </div>
            ` : ''}


            ${currentBlock.id === "block-e" ? `
            <div style="background: rgba(139, 92, 246, 0.05); border: 1px dashed var(--purple); border-radius: 12px; padding: 16px; margin-bottom: 14px;">
                <h4 style="color: #fff; font-size: 1rem; margin: 0 0 12px; display: flex; align-items: center; justify-content: space-between;">
                    <span>⚖️ Laboratório Técnico Integrado</span>
                    <span class="badge purple" style="font-size: 0.65rem;">Elemento ${this._techItemIndex + 1} de ${(currentBlock.techRoutine || []).length}</span>
                </h4>
                
                ${!this._isTechActive ? `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${(currentBlock.techRoutine || []).map((tech, idx) => `
                            <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                                <div style="text-align: left;">
                                    <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">
                                        ${idx === 0 ? '🔴 Prioridade (Negligenciado)' : '🟢 Contraste (Avançado)'}
                                    </div>
                                    <strong style="color: #fff; font-size: 0.9rem;">${tech.title}</strong>
                                    <div style="font-size: 0.75rem; color: var(--purple); font-weight: 600; margin-top: 2px;">🎯 Foco: ${tech.activeSubtask}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 0.9rem; font-weight: bold; color: var(--accent2);">${tech.bpm} <small style="font-size: 0.6rem; color: var(--text-muted);">BPM</small></div>
                                    <div style="font-size: 0.65rem; color: var(--text-muted);">Acumulado: ${tech.totalMinutes || 0} min</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary" style="padding: 14px; font-weight: 800; background: var(--purple); width: 100%; border-radius: 8px; margin-top: 14px;" onclick="if(window.SessionPlayer) window.SessionPlayer.startGuidedTech()">
                        ▶ INICIAR EXECUÇÃO TÉCNICA
                    </button>
                `: (() => {
                    const currentTech = currentBlock.techRoutine[this._techItemIndex];
                    if (!currentTech) return '';
                    const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;
                    
                    // ⏱️ Calcula o tempo sugerido por exercício dividindo o tempo total do bloco
                    const suggestedTime = Math.max(1, Math.round((currentBlock.targetMinutes || 6) / (currentBlock.techRoutine.length || 1)));

                    return `
                    <div style="background: var(--card-inner); border: 1px solid var(--purple); border-radius: 12px; padding: 16px; text-align: center; animation: fadeIn 0.3s ease;">
                        <span class="badge purple" style="font-size: 0.72rem; margin-bottom: 8px; display: inline-block;">${this._techItemIndex === 0 ? '🔴 Prioridade' : '🟢 Contraste'}</span>
                        <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 1.2rem;">${currentTech.title}</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0; margin-bottom: 12px;">🎯 Foco: <strong>${currentTech.activeSubtask}</strong></p>

                        <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 16px;">
                            <div>
                                <small style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; display: block;">Cronômetro (Meta: ~${suggestedTime} min)</small>
                                <span id="guidedTechTimerDisplay" style="font-size: 1.8rem; font-family: monospace; font-weight: 800; color: #fff;">00:00</span>
                            </div>
                            <div>
                                <small style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; display: block;">Andamento</small>
                                <span style="font-size: 1.8rem; font-weight: 800; color: var(--accent2);">${this._currentTechBpm} <small style="font-size: 0.8rem; color: var(--text-muted);">BPM</small></span>
                            </div>
                        </div>

                        <!-- Metrônomo Embutido -->
                        <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <button class="btn btn-reset" style="padding: 6px 12px; font-size: 0.85rem;" onclick="if(window.SessionPlayer) window.SessionPlayer.adjustGuidedTechBpm(-5)">-5</button>
                            <input type="number" id="guidedTechBpmInput" value="${this._currentTechBpm}" style="width: 55px; text-align: center; font-weight: bold; background: transparent; border: none; color: #fff; font-size: 1.15rem;" readonly>
                            <button class="btn btn-reset" style="padding: 6px 12px; font-size: 0.85rem;" onclick="if(window.SessionPlayer) window.SessionPlayer.adjustGuidedTechBpm(5)">+5</button>
                            <button class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="padding: 8px 14px; font-size: 0.85rem; font-weight: bold; margin-left: 8px;" onclick="if(window.SessionPlayer) window.SessionPlayer.toggleGuidedTechMetro()">
                                ${isMetroOn ? '⏸ Parar (M)' : '▶ Ligar (M)'}
                            </button>
                        </div>

                        <!-- Avaliação Direta e Avanço -->
                        <div style="font-size: 0.72rem; color: #9ca3af; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">Avalie para avançar ao próximo:</div>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button class="btn btn-primary" style="flex: 1; padding: 10px 4px; background: #10b981; font-weight: 700; font-size: 0.8rem; border-radius: 8px;" onclick="if(window.SessionPlayer) window.SessionPlayer.evaluateGuidedTech('clean')">
                                💚 Limpo (+2)
                            </button>
                            <button class="btn btn-outline" style="flex: 1; padding: 10px 4px; border-color: #f59e0b; color: #f59e0b; font-weight: 700; font-size: 0.8rem; border-radius: 8px;" onclick="if(window.SessionPlayer) window.SessionPlayer.evaluateGuidedTech('wobbly')">
                                💛 Oscilou (0)
                            </button>
                            <button class="btn btn-reset" style="flex: 1; padding: 10px 4px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; font-weight: 700; font-size: 0.8rem; border-radius: 8px;" onclick="if(window.SessionPlayer) window.SessionPlayer.evaluateGuidedTech('fail')">
                                ❌ Errei (-5)
                            </button>
                        </div>
                        
                        <!-- Botão explícito de Pular -->
                        <button class="btn btn-outline" style="width: 100%; margin-top: 10px; padding: 8px; font-size: 0.75rem; font-weight: bold; border-color: rgba(255,255,255,0.1); color: #94a3b8;" onclick="if(window.SessionPlayer) window.SessionPlayer.evaluateGuidedTech('wobbly')">
                            ⏭️ Pular para o próximo fundamento
                        </button>
                    </div>
                    `;
                })()}
            </div>
            ` : ''}
            <div style="display: flex; gap: 8px;">
                ${sState.currentBlockIndex > 0 ? `
                <button class="btn btn-outline" style="flex: 1; padding: 12px;" data-action="prev-guided-block">
                    ← Bloco Anterior
                </button>
                ` : ''}
                <button class="btn btn-start" style="flex: 2; padding: 14px; font-weight: 800;" data-action="next-guided-block">
                    ${sState.currentBlockIndex === sState.guidedBlocks.length - 1 ? '🏁 Concluir Sessão Guiada' : 'Próximo Bloco → [N]'}
                </button>
            </div>
        </div>

        <button class="btn btn-reset" style="width: 100%; font-size: 0.75rem; background: transparent; color: var(--danger);" data-action="exit-guided-session">
            ⏹ Encerrar Sessão e Salvar Tempo
        </button>
    </div>

    <!-- Coluna Direita: Sidebar Dinâmica de Missões (30%) -->
    <div class="split-right">
        <div class="card" style="padding: 14px; background: var(--card2); margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #fff; font-size: 0.85rem;">Fila Dinâmica do Dia</strong>
                <span class="badge info" style="font-size: 0.65rem;">${sState.currentBlockIndex + 1}/${sState.guidedBlocks.length}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${sState.guidedBlocks.map((b, idx) => {
                    const isCurrent = idx === sState.currentBlockIndex;
                    const isPast = b.completed || idx < sState.currentBlockIndex;
                    let statusBadge = isPast ? '✅ Concluído' : (isCurrent ? '⏳ Ativo' : '⏱️ A Seguir');
                    let badgeClass = isPast ? 'badge' : (isCurrent ? 'badge info' : 'badge');
                    let bgStyle = isCurrent ? 'background: #141f36; border: 1px solid var(--accent);' : (isPast ? 'background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2);' : 'background: var(--card-inner); border: 1px solid var(--border); opacity: 0.75;');

                    return `
                    <div style="${bgStyle} border-radius: 8px; padding: 8px 10px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 10px;" data-action="jump-guided-block" data-index="${idx}">
                        <!-- Checkbox síncrono para marcar e desmarcar manualmente -->
                        <input type="checkbox" class="sidebar-block-check" data-index="${idx}" ${b.completed ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; margin-top: 1px;" onclick="event.stopPropagation();">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: ${isCurrent ? 'var(--accent)' : (b.completed ? 'var(--accent2)' : '#cbd5e1')};">${b.tag}</strong>
                                <span class="${badgeClass}" style="font-size: 0.62rem; padding: 2px 6px;">${statusBadge}</span>
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${b.title}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    </div>
</div>
`;
    }
}

window.SessionPlayer = new SessionPlayerClass();
