/**
 * cloudSync.js - Conector de Sincronização em Nuvem (Google Apps Script) & Práticas Acústicas
 * Painel de Estudos de Piano — Versão 15.0.0
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Backup bidirecional assíncrono conectado ao Google Apps Script / Google Drive
 * - Paginação escalável da tabela de histórico unificado de sessões (Zero DOM Bloat)
 * - Fricção e confirmação de segurança para restauração de savegame da nuvem
 * - Lançamento manual de práticas no piano acústico com rateio relacional de minutos e XP
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class CloudSyncClass {
    constructor() {
        this.storageUrlKey = "painel_zero_cloud_url";
        this.historyDisplayLimit = 10;
    }

    getCloudUrl() {
        const state = window.StateManager.getState();
        // Cole sua URL permanente do Google Apps Script entre as aspas abaixo para evitar digitar todas as vezes:
        const defaultUrl = "https://script.google.com/macros/s/AKfycbwDsjvtz1cQF8h_Y40P8Im6zaQ7hYtzpqq__VTZ3_sJCVHvZZoAhLJ8p4krJQCujkJW/exec"; 
        return state.cloudSyncUrl || localStorage.getItem(this.storageUrlKey) || defaultUrl || "";
    }

    saveCloudUrl(url) {
        if (!url) return;
        localStorage.setItem(this.storageUrlKey, url);
        window.StateManager.setState({ cloudSyncUrl: url }, "SAVE_CLOUD_URL");
        if (window.App && window.App.showToast) {
            window.App.showToast("URL do Web App salva com sucesso!", "success");
        }
    }

    async pushToCloud() {
        const url = this.getCloudUrl();
        if (!url) {
            if (window.App && window.App.showToast) {
                window.App.showToast("Por favor, configure a URL do Web App primeiro.", "warn");
            }
            return;
        }

        const payload = window.StateManager.exportSavegame();
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({
                    action: "backup",
                    filename: "Painel_Piano_Cloud_Backup.json",
                    data: payload,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();
            if (result.status === "success" || result.success) {
                if (window.AudioTools) window.AudioTools.playHitSound();
                if (window.App && window.App.showToast) {
                    window.App.showToast("☁️ Backup enviado para o Google Drive com sucesso!", "success");
                }
            } else {
                if (window.App && window.App.showToast) {
                    window.App.showToast("⚠️ O servidor respondeu: " + (result.message || "Erro desconhecido"), "warn");
                }
            }
        } catch (err) {
            console.error("[CloudSync] Erro no envio para a nuvem:", err);
            if (window.App && window.App.showToast) {
                window.App.showToast("❌ Falha na conexão com o Web App.", "error");
            }
        }
    }

    async pullFromCloud() {
        const url = this.getCloudUrl();
        if (!url) {
            if (window.App && window.App.showToast) {
                window.App.showToast("Por favor, configure a URL do Web App primeiro.", "warn");
            }
            return;
        }

        if (!confirm("⚠️ ATENÇÃO: Esta ação substituirá seu progresso local atual pelo backup da nuvem. Tem certeza que deseja restaurar?")) {
            return;
        }

        try {
            const response = await fetch(`${url}?action=restore&filename=Painel_Piano_Cloud_Backup.json`);
            const result = await response.json();
            if (result && (result.data || result.repertoire)) {
                // Delega o parse/stringify dinâmico nativamente para o StateManager
                const payload = result.data || result;
                const importRes = window.StateManager.importSavegame(payload);
                if (importRes.success) {
                    if (window.AudioTools) window.AudioTools.playHitSound();
                    if (window.App && window.App.showToast) {
                        window.App.showToast("📥 Dados restaurados da Nuvem com sucesso!", "success");
                    }
                } else {
                    if (window.App && window.App.showToast) {
                        window.App.showToast("❌ Erro ao processar o backup: " + importRes.error, "error");
                    }
                }
            } else {
                if (window.App && window.App.showToast) {
                    window.App.showToast("⚠️ Nenhum backup encontrado na nuvem.", "warn");
                }
            }
        } catch (err) {
            console.error("[CloudSync] Erro na restauração da nuvem:", err);
            if (window.App && window.App.showToast) {
                window.App.showToast("❌ Falha ao buscar backup da nuvem.", "error");
            }
        }
    }

    saveManualOfflinePractice(pilar, itemId, minutes, bpm, notes) {
        const durMinutes = parseInt(minutes, 10) || 20;
        const dateStr = new Date().toLocaleDateString('sv-SE'); // Padrão Arquitetural Estrito (ISO-8601)
        let pilarName = "Prática Livre";
        let itemName = "Piano Acústico";

        if (pilar === "repertoire" && window.RepertoireManager) {
            pilarName = "Repertório";
            const pieces = window.RepertoireManager.getActivePieces();
            const piece = pieces.find(p => p.id === itemId) || pieces[0];
            if (piece) {
                itemName = piece.title;
                window.RepertoireManager.recordTrechoPractice(
                    piece.id,
                    (piece.trechos && piece.trechos[0]?.id) || "t1",
                    durMinutes * 60,
                    0,
                    0
                );
            }
        } else if (pilar === "technical") {
            pilarName = "Técnica";
            itemName = "Fundamentos / Escalas";
        } else if (pilar === "reading") {
            pilarName = "Leitura";
            itemName = `Exercício Primer ${itemId || '001'}`;
        }

        window.StateManager.setState(prev => ({
            xp: (prev.xp || 0) + 15 + Math.floor(durMinutes / 2),
            dailyStats: {
                ...prev.dailyStats,
                focusMinutes: (prev.dailyStats.focusMinutes || 0) + durMinutes,
                repertoireMinutes: (prev.dailyStats.repertoireMinutes || 0) + (pilar === "repertoire" ? durMinutes : 0),
                technicalMinutes: (prev.dailyStats.technicalMinutes || 0) + (pilar === "technical" ? durMinutes : 0),
                readingMinutes: (prev.dailyStats.readingMinutes || 0) + (pilar === "reading" ? durMinutes : 0),
                completedSessions: (prev.dailyStats.completedSessions || 0) + 1
            },
            globalStats: {
                ...prev.globalStats,
                totalSessions: (prev.globalStats.totalSessions || 0) + 1,
                totalMinutes: (prev.globalStats.totalMinutes || 0) + durMinutes
            },
            history: [
                {
                    date: `${dateStr} (Offline)`,
                    type: `Acústico: ${pilarName}`,
                    pieceId: itemName,
                    trechoId: notes || "Treino no piano acústico",
                    durationMinutes: durMinutes,
                    accuracyPct: 100,
                    manualOffline: true
                },
                ...(prev.history || [])
            ]
        }), "REGISTER_MANUAL_OFFLINE");

        const notesInput = document.getElementById("offlineNotesInput");
        const bpmInput = document.getElementById("offlineBpmInput");
        if (notesInput) notesInput.value = "";
        if (bpmInput) bpmInput.value = "";

        if (window.AudioTools) window.AudioTools.playHitSound();
        if (window.App && window.App.showToast) {
            window.App.showToast(`💾 Prática Acústica registrada! +${durMinutes}m em ${pilarName}.`, "success");
        }
    }

    /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    deleteHistoryEntry(index) {
        const state = window.StateManager.getState();
        const history = [...(state.history || [])];

        if (index < 0 || index >= history.length) return;

        const entry = history[index];
        const confirmDelete = confirm(`🗑️ Deseja mesmo apagar o registro de "${entry.type}" de ${entry.date}?`);
        if (!confirmDelete) return;

        history.splice(index, 1);
        const todayStr = new Date().toLocaleDateString("pt-BR");
        const entryDateClean = (entry.date || "").replace(" (Offline)", "");
        const isToday = (entryDateClean === todayStr);

        let dailyStatsUpdate = {};
// ... (restante da função)
        if (window.ChartsManager) {
            window.ChartsManager.renderTimeBreakdown(window.StateManager.getState());
            if (typeof window.ChartsManager.renderHeatmap === "function") window.ChartsManager.renderHeatmap(window.StateManager.getState());
        }
    }
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Rollback Estrito, Determínistico e Sem Fallbacks) ---
    deleteHistoryEntry(index) {
        const state = window.StateManager.getState();
        const history = [...(state.history || [])];

        if (index < 0 || index >= history.length) return;

        const entry = history[index];
        const confirmDelete = confirm(`🗑️ Deseja mesmo apagar o registro de "${entry.type}" de ${entry.date}?`);
        if (!confirmDelete) return;

        history.splice(index, 1);

        // 1. Sanitização Rigorosa de Data (Imunidade contra formato pt-BR legado e sufixos Offline)
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const ptBrToday = new Date().toLocaleDateString('pt-BR');
        const entryDateClean = (entry.date || "").replace(/\s*(\(Offline\)|Offline|\$Offline\$)/i, "").trim();
        
        let entryDateISO = entryDateClean;
        const dmyMatch = entryDateClean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (dmyMatch) {
            entryDateISO = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        }
        const isToday = (entryDateISO === todayStr || entryDateClean === ptBrToday || entryDateClean === todayStr);

        const dur = entry.durationMinutes || 0;
        const typeLower = (entry.type || "").toLowerCase();
        const pieceLower = (entry.pieceId || "").toLowerCase();

        let dailyStatsUpdate = { ...state.dailyStats };
        let globalStatsUpdate = { ...state.globalStats };
        let xpSubtract = 0; // Rigidez: Se não der match no tipo exato, o estorno de XP é ZERO.

        // 2. Estorno Global (Aplicado sempre, pois a contribuição histórica do registro foi deletada)
        globalStatsUpdate.totalMinutes = Math.max(0, (globalStatsUpdate.totalMinutes || 0) - dur);
        globalStatsUpdate.totalSessions = Math.max(0, (globalStatsUpdate.totalSessions || 0) - 1);

        // 3. Estorno Diário Estrito (Sem fallbacks agressivos para o Repertório)
        if (isToday) {
            // Estorno de Carga Cognitiva base (sem tocar no bônus para evitar corrupção)
            dailyStatsUpdate.uccConsumed = Math.max(0, (dailyStatsUpdate.uccConsumed || 0) - dur);

            if (typeLower.includes("sanduíche") || typeLower.includes("sandwich")) {
                dailyStatsUpdate.focusMinutes = Math.max(0, (dailyStatsUpdate.focusMinutes || 0) - dur);
                dailyStatsUpdate.repertoireMinutes = Math.max(0, (dailyStatsUpdate.repertoireMinutes || 0) - dur);
                dailyStatsUpdate.completedSessions = Math.max(0, (dailyStatsUpdate.completedSessions || 0) - 1);
                xpSubtract = 40;
            } else if (typeLower.includes("guiada")) {
                dailyStatsUpdate.focusMinutes = Math.max(0, (dailyStatsUpdate.focusMinutes || 0) - dur);
                dailyStatsUpdate.completedSessions = Math.max(0, (dailyStatsUpdate.completedSessions || 0) - 1);
                xpSubtract = 50;
            } else if (typeLower.includes("acústico") || typeLower.includes("offline")) {
                if (pieceLower.includes("técnica") || pieceLower.includes("escala")) {
                    dailyStatsUpdate.technicalMinutes = Math.max(0, (dailyStatsUpdate.technicalMinutes || 0) - dur);
                } else if (pieceLower.includes("leitura") || pieceLower.includes("primer")) {
                    dailyStatsUpdate.readingMinutes = Math.max(0, (dailyStatsUpdate.readingMinutes || 0) - dur);
                } else {
                    dailyStatsUpdate.repertoireMinutes = Math.max(0, (dailyStatsUpdate.repertoireMinutes || 0) - dur);
                }
                dailyStatsUpdate.completedSessions = Math.max(0, (dailyStatsUpdate.completedSessions || 0) - 1);
                xpSubtract = 15 + Math.floor(dur / 2);
            } else if (typeLower.includes("aleatória") || typeLower.includes("random") || typeLower.includes("sorteio")) {
                dailyStatsUpdate.focusMinutes = Math.max(0, (dailyStatsUpdate.focusMinutes || 0) - dur);
                dailyStatsUpdate.repertoireMinutes = Math.max(0, (dailyStatsUpdate.repertoireMinutes || 0) - dur);
                dailyStatsUpdate.completedSessions = Math.max(0, (dailyStatsUpdate.completedSessions || 0) - 1);
                xpSubtract = 30;
            } else if (typeLower.includes("leitura") || typeLower.includes("primer")) {
                dailyStatsUpdate.readingMinutes = Math.max(0, (dailyStatsUpdate.readingMinutes || 0) - dur);
                dailyStatsUpdate.focusMinutes = Math.max(0, (dailyStatsUpdate.focusMinutes || 0) - dur);
                xpSubtract = 20;
            } else if (typeLower.includes("livre")) {
                dailyStatsUpdate.focusMinutes = Math.max(0, (dailyStatsUpdate.focusMinutes || 0) - dur);
                dailyStatsUpdate.repertoireMinutes = Math.max(0, (dailyStatsUpdate.repertoireMinutes || 0) - dur);
                dailyStatsUpdate.completedSessions = Math.max(0, (dailyStatsUpdate.completedSessions || 0) - 1);
                xpSubtract = 15;
            } else if (typeLower.includes("técnica") || typeLower.includes("técnico") || typeLower.includes("intervalo")) {
                dailyStatsUpdate.technicalMinutes = Math.max(0, (dailyStatsUpdate.technicalMinutes || 0) - dur);
                dailyStatsUpdate.focusMinutes = Math.max(0, (dailyStatsUpdate.focusMinutes || 0) - dur);
                xpSubtract = 15;
            }
        }

        // 4. Execução da Mutação no SSOT
        window.StateManager.setState(prev => {
            return {
                history: history,
                dailyStats: dailyStatsUpdate,
                globalStats: globalStatsUpdate,
                xp: Math.max(0, (prev.xp || 0) - xpSubtract)
            };
        }, "DELETE_HISTORY_ENTRY");

        if (window.App && window.App.showToast) {
            window.App.showToast("🗑️ Registro removido e estatísticas estornadas com segurança!", "success");
        }

        // 5. Re-renderização em Cascata
        this.renderHistoryTable(window.StateManager.getState());

        if (window.ChartsManager) {
            window.ChartsManager.renderTimeBreakdown(window.StateManager.getState());
            if (typeof window.ChartsManager.renderHeatmap === "function") {
                window.ChartsManager.renderHeatmap(window.StateManager.getState());
            }
            if (typeof window.ChartsManager.renderWeeklyGoals === "function") {
                window.ChartsManager.renderWeeklyGoals(window.StateManager.getState());
            }
        }
    }

    loadMoreHistory() {
        this.historyDisplayLimit += 10;
        this.renderHistoryTable(window.StateManager.getState());
    }

    renderHistoryTable(state) {
        const tbody = document.getElementById("historyTableBody");
        if (!tbody) return;
        
        const history = state.history || [];
        if (history.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 14px;">Nenhum registro de estudo ainda. O histórico está limpo (Marco Zero).</td></tr>`;
            return;
        }

        const visibleItems = history.slice(0, this.historyDisplayLimit);
        tbody.innerHTML = visibleItems.map((entry, idx) => `
            <tr>
                <td>${entry.date || '-'}</td>
                <td><span class="badge ${entry.manualOffline ? 'warn' : 'info'}">${entry.type || 'Sessão'}</span></td>
                <td><strong>${entry.pieceId || entry.item || 'Piano'}</strong> <small style="color: var(--text-muted);">${entry.trechoId || ''}</small></td>
                <td>${entry.durationMinutes || 0} min</td>
                <td style="color: var(--accent2); font-weight: 700;">${entry.accuracyPct !== undefined ? entry.accuracyPct + '%' : '-'}</td>
                <td style="text-align: center;">
                    <button class="btn-trash" style="background: none; border: none; cursor: pointer; font-size: 0.95rem; padding: 4px; filter: grayscale(1); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)';" onmouseout="this.style.transform='scale(1)';" data-action="delete-history" data-index="${idx}">🗑️</button>
                </td>
            </tr>
        `).join('');

        const footerBtn = document.getElementById("historyLoadMoreBtn");
        if (footerBtn) {
            if (history.length > this.historyDisplayLimit) {
                footerBtn.style.display = "block";
                footerBtn.textContent = `📂 Carregar Mais Registros (${visibleItems.length}/${history.length})`;
            } else {
                footerBtn.style.display = "none";
            }
        }
    }
}

window.CloudSync = new CloudSyncClass();
