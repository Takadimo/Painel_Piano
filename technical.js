/**
 *  technical.js - Gerenciador do Pilar Técnico, CRUD Dinâmico, Granulação dos 12 Tons & Laboratório de Calibração
 *  Painel de Estudos de Piano — Versão 15.1.0 (Consolidada)
 *  Aluno: Leonardo Moura | Data: 29/08/2026
 *  Responsabilidades:
 *      * Reestruturação em 3 seções organizacionais: [⚡ Ativos (Foco)], [✅ Já Estudados / Estabilizados no Ciclo] e [🌱 Próximos Elementos (Backlog / Fila de Estudo)]
 *      * Granularidade rica de subelementos (1ª, 2ª e 3ª inversões de arpejos, cadências nos 12 tons, escalas russas e contrárias, mãos separadas/juntas)
 *      * Laboratório de Calibração Técnica (UTI Técnica): Microciclos de 3 a 5 dias para inibição de vícios motores
 *      * Cronometragem em tempo real de prática técnica com rateio automático nas metas diárias e semanais
 *      * Calibração de andamento adaptativa (+2 / 0 / -4 BPM)
 *  Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class TechnicalManagerClass {
    constructor() {
        this.utiList = [];
        this._timerInterval = null;
        this._secondsElapsed = 0;
        this._isRunning = false;
        this._currentItem = null;
        this._currentCategory = null;
        try {
            const cachedUti = localStorage.getItem("piano_uti_list");
            if (cachedUti) {
                this.utiList = JSON.parse(cachedUti);
            }
        } catch (e) {
            console.error("[TechnicalManager] Erro ao carregar UTI List cache:", e);
        }
    }

    _saveCache() {
        try {
            localStorage.setItem("piano_uti_list", JSON.stringify(this.utiList));
        } catch (e) {
            console.error("[TechnicalManager] Erro ao salvar UTI List cache:", e);
        }
    }

    addCustomExercise(category, title, desc, bpm = 60, targetBpm = 80, tone = "Custom", status = "active") {
        if (!title || !title.trim()) return;
        
        const state = window.StateManager.getState();
        const currentList = (state.technical && state.technical[category]) ? [...state.technical[category]] : [];
        
        const newItem = {
            id: `${category.substring(0,1)}-custom-${Date.now()}`,
            title: title.trim(),
            desc: desc || "Exercício Técnico Personalizado",
            bpm: parseInt(bpm, 10) || 60,
            targetBpm: parseInt(targetBpm, 10) || 80,
            totalMinutes: 0,
            tone: tone,
            trainedToday: false,
            status: status
        };

        currentList.push(newItem);
        
        const updatedTechnical = Object.assign({}, state.technical);
        updatedTechnical[category] = currentList;

        window.StateManager.setState({ technical: updatedTechnical }, `ADD_CUSTOM_TECH_${category.toUpperCase()}`);
        
        if (window.App && window.App.showToast) {
            window.App.showToast(`🌱 Novo fundamento adicionado em ${category === 'scales' ? 'Escalas' : (category === 'arpeggios' ? 'Arpejos' : 'Cadências')}!`, "success");
        }
        
        this.renderUI(window.StateManager.getState());
    }

    removeCustomExercise(category, itemId) {
        if (!confirm("Deseja realmente remover este fundamento técnico?")) return;
        
        const state = window.StateManager.getState();
        const currentList = (state.technical && state.technical[category]) ? [...state.technical[category]] : [];
        const filteredList = currentList.filter(item => item.id !== itemId);
        
        const updatedTechnical = Object.assign({}, state.technical);
        updatedTechnical[category] = filteredList;
        window.StateManager.setState({ technical: updatedTechnical }, `REMOVE_TECH_${itemId}`);
        
        if (window.App && window.App.showToast) {
            window.App.showToast("🗑️ Fundamento técnico removido.", "info");
        }
        
        this.renderUI(window.StateManager.getState());
    }

    toggleTechStatus(category, itemId) {
        const state = window.StateManager.getState();
        const list = (state.technical && state.technical[category]) ? [...state.technical[category]] : [];
        const itemIdx = list.findIndex(ex => ex.id === itemId);
        if (itemIdx === -1) return;
        
        const currentStatus = list[itemIdx].status || "active";
        list[itemIdx].status = currentStatus === "active" ? "queue" : "active";
        
        const updatedTechnical = Object.assign({}, state.technical);
        updatedTechnical[category] = list;
        window.StateManager.setState({ technical: updatedTechnical }, `TOGGLE_TECH_STATUS_${itemId}`);
        this.renderUI(window.StateManager.getState());
    }

    editTechSubtasks(category, itemId) {
        const state = window.StateManager.getState();
        const list = (state.technical && state.technical[category]) ? [...state.technical[category]] : [];
        const itemIdx = list.findIndex(ex => ex.id === itemId);
        if (itemIdx === -1) return;
        
        const currentSubtasks = list[itemIdx].subtasks || [];
        const currentStr = currentSubtasks.join(", ");
        
        const newStr = prompt(`Edite as granularidades (fatias) separadas por vírgula:\nDeixe em branco para limpar.`, currentStr);
        if (newStr !== null) {
            const newSubtasks = newStr.split(",").map(s => s.trim()).filter(s => s.length > 0);
            list[itemIdx].subtasks = newSubtasks;
            
            const updatedTechnical = Object.assign({}, state.technical);
            updatedTechnical[category] = list;
            window.StateManager.setState({ technical: updatedTechnical }, `EDIT_TECH_SUBTASKS_${itemId}`);
            this.renderUI(window.StateManager.getState());
        }
    }

    // 🎯 ACTIVATE FOCUS DIRECT: Eleição de Tonalidades e Rotação do Círculo de Quintas
    activateFocusDirect(category, itemId) {
        const state = window.StateManager.getState();
        const list = (state.technical && state.technical[category]) ? [...state.technical[category]] : [];
        let affectedItem = null;

        const updated = list.map(item => {
            if (item.id === itemId) {
                affectedItem = item;
                const nextStatus = item.status === "active" ? "queue" : "active";
                return Object.assign({}, item, { status: nextStatus });
            }
            return item;
        });

        const updatedTechnical = Object.assign({}, state.technical);
        updatedTechnical[category] = updated;

        window.StateManager.setState({ technical: updatedTechnical }, `ACTIVATE_FOCUS_DIRECT_${itemId}`);

        if (window.App && window.App.showToast && affectedItem) {
            const isNowActive = affectedItem.status !== "active"; // Invertido porque pegamos o estado pré-mutado
            window.App.showToast(isNowActive ? `🎯 "${affectedItem.title}" definido como Foco Ativo!` : `🌱 "${affectedItem.title}" movido para o Backlog.`, "success");
        }

        // Re-renderiza a Aba Técnica
        this.renderUI(window.StateManager.getState());
        
        // 🔄 Atualiza síncronamente o Círculo de Quintas e o próprio painel da Gaveta
        if (window.ChartsManager) {
            window.ChartsManager.renderCircleOfFifths(window.StateManager.getState());
            if (window.openCircleToneDrawer && affectedItem) {
                window.openCircleToneDrawer(affectedItem.tone);
            }
        }
    }

    startExercisePractice(category, itemId) {
        const state = window.StateManager.getState();
        const list = (state.technical && state.technical[category]) || [];
        const item = list.find(i => i.id === itemId);
        if (!item) return;
        this._currentItem = item;
        this._currentCategory = category;
        this._secondsElapsed = 0;
        this.startTimer();
        
        if (window.App && window.App.showToast) {
            window.App.showToast(`⚡ Praticando: ${item.title} (${item.bpm} BPM)`, "info");
        }
        if (window.AudioTools) window.AudioTools.playHitSound();
        this.renderUI(state);
    }
    startTimer() {
        if (this._isRunning) return;
        this._isRunning = true;
        
        if (window.AudioTools && typeof window.AudioTools.requestWakeLock === "function") {
            window.AudioTools.requestWakeLock();
        }
        if (this._timerInterval) clearInterval(this._timerInterval);
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
        if (window.AudioTools && typeof window.AudioTools.releaseWakeLock === "function") {
            window.AudioTools.releaseWakeLock();
        }
    }
    updateTimerDisplay() {
        const el = document.getElementById("techTimerDisplay");
        if (!el) return;
        const mins = Math.floor(this._secondsElapsed / 60);
        const secs = this._secondsElapsed % 60;
        el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    adjustActiveBpm(delta) {
        if (!this._currentItem) return;
        this._currentItem.bpm = Math.max(30, Math.min(260, this._currentItem.bpm + delta));
        const input = document.getElementById("activeTechBpmInput");
        if (input) input.value = this._currentItem.bpm;
        if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(this._currentItem.bpm);
    }

    toggleActiveMetro() {
        if (!this._currentItem) return;
        if (window.AudioTools) {
            if (window.AudioTools.metroIsOn) window.AudioTools.stopMetronome();
            else window.AudioTools.startMetronome(this._currentItem.bpm);
            this.renderUI(window.StateManager.getState());
        }
    }

    evaluatePractice(cleanStatus) {
        this.stopTimer();
        if (window.AudioTools) window.AudioTools.stopMetronome();
        if (!currentTechItem) return;

        let status = cleanStatus;
        if (status === true || status === "true") status = "clean";
        if (status === false || status === "false") status = "fail";

        const state = window.StateManager.getState();
        const minutesStudied = Math.max(1, Math.round(techTimerSeconds / 60));
        
        let promotedAnActive = false;
        let isSuccess = (status === "clean" || status === "wobbly");

const updatedCategoryList = state.technical[currentTechCategory].map(item => {
    if (item.id !== currentTechItem.id) return item;

    const newMinutes = (item.totalMinutes || 0) + minutesStudied;
    const targetBpm = parseInt(item.targetBpm, 10) || 80;
    
    let newBpm = item.bpm;
    let box = item.box ?? 1;
    let hits = item.consecutiveHits ?? 0;
    let nextStatus = item.status || "active";

    if (status === "clean") {
        newBpm = Math.min(targetBpm, item.bpm + 2);
        
        hits++;
        if (hits >= 3) { 
            box = Math.min(5, box + 1); 
            hits = 0; 
        }

        if (newBpm >= targetBpm) {
            nextStatus = "completed";
            promotedAnActive = true;
        }
    } else if (status === "fail") {
        newBpm = Math.max(30, item.bpm - 5);
        hits = 0;
        box = Math.max(1, box - 1);
    }

    return {
        ...item,
        totalMinutes: newMinutes,
        trainedToday: true,
        bpm: newBpm,
        box: box,
        consecutiveHits: hits,
        status: nextStatus
    };
});

    // Se o item ativo atingiu o BPM alvo e se estabilizou, promovemos o primeiro da fila (status 'queue') para active
    if (promotedAnActive) {
        const firstQueueIndex = updatedCategoryList.findIndex(item => item.status === "queue");
        if (firstQueueIndex !== -1) {
            updatedCategoryList[firstQueueIndex] = Object.assign({}, updatedCategoryList[firstQueueIndex], {
                status: "active"
            });
            if (window.App && window.App.showToast) {
                const nextItem = updatedCategoryList[firstQueueIndex];
                setTimeout(() => {
                    window.App.showToast(`🎓 O fundamento "${nextItem.title}" foi promovido do Backlog para Ativo!`, "success");
                }, 2000);
            }
        }
    }

    const updatedTechnical = Object.assign({}, state.technical);
    updatedTechnical[this._currentCategory] = updatedCategoryList;
    // 🛡️ Mutação Atômica Funcional: Previne ReferenceErrors e Race Conditions no Barramento
    window.StateManager.setState(prev => {
        const xpEarned = isSuccess ? 15 : 5;
        const prevDaily = prev.dailyStats || {};
        const prevWeekly = prev.weeklyGoals || {};
        const prevGlobal = prev.globalStats || {};
        return {
            technical: updatedTechnical,
            xp: (prev.xp || 0) + xpEarned,
            dailyStats: {
                ...prevDaily,
                technicalMinutes: (prevDaily.technicalMinutes || 0) + minutesStudied,
                focusMinutes: (prevDaily.focusMinutes || 0) + minutesStudied
            },
            weeklyGoals: {
                ...prevWeekly,
                technicalDoneMinutes: (prevWeekly.technicalDoneMinutes || 0) + minutesStudied
            },
            globalStats: {
                ...prevGlobal,
                totalMinutes: (prevGlobal.totalMinutes || 0) + minutesStudied
            },
            history: [
                {
                    date: new Date().toLocaleDateString('sv-SE'),
                    type: "Técnico",
                    pieceId: this._currentItem.title,
                    trechoId: this._currentItem.tone || "Fundamento",
                    durationMinutes: minutesStudied,
                    accuracyPct: isSuccess ? 100 : 70,
                    manualOffline: false
                },
                ...(prev.history || [])
            ]
        };
    }, `EVALUATE_TECH_PRACTICE_${isSuccess ? 'SUCCESS' : 'ADJUST'}`);
    // Feedback visual e sonoro
    if (window.AudioTools) {
        if (isSuccess) window.AudioTools.playHitSound();
        else window.AudioTools.playMissSound();
    }
    if (window.App && window.App.showToast) {
        let feedbackStr = "";
        if (isSuccess) {
            const finalBpm = Math.min(parseInt(this._currentItem.targetBpm, 10) || 80, this._currentItem.bpm + 2);
            if (finalBpm >= (parseInt(this._currentItem.targetBpm, 10) || 80)) {
                feedbackStr = `🎓 MATÉRIA CONCLUÍDA! Calibração estabilizada em ${this._currentItem.targetBpm} BPM! (+15 XP)`;
            } else {
                feedbackStr = `🔥 Concluído! +${minutesStudied}m. Calibração subiu para ${finalBpm} BPM. (+15 XP)`;
            }
        } else {
            feedbackStr = `⚠️ Ajuste aplicado. Andamento reduzido para ${Math.max(30, this._currentItem.bpm - 4)} BPM. (+5 XP)`;
        }
        window.App.showToast(feedbackStr, isSuccess ? "success" : "warn");
    }
    this._currentItem = null;
    this._currentCategory = null;
    this._secondsElapsed = 0;
    this.renderUI(window.StateManager.getState());
    }

    cancelPractice() {
        this.stopTimer();
        this._currentItem = null;
        this._currentCategory = null;
        this._secondsElapsed = 0;
        
        if (window.App && window.App.showToast) {
            window.App.showToast("Sessão técnica interrompida.", "info");
        }
        
        window.StateManager.setState({}, "CANCEL_TECH_PRACTICE");
    }

    addUtiCase(pieceId, pieceTitle, compassos, title, desc, targetDays = 5, targetBpm = 60) {
        const newCase = {
            id: `calib-${Date.now()}`,
            pieceId: pieceId || "custom",
            pieceTitle: pieceTitle || "Peça",
            compassos: compassos || "c. 1-4",
            title: title || "Gargalo Motor Isolado",
            desc: desc || "Tratamento de inibição motora e relaxamento",
            targetDays: parseInt(targetDays, 10) || 5,
            currentDay: 1,
            targetBpm: parseInt(targetBpm, 10) || 60,
            currentBpm: Math.max(30, (parseInt(targetBpm, 10) || 60) - 15),
            status: "em_tratamento"
        };

        this.utiList.push(newCase);
        this._saveCache();

        if (window.App && window.App.showToast) {
            window.App.showToast("🚨 Gargalo Motor enviado para a UTI Técnica (Calibração)!", "warn");
        }

        this.renderUI(window.StateManager.getState());
    }

    advanceUtiDay(utiId) {
        const item = this.utiList.find(u => u.id === utiId);
        if (!item) return;

        if (item.currentDay < item.targetDays) {
        item.currentDay++;
        
            // Fórmula linear adaptativa de ganho de andamento (BPM) ao longo dos dias do microciclo
            const totalSpan = item.targetBpm - (item.targetBpm - 15); // Sobe 15 BPM no total
            const step = Math.round(15 / Math.max(1, item.targetDays - 1));
            item.currentBpm = Math.min(item.targetBpm, item.currentBpm + step);

            if (window.App && window.App.showToast) {
                window.App.showToast(`📈 Dia ${item.currentDay}/${item.targetDays} calibrado! Andamento subiu para ${item.currentBpm} BPM.`, "success");
            }
            if (window.AudioTools) window.AudioTools.playHitSound();
        } else {
            if (window.App && window.App.showToast) {
                window.App.showToast("✨ Microciclo concluído! Este gargalo está pronto para receber alta.", "info");
            }
        }

        this._saveCache();
        this.renderUI(window.StateManager.getState());
    }

    dischargeUti(utiId) {
        if (confirm("Deseja concluir a Calibração Técnica deste gargalo? A passagem será reintegrada ao estudo regular.")) {
            this.utiList = this.utiList.filter(u => u.id !== utiId);
            this._saveCache();

            if (window.AudioTools) window.AudioTools.playHitSound();
            if (window.App && window.App.showToast) {
                window.App.showToast("🎓 Calibração concluída com sucesso! Passagem estabilizada.", "success");
            }
            this.renderUI(window.StateManager.getState());
        }
    }

    renderUI(state) {
        const container = document.getElementById("technicalContainer");
        const utiContainer = document.getElementById("utiContainer");
        
        if (!container && !utiContainer) return; // 🛡️ Guard clause contra execuções em árvores DOM inativas
        
        // 1. Renderização da UTI Técnica
        if (utiContainer) {
            if (this.utiList.length === 0) {
                utiContainer.innerHTML = `
                    <div style="background: var(--card2); border: 1px dashed var(--border); border-radius: 12px; padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
                        <span style="font-size: 1.5rem; display: block; margin-bottom: 8px;">🕊️ UTI Vazia</span>
                        Nenhuma passagem em calibração isolada. Suas conexões motoras estão saudáveis!
                    </div>
                `;
            } else {
                utiContainer.innerHTML = this.utiList.map(uti => {
                    const pct = Math.round((uti.currentDay / uti.targetDays) * 100);
                    const isDone = uti.currentDay >= uti.targetDays;
                    
                    return `
                        <div class="card" style="background: var(--card2); border: 1px solid ${isDone ? 'var(--accent2)' : 'var(--border)'}; border-radius: 12px; padding: 16px; margin-bottom: 12px; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div>
                                    <span class="badge warn" style="font-size: 0.65rem; padding: 2px 6px; text-transform: uppercase;">🚨 UTI TÉCNICA - DIA ${uti.currentDay}/${uti.targetDays}</span>
                                    <h4 style="margin: 6px 0 4px 0; color: #fff; font-size: 0.95rem;">${uti.title}</h4>
                                    <small style="color: var(--text-muted); display: block;">Peça: <strong>${uti.pieceTitle}</strong> | Seção: <code>${uti.compassos}</code></small>
                                </div>
                                <div style="text-align: right;">
                                    <span style="font-size: 1.1rem; font-weight: 800; color: var(--accent2); display: block;">${uti.currentBpm} <small style="font-size: 0.65rem; color: var(--text-muted);">BPM</small></span>
                                    <small style="color: var(--text-muted); font-size: 0.68rem;">Alvo: ${uti.targetBpm} BPM</small>
                                </div>
                            </div>
                            
                            <p style="margin: 8px 0; font-size: 0.82rem; color: #cbd5e1; line-height: 1.4;">${uti.desc}</p>
                            
                            <!-- Barra de Progresso de Dias -->
                            <div style="margin: 12px 0 14px 0;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px;">
                                    <span>Tratamento Motor</span>
                                    <span>${pct}% Completo</span>
                                </div>
                                <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 4px; overflow: hidden;">
                                    <div style="background: var(--accent2); width: ${pct}%; height: 100%; transition: width 0.3s ease;"></div>
                                </div>
                            </div>
                            
                            <!-- Botões de Ação da UTI -->
                            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
                                ${!isDone ? `
                                    <button class="btn btn-primary" style="font-size: 0.75rem; padding: 6px 12px; width: auto; background: var(--accent2);" data-action="advance-uti-day" data-id="${uti.id}">
                                        🚀 Avançar Dia
                                    </button>
                                ` : `
                                    <button class="btn btn-primary" style="font-size: 0.75rem; padding: 6px 12px; width: auto; background: #10b981;" data-action="discharge-uti" data-id="${uti.id}">
                                        🎓 Dar Alta (Concluir)
                                    </button>
                                `}
                                <button class="btn" style="font-size: 0.75rem; padding: 6px 12px; width: auto; border: 1px solid var(--border); background: transparent; color: var(--text-muted);" data-action="discharge-uti" data-id="${uti.id}">
                                    Descartar
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 2. Renderização da Central de Fundamentos Técnicos
        if (container) {
            const categories = {
                scales: "Escalas (Tons)",
                arpeggios: "Arpejos (Tétrades & Tríades)",
                cadences: "Cadências (Progressões)"
            };

            let activePracticeHtml = "";
            
            // Renderiza painel flutuante se houver uma prática ativa
            if (this._currentItem) {
                const isMetroOn = window.AudioTools ? window.AudioTools.metroIsOn : false;
                activePracticeHtml = `
                    <div class="card active-practice-card" style="background: var(--card-inner); border: 1px solid var(--purple); border-radius: 12px; padding: 16px; text-align: center; animation: fadeIn 0.3s ease; position: sticky; top: 10px; z-index: 100; margin-bottom: 24px;">
                        <span class="badge purple" style="font-size: 0.72rem; margin-bottom: 8px; display: inline-block;">⚡ PRÁTICA TÉCNICA AVULSA</span>
                        <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 1.2rem;">${this._currentItem.title}</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0; margin-bottom: 12px;">Tom: <strong>${this._currentItem.tone}</strong> | ${this._currentItem.desc}</p>

                        <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 16px;">
                            <div>
                                <small style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; display: block;">Cronômetro</small>
                                <span id="techTimerDisplay" style="font-size: 1.8rem; font-family: monospace; font-weight: 800; color: #fff;">${String(Math.floor(this._secondsElapsed / 60)).padStart(2, '0')}:${String(this._secondsElapsed % 60).padStart(2, '0')}</span>
                            </div>
                            <div>
                                <small style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; display: block;">Andamento</small>
                                <span style="font-size: 1.8rem; font-weight: 800; color: var(--accent2);">${this._currentItem.bpm} <small style="font-size: 0.8rem; color: var(--text-muted);">BPM</small></span>
                            </div>
                        </div>

                        <!-- Metrônomo Embutido -->
                        <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <button class="btn btn-reset" style="padding: 6px 12px; font-size: 0.85rem;" onclick="if(window.TechnicalManager) window.TechnicalManager.adjustActiveBpm(-5)">-5</button>
                            <input type="number" id="activeTechBpmInput" value="${this._currentItem.bpm}" style="width: 55px; text-align: center; font-weight: bold; background: transparent; border: none; color: #fff; font-size: 1.15rem;" readonly>
                            <button class="btn btn-reset" style="padding: 6px 12px; font-size: 0.85rem;" onclick="if(window.TechnicalManager) window.TechnicalManager.adjustActiveBpm(5)">+5</button>
                            <button class="btn ${isMetroOn ? 'btn-stop' : 'btn-start'}" style="padding: 8px 14px; font-size: 0.85rem; font-weight: bold; margin-left: 8px;" onclick="if(window.TechnicalManager) window.TechnicalManager.toggleActiveMetro()">
                                ${isMetroOn ? '⏸ Parar (M)' : '▶ Ligar (M)'}
                            </button>
                        </div>

                        <!-- Avaliação Direta -->
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button class="btn btn-primary" style="flex: 1; padding: 12px; background: #10b981; font-weight: 700; font-size: 0.85rem; border-radius: 8px;" onclick="if(window.TechnicalManager) window.TechnicalManager.evaluatePractice('clean')">
                                💚 Limpo (+2 BPM)
                            </button>
                            <button class="btn btn-outline" style="flex: 1; padding: 12px; border-color: #f59e0b; color: #f59e0b; font-weight: 700; font-size: 0.85rem; border-radius: 8px;" onclick="if(window.TechnicalManager) window.TechnicalManager.evaluatePractice('wobbly')">
                                💛 Oscilou (Manter)
                            </button>
                            <button class="btn btn-reset" style="flex: 1; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; font-weight: 700; font-size: 0.85rem; border-radius: 8px;" onclick="if(window.TechnicalManager) window.TechnicalManager.evaluatePractice('fail')">
                                ❌ Errei (-5 BPM)
                            </button>
                        </div>
                        <button class="btn btn-reset" style="width: 100%; margin-top: 12px; font-size: 0.75rem; color: var(--text-muted); background: transparent;" onclick="if(window.TechnicalManager) window.TechnicalManager.cancelPractice()">
                            ⏹ Cancelar Prática
                        </button>
                    </div>
                `;
            }

            let fullHtml = activePracticeHtml;

            // Renderiza as categorias uma a uma
            for (const [catId, catLabel] of Object.entries(categories)) {
                const list = (state.technical && state.technical[catId]) ? state.technical[catId] : [];
                
                const active = list.filter(item => item.status === "active" || !item.status);
                const queue = list.filter(item => item.status === "queue");
                const completed = list.filter(item => item.status === "completed" || item.status === "stabilized");

                fullHtml += `
                    <div class="technical-category-section" style="margin-bottom: 28px; background: #0b1120; border: 1px solid var(--border); border-radius: 16px; padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px;">
                            <h3 style="color: #fff; margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                                🎹 ${catLabel}
                                <span class="badge info" style="font-size: 0.65rem; background: rgba(59,130,246,0.15); color: #60a5fa;">${active.length} Foco</span>
                            </h3>
                            <button class="btn btn-primary" style="width: auto; padding: 6px 12px; font-size: 0.75rem; font-weight: 700;" data-action="add-tech-item-modal" data-category="${catId}">
                                ➕ Novo Fundamento
                            </button>
                        </div>

                        <!-- 1. ATIVOS (FOCO) -->
                        <div style="margin-bottom: 16px;">
                            <h5 style="color: var(--accent2); margin: 0 0 8px 0; font-size: 0.72rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">⚡ Ativos (Foco de Treino)</h5>
                            ${active.length === 0 ? `
                                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 8px;">Nenhum foco ativo nesta categoria.</p>
                            ` : active.map(item => `
                                <div class="card" style="background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong style="color: #fff; font-size: 0.88rem; display: block;">${item.title} ${item.trainedToday ? '✅' : ''}</strong>
                                        <small style="color: var(--text-muted); font-size: 0.75rem; display: block;">${item.desc} | Tom: <code>${item.tone || 'Custom'}</code></small>
                                        <small style="color: #94a3b8; font-size: 0.7rem; display: block; margin-top: 2px; margin-bottom: 4px;">Acumulado: <strong>${item.totalMinutes || 0} min</strong></small>
                                        ${(item.subtasks && item.subtasks.length > 0) ? `
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                                            ${item.subtasks.map(st => `<span style="background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px;">${st}</span>`).join('')}
                                        </div>` : ''}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="text-align: right;">
                                            <span style="font-size: 0.95rem; font-weight: 800; color: var(--accent2); display: block;">${item.bpm} <small style="font-size: 0.6rem; color: var(--text-muted);">BPM</small></span>
                                            <small style="color: var(--text-muted); font-size: 0.65rem;">Meta: ${item.targetBpm}</small>
                                        </div>
                                        <div style="display: flex; flex-direction: column; gap: 4px;">
                                            <button class="btn btn-outline" style="font-size: 0.65rem; padding: 4px 6px; width: auto; border-color: var(--warn); color: var(--warn);" data-action="toggle-tech-status" data-category="${catId}" data-id="${item.id}" title="Pausar / Enviar para Fila">⏸️ Fila</button>
                                            <button class="btn btn-outline" style="font-size: 0.65rem; padding: 4px 6px; width: auto; border-color: var(--accent); color: var(--accent);" data-action="edit-tech-subtasks" data-category="${catId}" data-id="${item.id}" title="Editar Granularidades">⚙️ Fatias</button>
                                        </div>
                                        <button class="btn btn-primary" style="font-size: 0.72rem; padding: 6px 12px; width: auto;" data-action="start-tech-exercise" data-category="${catId}" data-id="${item.id}">
                                            ▶ Praticar
                                        </button>
                                        ${item.id.includes('custom') ? `
                                            <button class="btn" style="font-size: 0.72rem; padding: 6px; width: auto; background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #f87171;" data-action="remove-tech-exercise" data-category="${catId}" data-id="${item.id}">
                                                🗑️
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- 2. ESTABILIZADOS / ESTUDADOS -->
                        ${completed.length > 0 ? `
                            <div style="margin-bottom: 16px;">
                                <h5 style="color: #10b981; margin: 0 0 8px 0; font-size: 0.72rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">✅ Ciclo Concluído / Estabilizados</h5>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px;">
                                    ${completed.map(item => `
                                        <div style="background: rgba(16,185,129,0.03); border: 1px solid rgba(16,185,129,0.15); border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <strong style="color: #cbd5e1; font-size: 0.8rem; display: block;">${item.title}</strong>
                                                <small style="color: var(--text-muted); font-size: 0.68rem; display: block;">${item.desc}</small>
                                            </div>
                                            <div style="text-align: right;">
                                                <span style="font-size: 0.85rem; font-weight: 800; color: #10b981; display: block;">${item.bpm} <small style="font-size: 0.55rem;">BPM</small></span>
                                                <small style="color: var(--text-muted); font-size: 0.6rem;">Meta: ${item.targetBpm}</small>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- 3. PRÓXIMOS PASSOS (BACKLOG) -->
                        ${queue.length > 0 ? `
                            <div>
                                <h5 style="color: var(--text-muted); margin: 0 0 8px 0; font-size: 0.72rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">🌱 Próximos Elementos (Fila / Backlog)</h5>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px;">
                                    ${queue.map(item => `
                                        <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center; opacity: 0.65;">
                                            <div>
                                                <strong style="color: #94a3b8; font-size: 0.8rem; display: block;">${item.title}</strong>
                                                <small style="color: var(--text-muted); font-size: 0.68rem; display: block;">${item.desc}</small>
                                            </div>
                                            <div style="text-align: right;">
                                                <span style="font-size: 0.85rem; font-weight: 800; color: #94a3b8; display: block;">${item.bpm} <small style="font-size: 0.55rem;">BPM</small></span>
                                                <small style="color: var(--text-muted); font-size: 0.6rem;">Meta: ${item.targetBpm}</small>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            container.innerHTML = fullHtml;
        }
    }
}

// Registro global único para evitar duplicação ou inicializações múltiplas
window.TechnicalManager = new TechnicalManagerClass();
