/**
 * audioTools.js - Síntese WebAudio, Metrônomo Redesenhado com Pulso Luminoso, Wake Lock & Lightbox
 * Painel de Estudos de Piano — Versão 15.1.0 (Auditado e Unificado)
 * Aluno: Leonardo Moura | Data: 29/08/2026
 *
 * Responsabilidades:
 * - Síntese pura de áudio via WebAudio API (sem arquivos externos de áudio)
 * - Metrônomo preciso com LED Beat Flash (pulso visual sincronizado de alta visibilidade)
 * - Controle dinâmico de BPM (+5, -5, +1, -1) com ajuste em tempo real para estante
 * - Wake Lock API para tela sempre ativa e Lightbox modal com Paper Effect
 *
 * Integrações: StateManager, AudioTools, RepertoireManager, NeuroEngine, SessionPlayer
 */

const TIMBRE = { TICK_STRONG: 1000, TICK_WEAK: 800, HIT_C5: 523.25, HIT_E5: 659.25, MISS_START: 220, MISS_END: 140 };

class AudioToolsClass {
    constructor() {
        this.audioCtx = null;
        this.metroInterval = null;
        this.metroBpm = 60;
        this.metroIsOn = false;
        this.wakeLock = null;
        this._isRequestingWakeLock = false;
        this._nextNoteTime = 0;
        this._currentBeat = 0;
    }

