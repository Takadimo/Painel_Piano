/**
 * charts.js - Gerador de Gráficos Nativos em SVG, Telemetria & Radar Anti-Da Capo (Carrossel por Peça)
 * Painel de Estudos de Piano — Versão 15.0.0 (Corrigida e Unificada)
 * Aluno: Leonardo Moura | Data: 28/08/2026
 *
 * Responsabilidades:
 * - Pirâmide Leitner com Contraste WCAG & Sombra de Texto para visualização de retenção pós-sono
 * - Círculo de Quintas Dinâmico com destaque de tonalidades ativas e em maestria
 * - Heatmap de Consistência Estilo GitHub Harmonizado com inspeção de minutos ao toque
 * - Radar Anti-Da Capo Dinâmico adaptado como CARROSSEL DE CARDS (dedicando 1 radar completo por peça ativa com navegação limpa)
 * - Central Hierárquica de Tempo com suporte integral à agregação semanal (Esta Semana / Hoje / Todos) considerando histórico
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

class ChartsManagerClass {
    renderLeitnerPyramid(state) {
        const container = document.getElementById("pyramidContainer");
        if (!container) return;
        
        const counts = window.RepertoireManager ? window.RepertoireManager.getLeitnerDistribution() : { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        
        const layers = [
            { box: 5, label: "Caixa 5: Longo Prazo", count: counts[5] || 0, color: "#ec4899", y: 10, h: 26, topW: 80, botW: 130 },
            { box: 4, label: "Caixa 4: D+7", count: counts[4] || 0, color: "#f59e0b", y: 40, h: 26, topW: 134, botW: 184 },
            { box: 3, label: "Caixa 3: D+4", count: counts[3] || 0, color: "#10b981", y: 70, h: 26, topW: 188, botW: 238 },
            { box: 2, label: "Caixa 2: D+2", count: counts[2] || 0, color: "#06b6d4", y: 100, h: 26, topW: 242, botW: 292 },
            { box: 1, label: "Caixa 1: D+1", count: counts[1] || 0, color: "#3b82f6", y: 130, h: 26, topW: 296, botW: 346 },
            { box: 0, label: "Caixa 0: Fila", count: counts[0] || 0, color: "#64748b", y: 160, h: 26, topW: 350, botW: 400 }
        ];
        
        const centerX = 210;
        const svgShapes = layers.map(l => {
            const x1 = centerX - (l.topW / 2);
            const x2 = centerX + (l.topW / 2);
            const x3 = centerX + (l.botW / 2);
            const x4 = centerX - (l.botW / 2);
            const y1 = l.y;
            const y2 = l.y + l.h;
            
            return `
<polygon points="${x1},${y1} ${x2},${y1} ${x3},${y2} ${x4},${y2}"
         fill="${l.color}"
         opacity="0.9"
         stroke="#0a0f1d"
         stroke-width="2" />
<text x="${centerX}" y="${y1 + 17}" fill="#ffffff" font-size="11.5" font-weight="800" text-anchor="middle" font-family="system-ui" style="text-shadow: 0px 1px 3px rgba(0,0,0,0.9);">
    ${l.count} trechos (${Math.round((l.count / total) * 100)}%)
</text>
`;
        }).join('');
        
        container.innerHTML = `
<div style="display: flex; flex-direction: column; align-items: center; background: var(--card2); border: 1px solid var(--border); border-radius: 14px; padding: 16px;">
    <svg viewBox="0 0 420 195" style="width: 100%; max-width: 420px; height: auto;">
        ${svgShapes}
    </svg>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; margin-top: 14px; font-size: 0.76rem;">
        <div style="color: #f472b6;">👑 Caixa 5: <strong>${counts[5] || 0}</strong> dominados</div>
        <div style="color: #fbbf24;">⭐ Caixa 4: <strong>${counts[4] || 0}</strong> retidos</div>
        <div style="color: #34d399;">🌿 Caixa 3: <strong>${counts[3] || 0}</strong> estáveis</div>
        <div style="color: #22d3ee;">🔗 Caixa 2: <strong>${counts[2] || 0}</strong> em teste D+2</div>
        <div style="color: #60a5fa;">❄️ Caixa 1: <strong>${counts[1] || 0}</strong> em teste D+1</div>
        <div style="color: #94a3b8;">🌱 Caixa 0: <strong>${counts[0] || 0}</strong> na fila</div>
    </div>
</div>
`;
    }
    
    renderCircleOfFifths(state) {
        const container = document.getElementById("circleOfFifthsContainer");
        if (!container) return;

        const technical = state.technical || {};
        const allItems = [
            ...(technical.scales || []),
            ...(technical.arpeggios || []),
            ...(technical.cadences || [])
        ];

        // Mapeamento de Tonalidades por Paralelas/Homônimas (Maior e menor do mesmo tom)
        const parallelMap = {
            "C": ["C", "Cm", "12T"],
            "G": ["G", "Gm"],
            "D": ["D", "Dm"],
            "A": ["A", "Am"],
            "E": ["E", "Em"],
            "B": ["B", "Bm", "Cb"],
            "F#": ["F#", "F#M", "F#m", "Gb", "Gbm"],
            "Db": ["Db", "C#", "C#m", "Dbm"],
            "Ab": ["Ab", "Abm", "G#", "G#m"],
            "Eb": ["Eb", "Ebm", "D#", "D#m"],
            "Bb": ["Bb", "Bbm", "A#m"],
            "F": ["F", "Fm"]
        };

        const baseTones = [
            { name: "C", angle: 0, label: "Dó M" },
            { name: "G", angle: 30, label: "Sol M" },
            { name: "D", angle: 60, label: "Ré M" },
            { name: "A", angle: 90, label: "Lá M" },
            { name: "E", angle: 120, label: "Mi M" },
            { name: "B", angle: 150, label: "Si M" },
            { name: "F#", angle: 180, label: "Fá# M" },
            { name: "Db", angle: 210, label: "Réb M" },
            { name: "Ab", angle: 240, label: "Láb M" },
            { name: "Eb", angle: 270, label: "Mib M" },
            { name: "Bb", angle: 300, label: "Sib M" },
            { name: "F", angle: 330, label: "Fá M" }
        ];

        // Detecta qual é a tonalidade da Escala Ativa semanal para brilhar
        const activeScale = (technical.scales || []).find(s => s.status === "active");
        const activeToneCenter = activeScale ? activeScale.tone : null;

        const activeTonesList = [];
        const masteredTonesList = [];

        const tones = baseTones.map(t => {
            const matches = parallelMap[t.name] || [t.name];
            const relatedItems = allItems.filter(item => {
                const itemTone = (item.tone || "").trim();
                return matches.includes(itemTone);
            });

            let level = "idle";
            if (relatedItems.length > 0) {
                const isMaster = relatedItems.every(item => item.bpm >= (item.targetBpm || 90));
                const isActive = relatedItems.some(item => item.status === "active");
                
                if (isMaster) {
                    level = "master";
                    masteredTonesList.push(t.label);
                } else if (isActive) {
                    level = "active";
                    activeTonesList.push(t.label);
                }
            }

            return { ...t, level };
        });

        const radius = 100;
        const center = 130;

        const nodesSvg = tones.map(t => {
            const rad = (t.angle - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(rad);
            const y = center + radius * Math.sin(rad);

            let fill = "var(--card)";
            let stroke = "var(--border)";
            let r = 16;
            let textFill = "var(--text-muted)";
            let filter = "";

            // Se for o centro tonal ativo selecionado, adiciona um anel brilhante verde-esmeralda
            const isTonalCenter = t.name === activeToneCenter;

            if (t.level === "master") {
                fill = "var(--accent2)";
                stroke = isTonalCenter ? "#ffffff" : "var(--accent2)";
                r = 19;
                textFill = "#04240f";
            } else if (t.level === "active") {
                fill = "var(--accent)";
                stroke = isTonalCenter ? "var(--accent2)" : "var(--accent2)";
                r = 17;
                textFill = "#ffffff";
            } else if (isTonalCenter) {
                stroke = "var(--accent2)";
                r = 17;
                textFill = "var(--accent2)";
            }

            // Anel externo extra de pulsação para o centro tonal ativo
            const ringSvg = isTonalCenter ? `
                <circle cx="${x}" cy="${y}" r="${r + 4}" fill="none" stroke="var(--accent2)" stroke-width="1.5" stroke-dasharray="4,2" style="transform-origin: ${x}px ${y}px; animation: spin 12s linear infinite;" />
            ` : "";

            // Retorno Corrigido: Agora o ${ringSvg} é realmente renderizado dentro do grupo clicável!
            return `
                <g style="cursor: pointer;" onclick="if(window.openCircleToneDrawer) { window.openCircleToneDrawer('${t.name}'); }">
                    <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" style="transition: all 0.3s;" />
                    <text x="${x}" y="${y + 4}" fill="${textFill}" font-size="9.5" font-weight="800" text-anchor="middle" font-family="system-ui">
                        ${t.name}
                    </text>
                </g>
            `;
        }).join('');

        const linesSvg = tones.map((t, idx) => {
            const nextNode = tones[(idx + 1) % tones.length];
            const rad1 = (t.angle - 90) * (Math.PI / 180);
            const rad2 = (nextNode.angle - 90) * (Math.PI / 180);
            const x1 = center + radius * Math.cos(rad1);
            const y1 = center + radius * Math.sin(rad1);
            const x2 = center + radius * Math.cos(rad2);
            const y2 = center + radius * Math.sin(rad2);

            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />`;
        }).join('');

        const activeStr = activeTonesList.length > 0 ? activeTonesList.join(", ") : "Nenhuma";
        const masterStr = masteredTonesList.length > 0 ? masteredTonesList.join(", ") : "Nenhuma";

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%; position: relative;">
                <svg width="260" height="260" style="background: var(--card-inner); border-radius: 50%; border: 1px solid var(--border);">
                    <style>
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                    </style>
                    ${linesSvg}
                    ${nodesSvg}
                    <circle cx="${center}" cy="${center}" r="14" fill="rgba(10, 15, 29, 0.9)" stroke="rgba(255,255,255,0.08)" />
                    <text x="${center}" y="${center + 3}" fill="#cbd5e1;" font-size="8" font-weight="bold" text-anchor="middle">5th</text>
                </svg>
                <div style="width: 100%; background: var(--card-inner); padding: 12px; border-radius: 12px; border: 1px solid var(--border); font-size: 0.78rem;">
                    <div style="margin-bottom: 4px;">
                        <span style="color: var(--accent); font-weight: 700;">🔵 Tonalidades em Estudo:</span> 
                        <strong style="color: #fff;">${activeStr}</strong>
                    </div>
                    <div>
                        <span style="color: var(--accent2); font-weight: 700;">🟢 Tonalidades em Maestria:</span> 
                        <strong style="color: #fff;">${masterStr}</strong>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderAntiDaCapoRadar(state) {
        const container = document.getElementById("antiDaCapoRadarContainer");
        if (!container) return;
        
        const pieces = (state && state.repertoire && state.repertoire.active)
            ? state.repertoire.active
            : (window.RepertoireManager ? window.RepertoireManager.getActivePieces() : []);
            
        if (pieces.length === 0) {
            container.innerHTML = `<div style="background: var(--card2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; text-align: center; color: var(--text-muted);">Nenhuma peça ativa para análise de esforço Anti-Da Capo.</div>`;
            return;
        }
        
        if (typeof window._radarPieceIndex !== "number") window._radarPieceIndex = 0;
        if (window._radarPieceIndex >= pieces.length) window._radarPieceIndex = 0;
        if (window._radarPieceIndex < 0) window._radarPieceIndex = pieces.length - 1;
        
        const currentPiece = pieces[window._radarPieceIndex] || pieces[0];
        const trechos = currentPiece.trechos || [];
        const passo1Trechos = trechos.filter(t => t.passo === 1);
        
        const sections = (passo1Trechos.length > 0 ? passo1Trechos : trechos).map(t => {
            const practiceMins = Math.max(1, Math.round((t.tempoSegundos || 0) / 60));
            const acc = t.lifetimeAttempts > 0 ? Math.round((t.lifetimeHits / t.lifetimeAttempts) * 100) : (t.box >= 1 ? 90 : 60);
            return {
                name: `c. ${t.compassos} (${t.label})`,
                practiceMins: practiceMins,
                accuracy: acc,
                box: t.box || 0,
                isCritical: (t.slips || 0) > 0 || (t.lifetimeAttempts >= 3 && acc < 70)
            };
        });
        
        const maxMins = Math.max(15, ...sections.map(s => s.practiceMins));
        
        container.innerHTML = `
<div style="background: var(--card2); border: 1px solid var(--border); border-radius: 14px; padding: 16px;">
    <!-- Header do Carrossel Anti-Da Capo -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
        <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">
                🍪 ${currentPiece.title}
            </div>
            <div style="font-size: 0.74rem; color: var(--accent); margin-top: 1px;">
                Peça ${window._radarPieceIndex + 1} de ${pieces.length} • Andamento: ${currentPiece.bpm || '60'} BPM
            </div>
        </div>
        <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" data-action="prev-radar-piece">◀ Anterior</button>
            <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" data-action="next-radar-piece">Próxima ▶</button>
        </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px;">
        ${sections.map(s => {
            let barColor = "var(--accent2)";
            let badgeHtml = "";
            if (s.isCritical || s.practiceMins < 10 || s.accuracy < 60) {
                barColor = "var(--danger)";
                badgeHtml = `<span class="badge danger" style="font-size:0.65rem; margin-left:6px;">⚠️ Risco Crítico</span>`;
            } else if (s.practiceMins < 15 || s.accuracy < 75) {
                barColor = "var(--warn)";
                badgeHtml = `<span class="badge warn" style="font-size:0.65rem; margin-left:6px;">⚠️ Risco Da Capo</span>`;
            }
            return `
<div>
    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
        <span style="color: #fff;"><strong>${s.name}</strong> ${badgeHtml}</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">${s.practiceMins} min (${s.accuracy}% precisão) • Cx ${s.box}</span>
    </div>
    <div style="height: 6px; background: #0e1626; border-radius: 4px; overflow: hidden;">
        <div style="width: ${Math.min(100, Math.round((s.practiceMins / maxMins) * 100))}%; height: 100%; background: ${barColor};"></div>
    </div>
</div>
`;
        }).join('')}
    </div>
    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 10px 14px; margin-top: 14px; font-size: 0.78rem; color: #fde047; line-height: 1.45;">
        💡 <strong>Diagnóstico Anti-Da Capo (${currentPiece.title.split('—')[0].trim()}):</strong> Evite o vício de iniciar sempre pelo compasso 1. Comece a sessão deliberadamente pelos trechos finais ou seções intermediárias de maior dificuldade mecânica para equalizar a retenção da obra.
    </div>
</div>
`;
    }
    
    // --- 4. CONSISTÊNCIA & ORQUESTRADOR SEMANAL (HEATMAP + CURVAS ACUMULADAS) ---
    renderHeatmap(state) {
        const container = document.getElementById("heatmapContainer");
        if (!container) return;

        // ===================================================
        // 🔹 PARTE A: HEATMAP DE CONSISTÊNCIA DE 28 DIAS (GITHUB STYLE)
        // ===================================================
        const days = [];
        const today = new Date();
        const history = state.history || [];

        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toLocaleDateString("pt-BR");
            const dateISO = d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
            const isToday = i === 0;

            let minutes = 0;
            if (isToday) {
                minutes = (state.dailyStats && state.dailyStats.focusMinutes) || 0;
            } else {
                history.forEach(h => {
                    if (h.date) {
                        const hDate = parseDate(h.date);
                        if (hDate && hDate.getFullYear() === d.getFullYear() && hDate.getMonth() === d.getMonth() && hDate.getDate() === d.getDate()) {
                            minutes += (h.durationMinutes || 0);
                        }
                    }
                });
            }

            let lvlClass = "";
            if (minutes >= 30) lvlClass = "lvl-3";
            else if (minutes >= 15) lvlClass = "lvl-2";
            else if (minutes > 0) lvlClass = "lvl-1";

            days.push(`
                <div class="heatmap-day ${lvlClass}" data-action="inspect-heatmap-day" data-date="${dateISO}" style="cursor: pointer; position: relative;" title="${dateStr}: ${minutes} minutos">
                    ${d.getDate()}
                    <span style="font-size:0.5rem; display:block; opacity:0.7;">${d.getMonth() + 1}</span>
                </div>
            `);
        }

        // ===================================================
        // 🔹 PARTE B: GRÁFICO SVG DA CURVA DE CARGA ACUMULADA
        // ===================================================
        let svgChartHtml = "";
        let paceFeedbackHtml = "";

        if (state.weeklyOrchestrator) {
            const orch = state.weeklyOrchestrator;
            const ideal = orch.idealCurve || [0, 0, 0, 0, 0, 0, 0];
            const real = orch.realCurve || [0, 0, 0, 0, 0, 0, 0];
            const pace = orch.weeklyPace || 1.0;
            
            // 0 = Segunda, 6 = Domingo
            const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
            // Determinação de cores, tags e projeções dinâmicas unificadas de Pace
            let paceColor = "var(--accent)";
            let paceTitle = "No Ritmo";
            let paceDesc = "Conclusão projetada para Domingo. Consistência exemplar.";
            
            if (pace >= 1.15) {
                paceColor = "var(--accent2)";
                paceTitle = "🚀 Voo de Cruzeiro";
                paceDesc = "Ritmo muito acelerado. Conclusão projetada para Sexta-feira.";
            } else if (pace >= 1.05) {
                paceColor = "var(--accent2)";
                paceTitle = "⚡ Acima do Ritmo";
                paceDesc = "Conclusão projetada para Sábado (Adiantado). Ritmo excelente!";
            } else if (pace >= 0.90) {
                paceColor = "var(--accent)";
                paceTitle = "🎯 No Ritmo";
                paceDesc = "Conclusão projetada para Domingo. Consistência exemplar.";
            } else if (pace >= 0.75) {
                paceColor = "var(--warn)";
                paceTitle = "⚠️ Leve Atraso";
                paceDesc = "Conclusão projetada para Segunda-feira da próxima semana. Tente repor alguns minutos.";
            } else {
                paceColor = "var(--danger)";
                paceTitle = "🚨 Abaixo do Ritmo";
                paceDesc = "Atraso acumulado severo. Conclusão projetada para Terça-feira. Pratique +15 min hoje para reequilibrar.";
            }

            // Configurações dimensionais do gráfico SVG responsivo
            const svgW = 420;
            const svgH = 140;
            const paddingLeft = 40;
            const paddingRight = 20;
            const paddingTop = 15;
            const paddingBottom = 20;

            const chartW = svgW - paddingLeft - paddingRight;
            const chartH = svgH - paddingTop - paddingBottom;

            // Encontra o teto de escala dinâmica para o Eixo Y
            const maxVal = Math.max(
                ideal[6] || 300,
                Math.max(...real)
            ) || 300;

            const daysLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

            // Mapeadores de coordenadas cartesianas
            const getX = (idx) => paddingLeft + (idx / 6) * chartW;
            const getY = (val) => svgH - paddingBottom - (val / maxVal) * chartH;

            // Gera os pontos das linhas de curva
            const idealPoints = ideal.map((val, idx) => `${getX(idx)},${getY(val)}`).join(" ");
            
            // A curva real é plotada apenas até hoje para não despencar ao zero nos dias futuros
            const realPointsArray = [];
            for (let i = 0; i <= currentDayIndex; i++) {
                realPointsArray.push(`${getX(i)},${getY(real[i] || 0)}`);
            }
            const realPoints = realPointsArray.join(" ");

            // Linhas de Grade Horizontais e Indicadores do Eixo Y
            const gridLines = [];
            const numTicks = 3;
            for (let i = 0; i <= numTicks; i++) {
                const val = Math.round((i / numTicks) * maxVal);
                const y = getY(val);
                gridLines.push(`
                    <line x1="${paddingLeft}" y1="${y}" x2="${svgW - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
                    <text x="${paddingLeft - 8}" y="${y + 3}" fill="var(--text-muted)" font-size="8.5" text-anchor="end" font-family="system-ui">${val}m</text>
                `);
            }

            // Labels do Eixo X (Dias da semana)
            const xLabels = daysLabels.map((label, idx) => {
                const x = getX(idx);
                const isCurrent = idx === currentDayIndex;
                const fill = isCurrent ? "var(--accent)" : "var(--text-muted)";
                const weight = isCurrent ? "bold" : "normal";
                return `<text x="${x}" y="${svgH - 4}" fill="${fill}" font-weight="${weight}" font-size="9" text-anchor="middle" font-family="system-ui">${label}</text>`;
            }).join("");

            // Marcadores de ponto (Círculos) da Curva Ideal
            const idealDots = ideal.map((val, idx) => `
                <circle cx="${getX(idx)}" cy="${getY(val)}" r="2.5" fill="#64748b" opacity="0.5" />
            `).join("");

            // Marcadores de ponto (Círculos) da Curva Real
            const realDots = [];
            for (let i = 0; i <= currentDayIndex; i++) {
                const val = real[i] || 0;
                const isToday = i === currentDayIndex;
                realDots.push(`
                    <circle cx="${getX(i)}" cy="${getY(val)}" r="${isToday ? 4.5 : 3.5}" fill="${isToday ? 'var(--accent2)' : 'var(--accent)'}" stroke="#0a0f1d" stroke-width="1.5" />
                `);
            }

            svgChartHtml = `
                <div style="margin-top: 18px; border-top: 1px solid var(--border); padding-top: 14px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Curva de Carga Semanal (Acumulada)</span>
                        <div style="display: flex; gap: 12px; font-size: 0.72rem;">
                            <span style="display: flex; align-items: center; gap: 4px; color: var(--text-muted);">
                                <span style="width: 8px; height: 1.5px; border-bottom: 2px dashed #64748b; display: inline-block;"></span> Ideal
                            </span>
                            <span style="display: flex; align-items: center; gap: 4px; color: var(--text-muted);">
                                <span style="width: 8px; height: 3px; background: var(--accent); display: inline-block; border-radius: 4px;"></span> Real
                            </span>
                        </div>
                    </div>
                    <div style="width: 100%; overflow: hidden;">
                        <svg width="100%" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="background: var(--card-inner); border-radius: 12px; border: 1px solid var(--border); overflow: visible;">
                            ${gridLines.join("")}
                            ${xLabels}
                            
                            <!-- Curva Ideal (Dashed) -->
                            <polyline points="${idealPoints}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />
                            ${idealDots}
                            
                            <!-- Curva Real (Sólida) -->
                            ${realPoints ? `<polyline points="${realPoints}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                            ${realDots.join("")}
                        </svg>
                    </div>
                </div>
            `;

            paceFeedbackHtml = `
                <div style="margin-top: 12px; background: rgba(10, 15, 29, 0.45); border: 1px solid var(--border); padding: 10px 14px; border-radius: 10px; text-align: left; display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 1.3rem;">🧭</div>
                    <div>
                        <div style="font-size: 0.8rem; font-weight: 800; color: ${paceColor};">${paceTitle} (Ritmo: ${pace.toFixed(2)}x)</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px; line-height: 1.35; font-family: system-ui;">${paceDesc}</div>
                    </div>
                </div>
            `;
        }

        // ===================================================
        // 🔹 PARTE C: CONSOLIDAÇÃO DO RENDER EM CONTAINER ÚNICO
        // ===================================================
        container.innerHTML = `
            <div class="card" style="border-left: 4px solid var(--accent);">
                <h2>📈 Consistência & Orquestração Semanal</h2>
                <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); text-align: left; margin-bottom: 8px;">Calendário de Consistência (Últimos 28 Dias)</div>
                    <div class="heatmap-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
                        ${days.join('')}
                    </div>
                    
                    <!-- Barra de Inspeção Detalhada de Cliques -->
                    <div id="heatmapInspectBar" style="margin-top: 10px; background: rgba(10, 15, 29, 0.4); border: 1px dashed var(--border); padding: 8px 12px; border-radius: 8px; font-size: 0.78rem; min-height: 44px; color: var(--text-muted); line-height: 1.35; text-align: left; font-family: system-ui;">
                        👆 <strong>Clique em um quadrado</strong> do calendário de consistência acima para analisar os detalhes e registros reais daquele dia.
                    </div>
                    
                    ${svgChartHtml}
                    ${paceFeedbackHtml}
                </div>
            </div>
        `;
    }
    
    renderTimeBreakdown(state) {
        const container = document.getElementById("timeBreakdownContainer");
        if (!container) return;
        
        const timeFilter = state.timeFilter || "week";
        const history = state.history || [];
        
        let repMin = 0;
        let techMin = 0;
        let readMin = 0;
        let auditMin = 0;
        
        const todayStr = new Date().toLocaleDateString("sv-SE");
        const ptBrToday = new Date().toLocaleDateString("pt-BR");
        
        const dailyRep = (state.dailyStats && state.dailyStats.repertoireMinutes) || 0;
        const dailyTech = (state.dailyStats && state.dailyStats.technicalMinutes) || 0;
        const dailyRead = (state.dailyStats && state.dailyStats.readingMinutes) || 0;
        const dailyAudit = (state.dailyStats && state.dailyStats.auditMinutes) || ((state.dailyStats && state.dailyStats.completedAudits * 2) || 0);

        if (timeFilter === "today") {
            repMin = dailyRep;
            techMin = dailyTech;
            readMin = dailyRead;
            auditMin = dailyAudit;
        } else {
            // Agregação semanal ou geral a partir do histórico unificado + dailyStats de hoje
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda...
            const startOfWeek = new Date(today);
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Início na Segunda
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);
            
            // Soma a verdade absoluta de hoje (Granularidade fina garantida pelo interceptor)
            repMin += dailyRep;
            techMin += dailyTech;
            readMin += dailyRead;
            auditMin += dailyAudit;
            
            // Soma do histórico (Blindando contra o double-counting de hoje)
            history.forEach(h => {
                if (h.date === todayStr || h.date === ptBrToday || (h.timestamp && h.timestamp.startsWith(todayStr))) {
                    return; // Ignora o histórico do dia atual, pois já foi somado via dailyStats
                }
                
                let isIncluded = true;
                if (timeFilter === "week" && h.date) {
                    const hDate = parseDate(h.date);
                    if (hDate && hDate < startOfWeek) isIncluded = false;
                    if (!hDate) isIncluded = false;
                }
                
                if (isIncluded) {
                    const mins = h.durationMinutes || 0;
                    const type = (h.type || "").toLowerCase();
                    const piece = (h.pieceId || "").toLowerCase();
                    
                    if (type.includes("guiada")) {
                        // Rateio Proporcional Preditivo (Espelhando a Pipeline do NeuroEngine)
                        repMin += Math.round(mins * 0.50);
                        techMin += Math.round(mins * 0.20);
                        readMin += Math.round(mins * 0.15);
                        auditMin += Math.round(mins * 0.15);
                    } else if (type.includes("técnica") || piece.includes("técnica") || piece.includes("escala")) {
                        techMin += mins;
                    } else if (type.includes("leitura") || piece.includes("primer") || piece.includes("leitura")) {
                        readMin += mins;
                    } else if (type.includes("auditoria")) {
                        auditMin += mins;
                    } else {
                        repMin += mins;
                    }
                }
            });
        }
        
        const total = repMin + techMin + readMin + auditMin;
        
        container.innerHTML = `
<div style="background: var(--card2); border: 1px solid var(--border); border-radius: 14px; padding: 16px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <strong style="color: #fff; font-size: 0.9rem;">Central Hierárquica de Tempo</strong>
        <div style="display: flex; gap: 4px;">
            <button class="btn ${timeFilter === 'today' ? 'btn-primary' : 'btn-outline'}" style="font-size: 0.7rem; padding: 4px 8px; width: auto; margin-top: 0;" data-action="set-time-filter" data-filter="today">Hoje</button>
            <button class="btn ${timeFilter === 'week' ? 'btn-primary' : 'btn-outline'}" style="font-size: 0.7rem; padding: 4px 8px; width: auto; margin-top: 0;" data-action="set-time-filter" data-filter="week">Esta Semana</button>
            <button class="btn ${timeFilter === 'all' ? 'btn-primary' : 'btn-outline'}" style="font-size: 0.7rem; padding: 4px 8px; width: auto; margin-top: 0;" data-action="set-time-filter" data-filter="all">Geral</button>
        </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>🎵 Repertório Ativo</span>
                <strong>${repMin} min (${total > 0 ? Math.round((repMin / total) * 100) : 0}%)</strong>
            </div>
            <div style="height: 6px; background: #0e1626; border-radius: 4px; overflow: hidden;">
                <div style="width: ${total > 0 ? (repMin / total) * 100 : 0}%; height: 100%; background: var(--accent);"></div>
            </div>
        </div>
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>⚙️ Pilar Técnico (Escalas & Arpejos)</span>
                <strong>${techMin} min (${total > 0 ? Math.round((techMin / total) * 100) : 0}%)</strong>
            </div>
            <div style="height: 6px; background: #0e1626; border-radius: 4px; overflow: hidden;">
                <div style="width: ${total > 0 ? (techMin / total) * 100 : 0}%; height: 100%; background: var(--purple);"></div>
            </div>
        </div>
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>📖 Leitura à Primeira Vista (Primer)</span>
                <strong>${readMin} min (${total > 0 ? Math.round((readMin / total) * 100) : 0}%)</strong>
            </div>
            <div style="height: 6px; background: #0e1626; border-radius: 4px; overflow: hidden;">
                <div style="width: ${total > 0 ? (readMin / total) * 100 : 0}%; height: 100%; background: var(--accent2);"></div>
            </div>
        </div>
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>❄️ Auditorias a Frio (1º Tiro)</span>
                <strong>${auditMin} min (${total > 0 ? Math.round((auditMin / total) * 100) : 0}%)</strong>
            </div>
            <div style="height: 6px; background: #0e1626; border-radius: 4px; overflow: hidden;">
                <div style="width: ${total > 0 ? (auditMin / total) * 100 : 0}%; height: 100%; background: var(--warn);"></div>
            </div>
        </div>
    </div>
    <div style="text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 0.88rem; color: #fff;">
        Tempo Total Acumulado (${timeFilter === 'today' ? 'Hoje' : (timeFilter === 'week' ? 'Esta Semana' : 'Histórico Completo')}): <strong>${total} minutos</strong>
    </div>
</div>
`;
    }
    // --- 6. METAS SEMANAIS GRANULARIZADAS POR PEÇA & PILARES ---
    renderWeeklyGoals(state) {
        const container = document.getElementById("weeklyGoalsContainer");
        if (!container) return;

        const activePieces = (state && state.repertoire && state.repertoire.active)
            ? state.repertoire.active
            : (window.RepertoireManager ? window.RepertoireManager.getActivePieces() : []);

        const history = state.history || [];
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda...
        const startOfWeek = new Date(today);
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Segunda como início de semana
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const currentDayIndex = today.getDay() === 0 ? 7 : today.getDay(); // 1 = Seg, 7 = Dom

        let piecesHtml = "";

        activePieces.forEach(piece => {
            const targetMinutes = piece.targetWeeklyMinutes || (piece.id === "p12" ? 60 : 100);
            
            // 1. Calcula os minutos praticados na semana atual para esta peça
            let pieceMinutes = 0;
            history.forEach(h => {
                if (h.date && h.pieceId === piece.id) {
                    const hDate = parseDate(h.date);
                    if (hDate && hDate >= startOfWeek) {
                        pieceMinutes += (h.durationMinutes || 0);
                    }
                }
            });

            // Adiciona tempo de hoje se a peça atual for a mesma praticada hoje (evita drift de término de sessão)
            const isTodayPiece = (state.dailyStats && state.dailyStats.lastActivePieceId === piece.id);
            const todayStr = today.toLocaleDateString("sv-SE");
            const todayInHistory = history.some(h => h.date === todayStr && h.pieceId === piece.id);
            if (!todayInHistory && isTodayPiece) {
                pieceMinutes += (state.dailyStats && state.dailyStats.repertoireMinutes) || 0;
            }

            const pct = Math.min(100, Math.round((pieceMinutes / targetMinutes) * 100));

            // Heurística de Negligência: abaixo de 50% da proporção esperada para o dia atual (ativo a partir de terça)
            const proportionalTarget = (currentDayIndex / 7) * targetMinutes;
            const isNeglected = (pieceMinutes < proportionalTarget * 0.5) && (currentDayIndex > 1);

            // 2. Coleta de distribuição Leitner por trecho da peça
            const trechos = piece.trechos || [];
            const boxCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            trechos.forEach(t => {
                const b = (t.box !== undefined) ? t.box : 0;
                if (boxCounts[b] !== undefined) boxCounts[b]++;
            });

            const statusBadge = isNeglected 
                ? `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;">⚠️ NEGLIGENCIADA</span>`
                : `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;">🟢 EM DIA</span>`;

            piecesHtml += `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <strong style="color: #fff; font-size: 0.82rem; font-family: system-ui;">${piece.title}</strong>
                            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: system-ui;">Meta Semanal: ${targetMinutes} min</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                            <span style="font-size: 0.78rem; font-weight: 700; color: #fff; font-family: monospace;">${pieceMinutes} / ${targetMinutes} min (${pct}%)</span>
                            ${statusBadge}
                        </div>
                    </div>
                    
                    <!-- Barra de Progresso Granular -->
                    <div style="height: 6px; width: 100%; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.01);">
                        <div style="width: ${pct}%; background: linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%); height: 100%; border-radius: 4px; transition: width 0.4s ease;"></div>
                    </div>

                    <!-- Distribuição de Caixas Leitner por Peça -->
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(10, 15, 29, 0.3); padding: 6px 10px; border-radius: 8px; border: 1px dashed var(--border);">
                        <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Mielinização (Caixas):</span>
                        <div style="display: flex; gap: 4px; font-family: monospace; font-size: 0.65rem;">
                            <span style="background: #64748b; color: #fff; padding: 2px 5px; border-radius: 4px; font-weight: 800; min-width: 32px; text-align: center;" title="Caixa 0 (Fila)">C0: ${boxCounts[0]}</span>
                            <span style="background: #3b82f6; color: #fff; padding: 2px 5px; border-radius: 4px; font-weight: 800; min-width: 32px; text-align: center;" title="Caixa 1 (D+1)">C1: ${boxCounts[1]}</span>
                            <span style="background: #06b6d4; color: #fff; padding: 2px 5px; border-radius: 4px; font-weight: 800; min-width: 32px; text-align: center;" title="Caixa 2 (D+2)">C2: ${boxCounts[2]}</span>
                            <span style="background: #10b981; color: #fff; padding: 2px 5px; border-radius: 4px; font-weight: 800; min-width: 32px; text-align: center;" title="Caixa 3 (D+4)">C3: ${boxCounts[3]}</span>
                            <span style="background: #f59e0b; color: #fff; padding: 2px 5px; border-radius: 4px; font-weight: 800; min-width: 32px; text-align: center;" title="Caixa 4 (D+7)">C4: ${boxCounts[4]}</span>
                            <span style="background: #ec4899; color: #fff; padding: 2px 5px; border-radius: 4px; font-weight: 800; min-width: 32px; text-align: center;" title="Caixa 5 (Longo Prazo)">C5: ${boxCounts[5]}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        if (activePieces.length === 0) {
            piecesHtml = `
                <div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.78rem;">
                    Nenhuma peça de repertório ativa para esta semana.
                </div>
            `;
        }

        // ==========================================
        // ⚙️ PILAR TÉCNICO & LEITURA À PRIMEIRA VISTA
        // ==========================================
        // 1. Técnico
        let techMinutes = 0;
        history.forEach(h => {
            const hDate = parseDate(h.date);
            if (hDate && hDate >= startOfWeek) {
                const type = (h.type || "").toLowerCase();
                const pieceId = (h.pieceId || "").toLowerCase();
                if (type.includes("técnica") || pieceId.includes("técnica") || pieceId.includes("escala")) {
                    techMinutes += (h.durationMinutes || 0);
                }
            }
        });
        techMinutes += (state.dailyStats && state.dailyStats.technicalMinutes) || 0;
        const techTarget = 60; // 60 minutos como meta semanal padrão de técnica
        const techPct = Math.min(100, Math.round((techMinutes / techTarget) * 100));
        const isTechNeglected = (techMinutes < ((currentDayIndex / 7) * techTarget) * 0.5) && (currentDayIndex > 1);
        const techStatusBadge = isTechNeglected 
            ? `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;">⚠️ NEGLIGENCIADA</span>`
            : `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;">🟢 EM DIA</span>`;

        // 2. Leitura
        let readingCount = 0;
        history.forEach(h => {
            const hDate = parseDate(h.date);
            if (hDate && hDate >= startOfWeek) {
                const type = (h.type || "").toLowerCase();
                const pieceId = (h.pieceId || "").toLowerCase();
                if (type.includes("leitura") || pieceId.includes("primer") || pieceId.includes("leitura")) {
                    readingCount += 1;
                }
            }
        });
        const todayReadingDone = (state.dailyStats && state.dailyStats.readingMinutes > 0);
        if (todayReadingDone) {
            readingCount += Math.ceil(state.dailyStats.readingMinutes / 3); // Mapeia 1 exercício concluído a cada 3 min
        }
        const readingTarget = 5; // 5 exercícios semanais como meta padrão de leitura
        const readingPct = Math.min(100, Math.round((readingCount / readingTarget) * 100));
        const isReadingNeglected = (readingCount < ((currentDayIndex / 7) * readingTarget) * 0.5) && (currentDayIndex > 1);
        const readingStatusBadge = isReadingNeglected 
            ? `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;">⚠️ NEGLIGENCIADA</span>`
            : `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;">🟢 EM DIA</span>`;

        container.innerHTML = `
            <div style="text-align: left; margin-top: 6px;">
                <div style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 4px; font-family: system-ui;">🎯 Progresso Granular & Metas Semanais</div>
                
                <!-- Secção das Peças -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${piecesHtml}
                </div>

                <!-- Secção de Técnica e Leitura -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <!-- Card Técnico -->
                    <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                                <strong style="color: #fff; font-size: 0.76rem; font-family: system-ui;">⚙️ Pilar Técnico</strong>
                                ${techStatusBadge}
                            </div>
                            <div style="font-size: 0.65rem; color: var(--text-muted); font-family: system-ui; margin-bottom: 6px;">Meta: ${techTarget} min</div>
                        </div>
                        <div>
                            <div style="height: 5px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
                                <div style="width: ${techPct}%; background: var(--purple); height: 100%; border-radius: 3px;"></div>
                            </div>
                            <div style="font-size: 0.7rem; text-align: right; color: #fff; font-family: monospace; font-weight: bold;">${techMinutes}m / ${techTarget}m (${techPct}%)</div>
                        </div>
                    </div>

                    <!-- Card Leitura -->
                    <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                                <strong style="color: #fff; font-size: 0.76rem; font-family: system-ui;">📖 Leitura à 1ª Vista</strong>
                                ${readingStatusBadge}
                            </div>
                            <div style="font-size: 0.65rem; color: var(--text-muted); font-family: system-ui; margin-bottom: 6px;">Meta: ${readingTarget} ex</div>
                        </div>
                        <div>
                            <div style="height: 5px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
                                <div style="width: ${readingPct}%; background: var(--accent2); height: 100%; border-radius: 3px;"></div>
                            </div>
                            <div style="font-size: 0.7rem; text-align: right; color: #fff; font-family: monospace; font-weight: bold;">${readingCount} / ${readingTarget} ex (${readingPct}%)</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    renderDiagnosticReport(state) {
        const container = document.getElementById("diagnosticReportContainer");
        // Cria o container dinamicamente se não existir na DOM da aba Progresso
        if (!container) {
            const timeContainer = document.getElementById("timeBreakdownContainer");
            if (timeContainer) {
                const diagDiv = document.createElement("div");
                diagDiv.id = "diagnosticReportContainer";
                diagDiv.style.marginTop = "16px";
                timeContainer.parentNode.insertBefore(diagDiv, timeContainer.nextSibling);
            } else {
                return;
            }
        }

        const pieces = window.RepertoireManager ? window.RepertoireManager.getActivePieces() : [];
        let globalAttempts = 0;
        let globalHits = 0;
        const tagStats = {};
        const allTrechos = [];
        let consolidatedCount = 0;
        let consolidatedAttempts = 0;

        // Extração e processamento vetorial da telemetria
        pieces.forEach(p => {
            (p.trechos || []).forEach(t => {
                const attempts = t.lifetimeAttempts || 0;
                const hits = t.lifetimeHits || 0;
                if (attempts > 0) {
                    globalAttempts += attempts;
                    globalHits += hits;
                    allTrechos.push({ pieceTitle: p.title.split('—')[0].trim(), ...t });

                    if (t.box >= 4 || t.consolidated) {
                        consolidatedCount++;
                        consolidatedAttempts += attempts;
                    }

                    (t.difficultyTags || []).forEach(tag => {
                        if (!tagStats[tag]) tagStats[tag] = { hits: 0, attempts: 0 };
                        tagStats[tag].hits += hits;
                        tagStats[tag].attempts += attempts;
                    });
                }
            });
        });

        // 🛡️ Isolamento estatístico: Remove a telemetria técnica e foca exclusivamente no Repertório
        const globalAcc = globalAttempts > 0 ? Math.round((globalHits / globalAttempts) * 100) : 0;
        const avgSpeed = consolidatedCount > 0 ? Math.round(consolidatedAttempts / consolidatedCount) : 0;

        // Filtra gargalos: não consolidados, com amostra razoável (>5 tentativas) e baixa precisão/hesitações
        const bottlenecks = allTrechos
            .filter(t => t.box < 4 && t.lifetimeAttempts > 5)
            .map(t => {
                const acc = Math.round((t.lifetimeHits / t.lifetimeAttempts) * 100);
                const failureRatio = t.lifetimeAttempts / Math.max(1, t.lifetimeHits);
                const rawRisk = (failureRatio * (1 + (t.slips || 0) * 0.5));
                return { ...t, acc, rawRisk };
            })
            .sort((a, b) => b.rawRisk - a.rawRisk)
            .slice(0, 3); // Top 3 gargalos crônicos

        let tagsHtml = "";
        const sortedTags = Object.entries(tagStats).sort((a, b) => b[1].attempts - a[1].attempts);
        
        if (sortedTags.length === 0) {
            tagsHtml = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px;">Nenhuma tag de dificuldade rastreada. Utilize o Modo Sanduíche para categorizar seus gargalos.</div>`;
        } else {
            tagsHtml = sortedTags.map(([tag, stats]) => {
                const tagAcc = Math.round((stats.hits / stats.attempts) * 100);
                const diff = tagAcc - globalAcc;
                const isWeakness = diff < -5;
                const barColor = isWeakness ? "var(--danger)" : (diff > 5 ? "var(--accent2)" : "var(--accent)");
                const diffLabel = diff > 0 ? `+${diff}%` : `${diff}%`;
                
                return `
                <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                        <span style="color: #fff; font-weight: 600;">${tag} <span style="color: var(--text-muted); font-size: 0.65rem; font-weight: normal;">(${stats.attempts} exec.)</span></span>
                        <div style="display: flex; gap: 8px; font-family: monospace;">
                            <span style="color: ${barColor}; font-weight: bold;">${diffLabel} vs Global</span>
                            <span style="color: #fff;">${tagAcc}%</span>
                        </div>
                    </div>
                    <div style="height: 5px; background: #0e1626; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${tagAcc}%; background: ${barColor}; height: 100%;"></div>
                    </div>
                </div>`;
            }).join('');
        }

        const bottlenecksHtml = bottlenecks.length === 0 
            ? `<div style="color: var(--accent2); font-size: 0.8rem;">Nenhum gargalo crônico detectado. Mielinização fluida.</div>`
            : bottlenecks.map(b => `
                <div style="background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #f87171; font-size: 0.8rem; display: block;">${b.pieceTitle} (${b.label})</strong>
                        <span style="color: var(--text-muted); font-size: 0.7rem;">Cx ${b.box} • ${b.lifetimeAttempts} tentativas • ${b.slips || 0} hesitações</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #fff; font-size: 0.9rem; font-weight: bold; font-family: monospace;">${b.acc}%</span>
                        <span style="display: block; font-size: 0.6rem; color: #f87171; text-transform: uppercase;">Precisão</span>
                    </div>
                </div>
            `).join('');

        document.getElementById("diagnosticReportContainer").innerHTML = `
        <div class="card" style="border-left: 4px solid var(--purple);">
            <h2>📊 Relatório Diagnóstico & Baselines</h2>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: -6px; margin-bottom: 16px;">Telemetria consolidada de eficiência biomecânica e velocidade de retenção.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Precisão Global do Acervo</div>
                    <div style="font-size: 1.8rem; font-weight: 900; color: var(--accent); font-family: monospace;">${globalAcc}%</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">Base: ${globalAttempts} execuções registradas</div>
                </div>
                <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Velocidade de Consolidação</div>
                    <div style="font-size: 1.8rem; font-weight: 900; color: var(--accent2); font-family: monospace;">~${avgSpeed}</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">Tentativas em média até atingir Caixa 4+</div>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: #fff; font-size: 0.9rem; margin-bottom: 12px; display: flex; justify-content: space-between;">
                    <span>🏷️ Análise de Desvio Padrão por Tag</span>
                </h4>
                ${tagsHtml}
            </div>

            <div>
                <h4 style="color: #fff; font-size: 0.9rem; margin-bottom: 10px;">⚠️ Gargalos Crônicos Detectados</h4>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px; line-height: 1.4;">
                    Trechos com alto volume de repetição e estagnação de maturidade. Sugestão: <strong>Isole no Bloco Sanduíche e aplique Tags de Dificuldade</strong> para identificar a falha biomecânica.
                </div>
                ${bottlenecksHtml}
            </div>
        </div>
        `;
    }

    renderAll(state) {
        this.renderLeitnerPyramid(state);
        this.renderCircleOfFifths(state);
        this.renderAntiDaCapoRadar(state);
        this.renderHeatmap(state);
        this.renderTimeBreakdown(state);
        this.renderWeeklyGoals(state); // 🎯 Ativação síncrona do Painel de Metas Granularizadas
        this.renderDiagnosticReport(state); // 📊 Ativação síncrona do Relatório Diagnóstico
    }
}
// Inicialização da classe - corrigida para instanciar apenas uma única vez globalmente
window.ChartsManager = new ChartsManagerClass();
// =========================================================================
// 🌀 AUXILIAR DO CÍRCULO DE QUINTAS: MATRIZ TONAL UNIVERSAL (4 POSSIBILIDADES)
// =========================================================================
window.openCircleToneDrawer = function(tone) {
    let drawer = document.getElementById("circleToneDrawer");
    if (!drawer) {
        drawer = document.createElement("div");
        drawer.id = "circleToneDrawer";
        drawer.style.cssText = "background: var(--card2); border: 2px solid var(--accent); border-radius: 16px; padding: 18px; margin-top: 14px; display: none; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: left; animation: fadeIn 0.2s ease-out;";
        
        const container = document.getElementById("circleOfFifthsContainer");
        if (container) container.appendChild(drawer);
        else document.body.appendChild(drawer); // Fallback
    }

    const state = window.StateManager.getState();
    const technical = state.technical || {};
    const normalizedTone = tone.replace("M", "").trim();

    // Tradutor para nomenclatura PT-BR
    const ptNames = {"C":"Dó", "G":"Sol", "D":"Ré", "A":"Lá", "E":"Mi", "B":"Si", "F#":"Fá#", "Db":"Réb", "Ab":"Láb", "Eb":"Mib", "Bb":"Sib", "F":"Fá"};
    const ptName = ptNames[normalizedTone] || normalizedTone;

    // Estrutura Universal de 4 Focos para qualquer tom clicado (Sem depender do banco de dados prévio)
    const targets = [
        { cat: "scales", tone: normalizedTone, id: `s_${normalizedTone.toLowerCase()}`, title: `Escala de ${ptName} Maior`, desc: "Padrão Russo / 4 Oitavas" },
        { cat: "scales", tone: `${normalizedTone}m`, id: `s_${normalizedTone.toLowerCase()}m`, title: `Escala de ${ptName} menor`, desc: "Natural, Harmônica e Melódica" },
        { cat: "arpeggios", tone: normalizedTone, id: `a_${normalizedTone.toLowerCase()}`, title: `Arpejo ${ptName} Maior`, desc: "Fundamental e Inversões" },
        { cat: "arpeggios", tone: `${normalizedTone}m`, id: `a_${normalizedTone.toLowerCase()}m`, title: `Arpejo ${ptName} menor`, desc: "Fundamental e Inversões" }
    ];

    const generateHtml = (t) => {
        const list = technical[t.cat] || [];
        const item = list.find(ex => ex.tone === t.tone || ex.id === t.id); // Verifica se o aluno já iniciou este fundamento

        const isAct = item && item.status === "active";
        const isDone = item && (item.status === "completed" || item.status === "stabilized");
        const isQueue = item && item.status === "queue";

        let badgeHtml = '<span style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">Disponível</span>';
        if (isAct) badgeHtml = '<span style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">Foco Ativo 🎯</span>';
        else if (isDone) badgeHtml = '<span style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">Estabilizado 🎓</span>';
        else if (isQueue) badgeHtml = '<span style="background: var(--card-inner); border: 1px solid var(--border); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">Fila</span>';

        const displayBpm = item ? item.bpm : 60;
        const displayTarget = item ? item.targetBpm : (t.cat === "scales" ? 90 : 80);

        return `
            <div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div>
                    <strong style="color: #fff; font-size: 0.85rem; display: block;">${item ? item.title : t.title}</strong>
                    <small style="color: var(--text-muted); font-size: 0.72rem; display: block; margin-top: 1px;">${item ? item.desc : t.desc}</small>
                    <small style="color: var(--text-muted); font-size: 0.68rem; display: block; margin-top: 2px;">BPM: <strong>${displayBpm}</strong> / Alvo: <strong>${displayTarget}</strong></small>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    ${badgeHtml}
                    <button class="btn btn-outline" style="font-size: 0.68rem; padding: 4px 8px; border-radius: 6px; margin-top: 0; ${isAct ? 'border-color: var(--danger); color: var(--danger);' : 'border-color: var(--accent); color: #93c5fd;'}" 
                            data-action="activate-tech-focus-direct" 
                            data-category="${t.cat}" 
                            data-id="${item ? item.id : t.id}"
                            data-title="${t.title}"
                            data-tone="${t.tone}"
                            data-desc="${t.desc}">
                        ${isAct ? 'Remover Foco' : 'Ativar Foco'}
                    </button>
                </div>
            </div>
        `;
    };

    drawer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            <strong style="color: var(--accent2); font-size: 1rem;">🌀 Matriz Tonal: ${normalizedTone} (${ptName})</strong>
            <button class="btn btn-reset" style="padding: 4px 10px; font-size: 0.72rem; margin-top: 0;" onclick="document.getElementById('circleToneDrawer').style.display='none'">Fechar ✕</button>
        </div>
        
        <span style="font-size: 0.75rem; font-weight: 700; color: #c084fc; text-transform: uppercase; display: block; margin-bottom: 6px;">🎹 Escalas Associadas</span>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
            ${generateHtml(targets[0])}
            ${generateHtml(targets[1])}
        </div>
        
        <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; display: block; margin-bottom: 6px;">⚡ Arpejos Associados</span>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${generateHtml(targets[2])}
            ${generateHtml(targets[3])}
        </div>
    `;
    drawer.style.display = "block";
};