function setupHandsFreeShortcuts() {
    window.addEventListener("keydown", (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if (tag === "input" || tag === "textarea" || tag === "select") return;

        const state = window.StateManager.getState();

        // ==================== COUPLER: CONTROLE DA AUDITORIA SEQUENCIAL ====================
        const sState = state.sessionState || {};
        const currentBlock = sState.guidedActive && sState.guidedBlocks ? (sState.guidedBlocks[sState.currentBlockIndex] || null) : null;
        const isBlockA = currentBlock && currentBlock.id === "block-a";
        const auditsList = isBlockA ? (currentBlock.audits || []) : [];
        const currentAuditIdx = sState.currentAuditIndex || 0;
        const hasActiveAudit = isBlockA && currentAuditIdx < auditsList.length;
        // ===================================================================================

        // Detecção física de visibilidade do Card de Recall de Técnica na aba Hoje
        const isTechnicalRecallActive = Boolean(
            state.activeTab === "hoje" && 
            document.getElementById("technicalRecallCardContainer") && 
            document.getElementById("technicalRecallCardContainer").style.display !== "none"
        );

        // Espaço: Acerto (Recall de Técnica/Sanduíche/Prática Livre/Auditoria) ou Avanço
        if (e.code === "Space") {
            e.preventDefault();
            triggerHandsFreeFlash("keySpace");

            if (isTechnicalRecallActive) {
                const btnHit = document.querySelector('[data-action="recall-scale-hit"]');
                if (btnHit) { btnHit.click(); return; }
            }

            if (state.sandwichState && state.sandwichState.active && !state.sandwichState.finished) {
                if (window.SandwichPlayer) window.SandwichPlayer.registerHit();
            } else if (state.freePracticeState && state.freePracticeState.active && !state.freePracticeState.finished) {
                if (window.FreePlayer) window.FreePlayer.registerHit();
            } else if (state.randomSessionState && state.randomSessionState.active && !state.randomSessionState.finished) {
                if (window.RandomPlayer) window.RandomPlayer.registerHit();
            } else if (hasActiveAudit) {
                // Se houver auditoria pendente na tela, Espaço atua como "1º Tiro Limpo"
                const audit = auditsList[currentAuditIdx];
                if (window.NeuroEngine) window.NeuroEngine.processAuditResult(audit.pieceId, audit.trecho.id, "hit");
            } else if (sState.guidedActive) {
                if (window.SessionPlayer) window.SessionPlayer.nextBlock();
            }
        }

        // Tecla E: Erro (Recall de Técnica/Sanduíche/Prática Livre/Auditoria)
        if (e.code === "KeyE") {
            e.preventDefault();
            triggerHandsFreeFlash("keyE");

            if (isTechnicalRecallActive) {
                const btnMiss = document.querySelector('[data-action="recall-scale-miss"]');
                if (btnMiss) { btnMiss.click(); return; }
            }

            if (state.sandwichState && state.sandwichState.active && !state.sandwichState.finished) {
                if (window.SandwichPlayer) window.SandwichPlayer.registerMiss();
            } else if (state.freePracticeState && state.freePracticeState.active && !state.freePracticeState.finished) {
                if (window.FreePlayer) window.FreePlayer.registerMiss();
            } else if (state.randomSessionState && state.randomSessionState.active && !state.randomSessionState.finished) {
                if (window.RandomPlayer) window.RandomPlayer.registerMiss();
            } else if (hasActiveAudit) {
                // Se houver auditoria pendente na tela, tecla E atua como "Erro/Hesitação"
                const audit = auditsList[currentAuditIdx];
                if (window.NeuroEngine) window.NeuroEngine.processAuditResult(audit.pieceId, audit.trecho.id, "miss");
            }
        }

        // Tecla M: Metrônomo
        if (e.code === "KeyM") {
            e.preventDefault();
            triggerHandsFreeFlash("keyM");
            if (window.AudioTools) {
                window.AudioTools.toggleMetronome(window.AudioTools.metroBpm || 60);
            }
        }

        // Tecla H: Ocultar / Espiar Partitura ou Revelar Guia do Recall
        if (e.code === "KeyH") {
            e.preventDefault();
            triggerHandsFreeFlash("keyH");

            if (isTechnicalRecallActive) {
                const btnGuide = document.querySelector('[data-action="toggle-recall-guide"]');
                if (btnGuide) { btnGuide.click(); return; }
            }

            if (state.randomSessionState && state.randomSessionState.active && !state.randomSessionState.finished) {
                if (window.RandomPlayer) window.RandomPlayer.togglePromptVisibility();
            } else if (state.sandwichState && state.sandwichState.active && !state.sandwichState.finished) {
                if (window.SandwichPlayer) window.SandwichPlayer.togglePromptVisibility();
            }
        }

        // Tecla P: Pausa Universal
        if (e.code === "KeyP") {
            e.preventDefault();
            triggerHandsFreeFlash("keyP");
            if (state.sandwichState && state.sandwichState.active && !state.sandwichState.finished) {
                if (window.SandwichPlayer) window.SandwichPlayer.togglePause();
            } else if (state.freePracticeState && state.freePracticeState.active && !state.freePracticeState.finished) {
                if (window.FreePlayer) window.FreePlayer.togglePause();
            } else if (state.randomSessionState && state.randomSessionState.active && !state.randomSessionState.finished) {
                if (window.RandomPlayer) window.RandomPlayer.togglePause();
            }
        }

        // Tecla N ou Enter: Próximo Bloco Guiado
        if (e.code === "KeyN" || e.code === "Enter") {
            if (state.sessionState && state.sessionState.guidedActive) {
                e.preventDefault();
                triggerHandsFreeFlash("keyN");
                if (window.SessionPlayer) window.SessionPlayer.nextBlock();
            }
        }

        // Escape: Fechar Lightbox
        if (e.key === "Escape") {
            if (window.AudioTools) window.AudioTools.closeLightbox();
        }
    });
}