    _initContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx && this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
        }
    }

    playTick(frequency = TIMBRE.TICK_WEAK, duration = 0.035, gainValue = 0.45, isStrong = false, time = null) {
        try {
            this._initContext();
            if (!this.audioCtx) return;
            const playTime = time || this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(frequency, playTime);
            
            gain.gain.setValueAtTime(gainValue, playTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, playTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(playTime);
            osc.stop(playTime + duration);
            
            // Destruição imperativa pós-uso (Prevenção de Oscillator Drift)
            setTimeout(() => {
                osc.disconnect();
                gain.disconnect();
            }, (playTime - this.audioCtx.currentTime + duration + 0.1) * 1000);

            // Sincroniza flash visual considerando o Look-Ahead
            const delayToFlash = (playTime - this.audioCtx.currentTime) * 1000;
            if (delayToFlash > 0) {
                setTimeout(() => this._triggerFlash(isStrong), delayToFlash);
            } else {
                this._triggerFlash(isStrong);
            }
        } catch (e) {
            console.warn("[AudioTools] Erro no tick:", e);
        }
    }
    playHitSound() {
        try {
            this._initContext();
            if (!this.audioCtx) return;
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(TIMBRE.HIT_C5, now); 
            osc.frequency.exponentialRampToValueAtTime(TIMBRE.HIT_E5, now + 0.08); 
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
            setTimeout(() => { osc.disconnect(); gain.disconnect(); }, 200);
        } catch (e) {
            console.warn("[AudioTools] Falha ao tocar som de acerto:", e);
        }
    }
    playMissSound() {
        try {
            this._initContext();
            if (!this.audioCtx) return;
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(TIMBRE.MISS_START, now);
            osc.frequency.linearRampToValueAtTime(TIMBRE.MISS_END, now + 0.16);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
            setTimeout(() => { osc.disconnect(); gain.disconnect(); }, 250);
        } catch (e) {
            console.warn("[AudioTools] Falha ao tocar som de erro:", e);
        }
    }

    _triggerFlash(isStrong) {
        const elements = document.querySelectorAll(".metro-led, .metro-pulse-indicator, .pulse-led, .btn-stop");
        elements.forEach(el => {
            el.classList.add("flash-beat");
            if (isStrong) el.classList.add("flash-strong");
            setTimeout(() => el.classList.remove("flash-beat", "flash-strong"), 80);
        });
    }

    adjustBpm(delta) {
        this.updateBpm(this.metroBpm + delta);
    }

    updateBpm(newBpm) {
        this.metroBpm = Math.max(30, Math.min(260, parseInt(newBpm, 10) || 60));

        const displays = document.querySelectorAll("#metroBpmValue, #swBpmDisplay, #randBpmDisplay, #freeBpmDisplay, #readingBpmDisplay");
        displays.forEach(d => { if (d) d.textContent = this.metroBpm; });

        const inputs = document.querySelectorAll("#swBpmInput, #randBpmInputActive, #freeBpmInputActive, #readingBpmInput");
        inputs.forEach(inp => { if (inp) inp.value = this.metroBpm; });

        // Ajuste dinâmico em tempo real: se o metrônomo estiver ativo, reinicia com o novo BPM
        if (this.metroIsOn) {
            this.startMetronome(this.metroBpm);
        }
    }

    _scheduler() {
        if (!this.metroIsOn || !this.audioCtx) return;
        const scheduleAheadTime = 0.1; // Agendamento antecipado de 100ms
        while (this._nextNoteTime < this.audioCtx.currentTime + scheduleAheadTime) {
            const isStrong = this._currentBeat === 0;
            const freq = isStrong ? TIMBRE.TICK_STRONG : TIMBRE.TICK_WEAK;
            const dur = isStrong ? 0.04 : 0.03;
            const gain = isStrong ? 0.5 : 0.35;
            
            this.playTick(freq, dur, gain, isStrong, this._nextNoteTime);
            
            this._nextNoteTime += 60.0 / this.metroBpm;
            this._currentBeat = (this._currentBeat + 1) % 4;
        }
        this.metroInterval = setTimeout(() => this._scheduler(), 25);
    }

    startMetronome(bpm = 60) {
        this.stopMetronome();
        this.metroBpm = Math.max(30, Math.min(260, parseInt(bpm, 10) || 60));
        this.metroIsOn = true;
        this._initContext();
        
        this._nextNoteTime = this.audioCtx.currentTime + 0.05;
        this._currentBeat = 0;
        this._scheduler();
        
        this._updateButtons(true);
    }
    stopMetronome() {
        if (this.metroInterval) {
            clearTimeout(this.metroInterval);
            this.metroInterval = null;
        }
        this.metroIsOn = false;
        this._updateButtons(false);
    }

    toggleMetronome(bpm = 60) {
        if (this.metroIsOn) {
            this.stopMetronome();
        } else {
            this.startMetronome(bpm || this.metroBpm || 60);
        }
    }

    async requestWakeLock() {
        if (this._isRequestingWakeLock) return;
        this._isRequestingWakeLock = true;
        try {
            if ("wakeLock" in navigator && !this.wakeLock) {
                this.wakeLock = await navigator.wakeLock.request("screen");
            }
        } catch (err) {
            console.warn("[AudioTools] Wake Lock falhou:", err);
        } finally {
            this._isRequestingWakeLock = false;
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
            } catch (err) {
                console.warn("[AudioTools] Erro ao liberar Wake Lock:", err);
            }
            this.wakeLock = null;
        }
    }

    openLightbox(src, title = "") {
        const modal = document.getElementById("lightboxModal");
        const img = document.getElementById("lightboxImg");
        const caption = document.getElementById("lightboxCaption");

        if (modal && img) {
            img.src = src;
            if (caption) caption.textContent = title || "Partitura em Alta Resolução";
            modal.style.display = "flex";
            modal.classList.add("paper-effect");

            const closeHandler = (e) => {
                if (e.key === "Escape") this.closeLightbox();
            };
            window.addEventListener("keydown", closeHandler, { once: true });

            modal.onclick = (e) => {
                if (e.target === modal) this.closeLightbox();
            };
        }
    }

    closeLightbox() {
        const modal = document.getElementById("lightboxModal");
        if (modal) modal.style.display = "none";
    }

    _updateButtons(isOn) {
        const btnIds = ["btnFreeMetronome", "swMetroToggleBtn", "btnToggleRandMetro", "btnReadingMetro", "btnFreePracticeMetro", "btnSplitMetro"];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.textContent = isOn ? "⏸ Parar" : "▶ Ligar (M)";
                btn.className = `btn ${isOn ? 'btn-stop' : 'btn-start'}`;
            }
        });
    }
}

window.AudioTools = new AudioToolsClass();
