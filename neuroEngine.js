/**
 * neuroEngine.js - Motor Neurocientífico, Preditor Adaptativo & Briefing Pedagógico
 * Painel de Estudos de Piano — Versão 15.1.0 (Corrigida)
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Algoritmo Leitner calibrado (Caixa 1 a 3 em consolidação, tag 'consolidated: true' apenas em Caixas 4 e 5)
 * - Saneamento total do IFM (calculateIFM): trechos virgens (lifetimeAttempts === 0) têm IFM neutro (1.0)
 * - Geração da Pipeline Diária com Bloco A liderando obrigatoriamente quando há auditorias pós-sono
 * - Bloco B ativado APENAS para trechos já tocados com falhas reais (slips > 0 ou assertividade < 70%)
 * - Bloco C (Aquisição Sanduíche) selecionando exclusivamente trechos inéditos em Caixa 0 (ex: 12.1.9-12)
 * - Bloco D com substituição dinâmica inteligente para Leitura à 1ª Vista (Faber Primer) quando Passo 2 aguarda validação
 * - Briefing Matinal integrando histórico de sessões anteriores e projeção adaptativa
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

const LEITNER_INTERVALS_DAYS = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
const MAX_DAILY_COLD_AUDITS = 6;

class NeuroEngineClass {
    constructor() {
        // Inscrição reativa determinística (Elimina Race Condition e vazamento de escopo)
        this._attachToBus();
    }

    _attachToBus() {
        if (!window.StateManager) {
            requestAnimationFrame(() => this._attachToBus());
            return;
        }
        
        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        window.StateManager.subscribe((state, actionLabel) => {
            if (actionLabel === "SESSION_FINISHED") {
                console.log("[NeuroEngine] Sinal SESSION_FINISHED capturado. Iniciando recálculo do P_score em segundo plano...");
                this.recalculateMetricsCache();
        --- FIM ORIGINAL --- */

        // --- NOVA LÓGICA (Gatilho Expandido para Modos Avulsos) ---
        window.StateManager.subscribe((state, actionLabel) => {
            const triggeringActions = [
                "SESSION_FINISHED",
                "FINISH_SANDWICH_SESSION",
                "FINISH_FREE_PRACTICE",
                "FINISH_RANDOM_SESSION"
            ];

            if (triggeringActions.includes(actionLabel)) {
                console.log(`[NeuroEngine] Sinal ${actionLabel} capturado. Iniciando recálculo preditivo do P_score...`);
                this.recalculateMetricsCache();
                
                // 🛡️ [CAMADA V] Conclui o estado de degelo se estiver ativo
                const currentState = window.StateManager.getState();
                if (currentState.thawRecoveryState && currentState.thawRecoveryState.active) {
                    window.StateManager.setState(prev => ({
                        thawRecoveryState: {
                            ...prev.thawRecoveryState,
                            completed: true
                        }
                    }), "THAW_RECOVERY_COMPLETED", true);
                    console.log("[NeuroEngine] Sessão de Degelo concluída com sucesso!");
                }
            }
        });
        
        // 🛡️ [CAMADA V] Inicialização e cálculo de inatividade (Boot)
        this._initializeThawRecovery();
    }

    _initializeThawRecovery() {
        const state = window.StateManager.getState();
        const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local format
        
        // Se o degelo já estiver ativo para hoje, ou se já foi concluído hoje, não recalcula
        if (state.thawRecoveryState && state.thawRecoveryState.activatedDate === today) {
            return;
        }
        
        const history = state.history || [];
        if (history.length === 0) return;
        
        const lastSessionDateStr = history[0] ? history[0].date : null;
        if (!lastSessionDateStr) return;
        
        // Cálculo vetorial Epoch UTC: Anula Time Shift e anomalias de Horário de Verão (DST)
        const todayEpoch = new Date(`${today}T12:00:00Z`).getTime();
        const lastSessionEpoch = new Date(`${lastSessionDateStr}T12:00:00Z`).getTime();
        
        const diffTime = todayEpoch - lastSessionEpoch;
        const missedDays = Math.max(0, Math.round(diffTime / 86400000));
        
        if (missedDays >= 2) {
            // Verifica se o cooldown de 14 dias foi respeitado (Apenas para Janela 1: 2-3 dias)
            let cooldownRespected = true;
            if (missedDays <= 3) {
                const lastThaw = state.thawRecoveryState ? state.thawRecoveryState.lastThawExecutionDate : null;
                if (lastThaw) {
                    const cooldownDiff = new Date(today) - new Date(lastThaw);
                    const cooldownDays = Math.floor(cooldownDiff / (1000 * 60 * 60 * 24));
                    if (cooldownDays < 14) {
                        cooldownRespected = false;
                    }
                }
            }
            
            let mode = "NONE";
            let isReadinessGate = false;
            let targetMinutes = 20;
            
            if (missedDays >= 2 && missedDays <= 3) {
                if (cooldownRespected) {
                    mode = "FULL_IMMUNITY";
                    isReadinessGate = true; // [CAMADA V.B] Ativa o teste de diagnóstico (D0)
                    targetMinutes = 45;     // Executa a sessão nominal completa de 45min
                } else {
                    mode = "NONE";
                }
            } else if (missedDays >= 4 && missedDays <= 6) {
                mode = "SOFT_REGRESSION";
                isReadinessGate = false;
                targetMinutes = 20; // Janela 2: Sem teste, cai direto no Amortecimento preventivo
            } else if (missedDays >= 7) {
                mode = "NONE"; // Queda normal para Caixa 1
            }
            
            window.StateManager.setState({
                thawRecoveryState: {
                    ...state.thawRecoveryState,
                    active: mode !== "NONE",
                    missedDays: missedDays,
                    mode: mode,
                    activatedDate: today,
                    targetMinutes: targetMinutes,
                    completed: false,
                    isReadinessGate: isReadinessGate,
                    diagnosticPassed: null,
                    amortizationActive: false,
                    amortizationDaysRemaining: 0,
                    sessionSecondsElapsed: 0
                }
            }, "BOOT_THAW_RECOVERY_ACTIVATED", true);
            
            console.log(`[NeuroEngine] Alerta de Inatividade: ${missedDays} dias. Modo de Degelo: ${mode} | Readiness Gate: ${isReadinessGate}.`);
        }
    }
    calculateNextReviewDate(box) {
        const daysToAdd = LEITNER_INTERVALS_DAYS[box] || 1;
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        return date.toLocaleDateString('sv-SE');
    }
    calculateIFM(trecho) {
        if (!trecho) return 1.0;
        // CORREÇÃO CRÍTICA V15: Trechos virgens sem tentativas sempre retornam IFM neutro
        const attempts = trecho.lifetimeAttempts || 0;
        if (attempts === 0) return 1.0;

        const hits = trecho.lifetimeHits || 0;
        const slips = trecho.slips || 0;
        const tagsCount = (trecho.difficultyTags || []).length;

        const failureRatio = attempts / Math.max(1, hits);
        const ifm = (failureRatio * (1 + slips * 0.5)) + (tagsCount * 0.25);
        return Number(ifm.toFixed(2));
        }
        // --- COBIÇADA MATEMÁTICA DA CAMADA IV (PSCORE NORMALIZADO) ---
        calculatePScoreData(piece, trecho) {
        if (!trecho) {
            return { pScore: 0.0, normLag: 0.0, normIFM: 0.0, normBias: 0.0, normUrgency: 0.0 };
        }

        // 1. Lag Normalizado (Atraso): Máximo de 1.0 atingido em 14 dias de atraso
        let lagDays = 0;
        if (trecho.nextReviewDate) {
            const today = new Date().toLocaleDateString('sv-SE');
            const diffTime = new Date(today) - new Date(trecho.nextReviewDate);
            lagDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            
            // 🛡️ [CAMADA V] Congela a penalidade de lag para trechos represados durante o degelo
            const state = window.StateManager ? window.StateManager.getState() : {};
            if (state.thawRecoveryState && state.thawRecoveryState.active) {
                lagDays = 0;
            }
        }
        const normLag = Math.min(1.0, lagDays / 14);

        // 2. IFM Normalizado (Fragilidade Mecânica): Curva sigmoide de amortecimento logístico
        const rawIFM = this.calculateIFM(trecho);
        const normIFM = 1.0 - (1.0 / (1.0 + Math.pow(rawIFM / 3.0, 2)));

        // 3. Bias Normalizado (Negligência / Viés Anti-Da Capo): Peso relativo contra a prática da peça
        const trechos = piece.trechos || [];
        const trechoTime = trecho.totalPracticeSeconds || 0;
        const totalPieceTime = trechos.reduce((sum, t) => sum + (t.totalPracticeSeconds || 0), 0);
        let normBias = 0.0;
        if (totalPieceTime > 0) {
            normBias = 1.0 - (trechoTime / totalPieceTime);
        }

        // 4. Urgência Normalizada (Status Leitner): Proporcional à proximidade do vencimento
        let normUrgency = 0.0;
        if (trecho.nextReviewDate && trecho.box !== undefined) {
            const today = new Date().toLocaleDateString('sv-SE');
            const diffTime = new Date(trecho.nextReviewDate) - new Date(today);
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const interval = LEITNER_INTERVALS_DAYS[trecho.box] || 1;
            normUrgency = Math.max(0.0, 1.0 - (daysRemaining / interval));
        }

        // Cálculo ponderado: 35% Lag, 30% IFM, 20% Bias, 15% Urgency
        let pScore = 0.0;
        // Override equilibrado para Caixa 0 virgens: prioridade média para não ofuscar gargalos reais
        if ((trecho.box === 0 || trecho.box === undefined) && (trecho.lifetimeAttempts || 0) === 0) {
            pScore = 0.50;
        } else {
            pScore = (0.35 * normLag) + (0.30 * normIFM) + (0.20 * normBias) + (0.15 * normUrgency);
        }
        return {
            pScore: Number(Math.max(0.0, Math.min(1.0, pScore)).toFixed(4)),
            normLag: Number(normLag.toFixed(4)),
            normIFM: Number(normIFM.toFixed(4)),
            normBias: Number(normBias.toFixed(4)),
            normUrgency: Number(normUrgency.toFixed(4))
        };
    }

    // Método assíncrono disparado em segundo plano para persistir a matriz estática no StateManager
    recalculateMetricsCache() {
        const state = window.StateManager.getState();
        const activePieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        if (!activePieces || activePieces.length === 0) return;

        const metricsCache = {};

        activePieces.forEach(piece => {
            const trechos = piece.trechos || [];
            trechos.forEach(trecho => {
                const metrics = this.calculatePScoreData(piece, trecho);
                metricsCache[trecho.id] = {
                    pScore: metrics.pScore,
                    normLag: metrics.normLag,
                    normIFM: metrics.normIFM,
                    normBias: metrics.normBias,
                    normUrgency: metrics.normUrgency,
                    calculatedAt: new Date().toISOString()
                };
            });
        });

        window.StateManager.setState({ metricsCache }, "RECALCULATE_METRICS_CACHE", true); // silent = true para evitar loops infinitos de renderização
    }
    // 🧠 [CAMADA V - META 4.2.2] Heurística de Subsumção Recursiva de Chunks (Suporte a Overlap)
    isSubsumed(trecho, piece) {
        if (!trecho || !piece) return false;
        
        // Varredura Múltipla: Identifica TODOS os pais que englobam este microbloco (Sliding Window)
        const parentTrechos = (piece.trechos || []).filter(t => 
            t.id === trecho.parent || 
            (t.baseBlockIds && t.baseBlockIds.includes(trecho.id)) ||
            (t.children && t.children.includes(trecho.id))
        );

        // NOVA LÓGICA: Se o pai (Passo 2) já entrou na rotina (Caixa 1+ ou já foi tentado), ele engole os filhos!
        // Eles só voltam para a Caixa 1 se o próprio Passo 2 for reprovado e sofrer "Fragmentação Reversa".
        return parentTrechos.some(parent => {
            if (parent.box >= 1 || parent.consolidated || (parent.lifetimeAttempts || 0) > 0) return true;
            return this.isSubsumed(parent, piece);
        });
    }

    getDueColdAudits(state) {
        // 🛡️ Permite que o laboratório de simulação injete um estado mockado; fallback para o SSOT real
        const pieces = (state && state.repertoire && state.repertoire.active) 
            ? state.repertoire.active 
            : (window.RepertoireManager ? window.RepertoireManager.getActivePieces() : []);
        const today = new Date().toLocaleDateString('sv-SE'); // Blindagem contra UTC Date Drift
        const dueList = [];
        pieces.forEach(piece => {
            if (piece.isPaused) return;
            (piece.trechos || []).forEach(trecho => {
                // Bloqueio de auditorias fantasmas: trechos sem tentativas históricas são ignorados
                const attempts = trecho.lifetimeAttempts || 0;
                if (attempts === 0) return;

                // 🧠 [CAMADA V - META 4.2.2] Aplica Filtro de Absorção: oculta o filho se o pai estiver maduro
                if (this.isSubsumed(trecho, piece)) {
                    console.log(`[Subsumção] Absorvido: Ocultando filho "${trecho.label}" da rotina.`);
                    return;
                }

                if (trecho.box >= 1 && (!trecho.nextReviewDate || trecho.nextReviewDate <= today)) {
                    dueList.push({
                        pieceId: piece.id,
                        pieceTitle: piece.title,
                        trecho,
                        ifm: this.calculateIFM(trecho)
                    });
                }
            });
        });
        // 🧠 FILTRO DE SUBSUNÇÃO PROFUNDA INTRADIA (Top-Down Deep Subsumption)
        // Varredura recursiva de linhagem: Mapeia pais, avôs e bisavôs
        const isDescendant = (childId, ancestorTrecho, piece) => {
            // 🛡️ CORREÇÃO CRÍTICA: Funde ativamente as matrizes para escapar do bug JS "Truthy Empty Array"
            const deps = [...(ancestorTrecho.baseBlockIds || []), ...(ancestorTrecho.children || [])];
            if (deps.includes(childId)) return true;
            return deps.some(depId => {
                const depTrecho = piece.trechos.find(t => t.id === depId);
                return depTrecho ? isDescendant(childId, depTrecho, piece) : false;
            });
        };

        const filteredDueList = dueList.filter(dueItem => {
            const piece = pieces.find(p => p.id === dueItem.pieceId);
            const hasActiveAncestor = dueList.some(potentialAncestor => {
                if (potentialAncestor.pieceId !== dueItem.pieceId) return false;
                if (potentialAncestor.trecho.id === dueItem.trecho.id) return false; // Impede auto-absorção
                return isDescendant(dueItem.trecho.id, potentialAncestor.trecho, piece);
            });
            return !hasActiveAncestor;
        });

        filteredDueList.sort((a, b) => b.ifm - a.ifm);
        return filteredDueList.slice(0, MAX_DAILY_COLD_AUDITS);
    }
        
        /*/ 🧠 NOVO: Same-Day Subsumption (Filtro de Hierarquia Intradia)
        // Se a macro-peça (Pai/Avô) foi escalada para hoje, extirpamos os micro-trechos filhos do mesmo dia.
        const filteredDueList = dueList.filter(dueItem => {
            const hasActiveAncestor = dueList.some(potentialAncestor => {
                if (potentialAncestor.pieceId !== dueItem.pieceId) return false;
                const ancTrecho = potentialAncestor.trecho;
                const deps = ancTrecho.baseBlockIds || ancTrecho.children || [];
                return deps.includes(dueItem.trecho.id);
            });
            return !hasActiveAncestor;
        });

        filteredDueList.sort((a, b) => b.ifm - a.ifm);
        return filteredDueList.slice(0, MAX_DAILY_COLD_AUDITS);
    }
    */
    generate7DayForecast(state) {
        const currentState = state || (window.StateManager ? window.StateManager.getState() : {});
        const forecastTasks = currentState.forecastTasks || {};
        const isDone = (id) => Boolean(forecastTasks[id]);
        const dayNames = ["Hoje", "Amanhã", "D+2", "D+3", "D+4", "D+5", "D+6"];
        const today = new Date();
        const forecast = [];

        // 1. GERA OU RECUPERA O PIPELINE ATIVO REAL DO DIA
        let todayBlocks = [];
        const sState = currentState.sessionState || {};
        if (sState.guidedActive && sState.guidedBlocks && sState.guidedBlocks.length > 0) {
            todayBlocks = sState.guidedBlocks;
        } else {
            todayBlocks = this.generateDailyPipeline();
        }

        // 2. MAPEIA OS BLOCOS DE EXECUÇÃO REAIS COM OS IDS CANÔNICOS DO COCKPIT
        const todayTasks = todayBlocks.map(b => {
            let forecastId = "";
            if (b.id === "block-a") forecastId = "d0-audit";
            else if (b.id === "block-b") forecastId = "d0-micro";
            else if (b.id === "block-c") forecastId = "d0-acquisition";
            else if (b.id === "block-d") {
                forecastId = b.isReading ? "d0-reading" : "d0-chain";
            } else if (b.id === "block-e") forecastId = "d0-tech";
            else forecastId = `d0-${b.id.replace("block-", "")}`;
            return {
                id: forecastId,
                blockId: b.id,
                label: b.title,
                done: isDone(forecastId)
            };
        });
        
        // Fixação de âncora cronológica imutável (Mitiga transbordamento de ponteiros V8)
        const canonicalTodayStr = today.toLocaleDateString('sv-SE');
        const baseEpoch = new Date(`${canonicalTodayStr}T12:00:00Z`).getTime();
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(baseEpoch + (i * 86400000));
            const isToday = i === 0;
            let tasks = [];

            if (isToday) {
                tasks = todayTasks;
            } else if (i === 1) {
                const auditLabel = isDone("d0-acquisition")
                    ? "Auditoria a Frio: 12.1.9-12"
                    : (isDone("d0-audit") ? "Auditoria a Frio (Caixa 2 Leitner)" : "Auditoria 1º Tiro (Bourrée 12.1.1-4)");
                
                const chainLabel = isDone("d0-audit")
                    ? "Encadeamento Passo 2 (Bourrée 12.2.1-8)"
                    : (isDone("d0-acquisition") ? "Aquisição Sanduíche: 12.1.9-12 (Round 2)" : "Aquisição Sanduíche (Bourrée 12.1.9-12)");
                
                const techLabel = isDone("d0-tech")
                    ? "Técnica: Movimento Contrário Dó M"
                    : "Técnica: Escala Fá# M & Arpejos nos 12 Tons";

                tasks = [
                    { id: "d1-audit", label: auditLabel, done: false },
                    { id: "d1-chain", label: chainLabel, done: false },
                    { id: "d1-tech", label: techLabel, done: false }
                ];
            } else if (i === 2) {
                const testLabel = isDone("d0-acquisition") ? "Teste D+2 (Caixa 2 Leitner: 12.1.9-12)" : "Teste D+2 (Caixa 2 Leitner)";
                const acqLabel = isDone("d0-acquisition") ? "Aquisição: Bourrée 12.1.13-16" : "Aquisição: Bourrée 12.1.9-12";
                const readLabel = isDone("d0-reading") ? "Leitura Primer: Exercício 2/5 da semana" : "Leitura Primer: Exercício 1/5 (One-Shot)";

                tasks = [
                    { id: "d2-test", label: testLabel, done: false },
                    { id: "d2-acquisition", label: acqLabel, done: false },
                    { id: "d2-reading", label: readLabel, done: false }
                ];
            } else if (i === 3) {
                tasks = [
                    { id: "d3-audit", label: isDone("d0-acquisition") ? "Auditoria 1º Tiro (12.1.13-16)" : "Auditoria a Frio (12.1.9-12)", done: false },
                    { id: "d3-chain", label: "Encadeamento Passo 2 (12.2.9-16)", done: false },
                    { id: "d3-interleaving", label: "Sorteio Intercalado de Consolidação", done: false }
                ];
            } else if (i === 4) {
                tasks = [
                    { id: "d4-review", label: "Revisão Espaçada Caixa 3 (D+4)", done: false },
                    { id: "d4-acquisition", label: "Aquisição: Bourrée 12.1.17-20", done: false },
                    { id: "d4-tech", label: "Laboratório Técnico: UTI c. 7", done: false }
                ];
            } else if (i === 5) {
                tasks = [
                    { id: "d5-review", label: "Revisão Espaçada Leitner (Caixa 4)", done: false },
                    { id: "d5-interleaving", label: "Sorteio Intercalado & Leitura Primer", done: false }
                ];
            } else if (i === 6) {
                tasks = [
                    { id: "d6-full", label: "Simulação de Concerto / Gravação Completa (Passo 4)", done: false },
                    { id: "d6-audit", label: "Auditoria Geral Pré-Descanso", done: false }
                ];
            }

            let estMinutes = i % 2 === 0 ? 35 : 40;
            if (isToday) {
                // 🛡️ [CAMADA V] Calcula o tempo real dinâmico com base nos blocos prescritos ativos para hoje
                const activePipeline = this.generateDailyPipeline();
                estMinutes = activePipeline.reduce((acc, b) => acc + (b.targetMinutes || 0), 0);
            }

            forecast.push({
                index: i,
                dayLabel: dayNames[i],
                dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
                isToday,
                estMinutes: estMinutes,
                tasks
            });
        }
        return forecast;
    }

    generateMorningBriefing(state) {
        const currentState = state || (window.StateManager ? window.StateManager.getState() : {});
        const history = currentState.history || [];
        const dueAudits = this.getDueColdAudits();
        const activePieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        const focusPiece = activePieces && activePieces.length > 0 ? activePieces[0].title : "12. Bourrée — Ya. Sen-Lyuk";
        const isThawActive = currentState.thawRecoveryState && currentState.thawRecoveryState.active;
        const thaw = currentState.thawRecoveryState || {};
        
        let retrospective = "Marco Zero: Sistema pronto para primeira calibração.";
        let justification = dueAudits.length > 0
            ? `Prioridade soberana para auditoria a frio pós-sono (${dueAudits.length} trecho(s) pendente(s) de validação de 1º tiro). Bloco B em stand-by (0 min), podendo ser ativado dinamicamente caso ocorram hesitações.`
            : "Foco primário em aquisição de novos microblocos em Caixa 0 e manutenção técnica (sem auditorias a frio pendentes hoje).";
        let projection = "Ao acertar no 1º tiro do Bloco A, os microblocos avançam para a Caixa 2 (D+2) e liberam o encadeamento de Passo 2 na esteira de amanhã.";

        if (isThawActive) {
            if (thaw.isReadinessGate) {
                // 🛡️ [CAMADA V.B] Briefing no Dia do Teste Diagnosticador (D0)
                justification = `Detectamos um intervalo de inatividade de <strong>${thaw.missedDays} dias</strong>. Iniciamos a sua <strong>Sessão de Diagnóstico de Prontidão (Dia D0)</strong>. Hoje, sua rotina mantém os 45 minutos nominais normais para testar a resistência física da sua memória motora e mielina no teclado.`;
                retrospective = `Retorno ativo. Suas Caixas Leitner estão sob o escudo de <strong>Imunidade Total</strong> hoje para que você execute as auditorias do Bloco A sem o medo de rebaixamentos causados pelo frio do hiato.`;
                projection = `Seu percentual de acertos no Bloco A decidirá o fluxo de amanhã: taxa de erro igual ou menor que 30% mantém o regime nominal; acima disso, ativaremos o Amortecimento Biológico (meta de 20 min).`;
            } else if (thaw.amortizationActive) {
                // 🛡️ [CAMADA V.B] Briefing nos Dias de Amortecimento Ativo (D+1 e D+2)
                justification = `Sessão sob o regime de <strong>Amortecimento Biológico (Dia ${3 - thaw.amortizationDaysRemaining} de 2)</strong>. O teste de prontidão do Dia 0 identificou instabilidade mecânica. Reduzimos sua carga para 20 minutos cravados focando apenas em reabilitação neuromuscular suave, sem novas aquisições.`;
                retrospective = `A sua performance no teste de ontem indicou fadiga/esquecimento parcial. Para blindar suas articulações contra lesões e evitar vícios motores no andamento alvo, aplicamos o amortecimento controlado de metas.`;
                projection = `Foco em consolidar os microblocos atuais com movimentos calmos. Restam mais <strong>${thaw.amortizationDaysRemaining} dia(s)</strong> sob amortecimento de carga.`;
            } else {
                // Modo Janela 2 Direto (Ausências de 4 a 6 dias)
                justification = `Retorno de hiato prolongado (<strong>${thaw.missedDays} dias</strong>). Para proteger seu tônus muscular fino, pulamos o teste de prontidão e ativamos o <strong>Amortecimento Biológico Direto (Modo Regressão Suave)</strong>: meta de 20 min ativa hoje.`;
                retrospective = `Ausências longas enfraquecem reflexos dinâmicos. Evitamos sobrecarga nas mãos hoje para reabilitar de forma gradual e segura.`;
                projection = `Amanhã avaliaremos se a sua biomecânica já está estável o suficiente para a transição gradual para o regime nominal de prática.`;
            }
        } else if (history && history.length > 0) {
            // Lógica Nominal Padrão com Sanitização de Variáveis
            const targetDate = history[0].date;
            const dateObj = new Date(targetDate + "T00:00:00");
            const dateFmt = isNaN(dateObj.getTime()) ? targetDate : dateObj.toLocaleDateString('pt-BR');
            
            const daySessions = history.filter(h => h.date === targetDate);
            const totalMinutes = daySessions.reduce((acc, h) => acc + (h.durationMinutes || 0), 0);
            const avgAccuracy = Math.round(daySessions.reduce((acc, h) => acc + (h.accuracyPct || 100), 0) / daySessions.length);
            
            const piecesPlayedArr = [...new Set(daySessions.map(h => h.pieceId).filter(Boolean))];
            const piecesPlayed = piecesPlayedArr.length > 0 ? piecesPlayedArr.join(", ") : "Repertório e Técnica";
            
            retrospective = `Na sua última jornada de prática ativa (${dateFmt}), você dedicou um volume de ~${totalMinutes} minutos em estudos focalizados de [${piecesPlayed}], sustentando uma assertividade geral de ${avgAccuracy}%.`;
        }
        return { retrospective, justification, projection };
    }

