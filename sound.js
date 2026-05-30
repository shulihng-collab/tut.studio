// Retro Web Audio Synth Engine

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmInterval = null;
        this.bgmSequence = [];
        this.bgmTempo = 120; // BPM
        this.bgmStep = 0;
        
        // Define simple Mario-like overworld BGM notes
        // Format: { note: Frequency, duration: Steps }
        // Rest: 0
        const C4 = 261.63, E4 = 329.63, G4 = 392.00, C5 = 523.25, D4 = 293.66, F4 = 349.23, A4 = 440.00;
        this.overworldBGM = [
            E4, E4, 0, E4, 0, C4, E4, 0, G4, 0, 0, 0, 261.63, 0, 0, 0, // C4
            C4, 0, 0, G4, 0, 0, E4, 0, 0, A4, 0, B4 = 493.88, 0, B4, A4, 0,
            G4, E4, G4, A4, 0, F4, G4, 0, E4, 0, C4, D4, B4 - 100, 0, 0
        ];
        
        // Let's create a simpler, cleaner melody loop that sounds great and works reliably.
        this.melody = [
            329.63, 329.63, 0, 329.63, 0, 261.63, 329.63, 0,
            392.00, 0, 0, 0, 196.00, 0, 0, 0,
            261.63, 0, 0, 196.00, 0, 0, 164.81, 0,
            220.00, 0, 246.94, 0, 233.08, 220.00, 0,
            196.00, 329.63, 392.00, 440.00, 0, 349.23, 392.00, 0,
            329.63, 0, 261.63, 293.66, 246.94, 0, 0, 0
        ];
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSFX(type) {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        
        switch (type) {
            case 'jump':
                this.synthesizeJump(now);
                break;
            case 'coin':
                this.synthesizeCoin(now);
                break;
            case 'stomp':
                this.synthesizeStomp(now);
                break;
            case 'powerup':
                this.synthesizePowerup(now);
                break;
            case 'powerdown':
                this.synthesizePowerdown(now);
                break;
            case 'death':
                this.synthesizeDeath(now);
                break;
            case 'shoot':
                this.synthesizeShoot(now);
                break;
            case 'block_hit':
                this.synthesizeBlockHit(now);
                break;
            case 'brick_break':
                this.synthesizeBrickBreak(now);
                break;
        }
    }

    synthesizeJump(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; // Mario jumps have a soft triangle sound
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(650, time + 0.18);
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.18);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.18);
    }

    synthesizeCoin(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        
        // Coin is two distinct frequencies (B5 then E6)
        osc.frequency.setValueAtTime(987.77, time); // B5
        osc.frequency.setValueAtTime(1318.51, time + 0.08); // E6
        
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.setValueAtTime(0.15, time + 0.08);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.35);
    }

    synthesizeStomp(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.linearRampToValueAtTime(40, time + 0.1);
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.1);
    }

    synthesizePowerup(time) {
        // Fast rising notes arpeggio
        const notes = [330, 392, 660, 523, 587, 784];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time + idx * 0.07);
            
            gain.gain.setValueAtTime(0.2, time + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.07 + 0.15);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time + idx * 0.07);
            osc.stop(time + idx * 0.07 + 0.15);
        });
    }

    synthesizePowerdown(time) {
        // Falling arpeggio
        const notes = [784, 587, 523, 392, 330, 261];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + idx * 0.07);
            
            gain.gain.setValueAtTime(0.25, time + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.07 + 0.15);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time + idx * 0.07);
            osc.stop(time + idx * 0.07 + 0.15);
        });
    }

    synthesizeShoot(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.linearRampToValueAtTime(200, time + 0.1);
        
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.1);
    }

    synthesizeBlockHit(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.linearRampToValueAtTime(50, time + 0.12);
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.12);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.12);
    }

    synthesizeBrickBreak(time) {
        // Noise-like explosion
        const bufferSize = this.ctx.sampleRate * 0.15; // 0.15 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(10, time + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(time);
        noise.stop(time + 0.15);
    }

    synthesizeDeath(time) {
        // Stop background music
        this.stopBGM();

        const notes = [493.88, 0, 523.25, 0, 587.33, 0, 0, 0, 392.00, 329.63, 261.63, 196.00];
        notes.forEach((freq, idx) => {
            if (freq === 0) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time + idx * 0.12);
            
            gain.gain.setValueAtTime(0.2, time + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.12 + 0.18);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time + idx * 0.12);
            osc.stop(time + idx * 0.12 + 0.18);
        });
    }

    startBGM() {
        this.init();
        if (this.muted) return;
        this.stopBGM();
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const stepDuration = 60 / this.bgmTempo / 2; // Eighth notes
        
        const playStep = () => {
            const time = this.ctx.currentTime;
            const note = this.melody[this.bgmStep];
            
            if (note > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                // Classic square-wave channels
                osc.type = 'square';
                osc.frequency.setValueAtTime(note, time);
                
                gain.gain.setValueAtTime(0.06, time); // Low volume background BGM
                gain.gain.linearRampToValueAtTime(0.005, time + stepDuration * 0.9);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(time);
                osc.stop(time + stepDuration * 0.9);
            }
            
            this.bgmStep = (this.bgmStep + 1) % this.melody.length;
        };

        // Schedule next beats
        this.bgmInterval = setInterval(playStep, stepDuration * 1000);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmStep = 0;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.muted;
    }
}

// Global sound engine instance
const sound = new SoundEngine();
