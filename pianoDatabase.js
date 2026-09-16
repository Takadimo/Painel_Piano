/**
 * pianoDatabase.js - Banco de Dados Estático Unificado do Cockpit de Piano
 * Versão: 16.8.0 (Fase de Consolidação)
 * Aluno: Leonardo Moura | Data: 06/09/2026
 * 
 * Responsabilidades:
 * - Centraliza TODA a informação estática imutável do sistema (Mapeamento de partituras,
 *   estruturas teóricas de escalas, arpejos, cadências, trechos de peças do repertório
 *   e acervo completo de leitura à primeira vista).
 * - Desacopla as regras pedagógicas do estado dinâmico (Single Source of Truth - SSOT),
 *   evitando o inchaço de dados (data bloat) e corrupções no LocalStorage ou backups na Nuvem.
 * - Fornece suporte nativo para expansão fácil de novas peças, trechos ou exercícios no futuro.
 */

window.PianoDatabase = {
    // =========================================================================
    // 1. ⚙️ PILAR TÉCNICO (Fundamentos Imutáveis)
    // =========================================================================
    technical: {
        // --- 1.1 Escalas Maiores e Menores (30 no total) ---
        scales: {
            // Maiores (Sentido Horário)
            "s_c": { name: "Escala de Dó Maior", tone: "C", accents: "Nenhum acidente", fingering: { md: "1-2-3-1-2-3-4-1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1-4-3-2-1-3-2-1" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_g": { name: "Escala de Sol Maior", tone: "G", accents: "1 Sustenido (Fá#)", fingering: { md: "1-2-3-1-2-3-4-1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1-4-3-2-1-3-2-1" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_d": { name: "Escala de Ré Maior", tone: "D", accents: "2 Sustenidos (Fá#, Dó#)", fingering: { md: "1-2-3-1-2-3-4-1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1-4-3-2-1-3-2-1" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_a": { name: "Escala de Lá Maior", tone: "A", accents: "3 Sustenidos (Fá#, Dó#, Sol#)", fingering: { md: "1-2-3-1-2-3-4-1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1-4-3-2-1-3-2-1" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_e": { name: "Escala de Mi Maior", tone: "E", accents: "4 Sustenidos (Fá#, Dó#, Sol#, Ré#)", fingering: { md: "1-2-3-1-2-3-4-1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1-4-3-2-1-3-2-1" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_b": { name: "Escala de Si Maior", tone: "B", accents: "5 Sustenidos (Fá#, Dó#, Sol#, Ré#, Lá#)", fingering: { md: "1-2-3-1-2-3-4-1-2-3-1-2-3-4-5", me: "4-3-2-1-3-2-1-4-3-2-1-3-2-1-4" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_fs": { name: "Escala de Fá# Maior", tone: "F#", accents: "6 Sustenidos (Fá#, Dó#, Sol#, Ré#, Lá#, Mi#)", fingering: { md: "2-3-4-1-2-3-1-2-3-4-1-2-3-1-2", me: "4-3-2-1-3-2-1-4-3-2-1-3-2-1-4" }, desc: "Padrão Russo / 4 oitavas" },
            "s_cs": { name: "Escala de Dó# Maior", tone: "C#", accents: "7 Sustenidos (Fá#, Dó#, Sol#, Ré#, Lá#, Mi#, Si#)", fingering: { md: "2-3-1-2-3-4-1-2-3-1-2-3-4-1-2", me: "3-2-1-4-3-2-1-3-2-1-4-3-2-1-3" }, desc: "Padrão Russo / 4 oitavas" },
            // Maiores (Sentido Anti-Horário)
            "s_f": { name: "Escala de Fá Maior", tone: "F", accents: "1 Bemol (Sib)", fingering: { md: "1-2-3-4-1-2-3-1-2-3-4-1-2-3-4", me: "5-4-3-2-1-3-2-1-4-3-2-1-3-2-1" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_bb": { name: "Escala de Si bemol Maior", tone: "Bb", accents: "2 Bemóis (Sib, Mib)", fingering: { md: "2-1-2-3-1-2-3-4-1-2-3-1-2-3-4", me: "3-2-1-4-3-2-1-3-2-1-4-3-2-1-3" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_eb": { name: "Escala de Mi bemol Maior", tone: "Eb", accents: "3 Bemóis (Sib, Mib, Láb)", fingering: { md: "3-1-2-3-4-1-2-3-1-2-3-4-1-2-3", me: "3-2-1-4-3-2-1-3-2-1-4-3-2-1-3" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_ab": { name: "Escala de Lá bemol Maior", tone: "Ab", accents: "4 Bemóis (Sib, Mib, Láb, Réb)", fingering: { md: "3-4-1-2-3-1-2-3-4-1-2-3-1-2-3", me: "3-2-1-4-3-2-1-3-2-1-4-3-2-1-3" }, desc: "Movimento Paralelo / 4 oitavas" },
            "s_db": { name: "Escala de Ré bemol Maior", tone: "Db", accents: "5 Bemóis (Sib, Mib, Láb, Réb, Solb)", fingering: { md: "2-3-1-2-3-4-1-2-3-1-2-3-4-1-2", me: "3-2-1-4-3-2-1-3-2-1-4-3-2-1-3" }, desc: "Padrão Russo / 4 oitavas" },
            "s_gb": { name: "Escala de Sol bemol Maior", tone: "Gb", accents: "6 Bemóis (Sib, Mib, Láb, Réb, Solb, Dób)", fingering: { md: "2-3-4-1-2-3-1-2-3-4-1-2-3-1-2", me: "4-3-2-1-3-2-1-4-3-2-1-3-2-1-4" }, desc: "Padrão Russo / 4 oitavas" },
            "s_cb": { name: "Escala de Dó bemol Maior", tone: "Cb", accents: "7 Bemóis (Sib, Mib, Láb, Réb, Solb, Dób, Fáb)", fingering: { md: "4-3-2-1-3-2-1-4-3-2-1-3-2-1-4", me: "4-3-2-1-3-2-1-4-3-2-1-3-2-1-4" }, desc: "Movimento Paralelo / 4 oitavas" },

            // Menores
            "s_am": { name: "Escala de Lá menor", tone: "Am", accents: "Nenhum acidente", fingering: { md: "1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_em": { name: "Escala de Mi menor", tone: "Em", accents: "1 Sustenido (Fá#)", fingering: { md: "1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_bm": { name: "Escala de Si menor", tone: "Bm", accents: "2 Sustenidos (Fá#, Dó#)", fingering: { md: "1-2-3-1-2-3-4-5", me: "4-3-2-1-3-2-1-4" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_fsm": { name: "Escala de Fá# menor", tone: "F#m", accents: "3 Sustenidos (Fá#, Dó#, Sol#)", fingering: { md: "2-3-1-2-3-4-1-2", me: "4-3-2-1-3-2-1-4" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_csm": { name: "Escala de Dó# menor", tone: "C#m", accents: "4 Sustenidos (Fá#, Dó#, Sol#, Ré#)", fingering: { md: "2-3-1-2-3-4-1-2", me: "3-2-1-4-3-2-1-3" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_gsm": { name: "Escala de Sol# menor", tone: "G#m", accents: "5 Sustenidos (Fá#, Dó#, Sol#, Ré#, Lá#)", fingering: { md: "2-3-1-2-3-4-1-2", me: "3-2-1-4-3-2-1-3" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_dsm": { name: "Escala de Ré# menor", tone: "D#m", accents: "6 Sustenidos (Fá#, Dó#, Sol#, Ré#, Lá#, Mi#)", fingering: { md: "2-1-2-3-4-1-2-3", me: "2-1-4-3-2-1-3-2" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_asm": { name: "Escala de Lá# menor", tone: "A#m", accents: "7 Sustenidos (Fá#, Dó#, Sol#, Ré#, Lá#, Mi#, Si#)", fingering: { md: "2-1-2-3-4-1-2-3", me: "2-1-4-3-2-1-3-2" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_dm": { name: "Escala de Ré menor", tone: "Dm", accents: "1 Bemol (Sib)", fingering: { md: "1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_gm": { name: "Escala de Sol menor", tone: "Gm", accents: "2 Bemóis (Sib, Mib)", fingering: { md: "1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_cm": { name: "Escala de Dó menor", tone: "Cm", accents: "3 Bemóis (Sib, Mib, Láb)", fingering: { md: "1-2-3-1-2-3-4-5", me: "5-4-3-2-1-3-2-1" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_fm": { name: "Escala de Fá menor", tone: "Fm", accents: "4 Bemóis (Sib, Mib, Láb, Réb)", fingering: { md: "1-2-3-4-1-2-3-4", me: "5-4-3-2-1-3-2-1" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_bbm": { name: "Escala de Si bemol menor", tone: "Bbm", accents: "5 Bemóis (Sib, Mib, Láb, Réb, Solb)", fingering: { md: "2-1-2-3-4-1-2-3", me: "2-1-3-2-1-4-3-2" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_ebm": { name: "Escala de Mi bemol menor", tone: "Ebm", accents: "6 Bemóis (Sib, Mib, Láb, Réb, Solb, Dób)", fingering: { md: "2-1-2-3-4-1-2-3", me: "2-1-3-2-1-4-3-2" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" },
            "s_abm": { name: "Escala de Lá bemol menor", tone: "Abm", accents: "7 Bemóis (Sib, Mib, Láb, Réb, Solb, Dób, Fáb)", fingering: { md: "2-1-2-3-4-1-2-3", me: "2-1-3-2-1-4-3-2" }, desc: "Padrão Russo / 4 oitavas (Natural, Harmônica e Melódica)" }
        },
        
        // --- 1.2 Arpejos (Tétrades & Tríades) ---
        arpeggios: {
            "a1": { name: "Arpejo Fá menor (Posição Fundamental)", tone: "Fm", desc: "Fm fundamental / 4 oitavas", fingering: { md: "1-2-3-5", me: "5-4-2-1" } },
            "a2": { name: "Arpejo Fá menor (1ª Inversão)", tone: "Fm", desc: "Láb - Dó - Fá / 4 oitavas", fingering: { md: "1-2-4-5", me: "5-3-2-1" } },
            "a3": { name: "Arpejo Dó menor (2ª Inversão)", tone: "Cm", desc: "Sol - Dó - Mib / 4 oitavas", fingering: { md: "1-2-4-5", me: "5-4-2-1" } },
            "a4": { name: "Arpejo Sol Maior (Fundamental & Inversões)", tone: "G", desc: "Sol - Si - Ré / 4 oitavas", fingering: { md: "1-2-3-5", me: "5-4-2-1" } },
            "a5": { name: "Arpejo Dominante com 7ª (3ª Inversão)", tone: "V7", desc: "Tétrade com 7ª / 4 oitavas", fingering: { md: "1-2-3-4-5", me: "5-4-3-2-1" } }
        },

        // --- 1.3 Cadências ---
        cadences: {
            "c1": { name: "Cadência nos 12 Tons (Menor)", tone: "12T", desc: "Progressão Im - IVm - V7 - Im" },
            "c2": { name: "Cadência nos 12 Tons (Maior)", tone: "12T", desc: "Progressão I - IV - V7 - I" },
            "c3": { name: "Cadência com Inversões no Baixo", tone: "12T", desc: "Encadeamento com baixo cifrado" }
        }
    },

    // =========================================================================
    // 2. 🎼 REPERTÓRIO (Obras e seus grafos de Chunks/Pai-Filho para Subsumção)
    // =========================================================================
    repertoire: {
        pieces: {
            "p10": {
                number: 10,
                title: "10. Czech Song — N. Lyubarsky",
                composer: "N. Lyubarsky",
                bpm: "50 → 100",
                note: "Melodia no c.5 com som profundo.",
                chunks: {
                    "10.1.1-4": { label: "10.1.1-4", passo: 1, compassos: "1-4", parent: "10.2.1-8" },
                    "10.1.5-8": { label: "10.1.5-8", passo: 1, compassos: "5-8", parent: "10.2.1-8" },
                    "10.1.9-12": { label: "10.1.9-12", passo: 1, compassos: "9-12", parent: "10.2.9-16" },
                    "10.1.13-16": { label: "10.1.13-16", passo: 1, compassos: "13-16", parent: "10.2.9-16" },
                    "10.1.17-20": { label: "10.1.17-20", passo: 1, compassos: "17-20", parent: "10.2.13-20" },
                    "10.2.1-8": { label: "10.2.1-8", passo: 2, compassos: "1-8", parent: "10.4.1-20", children: ["10.1.1-4", "10.1.5-8"], baseBlockIds: ["10.1.1-4", "10.1.5-8"] },
                    "10.2.9-16": { label: "10.2.9-16", passo: 2, compassos: "9-16", parent: "10.4.1-20", children: ["10.1.9-12", "10.1.13-16"], baseBlockIds: ["10.1.9-12", "10.1.13-16"] },
                    "10.2.13-20": { label: "10.2.13-20", passo: 2, compassos: "13-20", parent: "10.4.1-20", children: ["10.1.13-16", "10.1.17-20"], baseBlockIds: ["10.1.13-16", "10.1.17-20"] },
                    "10.4.1-20": { label: "10.4.1-20", passo: 4, compassos: "1-20", children: ["10.2.1-8", "10.2.9-16", "10.2.13-20"] }
                }
            },
            "p11": {
                number: 11,
                title: "11. A Pleasant Mood — D. Tyurk",
                composer: "D. Tyurk",
                bpm: "50 → 80",
                note: "ME mais leve que a voz superior.",
                chunks: {
                    "11.1.1-4": { label: "11.1.1-4", passo: 1, compassos: "1-4", parent: "11.2.1-8" },
                    "11.1.5-8": { label: "11.1.5-8", passo: 1, compassos: "5-8", parent: "11.2.1-8" },
                    "11.1.9-12": { label: "11.1.9-12", passo: 1, compassos: "9-12", parent: "11.2.9-16" },
                    "11.1.13-16": { label: "11.1.13-16", passo: 1, compassos: "13-16", parent: "11.2.9-16" },
                    "11.2.1-8": { label: "11.2.1-8", passo: 2, compassos: "1-8", parent: "11.4.1-16", children: ["11.1.1-4", "11.1.5-8"], baseBlockIds: ["11.1.1-4", "11.1.5-8"] },
                    "11.2.9-16": { label: "11.2.9-16", passo: 2, compassos: "9-16", parent: "11.4.1-16", children: ["11.1.9-12", "11.1.13-16"], baseBlockIds: ["11.1.9-12", "11.1.13-16"] },
                    "11.4.1-16": { label: "11.4.1-16", passo: 4, compassos: "1-16", children: ["11.2.1-8", "11.2.9-16"] }
                }
            },
            "p12": {
                number: 12,
                title: "12. Bourrée — Ya. Sen-Lyuk",
                composer: "Ya. Sen-Lyuk",
                bpm: "60 → 100",
                note: "Equilíbrio staccato vs legato.",
                chunks: {
                    "12.1.1-4": { label: "12.1.1-4", passo: 1, compassos: "1-4", parent: "12.2.1-8" },
                    "12.1.5-8": { label: "12.1.5-8", passo: 1, compassos: "5-8", parent: "12.2.1-8" },
                    "12.1.9-12": { label: "12.1.9-12", passo: 1, compassos: "9-12", parent: "12.2.9-16" },
                    "12.1.13-16": { label: "12.1.13-16", passo: 1, compassos: "13-16", parent: "12.2.9-16" },
                    "12.1.17-20": { label: "12.1.17-20", passo: 1, compassos: "17-20", parent: "12.2.13-20" },
                    "12.2.1-8": { label: "12.2.1-8", passo: 2, compassos: "1-8", parent: "12.4.1-20", children: ["12.1.1-4", "12.1.5-8"], baseBlockIds: ["12.1.1-4", "12.1.5-8"] },
                    "12.2.9-16": { label: "12.2.9-16", passo: 2, compassos: "9-16", parent: "12.4.1-20", children: ["12.1.9-12", "12.1.13-16"], baseBlockIds: ["12.1.9-12", "12.1.13-16"] },
                    "12.2.13-20": { label: "12.2.13-20", passo: 2, compassos: "13-20", parent: "12.4.1-20", children: ["12.1.13-16", "12.1.17-20"], baseBlockIds: ["12.1.13-16", "12.1.17-20"] },
                    "12.4.1-20": { label: "12.4.1-20", passo: 4, compassos: "1-20", children: ["12.2.1-8", "12.2.9-16", "12.2.13-20"] }
                }
            },
            "p13": {
                number: 13,
                title: "13. Minuet em Fá Maior — W. Mozart",
                composer: "W. Mozart",
                bpm: "40 → 75",
                note: "Atenção rigorosa à quiáltera no c. 7.",
                chunks: {
                    "13.1.1-4": { label: "13.1.1-4", passo: 1, compassos: "1-4", parent: "13.2.1-8" },
                    "13.1.5-8": { label: "13.1.5-8", passo: 1, compassos: "5-8", parent: "13.2.1-8" },
                    "13.1.9-12": { label: "13.1.9-12", passo: 1, compassos: "9-12", parent: "13.2.9-16" },
                    "13.1.13-16": { label: "13.1.13-16", passo: 1, compassos: "13-16", parent: "13.2.9-16" },
                    "13.1.17-20": { label: "13.1.17-20", passo: 1, compassos: "17-20", parent: "13.2.17-24" },
                    "13.1.21-24": { label: "13.1.21-24", passo: 1, compassos: "21-24", parent: "13.2.17-24", mirrorOf: "13.1.1-4" },
                    "13.2.1-8": { label: "13.2.1-8", passo: 2, compassos: "1-8", parent: "13.4.1-24", children: ["13.1.1-4", "13.1.5-8"], baseBlockIds: ["13.1.1-4", "13.1.5-8"] },
                    "13.2.9-16": { label: "13.2.9-16", passo: 2, compassos: "9-16", parent: "13.4.1-24", children: ["13.1.9-12", "13.1.13-16"], baseBlockIds: ["13.1.9-12", "13.1.13-16"] },
                    "13.2.17-24": { label: "13.2.17-24", passo: 2, compassos: "17-24", parent: "13.4.1-24", children: ["13.1.17-20", "13.1.21-24"], baseBlockIds: ["13.1.17-20", "13.1.21-24"] },
                    "13.4.1-24": { label: "13.4.1-24", passo: 4, compassos: "1-24", children: ["13.2.1-8", "13.2.9-16", "13.2.17-24"] }
                }
            },
            "p14": {
                number: 14,
                title: "14. Prelude — B. Dvarionas",
                composer: "B. Dvarionas",
                bpm: "60 → 100",
                note: "Cantilena na ME, som cantante",
                chunks: {
                    // Passo 1: Mãos Separadas (Microblocos)
                    "14.1.1-2.MD": { label: "14.1.1-2.MD", passo: 1, compassos: "1-2", parent: "14.2.1-2_5-6.MJ", hand: "MD" },
                    "14.1.1-2.ME": { label: "14.1.1-2.ME", passo: 1, compassos: "1-2", parent: "14.2.1-2_5-6.MJ", hand: "ME" },
                    "14.1.3-4.MD": { label: "14.1.3-4.MD", passo: 1, compassos: "3-4", parent: "14.2.3-4.MJ", hand: "MD" },
                    "14.1.3-4.ME": { label: "14.1.3-4.ME", passo: 1, compassos: "3-4", parent: "14.2.3-4.MJ", hand: "ME" },
                    "14.1.7-8.MD": { label: "14.1.7-8.MD", passo: 1, compassos: "7-8", parent: "14.2.7-8.MJ", hand: "MD" },
                    "14.1.7-8.ME": { label: "14.1.7-8.ME", passo: 1, compassos: "7-8", parent: "14.2.7-8.MJ", hand: "ME" },
                    "14.1.9-10.MD": { label: "14.1.9-10.MD", passo: 1, compassos: "9-10", parent: "14.2.9-10.MJ", hand: "MD" },
                    "14.1.9-10.ME": { label: "14.1.9-10.ME", passo: 1, compassos: "9-10", parent: "14.2.9-10.MJ", hand: "ME" },
                    "14.1.11-12.ME": { label: "14.1.11-12.ME", passo: 1, compassos: "11-12", parent: "14.2.11-12.MJ", hand: "ME" },
                    "14.1.13-14.MD": { label: "14.1.13-14.MD", passo: 1, compassos: "13-14", parent: "14.2.13-14.MJ", hand: "MD" },
                    "14.1.13-14.ME": { label: "14.1.13-14.ME", passo: 1, compassos: "13-14", parent: "14.2.13-14.MJ", hand: "ME" },
                    "14.1.15-16.MD": { label: "14.1.15-16.MD", passo: 1, compassos: "15-16", parent: "14.2.15-16.MJ", hand: "MD" },
                    "14.1.15-16.ME": { label: "14.1.15-16.ME", passo: 1, compassos: "15-16", parent: "14.2.15-16.MJ", hand: "ME" },
                    "14.1.17-18.ME": { label: "14.1.17-18.ME", passo: 1, compassos: "17-18", parent: "14.2.17-18.MJ", hand: "ME" },

                    // Passo 2: Mãos Juntas (União)
                    "14.2.1-2_5-6.MJ": { label: "14.2.1-2_5-6.MJ", passo: 2, compassos: "1-2/5-6", hand: "MJ" },
                    "14.2.3-4.MJ": { label: "14.2.3-4.MJ", passo: 2, compassos: "3-4", hand: "MJ" },
                    "14.2.7-8.MJ": { label: "14.2.7-8.MJ", passo: 2, compassos: "7-8", hand: "MJ" },
                    "14.2.9-10.MJ": { label: "14.2.9-10.MJ", passo: 2, compassos: "9-10", hand: "MJ" },
                    "14.2.11-12.MJ": { label: "14.2.11-12.MJ", passo: 2, compassos: "11-12", hand: "MJ" },
                    "14.2.13-14.MJ": { label: "14.2.13-14.MJ", passo: 2, compassos: "13-14", hand: "MJ" },
                    "14.2.15-16.MJ": { label: "14.2.15-16.MJ", passo: 2, compassos: "15-16", hand: "MJ" },
                    "14.2.17-18.MJ": { label: "14.2.17-18.MJ", passo: 2, compassos: "17-18", hand: "MJ" }
                }
            }
            
        },
        
        // --- 2.1 Mapa CDN de Imagens das Partituras (BIBLIOTECA LOCAL) ---
        cloudImageMap: {
            // --- 10. Czech Song (9 trechos) ---
            "10.1.1-4": "10.1.1-4.png",
            "10.1.5-8": "10.1.5-8.png",
            "10.1.9-12": "10.1.9-12.png",
            "10.1.13-16": "10.1.13-16.png",
            "10.1.17-20": "10.1.17-20.png",
            "10.2.1-8": "10.2.1-8.png",
            "10.2.9-16": "10.2.9-16.png",
            "10.2.13-20": "10.2.13-20.png",
            "10.4.1-20": "10.4.1-20.png",
            
            // --- 11. A Pleasant Mood (7 trechos) ---
            "11.1.1-4": "11.1.1-4.png",
            "11.1.5-8": "11.1.5-8.png",
            "11.1.9-12": "11.1.9-12.png",
            "11.1.13-16": "11.1.13-16.png",
            "11.2.1-8": "11.2.1-8.png",
            "11.2.9-16": "11.2.9-16.png",
            "11.4.1-16": "11.4.1-16.png",
            
            // --- 12. Bourrée (9 trechos) ---
            "12.1.1-4": "12.1.1-4.png",
            "12.1.5-8": "12.1.5-8.png",
            "12.1.9-12": "12.1.9-12.png",
            "12.1.13-16": "12.1.13-16.png",
            "12.1.17-20": "12.1.17-20.png",
            "12.2.1-8": "12.2.1-8.png",
            "12.2.9-16": "12.2.9-16.png",
            "12.2.13-20": "12.2.13-20.png",
            "12.4.1-20": "12.4.1-20.png",
            
            // --- 13. Minuet em Fá Maior (10 trechos) ---
            "13.1.1-4": "13.1.1-4.png",
            "13.1.5-8": "13.1.5-8.png",
            "13.1.9-12": "13.1.9-12.png",
            "13.1.13-16": "13.1.13-16.png",
            "13.1.17-20": "13.1.17-20.png",
            "13.1.21-24": "13.1.21-24.png",
            "13.2.1-8": "13.2.1-8.png",
            "13.2.9-16": "13.2.9-16.png",
            "13.2.17-24": "13.2.17-24.png",
            "13.4.1-24": "13.4.1-24.png",

            // --- 14. Prelude (Microblocos) ---
            "14.1.1-2.MD": "14.1.1-2.MD.png",
            "14.1.1-2.ME": "14.1.1-2.ME.png",
            "14.1.11-12.ME": "14.1.11-12.ME.png",
            "14.1.13-14.MD": "14.1.13-14.MD.png",
            "14.1.13-14.ME": "14.1.13-14.ME.png",
            "14.1.15-16.MD": "14.1.15-16.MD.png",
            "14.1.15-16.ME": "14.1.15-16.ME.png",
            "14.1.17-18.ME": "14.1.17-18.ME.png",
            "14.1.3-4.MD": "14.1.3-4.MD.png",
            "14.1.3-4.ME": "14.1.3-4.ME.png",
            "14.1.7-8.MD": "14.1.7-8.MD.png",
            "14.1.7-8.ME": "14.1.7-8.ME.png",
            "14.1.9-10.MD": "14.1.9-10.MD.png",
            "14.1.9-10.ME": "14.1.9-10.ME.png",
            "14.2.1-2_5-6.MJ": "14.2.1-2_5-6.MJ.png",
            "14.2.11-12.MJ": "14.2.11-12.MJ.png",
            "14.2.13-14.MJ": "14.2.13-14.MJ.png",
            "14.2.15-16.MJ": "14.2.15-16.MJ.png",
            "14.2.17-18.MJ": "14.2.17-18.MJ.png",
            "14.2.3-4.MJ": "14.2.3-4.MJ.png",
            "14.2.7-8.MJ": "14.2.7-8.MJ.png",
            "14.2.9-10.MJ": "14.2.9-10.MJ.png"
        }
    },

    // =========================================================================
    // 3. 🧭 BIBLIOTECA DE LEITURA (Ordem Curricular Oficial - Biblioteca Local)
    // =========================================================================
    sightReading: {
        // --- 3.2 Matriz de Leitura (Esteira Única Sequencial) ---
        pieces: [
            { id: "sr_001", collection: "all", number: 1, title: "01_Kids_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_002", collection: "all", number: 2, title: "01_Lesson_Primer_Pag_36.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_003", collection: "all", number: 3, title: "partitura_pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_004", collection: "all", number: 4, title: "partitura_pag_07.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_005", collection: "all", number: 5, title: "partitura_pag_08.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_006", collection: "all", number: 6, title: "partitura_pag_09.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_007", collection: "all", number: 7, title: "partitura_pag_10.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_008", collection: "all", number: 8, title: "partitura_pag_11.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_009", collection: "all", number: 9, title: "02_Kids_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_010", collection: "all", number: 10, title: "02_Lesson_Primer_Pag_37.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_011", collection: "all", number: 11, title: "03_Kids_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_012", collection: "all", number: 12, title: "03_Lesson_Primer_Pag_38.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_013", collection: "all", number: 13, title: "partitura_pag_12.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_014", collection: "all", number: 14, title: "partitura_pag_13.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_015", collection: "all", number: 15, title: "partitura_pag_14.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_016", collection: "all", number: 16, title: "partitura_pag_15.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_017", collection: "all", number: 17, title: "04_Kids_Pag_07.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_018", collection: "all", number: 18, title: "04_Lesson_Primer_Pag_39.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_019", collection: "all", number: 19, title: "05_Kids_Pag_08.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_020", collection: "all", number: 20, title: "05_Lesson_Primer_Pag_40.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_021", collection: "all", number: 21, title: "partitura_pag_16.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_022", collection: "all", number: 22, title: "partitura_pag_17.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_023", collection: "all", number: 23, title: "partitura_pag_18.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_024", collection: "all", number: 24, title: "partitura_pag_19.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_025", collection: "all", number: 25, title: "partitura_pag_20.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_026", collection: "all", number: 26, title: "partitura_pag_21.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_027", collection: "all", number: 27, title: "06_Kids_Pag_09.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_028", collection: "all", number: 28, title: "06_Lesson_Primer_Pag_41.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_029", collection: "all", number: 29, title: "partitura_pag_22.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_030", collection: "all", number: 30, title: "partitura_pag_23.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_031", collection: "all", number: 31, title: "partitura_pag_24.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_032", collection: "all", number: 32, title: "partitura_pag_25.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_033", collection: "all", number: 33, title: "07_Kids_Pag_10.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_034", collection: "all", number: 34, title: "07_Lesson_Primer_Pag_42.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_035", collection: "all", number: 35, title: "partitura_pag_26.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_036", collection: "all", number: 36, title: "partitura_pag_27.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_037", collection: "all", number: 37, title: "partitura_pag_28.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_038", collection: "all", number: 38, title: "partitura_pag_29.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_039", collection: "all", number: 39, title: "08_Kids_Pag_11.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_040", collection: "all", number: 40, title: "08_Lesson_Primer_Pag_43.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_041", collection: "all", number: 41, title: "09_Kids_Pag_12.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_042", collection: "all", number: 42, title: "09_Lesson_Primer_Pag_44.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_043", collection: "all", number: 43, title: "partitura_pag_30.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_044", collection: "all", number: 44, title: "partitura_pag_31.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_045", collection: "all", number: 45, title: "partitura_pag_32.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_046", collection: "all", number: 46, title: "partitura_pag_33.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_047", collection: "all", number: 47, title: "10_Kids_Pag_13.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_048", collection: "all", number: 48, title: "10_Lesson_Primer_Pag_45.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_049", collection: "all", number: 49, title: "partitura_pag_34.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_050", collection: "all", number: 50, title: "partitura_pag_35.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_051", collection: "all", number: 51, title: "partitura_pag_36.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_052", collection: "all", number: 52, title: "partitura_pag_37.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_053", collection: "all", number: 53, title: "11_Kids_Pag_14.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_054", collection: "all", number: 54, title: "11_Lesson_Primer_Pag_46.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_055", collection: "all", number: 55, title: "partitura_pag_38.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_056", collection: "all", number: 56, title: "partitura_pag_39.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_057", collection: "all", number: 57, title: "partitura_pag_40.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_058", collection: "all", number: 58, title: "partitura_pag_41.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_059", collection: "all", number: 59, title: "12_Kids_Pag_15.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_060", collection: "all", number: 60, title: "12_Lesson_Primer_Pag_47.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_061", collection: "all", number: 61, title: "13_Kids_Pag_16.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_062", collection: "all", number: 62, title: "14_Kids_Pag_17.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_063", collection: "all", number: 63, title: "15_Kids_Pag_18.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_064", collection: "all", number: 64, title: "16_Kids_Pag_19.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_065", collection: "all", number: 65, title: "17_Kids_Pag_20.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_066", collection: "all", number: 66, title: "01_Classics_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_067", collection: "all", number: 67, title: "01_Disney_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_068", collection: "all", number: 68, title: "01_Favorites_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_069", collection: "all", number: 69, title: "01_Hymns_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_070", collection: "all", number: 70, title: "01_Jazz_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_071", collection: "all", number: 71, title: "01_Natal_Dueto_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_072", collection: "all", number: 72, title: "01_Natal_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_073", collection: "all", number: 73, title: "01_Natal_Primer_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_074", collection: "all", number: 74, title: "01_Performance_Primer_Pag_12.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_075", collection: "all", number: 75, title: "01_Pop_Repertoire_Primer_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_076", collection: "all", number: 76, title: "01_Rock_Pag_04.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_077", collection: "all", number: 77, title: "02_China_Pag_07.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_078", collection: "all", number: 78, title: "02_Classics_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_079", collection: "all", number: 79, title: "02_Disney_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_080", collection: "all", number: 80, title: "02_Favorites_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_081", collection: "all", number: 81, title: "02_Hymns_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_082", collection: "all", number: 82, title: "02_Jazz_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_083", collection: "all", number: 83, title: "02_Natal_Dueto_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_084", collection: "all", number: 84, title: "02_Natal_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_085", collection: "all", number: 85, title: "02_Natal_Primer_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_086", collection: "all", number: 86, title: "02_Performance_Primer_Pag_13.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_087", collection: "all", number: 87, title: "02_Pop_Repertoire_Primer_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_088", collection: "all", number: 88, title: "02_Rock_Pag_05.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_089", collection: "all", number: 89, title: "03_China_Pag_08.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_090", collection: "all", number: 90, title: "03_Classics_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_091", collection: "all", number: 91, title: "03_Disney_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_092", collection: "all", number: 92, title: "03_Favorites_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_093", collection: "all", number: 93, title: "03_Hymns_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_094", collection: "all", number: 94, title: "03_Jazz_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_095", collection: "all", number: 95, title: "03_Natal_Dueto_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_096", collection: "all", number: 96, title: "03_Natal_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_097", collection: "all", number: 97, title: "03_Natal_Primer_Pag_06.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_098", collection: "all", number: 98, title: "03_Performance_Primer_Pag_14.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 },
            { id: "sr_099", collection: "all", number: 99, title: "03_Pop_Repertoire_Primer_Pag_08.png", key: "Dó Maior", timeSig: "4/4", hand: "MJ", targetBpm: 60 }
        ]
    }
};

// --- GARANTIA DOS EXPOSITORES GLOBAIS (BIBLIOTECA LOCAL COM PASTAS) ---
window.getScoreImageUrl = function(excerptLabelOrId, pieceId) {
    if (!excerptLabelOrId) return "";
    const cleanId = String(excerptLabelOrId).trim();
    
    // Mapeamento das pastas físicas de cada peça no seu disco
    const folderMap = {
        "10": "10.Czech_Song",
        "11": "11.Pleasant_Mood",
        "12": "12.Bourreé",
        "13": "13. Minuet",
        "14": "14.Prelude"
    };

    // Descobre a pasta com base no prefixo do ID (ex: "14.1.1..." pega o "14")
    const prefix = cleanId.split(".")[0];
    const folderName = folderMap[prefix] || "repertorio";
    
    // Verifica a extensão
    const extension = cleanId.toLowerCase().match(/\.(png|jpg|jpeg)$/) ? "" : ".png";
    
    return `assets/scores/repertorio/${folderName}/${cleanId}${extension}`;
};