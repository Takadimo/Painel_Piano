/**
 * state.js - Gerenciador Central de Estado Global (SSOT, Debounced I/O & Auto-Sanitização UTF-8)
 * Painel de Estudos de Piano — Versão 15.1.0 (Consolidada)
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Única Fonte da Verdade (SSOT via window.StateManager) com padrão Pub/Sub reativo
 * - Persistência no localStorage com debounce de 500ms (persistDebounced)
 * - Roteamento unificado do Cockpit (activeTab: "hoje"|"sala"|"pecas"|"tecnica"|"progresso"|"config")
 * - Modos da Sala de Estudos (salaMode: "guided"|"sandwich"|"random"|"reading"|"free")
 * - Garantia da presença soberana do Bloco A no array selectedRoutineBlocks
 * - Granularity rica no pilar técnico (Escalas Russas/Contrárias, 1ª/2ª/3ª Inversões de Arpejos, Cadências)
 * - Auto-sanitização rigorosa de caracteres corrompidos UTF-8 e reset diário de telemetria
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

const DEFAULT_STATE = {
    version: "v16.2.0", // Atualizado para a arquitetura de Tiers Cognitivos
    lastSaved: null,
    activeTab: "hoje",
    salaMode: "guided", // 'guided' | 'sandwich' | 'random' | 'reading' | 'free'
    timeFilter: "week",
    cloudSyncUrl: "",
    freeBpm: 60,
    isRampBpmActive: false,
    xp: 0,
    playerLevel: {
        level: 1,
        title: "Iniciante Consciente",
        currentXp: 0,
        nextLevelXp: 500,
        streakDays: 1,
        hasRestShield: true
    },
    globalStats: {
        totalSessions: 0,
        totalMinutes: 0,
        approvedAudits: 0
    },

    // 🧠 [CAMADA VI] BASELINE DRIFT v3: Parâmetros de Carga Cognitiva e Tiers
    baselineUcc: 60,              // Orçamento diário nominal padrão (60 UCCs)
    ewmaCapacity: 1.0,            // Capacidade real ponderada exponencialmente (EWMA)
    currentTier: 3,               // Tier ativo: 3 (Progressão), 2 (Manutenção), 1 (Sobrevivência)
    consecutiveFails: 0,          // Contador de falhas seguidas (Gatilho de Resgate)
    consecutiveTier1Successes: 0, // Sucessos seguidos no Tier 1 (Gatilho de Restauração)

    dailyStats: {
        date: new Date().toLocaleDateString('sv-SE'),
        focusMinutes: 0,
        repertoireMinutes: 0,
        technicalMinutes: 0,
        readingMinutes: 0,
        completedAudits: 0,
        completedSessions: 0,
        uccConsumed: 0,            // ⏱️ Acumulador de Unidades de Carga Cognitiva de hoje
        bonusUccElapsed: 0        // 🌟 NOVO: Isolamento de carga cognitiva da Camada 2
    
    },
    weeklyGoals: {
        repertoirePct: 0,
        repertoireTargetMinutes: 120,
        repertoireDoneMinutes: 0,
        technicalPct: 0,
        technicalFocus: "Escala Fá# Maior & Arpejos nos 12 Tons",
        technicalTargetMinutes: 60,
        technicalDoneMinutes: 0,
        readingPct: 0,
        readingDoneCount: 0,
        readingTotalCount: 5,
        readingStatus: "Iniciando Ciclo",
        globalPacePct: 0,
        projectedEndDay: "Domingo",
        restDaysAvailable: 2
    },
/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    weeklyOrchestrator: {
        idealCurve: [0, 0, 0, 0, 0, 0, 0], // Curva ideal acumulada de Segunda a Domingo
        realCurve: [0, 0, 0, 0, 0, 0, 0],  // Curva real acumulada de Segunda a Domingo
        lastCalculatedWeek: null,          // Armazena a data da Segunda-feira da semana ativa
        weeklyPace: 1.0                    // Ritmo Preditivo Global (Real / Ideal)
    },
    selectedRoutineBlocks: ["block-a", "block-b", "block-c", "block-d", "block-e"],
    repertoire: {
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Inclusão do block-reading) ---
    weeklyOrchestrator: {
        idealCurve: [0, 0, 0, 0, 0, 0, 0], // Curva ideal acumulada de Segunda a Domingo
        realCurve: [0, 0, 0, 0, 0, 0, 0],  // Curva real acumulada de Segunda a Domingo
        lastCalculatedWeek: null,          // Armazena a data da Segunda-feira da semana ativa
        weeklyPace: 1.0                    // Ritmo Preditivo Global (Real / Ideal)
    },
    selectedRoutineBlocks: ["block-a", "block-b", "block-c", "block-d", "block-reading", "block-e"],
    repertoire: {
        active: [],
        paused: [],
        queue: [],
        completed: []
    },
    repertoire: {
        active: [],
        paused: [],
        queue: [],
        completed: []
    },
    technical: {
        scales: [],
        arpeggios: [],
        cadences: [
            { id: "c1", title: "Cadência nos 12 Tons (Menor)", desc: "Progressão Im - IVm - V7 - Im", bpm: 60, targetBpm: 72, totalMinutes: 0, tone: "12T", trainedToday: false, status: "active", subtasks: ["Ascendente", "Descendente", "C - F# - C", "F - C - F"] },
            { id: "c2", title: "Cadência nos 12 Tons (Maior)", desc: "Progressão I - IV - V7 - I", bpm: 60, targetBpm: 72, totalMinutes: 0, tone: "12T", trainedToday: false, status: "queue" }
        ]
    },
    reading: {
        currentExerciseId: "les-01",
        completedExercises: [],
        history: [],
    },
    history: [], // Histórico de sessões
    sessionState: {
        inProgress: false,
        guidedActive: false,
        currentBlockIndex: 0,
        guidedBlocks: [],
        cascadeRestrictionD: false,
        startTime: null,
        blockSeconds: 0,
        overtimeSuggested: false,
        // --- MONITORAMENTO INTRADIA (META 3.2) ---
        auditsFailed: [],
        auditsPassed: [],
        acquiredToday: []
    },

    sandwichState: {
        active: false,
        isPaused: false,
        finished: false,
        pieceId: null,
        trechoId: null,
        currentRound: 1,
        targetHits: 3,
        isCorrectingHabit: false,
        isPromptDropped: false,
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
        lastTechDrawn: null
    },
    randomSessionState: {
        active: false,
        isPaused: false,
        finished: false,
        spots: [],
        currentSpotIndex: 0,
        bpm: 60,
        isPromptDropped: false,
        summaryList: [],
        durationMinutes: 10,
        xpEarned: 30
    },
    freePracticeState: {
        active: false,
        isPaused: false,
        pieceId: null,
        trechoId: null,
        bpm: 60,
        hits: 0,
        misses: 0,
        secondsElapsed: 0
    },
    // 🛡️ [CAMADA V] Estado do Protocolo Retorno Seguro e Readiness Gate Dinâmico
    thawRecoveryState: {
        active: false,                  // Se o protocolo de degelo está ativo para o dia
        completed: false,               // Se a sessão de degelo foi concluída
        missedDays: 0,                  // Dias de ausência detectados
        mode: "NONE",                   // "NONE" | "FULL_IMMUNITY" | "SOFT_REGRESSION"
        activatedDate: null,            // Data (YYYY-MM-DD) em que o degelo foi ativado para hoje
        lastThawExecutionDate: null,    // Data (YYYY-MM-DD) do último degelo concluído (cooldown 14 dias)
        isReadinessGate: false,         // [CAMADA V.B] Indica se hoje (D0) é o teste de diagnóstico de prontidão
        diagnosticPassed: null,         // [CAMADA V.B] null | true (estudo normal) | false (entra em amortecimento)
        amortizationActive: false,      // [CAMADA V.B] Ativação do amortecimento biológico (metas de 20 min)
        amortizationDaysRemaining: 0,   // [CAMADA V.B] Contador de dias sob meta reduzida (normalmente 2 dias: D+1 e D+2)
        targetMinutes: 20,              // Meta de minutos calculada
        sessionSecondsElapsed: 0        // Segundos praticados na sessão de hoje
    }
};

const STORAGE_KEY = "painel_zero_state";

function sanitizeEncoding(str) {
    if (typeof str !== "string") return str;
    return str
        .replace(/Bourre/g, "Bourrée")
        .replace(/F\uFFFD/g, "Fá")
        .replace(/F /g, "Fá ")
        .replace(/D\uFFFD/g, "Dó")
        .replace(/L\uFFFD/g, "Lá")
        .replace(/Sess\uFFFD\uFFFD?o/g, "Sessão")
        .replace(/Sesso/g, "Sessão")
        .replace(/T\uFFFDcnico/g, "Técnico")
        .replace(/Tcnico/g, "Técnico")
        .replace(/T\uFFFDcnica/g, "Técnica")
        .replace(/Tcnica/g, "Técnica")
        .replace(/Cad\uFFFDncia/g, "Cadência")
        .replace(/Cadncia/g, "Cadência")
        .replace(/Posi\uFFFD\uFFFD?o/g, "Posição")
        .replace(/Posio/g, "Posição")
        .replace(/Contr\uFFFDrio/g, "Contrário")
        .replace(/Contrrio/g, "Contrário")
        .replace(/Padr\uFFFD\uFFFD?o/g, "Padrão")
        .replace(/Padro/g, "Padrão")
        .replace(/Qui\uFFFDltera/g, "Quiáltera")
        .replace(/Quiltera/g, "Quiáltera")
        .replace(/Invers\uFFFD\uFFFD?o/g, "Inversão")
        .replace(/Inverso/g, "Inversão");
}

function sanitizeObjectStrings(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObjectStrings(item));
    }
    const result = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === "string") {
            result[key] = sanitizeEncoding(val);
        } else if (typeof val === "object" && val !== null) {
            result[key] = sanitizeObjectStrings(val);
        } else {
            result[key] = val;
        }
    }
    return result;
}

function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    const output = Object.assign({}, target);
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            if (!(key in target)) {
                output[key] = source[key];
            } else {
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            output[key] = source[key];
        }
    });
    return output;
}
class StateManagerClass {
    constructor() {
        // Clonagem profunda rigorosa para impedir vazamentos de referência do DEFAULT_STATE em resets
        this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this._listeners = new Set();
        this._initialized = false;
        this._persistTimeout = null;
        
        // Travas de Mutação Concorrente
        this._isMutating = false;
        this._mutationQueue = [];

        // 🛡️ Escrita Síncrona Preventiva: Garante persistência se a aba for fechada durante o debounce
        window.addEventListener('beforeunload', () => {
            if (this._persistTimeout) {
                clearTimeout(this._persistTimeout);
                this.persistSync();
            }
        });
    }

    init() {
        if (this._initialized) return this._state;
        try {
            const rawData = localStorage.getItem(STORAGE_KEY);
            if (rawData) {
                const parsed = JSON.parse(rawData);

                // --- MIGRATION GUARD: Normalização de Datas no Histórico (DD/MM/YYYY -> YYYY-MM-DD) ---
                if (parsed.history && Array.isArray(parsed.history)) {
                    parsed.history = parsed.history.map(item => {
                        if (item && item.date && typeof item.date === "string") {
                            // Limpeza retroativa de sufixos Offline e padronização pré-parser
                            item.date = item.date.replace(/\s*(\(Offline\)|Offline|\$Offline\$)/i, "").trim();
                            const dmyMatch = item.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                            if (dmyMatch) {
                                // Reorganiza DD/MM/YYYY em YYYY-MM-DD ISO seguro
                                item.date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
                            }
                        }
                        return item;
                    });
                }

                // --- MIGRATION GUARD: Backfill Dinâmico de Granularidades Técnicas ---
                if (parsed.technical) {
                    ["scales", "arpeggios", "cadences"].forEach(cat => {
                        if (Array.isArray(parsed.technical[cat])) {
                            parsed.technical[cat] = parsed.technical[cat].map(item => {
                                if (!item.subtasks) {
                                    if (cat === "scales") item.subtasks = ["Movimento Contrário", "Movimento Paralelo", "Escala Completa"];
                                    else if (cat === "arpeggios") item.subtasks = ["Posição Fundamental", "1ª Inversão", "2ª Inversão", "3ª Inversão"];
                                    else item.subtasks = ["Ascendente", "Descendente", "Encadeamento I-IV-I", "Encadeamento IV-I-IV"];
                                }
                                return item;
                            });
                        }
                    });
                }
                
                // --- MIGRATION GUARD: Backfill de Propriedades de Telemetria nos Trechos ---
                const categories = ["active", "paused", "queue", "completed"];
                if (parsed.repertoire) {
                    categories.forEach(cat => {
                        if (Array.isArray(parsed.repertoire[cat])) {
                            parsed.repertoire[cat] = parsed.repertoire[cat].map(piece => {
                                if (piece && Array.isArray(piece.trechos)) {
                                    piece.trechos = piece.trechos.map(trecho => {
                                        return {
                                            isCorrectingHabit: false,
                                            consolidated: false,
                                            nextReviewDate: null,
                                            slips: 0,
                                            consecutiveColdPasses: 0,
                                            lifetimeHits: 0,
                                            lifetimeAttempts: 0,
                                            difficultyTags: [],
                                            incubationUntil: null,
                                            lastPracticed: null,
                                            ...trecho // Mantém o que já existia gravado (como box, label, etc.)
                                        };
                                    });
                                }
                                return piece;
                            });
                        }
                    });
                }

                // Compatibilidade e migração de rotas antigas
                if (parsed.activeTab === "blocos") {
                    parsed.activeTab = "sala";
                }
                if (parsed.activeTab === "leitura") {
                    parsed.activeTab = "sala";
                    parsed.salaMode = "reading";
                }
                if (parsed.blocosMode && !parsed.salaMode) {
                    parsed.salaMode = parsed.blocosMode;
                    delete parsed.blocosMode;
                }
                if (parsed.selectedRoutineBlocks && !parsed.selectedRoutineBlocks.includes("block-a")) {
                    parsed.selectedRoutineBlocks = ["block-a", ...parsed.selectedRoutineBlocks];
                }
                const merged = deepMerge(DEFAULT_STATE, parsed);
                this._state = sanitizeObjectStrings(merged);
                this._recalculatePlayerLevel(); // Garante o alinhamento de nível ao iniciar
                this._checkDailyReset();
            } else {
                this._state = Object.assign({}, DEFAULT_STATE);
                this.persistSync();
            }
        } catch (e) {
            console.error("[StateManager] Falha ao carregar estado local. Usando padrão:", e);
            this._state = Object.assign({}, DEFAULT_STATE);
        }
        this._initialized = true;
        return this._state;
    }
    _checkDailyReset() {
        const today = new Date().toLocaleDateString('sv-SE');
        let stateChanged = false;

        if (this._state.dailyStats && this._state.dailyStats.date !== today) {
            
            // 🛡️ [CAMADA V] Processamento de transição do Degelo, Readiness Gate e Amortecimento
            if (this._state.thawRecoveryState && this._state.thawRecoveryState.active) {
                const thaw = this._state.thawRecoveryState;
                const yesterday = this._state.dailyStats.date || today;

                if (thaw.completed) {
                    // Sessão concluída com sucesso! Consome o cooldown de 14 dias
                    thaw.lastThawExecutionDate = yesterday;
                    
                    if (thaw.isReadinessGate) {
                        // [CAMADA V.B] Se ontem foi dia de diagnóstico (D0)
                        if (thaw.diagnosticPassed === true) {
                            thaw.active = false;
                            thaw.isReadinessGate = false;
                            thaw.mode = "NONE";
                            console.log("[StateManager] Transição: Diagnóstico PASSOU. Regime nominal restaurado.");
                        } else {
                            thaw.isReadinessGate = false;
                            thaw.amortizationActive = true;
                            thaw.amortizationDaysRemaining = 2;
                            thaw.mode = "SOFT_REGRESSION"; // Amortecimento ativo
                            console.log("[StateManager] Transição: Diagnóstico FALHOU. Amortecimento de 2 dias ativado.");
                        }
                    } else if (thaw.amortizationActive) {
                        thaw.amortizationDaysRemaining--;
                        if (thaw.amortizationDaysRemaining <= 0) {
                            thaw.active = false;
                            thaw.amortizationActive = false;
                            thaw.mode = "NONE";
                            console.log("[StateManager] Transição: Fim do período de Amortecimento. Regime nominal restaurado.");
                        } else {
                            console.log(`[StateManager] Transição: Mais 1 dia de Amortecimento ativo. Restam: ${thaw.amortizationDaysRemaining}`);
                        }
                    } else {
                        thaw.active = false;
                        thaw.mode = "NONE";
                    }
                } else {
                    // 🛡️ Expiração preventiva (Evita exploits): Sessão não concluída ontem
                    console.log("[StateManager] Sessão de Degelo anterior não concluída. Expirando escudo e aplicando cooldown preventivo.");
                    thaw.lastThawExecutionDate = thaw.activatedDate || today;
                    thaw.active = false;
                    thaw.isReadinessGate = false;
                    thaw.amortizationActive = false;
                    thaw.amortizationDaysRemaining = 0;
                    thaw.mode = "NONE";
                }

                thaw.completed = false;
                thaw.sessionSecondsElapsed = 0;
                thaw.diagnosticPassed = null;
            }

            // =========================================================================
            // ⏱️ [CAMADA VI] BASELINE DRIFT v3: RECALIBRAGEM POR TIERS COGNITIVOS (UCC)
            // =========================================================================
            // 1. Puxa a performance da base e do bônus de ontem de forma separada
            const yesterdayBaseUcc = this._state.dailyStats.uccConsumed || 0;
            const yesterdayBonusUcc = this._state.dailyStats.bonusUccElapsed || 0;
            const totalYesterdayUcc = yesterdayBaseUcc + yesterdayBonusUcc;
            
            // 🛡️ ADICIONE ESTA LINHA DE COMPATIBILIDADE AQUI:
            const yesterdayUcc = totalYesterdayUcc; 
            
            const targetUcc = this._state.baselineUcc || 60;

            // 1. Calcula os dias decorridos desde a última sessão (Tratamento contra hiatos/viagens)
            const prevDateStr = this._state.dailyStats.date || today;
            const prevDate = new Date(prevDateStr);
            const currDate = new Date(today);
            const timeDiff = currDate.getTime() - prevDate.getTime();
            const daysElapsed = Math.max(1, Math.round(timeDiff / (1000 * 3600 * 24)));

            // 2. Performance de ontem em UCCs (teto em 2.0 para evitar distorções por hiperfoco)
            const performanceRatio = Math.min(2.0, yesterdayUcc / targetUcc);

            // 3. Atualiza o EWMA aplicando decaimento exponencial (alfa = 0.3)
            const alpha = 0.3;
            let newEwma = this._state.ewmaCapacity || 1.0;
            
            // Aplica a performance do último dia ativo
            newEwma = (alpha * performanceRatio) + ((1 - alpha) * newEwma);
            
            // Decai o EWMA amortecidamente para os dias de ausência real (férias, dias sem estudar)
            for (let i = 1; i < daysElapsed; i++) {
                newEwma = (alpha * 0.0) + ((1 - alpha) * newEwma);
            }
            
            // Restringe a capacidade dentro do teto seguro (1.5) e do piso fisiológico (0.3)
            newEwma = Math.max(0.3, Math.min(1.5, newEwma));
            this._state.ewmaCapacity = newEwma;

            // 4. Avaliação dos Gatilhos de Tiers (Curto vs. Longo Prazo)
            const currentTier = this._state.currentTier || 3;
            const currentTargetUcc = currentTier === 3 ? targetUcc : (currentTier === 2 ? targetUcc * 0.70 : 20);
            
            // Ontem é "sucesso" se completou uma sessão inteira ou se cumpriu a meta de UCC do Tier ativo
            const yesterdayCompleted = (this._state.dailyStats.completedSessions || 0) > 0 || yesterdayUcc >= currentTargetUcc;

            if (!yesterdayCompleted) {
                this._state.consecutiveFails = (this._state.consecutiveFails || 0) + 1;
                this._state.consecutiveTier1Successes = 0; // Reseta recuperação se falhar
            } else {
                this._state.consecutiveFails = 0;
                if (currentTier === 1) {
                    this._state.consecutiveTier1Successes = (this._state.consecutiveTier1Successes || 0) + 1;
                }
            }

            // Determina o Tier recomendado pela tendência do EWMA (Longo Prazo)
            let suggestedTier = 3;
            if (newEwma < 0.40) {
                suggestedTier = 1; // Crítico -> Modo Sobrevivência
            } else if (newEwma < 0.70) {
                suggestedTier = 2; // Atenção -> Modo Manutenção
            } else {
                suggestedTier = 3; // Nominal -> Progressão Total
            }

            let finalTier = suggestedTier;

            // --- GATILHO DE RESGATE (3 Falhas Seguidas -> Força Tier 1 e perdoa dívidas) ---
            if (this._state.consecutiveFails >= 3 && currentTier > 1) {
                finalTier = 1;
                this._state.consecutiveFails = 0;
                this._state.consecutiveTier1Successes = 0;
                
                // 🛡️ Alívio Real: Zera os passivos psicológicos de minutos acumulados
                if (this._state.weeklyGoals) {
                    this._state.weeklyGoals.repertoireDoneMinutes = this._state.weeklyGoals.repertoireTargetMinutes || 120;
                    this._state.weeklyGoals.technicalDoneMinutes = this._state.weeklyGoals.technicalTargetMinutes || 60;
                    this._state.weeklyGoals.globalPacePct = 100;
                }
                console.log("[BaselineDrift] GATILHO DE RESGATE: 3 falhas consecutivas. Ativando Tier 1 e limpando débitos.");
                if (window.App && typeof window.App.showToast === "function") {
                    window.App.showToast("🛡️ Modo Sobrevivência Ativado: Foco total na Auditoria a Frio. Débitos de tempo zerados!", "warning");
                }
            } 
            // --- GATILHO DE RESTAURAÇÃO (2 Sucessos Seguidos no Tier 1 -> Retorna ao Tier 3) ---
            else if (currentTier === 1 && this._state.consecutiveTier1Successes >= 2) {
                finalTier = 3;
                this._state.consecutiveTier1Successes = 0;
                console.log("[BaselineDrift] RESTAURAÇÃO: 2 sucessos consecutivos no Tier 1. Restaurando Tier 3.");
                if (window.App && typeof window.App.showToast === "function") {
                    window.App.showToast("🚀 Excelente consistência de resgate! Retornando ao Tier 3 (Progressão Total).", "success");
                }
            }

            this._state.currentTier = finalTier;

        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // 5. Configuração Dinâmica dos Blocos de Estudo do Cockpit
        if (this._state.currentTier === 1) {
            this._state.selectedRoutineBlocks = ["block-a", "block-e"];
            console.log("[BaselineDrift] Cockpit configurado para Tier 1 (Sobrevivência): Blocos A e E.");
        } else if (this._state.currentTier === 2) {
            this._state.selectedRoutineBlocks = ["block-a", "block-b", "block-d", "block-e"];
            console.log("[BaselineDrift] Cockpit configurado para Tier 2 (Manutenção): Sem Bloco C.");
        } else {
            this._state.selectedRoutineBlocks = ["block-a", "block-b", "block-c", "block-d", "block-e"];
            console.log("[BaselineDrift] Cockpit configurado para Tier 3 (Progressão Total): Todos os blocos ativos.");
        }
        --- FIM ORIGINAL --- */

        // --- NOVA LÓGICA (Tiers com Leitura Integrada) ---
        // 5. Configuração Dinâmica dos Blocos de Estudo do Cockpit
        if (this._state.currentTier === 1) {
            this._state.selectedRoutineBlocks = ["block-a", "block-e"];
            console.log("[BaselineDrift] Cockpit configurado para Tier 1 (Sobrevivência): Blocos A e E.");
        } else if (this._state.currentTier === 2) {
            this._state.selectedRoutineBlocks = ["block-a", "block-b", "block-d", "block-reading", "block-e"];
            console.log("[BaselineDrift] Cockpit configurado para Tier 2 (Manutenção): Sem Bloco C.");
        } else {
            this._state.selectedRoutineBlocks = ["block-a", "block-b", "block-c", "block-d", "block-reading", "block-e"];
            console.log("[BaselineDrift] Cockpit configurado para Tier 3 (Progressão Total): Todos os blocos ativos.");
        }
            // =========================================================================

            // Reseta as estatísticas diárias para o novo dia
            this._state.dailyStats = {
                date: today,
                focusMinutes: 0,
                repertoireMinutes: 0,
                technicalMinutes: 0,
                readingMinutes: 0,
                completedAudits: 0,
                completedSessions: 0,
                uccConsumed: 0, // Inicia zerado para acumular as UCCs do novo dia
                bonusUccElapsed: 0 // Inicia zerado para acumular o bônus de amanhã

            };
            
            // Blindagem: Reseta os checkboxes da Aba Hoje para o novo dia
            this._state.forecastTasks = {}; 

            // Reseta o status diário dos exercícios técnicos
            if (this._state.technical) {
                Object.keys(this._state.technical).forEach(cat => {
                    if (Array.isArray(this._state.technical[cat])) {
                        this._state.technical[cat].forEach(ex => ex.trainedToday = false);
                    }
                });
            }
            stateChanged = true;
        }

        // --- ORQUESTRADOR SEMANAL (Sessão 7) ---
        // Executado em todas as inicializações (boot) e resets para auto-regenerar a curva real a partir do histórico
        if (this._state.dailyStats) {
            const now = new Date();
            const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
            const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
            const mondayDate = new Date(now);
            mondayDate.setDate(now.getDate() + distanceToMonday);
            const mondayStr = mondayDate.toLocaleDateString("sv-SE");

            // 1. Inicialização de Nova Semana
            if (!this._state.weeklyOrchestrator || this._state.weeklyOrchestrator.lastCalculatedWeek !== mondayStr) {
                console.log(`[StateManager] Orquestrador Semanal: Nova semana detectada (${mondayStr}). Inicializando curvas...`);
                
                let totalWeeklyTarget = 300; // Salvaguarda padrão em minutos
                
                // 🛡️ [CAMADA VII] Evita acoplamento cíclico
                const activePieces = (this._state.repertoire && Array.isArray(this._state.repertoire.active))
                    ? this._state.repertoire.active
                    : [];

                if (activePieces.length > 0) {
                    totalWeeklyTarget = activePieces.reduce((sum, piece) => {
                        const target = piece.targetWeeklyMinutes || (piece.id === "p12" ? 60 : 100);
                        return sum + target;
                    }, 0);
                    totalWeeklyTarget += 120; // Volume fixo para Técnica e Leitura
                }

                const dailySlice = Math.round(totalWeeklyTarget / 7);
                const idealCurve = [];
                for (let i = 0; i < 7; i++) {
                    idealCurve.push(dailySlice * (i + 1));
                }

                this._state.weeklyOrchestrator = {
                    idealCurve: idealCurve,
                    realCurve: [0, 0, 0, 0, 0, 0, 0],
                    lastCalculatedWeek: mondayStr,
                    weeklyPace: 1.0
                };
                stateChanged = true;
            }

            // 2. Auto-regenerador da Curva Real baseado no Histórico Real Gravado
            if (this._state.weeklyOrchestrator) {
                const realCurve = [0, 0, 0, 0, 0, 0, 0];
                const history = this._state.history || [];
                
                const weekDatesStr = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(mondayDate);
                    d.setDate(mondayDate.getDate() + i);
                    weekDatesStr.push(d.toLocaleDateString("sv-SE"));
                }

                weekDatesStr.forEach((dateStr, idx) => {
                    let dayMinutes = 0;
                    history.forEach(h => {
                        if (h.date === dateStr || (h.timestamp && h.timestamp.startsWith(dateStr))) {
                            dayMinutes += (h.durationMinutes || h.duration || 0);
                        }
                    });
                    
                    if (dateStr === today) {
                        dayMinutes += (this._state.dailyStats.focusMinutes || 0);
                    }
                    
                    const prevSum = idx > 0 ? realCurve[idx - 1] : 0;
                    realCurve[idx] = prevSum + dayMinutes;
                });

                if (JSON.stringify(this._state.weeklyOrchestrator.realCurve) !== JSON.stringify(realCurve)) {
                    this._state.weeklyOrchestrator.realCurve = realCurve;
                    
                    const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
                    const idealToday = this._state.weeklyOrchestrator.idealCurve[currentDayIndex] || 1;
                    const pace = realCurve[currentDayIndex] / idealToday;
                    this._state.weeklyOrchestrator.weeklyPace = Number(pace.toFixed(2));
                    
                    stateChanged = true;
                }
            }
        }

        if (stateChanged) {
            this.persistSync();
        }
    }
    getState() {
        if (!this._initialized) {
            this.init();
        }
        return this._state;
    }

    setState(updater, actionLabel = "UPDATE_STATE", silent = false) {
        if (this._isMutating) {
            this._mutationQueue.push({ updater, actionLabel, silent });
            return;
        }
        this._isMutating = true;

        const currentState = this.getState();
        let updates = {};
        if (typeof updater === "function") {
            updates = updater(currentState);
        } else if (typeof updater === "object") {
            updates = updater;
        }
        
        // 🚀 Otimização Computacional O(n): Sanitização processa apenas o novo payload (updates)
        const sanitizedUpdates = sanitizeObjectStrings(updates);
        this._state = deepMerge(currentState, sanitizedUpdates);
        
        // Zero UTC Date Drift na telemetria de salvamento
        this._state.lastSaved = new Date().toLocaleDateString('sv-SE') + "T" + new Date().toLocaleTimeString('sv-SE');
        
        // =========================================================================
        // ⏱️ [CAMADA VI] INTERCEPTOR CENTRAL DE UCC (UNIDADES DE CARGA COGNITIVA)
        // =========================================================================
        const oldFocus = currentState.dailyStats ? (currentState.dailyStats.focusMinutes || 0) : 0;
        const newFocus = this._state.dailyStats ? (this._state.dailyStats.focusMinutes || 0) : 0;
        const diffMinutes = newFocus - oldFocus;

        if (diffMinutes > 0 && this._state.dailyStats) {
            let fds = 1.0;
            const currentUcc = currentState.dailyStats ? (currentState.dailyStats.uccConsumed || 0) : 0;
            const targetUcc = this._state.baselineUcc || 60;

            // Se o orçamento diário nominal já foi atingido, o excesso vai para a Camada 2
            if (currentUcc >= targetUcc) {
                fds = 0.3; // Expansão regenerativa automática
                const additionalUcc = diffMinutes * fds;
                this._state.dailyStats.bonusUccElapsed = Number(((this._state.dailyStats.bonusUccElapsed || 0) + additionalUcc).toFixed(2));
                
                console.log(`[UCC Interceptor] [BÔNUS - CAMADA 2] +${diffMinutes.toFixed(2)} min estudados com FDS ${fds} -> +${additionalUcc.toFixed(2)} UCC adicionadas ao bônus. Total bônus hoje: ${this._state.dailyStats.bonusUccElapsed} UCC.`);
            } else {
                // Determina o FDS com base no modo ativo e no bloco em execução
                const mode = this._state.salaMode || "guided";
                if (mode === "free" || mode === "reading") {
                    fds = 0.3; // Leitura e treino livre vão para o bônus direto
                    const additionalUcc = diffMinutes * fds;
                    this._state.dailyStats.bonusUccElapsed = Number(((this._state.dailyStats.bonusUccElapsed || 0) + additionalUcc).toFixed(2));
                    
                    console.log(`[UCC Interceptor] [BÔNUS - LIVRE/LEITURA] +${diffMinutes.toFixed(2)} min com FDS ${fds} -> +${additionalUcc.toFixed(2)} UCC bônus. Total bônus hoje: ${this._state.dailyStats.bonusUccElapsed} UCC.`);
                } else {
                    // Cálculo normal dos blocos da Camada 1 (Base)
                    if (mode === "sandwich") {
                        fds = 1.8;
                    } else if (mode === "random") {
                        fds = 1.0;
                    } else if (mode === "guided") {
                        const activeBlock = this._state.activeBlockId || this._state.currentBlock || "";
                        if (activeBlock.includes("block-a")) fds = 0.8;
                        else if (activeBlock.includes("block-b")) fds = 1.0;
                        else if (activeBlock.includes("block-c")) fds = 1.8;
                        else if (activeBlock.includes("block-d")) fds = 0.8;
                        else if (activeBlock.includes("block-e")) fds = 1.0;
                    }
                    
                    const additionalUcc = diffMinutes * fds;
                    this._state.dailyStats.uccConsumed = Number(((this._state.dailyStats.uccConsumed || 0) + additionalUcc).toFixed(2));
                    
                    console.log(`[UCC Interceptor] [BASE - CAMADA 1] +${diffMinutes.toFixed(2)} min com FDS ${fds} -> +${additionalUcc.toFixed(2)} UCC base. Total base hoje: ${this._state.dailyStats.uccConsumed} UCC.`);
                }
            }
        }
        // =========================================================================

        // --- Sincronização do Orquestrador Semanal em tempo real ---
        if (this._state.weeklyOrchestrator && this._state.dailyStats) {
            const now = new Date();
            const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const currentMinutesToday = this._state.dailyStats.focusMinutes || 0;
            
            // Correção: A matriz realCurve já é acumulada. Não aplique reduce sobre fatias.
            const previousDaysSum = currentDayIndex > 0 ? (this._state.weeklyOrchestrator.realCurve[currentDayIndex - 1] || 0) : 0;
                
            this._state.weeklyOrchestrator.realCurve[currentDayIndex] = previousDaysSum + currentMinutesToday;
            
            const idealToday = this._state.weeklyOrchestrator.idealCurve[currentDayIndex] || 1;
            const pace = this._state.weeklyOrchestrator.realCurve[currentDayIndex] / idealToday;
            this._state.weeklyOrchestrator.weeklyPace = Number(pace.toFixed(2));
        }

        this._recalculatePlayerLevel(); // Roda a interceptação síncrona de XP
        this.persistDebounced();
        if (!silent) {
            this._notify(actionLabel);
        }
        
        // 🚦 Liberação do Semáforo e processamento da fila concorrente
        this._isMutating = false;
        if (this._mutationQueue.length > 0) {
            const next = this._mutationQueue.shift();
            this.setState(next.updater, next.actionLabel, next.silent);
        }
    }

    persistDebounced() {
        if (this._persistTimeout) clearTimeout(this._persistTimeout);
        this._persistTimeout = setTimeout(() => {
            this.persistSync();
        }, 500);
    }

    persistSync() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
        } catch (e) {
            console.error("[StateManager] Erro ao persistir no localStorage:", e);
        }
    }

    subscribe(callback) {
        if (typeof callback === "function") {
            this._listeners.add(callback);
        }
        return () => this._listeners.delete(callback);
    }

    _notify(actionLabel) {
        const currentState = this.getState();
        this._listeners.forEach(listener => {
            try {
                listener(currentState, actionLabel);
            } catch (err) {
                console.error(`[StateManager] Erro no listener para ação "${actionLabel}":`, err);
            }
        });
    }

    exportSavegame() {
        return JSON.stringify(this.getState(), null, 2);
    }

    importSavegame(jsonString) {
        try {
            const parsed = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
            if (!parsed || typeof parsed !== "object") {
                throw new Error("JSON inválido");
            }
            if (parsed.activeTab === "blocos") {
                parsed.activeTab = "sala";
            }
            if (parsed.activeTab === "leitura") {
                parsed.activeTab = "sala";
                parsed.salaMode = "reading";
            }
            if (parsed.blocosMode && !parsed.salaMode) {
                parsed.salaMode = parsed.blocosMode;
                delete parsed.blocosMode;
            }
            this._state = sanitizeObjectStrings(deepMerge(DEFAULT_STATE, parsed));
            this._state.lastSaved = new Date().toISOString();
            this._recalculatePlayerLevel(); // Sincroniza o nível imediatamente após carregar backup
            this.persistSync();
            this._notify("RESTORE_SAVEGAME");
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    resetToDefaults() {
        // Clonagem profunda rigorosa também no reset de fábrica para manter a integridade
        this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.persistSync();
        this._notify("RESET_DEFAULTS");
    }

    _recalculatePlayerLevel() {
        const xp = this._state.xp || 0;
        
        // Tabela de progressão pedagógica da estante de piano baseada em mielinização
        const LEVEL_TABLE = [
            { level: 1, minXp: 0, maxXp: 499, title: "Iniciante Consciente", nextLevelXp: 500 },
            { level: 2, minXp: 500, maxXp: 1199, title: "Arpejador Aprendiz", nextLevelXp: 1200 },
            { level: 3, minXp: 1200, maxXp: 2199, title: "Mielinizador Ativo", nextLevelXp: 2200 },
            { level: 4, minXp: 2200, maxXp: 3499, title: "Guerreiro Leitner", nextLevelXp: 3500 },
            { level: 5, minXp: 3500, maxXp: 4999, title: "Mestre do 1º Tiro", nextLevelXp: 5000 },
            { level: 6, minXp: 5000, maxXp: Infinity, title: "Soberano do Piano", nextLevelXp: Infinity }
        ];

        const currentLvlObj = this._state.playerLevel || { level: 1, title: "Iniciante Consciente" };
        const matched = LEVEL_TABLE.find(l => xp >= l.minXp && xp <= l.maxXp) || LEVEL_TABLE[0];

        // Se o jogador subiu de nível, dispara um toast visual de comemoração!
        if (this._initialized && matched.level > currentLvlObj.level) {
            setTimeout(() => {
                // 🛡️ Verificação de escopo em Tempo Real (Evita Memory Leaks e erros em importações em massa)
                if (window.App && typeof window.App.showToast === "function") {
                    window.App.showToast(`🎉 PARABÉNS! Você subiu para o Nível ${matched.level} — ${matched.title}!`, "success");
                }
                if (window.AudioTools && typeof window.AudioTools.playHitSound === "function") {
                    window.AudioTools.playHitSound();
                }
            }, 500);
        }

        this._state.playerLevel = {
            level: matched.level,
            title: matched.title,
            currentXp: xp,
            nextLevelXp: matched.nextLevelXp,
            streakDays: currentLvlObj.streakDays || 1,
            hasRestShield: currentLvlObj.hasRestShield !== undefined ? currentLvlObj.hasRestShield : true
        };
    }
} 

window.StateManager = new StateManagerClass();