/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    generateDailyPipeline() {
        const state = window.StateManager.getState();
        const pieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        const dueAudits = this.getDueColdAudits();
        const blocks = [];
    --- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Memoização por Referência Imutável) ---
    generateDailyPipeline() {
        const state = window.StateManager.getState();
        
        // 🚀 Otimização de CPU: Retorna o cache imediatamente se a árvore de estado for a mesma
        if (this._cachedPipeline && this._lastStateRef === state) {
            return this._cachedPipeline;
        }

        const pieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        const dueAudits = this.getDueColdAudits();
        const blocks = [];
        // --- CONJUNTO DE EXCLUSÃO MÚTUA (TAREFA 3.3.1) ---
        const allocatedTrechoIds = new Set();

        // 🛡️ [CAMADA V] Se a Sessão de Degelo estiver ativa, monta o pipeline curto de 20 minutos
        // Mas se hoje for dia de Diagnóstico/Readiness Gate, executamos o pipeline nominal completo (45min)
        const isThawActive = state.thawRecoveryState && state.thawRecoveryState.active;
        const isReadinessGate = state.thawRecoveryState && state.thawRecoveryState.isReadinessGate;

        if (isThawActive && !isReadinessGate) {
            let activeAudits = [...dueAudits];
            
            // Ordena pelo normIFM do metricsCache para priorizar trechos frágeis
            const cache = state.metricsCache || {};
            activeAudits.sort((a, b) => {
                const scoreA = cache[a.trecho.id]?.normIFM || a.ifm || 0;
                const scoreB = cache[b.trecho.id]?.normIFM || b.ifm || 0;
                return scoreB - scoreA;
            });
            
            // Teto rígido de vazão de 4 auditorias
            activeAudits = activeAudits.slice(0, 4);
            
            // 1. Bloco A: Auditoria leve (Caixas protegidas)
            if (activeAudits.length > 0) {
                const topAudit = activeAudits[ 0 ]; // 🛡️ Blindado com espaço interno para evitar conflito com interpretador
                const auditLabels = activeAudits.map(a => a.trecho.label).join(", ");                blocks.push({
                    id: "block-a",
                    tag: "Bloco A",
                    title: activeAudits.length === 1
                        ? `❄️ Auditoria de Degelo — ${topAudit.trecho.label}`
                        : `❄️ Auditoria de Degelo (${activeAudits.length} trechos: ${auditLabels})`,
                    pedagogicalRationale: `Sessão de Degelo: Auditoria de reconexão biológica com teto de 4 trechos. Caixas protegidas.`,
                    targetMinutes: 8,
                    audits: activeAudits,
                    pieceId: topAudit.pieceId,
                    trechoId: topAudit.trecho.id,
                    inactive: false
                });
            } else {
                blocks.push({
                    id: "block-a",
                    tag: "Bloco A",
                    title: "❄️ Auditoria de Degelo — [Nenhuma Pendente]",
                    pedagogicalRationale: "Sessão de Degelo: Nenhum trecho necessita de auditoria hoje.",
                    targetMinutes: 8,
                    inactive: true
                });
            }
            
            // 2. Bloco B: Técnica Neutra de Reativação Física
            blocks.push({
                id: "block-b",
                tag: "Bloco B",
                title: "🛠️ Reativação Muscular Suave",
                pedagogicalRationale: "Estudo lento de aquecimento térmico neutro para restabelecer a propriocepção fina.",
                targetMinutes: 6,
                inactive: false
            });
            
            // 3. Bloco E: Bloco Técnico (Manutenção leve)
            blocks.push({
                id: "block-e",
                tag: "Bloco E",
                title: "⚙️ Bloco Técnico (Manutenção)",
                pedagogicalRationale: "Revisão leve de escalas consolidadas de Caixa Alta sem sobrecarga.",
                targetMinutes: 6,
                techRoutine: this.getBalancedTechRoutine(state),
                inactive: false
            });
            
            return blocks;
        }
        // ==========================================
        // ⚙️ COMPENSAÇÃO DINÂMICA DE CARGA (WORKLOAD SCALING - SPRINT 7)
        // ==========================================
        let weeklyScalingFactor = 1.0;
        let workloadNote = "Foco Nominal";
        
        if (state.weeklyOrchestrator) {
            const orch = state.weeklyOrchestrator;
            const now = new Date();
            const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Segunda, 6 = Domingo
            
            if (currentDayIndex > 0) {
                const previousDaysReal = orch.realCurve[currentDayIndex - 1] || 0;
                const previousDaysIdeal = orch.idealCurve[currentDayIndex - 1] || 0;
                const deficit = previousDaysIdeal - previousDaysReal;
                
                if (deficit < 0) {
                    // Aluno adiantado -> Crédito de tempo gera amortização para hoje
                    const surplus = -deficit;
                    weeklyScalingFactor = Math.max(0.5, 1 - (surplus / 120)); // Proteção mecânica: limite de 50%
                    workloadNote = `Amortização Ativa (-${Math.round((1 - weeklyScalingFactor) * 100)}% por crédito acumulado de ${surplus} min)`;
                } else if (deficit > 0) {
                    // Aluno atrasado -> Aumento seguro e gradual para reequilibrar
                    weeklyScalingFactor = Math.min(1.20, 1 + (deficit / 150)); // Proteção biológica: limite de +20%
                    workloadNote = `Aceleração Segura (+${Math.round((weeklyScalingFactor - 1) * 100)}% por déficit de ${deficit} min)`;
                }
            }
        }
        console.log(`[Orquestrador] Status de Carga: ${workloadNote}. Multiplicador: ${weeklyScalingFactor.toFixed(2)}x.`);

        // 1. Bloco A: Auditoria a Frio de 1º Tiro (Todos os trechos devidos pós-sono)
        if (dueAudits.length > 0) {
            dueAudits.forEach(a => {
                if (a.trecho && a.trecho.id) allocatedTrechoIds.add(a.trecho.id);
            });

            const topAudit = dueAudits[0]; // Captura segura do primeiro item para metadados
            const auditLabels = dueAudits.map(a => a.trecho.label).join(", ");
            const title = dueAudits.length === 1
                ? `❄️ Auditoria a Frio — ${topAudit.trecho.label}`
                : `❄️ Auditoria a Frio (${dueAudits.length} trechos: ${auditLabels})`;

            blocks.push({
                id: "block-a",
                tag: "Bloco A",
                title: title,
                pedagogicalRationale: `Teste de retenção pós-sono sem aquecimento prévio (1º tiro) para ${dueAudits.length} trecho(s) de ontem: ${auditLabels}. [${workloadNote}]`,
                targetMinutes: Math.max(3, Math.round(Math.max(5, dueAudits.length * 2) * weeklyScalingFactor)),
                audits: dueAudits,
                pieceId: topAudit.pieceId,
                trechoId: topAudit.trecho.id,
                inactive: false
            });
        } else {
            // Placeholder fixo inativo para Bloco A se não houver pendências
            blocks.push({
                id: "block-a",
                tag: "Bloco A",
                title: "❄️ Auditoria a Frio — [Nenhuma Pendente]",
                pedagogicalRationale: `Nenhum trecho do acervo precisa de auditoria pós-sono hoje. [${workloadNote}]`,
                targetMinutes: Math.max(3, Math.round(5 * weeklyScalingFactor)),
                inactive: true
            });
        }
        // 2. Bloco B: Micro-Reparo de Gargalo (Ativação Intradia e Suporte Pedagógico - TAREFA 3.3.2)
        const auditsFailed = (state.sessionState && state.sessionState.auditsFailed) || [];
        let bBlockPieceId = null;
        let bBlockTrechoId = null;
        let bBlockTitle = "🛠️ Micro-Reparo — [Aguardando Bloco A]";
        let bBlockRationale = "Ativação automática caso ocorra alguma hesitação ou erro na auditoria do Bloco A hoje.";
        let bBlockInactive = true;

        if (auditsFailed.length > 0) {
            // Se houver falhas registradas na sessão de hoje, o Bloco B acende dinamicamente com a primeira falha
            const failedId = auditsFailed[0];
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
            bBlockPieceId = failedPiece ? failedPiece.id : null;
            bBlockTrechoId = failedId;
            bBlockTitle = `🛠️ Micro-Reparo — ${failedTrecho ? failedTrecho.label : failedId}`;
            bBlockRationale = `Foco imediato no gargalo com erro/hesitação detectado na auditoria do Bloco A hoje. [${workloadNote}]`;
            bBlockInactive = false;
            allocatedTrechoIds.add(failedId);
        } else if (dueAudits.length === 0) {
            // Se NÃO houver Auditoria a Frio prescrita hoje, podemos acender o Bloco B com um gargalo histórico!
            let hasRealGargalo = false;
            let gargaloTrecho = null;
            let gargaloPiece = null;

            pieces.forEach(p => {
                if (p.isPaused) return;
                (p.trechos || []).forEach(t => {
                    if (allocatedTrechoIds.has(t.id)) return;
                    const attempts = t.lifetimeAttempts || 0;
                    if (attempts === 0) return;

                    const hits = t.lifetimeHits || 0;
                    const isSlip = (t.slips || 0) > 0;
                    const isLowAccuracy = (attempts >= 3) && ((hits / attempts) < 0.70);

                    if ((isSlip || isLowAccuracy || t.isCorrectingHabit) && !gargaloTrecho) {
                        hasRealGargalo = true;
                        gargaloTrecho = t;
                        gargaloPiece = p;
                    }
                });
            });

            if (hasRealGargalo && gargaloTrecho && gargaloPiece) {
                bBlockPieceId = gargaloPiece.id;
                bBlockTrechoId = gargaloTrecho.id;
                bBlockTitle = `🛠️ Micro-Reparo — ${gargaloTrecho.label}`;
                bBlockRationale = `Desconstrução em andamento ultralento de passagem com hesitação motora real comprovada. [${workloadNote}]`;
                bBlockInactive = false;
                allocatedTrechoIds.add(gargaloTrecho.id);
            }
        }

        blocks.push({
            id: "block-b",
            tag: "Bloco B",
            title: bBlockTitle,
            pedagogicalRationale: bBlockRationale,
            targetMinutes: Math.max(4, Math.round(8 * weeklyScalingFactor)), // 🛡️ Escalonamento dinâmico com piso de 4 min
            pieceId: bBlockPieceId,
            trechoId: bBlockTrechoId,
            inactive: bBlockInactive
        });

        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // 3. Bloco C: Aquisição (Modo Sanduíche)
        let candidateTrecho = null;
        let candidatePiece = null;
        // Procura trechos em Caixa 0 e sem tentativas (Passo 1), excluindo alocados
        for (const p of pieces) {
            if (p.isPaused) continue;
            const t = (p.trechos || []).find(tr => 
                tr.passo === 1 && 
                (tr.box === 0 || tr.box === undefined) && 
                (tr.lifetimeAttempts || 0) === 0 &&
                !allocatedTrechoIds.has(tr.id)
            );
            if (t) {
                candidateTrecho = t;
                candidatePiece = p;
                break;
            }
        }
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Heurística de Agrupamento de Irmãos) ---
        // 3. Bloco C: Aquisição (Modo Sanduíche)
        let candidateTrecho = null;
        let candidatePiece = null;
        // Procura trechos em Caixa 0 e sem tentativas (Passo 1), excluindo alocados
        let step1Candidates = [];
        for (const p of pieces) {
            if (p.isPaused) continue;
            const virgins = (p.trechos || []).filter(tr => 
                tr.passo === 1 && 
                (tr.box === 0 || tr.box === undefined) && 
                (tr.lifetimeAttempts || 0) === 0 &&
                !allocatedTrechoIds.has(tr.id)
            );
            
            // Avalia Prioridade Magnética: Se o irmão deste trecho já está no Leitner, forçamos o estudo deste
            virgins.forEach(v => {
                let priority = 0;
                const parent = (p.trechos || []).find(t => t.id === v.parent);
                if (parent && parent.baseBlockIds) {
                    const siblings = parent.baseBlockIds.filter(id => id !== v.id);
                    siblings.forEach(sibId => {
                        const sibling = (p.trechos || []).find(t => t.id === sibId);
                        if (sibling && (sibling.box > 0 || sibling.lifetimeAttempts > 0)) {
                            priority += 10; // Ativação de pareamento de nós irmãos
                        }
                    });
                }
                step1Candidates.push({ piece: p, trecho: v, priority });
            });
        }
        
        if (step1Candidates.length > 0) {
            step1Candidates.sort((a, b) => b.priority - a.priority);
            candidateTrecho = step1Candidates[0].trecho;
            candidatePiece = step1Candidates[0].piece;
        }

