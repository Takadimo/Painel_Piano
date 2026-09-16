/**
 * sandwichPlayer.js - Controlador do Modo de Prática em Bloco Sanduíche (Cockpit Split-View)
 * Painel de Estudos de Piano — Versão 15.0.0
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Layout Ergonômico Split-View (Canvas de Partitura 70% + Sidebar de Controle Fixo 30%)
 * - Telemetria Bruta de Erros/Acertos: Registra 100% das repetições reais no SSOT
 * - 3 Rounds de 3 acertos seguidos com intervalos técnicos de 90s (desativação neural)
 * - Fim da ilusão de competência: Aquisição na Caixa 1 mantém consolidated: false (exige auditoria pós-sono)
 * - Metrônomo com Pulso Luminoso, Pausa Ativa [P], Desafio de Memória Ativa [H] e Micro-Pausa (10s)
 * - Scorecard final fidedigno com taxa de assertividade e tags de dificuldade de 1-clique
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class SandwichPlayerClass {
    constructor() {
        this.selectedPieceId = null;
        this.selectedTrechoId = null;
        this.currentBpm = 60;
        this.metroWasOnBeforePause = false;
        this.swSecondsElapsed = 0;
        
        this.techBpm = 60;
        this.showFeedbackForm = false;
        this.showTechFlashcard = false; 
        
        this._swTimerInterval = null;
        this._replayTimerInterval = null;
        this._practiceTimerInterval = null;
        this._replaySeconds = 0;
        this._swIntervalElapsedSeconds = 0;
        this._swTotalIntervalSeconds = 0;
        this._swPracticeSecondsElapsed = 0;
        this._isSwPaused = false;
    }

    getReverseChainingSteps(trecho) {
        const defaultSteps = [
            "Fase 1: Compasso Final (Pouso)",
            "Fase 2: Conexão Retrógrada (Meio)",
            "Fase 3: Frase Completa Integrada"
        ];
        if (!trecho || !trecho.compassos) return defaultSteps;
        const parts = trecho.compassos.split("-");
        if (parts.length !== 2) return defaultSteps;
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (isNaN(start) || isNaN(end) || end <= start) return defaultSteps;

        const span = end - start + 1;
        if (span === 4) {
            return [
                `Fase 1: Compasso de Chegada [c. ${end}]`,
                `Fase 2: Conexão Retrógrada [c. ${end-1}-${end}]`,
                `Fase 3: Frase Completa [c. ${start}-${end}]`
            ];
        } else if (span === 8) {
            return [
                `Fase 1: Compassos de Chegada [c. ${end-1}-${end}]`,
                `Fase 2: Conexão Intermediária [c. ${end-3}-${end}]`,
                `Fase 3: Frase Completa [c. ${start}-${end}]`
            ];
        } else {
            const mid = Math.round(start + span / 2);
            return [
                `Fase 1: Compasso Final de Resolução [c. ${end}]`,
                `Fase 2: Conexão Dinâmica [c. ${mid}-${end}]`,
                `Fase 3: Frase Completa Integrada [c. ${start}-${end}]`
            ];
        }
    }
    
    startSession(pieceId = null, trechoId = null) {
        const activePieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        let piece = pieceId ? activePieces.find(p => p.id === pieceId) : (this.selectedPieceId ? activePieces.find(p => p.id === this.selectedPieceId) : activePieces[0]);
        if (!piece && activePieces.length > 0) piece = activePieces[0];
        if (!piece) return;

        let trecho = trechoId ? (piece.trechos || []).find(t => t.id === trechoId) : (this.selectedTrechoId ? (piece.trechos || []).find(t => t.id === this.selectedTrechoId) : (piece.trechos && piece.trechos[0]));
        if (!trecho) return;

        this.selectedPieceId = piece.id;
        this.selectedTrechoId = trecho.id;

/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        if (trecho.passo >= 2 && window.RepertoireManager && !window.RepertoireManager.isPasso2Unlocked(piece.id, trecho.id)) {
            if (window.App && window.App.showToast) {
                window.App.showToast(`🔒 Passo ${trecho.passo} Travado! Consolide os microblocos base na Caixa 2 antes.`, "warn");
            }
            return;
        }

        const isHabit = trecho.isCorrectingHabit || false;
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Conversão para Modo Sandbox) ---
        const isSandbox = (trecho.passo >= 2 && window.RepertoireManager && !window.RepertoireManager.isPrerequisiteMet(piece.id, trecho.id));
        if (isSandbox) {
            if (window.App && window.App.showToast) {
                window.App.showToast(`🔒 Sessão Sandbox! Modo Exploratório ativo (sem avanço de caixas).`, "warn");
            }
        }

        const isHabit = trecho.isCorrectingHabit || false;
        const target = isHabit ? 5 : 3;
        
        // 🧠 [CAMADA V - META 5.4.3] BPM Adaptativo Inteligente calculado pelo NeuroEngine
        const state = window.StateManager ? window.StateManager.getState() : {};
        if (window.NeuroEngine) {
            this.currentBpm = window.NeuroEngine.calculateAdaptiveBpm(piece, trecho, state);
            // O Speed Lock é considerado ativo se a peça estiver em alerta ou se o normIFM estiver forçando recuo
            const cache = state.metricsCache || {};
            const trechoCache = cache[trecho.id] || {};
            this.speedLock = (piece.status === "alerta" || piece.status === "Alerta" || trechoCache.normIFM > 0.80);
        } else {
            this.currentBpm = parseInt(piece.bpm, 10) || 60;
            this.speedLock = false;
        }
        
        if (this._swTimerInterval) clearInterval(this._swTimerInterval);
        
        this._swPracticeSecondsElapsed = 0;
        this.swSecondsElapsed = 0;
        this._swIntervalElapsedSeconds = 0;
        this._swTotalIntervalSeconds = 0; 
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.stopMetronome();
        }
        this.startPracticeTimer();

        window.StateManager.setState({
            activeTab: "sala",
            salaMode: "sandwich",
            sandwichState: {
                active: true,
                finished: false,
                isPaused: false,
                pieceId: piece.id,
                trechoId: trecho.id,
/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
                currentRound: 1,
                targetHits: target,
                isCorrectingHabit: isHabit,
                isPromptDropped: false,
                consecutiveHits: 0,
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Gravação da Flag) ---
                currentRound: 1,
                targetHits: target,
                isCorrectingHabit: isHabit,
                isPromptDropped: false,
                isSandbox: isSandbox, // <-- INJEÇÃO DA FLAG DE ISOLAMENTO
                consecutiveHits: 0,
                roundHits: 0,
                roundMisses: 0,
                sessionHits: 0,
                sessionMisses: 0,
                attemptHistory: [],
                inInterval: false,
                inPostIntervalWait: false,
                intervalSecondsRemaining: 90,
                practiceSecondsElapsed: 0,
                lastTechDrawn: null,
                sessionBpm: this.currentBpm,
                startTime: new Date().toISOString()
            }
        }, "START_SANDWICH_SESSION");
    }

    startPracticeTimer() {
        if (this._practiceTimerInterval) clearInterval(this._practiceTimerInterval);
        this._practiceTimerInterval = setInterval(() => {
            const sw = window.StateManager ? window.StateManager.getState().sandwichState : null;
            const inInterval = sw ? (sw.inInterval || false) : false;
            const isPaused = sw ? (sw.isPaused || false) : false;
            if (!isPaused && !inInterval) {
                this._swPracticeSecondsElapsed++;
                this.swSecondsElapsed = this._swPracticeSecondsElapsed;
                this.updatePracticeTimerDisplay();
                if (this._swPracticeSecondsElapsed % 60 === 0) {
                    window.StateManager.setState(prev => ({
                        dailyStats: {
                            ...prev.dailyStats,
                            focusMinutes: (prev.dailyStats.focusMinutes || 0) + 1,
                            repertoireMinutes: (prev.dailyStats.repertoireMinutes || 0) + 1
                        },
                        globalStats: {
                            ...prev.globalStats,
                            totalMinutes: (prev.globalStats.totalMinutes || 0) + 1
                        }
                    }), "ACCUMULATE_SANDWICH_PRACTICE_MINUTE", true);
                }
            }
        }, 1000);
    }

    stopPracticeTimer() {
        if (this._practiceTimerInterval) {
            clearInterval(this._practiceTimerInterval);
            this._practiceTimerInterval = null;
        }
    }

    updatePracticeTimerDisplay() {
        const el = document.getElementById("swPracticeTimerDisplay");
        if (!el) return;
        const currentSeconds = this.swSecondsElapsed || this._swPracticeSecondsElapsed || 0;
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;
        el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    togglePause() {
        const currentState = window.StateManager.getState();
        const isPausedNow = !(currentState.sandwichState.isPaused || false);

        if (isPausedNow) {
            if (window.AudioTools) {
                this.metroWasOnBeforePause = window.AudioTools.metroIsOn;
                window.AudioTools.stopMetronome();
            }
        } else {
            if (this.metroWasOnBeforePause && window.AudioTools) {
                window.AudioTools.startMetronome(this.currentBpm);
            }
        }
        window.StateManager.setState(prev => ({
            sandwichState: {
                ...prev.sandwichState,
                isPaused: isPausedNow
            }
        }), "TOGGLE_SW_PAUSE");
        if (window.App && window.App.showToast) {
            window.App.showToast(isPausedNow ? "⏸️ Treino Pausado [P]" : "▶️ Treino Retomado [P]", "info");
        }
        this.renderUI(window.StateManager.getState());
    }

    registerHit() {
        const sw = window.StateManager.getState().sandwichState;
        if (!sw || sw.isPaused) return;
        const newConsecutive = sw.consecutiveHits + 1;
        const newRoundHits = sw.roundHits + 1;
        const newSessionHits = sw.sessionHits + 1;
        const newHistory = [...sw.attemptHistory, 1];

        const xpGain = (sw.currentRound === 2 && newConsecutive === 2 && !sw.isPromptDropped) ? 5 : 3;

        // Desafio de Memória Ativa no Round 2
        let autoDropPrompt = sw.isPromptDropped;
        if (sw.currentRound === 2 && newConsecutive === 2 && !sw.isPromptDropped) {
            autoDropPrompt = true;
            if (window.App && window.App.showToast) {
                window.App.showToast("🙈 Desafio de Memória: Partitura oculta para o último acerto (+2 XP)!", "info");
            }
        }

        window.StateManager.setState(prev => ({
            xp: (prev.xp || 0) + xpGain,
            sandwichState: {
                ...prev.sandwichState,
                consecutiveHits: newConsecutive,
                roundHits: newRoundHits,
                sessionHits: newSessionHits,
                attemptHistory: newHistory,
                isPromptDropped: autoDropPrompt
            }
        }), "SW_HIT");

        if (window.AudioTools) window.AudioTools.playHitSound();

        // Avalia conclusão do round
        if (newConsecutive >= sw.targetHits) {
            this.completeCurrentRound();
        } else {
            // 🧠 [CAMADA VI] Sensor de Saturação (Trials-to-Criterion): Limite de 10 tentativas por round
            const totalRoundTrials = newRoundHits + (sw.roundMisses || 0);
            if (totalRoundTrials >= 10) {
                this.triggerFatigueLockout();
            } else {
                this.startMicroReplayTimer();
            }
        }
    }

    registerMiss() {
        const sw = window.StateManager.getState().sandwichState;
        if (!sw.active || sw.inInterval || sw.inPostIntervalWait || sw.finished || sw.isPaused) return;
        this.stopMicroReplayTimer();
        if (window.AudioTools) {
            window.AudioTools.playMissSound();
        }

        const newRoundMisses = (sw.roundMisses || 0) + 1;
        const newSessionMisses = (sw.sessionMisses || 0) + 1;
        const newHistory = [...(sw.attemptHistory || []), 0];

        // 🧠 [CAMADA VI] Sensor de Saturação (Trials-to-Criterion): Limite de 10 tentativas por round
        const totalRoundTrials = (sw.roundHits || 0) + newRoundMisses;

        if (totalRoundTrials >= 10) {
            window.StateManager.setState(prev => ({
                sandwichState: {
                    ...prev.sandwichState,
                    consecutiveHits: 0,
                    roundMisses: newRoundMisses,
                    sessionMisses: newSessionMisses,
                    attemptHistory: newHistory,
                    isPromptDropped: false
                }
            }), "SW_MISS_FATIGUE");
            this.triggerFatigueLockout();
        } else {
            window.StateManager.setState(prev => ({
                sandwichState: {
                    ...prev.sandwichState,
                    consecutiveHits: 0,
                    roundMisses: newRoundMisses,
                    sessionMisses: newSessionMisses,
                    attemptHistory: newHistory,
                    isPromptDropped: false
                }
            }), "SW_MISS");
            
            this.startMicroReplayTimer(); // 🧠 Inicia Micro-Pausa e Pacing após erro
        }
    }

    triggerFatigueLockout() {
        this.stopMicroReplayTimer();
        if (window.AudioTools) {
            window.AudioTools.stopMetronome();
        }
        if (window.App && window.App.showToast) {
            window.App.showToast("⚠️ Alerta de Fadiga: Seus circuitos motores saturaram neste trecho. Seção encerrada para evitar registrar microerros fadigados!", "warning");
        }
        this.finishSession(true); // Termina a sessão mais cedo com recompensa de XP parcial (15 XP)
    }

    togglePromptVisibility() {
        window.StateManager.setState(prev => ({
            sandwichState: {
                ...prev.sandwichState,
                isPromptDropped: !prev.sandwichState.isPromptDropped
            }
        }), "TOGGLE_SW_PROMPT");
    }

    startMicroReplayTimer() {
        this.stopMicroReplayTimer();
        this._replaySeconds = 0;
        const bar = document.getElementById("microReplayBar");
        const txt = document.getElementById("microReplayText");
        if (txt) txt.textContent = "🧠 Micro-Pausa (10s): Deixe o cérebro reativar o circuito...";
        const bpm = this.currentBpm || 60;
        if (window.AudioTools) {
            window.AudioTools.startMetronome(bpm);
        }
        this._replayTimerInterval = setInterval(() => {
            this._replaySeconds++;
            if (bar) bar.style.width = `\${(this._replaySeconds / 10) * 100}%`;
            if (this._replaySeconds >= 10) {
                this.stopMicroReplayTimer();
                if (txt) txt.textContent = "✅ Pausa concluída. Pronto para a próxima repetição!";
            }
        }, 1000);
    }
    stopMicroReplayTimer() {
        if (this._replayTimerInterval) {
            clearInterval(this._replayTimerInterval);
            this._replayTimerInterval = null;
        }
        // 🔊 Parar pacing auditivo do metrônomo ao fim dos 10s
        if (window.AudioTools) {
            window.AudioTools.stopMetronome();
        }
        const bar = document.getElementById("microReplayBar");
        if (bar) bar.style.width = "0%";
    }

    completeCurrentRound() {
        this.stopMicroReplayTimer();
        const sw = window.StateManager.getState().sandwichState;
        if (sw.currentRound === 1 || sw.currentRound === 2) {
            this.startTechnicalInterval();
        } else {
            this.finishSession();
        }
    }
    
    toggleTechFlashcard() {
        this.showTechFlashcard = !this.showTechFlashcard;
        this.renderUI(window.StateManager.getState());
    }

    startTechnicalInterval() {
        if (window.AudioTools) window.AudioTools.stopMetronome();
        this._swIntervalElapsedSeconds = 0;
        const techExercise = window.NeuroEngine
            ? window.NeuroEngine.getRandomTechnicalExercise(window.StateManager.getState().sandwichState.lastTechDrawn?.category)
            : { title: "Escala Fá\# Maior", desc: "Padrão Russo / 4 oitavas", bpm: 60, category: "scales" };
        
        // =========================================================================
        // 🪜 META 4.1: DIVISÃO GRANULAR EM SUBTAREFAS (SORTEIO DA FATIA ANATÔMICA)
        // =========================================================================
        let subtasks = techExercise.subtasks;
        if (!subtasks || subtasks.length === 0) {
            // Fallback paramétrico de segurança caso o usuário delete todas as fatias
            const category = techExercise.category || "scales";
            if (category === "scales") subtasks = ["Movimento Contrário", "Movimento Paralelo", "Escala Completa"];
            else if (category === "arpeggios") subtasks = ["Posição Fundamental", "1ª Inversão", "2ª Inversão", "3ª Inversão"];
            else subtasks = ["Ascendente", "Descendente", "Encadeamento I-IV-I", "Encadeamento IV-I-IV"];
        }
        
        // Sorteia uma das fatias específicas para isolamento de gargalo
        const activeSubtask = subtasks[Math.floor(Math.random() * subtasks.length)];
 
        this.techBpm = techExercise.bpm || 60;
        this.showFeedbackForm = false;
        window.StateManager.setState(prev => ({
            sandwichState: {
                ...prev.sandwichState,
                inInterval: true,
                inPostIntervalWait: false,
                intervalSecondsRemaining: 90,
                lastTechDrawn: techExercise,
                activeSubtask: activeSubtask,
                consecutiveHits: 0,
                isPromptDropped: false,
                inPreFlight: true,
                preFlightSeconds: 10
            }
        }), "START_TECH_INTERVAL");
        
        if (this._swTimerInterval) clearInterval(this._swTimerInterval);
        
        let localSeconds = 90;
        let preFlightSecs = 10;
        let inPreFlightLocal = true;
        this.startVisualMetroPulse();
        
        this._swTimerInterval = setInterval(() => {
            const curr = window.StateManager.getState().sandwichState;
            if (!curr || !curr.inInterval) {
                clearInterval(this._swTimerInterval);
                this._swTimerInterval = null;
                this.stopVisualMetroPulse();
                return;
            }
            this._swIntervalElapsedSeconds++;

            if (inPreFlightLocal) {
                // ==========================================
                // FASE A: Contagem Regressiva do Pré-Voo (10s)
                // ==========================================
                preFlightSecs--;
                
                const timerDisplay = document.getElementById("swIntervalTimerDisplay");
                if (timerDisplay) {
                    timerDisplay.innerHTML = `<span style="color: var(--accent2); font-weight: 900; font-size: 1.1rem; letter-spacing: 0.5px; animation: pulse 1s infinite;">🧠 Pré-Voo: ${preFlightSecs}s</span>`;
                }

                window.StateManager.setState(prev => ({
                    sandwichState: {
                        ...prev.sandwichState,
                        inPreFlight: true,
                        preFlightSeconds: preFlightSecs
                    }
                }), "TICK_PREFLIGHT_SILENT", true);

                if (preFlightSecs <= 0) {
                    inPreFlightLocal = false;
                    if (window.App && window.App.showToast) {
                        window.App.showToast("🚀 Pré-Voo concluído! Comece a tocar agora.", "success");
                    }
                }
            } else {
                // ==========================================
                // FASE B: Prática Ativa de Técnica (90s)
                // ==========================================
                if (localSeconds <= 1) {
                    clearInterval(this._swTimerInterval);
                    this._swTimerInterval = null;
                    this.stopVisualMetroPulse();
                    this.finishTechIntervalEarly(); // Aciona a ficha de fechamento
                } else {
                    localSeconds--;
                    const timerDisplay = document.getElementById("swIntervalTimerDisplay");
                    if (timerDisplay) {
                        timerDisplay.textContent = `00:${String(localSeconds).padStart(2, '0')}`;
                    }
                    window.StateManager.setState(prev => ({
                        sandwichState: {
                            ...prev.sandwichState,
                            inPreFlight: false,
                            intervalSecondsRemaining: localSeconds
                        }
                    }), "TICK_INTERVAL_SILENT", true);
                }
            }
        }, 1000);
    }
    startVisualMetroPulse() {
        if (this.metroPulseInterval) clearInterval(this.metroPulseInterval);
        
        const bpm = this.techBpm || 60;
        const msPerBeat = 60000 / bpm;
        let lit = false;

        this.metroPulseInterval = setInterval(() => {
            const led = document.querySelector(".metro-led");
            if (led) {
                lit = !lit;
                led.style.background = lit ? "var(--accent2)" : "#334155";
                led.style.boxShadow = lit ? "0 0 8px var(--accent2)" : "none";
                led.style.transition = lit ? "none" : "background 0.15s ease, box-shadow 0.15s ease";
            }
        }, msPerBeat / 2);
    }

    stopVisualMetroPulse() {
        if (this.metroPulseInterval) clearInterval(this.metroPulseInterval);
        const led = document.querySelector(".metro-led");
        if (led) {
            led.style.background = "#334155";
            led.style.boxShadow = "none";
        }
    }


    skipTechnicalInterval() {
        this.finishTechIntervalEarly();
    }

    finishTechIntervalEarly() {
        if (this._swTimerInterval) {
            clearInterval(this._swTimerInterval);
            this._swTimerInterval = null;
        }
        if (window.AudioTools) {
            window.AudioTools.stopMetronome();
        }
        this.showFeedbackForm = true;
        this.renderUI(window.StateManager.getState());
    }

    toggleTechMetro() {
        // Fallback robusto de seletores para o input de BPM técnico
        const input = document.getElementById("techBpmInput") || document.querySelector(".tech-bpm-input");
        const bpm = input ? (parseInt(input.value, 10) || 60) : (this.techBpm || 60);
        if (window.AudioTools) {
            if (window.AudioTools.metroIsOn) {
                window.AudioTools.stopMetronome();
            } else {
                window.AudioTools.startMetronome(bpm);
            }
            this.renderUI(window.StateManager.getState());
        }
    }
    adjustTechBpm(delta) {
        this.techBpm = Math.max(30, Math.min(260, (this.techBpm || 60) + delta));
        const input = document.getElementById("techBpmInput") || document.querySelector(".tech-bpm-input");
        if (input) {
            input.value = this.techBpm;
        }
        if (window.AudioTools && window.AudioTools.metroIsOn) {
            window.AudioTools.startMetronome(this.techBpm);
        }
    }

    setTechBpm(bpm) {
        if (!isNaN(bpm)) {
            this.techBpm = Math.max(30, Math.min(260, bpm));
            if (window.AudioTools && window.AudioTools.metroIsOn) {
                window.AudioTools.updateBpm(this.techBpm);
            }
        }
    }

    adjustFeedbackBpm(delta) {
        const input = document.getElementById("feedbackBpmInput") || document.querySelector(".feedback-bpm-input");
        if (input) {
            const currentVal = parseInt(input.value, 10) || 60;
            const newVal = Math.max(30, Math.min(260, currentVal + delta));
            input.value = newVal;
            this.techBpm = newVal;
        }
    }
    setFeedbackBpm(bpm) {
        if (!isNaN(bpm)) {
            this.techBpm = Math.max(30, Math.min(260, bpm));
        }
    }

    submitTechFeedback(cleanliness) {
        // 🔊 Desativa obrigatoriamente qualquer metrinomo ou pulso residual nesta tela
        if (window.AudioTools) window.AudioTools.stopMetronome();
        this.stopVisualMetroPulse();
        
        const state = window.StateManager.getState();
        const sw = state.sandwichState || {};
        
        // 🛡️ Fallback defensivo para evitar quebra se o estado estiver vazio
        const techEx = sw.lastTechDrawn || { 
            id: "s1", 
            title: "Escala Fá# Maior", 
            desc: "Padrão Russo / 4 oitavas", 
            bpm: 60, 
            targetBpm: 90, 
            category: "scales" 
        };
        
        // Mapeamento resiliente caso os botões enviem números em vez de strings
        let cleanStatus = cleanliness;
        if (cleanliness === 3 || cleanliness === "3") cleanStatus = "clean";
        if (cleanliness === 2 || cleanliness === "2") cleanStatus = "wobbly";
        if (cleanliness === 1 || cleanliness === "1") cleanStatus = "fail";

        const input = document.getElementById("feedbackBpmInput");
        const endingBpm = input ? (parseInt(input.value, 10) || this.techBpm || 60) : (this.techBpm || 60);
        this.showFeedbackForm = false;
        const elapsedMinutes = Math.max(1, Math.ceil(this._swIntervalElapsedSeconds / 60));
        this._swTotalIntervalSeconds += this._swIntervalElapsedSeconds;
        
	  // Regras Adaptativas de Progresso Técnico
        let nextBpm = endingBpm;
        let toastMsg = "";
        let toastType = "info";

        if (cleanStatus === "clean") {
            nextBpm = Math.min(techEx.targetBpm || 120, endingBpm + 2);
            toastMsg = `🎉 Escala atualizada para ${nextBpm} BPM! Excelente estabilização.`;
            toastType = "success";
        } else if (cleanStatus === "wobbly") {
            nextBpm = endingBpm;
            toastMsg = `💛 Estabilizando andamento em ${nextBpm} BPM para maior precisão.`;
            toastType = "info";
        } else if (cleanStatus === "fail") {
            nextBpm = Math.max(40, endingBpm - 5);
            toastMsg = `📉 Recuo tático para ${nextBpm} BPM para limpar a digitação.`;
            toastType = "warn";
        }

        // Grava as estatísticas e histórico no StateManager
        window.StateManager.setState(prev => {
            const technical = { ...(prev.technical || {}) };
            const category = techEx.category || "scales";
            const list = technical[category] ? [...technical[category]] : [];
            
            // Busca resiliente por ID ou por Título da escala
            const idx = list.findIndex(ex => ex.id === techEx.id || ex.title === techEx.title);
            
            if (idx !== -1) {
                const currentEx = list[idx];
                let box = currentEx.box !== undefined ? currentEx.box : 1;
                let hits = currentEx.consecutiveHits !== undefined ? currentEx.consecutiveHits : 0;
                
                if (cleanStatus === "clean") {
                    hits++;
                    if (hits >= 3) { // 🏆 3 treinos limpos seguidos promovem de caixa Leitner
                        box = Math.min(5, box + 1);
                        hits = 0;
                        
                        // 🔓 DESBLOQUEIO AUTOMÁTICO: Escala segura na Caixa 4 libera a próxima da fila!
                        if (box === 4) {
                            const nextQueueIdx = list.findIndex(ex => ex.status === "queue");
                            if (nextQueueIdx !== -1) {
                                list[nextQueueIdx] = {
                                    ...list[nextQueueIdx],
                                    status: "active",
                                    box: 1,
                                    consecutiveHits: 0,
                                    nextReviewDate: new Date().toISOString().split("T")[0] // Formato estrito YYYY-MM-DD
                                };
                                
                                setTimeout(() => {
                                    if (window.App && window.App.showToast) {
                                        window.App.showToast(`🔓 NOVO DESBLOQUEIO: ${list[nextQueueIdx].title} foi adicionada ao seu ciclo ativo!`, "success");
                                    }
                                }, 500);
                            }
                        }
                    }
                } else if (cleanStatus === "fail") {
                    hits = 0;
                    box = Math.max(1, box - 1); // 📉 Recuo tático de segurança no Leitner
                }
                
                // 📅 Cronograma de Espaçamento Leitner (janelas de revisão)
                let daysToAdd = 1;
                if (box === 2) daysToAdd = 2;
                else if (box === 3) daysToAdd = 4;
                else if (box === 4) daysToAdd = 7;
                else if (box === 5) daysToAdd = 14;

                const nextReview = new Date();
                nextReview.setDate(nextReview.getDate() + daysToAdd);
                const nextReviewStr = nextReview.toISOString().split("T")[0]; // Formato estrito YYYY-MM-DD

                // Atualiza os dados da escala no seu banco local de estado
                list[idx] = {
                    ...currentEx,
                    bpm: nextBpm,
                    trainedToday: true,
                    totalMinutes: (currentEx.totalMinutes || 0) + elapsedMinutes,
                    box: box,
                    consecutiveHits: hits,
                    nextReviewDate: nextReviewStr
                };
                
                technical[category] = list;
            }

            const history = [
                {
                    date: new Date().toLocaleDateString('sv-SE'), // Blindagem UTC Date Drift
                    type: "Técnica (Intervalo)",
                    pieceId: techEx.title,
                    trechoId: `Andamento: ${endingBpm} BPM (${cleanliness === "clean" ? "Limpo" : cleanliness === "wobbly" ? "Com oscilação" : "Com erros"})`,
                    durationMinutes: elapsedMinutes,
                    // accuracyPct removido: Isola a avaliação técnica para não contaminar a assertividade média do repertório
                    manualOffline: false
                },
                ...(prev.history || [])
            ];

            return {
                technical,
                history,
                dailyStats: {
                    ...prev.dailyStats,
                    technicalMinutes: (prev.dailyStats.technicalMinutes || 0) + elapsedMinutes,
                    focusMinutes: (prev.dailyStats.focusMinutes || 0) + elapsedMinutes
                },
                weeklyGoals: {
                    ...prev.weeklyGoals,
                    technicalDoneMinutes: (prev.weeklyGoals.technicalDoneMinutes || 0) + elapsedMinutes
                }
            };
        }, "SUBMIT_TECH_FEEDBACK");

        if (window.App && window.App.showToast) {
            window.App.showToast(toastMsg, toastType);
        }

        // Retorna ao fluxo nominal do Modo Sanduíche avançando o round
        window.StateManager.setState(prev => ({
            sandwichState: {
                ...prev.sandwichState,
                inInterval: false,
                inPostIntervalWait: false,
                currentRound: (prev.sandwichState.currentRound || 1) + 1,
                consecutiveHits: 0,
                roundHits: 0,
                roundMisses: 0
            }
/*            
        }), "END_TECH_INTERVAL_TO_COCKPIT");

        isSwPaused = false;
        this.startPracticeTimer();
        this.renderUI(window.StateManager.getState());
    }
*/
        }), "END_TECH_INTERVAL_TO_COCKPIT");

        this._isSwPaused = false;
        this.startPracticeTimer();
        this.renderUI(window.StateManager.getState());
    }
    endTechnicalInterval() {
        this.submitTechFeedback("wobbly");
    }

    startNextRound() {
        const sw = window.StateManager.getState().sandwichState;
        const nextRound = sw.currentRound + 1;
        window.StateManager.setState(prev => ({
            sandwichState: {
                ...prev.sandwichState,
                inInterval: false,
                inPostIntervalWait: false,
                currentRound: nextRound,
                consecutiveHits: 0,
                isPromptDropped: false
            }
        }), `START_ROUND_${nextRound}`);
    }

    finishSession(isEarly = false) {
        // --- 🛡️ TRAVA CONTRA DUPLICAÇÃO DE REGISTRO ---
        const currentState = window.StateManager.getState();
        if (currentState.sandwichState && currentState.sandwichState.finished) {
            return; // Se já encerrou, aborta e não duplica!
        }

        this.stopPracticeTimer();
        
        const state = window.StateManager.getState();
        const sw = state.sandwichState || {};
        let finalIntervalSeconds = this._swTotalIntervalSeconds;
        if (sw.inInterval) {
            finalIntervalSeconds += this._swIntervalElapsedSeconds;
        }
        
        // --- EQUAÇÃO DE PADRONIZAÇÃO META 1.6 ---
        const totalSeconds = (this.swSecondsElapsed || this._swPracticeSecondsElapsed) + finalIntervalSeconds;
        const practiceMinutes = Math.max(1, Math.ceil(totalSeconds / 60));
        const repertoireMinutes = Math.max(1, Math.ceil((this.swSecondsElapsed || this._swPracticeSecondsElapsed) / 60));
        
        // Arredondamento residual de prática ativa (Repertório & Foco)
        const accumulatedPracticeMins = Math.floor(this._swPracticeSecondsElapsed / 60);
        const residualRepertoireMins = repertoireMinutes - accumulatedPracticeMins;

        // Arredondamento residual de bloco total (Prática + Descanso)
        const accumulatedIntervalMins = Math.floor(finalIntervalSeconds / 60);
        const totalAccumulatedMins = accumulatedPracticeMins + accumulatedIntervalMins;
        const residualTotalMins = practiceMinutes - totalAccumulatedMins;
        
        const totalAttempts = (sw.sessionHits || 0) + (sw.sessionMisses || 0);
        const accuracy = totalAttempts > 0 ? Math.round((sw.sessionHits / totalAttempts) * 100) : 0;

        // --- NOVA LÓGICA (Bypass de Caixas Leitner) ---
        if (sw.pieceId && sw.trechoId && window.RepertoireManager) {
            window.RepertoireManager.recordTrechoPractice(sw.pieceId, sw.trechoId, totalSeconds, sw.sessionHits, sw.sessionMisses);
            
            // 🔒 LÓGICA DE SANDBOX: Ignora atualização se o modo exploratório estiver ativo
            if (!sw.isSandbox) {
                const { trecho } = window.RepertoireManager.getPieceAndTrecho(sw.pieceId, sw.trechoId);
                if (trecho) {
                    const today = new Date().toLocaleDateString('sv-SE');
                    window.RepertoireManager.updateTrecho(sw.pieceId, sw.trechoId, {
                        box: Math.max(1, trecho.box || 1),
                        consolidated: (trecho.box >= 4),
                        nextReviewDate: trecho.nextReviewDate || today
                    });
                }
            }
        }

        window.StateManager.setState(prev => {
            // 🔓 DESTRAVA LEGADA: Gravação Incondicional (independente de estar no modo guiado)
            const dailyStatsUpdate = { ...prev.dailyStats };
            const globalStatsUpdate = { ...prev.globalStats };
            let newHistory = prev.history || [];

            if (residualRepertoireMins > 0) {
                dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + residualRepertoireMins;
                dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + residualRepertoireMins;
            }
            dailyStatsUpdate.completedSessions = (dailyStatsUpdate.completedSessions || 0) + 1;
            
            if (residualTotalMins > 0) {
                globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + residualTotalMins;
            }
            globalStatsUpdate.totalSessions = (globalStatsUpdate.totalSessions || 0) + 1;
            
            newHistory = [
                {
                    date: new Date().toLocaleDateString('sv-SE'),
                    type: "Bloco Sanduíche",
                    pieceId: sw.pieceId || "Repertório",
                    trechoId: `${sw.trechoId} (${sw.sessionHits}A/${sw.sessionMisses}E)`,
                    durationMinutes: practiceMinutes,
                    accuracyPct: accuracy,
                    manualOffline: false
                },
                ...newHistory
            ];

            return {
                xp: (prev.xp || 0) + (isEarly ? 15 : 40),
                dailyStats: dailyStatsUpdate,
                globalStats: globalStatsUpdate,
                history: newHistory,
                sandwichState: {
                    ...prev.sandwichState,
                    active: true,
                    finished: true,
                    summary: {
                        accuracy,
                        repertoireMinutes,
                        totalMinutes: practiceMinutes,
                        totalHits: sw.sessionHits,
                        totalMisses: sw.sessionMisses,
                        totalAttempts
                    }
                }
            };
        }, "FINISH_SANDWICH_SESSION");

        if (window.App && window.App.showToast) {
            window.App.showToast(`🎉 Modo Sanduíche Concluído! Precisão: ${accuracy}% (+${practiceMinutes} min).`, "success");
        }
    }

    addDifficultyTag(tag) {
        const sw = window.StateManager.getState().sandwichState;
        if (!sw.pieceId || !sw.trechoId || !window.RepertoireManager) return;

        const { trecho } = window.RepertoireManager.getPieceAndTrecho(sw.pieceId, sw.trechoId);
        if (!trecho) return;

        const newTags = (trecho.difficultyTags || []).includes(tag)
            ? trecho.difficultyTags.filter(t => t !== tag)
            : [...(trecho.difficultyTags || []), tag];

        window.RepertoireManager.updateTrecho(sw.pieceId, sw.trechoId, { difficultyTags: newTags });

        if (window.App && window.App.showToast) {
            window.App.showToast(`Tag "${tag}" atualizada em ${trecho.label}`, "info");
        }
        this.renderUI(window.StateManager.getState());
    }

    resetToSetup() {
        this.stopPracticeTimer();
        this.swSecondsElapsed = 0;
        this._swPracticeSecondsElapsed = 0;
        window.StateManager.setState(prev => ({
            sandwichState: {
                active: false,
                finished: false,
                inInterval: false,
                inPostIntervalWait: false
            }
        }), "RESET_SANDWICH_SETUP");
    }

    renderUI(state) {
        const container = document.getElementById("sandwichContainer");
        if (!container) return;

        const sw = state.sandwichState || {};

        // --- CORREÇÃO CIRÚRGICA: Cálculo do tempo real para o cronômetro ---
        const currentSeconds = this.swSecondsElapsed || sw.practiceSecondsElapsed || 0;
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;
        const formattedPracticeTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        // ------------------------------------------------------------------

        // 1. Tela Inicial de Setup do Sanduíche
        if (!sw.active) {
            const activePieces = (state.repertoire && state.repertoire.active) ? state.repertoire.active : [];
            const piece = activePieces.find(p => p.id === (this.selectedPieceId || activePieces[0]?.id)) || activePieces[0];
            const rawTrechos = piece?.trechos || [];
            
            // 🧠 ORDENAÇÃO TELEMÉTRICA VIA P-SCORE (NEUROENGINE) 🧠
            const cache = state.metricsCache || {};
            const sortedTrechos = [...rawTrechos].sort((a, b) => {
            	const pScoreA = cache[a.id]?.pScore ?? 0.50;
            	const pScoreB = cache[b.id]?.pScore ?? 0.50;
            	if (pScoreA !== pScoreB) return pScoreB - pScoreA;
            	return String(a.label || "").localeCompare(String(b.label || ""), undefined, { numeric: true });
        	});

            const currentTrechoId = this.selectedTrechoId || sortedTrechos[0]?.id;

            const criticalTrechos = [];
            const nominalTrechos = [];
            sortedTrechos.forEach(t => {
                const pScore = cache[t.id]?.pScore ?? 0.50;
                if (pScore >= 0.65) criticalTrechos.push(t);
                else nominalTrechos.push(t);
            });

            let trechosOptionsHtml = criticalTrechos.map(t => `<option value="${t.id}" ${t.id === currentTrechoId ? 'selected' : ''}>⚠️ ${t.label} (Passo ${t.passo || 1} • Cx ${t.box || 0} • P-Score: ${(cache[t.id]?.pScore ?? 0.50).toFixed(2)})</option>`).join('');
            if (criticalTrechos.length > 0 && nominalTrechos.length > 0) {
                trechosOptionsHtml += `<option disabled>──────── Foco Neutro ────────</option>`;
            }
            trechosOptionsHtml += nominalTrechos.map(t => `<option value="${t.id}" ${t.id === currentTrechoId ? 'selected' : ''}>${t.label} (Passo ${t.passo || 1} • Cx ${t.box || 0} • P-Score: ${(cache[t.id]?.pScore ?? 0.50).toFixed(2)})</option>`).join('');

            container.innerHTML = `
                <h2 style="margin: 0 0 6px; font-size: 1.15rem; color: #fff;">🥪 Modo Bloco Sanduíche (Aquisição Deliberada)</h2>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.45;">
                    Método de <strong>3 Rounds de 3 Acertos Consecutivos</strong> com intervalo de desativação motora de 90s para consolidação rápida e combate a vícios.
                </p>
                
                ${(() => {
                    const cache = state.metricsCache || {};
                    const allTrechos = [];
                    activePieces.forEach(p => {
                        if (p.isPaused) return;
                        (p.trechos || []).forEach(t => {
                            allTrechos.push({ piece: p, trecho: t, metrics: cache[t.id] || { normBias: 0, normIFM: 0, pScore: 0.5 } });
                        });
                    });

                    const antiDaCapo = [...allTrechos].sort((a, b) => b.metrics.normBias - a.metrics.normBias).find(x => x.metrics.normBias > 0.1);
                    const gargalo = [...allTrechos].sort((a, b) => b.metrics.normIFM - a.metrics.normIFM).find(x => x.metrics.normIFM > 0.2 && x.trecho.id !== (antiDaCapo ? antiDaCapo.trecho.id : ""));
                    const inedito = allTrechos.find(x => (x.trecho.lifetimeAttempts || 0) === 0 && x.trecho.id !== (antiDaCapo ? antiDaCapo.trecho.id : "") && x.trecho.id !== (gargalo ? gargalo.trecho.id : ""));

                    if (!antiDaCapo && !gargalo && !inedito) return "";

                    let suggestionsHtml = `
                    <div style="margin-bottom: 18px; background: var(--card-inner); padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                        <strong style="color: var(--accent); font-size: 0.8rem; display: block; margin-bottom: 10px; text-transform: uppercase;">🧠 Sugestões do Motor (Tempo Extra)</strong>
                        <div style="display: flex; flex-direction: column; gap: 8px;">`;
                    
                    if (antiDaCapo) {
                        suggestionsHtml += `<button class="btn btn-outline" style="text-align: left; padding: 10px; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.05);" data-action="start-sandwich-specific" data-piece="${antiDaCapo.piece.id}" data-trecho="${antiDaCapo.trecho.id}">
                            <strong style="display: block; color: #fbbf24; font-size: 0.85rem;">🛡️ Risco Anti-Da Capo (Final da Peça)</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">P-Score Bias: ${antiDaCapo.metrics.normBias.toFixed(2)} • ${antiDaCapo.piece.title.split('—')[0]} (${antiDaCapo.trecho.label})</span>
                        </button>`;
                    }
                    if (gargalo) {
                        suggestionsHtml += `<button class="btn btn-outline" style="text-align: left; padding: 10px; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);" data-action="start-sandwich-specific" data-piece="${gargalo.piece.id}" data-trecho="${gargalo.trecho.id}">
                            <strong style="display: block; color: #f87171; font-size: 0.85rem;">⚠️ Micro-Reparo de Gargalo</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Alta Fricção (IFM: ${gargalo.metrics.normIFM.toFixed(2)}) • ${gargalo.piece.title.split('—')[0]} (${gargalo.trecho.label})</span>
                        </button>`;
                    }
                    if (inedito) {
                        suggestionsHtml += `<button class="btn btn-outline" style="text-align: left; padding: 10px; border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.05);" data-action="start-sandwich-specific" data-piece="${inedito.piece.id}" data-trecho="${inedito.trecho.id}">
                            <strong style="display: block; color: #38bdf8; font-size: 0.85rem;">🌱 Nova Aquisição (Caixa 0)</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Trecho Inédito • ${inedito.piece.title.split('—')[0]} (${inedito.trecho.label})</span>
                        </button>`;
                    }
                    return suggestionsHtml + `</div></div>`;
                })()}

                <div class="form-group">
                    <label>Trecho de Foco (Ordenado por P-Score / Da Capo):</label>
                    <select id="swTrechoSelect" class="form-control" data-action="change-sw-trecho">
                        ${[...(piece?.trechos || [])].sort((a, b) => {
                            const cacheA = (state.metricsCache && state.metricsCache[a.id]) ? state.metricsCache[a.id].pScore : 0.5;
                            const cacheB = (state.metricsCache && state.metricsCache[b.id]) ? state.metricsCache[b.id].pScore : 0.5;
                            return cacheB - cacheA;
                        }).map(t => {
                            const pScore = window.NeuroEngine ? window.NeuroEngine.calculatePScoreData(piece, t).pScore.toFixed(2) : "0.50";
                            
                            // 🔒 LÓGICA DE SANDBOX: Injeta o ícone de cadeado para trechos prematuros
                            const isLocked = (t.passo >= 2 && window.RepertoireManager && !window.RepertoireManager.isPrerequisiteMet(piece.id, t.id));
                            const lockIcon = isLocked ? "🔒 " : "";
                            
                            // ⚠️ LÓGICA DE GARGALO: Diagnóstico de Delta-Box em tempo real
                            let bottleneckTag = "";
                            const parentTrecho = (piece.trechos || []).find(pTr => pTr.id === t.parent);
                            if (parentTrecho && parentTrecho.baseBlockIds) {
                                // Encontra os irmãos deste trecho
                                const siblings = parentTrecho.baseBlockIds
                                    .filter(id => id !== t.id)
                                    .map(sibId => (piece.trechos || []).find(x => x.id === sibId))
                                    .filter(Boolean);
                                
                                // Descobre a caixa mais avançada entre os irmãos
                                const maxSiblingBox = siblings.reduce((max, sib) => Math.max(max, sib.box || 0), 0);
                                
                                // Se o irmão está mais avançado, este é o gargalo!
                                if ((t.box || 0) < maxSiblingBox) {
                                    bottleneckTag = " [⚠️ Dupla Atrasada]";
                                }
                            }
                            
                            return `<option value="${t.id}" ${t.id === currentTrechoId ? 'selected' : ''}>${lockIcon}${t.label} (Passo ${t.passo} • Cx ${t.box || 0} • P-Score: ${pScore})${bottleneckTag}</option>`;
                        }).join('')}
                    </select>
                </div>
                <button class="btn btn-primary" style="padding: 14px; font-weight: 700; font-size: 0.95rem; margin-top: 8px;" data-action="launch-sandwich-setup">
                    ▶ INICIAR BLOCO SANDUÍCHE (3x3 ACERTOS)
                </button>
            `;
            return;
        }

        // 2. Scorecard Final de Resumo
        if (sw.finished && sw.summary) {
            const { accuracy, totalMinutes, repertoireMinutes, totalHits, totalMisses } = sw.summary;
            const intervalMin = Math.max(0, totalMinutes - repertoireMinutes);
            const tagsList = ["⚡ Salto Não Calculado", "🎵 Quiáltera / Síncope", "🖐️ Dedilhado Conflitante", "👀 Olhos fora da Partitura"];
            const { trecho } = (window.RepertoireManager && sw.pieceId && sw.trechoId) ? window.RepertoireManager.getPieceAndTrecho(sw.pieceId, sw.trechoId) : { trecho: null };
            const activeTags = (trecho && trecho.difficultyTags) || [];

            container.innerHTML = `
                <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: left;">
                    <h2 style="color: var(--accent2); font-size: 1.25rem; margin-bottom: 4px;">
                        🎉 Bloco Sanduíche Concluído!
                    </h2>
                    <div style="font-size: 0.88rem; color: #fff; margin-bottom: 14px;">
                        Trecho: <strong>${sw.trechoId}</strong> • 3 Rounds Executados
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;">
                        <div class="stat-box">
                            <div class="num" style="color: var(--accent2);">${accuracy}%</div>
                            <div class="lbl">ASSERTIVIDADE REAL</div>
                        </div>
                        <div class="stat-box">
                            <div class="num">${totalHits}A / ${totalMisses}E</div>
                            <div class="lbl">TENTATIVAS BRUTAS</div>
                        </div>
                        <div class="stat-box">
                            <div class="num" style="color: var(--accent);">${totalMinutes} min</div>
                            <div class="lbl">TEMPO TOTAL</div>
                        </div>
                    </div>
                    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 14px; font-size: 0.8rem; color: #cbd5e1;">
                        <div>⏱️ <strong>Repertório Ativo:</strong> ${repertoireMinutes} min</div>
                        <div>⚙️ <strong>Intervalos Técnicos (Desativação):</strong> ${intervalMin} min</div>
                    </div>
                    <!-- Tags de Dificuldade de 1-Clique -->
                    <div style="margin-bottom: 16px;">
                        <strong style="color: #93c5fd; font-size: 0.82rem; display: block; margin-bottom: 8px;">
                            🏷️ Marcar Tags de Dificuldade no Trecho:
                        </strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${tagsList.map(tag => {
                                const isSel = activeTags.includes(tag);
                                return `
                                    <button class="btn btn-outline" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 14px; ${isSel ? 'background: var(--accent); color: #fff; border-color: var(--accent);' : ''}" data-action="toggle-difficulty-tag" data-tag="${tag}">
                                        ${tag} ${isSel ? '✓' : '+'}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    ${(state.sessionState && state.sessionState.guidedActive) ? `
                    <button class="btn btn-guided-main" style="padding: 14px; font-weight: 800; width: 100%; border-radius: 8px;" data-action="back-to-guided-session">
                        ▶ CONTINUAR SESSÃO GUIADA (Próximo Bloco)
                    </button>
                    ` : `
                    <button class="btn btn-primary" style="padding: 14px; font-weight: 700; width: 100%; border-radius: 8px;" data-action="back-sandwich-setup">
                        Voltar ao Menu do Sanduíche
                    </button>
                    `}
                </div>
            `;
            return;
        }

        // 3. Tela de Intervalo Técnico de 90s (Desativação Neural)
        if (sw.inInterval) {
            const techEx = sw.lastTechDrawn || { title: "Escala Fá# Maior", desc: "Padrão Russo / 4 oitavas", bpm: 60 };
            const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;

            // CASO A: Ficha de Feedback de Fechamento de 1-Clique (Fricção Zero)
            if (this.showFeedbackForm) {
                container.innerHTML = `
                    <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; max-width: 500px; margin: 0 auto;">
                        <span class="badge purple" style="font-size: 0.78rem;">📝 Ficha de Avaliação Física</span>
                        <h2 style="color: #fff; font-size: 1.25rem; margin: 10px 0 4px;">Como foi o treino técnico?</h2>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 16px;">Fundamento: <strong>${techEx.title}</strong></p>
                        
                        <!-- Ajustador Fino de BPM de Desfecho -->
                        <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 10px; margin-bottom: 18px;">
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 6px;">CONFIRME SEU BPM DE EXECUÇÃO:</span>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <button class="btn btn-reset" style="padding: 4px 10px; font-size: 0.75rem;" data-action="feedback-delta-bpm" data-delta="-5">-5</button>
                                <button class="btn btn-reset" style="padding: 4px 8px; font-size: 0.75rem;" data-action="feedback-delta-bpm" data-delta="-1">-1</button>
                                <input type="number" id="feedbackBpmInput" class="form-control" value="${this.techBpm || techEx.bpm || 60}" style="width: 58px; padding: 4px; text-align: center; font-weight: 800; font-size: 0.95rem;" data-action="feedback-change-bpm">
                                <button class="btn btn-reset" style="padding: 4px 8px; font-size: 0.75rem;" data-action="feedback-delta-bpm" data-delta="1">+1</button>
                                <button class="btn btn-reset" style="padding: 4px 10px; font-size: 0.75rem;" data-action="feedback-delta-bpm" data-delta="5">+5</button>
                            </div>
                        </div>

                        <!-- Botões de Decisão Rápida (1-clique) -->
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                            <button class="btn btn-start" style="padding: 14px; font-size: 0.88rem; font-weight: 800; background: var(--accent2); color: #04240f; border-radius: 10px;" data-action="submit-tech-feedback" data-cleanliness="clean">
                                💚 Consegui Executar Limpo (+2 BPM)
                            </button>
                            <button class="btn btn-outline" style="padding: 12px; font-size: 0.85rem; font-weight: 700; border-color: #f59e0b; color: #f59e0b; border-radius: 10px;" data-action="submit-tech-feedback" data-cleanliness="wobbly">
                                💛 Joguei com Oscilação / Hesitação (Manter)
                            </button>
                            <button class="btn btn-reset" style="padding: 12px; font-size: 0.85rem; font-weight: 700; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 10px;" data-action="submit-tech-feedback" data-cleanliness="fail">
                                ❌ Tive Muita Dificuldade (-5 BPM)
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            // CASO B: Estação Ativa de Prática de Fundamentos
            container.innerHTML = `
                <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; max-width: 600px; margin: 0 auto;">
                    <span class="badge purple" style="font-size: 0.78rem;">Intervalo Técnico Ativo (Desativação Neural)</span>
                    <h2 style="color: #fff; font-size: 1.25rem; margin: 8px 0 2px;">${techEx.title}</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 12px;">${techEx.desc}</p>
                    
                    <!-- Cronômetro Grande Regressivo (90s) -->
                    <div style="font-size: 2.2rem; font-family: monospace; font-weight: 800; color: var(--warn); margin-bottom: 12px;" id="swIntervalTimerDisplay">
                        00:${String(sw.intervalSecondsRemaining || 90).padStart(2, '0')}
                    </div>
                    <!-- Badge Dinâmica da Fatia Anatômica (Meta 4 - Fatiamento) -->
                    <div style="font-size: 0.76rem; color: var(--accent2); font-weight: 900; margin: 0 auto 12px auto; padding: 4px 10px; background: rgba(16, 185, 129, 0.08); border: 1px dashed var(--accent2); border-radius: 6px; display: inline-block;">
                        🎯 Foco: ${sw.activeSubtask || "Prática Geral"}
                    </div>
                    <!-- 🎴 WIDGET DE FLASHCARD DE RECALL ATIVO COM SVG DEDILHADO -->
                <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 14px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.75rem; color: #93c5fd; font-weight: 700; letter-spacing: 0.5px;">🎴 GUIA DE DEDILHADO & NOTAS:</span>
                        <button class="btn btn-reset" style="font-size: 0.68rem; padding: 2px 8px;" data-action="toggle-tech-flashcard">
                            ${this.showTechFlashcard ? '🙈 Ocultar Guia' : '👁️ Revelar Guia'}
                        </button>
                    </div>
                    
                    ${(() => {
                        if (!this.showTechFlashcard) {
                            return `
                                <!-- CARD DE RECALL ATIVO DEFENSO -->
                                <div style="background: rgba(147, 197, 253, 0.05); border: 1px solid rgba(147, 197, 253, 0.15); border-radius: 8px; padding: 12px 14px; text-align: center;">
                                    <span style="font-size: 1.1rem; display: block; margin-bottom: 4px;">🧠</span>
                                    <strong style="color: #93c5fd; font-size: 0.78rem; display: block; text-transform: uppercase;">Recall Ativo Ativo!</strong>
                                    <span style="font-size: 0.74rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.3;">
                                        Tente forçar seu cérebro a recuperar os dedilhados e as notas no teclado antes de abrir a imagem de auxílio!
                                    </span>
                                </div>
                            `;
                        }

                        // Dicionário de coloração das notas no SVG (Mapeamento de Teclas)
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

                        const activeNotes = scaleKeys[techEx.tone || "C"] || [];

                        // Mapeamento bidirecional de enarmônicos para garantir acendimento físico perfeito
                        const getEnharmonics = (n) => {
                            const map = {
                                "C#": ["C#", "Db"], "Db": ["C#", "Db"],
                                "D#": ["D#", "Eb"], "Eb": ["D#", "Eb"],
                                "F#": ["F#", "Gb"], "Gb": ["F#", "Gb"],
                                "G#": ["G#", "Ab"], "Ab": ["G#", "Ab"],
                                "A#": ["A#", "Bb"], "Bb": ["A#", "Bb"],
                                "E#": ["F", "E#"], "F": ["F", "E#"],
                                "B#": ["C", "B#"], "C": ["C", "B#"],
                                "Cb": ["B", "Cb"], "B": ["B", "Cb"],
                                "Fb": ["E", "Fb"], "E": ["E", "Fb"]
                            };
                            return map[n] || [n];
                        };

                        const isLit = (keyNote) => {
                            const normalizedKey = keyNote.replace("2", "");
                            const enharmonicsOfKey = getEnharmonics(normalizedKey);
                            return activeNotes.some(scaleNote => {
                                const normalizedScaleNote = scaleNote.replace("2", "");
                                return enharmonicsOfKey.includes(normalizedScaleNote) || getEnharmonics(normalizedScaleNote).includes(normalizedKey);
                            });
                        };

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

                        return `
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
                    })()}
                </div>

                    <!-- ⚙️ COCKPIT DO METRÔNOMO DE TÉCNICA -->
                    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">METRÔNOMO DE TÉCNICA</span>
                            <div class="metro-led" style="width: 12px; height: 12px; border-radius: 50%; background: ${isMetroOn ? 'var(--accent2)' : '#334155'}; transition: background 0.1s;"></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px;">
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="-5"'}>-5</button>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="-1"'}>-1</button>
                            <input type="number" id="swBpmInput" class="form-control" value="${this.currentBpm}" style="width: 52px; padding: 3px; text-align: center; font-weight: 800; font-size: 0.9rem;" ${this.speedLock ? 'readonly disabled' : 'data-action="change-sw-bpm"'}>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="1"'}>+1</button>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="5"'}>+5</button>
                        </div>
                        <button class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="width: 100%; padding: 8px; font-size: 0.8rem; font-weight: 700;" data-action="toggle-tech-metro">
                            ${isMetroOn ? '⏸️ Parar Metrônomo' : '▶️ Ligar Metrônomo'}
                        </button>
                    </div>

                    <!-- Botões de Ação do Intervalo -->
                    <div style="display: flex; gap: 8px; justify-content: center; max-width: 400px; margin: 0 auto;">
                        <button class="btn btn-outline" style="flex: 1; padding: 12px; font-weight: 700;" data-action="finish-tech-interval-early">
                            ⏩ Concluir Treino de Técnica
                        </button>
                        <button class="btn btn-reset" style="padding: 12px; color: var(--danger);" data-action="finish-sandwich-early">
                            ⏹ Encerrar
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // 4. Tela de Espera Pós-Intervalo
        if (sw.inPostIntervalWait) {
            container.innerHTML = `
                <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 24px; text-align: center;">
                    <span class="badge" style="background: var(--accent2); color: #04240f; font-size: 0.8rem; font-weight: 700;">Intervalo Concluído</span>
                    <h2 style="color: #fff; font-size: 1.3rem; margin: 10px 0 6px;">Pronto para o Round ${sw.currentRound + 1}?</h2>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 18px;">
                        O circuito motor descansou. Execute o próximo round com foco na limpeza técnica e sem afobação.
                    </p>
                    <button class="btn btn-guided-main" style="padding: 16px; font-size: 1rem; max-width: 380px; margin: 0 auto;" data-action="start-sw-next-round">
                        ▶ INICIAR ROUND ${sw.currentRound + 1} DE 3
                    </button>
                </div>
            `;
            return;
        }

        // 5. Tela Ativa de Execução: LAYOUT SPLIT-VIEW (Canvas 70% + Sidebar 30%)
        const { piece, trecho } = (window.RepertoireManager && sw.pieceId && sw.trechoId)
            ? window.RepertoireManager.getPieceAndTrecho(sw.pieceId, sw.trechoId)
            : { piece: { title: "Peça" }, trecho: { label: sw.trechoId || "Trecho" } };

        const cache = state.metricsCache || {};
        const trechoCache = trecho ? (cache[trecho.id] || {}) : {};
        const normIFM = trechoCache.normIFM || 0;
        const consecutiveFailures = trecho ? (trecho.consecutiveFailures || 0) : 0;
        const isReverseChaining = consecutiveFailures > 2 || normIFM > 0.85;

        const scoreImgUrl = typeof getScoreImageUrl === "function" ? getScoreImageUrl(trecho ? trecho.label : "") : "";
        const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;

        const dotsHtml = Array.from({ length: sw.targetHits }, (_, i) => `
            <span style="font-size: 1.2rem; color: ${i < sw.consecutiveHits ? 'var(--accent2)' : '#334155'}; transition: all 0.2s;">●</span>
        `).join(' ');

        container.innerHTML = `
            <div class="split-view-container">
                <!-- Coluna Esquerda: Canvas de Partitura (70%) -->
                <div class="split-left">
                    <!-- 🔒 LÓGICA DE SANDBOX: Banner visual explícito do modo exploratório -->
                    ${sw.isSandbox ? `
                    <div style="background: rgba(245, 158, 11, 0.15); border: 1px dashed #f59e0b; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.8rem; color: #fbbf24; text-align: center;">
                        🔒 <strong>Sessão Sandbox (Exploratória)</strong><br>
                        Os resultados desta sessão registram tempo e XP, mas <strong>não avançam caixas Leitner</strong> nem afetam a Sessão Guiada.
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                        <div>
                            <span class="badge info" style="font-size: 0.72rem;">Round ${sw.currentRound} de 3 • Meta: ${sw.targetHits} Seguidos</span>
                            <h3 style="margin: 4px 0 0; font-size: 1.15rem; color: #fff;">${piece.title}</h3>
                            <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent);">${trecho.label}</div>
                        </div>
                        <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.85rem; font-family: monospace; font-weight: 700; color: var(--accent2); background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 3px 8px; border-radius: 8px;" id="swPracticeTimerDisplay">${formattedPracticeTime}</span>
                            <span class="badge ${sw.isPaused ? 'warn' : 'accent2'}" style="font-size: 0.72rem;">
                                ${sw.isPaused ? '⏸️ PAUSADO' : '▶️ EM ANDAMENTO'}
                            </span>
                        </div>
                    </div>
                    <!-- Partitura Ampliada com Altura Otimizada para Estante Física -->
                    <div class="score-container skeleton-pulse" style="width: 100%; min-height: 350px; height: 65vh; position: relative; background: #0e1626; border-radius: 14px; border: 1px solid var(--border); padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 8px;">
                        ${sw.isPromptDropped ? `
                            <div style="color: var(--text-muted); font-size: 0.95rem; text-align: center; padding: 20px;">
                                🙈 <strong>Desafio de Memória Ativa Ativo!</strong><br>
                                <span style="font-size: 0.8rem; display: block; margin-top: 6px;">A partitura está oculta para consolidar a recuperação mental.</span>
                            </div>
                        ` : (scoreImgUrl ? `
                            <img src="${scoreImgUrl}" alt="Partitura" class="sheet-paper-effect" style="width: 100%; height: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${scoreImgUrl}" data-title="${piece.title} — ${trecho.label}">
                        ` : `
                            <div style="color: var(--text-muted); font-size: 0.85rem;">[Nenhuma imagem cadastrada para o trecho ${trecho.label}]</div>
                        `)}
                    </div>
                    <!-- Barra de Micro-Pausa Neural (10s) -->
                    <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; margin-top: 10px;">
                        <div id="microReplayText" style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 4px;">
                            🧠 Micro-Pausa (10s): Respiro consciente entre repetições...
                        </div>
                        <div style="height: 4px; background: #0e1626; border-radius: 3px; overflow: hidden;">
                            <div id="microReplayBar" style="width: 0%; height: 100%; background: var(--accent2); transition: width 0.2s linear;"></div>
                        </div>
                    </div>
                </div>
                <!-- Coluna Direita: Sidebar de Controle Fixo (30%) -->
                <div class="split-right">
                    <!-- 1. Placar Visual Explícito -->
                    <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">PLACAR BRUTO</span>
                            <button class="btn btn-reset" style="font-size: 0.7rem; padding: 2px 8px;" data-action="toggle-sw-pause">
                                ${sw.isPaused ? '▶ Retomar [P]' : '⏸ Pausar [P]'}
                            </button>
                        </div>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <div class="stat-box" style="flex: 1; border-color: var(--accent2); background: rgba(34, 197, 94, 0.1); padding: 8px 4px;">
                                <div class="num" style="color: var(--accent2); font-size: 1.15rem;">✓ ${sw.sessionHits || 0}</div>
                                <div class="lbl" style="font-size: 0.62rem;">ACERTOS</div>
                            </div>
                            <div class="stat-box" style="flex: 1; border-color: var(--danger); background: rgba(239, 68, 68, 0.1); padding: 8px 4px;">
                                <div class="num" style="color: var(--danger); font-size: 1.15rem;">✗ ${sw.sessionMisses || 0}</div>
                                <div class="lbl" style="font-size: 0.62rem;">ERROS</div>
                            </div>
                        </div>
                        <div style="text-align: center; background: #0e1626; border-radius: 8px; padding: 6px; border: 1px solid var(--border);">
                            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 2px;">META CONSECUTIVA:</div>
                            <div>${dotsHtml}</div>
                        </div>
                    </div>
                    <!-- 2. Metrônomo com Pulso Luminoso -->
                    <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">METRÔNOMO</span>
                            <div class="metro-led" style="width: 12px; height: 12px; border-radius: 50%; background: #334155;"></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px;">
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="-5"'}>-5</button>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="-1"'}>-1</button>
                            <input type="number" id="swBpmInput" class="form-control" value="${this.currentBpm}" style="width: 52px; padding: 3px; text-align: center; font-weight: 800; font-size: 0.9rem;" ${this.speedLock ? 'readonly disabled' : 'data-action="change-sw-bpm"'}>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="1"'}>+1</button>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-sw-bpm" data-delta="5"'}>+5</button>
                        </div>
                        <button id="swMetroToggleBtn" class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="width: 100%; padding: 8px; font-size: 0.8rem;" data-action="toggle-sw-metro">
                        ${isMetroOn ? '⏸ Parar' : '▶ Ligar (M)'}
                        </button>
                        ${this.speedLock ? `
                        <div style="font-size: 0.65rem; color: #f87171; text-align: center; margin-top: 6px; font-weight: bold; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; padding: 4px; line-height: 1.2;">
                            🔒 Estabilização Neuromuscular Ativa: Velocidade travada em -30% para proteção de tendões.
                        </div>
                        ` : ''}
                    </div>
                    <!-- 3. Botões de Registro 1-Clique -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-audit btn-audit-hit" style="padding: 16px; font-size: 0.92rem; font-weight: 800;" data-action="sw-hit">
                            ✔️ ACERTEI [Espaço]
                        </button>
                        <button class="btn-audit btn-audit-miss" style="padding: 14px; font-size: 0.88rem; font-weight: 700;" data-action="sw-miss">
                            ❌ ERREI [E]
                        </button>
                    </div>
                    <!-- 4. Controles Auxiliares -->
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <button class="btn btn-outline" style="flex: 1; padding: 6px; font-size: 0.72rem;" data-action="toggle-sw-prompt">
                            ${sw.isPromptDropped ? '👁️ Ver [H]' : '🙈 Ocultar [H]'}
                        </button>
                        <button class="btn btn-reset" style="flex: 1; padding: 6px; font-size: 0.72rem; color: var(--danger);" data-action="finish-sandwich-early">
                            ⏹ Encerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

window.SandwichPlayer = new SandwichPlayerClass();
