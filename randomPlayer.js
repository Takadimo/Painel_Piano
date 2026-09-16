/**
 * randomPlayer.js - Controlador do Modo de Sorteio Intercalado (Cockpit Split-View)
 * Painel de Estudos de Piano — Versão 15.2.0 (Unificado & Otimizado)
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Layout Ergonômico Split-View (Canvas de Partitura 70% + Sidebar 30%)
 * - Prática de recuperação aleatória (Interleaving) entre 4 trechos distintos para consolidação de traços motores
 * - Telemetria Bruta de Erros/Acertos fidedigna gravada no SSOT
 * - Metrônomo com Pulso Luminoso, Pausa Ativa [P], Memória Ativa [H] e Alerta de Retenção
 * - Scorecard final com Tags de Dificuldade de 1-Clique por spot executado
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class RandomPlayerClass {
    constructor() {
        this.sessionSpots = [];
        this.currentSpotIndex = 0;
        this.sessionBpm = 60;
        this.durationMinutes = 10;
        this.hits = 0;
        this.misses = 0;
        this.isPaused = false;
        this._timerInterval = null;
        this._secondsElapsed = 0;
        this._isRunning = false;
    }

    startSession(filterCriteria = {}, durationMinutes = 10, bpm = 60) {
        const activePieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        let candidateSpots = [];

        activePieces.forEach(p => {
            if (filterCriteria.pieces && filterCriteria.pieces.length > 0 && !filterCriteria.pieces.includes(p.id)) return;

            (p.trechos || []).forEach(t => {
                if (filterCriteria.steps && filterCriteria.steps.length > 0 && !filterCriteria.steps.includes(t.passo)) return;
                if (filterCriteria.onlyConsolidated && !t.consolidated && (t.box || 1) < 2) return;

                candidateSpots.push({
                    pieceId: p.id,
                    pieceTitle: p.title,
                    trechoId: t.id,
                    trechoLabel: t.label,
                    compassos: t.compassos,
                    passo: t.passo,
                    box: t.box || 1,
                    hits: 0,
                    misses: 0,
                    attempts: 0,
                    history: []
                });
            });
        });

        if (candidateSpots.length === 0) {
            if (window.App && window.App.showToast) {
                window.App.showToast("Nenhum trecho atende aos critérios do sorteio selecionados.", "warn");
            }
            return;
        }

        // Embaralha usando Fisher-Yates e seleciona até 4 spots
        for (let i = candidateSpots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidateSpots[i], candidateSpots[j]] = [candidateSpots[j], candidateSpots[i]];
        }

        this.sessionSpots = candidateSpots.slice(0, 4);
        this.currentSpotIndex = 0;
        this.sessionBpm = parseInt(bpm, 10) || 60;
        this.durationMinutes = parseInt(durationMinutes, 10) || 10;
        this.hits = 0;
        this.misses = 0;
        this.isPaused = false;

        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.stopMetronome();
        }

        window.StateManager.setState({
            activeTab: "sala",
            salaMode: "random",
            randomSessionState: {
                active: true,
                finished: false,
                spots: this.sessionSpots,
                currentSpotIndex: 0,
                bpm: this.sessionBpm,
                isPromptDropped: false,
                durationMinutes: this.durationMinutes,
                startTime: new Date().toISOString()
            }
        }, "START_RANDOM_SESSION");
        this._secondsElapsed = 0;
        this._isRunning = true;
        if (this._timerInterval) clearInterval(this._timerInterval);
        this._timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this._secondsElapsed++;
                
                const el = document.getElementById("randTimerDisplay");
                if (el) {
                    const mins = Math.floor(this._secondsElapsed / 60);
                    const secs = this._secondsElapsed % 60;
                    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }

                // --- META 1.6: Acúmulo Incremental Síncrono a cada 60 segundos ---
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
                  }), "ACCUMULATE_RANDOM_MINUTE", true);
              }
          }
      }, 1000);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            if (window.AudioTools) window.AudioTools.stopMetronome();
        } else {
            if (window.AudioTools) window.AudioTools.startMetronome(this.sessionBpm);
        }

        if (window.App && window.App.showToast) {
            window.App.showToast(this.isPaused ? "⏸️ Sorteio Pausado [P]" : "▶️ Sorteio Retomado [P]", "info");
        }
        this.renderUI(window.StateManager.getState());
    }

    registerHit() {
        const state = window.StateManager.getState();
        const rs = state.randomSessionState;
        if (!rs.active || rs.finished || this.isPaused) return;

        this.hits++;
        const spot = rs.spots[rs.currentSpotIndex];
        if (spot) {
            spot.hits = (spot.hits || 0) + 1;
            spot.attempts = (spot.attempts || 0) + 1;
            spot.history.push(true);
        }

        if (window.AudioTools) window.AudioTools.playHitSound();
        this._advanceOrComplete(rs);
    }

    registerMiss() {
        const state = window.StateManager.getState();
        const rs = state.randomSessionState;
        if (!rs.active || rs.finished || this.isPaused) return;

        this.misses++;
        const spot = rs.spots[rs.currentSpotIndex];
        if (spot) {
            spot.misses = (spot.misses || 0) + 1;
            spot.attempts = (spot.attempts || 0) + 1;
            spot.history.push(false);
        }

        if (window.AudioTools) window.AudioTools.playMissSound();
        this._advanceOrComplete(rs);
    }

    _advanceOrComplete(rs) {
        const nextIdx = rs.currentSpotIndex + 1;
        if (nextIdx >= rs.spots.length) {
            this.finishSession();
        } else {
            window.StateManager.setState(prev => ({
                randomSessionState: {
                    ...prev.randomSessionState,
                    currentSpotIndex: nextIdx,
                    isPromptDropped: false
                }
            }), `RANDOM_SPOT_${nextIdx}`);
        }
    }

    togglePromptVisibility() {
        window.StateManager.setState(prev => ({
            randomSessionState: {
                ...prev.randomSessionState,
                isPromptDropped: !prev.randomSessionState.isPromptDropped
            }
        }), "TOGGLE_RANDOM_PROMPT");
    }

    finishSession(isEarly = false) {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        this._isRunning = false;
        if (window.AudioTools) {
            window.AudioTools.releaseWakeLock();
            window.AudioTools.stopMetronome();
            window.AudioTools.playHitSound();
        }
        const state = window.StateManager.getState();
        const rs = state.randomSessionState;
        const totalAttempts = this.hits + this.misses;
        const accuracy = totalAttempts > 0 ? Math.round((this.hits / totalAttempts) * 100) : 100;
        // --- EQUAÇÃO DE PADRONIZAÇÃO META 1.6 ---
      const practiceMins = Math.max(1, Math.ceil(this._secondsElapsed / 60));
      const accumulatedMins = Math.floor(this._secondsElapsed / 60);
      const residualMins = practiceMins - accumulatedMins;

      // Grava telemetria bruta em cada um dos trechos sorteados
      (rs.spots || []).forEach(spot => {
          if (spot.pieceId && spot.trechoId && window.RepertoireManager) {
              window.RepertoireManager.recordTrechoPractice(
                  spot.pieceId,
                  spot.trechoId,
                  Math.round((practiceMins * 60) / rs.spots.length),
                  spot.hits || 0,
                  spot.misses || 0
              );
          }
      });

      const hasHighResistance = this.misses >= 6 || (totalAttempts >= 8 && accuracy < 40);

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
              xp: (prev.xp || 0) + (isEarly ? 15 : 30),
              dailyStats: dailyStatsUpdate,
              globalStats: globalStatsUpdate,
              history: [
                  {
                      date: new Date().toLocaleDateString('sv-SE'),
                      type: "Sorteio Intercalado",
                      pieceId: `${rs.spots.length} Trechos Sorteados`,
                      trechoId: `Assertividade: ${accuracy}% (${this.hits}A/${this.misses}E)`,
                      durationMinutes: practiceMins,
                      accuracyPct: accuracy
                  },
                  ...(prev.history || [])
              ],
              randomSessionState: {
                  ...prev.randomSessionState,
                  active: true,
                  finished: true,
                  summary: {
                      accuracy,
                      totalHits: this.hits,
                      totalMisses: this.misses,
                      totalAttempts,
                      practiceMinutes: practiceMins,
                      xpEarned: isEarly ? 15 : 30,
                      hasHighResistance,
                      spotsSummary: rs.spots
                  }
              }
          }; // <-- Chave de fechamento do objeto retornado pelo return
      }, "FINISH_RANDOM_SESSION"); // <-- Fechamento correto do setState

      if (window.App && window.App.showToast) {
          window.App.showToast(`🎉 Sorteio Intercalado Concluído! Precisão: ${accuracy}% (+${practiceMins}m)`, "success");
      }
  }

    addDifficultyTag(pieceId, trechoId, tag) {
        if (!window.RepertoireManager) return;
        const { trecho } = window.RepertoireManager.getPieceAndTrecho(pieceId, trechoId);
        if (!trecho) return;

        const currentTags = trecho.difficultyTags || [];
        const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];

        window.RepertoireManager.updateTrecho(pieceId, trechoId, { difficultyTags: newTags });

        if (window.App && window.App.showToast) {
            window.App.showToast(`Tag "${tag}" salva em ${trecho.label}`, "info");
        }
        this.renderUI(window.StateManager.getState());
    }

    resetToSetup() {
        window.StateManager.setState(prev => ({
            randomSessionState: {
                active: false,
                finished: false,
                spots: []
            }
        }), "RESET_RANDOM_SETUP");
    }

    renderUI(state) {
        const container = document.getElementById("randomContainer");
        if (!container) return;

        const rs = state.randomSessionState || {};

        // 1. Tela Inicial de Filtros / Setup
        if (!rs.active) {
            const activePieces = (state.repertoire && state.repertoire.active) ? state.repertoire.active : [];
            container.innerHTML = `
                <h2 style="margin: 0 0 6px; font-size: 1.15rem; color: #fff;">🎲 Modo Sorteio Intercalado (Interleaving)</h2>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.45;">
                    Alterne aleatoriamente entre 4 trechos de peças distintas para treinar a <strong>recuperação motora rápida</strong> e quebrar a ilusão de competência.
                </p>
                <div class="form-group">
                    <label>1. Filtrar por Peças:</label>
                    <div class="filter-checkbox-group">
                        ${activePieces.map(p => `
                            <label class="filter-chip">
                                <input type="checkbox" name="randPiece" value="${p.id}" checked>
                                <span>${p.title}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>2. Filtrar por Passos (Tamanho do Bloco):</label>
                    <div class="filter-checkbox-group">
                        <label class="filter-chip"><input type="checkbox" name="randStep" value="1" checked> <span>Passo 1 (~4 comp)</span></label>
                        <label class="filter-chip"><input type="checkbox" name="randStep" value="2" checked> <span>Passo 2 (~8 comp)</span></label>
                    </div>
                </div>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Critério de Sorteio:</label>
                        <div style="display: flex; gap: 8px; margin-top: 4px;">
                            <label style="font-size: 0.78rem; display: flex; align-items: center; gap: 4px; color: #cbd5e1;">
                                <input type="radio" name="randCriteria" value="consolidated" checked> Apenas Consolidados (Caixa ≥ 2)
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Andamento Sugerido (BPM):</label>
                        <input type="number" id="randBpmInput" class="form-control" value="60" min="30" max="240" style="text-align: center; font-weight: 700;">
                    </div>
                </div>
                <button class="btn btn-primary" style="padding: 14px; font-weight: 700; font-size: 0.95rem; margin-top: 8px;" data-action="start-random-session">
                    🎲 SORTEAR 4 TRECHOS & INICIAR
                </button>
            `;
            return;
        }

        // 2. Scorecard de Resumo Final
        if (rs.finished && rs.summary) {
            const s = rs.summary;
            container.innerHTML = `
                <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: left;">
                    <h2 style="color: var(--accent2); font-size: 1.25rem; margin-bottom: 4px;">
                        🎉 Sorteio Intercalado Concluído!
                    </h2>
                    <div style="font-size: 0.88rem; color: #fff; margin-bottom: 14px;">
                        4 Trechos executados com recuperação aleatória
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px;">
                        <div class="stat-box">
                            <div class="num" style="color: var(--accent2);">${s.accuracy}%</div>
                            <div class="lbl">ASSERTIVIDADE REAL</div>
                        </div>
                        <div class="stat-box">
                            <div class="num"><span style="color:var(--accent2); font-weight:700;">${s.totalHits}A</span> / <span style="color:var(--danger); font-weight:700;">${s.totalMisses}E</span></div>
                            <div class="lbl">TENTATIVAS BRUTAS</div>
                        </div>
                        <div class="stat-box">
                            <div class="num" style="color: var(--warn);">+${s.xpEarned}</div>
                            <div class="lbl">XP GANHO</div>
                        </div>
                    </div>
                    ${s.hasHighResistance ? `
                        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: 12px; padding: 12px; margin-bottom: 14px;">
                            <strong style="color: #fca5a5; display: flex; align-items: center; gap: 6px; font-size: 0.88rem; margin-bottom: 4px;">
                                ⚠️ Alerta de Retenção Intercalada:
                            </strong>
                            <p style="font-size: 0.78rem; color: #fecaca; margin-bottom: 0; line-height: 1.45;">
                                A taxa de assertividade no sorteio caiu para <strong>${s.accuracy}%</strong>. Trechos que falharam sob troca de contexto serão agendados para reforço de Passo 1.
                            </p>
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 16px;">
                        <strong style="color: #93c5fd; font-size: 0.82rem; display: block; margin-bottom: 8px;">
                            📋 Desempenho por Trecho Sorteado:
                        </strong>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${(s.spotsSummary || []).map(spot => {
                                const tagsList = ["⚡ Salto", "🎼 Polifonia", "🖐️ Dedilhado", "⏱️ Ritmo"];
                                const trechoObj = (window.RepertoireManager && spot.pieceId && spot.trechoId)
                                    ? window.RepertoireManager.getPieceAndTrecho(spot.pieceId, spot.trechoId).trecho
                                    : null;
                                const activeTags = (trechoObj && trechoObj.difficultyTags) || [];
                                return `
                                    <div style="background: #0e1626; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                            <div>
                                                <strong style="color: #fff; font-size: 0.85rem;">${spot.pieceTitle}</strong>
                                                <span style="color: var(--accent); font-size: 0.78rem; font-weight: 700; margin-left: 4px;">${spot.trechoLabel}</span>
                                            </div>
                                            <span class="badge ${spot.misses > 0 ? 'danger' : 'info'}" style="font-size: 0.7rem;">
                                                ${spot.hits || 0}A / ${spot.misses || 0}E
                                            </span>
                                        </div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                                            ${tagsList.map(tag => {
                                                const isSel = activeTags.includes(tag);
                                                return `
                                                    <button class="btn btn-outline" style="font-size: 0.68rem; padding: 3px 8px; border-radius: 12px; ${isSel ? 'background: var(--accent); color: #fff; border-color: var(--accent);' : ''}" data-action="toggle-spot-difficulty-tag" data-piece="${spot.pieceId}" data-trecho="${spot.trechoId}" data-tag="${tag}">
                                                        ${tag} ${isSel ? '✓' : '+'}
                                                    </button>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <button class="btn btn-primary" style="padding: 14px; font-weight: 700;" data-action="back-random-setup">
                        Voltar ao Menu da Sala de Estudos
                    </button>
                </div>
            `;
            return;
        }

        // 3. Tela Ativa de Execução: LAYOUT SPLIT-VIEW (Canvas 70% + Sidebar 30%)
        const currentSpot = rs.spots[rs.currentSpotIndex] || rs.spots[0];
        const scoreImgUrl = typeof getScoreImageUrl === "function" ? getScoreImageUrl(currentSpot.trechoLabel) : "";
        const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;

        container.innerHTML = `
            <div class="split-view-container">
                <!-- Coluna Esquerda: Canvas de Partitura (70%) -->
                <div class="split-left">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                        <div>
                            <span class="badge info" style="font-size: 0.75rem;">Spot ${rs.currentSpotIndex + 1} de ${rs.spots.length} • Caixa ${currentSpot.box}</span>
                            <h3 style="margin: 4px 0 0; font-size: 1.15rem; color: #fff;">${currentSpot.pieceTitle}</h3>
                            <div style="font-size: 0.88rem; font-weight: 700; color: var(--accent);">${currentSpot.trechoLabel} (${currentSpot.compassos})</div>
                        </div>
                        <div>
                            <span class="badge ${this.isPaused ? 'warn' : 'accent2'}" style="font-size: 0.72rem;">
                                ${this.isPaused ? '⏸️ PAUSADO' : '▶️ ATIVO'}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Partitura em Alto Contraste com Paper Effect -->
                    <div class="score-container skeleton-pulse" style="min-height: 220px; max-height: 480px; position: relative; background: #0e1626; border-radius: 14px; border: 1px solid var(--border); padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        ${rs.isPromptDropped ? `
                            <div style="text-align: center; padding: 30px 10px;">
                                <div style="font-size: 2.2rem; margin-bottom: 8px;">🙈</div>
                                <strong style="color: #a5b4fc; font-size: 1.05rem; display: block;">Partitura Oculta (Memória Ativa)</strong>
                                <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 4px;">Recupere o trecho sem apoio visual.</p>
                                <button class="btn btn-outline" style="margin-top: 10px; font-size: 0.75rem; padding: 6px 12px;" data-action="toggle-hide-sheet-rand">
                                    👀 Espiar Partitura (H)
                                </button>
                            </div>
                        ` : (scoreImgUrl ? `
                            <img src="${scoreImgUrl}" alt="Partitura Sorteada" class="sheet-paper-effect" style="max-height: 440px; max-width: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${scoreImgUrl}" data-title="${currentSpot.pieceTitle} — ${currentSpot.trechoLabel}">
                        ` : `
                            <div style="color: var(--text-muted); font-size: 0.85rem;">[Partitura ${currentSpot.trechoLabel}]</div>
                        `)}
                    </div>
                </div>
                
                <!-- Coluna Direita: Sidebar de Controle Fixo (30%) -->
                <div class="split-right">
                    <!-- 1. Placar Visual Explícito -->
                    <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            				<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">TEMPO & PLACAR</span>
                            				<button class="btn btn-reset" style="font-size: 0.7rem; padding: 2px 8px;" data-action="toggle-rand-pause">
                                				${this.isPaused ? '▶ Retomar [P]' : '⏸ Pausar [P]'}
                            				</button>
                        			</div>
                       	 		<div id="randTimerDisplay" style="font-size: 1.4rem; font-family: monospace; font-weight: 800; color: #fff; text-align: center; margin-bottom: 8px;">
                            				${String(Math.floor(this._secondsElapsed / 60)).padStart(2, '0')}:${String(this._secondsElapsed % 60).padStart(2, '0')}
                        			</div>
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
                    
                    <!-- 2. Metrônomo com Pulso Luminoso -->
                    <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">METRÔNOMO</span>
                            <div class="metro-led" style="width: 12px; height: 12px; border-radius: 50%; background: #334155;"></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px;">
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" data-action="delta-rand-bpm" data-delta="-5">-5</button>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" data-action="delta-rand-bpm" data-delta="-1">-1</button>
                            <input type="number" id="randBpmInputActive" class="form-control" value="${rs.bpm || this.sessionBpm}" style="width: 52px; padding: 3px; text-align: center; font-weight: 800; font-size: 0.9rem;" data-action="change-rand-bpm">
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" data-action="delta-rand-bpm" data-delta="1">+1</button>
                            <button class="btn btn-reset" style="padding: 4px 6px; font-size: 0.7rem;" data-action="delta-rand-bpm" data-delta="5">+5</button>
                        </div>
                        <button id="btnToggleRandMetro" class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="width: 100%; padding: 8px; font-size: 0.8rem;" data-action="toggle-rand-metro">
                            ${isMetroOn ? '⏸ Parar' : '▶ Ligar (M)'}
                        </button>
                    </div>
                    
                    <!-- 3. Botões de Ação 1-Tiro -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-audit btn-audit-hit" style="padding: 16px; font-size: 0.92rem; font-weight: 800;" data-action="hit-random">
                            ✔️ ACERTEI [Espaço]
                        </button>
                        <button class="btn-audit btn-audit-miss" style="padding: 14px; font-size: 0.88rem; font-weight: 700;" data-action="miss-random">
                            ❌ ERREI [E]
                        </button>
                    </div>
                    
                    <!-- 4. Controles Auxiliares -->
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <button class="btn btn-outline" style="flex: 1; padding: 6px; font-size: 0.72rem;" data-action="toggle-hide-sheet-rand">
                            ${rs.isPromptDropped ? '👁️ Ver [H]' : '🙈 Ocultar [H]'}
                        </button>
                        <button class="btn btn-reset" style="flex: 1; padding: 6px; font-size: 0.72rem; color: var(--danger);" data-action="finish-random-early">
                            ⏹ Encerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

window.RandomPlayer = new RandomPlayerClass();