/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // Procura trechos em Caixa 0 e sem tentativas (Passo 2), excluindo alocados
        if (!candidateTrecho) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    tr.passo === 2 && 
                    (tr.box === 0 || tr.box === undefined) && 
                    (tr.lifetimeAttempts || 0) === 0 &&
                    !allocatedTrechoIds.has(tr.id)
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        // Procura trechos com box < 4 e não consolidados, excluindo alocados
        if (!candidateTrecho) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    tr.box < 4 && 
                    !tr.consolidated &&
                    !allocatedTrechoIds.has(tr.id)
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        // Fallback: Procura qualquer trecho ativo não alocado hoje
        if (!candidateTrecho && pieces.length > 0) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => !allocatedTrechoIds.has(tr.id));
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
--- FIM ORIGINAL --- */

/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // Procura trechos em Caixa 0 e sem tentativas (Passo 2), excluindo alocados
        if (!candidateTrecho) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    tr.passo === 2 && 
                    (tr.box === 0 || tr.box === undefined) && 
                    (tr.lifetimeAttempts || 0) === 0 &&
                    !allocatedTrechoIds.has(tr.id) &&
                    (window.RepertoireManager && window.RepertoireManager.isPasso2Unlocked(p.id, tr.id)) // 🔒 TRAVA DE INTEGRIDADE
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        // Procura trechos com box < 4 e não consolidados, excluindo alocados
        if (!candidateTrecho) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    tr.box < 4 && 
                    !tr.consolidated &&
                    !allocatedTrechoIds.has(tr.id) &&
                    (tr.passo < 2 || (window.RepertoireManager && window.RepertoireManager.isPasso2Unlocked(p.id, tr.id))) // 🔒 TRAVA DE INTEGRIDADE
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        // Fallback: Procura qualquer trecho ativo não alocado hoje
        if (!candidateTrecho && pieces.length > 0) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    !allocatedTrechoIds.has(tr.id) &&
                    (tr.passo < 2 || (window.RepertoireManager && window.RepertoireManager.isPasso2Unlocked(p.id, tr.id))) // 🔒 TRAVA DE INTEGRIDADE
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Escalabilidade N-Passos) ---
        // Procura trechos em Caixa 0 e sem tentativas (Passo 2+), excluindo alocados
        if (!candidateTrecho) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    tr.passo >= 2 && 
                    (tr.box === 0 || tr.box === undefined) && 
                    (tr.lifetimeAttempts || 0) === 0 &&
                    !allocatedTrechoIds.has(tr.id) &&
                    (window.RepertoireManager && window.RepertoireManager.isPrerequisiteMet(p.id, tr.id)) // 🔒 TRAVA DE INTEGRIDADE
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        // Procura trechos com box < 4 e não consolidados, excluindo alocados
        if (!candidateTrecho) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    tr.box < 4 && 
                    !tr.consolidated &&
                    !allocatedTrechoIds.has(tr.id) &&
                    (tr.passo < 2 || (window.RepertoireManager && window.RepertoireManager.isPrerequisiteMet(p.id, tr.id))) // 🔒 TRAVA DE INTEGRIDADE
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        // Fallback: Procura qualquer trecho ativo não alocado hoje
        if (!candidateTrecho && pieces.length > 0) {
            for (const p of pieces) {
                if (p.isPaused) continue;
                const t = (p.trechos || []).find(tr => 
                    !allocatedTrechoIds.has(tr.id) &&
                    (tr.passo < 2 || (window.RepertoireManager && window.RepertoireManager.isPrerequisiteMet(p.id, tr.id))) // 🔒 TRAVA DE INTEGRIDADE
                );
                if (t) {
                    candidateTrecho = t;
                    candidatePiece = p;
                    break;
                }
            }
        }
        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // Fallback físico supremo (Se tudo estiver alocado, pega o primeiro trecho da lista)
        if (!candidateTrecho && pieces.length > 0) {
            candidatePiece = pieces[0];
            candidateTrecho = (candidatePiece.trechos && candidatePiece.trechos[0]) || { id: "12.1.9-12", label: "12.1.9-12" };
        }
        if (candidateTrecho) {
            allocatedTrechoIds.add(candidateTrecho.id);
        }
        blocks.push({
            id: "block-c",
            tag: "Bloco C",
            title: `🎯 Aquisição Sanduíche — ${candidatePiece ? candidatePiece.title.split('—')[0].trim() : 'Repertório'} (${candidateTrecho ? candidateTrecho.label : '12.1.9-12'})`,
            pedagogicalRationale: `Construção de mielina com 3 rounds de 3 acertos seguidos e intervalo de desativação motora. [${workloadNote}]`,
            targetMinutes: Math.max(8, Math.round(15 * weeklyScalingFactor)), // 🛡️ Escalonamento dinâmico com piso de 8 min
            pieceId: candidatePiece ? candidatePiece.id : "p12",
            trechoId: candidateTrecho ? candidateTrecho.id : "12.1.9-12",
            inactive: false
        });
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Fome de Dados Funcional) ---
        if (candidateTrecho) {
            allocatedTrechoIds.add(candidateTrecho.id);
            blocks.push({
                id: "block-c",
                tag: "Bloco C",
                title: `🎯 Aquisição Sanduíche — ${candidatePiece.title.split('—')[0].trim()} (${candidateTrecho.label})`,
                pedagogicalRationale: `Construção de mielina com 3 rounds de 3 acertos seguidos e intervalo de desativação motora. [${workloadNote}]`,
                targetMinutes: Math.max(8, Math.round(15 * weeklyScalingFactor)),
                pieceId: candidatePiece.id,
                trechoId: candidateTrecho.id,
                inactive: false
            });
        } else {
            blocks.push({
                id: "block-c",
                tag: "Bloco C",
                title: "🎯 Aquisição Sanduíche — [Aguardando Desbloqueio]",
                pedagogicalRationale: `Nenhum trecho inédito desbloqueado disponível na fila. Foco repassado para auditoria e revisão. [${workloadNote}]`,
                targetMinutes: Math.max(8, Math.round(15 * weeklyScalingFactor)),
                inactive: true
            });
        }

        // 4. Bloco D: Encadeamento Just-in-Time (Passo 2) se desbloqueado, ou Leitura à 1ª Vista (Faber Primer)
