/**
 * reading.js - Módulo de Leitura à Primeira Vista Reflexa & Catálogo do Acervo Primer (Cockpit Split-View)
 * Painel de Estudos de Piano — Versão 15.0.0
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Unificação da Leitura como 4º sub-modo nativo da Sala de Estudos (activeTab: "sala", salaMode: "reading")
 * - Filosofia Anti-Memorização: "Burn After Reading" / One-Shot Execution (Avanço automático para inédito)
 * - Catálogo Completo das 16 Coleções de Nível Zero (Primer Level - 299 partituras válidas)
 * - Layout Ergonômico Split-View (Canvas 70% + Sidebar 30% com Metrônomo Soberano e Pulso Luminoso)
 * - Fluxo em 3 Fases: 1. Análise Relâmpago (30s), 2. Execução One-Shot, 3. Diagnóstico de Gargalos de 1-Clique
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class ReadingManagerClass {
  constructor() {
    this.selectedExerciseId = "les-01";
    this.currentPhase = "analysis";
    this.isAnalysisActive = false;
    this.currentBpm = 60;
    this.lastEvaluation = null;
    this.selectedTags = [];
    this.duetAudio = null;
    this.multiSelectMode = false;
    this._analysisTimerInterval = null;
    this._analysisSecondsRemaining = 30;
    this._isAnalysisTimerRunning = false;
    }

  getCollections() { 
        return window.PianoDatabase.sightReading.collections; 
  }

  getExercises(collectionKey = "all") { 
      const exercises = window.PianoDatabase.sightReading.pieces;
      if (!collectionKey || collectionKey === "all") { 
          return exercises; 
      } 
      return exercises.filter(e => e.collection === collectionKey); 
  }

  getExerciseById(id) {
        if (!window.PianoDatabase || !window.PianoDatabase.sightReading) return null;
        const pieces = window.PianoDatabase.sightReading.pieces || [];
        return pieces.find(e => e.id === id) || pieces;
    }

    // 📅 Conta quantas falhas/erros foram registrados no histórico de leitura nos últimos 7 dias
    getWeeklyErrorCount() {
        const state = window.StateManager.getState();
        const history = state.history || [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const weeklyErrors = history.filter(h => {
            if (h.type !== "Leitura à 1ª Vista") return false;
            // Se o trechoId não for "Fluido", significa que foi um erro/hesitação registrado
            if (!h.trechoId || h.trechoId.includes("Fluido")) return false;
            
            const entryDate = new Date(h.date);
            return entryDate >= sevenDaysAgo;
        });
        
        return weeklyErrors.length;
    }

    // 🧠 EQUAÇÃO DE PESO COGNITIVO ADAPTATIVA (Coasting vs Frontier)
    calculateWeightedXp(outcome) {
        const currentEx = this.getExerciseById(this.selectedExerciseId);
        const weeklyErrors = this.getWeeklyErrorCount();
        
        // Regra do Leonardo: Se houver menos de 5 erros na semana, o multiplicador é travado no mínimo (1x)
        const isCoasting = weeklyErrors < 5;
        const levelMultiplier = isCoasting ? 1 : (currentEx ? (parseInt(currentEx.level, 10) || 1) : 1);
        
        let base = 15; // 🟢 Fluido
        if (outcome === "hesitated") base = 8; // 🟡 Hesitado
        if (outcome === "collapsed") base = 3; // 🔴 Colapso
        
        return base * levelMultiplier;
    }

    selectExercise(exerciseId) {
    this.selectedExerciseId = exerciseId;
    this.currentPhase = "analysis";
    this.selectedTags = [];
    this.stopAnalysisTimer();
    this._analysisSecondsRemaining = 30;
    const ex = this.getExerciseById(exerciseId);
    this.currentBpm = ex.targetBpm || 60;
    window.StateManager.setState(prev => ({
      reading: {
        ...(prev.reading || {}),
        currentExerciseId: exerciseId
      }
    }), `SELECT_READING_${exerciseId}`);
  }

  getNextUnreadExercise(completedOverride = null) {
      const state = window.StateManager.getState();
      const completed = completedOverride || (state.reading && state.reading.completedExercises) || [];
      let pool = this.getExercises("all");
      let unread = pool.filter(e => !completed.includes(e.id));

      // 🚨 SR.4: Alerta de Escassez de Repertório (Menos de 15 peças inéditas restantes)
      if (unread.length > 0 && unread.length < 15) {
          if (window.App && window.App.showToast) {
              window.App.showToast(`⚠️ Atenção: Restam apenas ${unread.length} peças inéditas no seu acervo de leitura!`, "warn");
          }
      }

      // Se zerar o acervo, reinicia a esteira (segurança contra travamentos)
      if (unread.length === 0) {
          unread = pool;
      }

      // Retorna a próxima peça inédita sequencial direta da esteira
      const nextPiece = unread[0] || pool[0];
      
      // 🛡️ Segurança antiqueda se o banco estiver vazio ou corrompido
      if (!nextPiece && window.PianoDatabase?.sightReading?.pieces) {
          return window.PianoDatabase.sightReading.pieces[0];
      }
      return nextPiece;
  }

  startAnalysisTimer() {
    if (this._isAnalysisTimerRunning) return;
    this._isAnalysisTimerRunning = true;
    this.isAnalysisActive = true;
    
    if (this._analysisTimerInterval) clearInterval(this._analysisTimerInterval);
    
    window.StateManager.setState(prev => ({ ...prev }), "START_READING_ANALYSIS");
    this._analysisTimerInterval = setInterval(() => {
      this._analysisSecondsRemaining--;
      this.updateAnalysisTimerDisplay();
      if (this._analysisSecondsRemaining <= 0) {
        this.stopAnalysisTimer();
        if (window.AudioTools) window.AudioTools.playHitSound();
        this.goToExecutionPhase();
      }
    }, 1000);
  }
  stopAnalysisTimer() {
    if (this._analysisTimerInterval) {
      clearInterval(this._analysisTimerInterval);
      this._analysisTimerInterval = null;
    }
    this._isAnalysisTimerRunning = false;
    this.isAnalysisActive = false;
  }
  updateAnalysisTimerDisplay() {
        const el = document.getElementById("analysisTimerDisplay");
        if (el) {
            el.textContent = `00:${String(Math.max(0, this._analysisSecondsRemaining)).padStart(2, '0')}`
        }
    }

    // Gerenciador de Áudio de Acompanhamento (Dueto do Professor) em Segundo Plano
    toggleDuetAudio() {
        const currentEx = this.getExerciseById(this.selectedExerciseId);
        // Se a peça não tiver áudio de dueto cadastrado no banco, usamos um gerador de click de contagem ou ignoramos
        const duetId = currentEx.duetAudioId || currentEx.driveId; 
        
        if (!duetId) {
            if (window.App && window.App.showToast) window.App.showToast("⚠️ Esta peça não possui áudio de dueto cadastrado.", "warn");
            return;
        }

        if (this.duetAudio && !this.duetAudio.paused) {
            this.duetAudio.pause();
            this.updateDuetButtonUI(false);
        } else {
            if (!this.duetAudio) {
                const audioUrl = `https://lh3.googleusercontent.com/d/${duetId}`;
                this.duetAudio = new Audio(audioUrl);
                this.duetAudio.loop = false;
                
                // Trata o fim do áudio para restaurar o botão visualmente
                this.duetAudio.onended = () => this.updateDuetButtonUI(false);
            }
            
            // Sincroniza a velocidade de reprodução com o slider se aplicável (mielinização lenta)
            const speedInput = document.getElementById("duetSpeedInput");
            if (speedInput && this.duetAudio) {
                this.duetAudio.playbackRate = parseFloat(speedInput.value) || 1.0;
            }

            this.duetAudio.play()
                .then(() => this.updateDuetButtonUI(true))
                .catch(err => {
                    console.warn("Erro ao reproduzir áudio do drive:", err);
                    if (window.App && window.App.showToast) window.App.showToast("❌ Falha ao carregar áudio. Toque no metrônomo manual!", "error");
                });
        }
  }

  updateDuetButtonUI(isPlaying) {
        const btn = document.getElementById("btnToggleDuet");
        if (btn) {
            btn.innerHTML = isPlaying ? "⏸️ Pausar Dueto" : "👥 Tocar Dueto (Professor)";
            btn.style.background = isPlaying ? "var(--accent)" : "rgba(139, 92, 246, 0.2)";
        }
  }

  goToExecutionPhase() {
        this.stopAnalysisTimer();
        this.currentPhase = "execution";
        this.isAnalysisActive = false;

        // Limpa instâncias de áudio anteriores antes de iniciar uma nova execução
        if (this.duetAudio) {
            this.duetAudio.pause();
            this.duetAudio = null;
        }

        // Atualiza o estado global para manter o Modo Foco ativo na Fase 2
        window.StateManager.setState(prev => ({ ...prev }), "GOTO_READING_EXECUTION");

        if (window.AudioTools) {
            window.AudioTools.requestWakeLock();
            window.AudioTools.stopMetronome();
        }
        this.renderUI(window.StateManager.getState());
  }

  evaluateExecution(outcome) {
      if (window.AudioTools) {
          window.AudioTools.stopMetronome();
          window.AudioTools.releaseWakeLock();
      }
      if (this.duetAudio) {
          this.duetAudio.pause();
          this.duetAudio = null;
      }
      this.lastEvaluation = outcome;
      if (outcome !== "fluent") {
          this.currentPhase = "summary"; // Transição imperativa estrita para evitar UI Lock
      }
      const currentEx = this.getExerciseById(this.selectedExerciseId);
      const xpGain = this.calculateWeightedXp(outcome);
      if (outcome === "fluent") {
          if (window.AudioTools) window.AudioTools.playHitSound();
          if (window.App && window.App.showToast) {
              window.App.showToast(`🟢 Leitura Fluida! Pulso contínuo mantido (+${xpGain} XP).`, "success");
          }
          this.finalizeAndAdvance(currentEx, xpGain, outcome);
      } else {
          if (window.AudioTools) window.AudioTools.playMissSound();
          this.renderUI(window.StateManager.getState());
      }
  }

  toggleDifficultyTag(tag) {
        if (!this.multiSelectMode) {
            // MODO 1-CLIQUE (Rápido): Define este erro como principal e fecha o ciclo na hora!
            this.selectedTags = [tag];
            const xpGain = this.calculateWeightedXp(this.lastEvaluation);
            this.finalizeAndAdvance(null, xpGain, this.lastEvaluation);
        } else {
            // MODO MULTI-SELEÇÃO: Permite acumular erros antes de avançar
            if (this.selectedTags.includes(tag)) {
                this.selectedTags = this.selectedTags.filter(t => t !== tag);
            } else {
                this.selectedTags.push(tag);
            }
            this.renderUI(window.StateManager.getState());
        }
  }


  finalizeAndAdvance(currentEx = null, xp = 10, outcome = "fluent") {
    const ex = currentEx || this.getExerciseById(this.selectedExerciseId);
    const state = window.StateManager.getState();
    const readingState = state.reading || {};
    const completedList = readingState.completedExercises || [];
    const newCompleted = [...new Set([...completedList, ex.id])];
    const tagSummary = this.selectedTags.length > 0 ? this.selectedTags.join(", ") : "Gargalo Motor";

    const historyEntry = {
      date: new Date().toLocaleDateString('sv-SE'),
      type: "Leitura à 1ª Vista",
      pieceId: `Primer [${ex.collection}]: ${ex.title}`,
      trechoId: outcome === "fluent" ? "Fluido (Sem Paradas)" : `Hesitação: ${tagSummary}`,
      durationMinutes: 3,
      accuracyPct: outcome === "fluent" ? 100 : (outcome === "hesitated" ? 75 : 40),
      manualOffline: false
    };

    // 🛡️ CORREÇÃO DE RACE-CONDITION: Passamos newCompleted diretamente para evitar re-leitura do mesmo exercício
    const nextEx = this.getNextUnreadExercise(newCompleted);
    this.selectedExerciseId = nextEx.id;
    this.currentPhase = "analysis";

    window.StateManager.setState(prev => ({
      xp: (prev.xp || 0) + xp,
      dailyStats: {
        ...prev.dailyStats,
        readingMinutes: (prev.dailyStats.readingMinutes || 0) + 3,
        focusMinutes: (prev.dailyStats.focusMinutes || 0) + 3
      },
      weeklyGoals: {
        ...prev.weeklyGoals,
        readingDoneCount: (prev.weeklyGoals.readingDoneCount || 0) + 1,
        readingPct: Math.min(100, Math.round((((prev.weeklyGoals.readingDoneCount || 0) + 1) / (prev.weeklyGoals.readingTotalCount || 5)) * 100))
      },
      reading: {
        ...(prev.reading || {}),
        currentExerciseId: nextEx.id,
        completedExercises: newCompleted
      },
      history: [historyEntry, ...(prev.history || [])]
    }), `FINISH_READING_${ex.id}`);

    if (window.App && window.App.showToast) {
      window.App.showToast(`📖 Exercício concluído! Avançando para o inédito: ${nextEx.title}`, "info");
    }
    this.renderUI(window.StateManager.getState());
  }

  renderUI(state) {
    const container = document.getElementById("readingContainer");
    if (!container) return;

    const readingState = state.reading || {};
    const currentEx = this.getExerciseById(this.selectedExerciseId);
    
    // Puxa o nome do arquivo que já está escrito no title
    const filename = currentEx.filename || currentEx.title;
    const scoreImgUrl = filename ? `assets/scores/leitura/${filename}` : "";
    
    const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;
    const selectionMode = readingState.selectionMode || "mix";
    const currentBook = readingState.currentBook || "all";
    const completedExercises = readingState.completedExercises || [];
    const completedCount = completedExercises.length;

    // 🏆 GERADOR DE CONQUISTAS DINÂMICO (Fricção Zero)
    let readingPatente = "Iniciante das Teclas Pretas 🐾";
    if (completedCount >= 10) readingPatente = "Explorador da Pauta Única 🧭";
    if (completedCount >= 30) readingPatente = "Mestre do Grand Staff 🎼";
    if (completedCount >= 100) readingPatente = "Lenda do Sight-Reading 👑";

    const earnedMedals = [];
    const tecCount = completedExercises.filter(id => id.startsWith("tec-")).length;
    if (tecCount >= 5) earnedMedals.push("🏅 Mãos de Aço");
    const classicsCount = completedExercises.filter(id => id.startsWith("cla-") || id.startsWith("per-")).length;
    if (classicsCount >= 5) earnedMedals.push("🌟 Destaque do Recital");
    const natalCount = completedExercises.filter(id => id.includes("natal_") || id.startsWith("nat-")).length;
    if (natalCount >= 5) earnedMedals.push("🎄 Espírito Natalino");

    // 🧠 STATUS COGNITIVO SEMANAL
    const weeklyErrors = this.getWeeklyErrorCount();
    const isCoasting = weeklyErrors < 5;
    const cognitiveModeHtml = isCoasting 
        ? `<div style="font-size: 0.62rem; color: #60a5fa; margin-top: 4px; display: flex; align-items: center; gap: 4px;">🐾 Coasting (${weeklyErrors}/5 erros na semana • XP Travado em 1x)</div>`
        : `<div style="font-size: 0.62rem; color: var(--warn); margin-top: 4px; display: flex; align-items: center; gap: 4px;">🔥 Modo Fronteira (${weeklyErrors} erros na semana • XP Ponderado Ativo!)</div>`;

    // FASE 3: DIAGNÓSTICO RÁPIDO DE GARGALOS
    if (this.currentPhase === "summary") {
        const tags = [
            "⚡ Salto Não Calculado",
            "♯/♭ Acidente Ocorrente",
            "⏱️ Síncope / Quiáltera",
            "👀 Perdi os Olhos da Partitura",
            "🖐️ Dedilhado Conflitante",
            "🎼 Clave Inesperada",
            "🤷 Outro Erro não Listado"
        ];
        
        const isMulti = this.multiSelectMode;

        container.innerHTML = `
        <div style="background: var(--card2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: left;">
            <h3 style="color: var(--warn); font-size: 1.15rem; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span>⚠️ Diagnóstico de Gargalo de Leitura</span>
                <span style="font-size: 0.72rem; background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 4px 8px; border-radius: 6px; font-weight: bold; text-transform: uppercase;">
                    ${this.lastEvaluation === "hesitated" ? "Hesitação" : "Colapso"}
                </span>
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                O que causou a quebra do pulso rítmico em <em>${currentEx.title}</em>?
            </p>

            <!-- Interruptor do Modo Multi-Seleção -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.4); padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; border: 1px dashed var(--border);">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.78rem; font-weight: bold; color: #fff;">📋 Registrar múltiplos erros?</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">Ative se tiver cometido mais de uma falha nesta tentativa</span>
                </div>
                <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                    <input type="checkbox" ${isMulti ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" 
                            onclick="window.ReadingManager.multiSelectMode = this.checked; window.ReadingManager.renderUI(window.StateManager.getState());">
                    <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #334155; transition: .3s; border-radius: 34px; ${isMulti ? 'background-color: #10b981;' : ''}">
                        <span style="position: absolute; content: ''; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; ${isMulti ? 'transform: translateX(22px);' : ''}"></span>
                    </span>
                </label>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px;">
                ${tags.map(t => {
                    const isSel = this.selectedTags.includes(t);
                    const badgeIcon = isMulti ? (isSel ? '✅' : '⬜') : '⚡';
                    const btnStyle = isMulti 
                        ? (isSel ? 'background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981;' : 'background: #0f172a; border-color: #334155; color: #cbd5e1;')
                        : 'background: #0f172a; border-color: #334155; color: #cbd5e1; cursor: pointer; transition: 0.2s;';
                    
                    return `
                        <button class="btn btn-outline" style="display: flex; justify-content: space-between; align-items: center; text-align: left; font-size: 0.8rem; padding: 12px 16px; border-radius: 10px; width: 100%; margin-top:0; ${btnStyle}" 
                                data-action="toggle-reading-tag" data-tag="${t}"
                                onmouseover="if(!${isMulti}) { this.style.borderColor='var(--accent)'; this.style.background='rgba(139, 92, 246, 0.05)'; }"
                                onmouseout="if(!${isMulti}) { this.style.borderColor='#334155'; this.style.background='#0f172a'; }">
                            <span>${t}</span>
                            <span style="font-size: 0.85rem;">${badgeIcon}</span>
                        </button>
                    `;
                }).join('')}
            </div>

            ${isMulti ? `
                <button class="btn btn-primary" style="padding: 14px; font-weight: 700; width: 100%; margin-top: 10px; background: #10b981; border-color: #10b981;" data-action="confirm-reading-summary">
                    Salvar Todos e Avançar para o Próximo Inédito →
                </button>
            ` : `
                <div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); margin-top: 10px; font-style: italic;">
                    💡 Toque em qualquer uma das falhas acima para salvar e avançar instantaneamente!
                </div>
                `}
            </div>
        `;
        return;
    }


    // FASE 2: EXECUÇÃO SPLIT-VIEW (Canvas 70% + Sidebar 30%)
    if (this.currentPhase === "execution") {
      container.innerHTML = `
        <div class="split-view-container">
          <!-- Coluna Esquerda: Canvas de Partitura 70% -->
          <div class="split-left">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
              <div>
                <span class="badge accent2" style="font-size: 0.72rem;">Fase 2: Execução One-Shot</span>
                <h3 style="margin: 4px 0 0; font-size: 1.15rem; color: #fff;">${currentEx.title}</h3>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                Tonalidade: <strong style="color: #fff;">${currentEx.key}</strong> • Compasso: <strong style="color: #fff;">${currentEx.timeSig}</strong> • Mãos: <strong style="color: #fff;">${currentEx.hand}</strong>
              </div>
            </div>
            <div class="score-container skeleton-pulse" style="min-height: 240px; max-height: 520px; background: #0e1626; border-radius: 14px; border: 1px solid var(--border); padding: 12px; display: flex; align-items: center; justify-content: center;">
              ${scoreImgUrl ? `
                <img src="${scoreImgUrl}" alt="Partitura Primer" class="sheet-paper-effect" style="max-height: 480px; max-width: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" data-action="open-lightbox-trecho" data-src="${scoreImgUrl}" data-title="${currentEx.title}">
              ` : `
                <div style="color: var(--text-muted); font-size: 0.85rem;">[Carregando Partitura ${currentEx.title}...]</div>
              `}
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 8px 12px; margin-top: 10px; font-size: 0.78rem; color: #93c5fd; text-align: center;">
              🎯 <strong>Regra de Ouro da Leitura:</strong> Toque até o fim sem parar para corrigir notas erradas. O pulso do metrônomo é soberano!
            </div>
          </div>

          <!-- Coluna Direita: Sidebar Fixa 30% -->
          <div class="split-right">
            <!-- Metrônomo Soberano com LED de Pulso Luminoso -->
                        <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700;">METRÔNOMO</span>
                                <div class="metro-led" style="width: 12px; height: 12px; border-radius: 50%; background: #334155;"></div>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 8px;">
                                <button class="btn btn-reset" style="padding: 4px 8px; font-size: 0.72rem;" data-action="delta-reading-bpm" data-delta="-5">-5</button>
                                <button class="btn btn-reset" style="padding: 4px 8px; font-size: 0.72rem;" data-action="delta-reading-bpm" data-delta="-1">-1</button>
                                <input type="number" id="readingBpmInput" class="form-control" value="${this.currentBpm}" style="width: 58px; padding: 4px; text-align: center; font-weight: 800; font-size: 0.95rem;" data-action="change-reading-bpm">
                                <button class="btn btn-reset" style="padding: 4px 8px; font-size: 0.72rem;" data-action="delta-reading-bpm" data-delta="1">+1</button>
                                <button class="btn btn-reset" style="padding: 4px 8px; font-size: 0.72rem;" data-action="delta-reading-bpm" data-delta="5">+5</button>
                            </div>
                            <button id="btnReadingMetro" class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="width: 100%; padding: 10px; font-size: 0.82rem;" data-action="toggle-reading-metro">
                                ${isMetroOn ? '⏸ Parar' : '▶ Ligar (M)'}
                            </button>
                        </div>

                        <!-- Acompanhamento: Dueto do Professor -->
                        <div class="card" style="padding: 12px; background: var(--card2); margin-top: 10px; margin-bottom: 10px;">
                            <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 6px;">ACOMPANHAMENTO</span>
                            <button id="btnToggleDuet" class="btn" style="width: 100%; padding: 10px; font-size: 0.82rem; background: rgba(139, 92, 246, 0.15); border: 1px solid var(--accent); color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; transition: 0.2s;" data-action="toggle-duet-audio">
                                👥 Tocar Dueto (Professor)
                            </button>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px;">
                                <span style="font-size: 0.7rem; color: var(--text-muted);">Velocidade:</span>
                                <select id="duetSpeedInput" style="padding: 4px; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: #fff; font-size: 0.72rem;" onchange="if (window.ReadingManager && window.ReadingManager.duetAudio) { window.ReadingManager.duetAudio.playbackRate = parseFloat(this.value); }">
                                    <option value="0.8">0.8x (Treino Lento)</option>
                                    <option value="0.9">0.9x</option>
                                    <option value="1.0" selected>1.0x (Tempo Real)</option>
                                </select>
                            </div>
                        </div>

              <!-- Avaliação de Continuidade -->
              <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
              <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 6px;">AVALIAÇÃO ONE-SHOT</span>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <button class="btn-audit btn-audit-hit" style="padding: 12px 8px; font-size: 0.82rem;" data-action="eval-reading-fluent">
                  🟢 Fluido (+15 XP)<br><small style="font-weight:400;">Pulso rítmico mantido</small>
                </button>
                <button class="btn-audit btn-audit-slip" style="padding: 12px 8px; font-size: 0.82rem;" data-action="eval-reading-hesitated">
                  🟡 Quebrei o Pulso (+8 XP)<br><small style="font-weight:400;">Hesitei / Parei</small>
                </button>
                <button class="btn-audit btn-audit-miss" style="padding: 12px 8px; font-size: 0.82rem;" data-action="eval-reading-collapsed">
                  🔴 Desmoronou (+3 XP)<br><small style="font-weight:400;">Perdi a posição</small>
                </button>
              </div>
            </div>
            
            <!-- Botão de Abandono Seguro para Focus Lock (Meta 1.5) -->
            <button class="btn btn-reset" style="width: 100%; margin-top: 10px; border: 1px solid var(--danger); background: rgba(239, 68, 68, 0.05); color: var(--danger); padding: 10px; font-weight: 700; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" data-action="exit-reading">
              ❌ Sair / Abandonar Leitura
            </button>
          </div>
        </div>
      `;
      return;
    }

    // FASE 1: ANÁLISE RELÂMPAGO (Escaneamento Ocular de 30s)
    const currentList = this.getExercises("all"); // 🌟 Força uso do acervo completo (Esteira Infinita)
    const totalInPool = currentList.length; // Quantidade de peças 100% dinâmica do acervo ativo
    const isTimerRunning = this._isAnalysisTimerRunning; // 🛡️ BUGFIX: Aterramento no escopo da classe
    container.innerHTML = `
        <div class="split-view-container">
          <!-- Coluna Esquerda: Canvas de Partitura 70% (🌟 Visível na Pré-Leitura Ocular!) -->
          <div class="split-left">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div>
                    <span class="badge info" style="font-size: 0.72rem;">Fase 1: Escaneamento Ocular (30s)</span>
                    <h3 style="margin: 4px 0 0; font-size: 1.15rem; color: #fff;">${currentEx.title}</h3>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    Tonalidade: <strong style="color: #fff;">${currentEx.key}</strong> • Compasso: <strong style="color: #fff;">${currentEx.timeSig}</strong> • Mãos: <strong style="color: #fff;">${currentEx.hand}</strong>
                </div>
            </div>
            <div class="score-container skeleton-pulse" style="min-height: 240px; max-height: 520px; background: #0e1626; border-radius: 14px; border: 1px solid var(--border); padding: 12px; display: flex; align-items: center; justify-content: center;">
                ${scoreImgUrl ? `
                    <img src="${scoreImgUrl}" alt="Partitura Primer" class="sheet-paper-effect" style="max-height: 480px; max-width: 100%; object-fit: contain; cursor: zoom-in; opacity: 0; transition: opacity 0.3s;" 
                          onload="this.style.opacity=1; this.parentElement.classList.remove('skeleton-pulse');" 
                          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'; this.parentElement.classList.remove('skeleton-pulse');"
                          data-action="open-lightbox-trecho" data-src="${scoreImgUrl}" data-title="${currentEx.title}">
                    <div style="display:none; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--text-muted); font-size:0.85rem; padding:20px; text-align:center; height: 100%;">
                        <div style="font-size:2rem;">🎼</div>
                        <div><strong>[Partitura Offline / Modo Protegido]</strong></div>
                        <div style="font-size:0.75rem; max-width:320px; margin-top:4px;">
                            Tonalidade: <strong>${currentEx.key}</strong> • Compasso: <strong>${currentEx.timeSig}</strong> • Mãos: <strong>${currentEx.hand}</strong><br>
                            Abra o seu livro físico correspondente para manter o treino fluido!
                        </div>
                    </div>
                ` : `
                    <div style="color: var(--text-muted); font-size: 0.85rem;">[Carregando Partitura ${currentEx.title}...]</div>
                `}
            </div>
            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 10px; padding: 8px 12px; margin-top: 10px; font-size: 0.78rem; color: #c084fc; text-align: center;">
                👀 <strong>Não toque no piano ainda!</strong> Analise a partitura silenciosamente e prepare a mente.
            </div>
        </div>

    <!-- Coluna Direita: Controles de Análise e Trava de Foco 30% -->
        <div class="split-right">
            <!-- Painel de Conquistas de Leitura (Com Progresso Integrado) -->
            <div class="card" style="padding: 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <div>
                        <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; display: block; text-transform: uppercase; letter-spacing: 0.05em;">Patente de Leitura</span>
                        <strong style="color: var(--accent2); font-size: 0.82rem; display: block; margin-top: 1px;">${readingPatente}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; display: block; text-transform: uppercase; letter-spacing: 0.05em;">Progresso</span>
                        <strong style="color: var(--accent2); font-size: 0.82rem; display: block; margin-top: 1px;">${completedCount} / ${totalInPool}</strong>
                    </div>
                </div>
                ${cognitiveModeHtml}
                ${earnedMedals.length > 0 ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        ${earnedMedals.map(m => `<span style="font-size: 0.65rem; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #fff;">${m}</span>`).join('')}
                    </div>
                ` : ''}
            </div>

            <!-- Seletor Rápido de Exercício com Navegação Linear -->
            ${(() => {
                const lastId = completedCount > 0 ? completedExercises[completedCount - 1] : null;
                const lastExRaw = lastId ? this.getExerciseById(lastId) : null;
                const lastEx = (lastExRaw && !Array.isArray(lastExRaw)) ? lastExRaw : null;
                
                return `
                <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700;">SELECIONAR PEÇA</span>
                        ${lastEx ? `<span style="font-size: 0.65rem; color: var(--accent); background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.2);">Última: ${lastEx.title}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem; flex-shrink: 0;" data-action="prev-reading-exercise" ${isTimerRunning ? 'disabled' : ''}>◀</button>
                        <select id="readingExerciseSelect" class="form-control" style="font-size: 0.78rem; padding: 6px; width: 100%;" data-action="change-reading-exercise" ${isTimerRunning ? 'disabled' : ''}>
                            ${currentList.map(e => `
                                <option value="${e.id}" ${e.id === currentEx.id ? 'selected' : ''}>
                                    ${e.title} (${e.key})
                                </option>
                            `).join('')}
                        </select>
                        <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem; flex-shrink: 0;" data-action="next-reading-exercise" ${isTimerRunning ? 'disabled' : ''}>▶</button>
                    </div>
                </div>
                `;
            })()}

            <!-- Cronômetro de Análise Ocular -->
            <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 1.1rem;">⏱️</span>
                        <div id="analysisTimerDisplay" style="font-family: monospace; font-size: 1.25rem; font-weight: 800; color: var(--accent);">00:30</div>
                    </div>
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.76rem; width: auto; margin-top: 0;" data-action="start-reading-analysis">
                        ${isTimerRunning ? 'Analisando...' : '▶ Iniciar'}
                    </button>
                </div>
            </div>

            <!-- Trilha Ocular de 3 Pontos (Interativa) -->
            <div class="card" style="padding: 12px; background: var(--card2); margin-bottom: 0; text-align: left;">
                <strong style="color: var(--accent2); font-size: 0.76rem; display: block; margin-bottom: 6px;">
                    👀 CHECKLIST DE ANÁLISE OCULAR:
                </strong>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.76rem; color: #cbd5e1;">
                    <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;">
                        <input type="checkbox" style="margin-top: 2px;" onclick="this.nextElementSibling.style.textDecoration = this.checked ? 'line-through' : 'none';">
                        <span>1. Clave & Armadura: acidentes (${currentEx.key})</span>
                    </label>
                    <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;">
                        <input type="checkbox" style="margin-top: 2px;" onclick="this.nextElementSibling.style.textDecoration = this.checked ? 'line-through' : 'none';">
                        <span>2. Compasso & Ritmo: métrica (${currentEx.timeSig})</span>
                    </label>
                    <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;">
                        <input type="checkbox" style="margin-top: 2px;" onclick="this.nextElementSibling.style.textDecoration = this.checked ? 'line-through' : 'none';">
                        <span>3. Mãos no ar: posição inicial (${currentEx.hand})</span>
                    </label>
                </div>
            </div>

            <!-- Ação Principal de Transição -->
            <button class="btn btn-guided-main" style="padding: 12px; font-size: 0.85rem; width: 100%; margin-top: 6px; font-weight: bold;" data-action="skip-analysis-to-exec">
                ▶️ IR PARA EXECUÇÃO ONE-SHOT
            </button>

            <!-- Abandono Seguro -->
            <button class="btn btn-reset" style="width: 100%; border: 1px solid var(--danger); background: rgba(239, 68, 68, 0.05); color: var(--danger); padding: 10px; font-weight: 700; border-radius: 8px; cursor: pointer; font-size: 0.78rem; margin-top: 6px;" data-action="exit-reading">
                ❌ Abandonar Leitura
            </button>
        </div>
    </div>
    `;
    }
}

window.ReadingManager = new ReadingManagerClass();
