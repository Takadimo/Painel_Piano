/**
 * repertoire.js - Matriz de Repertório, Mapeamento CDN do Google Drive & Telemetria Hierárquica
 * Painel de Estudos de Piano — Versão 15.1.0 (Consolidada)
 * Aluno: Leonardo Moura | Data: 29/08/2026
 *
 * Responsabilidades:
 * - Matriz higienizada de 35 trechos da arquitetura russa de frases musicais (sem inflação de trechos)
 * - Mapeamento CDN Google Drive de alta resolução para todos os recortes de partitura
 * - Calibração rigorosa do Marco Zero na Pirâmide Leitner (Passo 1 em Caixa 1, Passos 2+ em Caixa 0)
 * - Trechos virgens (lifetimeAttempts === 0) sem tags estáticas de dificuldade que induzam falso IFM
 * - Exposição global e segura de getScoreImageUrl para garantir renderização de imagens na aba Peças e na Sala
 * - Verificação de desbloqueio de encadeamentos (isPasso2Unlocked) com validação de microblocos base na Caixa 2+
 * - Rastreamento hierárquico de tempo e histórico de repetições por trecho
 * - Relatório de prática semanal formatado para compartilhamento com a professora
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

const DEFAULT_REPERTOIRE = {
  active: [
    {
      id: "p12",
      number: 12,
      title: "12. Bourrée — Ya. Sen-Lyuk",
      composer: "Ya. Sen-Lyuk",
      bpm: "60 → 100",
      phase: "Fatiamento Progressivo",
      pct: 0,
      note: "Equilíbrio staccato vs legato.",
      isPaused: false,
      totalPracticeSeconds: 0,
      trechos: [
        { id: "12.1.1-4", label: "12.1.1-4", passo: 1, compassos: "1-4", parent: "12.2.1-8", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: new Date().toLocaleDateString('sv-SE'), slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.1.5-8", label: "12.1.5-8", passo: 1, compassos: "5-8", parent: "12.2.1-8", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: new Date().toLocaleDateString('sv-SE'), slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.1.9-12", label: "12.1.9-12", passo: 1, compassos: "9-12", parent: "12.2.9-16", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.1.13-16", label: "12.1.13-16", passo: 1, compassos: "13-16", parent: "12.2.9-16", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.1.17-20", label: "12.1.17-20", passo: 1, compassos: "17-20", parent: "12.2.13-20", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.2.1-8", label: "12.2.1-8", passo: 2, compassos: "1-8", parent: "12.4.1-20", children: ["12.1.1-4", "12.1.5-8"], baseBlockIds: ["12.1.1-4", "12.1.5-8"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.2.9-16", label: "12.2.9-16", passo: 2, compassos: "9-16", parent: "12.4.1-20", children: ["12.1.9-12", "12.1.13-16"], baseBlockIds: ["12.1.9-12", "12.1.13-16"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.2.13-20", label: "12.2.13-20", passo: 2, compassos: "13-20", parent: "12.4.1-20", children: ["12.1.13-16", "12.1.17-20"], baseBlockIds: ["12.1.13-16", "12.1.17-20"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "12.4.1-20", label: "12.4.1-20", passo: 4, compassos: "1-20", children: ["12.2.1-8", "12.2.9-16", "12.2.13-20"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] }
      ]
    },
    {
      id: "p13",
      number: 13,
      title: "13. Minuet em Fá Maior — W. Mozart",
      composer: "W. Mozart",
      bpm: "40 → 75",
      phase: "Fatiamento Progressivo",
      pct: 0,
      note: "Atenção rigorosa à quiáltera no c. 7.",
      isPaused: false,
      totalPracticeSeconds: 0,
      trechos: [
        { id: "13.1.1-4", label: "13.1.1-4", passo: 1, compassos: "1-4", parent: "13.2.1-8", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.1.5-8", label: "13.1.5-8", passo: 1, compassos: "5-8", parent: "13.2.1-8", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.1.9-12", label: "13.1.9-12", passo: 1, compassos: "9-12", parent: "13.2.9-16", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.1.13-16", label: "13.1.13-16", passo: 1, compassos: "13-16", parent: "13.2.9-16", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.1.17-20", label: "13.1.17-20", passo: 1, compassos: "17-20", parent: "13.2.17-24", box: 1, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: new Date().toLocaleDateString('sv-SE'), slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.1.21-24", label: "13.1.21-24", passo: 1, compassos: "21-24", parent: "13.2.17-24", mirrorOf: "13.1.1-4", box: 1, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: new Date().toLocaleDateString('sv-SE'), slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.2.1-8", label: "13.2.1-8", passo: 2, compassos: "1-8", parent: "13.4.1-24", children: ["13.1.1-4", "13.1.5-8"], baseBlockIds: ["13.1.1-4", "13.1.5-8"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.2.9-16", label: "13.2.9-16", passo: 2, compassos: "9-16", parent: "13.4.1-24", children: ["13.1.9-12", "13.1.13-16"], baseBlockIds: ["13.1.9-12", "13.1.13-16"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.2.17-24", label: "13.2.17-24", passo: 2, compassos: "17-24", parent: "13.4.1-24", children: ["13.1.17-20", "13.1.21-24"], baseBlockIds: ["13.1.17-20", "13.1.21-24"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "13.4.1-24", label: "13.4.1-24", passo: 4, compassos: "1-24", children: ["13.2.1-8", "13.2.9-16", "13.2.17-24"], box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] }
      ]
    },
    {
      id: "p14",
      number: 14,
      title: "14. Prelude — B. Dvarionas",
      composer: "B. Dvarionas",
      bpm: "60 → 100",
      phase: "Fatiamento Progressivo",
      pct: 0,
      note: "Cantilena na ME, som cantante",
      isPaused: false,
      totalPracticeSeconds: 0,
      trechos: [
        { id: "14.1.1-2.MD", label: "14.1.1-2.MD", passo: 1, compassos: "1-2", parent: "14.2.1-2_5-6.MJ", box: 0, mao: "MD", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.1-2.ME", label: "14.1.1-2.ME", passo: 1, compassos: "1-2", parent: "14.2.1-2_5-6.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.3-4.MD", label: "14.1.3-4.MD", passo: 1, compassos: "3-4", parent: "14.2.3-4.MJ", box: 0, mao: "MD", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.3-4.ME", label: "14.1.3-4.ME", passo: 1, compassos: "3-4", parent: "14.2.3-4.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.7-8.MD", label: "14.1.7-8.MD", passo: 1, compassos: "7-8", parent: "14.2.7-8.MJ", box: 0, mao: "MD", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.7-8.ME", label: "14.1.7-8.ME", passo: 1, compassos: "7-8", parent: "14.2.7-8.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.9-10.MD", label: "14.1.9-10.MD", passo: 1, compassos: "9-10", parent: "14.2.9-10.MJ", box: 0, mao: "MD", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.9-10.ME", label: "14.1.9-10.ME", passo: 1, compassos: "9-10", parent: "14.2.9-10.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.11-12.ME", label: "14.1.11-12.ME", passo: 1, compassos: "11-12", parent: "14.2.11-12.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.13-14.MD", label: "14.1.13-14.MD", passo: 1, compassos: "13-14", parent: "14.2.13-14.MJ", box: 0, mao: "MD", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.13-14.ME", label: "14.1.13-14.ME", passo: 1, compassos: "13-14", parent: "14.2.13-14.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.15-16.MD", label: "14.1.15-16.MD", passo: 1, compassos: "15-16", parent: "14.2.15-16.MJ", box: 0, mao: "MD", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.15-16.ME", label: "14.1.15-16.ME", passo: 1, compassos: "15-16", parent: "14.2.15-16.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.1.17-18.ME", label: "14.1.17-18.ME", passo: 1, compassos: "17-18", parent: "14.2.17-18.MJ", box: 0, mao: "ME", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.1-2_5-6.MJ", label: "14.2.1-2_5-6.MJ", passo: 2, compassos: "1-2/5-6", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.3-4.MJ", label: "14.2.3-4.MJ", passo: 2, compassos: "3-4", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.7-8.MJ", label: "14.2.7-8.MJ", passo: 2, compassos: "7-8", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.9-10.MJ", label: "14.2.9-10.MJ", passo: 2, compassos: "9-10", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.11-12.MJ", label: "14.2.11-12.MJ", passo: 2, compassos: "11-12", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.13-14.MJ", label: "14.2.13-14.MJ", passo: 2, compassos: "13-14", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.15-16.MJ", label: "14.2.15-16.MJ", passo: 2, compassos: "15-16", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: "14.2.17-18.MJ", label: "14.2.17-18.MJ", passo: 2, compassos: "17-18", parent: "14.4.1-18", box: 0, mao: "MJ", isCorrectingHabit: false, consolidated: false, nextReviewDate: null, slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] }
      ]
    }
  ],
  paused: [
    {
      id: "p10",
      number: 10,
      title: "10. Czech Song — N. Lyubarsky",
      composer: "N. Lyubarsky",
      bpm: "50 → 100",
      phase: "Fatiamento Progressivo",
      pct: 0,
      note: "Melodia no c.5 com som profundo.",
      isPaused: true,
      trechos: [
        { id: "10.1.1-4", label: "10.1.1-4", passo: 1, compassos: "1-4", box: 0, mao: "MJ", consolidated: false },
        { id: "10.1.5-8", label: "10.1.5-8", passo: 1, compassos: "5-8", box: 0, mao: "MJ", consolidated: false },
        { id: "10.1.9-12", label: "10.1.9-12", passo: 1, compassos: "9-12", box: 0, mao: "MJ", consolidated: false },
        { id: "10.1.13-16", label: "10.1.13-16", passo: 1, compassos: "13-16", box: 0, mao: "MJ", consolidated: false },
        { id: "10.1.17-20", label: "10.1.17-20", passo: 1, compassos: "17-20", box: 0, mao: "MJ", consolidated: false },
        { id: "10.2.1-8", label: "10.2.1-8", passo: 2, compassos: "1-8", baseBlockIds: ["10.1.1-4", "10.1.5-8"], box: 0, mao: "MJ", consolidated: false },
        { id: "10.2.9-16", label: "10.2.9-16", passo: 2, compassos: "9-16", baseBlockIds: ["10.1.9-12", "10.1.13-16"], box: 0, mao: "MJ", consolidated: false },
        { id: "10.2.13-20", label: "10.2.13-20", passo: 2, compassos: "13-20", baseBlockIds: ["10.1.13-16", "10.1.17-20"], box: 0, mao: "MJ", consolidated: false },
        { id: "10.4.1-20", label: "10.4.1-20", passo: 4, compassos: "1-20", box: 0, mao: "MJ", consolidated: false }
      ]
    },
    {
      id: "p11",
      number: 11,
      title: "11. A Pleasant Mood — D. Tyurk",
      composer: "D. Tyurk",
      bpm: "50 → 80",
      phase: "Fatiamento Progressivo",
      pct: 0,
      note: "ME mais leve que a voz superior.",
      isPaused: true,
      trechos: [
        { id: "11.1.1-4", label: "11.1.1-4", passo: 1, compassos: "1-4", box: 0, mao: "MJ", consolidated: false },
        { id: "11.1.5-8", label: "11.1.5-8", passo: 1, compassos: "5-8", box: 0, mao: "MJ", consolidated: false },
        { id: "11.1.9-12", label: "11.1.9-12", passo: 1, compassos: "9-12", box: 0, mao: "MJ", consolidated: false },
        { id: "11.1.13-16", label: "11.1.13-16", passo: 1, compassos: "13-16", box: 0, mao: "MJ", consolidated: false },
        { id: "11.2.1-8", label: "11.2.1-8", passo: 2, compassos: "1-8", baseBlockIds: ["11.1.1-4", "11.1.5-8"], box: 0, mao: "MJ", consolidated: false },
        { id: "11.2.9-16", label: "11.2.9-16", passo: 2, compassos: "9-16", baseBlockIds: ["11.1.9-12", "11.1.13-16"], box: 0, mao: "MJ", consolidated: false },
        { id: "11.4.1-16", label: "11.4.1-16", passo: 4, compassos: "1-16", box: 0, mao: "MJ", consolidated: false }
      ]
    }
  ],
  queue: [
    { id: "f3", number: 14, title: "14. Prelude — B. Dvarionas", objective: "Cantilena na ME, som cantante" },
    { id: "f4", number: 15, title: "15. Cradle Song — G. Sviridov", objective: "Polifonia sutil" },
    { id: "f5", number: 16, title: "16. March — R. Schumann", objective: "Rigor rítmico e precisão" },
    { id: "f6", number: 17, title: "17. Allegro — W. Mozart", objective: "Vivacidade clássica" },
    { id: "f7", number: 18, title: "18. The Little Commander — S. Maikapar", objective: "Escalas rápidas em crescendo" },
    { id: "f8", number: 19, title: "19. Polonaise — J. S. Bach", objective: "Estilo barroco articulado" },
    { id: "f9", number: 20, title: "20. The Sick Doll — P. Tchaikovsky", objective: "Sustentação expressiva e fraseado" }
  ],
  completed: []
};

class RepertoireManagerClass {
  initRepertoire() {
    const state = window.StateManager.getState();
    if (!state.repertoire || !state.repertoire.active || state.repertoire.active.length === 0) {
      window.StateManager.setState({ repertoire: DEFAULT_REPERTOIRE }, "INIT_DEFAULT_REPERTOIRE");
    }
  }

  getActivePieces() {
    const state = window.StateManager.getState();
    return (state.repertoire && state.repertoire.active) ? state.repertoire.active : [];
  }

  getPausedPieces() {
    const state = window.StateManager.getState();
    return (state.repertoire && state.repertoire.paused) ? state.repertoire.paused : [];
  }

  getPieceAndTrecho(pieceId, trechoId) {
    const allPieces = [...this.getActivePieces(), ...this.getPausedPieces()];
    const piece = allPieces.find(p => p.id === pieceId);
    if (!piece) return { piece: null, trecho: null };
    const trecho = (piece.trechos || []).find(t => t.id === trechoId);
    return { piece, trecho };
  }
  /*
  isPasso2Unlocked(pieceId, targetTrechoId) {
        const pieces = this.getActivePieces();
        const piece = pieceId ? pieces.find(p => p.id === pieceId) : pieces[0];
        if (!piece) return false;

        let targetTrecho = null;
        if (targetTrechoId) {
          targetTrecho = (piece.trechos || []).find(t => t.id === targetTrechoId);
        } else {
          targetTrecho = (piece.trechos || []).find(t => t.passo >= 2);
        }

        const dependencies = targetTrecho ? [...(targetTrecho.baseBlockIds || []), ...(targetTrecho.children || [])] : [];
        if (dependencies.length === 0) {
            return true;
        }

        // Função de verificação recursiva: o pedágio exige maturidade estrutural desde a raiz atômica (Passo 1).
        const isDependencyReady = (depId) => {
            const depTrecho = (piece.trechos || []).find(t => t.id === depId);
            if (!depTrecho) return false;
            
            // Condição 1: A própria dependência deve estar madura (Caixa 2+)
            if (depTrecho.box < 2 && !depTrecho.consolidated) return false;
            
            // Condição 2: As bases desta dependência também devem estar maduras (Deep Traversal)
            const subDeps = [...(depTrecho.baseBlockIds || []), ...(depTrecho.children || [])];
            if (subDeps.length > 0) {
                 return subDeps.every(subId => isDependencyReady(subId));
            }
            return true;
        };

        return dependencies.every(baseId => isDependencyReady(baseId));
  }*/