/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        let unlockedPasso2 = null;
        for (const p of pieces) {
            if (p.isPaused) continue;
            for (const t of (p.trechos || [])) {
                if (t.passo >= 2 && 
                    !allocatedTrechoIds.has(t.id) && 
                    window.RepertoireManager && 
                    window.RepertoireManager.isPasso2Unlocked(p.id, t.id)) {
                    unlockedPasso2 = { piece: p, trecho: t };
                    break;
                }
            }
            if (unlockedPasso2) break;
        }
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Refatoração Semântica N-Passos) ---
        let unlockedMacroBlock = null;
        for (const p of pieces) {
            if (p.isPaused) continue;
            for (const t of (p.trechos || [])) {
                if (t.passo >= 2 && 
                    !allocatedTrechoIds.has(t.id) && 
                    window.RepertoireManager && 
                    window.RepertoireManager.isPrerequisiteMet(p.id, t.id)) {
                    unlockedMacroBlock = { piece: p, trecho: t };
                    break;
                }
            }
            if (unlockedMacroBlock) break;
        }

        if (unlockedMacroBlock) {
            allocatedTrechoIds.add(unlockedMacroBlock.trecho.id);
            blocks.push({
                id: "block-d",
                tag: "Bloco D",
                title: `🔗 Encadeamento JIT — ${unlockedMacroBlock.piece.title.split('—')[0].trim()} (${unlockedMacroBlock.trecho.label})`,
                pedagogicalRationale: `Passo 2 Ativo: Fusão motora de microblocos consolidados em frase musical completa. [${workloadNote}]`,
                targetMinutes: Math.max(6, Math.round(12 * weeklyScalingFactor)), // 🛡️ Escalonamento dinâmico com piso de 6 min
                pieceId: unlockedMacroBlock.piece.id,
                trechoId: unlockedMacroBlock.trecho.id,
                inactive: false
            });
        } else {
            blocks.push({
                id: "block-d",
                tag: "Bloco D",
                title: "📖 Leitura à 1ª Vista (Faber Primer One-Shot)",
                pedagogicalRationale: `Passo 2 aguardando validação pós-sono do Bloco A: desenvolvimento reflexo sem memorização no Acervo Primer 299. [${workloadNote}]`,
                targetMinutes: Math.max(6, Math.round(12 * weeklyScalingFactor)), // 🛡️ Escalonamento dinâmico com piso de 6 min
                isReading: true,
                inactive: false
            });
        }
        