function setupGlobalEventListeners() {
    document.addEventListener("click", (e) => {
        const actionEl = e.target.closest("[data-action]");
        if (!actionEl) return;
        
        const action = actionEl.dataset.action;
        const state = window.StateManager.getState();
        
        if (action === "switch-tab") {
            const tab = actionEl.dataset.tab;
            window.StateManager.setState({ activeTab: tab }, `SWITCH_TAB_${tab}`);
            
            // Auto-Close da Gaveta do Círculo de Quintas
            const drawer = document.getElementById("circleToneDrawer");
            if (drawer && tab !== "progresso") {
                drawer.style.display = "none";
            }

        } else if (action === "emergency-escape-to-home") {
            window.StateManager.setState({
                activeTab: "hoje",
                salaMode: "guided",
                sessionState: { inProgress: false, guidedActive: false, currentBlockIndex: 0, guidedBlocks: [] },
                sandwichState: { active: false, finished: false },
                randomSessionState: { active: false, finished: false },
                freePracticeState: { active: false, finished: false }
            }, "EMERGENCY_ESCAPE");
            if (window.AudioTools) window.AudioTools.stopMetronome();
            
        } else if (action === "cloud-push") {
            if (window.CloudSync) window.CloudSync.pushToCloud();
        } else if (action === "cloud-pull") {
            if (window.CloudSync) window.CloudSync.pullFromCloud();
        } else if (action === "save-cloud-url") {
            const url = document.getElementById("cloudUrlInput") ? document.getElementById("cloudUrlInput").value : "";
            if (window.CloudSync) window.CloudSync.saveCloudUrl(url);
        } else if (action === "export-savegame") {
            if (typeof exportSavegameToClipboard === "function") exportSavegameToClipboard();
        } else if (action === "import-savegame-prompt") {
            const json = prompt("Cole o JSON do seu backup local abaixo:");
            if (json) {
                const res = window.StateManager.importSavegame(json);
                if (res.success && window.App) window.App.showToast("Backup importado com sucesso!", "success");
                else if (window.App) window.App.showToast("Erro na importação: " + res.error, "error");
            }
        } else if (action === "save-offline-practice") {
            const pilar = document.getElementById("offlinePilarSelect")?.value;
            const itemId = document.getElementById("offlineItemSelect")?.value;
            const mins = document.getElementById("offlineMinutesInput")?.value;
            const bpm = document.getElementById("offlineBpmInput")?.value;
            const notes = document.getElementById("offlineNotesInput")?.value;
            if (window.CloudSync) window.CloudSync.saveManualOfflinePractice(pilar, itemId, mins, bpm, notes);
 /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        } else if (action === "delete-history-entry") {
            const ts = actionEl.dataset.timestamp;
            const tp = actionEl.dataset.type;
            const du = parseInt(actionEl.dataset.duration, 10) || 0;
            if (window.CloudSync && ts) window.CloudSync.deleteHistoryEntry(ts, tp, du);
        } else if (action === "load-more-history") {
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Alinhamento de dataset e indexação) ---
        } else if (action === "delete-history") {
            const idx = parseInt(actionEl.dataset.index, 10);
            if (!isNaN(idx) && window.CloudSync) {
                window.CloudSync.deleteHistoryEntry(idx);
            }
        } else if (action === "load-more-history") {
            if (window.CloudSync) window.CloudSync.loadMoreHistory();
        } else if (action === "open-goals-modal") {
            if (window.App) window.App.showToast("⚙️ Modal de Configuração de Metas em desenvolvimento.", "info");

        } else if (action === "select-circle-tone") {
            const tone = actionEl.dataset.tone;
            if (tone) {
                openCircleToneDrawer(tone);
            }

        } else if (action === "activate-tech-focus-direct") {
            const category = actionEl.dataset.category;
            const itemId = actionEl.dataset.id;
            
            if (category && itemId) {
                window.StateManager.setState(prev => {
                    const technical = { ...(prev.technical || {}) };
                    const list = technical[category] ? [...technical[category]] : [];
                    let itemIdx = list.findIndex(ex => ex.id === itemId);
                    
                    // --- GERAÇÃO ON-THE-FLY (Cria o fundamento se não existir no state) ---
                    if (itemIdx === -1) {
                        const title = actionEl.dataset.title || `Novo Fundamento`;
                        const tone = actionEl.dataset.tone || "C";
                        const desc = actionEl.dataset.desc || "Fundamento Dinâmico";
                        
                        let subtasks = [];
                        if (category === "scales") subtasks = ["Movimento Paralelo", "Movimento Contrário", "Escala Completa"];
                        else if (category === "arpeggios") subtasks = ["Posição Fundamental", "1ª Inversão", "2ª Inversão"];
                        
                        list.push({
                            id: itemId,
                            title: title,
                            desc: desc,
                            bpm: 60,
                            targetBpm: category === "scales" ? 90 : 80,
                            totalMinutes: 0,
                            tone: tone,
                            trainedToday: false,
                            status: "active",
                            box: 1,
                            consecutiveHits: 0,
                            nextReviewDate: new Date().toLocaleDateString('sv-SE'),
                            subtasks: subtasks
                        });
                        itemIdx = list.length - 1;
                    }
                    
                    const activatedItem = list[itemIdx];
                    
                    // Altera o status do item clicado para active e os outros da mesma categoria para queue
                    const updatedList = list.map((ex, idx) => {
                        if (idx === itemIdx) return { ...ex, status: "active" };
                        else if (ex.status === "active") return { ...ex, status: "queue" };
                        return ex;
                    });
                    
                    technical[category] = updatedList;
                    const weeklyGoals = { ...prev.weeklyGoals };
                    if (category === "scales") weeklyGoals.technicalFocus = activatedItem.title;
                    
                    return { technical, weeklyGoals };
                }, "ACTIVATE_TECH_FOCUS_DIRECT");

                if (window.App && window.App.showToast) {
                    window.App.showToast(`🎯 Foco técnico ativado: ${actionEl.dataset.title || itemId.toUpperCase()}`, "success");
                }
                
                const drawer = document.getElementById("circleToneDrawer");
                if (drawer) drawer.style.display = "none";
            }
        } else if (action === "switch-sala-mode") {
            const mode = actionEl.dataset.mode;
            window.StateManager.setState({ activeTab: "sala", salaMode: mode }, `SWITCH_SALA_${mode}`);
            
        } else if (action === "launch-guided-session-direct") {
            const currentSelected = window.StateManager.getState().selectedRoutineBlocks;
            window.StateManager.setState({ activeTab: "sala", salaMode: "guided" });
            if (window.SessionPlayer) {
                window.SessionPlayer.startSession(currentSelected);
            }
            
        } else if (action === "jump-guided-block") {
            const targetIndex = parseInt(actionEl.dataset.index || actionEl.getAttribute("data-index"), 10);
            if (!isNaN(targetIndex) && window.SessionPlayer) {
                // 1. Atualiza o índice na memória do player
                window.SessionPlayer.currentIndex = targetIndex;
                
                // 2. Lê o estado atual da sessão
                const stateObj = window.StateManager.getState();
                const sessionState = stateObj.sessionState || {};
                
                // 3. Atualiza o StateManager central para acionar a renderização reativa
                window.StateManager.setState({
                    sessionState: {
                        ...sessionState,
                        currentBlockIndex: targetIndex
                    }
                }, "JUMP_GUIDED_BLOCK");
            }
            
        } else if (action === "start-selected-routine") {
            if (window.SessionPlayer) {
                window.SessionPlayer.startSession(state.selectedRoutineBlocks);
            }
            
        } else if (action === "toggle-routine-block") {
            const blockId = actionEl.dataset.block;
            let current = [...(state.selectedRoutineBlocks || [])];
            if (current.includes(blockId)) {
                current = current.filter(b => b !== blockId);
            } else {
                current.push(blockId);
            }
            window.StateManager.setState({ selectedRoutineBlocks: current }, "TOGGLE_ROUTINE_BLOCK");
            
        } else if (action === "scroll-forecast-left") {
            const wrapper = document.getElementById("predictiveGridWrapper");
            if (wrapper) wrapper.scrollBy({ left: -260, behavior: 'smooth' });
            
        } else if (action === "scroll-forecast-right") {
            const wrapper = document.getElementById("predictiveGridWrapper");
            if (wrapper) wrapper.scrollBy({ left: 260, behavior: 'smooth' });
            
        } else if (action === "prev-radar-piece") {
            if (typeof window._radarPieceIndex !== "number") window._radarPieceIndex = 0;
            window._radarPieceIndex--;
            if (window.ChartsManager) window.ChartsManager.renderAntiDaCapoRadar(window.StateManager.getState());
            
        } else if (action === "next-radar-piece") {
            if (typeof window._radarPieceIndex !== "number") window._radarPieceIndex = 0;
            window._radarPieceIndex++;
            if (window.ChartsManager) window.ChartsManager.renderAntiDaCapoRadar(window.StateManager.getState());
            
        } else if (action === "set-time-filter") {
            const filter = actionEl.dataset.filter || "week";
            window.StateManager.setState({ timeFilter: filter }, `SET_TIME_FILTER_${filter}`);
            if (window.ChartsManager) window.ChartsManager.renderTimeBreakdown(window.StateManager.getState());
            
        } else if (action === "inspect-heatmap-day") {
            const dateISO = actionEl.dataset.date;
            const bar = document.getElementById("heatmapInspectBar");
            if (bar && dateISO) {
                const history = state.history || [];
                const dayEntries = history.filter(h => h.date === dateISO || (h.timestamp && h.timestamp.startsWith(dateISO)));
                if (dayEntries.length === 0) {
                    bar.innerHTML = `📅 <strong>${dateISO.split('-').reverse().join('/')}</strong>: Nenhum registro de prática ativa profunda.`;
                } else {
                    const totalMins = dayEntries.reduce((acc, h) => acc + (h.durationMinutes || 0), 0);
                    const breakdown = dayEntries.map(h => `<span style="color:#cbd5e1;">${h.type} (${h.durationMinutes || 0}m)</span>`).join(" • ");
                    bar.innerHTML = `📅 <strong>${dateISO.split('-').reverse().join('/')}</strong>: ${totalMins} min totais<br><div style="margin-top: 6px; font-size: 0.72rem; color: #94a3b8; line-height: 1.4;">${breakdown}</div>`;
                }
            }
            
        } else if (action === "toggle-briefing-expand") {
            isBriefingExpanded = !isBriefingExpanded;
            renderMorningBriefing(state);
            
        } else if (action === "copy-briefing") {
            if (typeof copyBriefingToClipboard === "function") {
                copyBriefingToClipboard();
            } else if (window.App && window.App.showToast) {
                window.App.showToast("A API de Clipboard não está acessível no contexto atual.", "error");
            }
            
        } else if (action === "audit-hit") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            if (window.NeuroEngine) window.NeuroEngine.processAuditResult(pieceId, trechoId, "hit");
            
        } else if (action === "audit-miss") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            if (window.NeuroEngine) window.NeuroEngine.processAuditResult(pieceId, trechoId, "miss");
            
        } else if (action === "toggle-hand") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            if (window.RepertoireManager) window.RepertoireManager.toggleHand(pieceId, trechoId);
            
        } else if (action === "toggle-pause-piece") {
            const pieceId = actionEl.dataset.piece;
            if (window.RepertoireManager) window.RepertoireManager.togglePausePiece(pieceId);
            
        } else if (action === "promote-queue-piece") {
            const queueId = actionEl.dataset.queue || actionEl.dataset.id;
            if (window.RepertoireManager && queueId) window.RepertoireManager.promoteQueuePiece(queueId);
            return;
            
        } else if (action === "start-sandwich-specific") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            if (window.SandwichPlayer) window.SandwichPlayer.startSession(pieceId, trechoId);
            
        } else if (action === "start-free-from-trecho") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            if (window.FreePlayer) window.FreePlayer.startSession(pieceId, trechoId);
            
        } else if (action === "open-sandwich-from-block") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            
            // --- 🛡️ SINALIZAÇÃO PARA A SESSÃO GUIADA NÃO DUPLICAR TEMPO ---
            if (window.SessionPlayer && window.SessionPlayer.currentBlocks) {
                 const currBlock = window.SessionPlayer.currentBlocks[window.SessionPlayer.currentIndex];
                 if (currBlock) currBlock.subPlayerUsed = true; // Avisa que terceirizou o tempo!
            }
            
            if (window.SandwichPlayer) window.SandwichPlayer.startSession(pieceId, trechoId);
        
        } else if (action === "next-guided-block") {
            if (window.SessionPlayer) window.SessionPlayer.nextBlock();
            
        } else if (action === "prev-guided-block") {
            if (window.SessionPlayer) window.SessionPlayer.prevBlock();
            
        } else if (action === "exit-guided-session") {
            if (window.SessionPlayer) window.SessionPlayer.exitSession();
            
        } else if (action === "start-tech-exercise") {
            const category = actionEl.dataset.category;
            const id = actionEl.dataset.id;
            if (window.TechnicalManager) window.TechnicalManager.startExercisePractice(category, id);
            
        } else if (action === "add-tech-item-modal") {
            const categoryVal = actionEl.dataset.category;
            if (categoryVal && window.TechnicalManager) {
                const tName = prompt(`Digite o nome do(a) novo(a) ${categoryVal === 'scales' ? 'Escala' : (categoryVal === 'arpeggios' ? 'Arpejo' : 'Exercício')}:`, "Escala Si Maior");
                if (tName && tName.trim()) {
                    const tDesc = prompt("Descrição técnica / Padrão:", "Padrão Russo / 4 oitavas");
                    const tBpm = prompt("BPM Inicial:", "60");
                    window.TechnicalManager.addCustomExercise(categoryVal, tName, tDesc, tBpm);
                }
            }
            
        } else if (action === "remove-tech-exercise") {
            const category = actionEl.dataset.category;
            const id = actionEl.dataset.id;
            if (window.TechnicalManager) window.TechnicalManager.removeCustomExercise(category, id);
            
        } else if (action === "toggle-tech-status") {
            const category = actionEl.dataset.category;
            const id = actionEl.dataset.id;
            if (window.TechnicalManager) window.TechnicalManager.toggleTechStatus(category, id);

        } else if (action === "edit-tech-subtasks") {
            const category = actionEl.dataset.category;
            const id = actionEl.dataset.id;
            if (window.TechnicalManager) window.TechnicalManager.editTechSubtasks(category, id);

        } else if (action === "advance-uti-day") {
            const id = actionEl.dataset.id;
            if (window.TechnicalManager) window.TechnicalManager.advanceUtiDay(id);
            
        } else if (action === "discharge-uti") {
            const id = actionEl.dataset.id;
            if (window.TechnicalManager) window.TechnicalManager.dischargeUti(id);
            
        // =========================================================================
        // 📝 INTERCEPTADORES DA FICHA DE AVALIAÇÃO FÍSICA (MODO SANDUÍCHE)
        // =========================================================================
        } else if (action === "submit-tech-feedback") {
            const cleanliness = actionEl.dataset.cleanliness;
            if (window.SandwichPlayer) {
                window.SandwichPlayer.submitTechFeedback(cleanliness);
            }
            
        } else if (action === "delta-tech-bpm") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (!isNaN(delta) && window.SandwichPlayer) {
                window.SandwichPlayer.adjustTechBpm(delta);
            }
            
        } else if (action === "toggle-tech-metro") {
            if (window.SandwichPlayer) {
                window.SandwichPlayer.toggleTechMetro();
            }
        } else if (action === "open-lightbox-trecho") {
            const src = actionEl.dataset.src;
            const title = actionEl.dataset.title;
            openLightbox(src, title);
            
        } else if (action === "toggle-step-accordion") {
            const targetId = actionEl.dataset.target;
            const el = document.getElementById(targetId);
            if (el) el.classList.toggle("collapsed");
            
        } else if (action === "open-overtime-reading") {
            window.StateManager.setState({ activeTab: "sala", salaMode: "reading" }, "OVERTIME_READING");
            
        } else if (action === "open-overtime-sandwich") {
            const pieceId = actionEl.dataset.piece || "p12";
            const trechoId = actionEl.dataset.trecho || "12.1.9-12";
            window.StateManager.setState({ activeTab: "sala", salaMode: "sandwich" }, "OVERTIME_SANDWICH");
            if (window.SandwichPlayer) window.SandwichPlayer.startSession(pieceId, trechoId);
            
        } else if (action === "open-overtime-random") {
            window.StateManager.setState({ activeTab: "sala", salaMode: "random" }, "OVERTIME_RANDOM");
            if (window.RandomPlayer) window.RandomPlayer.startSession();
            
        } else if (action === "open-overtime-tech") {
            window.StateManager.setState({ activeTab: "tecnica" }, "OVERTIME_TECH");
            
        } else if (action === "open-overtime-repertoire") {
            window.StateManager.setState({ activeTab: "pecas" }, "OVERTIME_REPERTOIRE");
            
        } else if (action === "sw-hit") {
            if (window.SandwichPlayer) window.SandwichPlayer.registerHit();
            
        } else if (action === "sw-miss") {
            if (window.SandwichPlayer) window.SandwichPlayer.registerMiss();
            
        } else if (action === "toggle-sw-pause") {
            if (window.SandwichPlayer) window.SandwichPlayer.togglePause();
            
        } else if (action === "start-sw-next-round") {
            if (window.SandwichPlayer) window.SandwichPlayer.startNextRound();
            
        } else if (action === "skip-tech-interval" || action === "go-to-interval" || action === "finish-tech-early" || action === "concluir-treino-tecnica") {
            if (window.SandwichPlayer) window.SandwichPlayer.finishTechIntervalEarly();
                        
        // =========================================================================
        // 📝 CAPTURA RESILIENTE DA FICHA DE AVALIAÇÃO FÍSICA
        // =========================================================================
        } else if (action === "submit-tech-feedback" || action === "submit-feedback" || action.includes("feedback")) {
            // Extrai o valor de forma limpa independentemente da variação do atributo dataset
            const cleanliness = actionEl.dataset.cleanliness || actionEl.getAttribute("data-cleanliness") || actionEl.dataset.status;
            if (window.SandwichPlayer && cleanliness) {
                window.SandwichPlayer.submitTechFeedback(cleanliness);
            }
        } else if (action === "toggle-sw-prompt") {
            if (window.SandwichPlayer) window.SandwichPlayer.togglePromptVisibility();
            
        } else if (action === "back-sandwich-setup") {
            if (window.SandwichPlayer) window.SandwichPlayer.resetToSetup();
            
        } else if (action === "finish-sandwich-early") {
            if (confirm("Deseja encerrar o treino Sanduíche? O tempo e acertos registrados até aqui serão salvos.")) {
                if (window.SandwichPlayer) window.SandwichPlayer.finishSession(true);
            }
            
        } else if (action === "delta-sw-bpm") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (!isNaN(delta)) {
                const input = document.getElementById("swBpmInput");
                if (input) {
                    const newBpm = Math.max(30, Math.min(260, (parseInt(input.value, 10) || 60) + delta));
                    input.value = newBpm;
                    if (window.SandwichPlayer) window.SandwichPlayer.currentBpm = newBpm;
                    if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(newBpm);
                }
            }
            
        } else if (action === "toggle-sw-metro") {
            const input = document.getElementById("swBpmInput");
            const bpm = input ? (parseInt(input.value, 10) || 60) : (window.SandwichPlayer ? window.SandwichPlayer.currentBpm : 60);
            if (window.AudioTools) window.AudioTools.toggleMetronome(bpm);
            
        } else if (action === "launch-sandwich-setup") {
            if (window.SandwichPlayer) window.SandwichPlayer.startSession();
            
        } else if (action === "toggle-difficulty-tag") {
            const tag = actionEl.dataset.tag;
            if (window.SandwichPlayer && tag) window.SandwichPlayer.addDifficultyTag(tag);
        
        } else if (action === "toggle-recall-guide") {
            window._showTechnicalRecallMap = !window._showTechnicalRecallMap;
            renderTechnicalRecallCard(window.StateManager.getState());

        } else if (action === "recall-scale-hit") {
            const scaleId = actionEl.dataset.id;
            if (scaleId) {
                window.StateManager.setState(prev => {
                    const technical = { ...(prev.technical || {}) };
                    const list = technical.scales ? [...technical.scales] : [];
                    const idx = list.findIndex(ex => ex.id === scaleId);
                    if (idx !== -1) {
                        const currentEx = list[idx];
                        const nextBox = Math.min(5, (currentEx.box || 1) + 1);
                        
                        // Cronograma Leitner (Dias para nova revisão)
                        let daysToAdd = 1;
                        if (nextBox === 2) daysToAdd = 2;
                        else if (nextBox === 3) daysToAdd = 4;
                        else if (nextBox === 4) daysToAdd = 7;
                        else if (nextBox === 5) daysToAdd = 14;

                        const nextReview = new Date();
                        nextReview.setDate(nextReview.getDate() + daysToAdd);
                        const nextReviewStr = nextReview.toLocaleDateString('sv-SE');

                        list[idx] = {
                            ...currentEx,
                            box: nextBox,
                            consecutiveHits: 0,
                            nextReviewDate: nextReviewStr
                        };
                        
                        // Se atingiu a Caixa 4 (Retido), abre vaga para a próxima escala menor em fila!
                        if (nextBox === 4) {
                            const nextQueueIdx = list.findIndex(ex => ex.status === "queue");
                            if (nextQueueIdx !== -1) {
                                list[nextQueueIdx] = {
                                    ...list[nextQueueIdx],
                                    status: "active",
                                    box: 1,
                                    consecutiveHits: 0,
                                    nextReviewDate: new Date().toLocaleDateString('sv-SE')
                                };
                                setTimeout(() => {
                                    if (window.App && window.App.showToast) {
                                        window.App.showToast(`🔓 NOVO DESBLOQUEIO: ${list[nextQueueIdx].title} foi adicionada ao seu ciclo ativo!`, "success");
                                    }
                                }, 500);
                            }
                        }
                    }
                    return { technical };
                }, "RECALL_SCALE_HIT");
                
                if (window.App && window.App.showToast) {
                    window.App.showToast("💚 Recall validado! Próxima revisão agendada.", "success");
                }
                if (window.AudioTools) window.AudioTools.playHitSound();
            }

        } else if (action === "recall-scale-miss") {
            const scaleId = actionEl.dataset.id;
            if (scaleId) {
                window.StateManager.setState(prev => {
                    const technical = { ...(prev.technical || {}) };
                    const list = technical.scales ? [...technical.scales] : [];
                    const idx = list.findIndex(ex => ex.id === scaleId);
                    if (idx !== -1) {
                        const currentEx = list[idx];
                        const nextBox = Math.max(1, (currentEx.box || 1) - 1);
                        
                        // Retorna para Caixa 1 e agenda revisão para amanhã (D+1)
                        const nextReviewStr = new Date().toLocaleDateString('sv-SE');

                        list[idx] = {
                            ...currentEx,
                            box: nextBox,
                            consecutiveHits: 0,
                            nextReviewDate: nextReviewStr
                        };
                    }
                    return { technical };
                }, "RECALL_SCALE_MISS");
                
                if (window.App && window.App.showToast) {
                    window.App.showToast("📉 Recall falhou. Escala agendada para revisão amanhã.", "warn");
                }
                if (window.AudioTools) window.AudioTools.playMissSound();
            }

        } else if (action === "toggle-tech-flashcard") {
            if (window.SandwichPlayer) window.SandwichPlayer.toggleTechFlashcard();

        } else if (action === "toggle-tech-metro") {
            if (window.SandwichPlayer) window.SandwichPlayer.toggleTechMetro();

        } else if (action === "delta-tech-bpm") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (window.SandwichPlayer && !isNaN(delta)) window.SandwichPlayer.adjustTechBpm(delta);

        } else if (action === "change-tech-bpm") {
            if (window.SandwichPlayer) window.SandwichPlayer.setTechBpm(parseInt(actionEl.value, 10));

        } else if (action === "finish-tech-interval-early") {
            if (window.SandwichPlayer) window.SandwichPlayer.finishTechIntervalEarly();

        } else if (action === "feedback-delta-bpm") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (window.SandwichPlayer && !isNaN(delta)) window.SandwichPlayer.adjustFeedbackBpm(delta);

        } else if (action === "feedback-change-bpm") {
            if (window.SandwichPlayer) window.SandwichPlayer.setFeedbackBpm(parseInt(actionEl.value, 10));

        } else if (action === "submit-tech-feedback") {
            const cleanliness = actionEl.dataset.cleanliness;
            if (window.SandwichPlayer && cleanliness) window.SandwichPlayer.submitTechFeedback(cleanliness);

        // =========================================================================
        // 🎲 SESSÃO DE SORTEIO / ALEATÓRIA (ORIGINAL PRESERVADO)
        // =========================================================================
        } else if (action === "hit-random") {
            if (window.RandomPlayer) window.RandomPlayer.registerHit();
            
        } else if (action === "miss-random") {
            if (window.RandomPlayer) window.RandomPlayer.registerMiss();
            
        } else if (action === "toggle-rand-pause") {
            if (window.RandomPlayer) window.RandomPlayer.togglePause();
            
        } else if (action === "toggle-rand-metro") {
            const input = document.getElementById("randBpmInputActive");
            const randBpmVal = input ? (parseInt(input.value, 10) || 60) : 60;
            if (window.AudioTools) window.AudioTools.toggleMetronome(randBpmVal);
            
        } else if (action === "toggle-hide-sheet-rand") {
            if (window.RandomPlayer) window.RandomPlayer.togglePromptVisibility();
            
        } else if (action === "back-random-setup") {
            if (window.RandomPlayer) window.RandomPlayer.resetToSetup();
            
        } else if (action === "finish-random-early") {
            if (confirm("Deseja encerrar o Sorteio Intercalado? O tempo e tentativas registradas até aqui serão salvas.")) {
                if (window.RandomPlayer) window.RandomPlayer.finishSession(true);
            }
            
        } else if (action === "delta-rand-bpm") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (!isNaN(delta)) {
                const input = document.getElementById("randBpmInputActive");
                if (input) {
                    const newBpm = Math.max(30, Math.min(260, (parseInt(input.value, 10) || 60) + delta));
                    input.value = newBpm;
                    if (window.RandomPlayer) window.RandomPlayer.sessionBpm = newBpm;
                    if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(newBpm);
                }
            }
            
        } else if (action === "start-random-session") {
            const pCheckboxes = Array.from(document.querySelectorAll("input[name='randPiece']:checked")).map(cb => cb.value);
            const sCheckboxes = Array.from(document.querySelectorAll("input[name='randStep']:checked")).map(cb => parseInt(cb.value, 10));
            const criteria = document.querySelector("input[name='randCriteria']:checked")?.value || "consolidated";
            const dur = parseInt(document.getElementById("randDurationSelect")?.value, 10) || 10;
            const bpm = parseInt(document.getElementById("randBpmInput")?.value, 10) || 60;
            if (window.RandomPlayer) {
                window.RandomPlayer.startSession({pieces: pCheckboxes, steps: sCheckboxes, onlyConsolidated: criteria === "consolidated"}, dur, bpm);
            }
            
        } else if (action === "toggle-spot-difficulty-tag") {
            const pieceId = actionEl.dataset.piece;
            const trechoId = actionEl.dataset.trecho;
            const tag = actionEl.dataset.tag;
            if (window.RandomPlayer && pieceId && trechoId && tag) {
                window.RandomPlayer.addDifficultyTag(pieceId, trechoId, tag);
            }
            
        } else if (action === "toggle-piece-drawer") {
            const pieceId = actionEl.getAttribute("data-piece-id") || actionEl.dataset.pieceId || actionEl.getAttribute("data-piece");
            if (pieceId) {
                const drawer = document.getElementById(`drawer-${pieceId}`);
                if (drawer) {
                    const isHidden = drawer.style.display === "none" || getComputedStyle(drawer).display === "none";
                    drawer.style.display = isHidden ? "block" : "none";
                    const arrow = actionEl.querySelector(".drawer-arrow");
                    if (arrow) arrow.textContent = isHidden ? "▲" : "▼";
                }
            }
            
        } else if (action === "generate-teacher-report") {
            generateTeacherReport(state);
            
        } else if (action === "generate-weekly-report") {
            showWeeklyReportPreview();
            
        } else if (action === "close-weekly-report") {
            const previewBox = document.getElementById('weeklyReportPreviewContainer');
            if (previewBox) previewBox.style.display = 'none';
            
        } else if (action === "share-weekly-report") {
            shareWeeklyReport();
            
        } else if (action === "copy-weekly-report") {
            copyWeeklyReportToClipboard();
            
        } else if (action === "toggle-paused-drawer") {
            const pBox = document.getElementById("pausedPiecesContainer");
            const pBtn = document.getElementById("btnTogglePaused");
            if (pBox) {
                const isHidden = pBox.style.display === "none" || getComputedStyle(pBox).display === "none";
                pBox.style.display = isHidden ? "block" : "none";
                if (pBtn) pBtn.textContent = isHidden ? "Ocultar" : "Mostrar";
            }
            
        } else if (action === "toggle-fila") {
            const fBox = document.getElementById("queuePiecesContainer");
            const fBtn = document.getElementById("btnToggleFila");
            if (fBox) {
                const isHidden = fBox.style.display === "none" || getComputedStyle(fBox).display === "none";
                fBox.style.display = isHidden ? "block" : "none";
                if (fBtn) fBtn.textContent = isHidden ? "Recolher Fila" : "Expandir Fila";
            }
        } else if (action === "start-free-session-btn") {
            if (window.FreePlayer) window.FreePlayer.startSession();
            
        } else if (action === "toggle-free-pause") {
            if (window.FreePlayer) window.FreePlayer.togglePause();
            
        } else if (action === "hit-free") {
            if (window.FreePlayer) window.FreePlayer.registerHit();
            
        } else if (action === "miss-free") {
            if (window.FreePlayer) window.FreePlayer.registerMiss();
            
        } else if (action === "finish-free-practice") {
            if (confirm("Deseja realmente encerrar a Prática Livre? O tempo e o progresso serão salvos no histórico.")) {
                if (window.FreePlayer) window.FreePlayer.finishSession();
            }
            
        } else if (action === "toggle-free-player-metro") {
            const input = document.getElementById("freeBpmInputActive");
            const bpm = input ? (parseInt(input.value, 10) || 60) : (window.FreePlayer ? window.FreePlayer.currentBpm : 60);
            if (window.AudioTools) window.AudioTools.toggleMetronome(bpm);
            
        } else if (action === "delta-free-bpm-player") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (!isNaN(delta)) {
                const input = document.getElementById("freeBpmInputActive");
                if (input) {
                    const newBpm = Math.max(30, Math.min(260, (parseInt(input.value, 10) || 60) + delta));
                    input.value = newBpm;
                    if (window.FreePlayer) window.FreePlayer.currentBpm = newBpm;
                    if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(newBpm);
                }
            }
        } else if (action === "back-to-guided-session") {
            window.StateManager.setState(prev => ({
                activeTab: "sala",
                salaMode: "guided",
                sandwichState: {
                    ...prev.sandwichState,
                    active: false,
                    finished: false
                }
            }), "BACK_TO_GUIDED_FROM_SANDWICH");
            if (window.SessionPlayer) {
                window.SessionPlayer.nextBlock();
            }
        
        // =========================================================================
        // 📖 INTERCEPTADORES DA ABA LEITURA (READING MANAGER)
        // =========================================================================
        } else if (action === "start-reading-analysis") {
            if (window.ReadingManager) window.ReadingManager.startAnalysisTimer();
            
        } else if (action === "skip-analysis-to-exec") {
            if (window.ReadingManager) window.ReadingManager.goToExecutionPhase();
            
        } else if (action === "eval-reading-fluent") {
            if (window.ReadingManager) {
                window.ReadingManager.lastEvaluation = "fluent";
                window.ReadingManager.currentPhase = "summary";
                window.ReadingManager.renderUI(window.StateManager.getState());
            }
            
        } else if (action === "eval-reading-hesitated") {
            if (window.ReadingManager) {
                window.ReadingManager.lastEvaluation = "hesitated";
                window.ReadingManager.currentPhase = "summary";
                window.ReadingManager.renderUI(window.StateManager.getState());
            }
            
        } else if (action === "eval-reading-collapsed") {
            if (window.ReadingManager) {
                window.ReadingManager.lastEvaluation = "collapsed";
                window.ReadingManager.currentPhase = "summary";
                window.ReadingManager.renderUI(window.StateManager.getState());
            }
            
        } else if (action === "confirm-reading-summary") {
            if (window.ReadingManager) window.ReadingManager.finalizeAndAdvance(null, 10, window.ReadingManager.lastEvaluation);
            
        } else if (action === "toggle-reading-tag") {
            if (window.ReadingManager) window.ReadingManager.toggleDifficultyTag(actionEl.dataset.tag);
            
        } else if (action === "exit-reading") {
            window.StateManager.setState({ activeTab: "hoje", salaMode: "guided" }, "EXIT_READING");
            
        } else if (action === "toggle-reading-metro") {
            if (window.AudioTools && window.ReadingManager) window.AudioTools.toggleMetronome(window.ReadingManager.currentBpm);
            
        } else if (action === "delta-reading-bpm") {
            const delta = parseInt(actionEl.dataset.delta, 10);
            if (!isNaN(delta) && window.ReadingManager) {
                window.ReadingManager.currentBpm = Math.max(30, Math.min(260, window.ReadingManager.currentBpm + delta));
                const input = document.getElementById("readingBpmInput");
                if (input) input.value = window.ReadingManager.currentBpm;
                if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(window.ReadingManager.currentBpm);
            }
            
        } else if (action === "prev-reading-exercise") {
            if (window.ReadingManager) {
                const list = window.ReadingManager.getExercises("all");
                const idx = list.findIndex(e => e.id === window.ReadingManager.selectedExerciseId);
                if (idx > 0) window.ReadingManager.selectExercise(list[idx - 1].id);
            }
            
        } else if (action === "next-reading-exercise") {
            if (window.ReadingManager) {
                const list = window.ReadingManager.getExercises("all");
                const idx = list.findIndex(e => e.id === window.ReadingManager.selectedExerciseId);
                if (idx !== -1 && idx < list.length - 1) window.ReadingManager.selectExercise(list[idx + 1].id);
            }
        }
  });

    document.addEventListener("change", (e) => {
        if (e.target && e.target.classList.contains("forecast-task-check")) {
            const taskId = e.target.getAttribute("data-task-id");
            const isChecked = e.target.checked;
            window.StateManager.setState(prev => {
                const forecastTasks = { ...(prev.forecastTasks || {}) };
                if (taskId) forecastTasks[taskId] = isChecked;
                return { forecastTasks };
            }, `TOGGLE_FORECAST_TASK_${taskId}`);
            
        } else if (e.target.id === "readingExerciseSelect") {
            const exId = e.target.value;
            if (window.ReadingManager) window.ReadingManager.selectExercise(exId);
            
        } else if (e.target.id === "readingBookSelect") {
            const bookId = e.target.value;
            if (window.ReadingManager) window.ReadingManager.setSelectionMode("book", bookId);
            
        } else if (e.target.id === "offlinePilarSelect") {
            populateOfflineSelects(window.StateManager.getState());
            
        } else if (e.target.id === "freePieceSelect") {
            const pId = e.target.value;
            if (window.FreePlayer) {
                window.FreePlayer.selectedPieceId = pId;
                window.FreePlayer.selectedTrechoId = null;
                window.FreePlayer.renderUI(window.StateManager.getState());
            }
            
        } else if (e.target.id === "freeTrechoSelect") {
            const tId = e.target.value;
            if (window.FreePlayer) {
                window.FreePlayer.selectedTrechoId = tId;
            }
            
        } else if (e.target.id === "swPieceSelect") {
            const pId = e.target.value;
            if (window.SandwichPlayer) {
                window.SandwichPlayer.selectedPieceId = pId;
                window.SandwichPlayer.selectedTrechoId = null;
                window.SandwichPlayer.renderUI(window.StateManager.getState());
            }
            
        } else if (e.target.id === "swTrechoSelect") {
            const tId = e.target.value;
            if (window.SandwichPlayer) {
                window.SandwichPlayer.selectedTrechoId = tId;
            }
            
        } else if (e.target.id === "change-sw-bpm" || e.target.id === "swBpmInput") {
            const bpm = parseInt(e.target.value, 10);
            if (!isNaN(bpm) && window.SandwichPlayer) {
                window.SandwichPlayer.currentBpm = bpm;
                if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(bpm);
            }
            
        } else if (e.target.id === "randBpmInputActive") {
            const bpm = parseInt(e.target.value, 10);
            if (!isNaN(bpm) && window.RandomPlayer) {
                window.RandomPlayer.sessionBpm = bpm;
                if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(bpm);
            }
        } else if (e.target.id === "freeBpmInputActive" || e.target.id === "change-free-bpm-player" || e.target.getAttribute("data-action") === "change-free-bpm-player") {
            const bpm = parseInt(e.target.value, 10);
            if (!isNaN(bpm) && window.FreePlayer) {
                window.FreePlayer.currentBpm = bpm;
                if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(bpm);
            }
            
        } else if (e.target.id === "readingBpmInput" || e.target.getAttribute("data-action") === "change-reading-bpm") {
            const bpm = parseInt(e.target.value, 10);
            if (!isNaN(bpm) && window.ReadingManager) {
                window.ReadingManager.currentBpm = Math.max(30, Math.min(260, bpm));
                if (window.AudioTools && window.AudioTools.metroIsOn) window.AudioTools.updateBpm(window.ReadingManager.currentBpm);
            }
        }
    });
}
