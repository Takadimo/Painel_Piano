/**
 * freePlayer.js - Controlador do Modo de Prática Livre & Aquecimento Avulso (Cockpit Split-View)
 * Painel de Estudos de Piano — Versão 15.1.0
 * Aluno: Leonardo Moura | Data: 29/08/2026
 *
 * Responsabilidades:
 * - Layout Ergonômico Split-View (Canvas de Partitura 70% + Sidebar de Controle Fixo 30%)
 * - Widget de Metrônomo com LED de pulso luminoso e ajuste fino ([-5], [-1], [+1], [+5])
 * - Placar explícito de ✓ Acertos e ✗ Erros com suporte a Pausa Ativa [P]
 * - Cronometragem contínua e fidedigna com gravação relacional no SSOT e no Histórico
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class FreePlayerClass {
    constructor() {
        this.selectedPieceId = null;
        this.selectedTrechoId = null;
        this.currentBpm = 60;
        this.hits = 0;
        this.misses = 0;
        this.metroWasOnBeforePause = false;
        this._timerInterval = null;
        this._secondsElapsed = 0;
        this._isFreeRunning = false;
        this._isFreePaused = false;
        this._replayTimerInterval = null;
        this._replaySeconds = 0;
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
    
    startMicroReplayTimer() {
        this.stopMicroReplayTimer();
        this._replaySeconds = 0;
        const bar = document.getElementById("freeMicroReplayBar");
        const txt = document.getElementById("freeMicroReplayText");
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
        if (window.AudioTools) {
            window.AudioTools.stopMetronome();
        }
        const bar = document.getElementById("freeMicroReplayBar");
        if (bar) bar.style.width = "0%";
    }

    startSession(pieceId = null, trechoId = null) {
        const activePieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        let piece = pieceId ? activePieces.find(p => p.id === pieceId) : (this.selectedPieceId ? activePieces.find(p => p.id === this.selectedPieceId) : activePieces[0]);
        if (!piece && activePieces.length > 0) piece = activePieces[0];
        if (!piece) return;

        let trecho = trechoId ? (piece.trechos || []).find(t => t.id === trechoId) : (this.selectedTrechoId ? (piece.trechos || []).find(t => t.id === this.selectedTrechoId) : (piece.trechos && piece.trechos[0]));
        if (!trecho) return;

        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        this.selectedPieceId = piece.id;
        this.selectedTrechoId = trecho.id;

        // 🧠 [CAMADA V - META 5.4.3] BPM Adaptativo Inteligente calculado pelo NeuroEngine
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Ativação de Sandbox) ---
        this.selectedPieceId = piece.id;
        this.selectedTrechoId = trecho.id;

        // 🔒 LÓGICA DE SANDBOX: Trechos prematuros ativam o isolamento de telemetria
        const isSandbox = (trecho.passo >= 2 && window.RepertoireManager && !window.RepertoireManager.isPrerequisiteMet(piece.id, trecho.id));
        if (isSandbox) {
            if (window.App && window.App.showToast) {
                window.App.showToast(`🔒 Sessão Sandbox! Modo Exploratório ativo (sem avanço de caixas).`, "warn");
            }
        }

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
        
        // 🧼 LIMPEZA DA MICRO-PAUSA AQUI (Passo 2.3)
        this.stopMicroReplayTimer();
        
        this.hits = 0;
        this.misses = 0;
        this._secondsElapsed = 0;
        // _isFreePaused removido: leitura delegada estritamente ao SSOT (StateManager)
        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.stopMetronome();
        }

        window.StateManager.setState({
            activeTab: "sala",
            salaMode: "free",
            freePracticeState: {
                active: true,
                finished: false,
                isPaused: false,
                pieceId: piece.id,
                trechoId: trecho.id,
                /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
                bpm: this.currentBpm,
                hits: 0,
                misses: 0,
                secondsElapsed: 0,
                startTime: new Date().toISOString()
            }
        }, "START_FREE_PRACTICE");
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Gravação da Flag no State) ---
                bpm: this.currentBpm,
                hits: 0,
                misses: 0,
                secondsElapsed: 0,
                isSandbox: isSandbox, // <-- INJEÇÃO DA FLAG DE ISOLAMENTO
                startTime: new Date().toISOString()
            }
        }, "START_FREE_PRACTICE");

        this.startTimer();
    }

    togglePause() {
        const currentState = window.StateManager.getState();
        const isPausedNow = !(currentState.freePracticeState.isPaused || false);

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
            freePracticeState: {
                ...prev.freePracticeState,
                isPaused: isPausedNow
            }
        }), "TOGGLE_FREE_PAUSE");
        if (window.App && window.App.showToast) {
            window.App.showToast(isPausedNow ? "⏸️ Prática Livre Pausada [P]" : "▶️ Prática Livre Retomada [P]", "info");
        }
        this.renderUI(window.StateManager.getState());
    }

    startTimer() {
        this.stopTimer();
        this._isFreeRunning = true;
        this._timerInterval = setInterval(() => {
            const fp = window.StateManager ? window.StateManager.getState().freePracticeState : null;
            const isPaused = fp ? (fp.isPaused || false) : false;
            if (!isPaused) {
                this._secondsElapsed++;
                this.updateTimerDisplay();
                if (this._secondsElapsed % 60 === 0) {
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
                    }), "ACCUMULATE_FREE_MINUTE", true);
                }
            }
        }, 1000);
    }
    stopTimer() {
        this._isFreeRunning = false;
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }
    updateTimerDisplay() {
        const el = document.getElementById("freePracticeTimerDisplay");
        if (!el) return;
        const mins = Math.floor(this._secondsElapsed / 60);
        const secs = this._secondsElapsed % 60;
        el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    registerHit() {
        const fp = window.StateManager.getState().freePracticeState;
        if (fp && fp.isPaused) return;
        this.hits++;
        if (window.AudioTools) window.AudioTools.playHitSound();
        window.StateManager.setState(prev => ({
            xp: (prev.xp || 0) + 2,
            freePracticeState: {
                ...prev.freePracticeState,
                hits: this.hits
            }
        }), "FREE_HIT");
        this.renderUI(window.StateManager.getState());
    }
    registerMiss() {
        const fp = window.StateManager.getState().freePracticeState;
        if (fp && fp.isPaused) return;
        this.misses++;
        if (window.AudioTools) window.AudioTools.playMissSound();
        window.StateManager.setState(prev => ({
            freePracticeState: {
                ...prev.freePracticeState,
                misses: this.misses
            }
        }), "FREE_MISS");
        this.renderUI(window.StateManager.getState());
    }

    finishSession() {
        this.stopTimer();
        
        // 🧼 LIMPEZA DA MICRO-PAUSA AQUI (Passo 2.3)
        this.stopMicroReplayTimer();
        
        if (window.AudioTools) {
            window.AudioTools.releaseWakeLock();
            window.AudioTools.stopMetronome();
            window.AudioTools.playHitSound();
        }


        const totalAttempts = this.hits + this.misses;
        const acc = totalAttempts > 0 ? Math.round((this.hits / totalAttempts) * 100) : 0;
        // --- EQUAÇÃO DE PADRONIZAÇÃO META 1.6 ---
        const durMins = Math.max(1, Math.ceil(this._secondsElapsed / 60));
        const accumulatedMins = Math.floor(this._secondsElapsed / 60);
        const residualMins = durMins - accumulatedMins;
        const fp = window.StateManager.getState().freePracticeState;
        if (fp.pieceId && fp.trechoId && window.RepertoireManager) {
            window.RepertoireManager.recordTrechoPractice(fp.pieceId, fp.trechoId, this._secondsElapsed, this.hits, this.misses);
        }

        const { piece, trecho } = (window.RepertoireManager && fp.pieceId && fp.trechoId)
            ? window.RepertoireManager.getPieceAndTrecho(fp.pieceId, fp.trechoId)
            : { piece: { title: "Peça" }, trecho: { label: "Trecho" } };

        window.StateManager.setState(prev => {
            const dailyStatsUpdate = { ...prev.dailyStats };
            if (residualMins > 0) {
                dailyStatsUpdate.focusMinutes = (dailyStatsUpdate.focusMinutes || 0) + residualMins;
                dailyStatsUpdate.repertoireMinutes = (dailyStatsUpdate.repertoireMinutes || 0) + residualMins;
            }
            dailyStatsUpdate.completedSessions = (dailyStatsUpdate.completedSessions || 0) + 1;

            const globalStatsUpdate = { ...prev.globalStats };
            if (residualMins > 0) {
                globalStatsUpdate.totalMinutes = (globalStatsUpdate.totalMinutes || 0) + residualMins;
            }
            globalStatsUpdate.totalSessions = (globalStatsUpdate.totalSessions || 0) + 1;

            return {
                xp: (prev.xp || 0) + 15,
                dailyStats: dailyStatsUpdate,
                globalStats: globalStatsUpdate,
                history: [
                    {
                        date: new Date().toLocaleDateString('sv-SE'),
                        type: "Prática Livre",
                        pieceId: piece ? piece.id : "Peça",
                        trechoId: trecho ? `${trecho.label} (${this.hits}A/${this.misses}E)` : "Trecho",
                        durationMinutes: durMins,
                        accuracyPct: acc,
                        manualOffline: false
                    },
                    ...(prev.history || [])
                ],
                freePracticeState: {
                    active: false,
                    finished: false
                }
            };
        }, "FINISH_FREE_PRACTICE");

        if (window.App && window.App.showToast) {
            window.App.showToast(`🎉 Prática Livre Concluída (+${durMins}m em ${trecho ? trecho.label : 'Trecho'}).`, "success");
        }

        this.renderUI(window.StateManager.getState());
    }

    resetToSetup() {
        this.stopTimer();
        
        // 🧼 LIMPEZA DA MICRO-PAUSA AQUI (Passo 2.3)
        this.stopMicroReplayTimer();
        
        window.StateManager.setState(prev => ({
            freePracticeState: {
                active: false,
                finished: false
            }
        }), "RESET_FREE_SETUP");
    }

    renderUI(state) {
        const container = document.getElementById("freePracticeContainer");
        if (!container) return;

        const fp = state.freePracticeState || {};

        if (fp.active) {
            const { piece, trecho } = (window.RepertoireManager && fp.pieceId && fp.trechoId)
                ? window.RepertoireManager.getPieceAndTrecho(fp.pieceId, fp.trechoId)
                : { piece: { title: "Peça" }, trecho: { label: "Trecho" } };
            const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;
            const scoreImgUrl = typeof window.getScoreImageUrl === "function" ? window.getScoreImageUrl(trecho ? trecho.label : "") : "";
            // 🔄 [CAMADA VI - META 5.2.3] Cálculo reativo de estresse para Encadeamento Retrógrado
            const cache = state.metricsCache || {};
            const trechoCache = trecho ? (cache[trecho.id] || {}) : {};
            const normIFM = trechoCache.normIFM || 0;
            const consecutiveFailures = trecho ? (trecho.consecutiveFailures || 0) : 0;
            const isReverseChaining = consecutiveFailures > 2 || normIFM > 0.85;
            container.innerHTML = `
<div class="split-view-container">
    <!-- Coluna Esquerda: Canvas de Partitura (70%) -->
    <div class="split-left">
        <!-- 🔒 LÓGICA DE SANDBOX: Banner visual explícito do modo exploratório -->
        ${fp.isSandbox ? `
        <div style="background: rgba(245, 158, 11, 0.15); border: 1px dashed #f59e0b; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.8rem; color: #fbbf24; text-align: center;">
            🔒 <strong>Sessão Sandbox (Exploratória)</strong><br>
            Os resultados desta sessão registram tempo e XP, mas <strong>não avançam caixas Leitner</strong> nem afetam a Sessão Guiada.
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div>
                <span class="badge info" style="font-size: 0.72rem;">Modo Prática Livre</span>
                <h3 style="margin: 4px 0 0; font-size: 1.15rem; color: #fff;">${piece.title}</h3>
                <div style="font-size: 0.88rem; font-weight: 700; color: var(--accent);">${trecho.label}</div>
            </div>
            <div>
                <span class="badge ${this._isFreePaused ? 'warn' : 'accent2'}" style="font-size: 0.72rem;">
                    ${this._isFreePaused ? '⏸️ PAUSADO' : '▶️ ATIVO'}
                </span>
            </div>
        </div>
        ${isReverseChaining && trecho ? `
        <div style="background: rgba(147, 197, 253, 0.1); border: 1px solid rgba(147, 197, 253, 0.3); border-radius: 12px; padding: 12px 16px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 1.2rem;">🔄</span>
                <div>
                    <div style="font-size: 0.65rem; color: #93c5fd; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">Encadeamento Retrógrado Ativo</div>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Estude do fim para o começo. Escolha a sua fase de foco atual:</span>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${this.getReverseChainingSteps(trecho).map((step, idx) => {
                    const isSelected = (this.freeChainIndex || 0) === idx;
                    return `
                    <button class="btn" style="text-align: left; padding: 8px 12px; font-size: 0.78rem; display: flex; align-items: center; justify-content: space-between; background: ${isSelected ? 'rgba(147, 197, 253, 0.15)' : 'var(--card-inner)'}; border: 1px solid ${isSelected ? '#93c5fd' : 'var(--border)'}; color: ${isSelected ? '#fff' : 'var(--text-muted)'}; margin: 0; width: 100%; cursor: pointer;" data-action="set-free-chain" data-index="${idx}">
                        <span>${step}</span>
                        ${isSelected ? '<span style="color: #93c5fd; font-weight: bold;">Foco Ativo 🎯</span>' : '<span>Estudar</span>'}
                    </button>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}
        <!-- Partitura Ampliada com Altura Otimizada para Estante Física -->
        <div class="score-container skeleton-pulse" style="width: 100%; min-height: 350px; height: 65vh; position: relative; background: #0e1626; border-radius: 14px; border: 1px solid var(--border); padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 8px;">
            ${scoreImgUrl ? `
                <img src="${scoreImgUrl}" alt="Partitura" class="sheet-paper-effect" style="width: 100%; height: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${scoreImgUrl}" data-title="${piece ? piece.title : ''} — ${trecho ? trecho.label : ''}">
            ` : `
                <div style="color: var(--text-muted); font-size: 0.85rem;">[Nenhuma imagem cadastrada para o trecho ${trecho ? trecho.label : ''}]</div>
            `}
        </div>
        <!-- Barra de Micro-Pausa Neural (10s) -->
        <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; margin-top: 10px;">
            <div id="freeMicroReplayText" style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 4px;">
                🧠 Micro-Pausa (10s): Respiro consciente entre repetições...
            </div>
            <div style="height: 4px; background: #0e1626; border-radius: 3px; overflow: hidden;">
                <div id="freeMicroReplayBar" style="width: 0%; height: 100%; background: var(--accent2); transition: width 0.2s linear;"></div>
            </div>
        </div>
    </div>
    <!-- Coluna Direita: Sidebar de Controle Fixo (30%) -->
    <div class="split-right">
        <!-- 1. Cronômetro & Pausa -->
        <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">TEMPO DE PRÁTICA</span>
                <button class="btn btn-reset" style="font-size: 0.7rem; padding: 2px 8px;" data-action="toggle-free-pause">
                    ${this._isFreePaused ? '▶️ Retomar [P]' : '⏸️ Pausar [P]'}
                </button>
            </div>
            <div id="freePracticeTimerDisplay" style="font-size: 1.6rem; font-family: monospace; font-weight: 800; color: #fff; text-align: center;">
                ${String(Math.floor(this._secondsElapsed / 60)).padStart(2, '0')}:${String(this._secondsElapsed % 60).padStart(2, '0')}
            </div>
        </div>
        <!-- 2. Placar de Acertos / Erros -->
        <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 6px;">PLACAR EXPLÍCITO</span>
            <div style="display: flex; gap: 8px;">
                <div class="stat-box" style="flex: 1; border-color: var(--accent2); background: rgba(34, 197, 94, 0.1); padding: 8px 4px;">
                    <div class="num" style="color: var(--accent2); font-size: 1.15rem;">✓ ${this.hits}</div>
                    <div class="lbl" style="font-size: 0.62rem;">ACERTOS</div>
                </div>
                <div class="stat-box" style="flex: 1; border-color: var(--danger); background: rgba(239, 68, 68, 0.1); padding: 8px 4px;">
                    <div class="num" style="color: var(--danger); font-size: 1.15rem;">✗ ${this.misses}</div>
                    <div class="lbl" style="font-size: 0.62rem;">ERROS</div>
                </div>
            </div>
        </div>
        <!-- 3. Metrônomo com Pulso Luminoso -->
        <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">METRÔNOMO</span>
                <div class="metro-led" style="width: 12px; height: 12px; border-radius: 50%; background: #334155;"></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px;">
                <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-free-bpm-player" data-delta="-5"'}>-5</button>
                <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-free-bpm-player" data-delta="-1"'}>-1</button>
                <input type="number" id="freeBpmInputActive" class="form-control" value="${this.currentBpm}" style="width: 52px; padding: 3px; text-align: center; font-weight: 800; font-size: 0.9rem;" ${this.speedLock ? 'readonly disabled' : 'data-action="change-free-bpm-player"'}>
                <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-free-bpm-player" data-delta="1"'}>+1</button>
                <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" ${this.speedLock ? 'disabled' : 'data-action="delta-free-bpm-player" data-delta="5"'}>+5</button>
            </div>
            <button class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="width: 100%; padding: 8px; font-size: 0.8rem;" data-action="toggle-free-player-metro">
                ${isMetroOn ? '⏸️ Parar' : '▶️ Ligar (M)'}
            </button>
            ${this.speedLock ? `
            <div style="font-size: 0.65rem; color: #f87171; text-align: center; margin-top: 6px; font-weight: bold; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; padding: 4px; line-height: 1.2;">
                🔒 Estabilização Neuromuscular Ativa: Velocidade travada em -30% para proteção de tendões.
            </div>
            ` : ''}
        </div>
        <!-- 4. Botões de Registro -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn-audit btn-audit-hit" style="padding: 16px; font-size: 0.92rem; font-weight: 800;" data-action="hit-free">
                ✔️ ACERTO [Espaço]
            </button>
            <button class="btn-audit btn-audit-miss" style="padding: 14px; font-size: 0.88rem; font-weight: 700;" data-action="miss-free">
                ❌ ERRO [E]
            </button>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 4px; padding: 12px; font-weight: 700; border-radius: 10px;" data-action="finish-free-practice">
            ⏹️ ENCERRAR E SALVAR
        </button>
    </div>
</div>
`;
            return;
        }

        const activePieces = state.repertoire?.active || [];
        const piece = activePieces.find(p => p.id === (this.selectedPieceId || activePieces[0]?.id)) || activePieces[0];
        const rawTrechos = piece?.trechos || [];
        
        // 🧠 ORDENAÇÃO TELEMÉTRICA VIA P-SCORE (NEUROENGINE) 🧠
        // Pondera automaticamente a Dificuldade Real (normIFM) vs Negligência Anti-Da Capo (normBias)
        const cache = state.metricsCache || {};
        const sortedTrechos = [...rawTrechos].sort((a, b) => {
            const pScoreA = cache[a.id]?.pScore ?? 1.0; // Padrão 1.0 garante topo absoluto para trechos virgens
            const pScoreB = cache[b.id]?.pScore ?? 1.0;
            if (pScoreA !== pScoreB) return pScoreB - pScoreA; // Ordem decrescente de urgência
            return String(a.label || "").localeCompare(String(b.label || ""));
        });

        const currentTrechoId = this.selectedTrechoId || sortedTrechos[0]?.id;

        const criticalTrechos = [];
        const nominalTrechos = [];
        sortedTrechos.forEach(t => {
            const pScore = cache[t.id]?.pScore ?? 0.50; // Fallback alinhado com trechos virgens
            // Limiar de Criticidade Elevado: Exige degradação motora ou lag severo (P-Score >= 0.65)
            if (pScore >= 0.65) criticalTrechos.push(t);
            else nominalTrechos.push(t);
        });

        let trechosOptionsHtml = criticalTrechos.map(t => `<option value="${t.id}" ${t.id === currentTrechoId ? 'selected' : ''}>⚠️ ${t.label} (Cx ${t.box || 0} • P-Score: ${(cache[t.id]?.pScore ?? 0.50).toFixed(2)})</option>`).join('');
        if (criticalTrechos.length > 0 && nominalTrechos.length > 0) {
            trechosOptionsHtml += `<option disabled>──────── Foco Neutro ────────</option>`;
        }
        trechosOptionsHtml += nominalTrechos.map(t => `<option value="${t.id}" ${t.id === currentTrechoId ? 'selected' : ''}>${t.label} (Cx ${t.box || 0} • P-Score: ${(cache[t.id]?.pScore ?? 0.50).toFixed(2)})</option>`).join('');


        container.innerHTML = `
<h2 style="color: #fff; font-size: 1.15rem; margin-bottom: 6px;">🎹 Prática Livre & Aquecimento (Cockpit Split-View)</h2>
<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
    Pratique qualquer trecho sem restrição de rounds com cronômetro contínuo, placar bruto e metrônomo síncrono.
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
        suggestionsHtml += `<button class="btn btn-outline" style="text-align: left; padding: 10px; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.05);" data-action="start-free-from-trecho" data-piece="${antiDaCapo.piece.id}" data-trecho="${antiDaCapo.trecho.id}">
            <strong style="display: block; color: #fbbf24; font-size: 0.85rem;">🛡️ Risco Anti-Da Capo (Final da Peça)</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">P-Score Bias: ${antiDaCapo.metrics.normBias.toFixed(2)} • ${antiDaCapo.piece.title.split('—')[0]} (${antiDaCapo.trecho.label})</span>
        </button>`;
    }
    if (gargalo) {
        suggestionsHtml += `<button class="btn btn-outline" style="text-align: left; padding: 10px; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);" data-action="start-free-from-trecho" data-piece="${gargalo.piece.id}" data-trecho="${gargalo.trecho.id}">
            <strong style="display: block; color: #f87171; font-size: 0.85rem;">⚠️ Micro-Reparo de Gargalo</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Alta Fricção (IFM: ${gargalo.metrics.normIFM.toFixed(2)}) • ${gargalo.piece.title.split('—')[0]} (${gargalo.trecho.label})</span>
        </button>`;
    }
    if (inedito) {
        suggestionsHtml += `<button class="btn btn-outline" style="text-align: left; padding: 10px; border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.05);" data-action="start-free-from-trecho" data-piece="${inedito.piece.id}" data-trecho="${inedito.trecho.id}">
            <strong style="display: block; color: #38bdf8; font-size: 0.85rem;">🌱 Nova Aquisição (Caixa 0)</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Trecho Inédito • ${inedito.piece.title.split('—')[0]} (${inedito.trecho.label})</span>
        </button>`;
    }
    return suggestionsHtml + `</div></div>`;
})()}

<div class="form-group">
    <label>Trecho de Foco (Ordenado por P-Score / Da Capo):</label>
    <select id="freeTrechoSelect" class="form-control" data-action="change-free-trecho">
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
                // Encontra os irmãos deste trecho (ex: se for o 1-4, procura o 5-8)
                const siblings = parentTrecho.baseBlockIds
                    .filter(id => id !== t.id)
                    .map(sibId => (piece.trechos || []).find(x => x.id === sibId))
                    .filter(Boolean);
                
                // Descobre a caixa mais avançada entre os irmãos
                const maxSiblingBox = siblings.reduce((max, sib) => Math.max(max, sib.box || 0), 0);
                
                // Se o irmão está mais avançado que eu, eu sou o gargalo!
                if ((t.box || 0) < maxSiblingBox) {
                    bottleneckTag = " [⚠️ Dupla Atrasada]";
                }
            }
            
            return `<option value="${t.id}" ${t.id === currentTrechoId ? 'selected' : ''}>${lockIcon}${t.label} (Passo ${t.passo} • P-Score: ${pScore})${bottleneckTag}</option>`;
        }).join('')}
    </select>
</div>
<button class="btn btn-primary" style="width: 100%; padding: 14px; font-weight: 700; font-size: 0.95rem; margin-top: 8px;" data-action="start-free-session-btn">
    ▶️ INICIAR PRÁTICA LIVRE
</button>
`;
    }
}
window.FreePlayer = new FreePlayerClass();
