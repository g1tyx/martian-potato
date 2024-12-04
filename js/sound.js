// Sound System
class SoundSystem {
    constructor() {
        // Use settings if available, otherwise use default
        if (window.gameSettings) {
            this.isMuted = !window.gameSettings.settings.sound;
        } else {
            const storedMute = localStorage.getItem('soundMuted');
            this.isMuted = storedMute === 'true';
        }
        this.initialize();
    }

    initialize() {
        this.updateMuteToggle();
    }

    updateMuteToggle() {
        const muteToggle = document.getElementById('mute-toggle');
        if (muteToggle) {
            muteToggle.checked = !this.isMuted;
        }
    }

    setMute(muted) {
        this.isMuted = muted;
        this.updateMuteToggle();
        // Only save to localStorage if settings system isn't available
        if (!window.gameSettings) {
            localStorage.setItem('soundMuted', muted);
        }
    }

    // Placeholder methods for future sound effects
    playPlantSound() {
        if (this.isMuted) return;
    }

    playHarvestSound() {
        if (this.isMuted) return;
    }

    playUpgradeSound() {
        if (this.isMuted) return;
    }

    playAchievementSound() {
        if (this.isMuted) return;
    }
}

// Initialize sound system
let soundSystem;
document.addEventListener('DOMContentLoaded', () => {
    soundSystem = new SoundSystem();
    // Export for use in other files
    window.soundSystem = soundSystem;
}); 