/* --- CÓDIGO ORIGINAL (DEPRECIADO) ---
    isPasso2Unlocked(pieceId, targetTrechoId) {
        const pieces = this.getActivePieces();
--- FIM ORIGINAL --- */

// --- NOVA LÓGICA (Refatoração Semântica Agnóstica) ---
    isPrerequisiteMet(pieceId, targetTrechoId) {
      const pieces = this.getActivePieces();
      const piece = pieceId ? pieces.find(p => p.id === pieceId) : pieces[0];
      if (!piece) return false;

      let targetTrecho = null;
      if (targetTrechoId) {
        targetTrecho = (piece.trechos || []).find(t => t.id === targetTrechoId);
      } else {
        targetTrecho = (piece.trechos || []).find(t => t.passo >= 2);
      }

      const dependencies = targetTrecho ? [...(targetTrecho.baseBlockIds || []), ...(targetTrecho.children || [])] : [];
      if (dependencies.length === 0) {
        return true;
      }

      const isDependencyReady = (depId) => {
        const depTrecho = (piece.trechos || []).find(t => t.id === depId);
        if (!depTrecho) return false;
        
        // Condição 1: A própria dependência deve estar madura (Caixa 2+)
        if (depTrecho.box < 2 && !depTrecho.consolidated) return false;
        
        // Condição 2: As bases atômicas desta dependência também devem estar maduras
        const subDeps = [...(depTrecho.baseBlockIds || []), ...(depTrecho.children || [])];
        if (subDeps.length > 0) {
          return subDeps.every(subId => isDependencyReady(subId));
        }
        return true;
      };

      return dependencies.every(baseId => isDependencyReady(baseId));
  }

  getLeitnerDistribution() {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.getActivePieces().forEach(piece => {
      (piece.trechos || []).forEach(t => {
        const b = t.box !== undefined ? t.box : 0;
        if (counts[b] !== undefined) counts[b]++;
        else counts[0]++;
      });
    });
    return counts;
  }

  toggleHand(pieceId, trechoId) {
    const hands = ["MJ", "MD", "ME"];
    const { trecho } = this.getPieceAndTrecho(pieceId, trechoId);
    if (!trecho) return;

    const currentHand = trecho.mao || "MJ";
    const nextHand = hands[(hands.indexOf(currentHand) + 1) % hands.length];
    this.updateTrecho(pieceId, trechoId, { mao: nextHand });

    if (window.AudioTools) window.AudioTools.playHitSound();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Mão alterada para ${nextHand} em ${trecho.label}`, "info");
    }
  }

  togglePausePiece(pieceId) {
    const state = window.StateManager.getState();
    const active = [...(state.repertoire.active || [])];
    const paused = [...(state.repertoire.paused || [])];

    const activeIdx = active.findIndex(p => p.id === pieceId);
    if (activeIdx !== -1) {
      const [piece] = active.splice(activeIdx, 1);
      piece.isPaused = true;
      paused.push(piece);

      window.StateManager.setState({
        repertoire: { ...state.repertoire, active, paused }
      }, `PAUSE_PIECE_${pieceId}`);

      if (window.App && window.App.showToast) {
        window.App.showToast(`⏸️ Peça "${piece.title}" movida para Pausadas.`, "info");
      }
      return;
    }

    const pausedIdx = paused.findIndex(p => p.id === pieceId);
    if (pausedIdx !== -1) {
      const [piece] = paused.splice(pausedIdx, 1);
      piece.isPaused = false;
      active.push(piece);

      window.StateManager.setState({
        repertoire: { ...state.repertoire, active, paused }
      }, `UNPAUSE_PIECE_${pieceId}`);

      if (window.App && window.App.showToast) {
        window.App.showToast(`▶ Peça "${piece.title}" reativada com sucesso!`, "success");
      }
    }
  }

  promoteQueuePiece(queueId) {
    const state = window.StateManager.getState();
    const queue = [...(state.repertoire.queue || [])];
    const active = [...(state.repertoire.active || [])];

    const qIdx = queue.findIndex(p => p.id === queueId);
    if (qIdx === -1) return;

    const [promoted] = queue.splice(qIdx, 1);
    const newActivePiece = {
      id: promoted.id,
      number: promoted.number || 14,
      title: promoted.title,
      composer: promoted.title.split("—")[1]?.trim() || "Autor",
      bpm: "60 → 100",
      phase: "Fatiamento Progressivo",
      pct: 0,
      note: promoted.objective || "",
      isPaused: false,
      totalPracticeSeconds: 0,
      trechos: [
        { id: `${promoted.number}.1.1-4`, label: `${promoted.number}.1.1-4`, passo: 1, compassos: "1-4", box: 1, mao: "MJ", consolidated: false, nextReviewDate: new Date().toLocaleDateString('sv-SE'), slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] },
        { id: `${promoted.number}.1.5-8`, label: `${promoted.number}.1.5-8`, passo: 1, compassos: "5-8", box: 1, mao: "MJ", consolidated: false, nextReviewDate: new Date().toLocaleDateString('sv-SE'), slips: 0, consecutiveColdPasses: 0, lifetimeHits: 0, lifetimeAttempts: 0, difficultyTags: [] }
      ]
    };

    active.push(newActivePiece);

    window.StateManager.setState({
      repertoire: { ...state.repertoire, queue, active }
    }, `PROMOTE_PIECE_${queueId}`);

    if (window.AudioTools) window.AudioTools.playHitSound();
    if (window.App && window.App.showToast) {
      window.App.showToast(`🎉 Peça "${promoted.title}" promovida para Estudo Ativo!`, "success");
    }
  }

  updateTrecho(pieceId, trechoId, trechoUpdates) {
        window.StateManager.setState(prev => {
            const active = (prev.repertoire && prev.repertoire.active) ? [...prev.repertoire.active] : [];
            const pieceIndex = active.findIndex(p => p.id === pieceId);
            if (pieceIndex === -1) return prev;
            
            // 🛡️ Clonagem Profunda (Deep Clone): Impede mutação fantasma da Matriz SSOT
            const piece = JSON.parse(JSON.stringify(active[pieceIndex]));
            const trechos = piece.trechos || [];
            const tIndex = trechos.findIndex(t => t.id === trechoId);
            if (tIndex === -1) return prev;
            
            trechos[tIndex] = { ...trechos[tIndex], ...trechoUpdates };
            piece.trechos = trechos;
            
            const anyCritical = trechos.some(tr => {
                const attempts = tr.lifetimeAttempts || 0;
                const hits = tr.lifetimeHits || 0;
                const slips = tr.slips || 0;
                const tagsCount = (tr.difficultyTags || []).length;
                if (attempts === 0) return false;
                const failureRatio = attempts / Math.max(1, hits);
                const rawIFM = (failureRatio * (1 + slips * 0.5)) + (tagsCount * 0.25);
                const normIFM = 1.0 - (1.0 / (1.0 + Math.pow(rawIFM / 3.0, 2)));
                return normIFM > 0.8 || (tr.consecutiveFailures || 0) > 2;
            });
            piece.status = anyCritical ? "alerta" : "nominal";
            active[pieceIndex] = piece;
            
            return { repertoire: { ...prev.repertoire, active } };
        }, `UPDATE_TRECHO_${trechoId}`);
    }
	
    recordTrechoPractice(pieceId, trechoId, seconds = 0, hits = 0, misses = 0, slips = 0) {
        const durSec = Math.max(0, parseInt(seconds, 10) || 0);
        window.StateManager.setState(prev => {
            const active = (prev.repertoire && prev.repertoire.active) ? [...prev.repertoire.active] : [];
            const pieceIndex = active.findIndex(p => p.id === pieceId);
            if (pieceIndex === -1) return { repertoire: prev.repertoire };

            const piece = { ...active[pieceIndex] };
            const trechos = piece.trechos ? [...piece.trechos] : [];
            const tIndex = trechos.findIndex(tr => tr.id === trechoId);

            if (tIndex !== -1) {
                const t = { ...trechos[tIndex] };
                t.totalPracticeSeconds = (t.totalPracticeSeconds || 0) + durSec;
                t.lifetimeHits = (t.lifetimeHits || 0) + hits;
                t.lifetimeAttempts = (t.lifetimeAttempts || 0) + (hits + misses);
                t.slips = (t.slips || 0) + slips;

                // Penalidade para falhas consecutivas intradia
                if (misses > 0 && hits === 0) {
                    t.consecutiveFailures = (t.consecutiveFailures || 0) + 1;
                } else if (hits > 0) {
                    t.consecutiveFailures = 0;
                }
                
                t.lastPracticed = new Date().toISOString();
                trechos[tIndex] = t;
                piece.trechos = trechos;
            }

            piece.totalPracticeSeconds = (piece.totalPracticeSeconds || 0) + durSec;

            // Recálculo do status de alerta
            const anyCritical = piece.trechos.some(tr => {
                const attempts = tr.lifetimeAttempts || 0;
                const hitRate = attempts > 0 ? (tr.lifetimeHits || 0) / attempts : 1.0;
                return hitRate < 0.70 || (tr.consecutiveFailures || 0) > 2;
            });
            
            piece.status = anyCritical ? "alerta" : "nominal";
            active[pieceIndex] = piece;

            return {
                repertoire: {
                    ...prev.repertoire,
                    active
                }
            };
        }, `RECORD_PRACTICE_${trechoId}`, true);
    }
    generateTeacherReport(stateParam = null) {
        const state = stateParam || (window.StateManager ? window.StateManager.getState() : {});
        
        // 🛡️ Zero UTC Date Drift
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const todayEpoch = new Date(`${todayStr}T12:00:00Z`).getTime();
        const sevenDaysAgoEpoch = todayEpoch - (7 * 86400000);
        
        const safeParseDate = (dateStr) => {
            if (!dateStr) return 0;
            if (typeof window.parseDate === "function") {
                const d = window.parseDate(dateStr);
                return d ? d.getTime() : 0;
            }
            const cleanStr = String(dateStr).replace(/\s*(\(Offline\)|Offline|\$Offline\$)/i, "").trim();
            return new Date(`${cleanStr}T12:00:00Z`).getTime();
        };

        const recentHistory = (state.history || []).filter(h => safeParseDate(h.date) >= sevenDaysAgoEpoch);
        
        let totalRepMins = 0, totalTechMins = 0;
        const pieceMap = {};
        const techPracticed = [];
        
        recentHistory.forEach(h => {
            const mins = h.durationMinutes || 0;
            const type = (h.type || "").toLowerCase();
            if (type.includes("técnica")) {
                totalTechMins += mins;
                techPracticed.push(`${h.pieceId} por ${mins} min`);
            } else {
                totalRepMins += mins;
                const pTitle = h.pieceId;
                if (!pieceMap[pTitle]) pieceMap[pTitle] = { trechos: new Set(), accuracies: [] };
                if (h.trechoId) pieceMap[pTitle].trechos.add(h.trechoId);
                
                const accuracyValue = h.accuracyPct !== undefined ? h.accuracyPct : h.accuracy;
                if (accuracyValue !== undefined) {
                    pieceMap[pTitle].accuracies.push(accuracyValue);
                }
            }
        });
        
        let reportText = "Olá, professora! Segue meu resumo de prática semanal de Piano:\n\n🎹 Peças Praticadas:\n";
        const piecesKeys = Object.keys(pieceMap);
        
        if (piecesKeys.length === 0) {
            reportText += "- Nenhuma peça de repertório registrada neste período. Foco em técnica ou fundamentos.\n";
        } else {
            piecesKeys.forEach(title => {
                const data = pieceMap[title];
                const avgAcc = data.accuracies.length > 0 ? Math.round(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length) : null;
                reportText += `- ${title}: Estudou trechos ${Array.from(data.trechos).join(", ")}${avgAcc !== null ? ` (Precisão média de ${avgAcc}%)` : ""}.\n`;
            });
        }
        
        reportText += `\n🛠️ Fundamentos Técnicos:\n`;
        if (techPracticed.length === 0) {
            reportText += "- Nenhum fundamento técnico registrado.\n";
        } else {
            techPracticed.forEach(tp => { reportText += `- Praticou ${tp}.\n`; });
        }
        
        reportText += `\n⏱️ Volume de Prática Ativa Semanal: ${totalRepMins + totalTechMins} minutos dedicados.`;
        
        // 🛡️ Erradicação da Race Condition no Clipboard e eliminação de funções externas órfãs
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(reportText).then(() => {
                if (window.App && window.App.showToast) window.App.showToast("Relatório copiado para o Clipboard!", "success");
            }).catch(() => prompt("Copie seu relatório abaixo:", reportText));
        } else {
            prompt("Copie seu relatório abaixo:", reportText);
        }
        
        return reportText;
    }
}

window.RepertoireManager = new RepertoireManagerClass();

window.generateTeacherReport = function(state) {
    return window.RepertoireManager.generateTeacherReport(state);
};