/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // 🧠 NOVO Bloco F (Reading Fixo Diário): Inserção de Leitura Estruturada Pré-Técnica
        if (unlockedPasso2) {
             blocks.push({
                id: "block-reading",
                tag: "Bloco R",
                title: "📖 Leitura à 1ª Vista (One-Shot)",
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Atualizado para variável genérica) ---
        // 🧠 NOVO Bloco F (Reading Fixo Diário): Inserção de Leitura Estruturada Pré-Técnica
        if (unlockedMacroBlock) {
             blocks.push({
                id: "block-reading",
                tag: "Bloco R",
                title: "📖 Leitura à 1ª Vista (One-Shot)",
                pedagogicalRationale: `Expansão de Repertório Passivo e descompressão pré-técnica no Acervo Primer 299. [${workloadNote}]`,
                targetMinutes: Math.max(4, Math.round(8 * weeklyScalingFactor)),
                isReading: true,
                inactive: false
            });
        }

        /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
        // 5. Bloco E: Bloco Técnico
        blocks.push({
            id: "block-e",
            tag: "Bloco E",
            title: "⚙️ Bloco Técnico (Fundamentos)",
            pedagogicalRationale: `Escalas no Padrão Russo, Arpejos com inversões e Cadências nos 12 tons. [${workloadNote}]`,
            targetMinutes: Math.max(4, Math.round(8 * weeklyScalingFactor)), // 🛡️ Escalonamento dinâmico com piso de 4 min
            inactive: false
        });
        return blocks;
    }
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Salvamento do Cache antes do Retorno) ---
        // 5. Bloco E: Bloco Técnico
        const techRoutineNormal = this.getBalancedTechRoutine(state);
        blocks.push({
            id: "block-e",
            tag: "Bloco E",
            title: "⚙️ Bloco Técnico (Fundamentos)",
            pedagogicalRationale: `Equilíbrio dinâmico: 1 elemento negligenciado (${techRoutineNormal[0].title}) compensado por 1 consolidado. [${workloadNote}]`,
            targetMinutes: Math.max(4, Math.round(8 * weeklyScalingFactor)), 
            techRoutine: techRoutineNormal,
            inactive: false
        });

        // 💾 Persistência no Cache da Instância antes do retorno
        this._lastStateRef = state;
        this._cachedPipeline = blocks;

        return blocks;
    }
    
    calculateAdaptiveBpm(piece, trecho, state = {}) {
        if (!piece || !trecho) return 60;

        const targetBpm = parseInt(piece.bpm, 10) || 60;
        const box = trecho.box || 1;
        let basePercentage = 0.60; // Padrão inicial de segurança (60%)

        // 1. Escalonamento Base por Caixa Leitner (Maturidade da Memória)
        if (box === 1) {
            basePercentage = 0.60; // Caixa 1: 60% do BPM Alvo (estudo ultra-lento consciente)
        } else if (box === 2) {
            basePercentage = 0.75; // Caixa 2: 75% do BPM Alvo
        } else if (box === 3) {
            basePercentage = 0.90; // Caixa 3: 90% do BPM Alvo (fase final de estabilização)
        } else if (box === 4) {
            basePercentage = 1.00; // Caixa 4: 100% do BPM Alvo (andamento nominal de performance)
        } else if (box === 5) {
            basePercentage = 1.08; // Caixa 5: Desafio de Velocidade (108% do BPM Alvo para folga de torque)
        }

        let computedBpm = Math.round(targetBpm * basePercentage);

        // 2. Escudo Biológico: Redução Crítica por Fadiga/Estresse Mecânico
        const cache = state.metricsCache || {};
        const trechoCache = cache[trecho.id] || {};
        const normIFM = trechoCache.normIFM || 0;

        if (normIFM > 0.80) {
            // Se o estresse físico/neuromuscular estiver muito alto, aplica redutor severo de -15%
            computedBpm = Math.round(computedBpm * 0.85);
            console.warn(`[NeuroEngine] Redutor biológico de -15% aplicado no trecho \${trecho.id} devido a normIFM alto (\${normIFM.toFixed(2)})`);
        }

        // 3. Speed Lock de Segurança (Seletor Global)
        const isPieceAlert = piece.status === "alerta" || piece.status === "Alerta";
        if (isPieceAlert) {
            // Garante que peças sob estresse acumulem no máximo 70% do BPM alvo
            const lockedBpm = Math.round(targetBpm * 0.70);
            computedBpm = Math.min(computedBpm, lockedBpm);
        }

        // Blindagem contra limites físicos de metrônomo (Mínimo: 30 BPM, Máximo: 260 BPM)
        return Math.max(30, Math.min(260, computedBpm));
    }

    processAuditResult(pieceId, trechoId, outcome) {
        const state = window.StateManager.getState();
        
        // 🚨 CORREÇÃO DE OURO: Extrai o 'piece' E o 'trecho' juntos para evitar o ReferenceError!
        const { piece, trecho } = window.RepertoireManager ? window.RepertoireManager.getPieceAndTrecho(pieceId, trechoId) : { piece: null, trecho: null };
        const currentBox = trecho ? (trecho.box || 1) : 1;
        let update = {};
        let cascadeFail = false;

        const isThawActive = state.thawRecoveryState && state.thawRecoveryState.active;
        const thawMode = isThawActive ? state.thawRecoveryState.mode : "NONE";

        if (outcome === "hit") {
            const nextBox = Math.min(5, currentBox + 1);
            // REGRA LEITNER V15: Apenas Caixas 4 e 5 recebem consolidated: true
            const isConsolidated = nextBox >= 4;
            const nextReview = this.calculateNextReviewDate(nextBox);

            update = {
                box: nextBox,
                consolidated: isConsolidated,
                nextReviewDate: nextReview,
                consecutiveColdPasses: (trecho ? (trecho.consecutiveColdPasses || 0) : 0) + 1,
                lifetimeHits: (trecho ? (trecho.lifetimeHits || 0) : 0) + 1,
                lifetimeAttempts: (trecho ? (trecho.lifetimeAttempts || 0) : 0) + 1
            };

            if (window.AudioTools) window.AudioTools.playHitSound();

            if (window.App && window.App.showToast) {
                window.App.showToast(`🎉 1º Tiro Limpo! ${trecho ? trecho.label : 'Trecho'} promovido para Caixa ${nextBox} (${nextBox >= 4 ? 'Consolidado' : 'Revisão D+' + (LEITNER_INTERVALS_DAYS[nextBox] || 2)}).`, "success");
            }
        } else {
            // Se o resultado for MISS (erro/hesitação)
            cascadeFail = true;
            
            let nextBox = 1;
            let message = "⚠️ Hesitação/Erro detectado! Trecho recuado para Caixa 1 (Revisão D+1).";
            let toastType = "warn";
            
            // Cálculos para o Escudo de Velocidade
            const targetBpm = piece ? (parseInt(piece.bpm, 10) || 60) : 60;
            const adaptiveBpm = typeof this.calculateAdaptiveBpm === "function"
                ? this.calculateAdaptiveBpm(piece, trecho, state)
                : 60;

            if (currentBox === 5 && adaptiveBpm > targetBpm) {
                // 🛡️ [CAMADA V - META 5.4.4] 1. Escudo de Velocidade Caixa 5 Ativo (BPM Sugerido > BPM Alvo)
                nextBox = 5;
                message = `🛡️ Escudo Ativo: Erro registrado sob Desafio de Velocidade (${adaptiveBpm} BPM). Retenção em Caixa 5 mantida!`;
                toastType = "info";
                cascadeFail = false; // Desafios de velocidade não causam bloqueio cascata no Bloco D
            } else if (isThawActive && thawMode === "FULL_IMMUNITY") {
                // ❄️ [CAMADA V - META 5.1.3] 2. Janela de Degelo 1: Imunidade Total (Queda Zero)
                nextBox = currentBox;
                message = `❄️ Reconexão Fisiológica: ${trecho ? trecho.label : 'Trecho'} preservado na Caixa ${currentBox}.`;
                toastType = "success";
                cascadeFail = false;
            } else if (isThawActive && thawMode === "SOFT_REGRESSION") {
                // ❄️ [CAMADA V - META 5.1.3] 3. Janela de Degelo 2: Regressão Suave (-1 Caixa)
                nextBox = Math.max(1, currentBox - 1);
                message = `❄️ Desvio Controlado: ${trecho ? trecho.label : 'Trecho'} recuou suavemente para Caixa ${nextBox}.`;
                toastType = "warn";
            }
            
            // 🧠 [NOVO] FRAGMENTAÇÃO REVERSA (Top-Down Fallback)
            // Se errar um macrobloco (Passo 2+), ele entra em Pausa Estratégica (Caixa 0)
            // e desperta os microblocos filhos, forçando-os para a Caixa 1 (Micro-Reparo).
            // A variável cascadeFail garante que só fragmenta se NÃO foi salvo por um escudo.
            if (trecho && trecho.passo >= 2 && cascadeFail) {
                const deps = trecho.baseBlockIds || trecho.children || [];
                deps.forEach(depId => {
                    const depTrecho = piece ? piece.trechos.find(t => t.id === depId) : null;
                    if (depTrecho) {
                        window.RepertoireManager.updateTrecho(pieceId, depId, {
                            box: 1, // Acorda o filho na malha fina diária
                            consolidated: false,
                            nextReviewDate: new Date().toLocaleDateString('sv-SE')
                        });
                    }
                });
                
                nextBox = 0; // Macrobloco dorme até a fundação ser reerguida
                message = `⚠️ Gargalo no Encadeamento! Macrobloco suspenso. Microblocos base reativados para Micro-Reparo.`;
            }

            const nextReview = nextBox === 0 ? null : this.calculateNextReviewDate(nextBox);
            update = {
                box: nextBox,
                consolidated: nextBox >= 4,
                nextReviewDate: nextReview,
                consecutiveColdPasses: 0,
                slips: (trecho ? (trecho.slips || 0) : 0) + 1,
                lifetimeAttempts: (trecho ? (trecho.lifetimeAttempts || 0) : 0) + 1
            };

            if (window.AudioTools) window.AudioTools.playMissSound();

            if (window.App && window.App.showToast) {
                window.App.showToast(message, toastType);
            }
        }

        if (window.RepertoireManager) {
            window.RepertoireManager.updateTrecho(pieceId, trechoId, update);
        }

        // --- GRAVAÇÃO DE MONITORAMENTO INTRADIA (META 3.3) ---
        window.StateManager.setState(prev => {
            const currentSessionState = prev.sessionState || {};
            const auditsFailed = [...(currentSessionState.auditsFailed || [])];
            const auditsPassed = [...(currentSessionState.auditsPassed || [])];

            if (outcome === "hit") {
                if (!auditsPassed.includes(trechoId)) {
                    auditsPassed.push(trechoId);
                }
            } else {
                if (!auditsFailed.includes(trechoId)) {
                    auditsFailed.push(trechoId);
                }
            }

            return {
                dailyStats: {
                    ...prev.dailyStats,
                    completedAudits: (prev.dailyStats.completedAudits || 0) + 1,
                },
                sessionState: {
                    ...currentSessionState,
                    cascadeRestrictionD: cascadeFail,
                    currentAuditIndex: (currentSessionState.currentAuditIndex || 0) + 1,
                    auditsFailed: auditsFailed,
                    auditsPassed: auditsPassed
                }
            };
        }, `AUDIT_RESULT_${outcome.toUpperCase()}`);
    }

    // --- SUGESTOR ADAPTATIVO DE TEMPO EXTRA (OVER-TIME ENGINE V15.2) ---
    generateOvertimeSuggestions(state) {
        const currentState = state || (window.StateManager ? window.StateManager.getState() : {});
        const suggestions = [];
        const activePieces = (currentState.repertoire && currentState.repertoire.active)
            ? currentState.repertoire.active
            : (window.RepertoireManager ? window.RepertoireManager.getActivePieces() : []);

        let daCapoCandidate = null;
        let candidatePiece = null;

    /* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    for (const p of activePieces) {
        if (p.isPaused) continue;
        const trechos = p.trechos || [];
        if (trechos.length > 2) {
            const middleTrechos = trechos.slice(1, -1);
            middleTrechos.sort((a, b) => (a.totalPracticeSeconds || a.lifetimeAttempts || 0) - (b.totalPracticeSeconds || b.lifetimeAttempts || 0));
            if (middleTrechos.length > 0) {
                daCapoCandidate = middleTrechos[0];
                candidatePiece = p;
                break;
            }
        }
    }
    --- FIM ORIGINAL --- */

    // --- NOVA LÓGICA (Integração Adaptativa com P-Score) ---
    for (const p of activePieces) {
        if (p.isPaused) continue;
        const trechos = p.trechos || [];
        
        if (trechos.length > 2) {
            const middleTrechos = trechos.slice(1, -1);
            
            // Ordenação Preditiva: Trechos com maior P-Score (Maior Lag/IFM/Viés) sobem para o topo
            middleTrechos.sort((a, b) => {
                const scoreA = (currentState.metricsCache && currentState.metricsCache[a.id]) 
                    ? currentState.metricsCache[a.id].pScore 
                    : this.calculatePScoreData(p, a).pScore;
                    
                const scoreB = (currentState.metricsCache && currentState.metricsCache[b.id]) 
                    ? currentState.metricsCache[b.id].pScore 
                    : this.calculatePScoreData(p, b).pScore;
                    
                return scoreB - scoreA; 
            });

            if (middleTrechos.length > 0) {
                daCapoCandidate = middleTrechos[0];
                candidatePiece = p;
                break; // Mantém a eleição da peça mais urgente ativa na esteira
            }
        }
    }

        if (daCapoCandidate && candidatePiece) {
            suggestions.push({
                type: "Repertório",
                icon: "🛡️",
                title: `Antídoto Da Capo (${daCapoCandidate.label})`,
                desc: `Reforço da seção intermediária (${candidatePiece.title.split('—')[0].trim()}) para equalizar retenção motora e evitar aprendizado assimétrico.`,
                action: "open-overtime-sandwich",
                pieceId: candidatePiece.id,
                trechoId: daCapoCandidate.id,
                estMinutes: 8
            });
        } else {
            suggestions.push({
                type: "Repertório",
                icon: "📖",
                title: "Leitura à Primeira Vista (Faber Primer)",
                desc: "1 a 2 exercícios inéditos no modo Mix Diário (baixo estresse cognitivo, reflexo puro sem memorização).",
                action: "open-overtime-reading",
                estMinutes: 8
            });
        }

        const tech = currentState.technical || {};
        const queuedTech = [];

        ['scales', 'arpeggios', 'cadences'].forEach(cat => {
            (tech[cat] || []).forEach(item => {
                if (item.status === 'queue' || item.status === 'waiting' || item.status === 'espera') {
                    queuedTech.push({ ...item, category: cat });
                }
            });
        });

        if (queuedTech.length > 0) {
            const techItem = queuedTech[0];
            suggestions.push({
                type: "Técnica",
                icon: "⚙️",
                title: `Ativação Técnica: ${techItem.title}`,
                desc: `Ativação neuromuscular do item em fila (${techItem.desc || 'Fundamentos'}) para acelerar prontidão no repertório.`,
                action: "open-overtime-tech",
                techId: techItem.id,
                category: techItem.category,
                estMinutes: 5
            });
        } else {
            suggestions.push({
                type: "Técnica",
                icon: "⚙️",
                title: "Expansão Técnica dos 12 Tons",
                desc: "5 minutos focados na Escala Fá# Maior (Padrão Russo) ou Inversão de Arpejos.",
                action: "open-overtime-tech",
                estMinutes: 5
            });
        }

        suggestions.push({
            type: "Repertório",
            icon: "🎲",
            title: "Sorteio Intercalado (Recuperação a Frio)",
            desc: "1 rodada rápida com trechos consolidados das Caixas 2 e 3 para retenção flexível e robusta.",
            action: "open-overtime-random",
            estMinutes: 10
        });

        return suggestions.slice(0, 3);
    }

    getRandomTechnicalExercise(excludedCategory = null) {
        const state = window.StateManager.getState();
        const tech = state.technical || {};
        const categories = ["scales", "arpeggios", "cadences"].filter(c => c !== excludedCategory);
        const chosenCat = categories[Math.floor(Math.random() * categories.length)] || "scales";
        const items = tech[chosenCat] || [];

        if (items.length > 0) {
            const chosenItem = items[Math.floor(Math.random() * items.length)];
            return { ...chosenItem, category: chosenCat };
        }
        return { title: "Escala Fá# Maior", desc: "Padrão Russo / 4 oitavas", bpm: 60, category: "scales" };
    }
    // ⚙️ [CAMADA VI] BALANCEADOR DE CARGA TÉCNICA (Workload Balancing)
    getBalancedTechRoutine(state) {
        const tech = state.technical || {};
        let allActive = [];

        // 1. Extração da pool de elementos ativos
        ["scales", "arpeggios", "cadences"].forEach(cat => {
            (tech[cat] || []).forEach(item => {
                if (item.status === "active") allActive.push({ ...item, category: cat });
            });
        });

        // 2. Fallback de segurança para fila de espera
        if (allActive.length === 0) {
            ["scales", "arpeggios", "cadences"].forEach(cat => {
                (tech[cat] || []).forEach(item => {
                    if (item.status === "queue") allActive.push({ ...item, category: cat });
                });
            });
        }

        // 3. Fallback extremo (banco corrompido)
        if (allActive.length === 0) {
            return [
                { id: "fallback-1", title: "Escala Dó Maior", desc: "Padrão Russo", bpm: 60, targetBpm: 80, totalMinutes: 0, category: "scales", activeSubtask: "Escala Completa" },
                { id: "fallback-2", title: "Arpejo Dó Maior", desc: "Fundamental", bpm: 60, targetBpm: 80, totalMinutes: 0, category: "arpeggios", activeSubtask: "Posição Fundamental" }
            ];
        }

        // 4. Ordenação por negligência (tempo total praticado crescente)
        allActive.sort((a, b) => (a.totalMinutes || 0) - (b.totalMinutes || 0));

        const routine = [];
        
        // Elemento A: Prioridade Crítica (O mais negligenciado da lista)
        const mostDelayed = { ...allActive[0] };
        mostDelayed.activeSubtask = (mostDelayed.subtasks && mostDelayed.subtasks.length > 0)
            ? mostDelayed.subtasks[Math.floor(Math.random() * mostDelayed.subtasks.length)]
            : "Prática Geral";
        routine.push(mostDelayed);

        // Elemento B: Contraste Cognitivo (O mais avançado, para manter a sensação de maestria e equilíbrio)
        if (allActive.length > 1) {
            const mostAdvanced = { ...allActive[allActive.length - 1] };
            mostAdvanced.activeSubtask = (mostAdvanced.subtasks && mostAdvanced.subtasks.length > 0)
                ? mostAdvanced.subtasks[Math.floor(Math.random() * mostAdvanced.subtasks.length)]
                : "Prática Geral";
            routine.push(mostAdvanced);
        } else {
            const duplicate = { ...mostDelayed, id: mostDelayed.id + "-dup" };
            duplicate.activeSubtask = "Revisão Oposta";
            routine.push(duplicate);
        }

        return routine;
    }

    generateWeeklyTeacherReport(state) {
        const history = state.history || [];
        const dailyStats = state.dailyStats || {};
        const weeklyGoals = state.weeklyGoals || {};
        const activePieces = (state.repertoire && state.repertoire.active) ? state.repertoire.active : [];

        const totalMin = history.reduce((acc, h) => acc + (h.durationMinutes || 0), 0) + (dailyStats.focusMinutes || 0);
        const repMin = weeklyGoals.repertoireDoneMinutes || (dailyStats.repertoireMinutes || 0);
        const techMin = weeklyGoals.technicalDoneMinutes || (dailyStats.technicalMinutes || 0);
        const readCount = weeklyGoals.readingDoneCount || 0;

        let report = `🎹 *RELATÓRIO DE ESTUDOS DE PIANO — LEONARDO MOURA*\n`;
        report += `📅 *Semana de:* ${new Date().toLocaleDateString("pt-BR")}\n`;
        report += `⏱️ *Volume Total:* ~${Math.round(totalMin)} minutos de prática deliberada\n\n`;
        report += `📊 *PARTIÇÃO MULTI-PILAR:*\n`;
        report += `• Repertório Ativo: ${repMin} min (${weeklyGoals.repertoirePct || 0}% da meta)\n`;
        report += `• Pilar Técnico: ${techMin} min (${weeklyGoals.technicalPct || 0}% da meta)\n`;
        report += `• Leitura à 1ª Vista: ${readCount} partituras inéditas executadas One-Shot\n\n`;

        report += `🎼 *STATUS DAS OBRAS ATIVAS:*\n`;
        activePieces.forEach(p => {
            const safeTrechos = p.trechos || [];
            const consolidated = safeTrechos.filter(t => t.box >= 4 || t.consolidated).length;
            report += `• ${p.title}: ${p.pct || 0}% concluída (${consolidated}/${safeTrechos.length} trechos em retenção plena)\n`;
        });

        report += `\n🎯 *FOCO TÉCNICO DA SEMANA:* ${weeklyGoals.technicalFocus || 'Escala Fá# Maior e Arpejos'}\n`;
        report += `⚡ *STATUS LEITNER:* Pirâmide ativa sem Da Capo. Auditorias diárias de 1º tiro 100% integradas.`;

        return report;
    }
}
// Polyfill seguro para disparadores baseados em window.StateManager.publish
if (window.StateManager && !window.StateManager.publish) {
    window.StateManager.publish = function(actionLabel, payload = {}) {
        console.log(`[StateManager] Publicação manual de evento: ${actionLabel}`);
        this._notify(actionLabel);
    };
}
// INSTANCIAÇÃO SOBERANA DO MOTOR (O que faltava para dar vida ao cérebro!)
window.NeuroEngine = new NeuroEngineClass();
window.Engine = window.NeuroEngine;

