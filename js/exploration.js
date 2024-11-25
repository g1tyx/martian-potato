/**
 * Exploration System
 * 
 * Manages manual resource discovery through Mars surface exploration:
 * - Basic exploration mechanics (cooldowns, triggers)
 * - Resource rewards (nutrients, ice) with multipliers
 * - Integration with game.js resource system
 * - UI state management for exploration button
 */


// Game Constants
const REWARD_RANGES = {
    nutrients: { min: 1, max: 10 },
    ice: { min: 1, max: 10 }
};

// Global variables for exploration mechanics
window.explorationResourceMultiplier = 1;
window.lastExploreTime = 0;
window.exploreDelay = 10000; // 10 seconds initial delay between manual explorations
window.waterExplorationMultiplier = 1;

function calculateRandomReward(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function exploreMarsSurface() {
    const exploreCard = document.getElementById('exploration-container');
    if (exploreCard.hasAttribute('disabled')) {
        return;
    }

    const currentTime = Date.now();
    // Check if enough time has passed since last exploration
    if (currentTime - window.lastExploreTime < window.exploreDelay) {
        const waitTime = ((window.exploreDelay - (currentTime - window.lastExploreTime)) / 1000).toFixed(1);
        showToast("Exploration Cooldown", `You need to wait ${waitTime} seconds before exploring again.`, 'setback');
        return;
    }

    // Calculate rewards for manual exploration with independent randomness
    const nutrientReward = calculateRandomReward(REWARD_RANGES.nutrients.min, REWARD_RANGES.nutrients.max);
    const iceReward = calculateRandomReward(REWARD_RANGES.ice.min, REWARD_RANGES.ice.max);

    // Apply multipliers
    const scaledNutrientReward = nutrientReward * window.explorationResourceMultiplier;
    const scaledIceReward = iceReward * window.explorationResourceMultiplier * window.waterExplorationMultiplier;

    // Add rewards to global resource counters
    nutrients += scaledNutrientReward;
    ice += scaledIceReward;

    // Prepare reward message for user feedback
    const rewards = [];
    if (scaledNutrientReward > 0) rewards.push(`${scaledNutrientReward.toFixed(1)} nutrients`);
    if (scaledIceReward > 0) rewards.push(`${scaledIceReward} ice`);

    const rewardString = rewards.join(', ').replace(/,([^,]*)$/, ' and$1');

    showToast(
        "Resources Acquired",
        `An exploration of the Martian surface yielded: ${rewardString}.`,
        'achievement'
    );

    window.lastExploreTime = currentTime;
    updateDisplay();
    updateExploreButton();
    checkAchievements();
}

function initializeExploration() {
    const exploreButton = document.getElementById('explore-button');
    if (exploreButton) {
        exploreButton.innerHTML = '👩‍🚀';
        exploreButton.addEventListener('click', exploreMarsSurface, { passive: true });
    }
}

document.addEventListener('DOMContentLoaded', initializeExploration);