// ==========================================
// 🧪 LABORATÓRIO DE SIMULAÇÃO (VIA CONSOLE)
// ==========================================
window.runSubsumptionSimulation = function() {
    console.log("[Simulation] Injetando matriz de teste para validação Top-Down Subsumption...");
    const mockState = JSON.parse(JSON.stringify(window.StateManager.getState()));
    const today = new Date().toLocaleDateString('sv-SE');
    
    // Força a inserção de uma árvore com conflito deliberado: Pai (Passo 2) e Filhos (Passo 1) vencidos no mesmo dia.
    mockState.repertoire.active = [{
        id: "p_sim", title: "Peça Simulada (Lab)", bpm: 60, status: "nominal",
        trechos: [
            { id: "sim.1.1", label: "Filho 1 (Passo 1)", passo: 1, parent: "sim.2.1", box: 1, nextReviewDate: today, lifetimeAttempts: 10, lifetimeHits: 8 },
            { id: "sim.1.2", label: "Filho 2 (Passo 1)", passo: 1, parent: "sim.2.1", box: 1, nextReviewDate: today, lifetimeAttempts: 10, lifetimeHits: 8 },
            { id: "sim.2.1", label: "Pai (Passo 2)", passo: 2, children: ["sim.1.1", "sim.1.2"], baseBlockIds: ["sim.1.1", "sim.1.2"], box: 1, nextReviewDate: today, lifetimeAttempts: 5, lifetimeHits: 4 }
        ]
    }];
    
    const audits = window.NeuroEngine.getDueColdAudits(mockState);
    console.table(audits.map(a => ({ 
        Trecho: a.trecho.label, 
        Passo: a.trecho.passo, 
        Motivo: "Sobreviveu ao Filtro" 
    })));
    console.log("[Simulation] Veredito: Se a poda hierárquica estiver funcional, APENAS o 'Pai (Passo 2)' deve figurar na tabela, engolindo os filhos.");
};

