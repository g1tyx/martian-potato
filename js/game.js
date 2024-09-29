// This file contains the core game logic for the Martian Potato game
// It manages game state, resource handling, potato planting and harvesting, and UI updates

// Game Constants
let MAX_FIELD_SIZE = 8;
const UPDATE_INTERVAL = 1000; // Update every second
const FRAME_RATE = 30; // 30 fps
const FRAME_DELAY = 1000 / FRAME_RATE;
const CLICKS_PER_WATER = 5;

// System Variables
let lastUpdateTime = 0;
let lastFrameTime = 0;
let debugMode = false;
let lastSaveTime = 0;
let MAX_TIER = 5;
let hasSeenInitialGlow = false;
let gameStartTime = Date.now();

// Resource Variables
let potatoCount = 0;
let water = 100;
let nutrients = 100;
let ice = 100;
let waterEfficiency = 1;
let soilEfficiency = 1;
let iceEfficiency = 1;
let areResourcesDepleted = false;

// Planting Variables
let plantingDelay = 3000;
let lastPlantTime = 0;
let potatoesPerClick = 1;
let isFirstPlant = true;
const GROWTH_TIME = 8000; // Base growth time in milliseconds
let growthTimeMultiplier = 1; // Starts at 1, decreases with upgrades
let totalPotatoesHarvested = 0;

// Manual Ice Melting Variables
let waterMeltingClicks = 0;
let isManualIceMeltingUnlocked = false;

// Ice Melting Basin Variables
let isIceMeltingBasinUnlocked = false;
let iceMeltingBasinTimer = 0;
let iceMeltingBasinActive = false;

// Nuclear Ice Melter Variables
let isNuclearIceMelterUnlocked = false;
let isNuclearIceMelterActive = false;
let nuclearIceMelterInterval = null;

// Polar Cap Mining Variables
let isPolarCapMiningUnlocked = false;
let isPolarCapMiningActive = false;
let polarCapMiningInterval = null;

// Cometary Ice Harvester Variables
let isCometaryIceHarvesterUnlocked = false;
let isCometaryIceHarvesterActive = false;
let cometaryIceHarvesterInterval = null;

// Martian Potato Colonizer Variables
let isMartianPotatoColonizerUnlocked = false;
let isMartianPotatoColonizerActive = false;
let colonizerInterval = null;
let colonizerCycle = 0;
const maxColonizerCycles = 20; // 20 cycles

// Large Data Structures
let potatoField = new Array(MAX_FIELD_SIZE).fill(null);

// Achievement Tracking
const defaultAchievements = {
    firstPotato: false,
    potatoCentury: false,
    // Add other achievements here
};
let achievements = { ...defaultAchievements };
let harvestHistory = [];

// Debug Variables
let fpsValues = [];
let lastDebugUpdateTime = 0;
let lastResourceValues = { water: 0, nutrients: 0, ice: 0 };
let lastAction = "None";

// Quantum Spud Spawner Variables
let isQuantumSpudSpawnerUnlocked = false;
let isQuantumSpudSpawnerActive = false;
let quantumSpudSpawnerInterval = null;

// Helper function to add event listeners if the element exists
function addEventListenerIfExists(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    }
}

// Main game loop function
function gameLoop(currentTime) {
    if (currentTime - lastFrameTime >= FRAME_DELAY) {
        updatePlantButton();
        if (updateResources(currentTime)) {
            updateDisplay();
            checkAndRestartAutoplanters();
        }
        updatePotatoGrowth();
        updateTechTree();
        updateExploreButton();
        
        // Auto-save every minute
        if (currentTime - lastSaveTime >= 60000) {
            saveGame();
            lastSaveTime = currentTime;
        }
        
        if (debugMode) {
            const updateTime = performance.now() - startTime;
            updateDebugInfo(currentTime, updateTime);
        }
        
        lastFrameTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
}

// Update game resources and ensure they don't go below zero
function updateResources(currentTime) {
    if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        water = Math.max(0, water);
        nutrients = Math.max(0, nutrients);
        ice = Math.max(0, ice);
        potatoCount = Math.floor(potatoCount);

        if (iceMeltingBasinActive) {
            water++;
            iceMeltingBasinTimer--;
            if (iceMeltingBasinTimer <= 0) {
                iceMeltingBasinActive = false;
            }
            updateIceMeltingBasinButton();
        }

        lastUpdateTime = currentTime;
        return true;
    }
    return false;
}

// Update non-critical elements during idle time
function updateNonCriticalElements() {
    requestIdleCallback(() => {
        displayExplorationUpgrades();
    });
}

// Consume resources for potato growth, applying efficiency multipliers
function consumeResources(amount = 1) {
    if (water >= amount && nutrients >= amount) {
        water -= amount / waterEfficiency;
        nutrients -= amount / soilEfficiency;
        return true;
    }
    return false;
}

// Plant a potato in an empty field slot
function plantPotato() {
    const currentTime = Date.now();
    if (currentTime - lastPlantTime < plantingDelay) {
        return;
    }

    const emptySlotIndex = potatoField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
        showToast("No Room", "No more room in the field! Harvest some potatoes first.", 'setback');
        return;
    }

    if (consumeResources()) {
        potatoField[emptySlotIndex] = createPotato();

        if (!hasSeenInitialGlow) {
            hasSeenInitialGlow = true;
            document.getElementById('plant-button').classList.remove('glow');
        }

        lastPlantTime = currentTime;
        updatePotatoFieldDisplay();
        updateDisplay();
        updateLastAction("Planted Potato");
    } else {
        showToast("Not Enough Resources", "Not enough resources to plant a potato! Explore Mars to find more resources.", 'setback');
    }
    updatePlantButton();
}

// Update the growth stage of all planted potatoes
function updatePotatoGrowth() {
    const currentTime = Date.now();
    potatoField = potatoField.map(potato => {
        if (potato !== null) {
            // Only update potatoes that are not fully grown
            if (potato.growthStage < 100) {
                const growthTime = currentTime - potato.plantedAt;
                const actualGrowthTime = GROWTH_TIME * growthTimeMultiplier;
                potato.growthStage = Math.min(100, Math.floor((growthTime / actualGrowthTime) * 100));
            }
        }
        return potato;
    });
    updateDisplay();
}

// Harvest a fully grown potato at the specified index
function harvestPotatoAtIndex(index, isAutomated = false) {
    if (potatoField[index] && potatoField[index].growthStage >= 100) {
        const harvestedPotato = potatoField[index];
        potatoCount++;
        totalPotatoesHarvested++;

        const slotElement = document.querySelector(`.potato-slot[data-index="${index}"]`);
        const potatoElement = slotElement.querySelector('.potato');

        if (potatoElement && harvestedPotato.isQuantumSpawned) {
            console.log('Triggering poof animation for quantum-spawned potato at index:', index);

            // Create the poof element
            const poofElement = document.createElement('div');
            poofElement.className = 'poof-animation-red';

            // Append the poof to the slotElement
            slotElement.appendChild(poofElement);

            // Ensure the poof covers the entire slot
            poofElement.style.position = 'absolute';
            poofElement.style.left = '0';
            poofElement.style.top = '0';
            poofElement.style.width = '100%';
            poofElement.style.height = '100%';
            poofElement.style.zIndex = '10';

            // Hide the potatoElement during the animation
            potatoElement.style.visibility = 'hidden';

            // Remove the poof element after the animation
            poofElement.addEventListener('animationend', () => {
                console.log('Poof animation ended for quantum-spawned potato at index:', index);
                poofElement.remove();

                // Now remove the potato and update the display
                potatoField[index] = null;
                updatePotatoFieldDisplay();
                updateDisplay();

                // Record the harvest event and update the chart
                harvestHistory.push({
                    timestamp: Date.now(),
                    totalPotatoes: totalPotatoesHarvested
                });
                aggregateHarvestHistory();
                updateHarvestChart();

                checkAchievements();
            });
        } else {
            // For normal potatoes or if potatoElement not found
            potatoField[index] = null;
            updatePotatoFieldDisplay();
            updateDisplay();

            // Record the harvest event and update the chart
            harvestHistory.push({
                timestamp: Date.now(),
                totalPotatoes: totalPotatoesHarvested
            });
            aggregateHarvestHistory();
            updateHarvestChart();

            checkAchievements();
        }

        if (!isAutomated) {
            updateLastAction(`Harvested potato at index ${index}`);
        }
    }
}

// Update the plant button state and cooldown display
function updatePlantButton() {
    const plantButton = document.getElementById('plant-button');
    const currentTime = Date.now();
    const timeLeft = Math.max(0, plantingDelay - (currentTime - lastPlantTime));
    
    if (timeLeft > 0) {
        plantButton.disabled = true;
        plantButton.textContent = `${(timeLeft / 1000).toFixed(1)}s`;
    } else {
        plantButton.disabled = false;
        plantButton.textContent = 'Plant Potato';
    }
}

// Check and update game achievements
function checkAchievements() {
    if (totalPotatoesHarvested >= 1 && !achievements.firstPotato) {
        achievements.firstPotato = true;
        queueAchievement(
            "First Potato",
            "You've harvested your first Martian potato!",
            "This marks the beginning of your journey to colonize Mars with potatoes.",
            "🥔" // Use the potato emoji instead of an image file
        );
    }
    if (totalPotatoesHarvested >= 100 && !achievements.potatoCentury) {
        achievements.potatoCentury = true;
        queueAchievement(
            "Potato Century",
            "You've harvested 100 Martian potatoes!",
            "Your potato farm is starting to take shape. The future of Mars is looking delicious!",
            "potato_century.webp"
        );
    }
    // Add more achievement checks here as needed
}

// Initialize the visual representation of the potato field
function initializePotatoField() {
    const fieldContainer = document.getElementById('potato-field');
    fieldContainer.innerHTML = ''; // Clear existing slots
    for (let i = 0; i < MAX_FIELD_SIZE; i++) {
        const slotElement = document.createElement('div');
        slotElement.className = 'potato-slot';
        slotElement.setAttribute('data-index', i);
        fieldContainer.appendChild(slotElement);
    }
}

// Update the game display with current resource counts and rates
function updateDisplay() {
    updateResourceCounts();
    updateAutoHarvestersInfo();
    updateAutoPlantersInfo();
    updateNuclearIceMelterToggle();
    updateExploreButton();
    updatePotatoField();
    updateTechTree();
    updateIceMeltingProgress();
    updateIceMeltingBasinButton();
}

function updateResourceCounts() {
    updateElementIfChanged('potato-count', `Potatoes: ${Math.floor(potatoCount)}`);
    updateElementIfChanged('water-count', `Water: ${Math.floor(water)}`);
    updateElementIfChanged('nutrients', `Nutrients: ${Math.floor(nutrients)}`);
    updateElementIfChanged('ice-level', `Ice: ${Math.floor(ice)}`);
}

function updateAutoHarvestersInfo() {
    updateElementIfChanged('auto-harvesters', `Auto Harvesters: ${autoHarvesters.length}`);
}

function updateAutoPlantersInfo() {
    const autoplantersElement = document.getElementById('automated-planters');
    if (autoplantersElement) {
        const newText = `Automated Planters: ${autoplanters.length}`;
        if (autoplantersElement.textContent !== newText) {
            autoplantersElement.textContent = newText;
            autoplantersElement.style.display = autoplanters.length > 0 ? 'block' : 'none';
        }
    }
}

function updateNuclearIceMelterToggle() {
    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.checked = isNuclearIceMelterActive;
    }
}

function updateElementIfChanged(id, newText) {
    const element = document.getElementById(id);
    if (element && element.textContent !== newText) {
        element.textContent = newText;
    }
}

// Update the explore button state and cooldown display
function updateExploreButton() {
    const exploreCard = document.getElementById('exploration-container');
    const cooldownElement = document.getElementById('exploration-cooldown');
    
    if (!exploreCard || !cooldownElement) return;

    const currentTime = Date.now();
    const timeLeft = Math.max(0, window.exploreDelay - (currentTime - window.lastExploreTime));
    
    if (timeLeft > 0) {
        exploreCard.setAttribute('disabled', 'true');
        cooldownElement.textContent = `(${(timeLeft / 1000).toFixed(1)}s)`;
    } else {
        exploreCard.removeAttribute('disabled');
        cooldownElement.textContent = 'Ready';
    }
}

// Update the visual representation of the potato field
function updatePotatoField() {
    const fieldContainer = document.getElementById('potato-field');
    potatoField.forEach((potato, index) => {
        let slotElement = fieldContainer.querySelector(`.potato-slot[data-index="${index}"]`);
        if (!slotElement) {
            slotElement = document.createElement('div');
            slotElement.className = 'potato-slot';
            slotElement.setAttribute('data-index', index);
            fieldContainer.appendChild(slotElement);
        }

        if (potato === null) {
            slotElement.innerHTML = '';
        } else {
            updatePotatoElement(slotElement, potato);
        }
    });
}

// Update the visual representation of a single potato
function updatePotatoElement(slotElement, potato) {
    let potatoElement = slotElement.querySelector('.potato');
    if (!potatoElement) {
        potatoElement = document.createElement('div');
        potatoElement.className = 'potato';
        potatoElement.innerHTML = `
            <div class="growth-indicator"></div>
            <div class="growth-text-container">
                <span class="growth-text"></span>
            </div>
        `;
        slotElement.appendChild(potatoElement);
    }

    const growthStage = potato.growthStage;
    const harvestableClass = growthStage >= 100 ? 'harvestable' : '';
    const quantumClass = potato.isQuantumSpawned ? 'quantum-potato' : '';
    const growthColor = growthStage < 33 ? 'rgba(139, 195, 74, 0.4)' : 
                        growthStage < 66 ? 'rgba(76, 175, 80, 0.4)' : 
                        'rgba(56, 142, 60, 0.4)';

    potatoElement.className = `potato ${harvestableClass} ${quantumClass} ${potato.textureClass}`;
    potatoElement.style.transform = `scale(${potato.scaleX}, ${potato.scaleY})`;
    potatoElement.style.borderRadius = potato.borderRadius;
    
    const growthIndicator = potatoElement.querySelector('.growth-indicator');
    growthIndicator.style.height = `${growthStage}%`;
    growthIndicator.style.backgroundColor = growthColor;
    
    const growthText = potatoElement.querySelector('.growth-text');
    growthText.textContent = `${growthStage}%`;
}

// Toggle debug mode on/off
function toggleDebugMode() {
    debugMode = !debugMode;
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = debugMode ? 'block' : 'none';
        if (debugMode) {
            // Initialize debug info when first enabled
            updateDebugInfo(performance.now(), 0);
            // Add 1,000,000 potatoes when debug mode is enabled
            potatoCount += 1000000;
            updateDisplay();
            showToast("Debug Mode Enabled", "Added 1,000,000 potatoes for testing. Press 'D' to toggle.", 'debug');
        } else {
            showToast("Debug Mode Disabled", "Press 'D' to re-enable debug mode.", 'debug');
        }
    }
}

// Update debug information display
function updateDebugInfo(currentTime, updateTime) {
    const debugInfoContainer = document.getElementById('debug-info');
    if (!debugInfoContainer || debugInfoContainer.style.display === 'none') {
        return; // Exit if debug info is not visible
    }

    try {
        const fps = 1000 / (currentTime - lastDebugUpdateTime);
        fpsValues.push(fps);
        if (fpsValues.length > 60) fpsValues.shift();
        const averageFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
        
        const memoryUsage = performance.memory ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A';
        const activePotatoes = potatoField.filter(potato => potato !== null).length;
        
        const resourceGeneration = {
            water: ((water - lastResourceValues.water) * 1000 / (currentTime - lastDebugUpdateTime)).toFixed(2),
            nutrients: ((nutrients - lastResourceValues.nutrients) * 1000 / (currentTime - lastDebugUpdateTime)).toFixed(2),
            potatoes: ((potatoCount - lastResourceValues.potatoes) * 1000 / (currentTime - lastDebugUpdateTime)).toFixed(2)
        };
        
        const updateElement = (id, text) => {
            const element = debugInfoContainer.querySelector(`#${id}`);
            if (element) element.textContent = text;
        };

        updateElement('fps', `FPS: ${averageFps.toFixed(2)}`);
        updateElement('update-time', `Last Update Time: ${updateTime.toFixed(2)}ms`);
        updateElement('memory-usage', `Memory Usage: ${memoryUsage} MB`);
        updateElement('potato-count-debug', `Potato Count: ${potatoCount.toFixed(2)}`);
        updateElement('active-potatoes', `Active Potatoes: ${activePotatoes}`);
        updateElement('resource-usage', `Resource Usage: Water (${water.toFixed(2)}), Nutrients (${nutrients.toFixed(2)}), Potatoes (${potatoCount.toFixed(2)})`);
        updateElement('resource-generation', `Resource Generation: Water (${resourceGeneration.water}/s), Nutrients (${resourceGeneration.nutrients}/s), Potatoes (${resourceGeneration.potatoes}/s)`);
        updateElement('last-action', `Last Action: ${lastAction}`);
        updateElement('planting-delay', `Planting Delay: ${plantingDelay}ms`);
        
        const playtime = getPlaytime();
        updateElement('playtime-debug', `Playtime: ${playtime}`);
        
        lastDebugUpdateTime = currentTime;
        lastResourceValues = { water, nutrients, potatoes: potatoCount };
    } catch (error) {
        console.error('Error updating debug info:', error);
    }
}

// Update the last action for debugging purposes
function updateLastAction(action) {
    lastAction = action;
    if (debugMode) {
        document.getElementById('last-action').textContent = `Last Action: ${lastAction}`;
    }
}

// Display a toast notification to the user
window.showToast = function(title, message, type = 'achievement') {
    console.log("Showing toast:", title, message, type);
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;
    toastContainer.appendChild(toast);

    // Trigger reflow to enable transition
    toast.offsetHeight;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    addEventListenerIfExists('plant-button', 'click', plantPotato);

    initializePotatoField();

    addEventListenerIfExists('potato-field', 'click', (event) => {
        const slotElement = event.target.closest('.potato-slot');
        if (slotElement) {
            const index = parseInt(slotElement.getAttribute('data-index'), 10);
            if (potatoField[index] && potatoField[index].growthStage >= 100) {
                harvestPotatoAtIndex(index);
            }
        }
    });

    createTechTree(); // Create the tech tree

    requestAnimationFrame(gameLoop);

    // Debug mode event listener for the 'D' key press
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'd') {
            toggleDebugMode();
        }
    });

    addEventListenerIfExists('minimize-debug', 'click', () => {
        const debugInfo = document.getElementById('debug-info');
        debugInfo.classList.toggle('minimized');
        const minimizeDebugButton = document.getElementById('minimize-debug');
        minimizeDebugButton.setAttribute('data-text', 
            debugInfo.classList.contains('minimized') ? 'Maximize' : 'Minimize');
    });

    addEventListenerIfExists('exploration-container', 'click', () => {
        const exploreCard = document.getElementById('exploration-container');
        if (!exploreCard.hasAttribute('disabled')) {
            exploreMarsSurface(); // Use the function from exploration.js
        }
    });

    addEventListenerIfExists('subsurface-aquifer-tapper-toggle', 'change', () => window['toggleSubsurfaceAquiferTapper']());

    addEventListenerIfExists('bucket-wheel-excavator-toggle', 'change', () => window['toggleBucketWheelExcavator']());

    addEventListenerIfExists('ice-melting-basin-container', 'click', () => {
        if (!document.getElementById('ice-melting-basin-container').hasAttribute('disabled')) {
            fillIceMeltingBasin();
        }
    });

    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.removeEventListener('change', toggleNuclearIceMelter);
        nuclearIceMelterToggle.removeEventListener('click', handleNuclearIceMelterClick);
        nuclearIceMelterToggle.addEventListener('click', handleNuclearIceMelterClick);
    }

    addEventListenerIfExists('save-button', 'click', saveGame);

    addEventListenerIfExists('reset-button', 'click', resetGame);

    addEventListenerIfExists('polar-cap-mining-toggle', 'change', togglePolarCapMining);

    // Add event listeners for the chart modal
    let harvestChartInitialized = false;
    
    const chartButton = document.getElementById('chart-button');
    const chartModal = document.getElementById('chart-modal');
    const closeChartModal = document.querySelector('.close-chart-modal');
    
    if (chartButton && chartModal && closeChartModal) {
        chartButton.addEventListener('click', () => {
            chartModal.style.display = 'flex';
            // Initialize the chart if necessary
            if (!harvestChartInitialized) {
                initializeHarvestChart();
                harvestChartInitialized = true;
            }
            updateHarvestChart();
        });
 
        closeChartModal.addEventListener('click', () => {
            chartModal.style.display = 'none';
        });
 
        // Close modal when clicking outside of modal-content
        chartModal.addEventListener('click', (event) => {
            if (event.target === chartModal) {
                chartModal.style.display = 'none';
            }
        });
    }

    // Add event listener for the Quantum Spud Spawner toggle
    const quantumSpudSpawnerToggle = document.getElementById('quantum-spud-spawner-toggle');
    if (quantumSpudSpawnerToggle) {
        quantumSpudSpawnerToggle.addEventListener('change', toggleQuantumSpudSpawner);
    }
});

// Function to handle the click event
function handleNuclearIceMelterClick(event) {
    event.preventDefault(); // Prevent the default toggle behavior
    event.stopPropagation();
    toggleNuclearIceMelter();
}

// Modify the toggleNuclearIceMelter function
function toggleNuclearIceMelter() {
    if (!isNuclearIceMelterUnlocked) {
        return;
    }

    const toggleSwitch = document.getElementById('nuclear-ice-melter-toggle');

    if (!isNuclearIceMelterActive) {
        if (potatoCount >= 100) {
            potatoCount -= 100; 
            isNuclearIceMelterActive = true;
            startNuclearIceMelter();
            if (toggleSwitch) toggleSwitch.checked = true;
        } else {
            showToast("Not Enough Potatoes", "You need 100 potatoes to activate the Nuclear Ice Melter!", 'setback');
            if (toggleSwitch) toggleSwitch.checked = false;
            return;
        }
    } else {
        isNuclearIceMelterActive = false;
        stopNuclearIceMelter();
        if (toggleSwitch) toggleSwitch.checked = false;
    }

    updateDisplay();
}

// Handle manual ice melting process
function meltIce(event) {
    if (event && event.stopPropagation) {
        event.stopPropagation(); // Prevent event bubbling only if event exists
    }
    
    if (!isManualIceMeltingUnlocked) {
        return;
    }
    
    if (ice >= 1) {  // Check if there's enough ice
        waterMeltingClicks++;
        updateIceMeltingProgress();
        
        if (waterMeltingClicks >= CLICKS_PER_WATER) {
            ice--;  // Consume 1 ice
            water++;
            waterMeltingClicks = 0;
            showToast("Water Collected", "You've melted ice and collected 1 unit of water!", 'achievement');
        }
        updateDisplay();
        updateLastAction("Melted ice");
    } else {
        showToast("Not Enough Ice", "You need at least 1 ice to melt!", 'setback');
    }
}

// Unlock the manual ice melting feature
function unlockManualIceMelting() {
    isManualIceMeltingUnlocked = true;
    
    const iceMeltingContainer = document.getElementById('ice-melting-container');
    if (iceMeltingContainer) {
        iceMeltingContainer.style.display = 'block';
    }
}

// Update the visual progress of ice melting
function updateIceMeltingProgress() {
    const progressElement = document.getElementById('ice-melting-progress');
    if (progressElement) {
        progressElement.textContent = `Clicks: ${waterMeltingClicks} / ${CLICKS_PER_WATER}`;
    }
}

// Unlock the Ice Melting Basin
function unlockIceMeltingBasin() {
    isIceMeltingBasinUnlocked = true;
    if (!unlockedActionCards.includes('ice-melting-basin-container')) {
        unlockedActionCards.push('ice-melting-basin-container');
    }
    updateActionCards();
    updateIceMeltingBasinButton();
}

// Handle filling the Ice Melting Basin
function fillIceMeltingBasin() {
    if (!isIceMeltingBasinUnlocked || iceMeltingBasinActive) return;
    
    if (ice >= 8) {
        ice -= 8;
        iceMeltingBasinActive = true;
        iceMeltingBasinTimer = 8;
        updateDisplay();
        updateIceMeltingBasinButton();
    } else {
        showToast("Not Enough Ice", "You need at least 8 ice to fill the basin!", 'setback');
    }
}

// Update the Ice Melting Basin button
function updateIceMeltingBasinButton() {
    const basinContainer = document.getElementById('ice-melting-basin-container');
    const cooldownElement = document.getElementById('basin-cooldown');
    if (basinContainer && cooldownElement) {
        if (iceMeltingBasinActive) {
            basinContainer.setAttribute('disabled', 'true');
            cooldownElement.textContent = `Melting (${iceMeltingBasinTimer}s)`;
        } else {
            basinContainer.removeAttribute('disabled');
            cooldownElement.textContent = 'Ready';
        }
    }
}

// Unlock the Nuclear Ice Melter
function unlockNuclearIceMelter() {
    isNuclearIceMelterUnlocked = true;
    if (!unlockedActionCards.includes('nuclear-ice-melter-container')) {
        unlockedActionCards.push('nuclear-ice-melter-container');
    }
    updateActionCards();
}

// Start the Nuclear Ice Melter
function startNuclearIceMelter() {
    nuclearIceMelterInterval = setInterval(() => {
        if (ice >= 5) {
            ice -= 5;
            water += 5;
            updateDisplay();
        } else {
            showToast("Resource Shortage", "Not enough ice to run the Nuclear Ice Melter!", 'setback');
            toggleNuclearIceMelter(); // Turn off if resources are insufficient
        }
    }, 1000); // Run every second
}

// Stop the Nuclear Ice Melter
function stopNuclearIceMelter() {
    clearInterval(nuclearIceMelterInterval);
    nuclearIceMelterInterval = null;
}

function unlockCometaryIceHarvester() {
    isCometaryIceHarvesterUnlocked = true;
    if (!unlockedActionCards.includes('cometary-ice-harvester-container')) {
        unlockedActionCards.push('cometary-ice-harvester-container');
    }
    updateActionCards();
}

function unlockMartianPotatoColonizer() {
    isMartianPotatoColonizerUnlocked = true;
    colonizerCycle = 0;
    if (!unlockedActionCards.includes('martian-potato-colonizer-container')) {
        unlockedActionCards.push('martian-potato-colonizer-container');
    }
    updateActionCards();
    initializeMartianPotatoColonizer();
    // Remove auto-start
    // isMartianPotatoColonizerActive = true;
    // runMartianPotatoColonizerCycle();
}

function initializeMartianPotatoColonizer() {
    const button = document.getElementById('martian-potato-colonizer-button');
    if (button) {
        // Remove any existing event listeners to prevent duplicates
        button.removeEventListener('click', toggleMartianPotatoColonizer);
        // Add the event listener
        button.addEventListener('click', toggleMartianPotatoColonizer);
    }
    updateMartianPotatoColonizerUI(); // Update UI to reflect current state
}

function toggleMartianPotatoColonizer() {
    if (isMartianPotatoColonizerActive) {
        stopMartianPotatoColonizer();
    } else {
        startMartianPotatoColonizer();
    }
    updateMartianPotatoColonizerUI(); // Add this line to update UI immediately
}

function startMartianPotatoColonizer() {
    if (colonizerCycle >= maxColonizerCycles) {
        showToast("Colonizer Depleted", "The Martian Potato Colonizer has reached its maximum cycles.", 'warning');
        return;
    }
    isMartianPotatoColonizerActive = true;
    updateMartianPotatoColonizerUI();
    runMartianPotatoColonizerCycle();
}

function stopMartianPotatoColonizer() {
    isMartianPotatoColonizerActive = false;
    updateMartianPotatoColonizerUI();
    // Add this line to stop the current cycle
    if (window.martianPotatoColonizerIntervalId) {
        clearInterval(window.martianPotatoColonizerIntervalId);
        window.martianPotatoColonizerIntervalId = null;
    }
}

function updateHarvestHistory() {
    harvestHistory.push({
        timestamp: Date.now(),
        totalPotatoes: totalPotatoesHarvested
    });
    aggregateHarvestHistory(); // Make sure this function exists
    updateHarvestChart(); // Make sure this function exists
}

function runMartianPotatoColonizerCycle() {
    if (!isMartianPotatoColonizerActive) return;

    const cycleDuration = 60000; // 60 seconds
    const ledCount = 10;
    const ledUpdateInterval = cycleDuration / ledCount;

    let currentLed = 0;
    window.martianPotatoColonizerIntervalId = setInterval(() => {
        if (!isMartianPotatoColonizerActive) {
            clearInterval(window.martianPotatoColonizerIntervalId);
            window.martianPotatoColonizerIntervalId = null;
            return;
        }

        updateLEDProgress('martian-potato-colonizer-container', currentLed + 1);
        currentLed++;

        if (currentLed >= ledCount) {
            clearInterval(window.martianPotatoColonizerIntervalId);
            window.martianPotatoColonizerIntervalId = null;
            martianPotatoColonizerEffect();
            colonizerCycle++;
            updateMartianPotatoColonizerUI();

            if (colonizerCycle < maxColonizerCycles && isMartianPotatoColonizerActive) {
                runMartianPotatoColonizerCycle();
            } else {
                stopMartianPotatoColonizer();
            }
        }
    }, ledUpdateInterval);
}

function updateMartianPotatoColonizerUI() {
    const button = document.getElementById('martian-potato-colonizer-button');
    if (button) {
        button.textContent = isMartianPotatoColonizerActive ? "Colonizing..." : "Colonize";
        button.classList.toggle('active', isMartianPotatoColonizerActive);
    }
    updateLEDProgress('martian-potato-colonizer-container', 0);
}

function updateLEDProgress(containerId, progress) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const leds = container.querySelectorAll('.led-light');
    leds.forEach((led, index) => {
        led.classList.toggle('active', index < progress);
    });
}

function martianPotatoColonizerEffect() {
    let resourceAmount = Math.pow(4, colonizerCycle) * 100;

    potatoCount += resourceAmount;
    totalPotatoesHarvested += resourceAmount;
    water += resourceAmount;
    nutrients += resourceAmount;
    ice += resourceAmount;

    updateDisplay();
    showToast("Resources Acquired", `Martian Potato Colonizer harvested ${resourceAmount} of each resource!`, 'achievement');

    if (colonizerCycle >= maxColonizerCycles) {
        areResourcesDepleted = true;
        showToast("All Resources Depleted", "No resources left to exploit on Mars. You've harvested everything!", 'achievement');
        onResourcesDepleted();
    }

    updateHarvestHistory();
}

// Add this function to handle the Quantum Spud Spawner logic
function startQuantumSpudSpawner() {
    if (!isQuantumSpudSpawnerActive) {
        isQuantumSpudSpawnerActive = true;
        quantumSpudSpawnerInterval = setInterval(() => {
            for (let i = 0; i < potatoField.length; i++) {
                if (potatoField[i] === null && consumeResources()) {
                    // Plant a new potato with isQuantumSpawned set to true
                    potatoField[i] = createPotato(true, true);
                    updatePotatoFieldDisplay();
                } else if (potatoField[i] && potatoField[i].growthStage >= 100) {
                    // Harvest the potato
                    harvestPotatoAtIndex(i, true);
                }
            }
            updateDisplay();
        }, 1000); // Run every second
    }
}

function stopQuantumSpudSpawner() {
    if (isQuantumSpudSpawnerActive) {
        isQuantumSpudSpawnerActive = false;
        clearInterval(quantumSpudSpawnerInterval);
    }
}

function createCyclicActionCard(containerId, buttonId, startFunction, stopFunction, cycleEffect, cycleDuration, initialText, activeText, inactiveText) {
    let interval = null;
    let cycleProgress = 0;
    const LED_COUNT = 10;
    const LED_INTERVAL = cycleDuration / LED_COUNT;
    let isFirstLaunch = true;

    function updateLEDProgress(progress) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const leds = container.querySelectorAll('.led-light');
        leds.forEach((led, index) => {
            if (index < progress) {
                led.classList.add('active');
            } else {
                led.classList.remove('active');
            }
        });
    }

    function start() {
        if (interval) return;
        startFunction();
        
        // Immediately light up the first LED
        cycleProgress = 1;
        updateLEDProgress(cycleProgress);
        
        interval = setInterval(() => {
            cycleProgress++;
            if (cycleProgress === LED_COUNT) {
                cycleEffect();
            }
            if (cycleProgress > LED_COUNT) {
                cycleProgress = 1;
            }
            updateLEDProgress(cycleProgress);
        }, LED_INTERVAL);
        
        document.getElementById(buttonId).textContent = activeText;
        document.getElementById(buttonId).classList.add('active');
    }

    function stop() {
        clearInterval(interval);
        interval = null;
        cycleProgress = 0;
        updateLEDProgress(cycleProgress);
        stopFunction();
        document.getElementById(buttonId).textContent = inactiveText;
        document.getElementById(buttonId).classList.remove('active');
    }

    function toggle() {
        if (interval) {
            stop();
        } else {
            if (isFirstLaunch) {
                isFirstLaunch = false;
            }
            start();
        }
    }

    // Set initial button text
    document.getElementById(buttonId).textContent = initialText;
    document.getElementById(buttonId).addEventListener('click', toggle);

    return { start, stop, toggle };
}

const cometaryIceHarvester = createCyclicActionCard(
    'cometary-ice-harvester-container',
    'cometary-ice-harvester-button',
    () => { 
        console.log('Cometary Ice Harvester started');
        isCometaryIceHarvesterActive = true;
    },
    () => { 
        console.log('Cometary Ice Harvester stopped');
        isCometaryIceHarvesterActive = false;
    },
    () => {
        ice += 50;
        updateDisplay();
        showToast("Resources Acquired", "Cometary Ice Harvester collected 50 units of ice!", 'achievement');
    },
    30000, // 30 seconds cycle duration
    "Launch", // initialText
    "Harvesting...", // activeText
    "Harvest Comets" // inactiveText
);

function toggleCometaryIceHarvester() {
    if (!isCometaryIceHarvesterUnlocked) return;
    cometaryIceHarvester.toggle();
}

function unlockCometaryIceHarvester() {
    isCometaryIceHarvesterUnlocked = true;
    if (!unlockedActionCards.includes('cometary-ice-harvester-container')) {
        unlockedActionCards.push('cometary-ice-harvester-container');
    }
    updateActionCards();
}

// Modify the createPotato function to allow for instant growth
function createPotato(instantGrowth = false, isQuantumSpawned = false) {
    const currentTime = Date.now();
    const scaleX = 0.95 + Math.random() * 0.1;
    const scaleY = 0.95 + Math.random() * 0.1;
    const borderRadius = `${45 + Math.random() * 10}% ${55 + Math.random() * 10}% ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% / ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% ${55 + Math.random() * 10}% ${45 + Math.random() * 10}%`;
    const textureClass = `potato-texture-${Math.floor(Math.random() * 8) + 1}`;
    
    return {
        plantedAt: currentTime,
        growthStage: instantGrowth ? 100 : 0,
        scaleX,
        scaleY,
        borderRadius,
        textureClass,
        isQuantumSpawned
    };
}


// Update the updatePotatoFieldDisplay function to handle both manual and automated actions
function updatePotatoFieldDisplay() {
    const fieldContainer = document.getElementById('potato-field');
    if (!fieldContainer) return;

    potatoField.forEach((potato, index) => {
        const slotElement = fieldContainer.children[index];
        if (!slotElement) return;

        // Don't remove existing poof animations
        const existingPoof = slotElement.querySelector('.poof-animation-red');
        if (existingPoof) return;

        if (potato) {
            let potatoElement = slotElement.querySelector('.potato');
            if (!potatoElement) {
                potatoElement = document.createElement('div');
                potatoElement.className = 'potato';
                slotElement.appendChild(potatoElement);
            }

            potatoElement.style.transform = `scale(${potato.scaleX}, ${potato.scaleY})`;
            potatoElement.style.borderRadius = potato.borderRadius;
            potatoElement.className = `potato ${potato.textureClass}`;

            const growthIndicator = potatoElement.querySelector('.growth-indicator') || document.createElement('div');
            growthIndicator.className = 'growth-indicator';
            growthIndicator.style.height = `${potato.growthStage}%`;
            potatoElement.appendChild(growthIndicator);

            const growthText = potatoElement.querySelector('.growth-text') || document.createElement('div');
            growthText.className = 'growth-text';
            growthText.textContent = `${Math.floor(potato.growthStage)}%`;
            potatoElement.appendChild(growthText);

            if (potato.growthStage >= 100) {
                potatoElement.classList.add('harvestable');
            } else {
                potatoElement.classList.remove('harvestable');
            }
        } else {
            // Only clear potato-related elements, not the poof animation
            const potatoElement = slotElement.querySelector('.potato');
            if (potatoElement) {
                potatoElement.remove();
            }
        }
    });
}

// Add this function to toggle the Quantum Spud Spawner
function toggleQuantumSpudSpawner() {
    if (isQuantumSpudSpawnerActive) {
            stopQuantumSpudSpawner();
    } else {
        startQuantumSpudSpawner();
    }
    updateQuantumSpudSpawnerToggle();
}

// Add this function to update the Quantum Spud Spawner toggle button
function updateQuantumSpudSpawnerToggle() {
    const toggleElement = document.getElementById('quantum-spud-spawner-toggle');
    if (toggleElement) {
        toggleElement.checked = isQuantumSpudSpawnerActive;
    }
}

// Function to update the field size
function updateFieldSize(newSize) {
    MAX_FIELD_SIZE = newSize;
    potatoField = potatoField.concat(new Array(newSize - potatoField.length).fill(null));
    initializePotatoField();
    updateDisplay();
}

// Function to save the game state
function saveGame() {
    const gameState = {
        potatoCount,
        water,
        nutrients,
        ice,
        areResourcesDepleted,
        plantingDelay,
        lastPlantTime,
        potatoesPerClick,
        waterEfficiency,
        soilEfficiency,
        iceEfficiency,
        waterMeltingClicks,
        isManualIceMeltingUnlocked,
        isIceMeltingBasinUnlocked,
        iceMeltingBasinTimer,
        iceMeltingBasinActive,
        isNuclearIceMelterUnlocked,
        isNuclearIceMelterActive,
        isMartianPotatoColonizerUnlocked,
isMartianPotatoColonizerActive,
colonizerCycle,
        potatoField,
        achievements,
        autoplanters,
        autoHarvesters,
        MAX_FIELD_SIZE,
        unlockedActionCards,
        currentTier, // Save the currentTier
        upgrades: upgrades.map(upgrade => ({
            name: upgrade.name,
            purchased: upgrade.purchased || false,
            count: upgrade.count || 0 // Ensure count is saved even if zero
        })),
        isFirstPlant,
        hasSeenInitialGlow,
        isPolarCapMiningUnlocked,
        isPolarCapMiningActive,

        growthTimeMultiplier, // Add this line to save the variable
        totalPotatoesHarvested, // Add this line
        harvestHistory,          // Add this line
        gameStartTime,           // Add this line
    };
    localStorage.setItem('martianPotatoSave', JSON.stringify(gameState));
    showToast('Game saved successfully!', 'Your progress has been saved.', 'success');
}

// Function to load the game state
function loadGame() {
    try {
        const savedState = localStorage.getItem('martianPotatoSave');

        if (savedState) {
            const gameState = JSON.parse(savedState);
            
            // Restore game variables with default values if not present
            gameStartTime = gameState.gameStartTime || Date.now();
            potatoCount = gameState.potatoCount || 0;
            water = gameState.water || 100;
            nutrients = gameState.nutrients || 100;
            ice = gameState.ice || 100;
            plantingDelay = gameState.plantingDelay || 5000;
            lastPlantTime = gameState.lastPlantTime || 0;
            potatoesPerClick = gameState.potatoesPerClick || 1;
            waterEfficiency = gameState.waterEfficiency || 1;
            soilEfficiency = gameState.soilEfficiency || 1;
            iceEfficiency = gameState.iceEfficiency || 1;
            waterMeltingClicks = gameState.waterMeltingClicks || 0;
            isManualIceMeltingUnlocked = gameState.isManualIceMeltingUnlocked || false;
            isIceMeltingBasinUnlocked = gameState.isIceMeltingBasinUnlocked || false;
            iceMeltingBasinTimer = gameState.iceMeltingBasinTimer || 0;
            iceMeltingBasinActive = gameState.iceMeltingBasinActive || false;
            isNuclearIceMelterUnlocked = gameState.isNuclearIceMelterUnlocked || false;
            isNuclearIceMelterActive = gameState.isNuclearIceMelterActive || false;
            isPolarCapMiningUnlocked = gameState.isPolarCapMiningUnlocked || false;
            isPolarCapMiningActive = gameState.isPolarCapMiningActive || false;
            potatoField = gameState.potatoField || [];
            achievements = { ...defaultAchievements, ...(gameState.achievements || {}) };
            autoplanters = gameState.autoplanters || [];
            autoHarvesters = gameState.autoHarvesters || [];
            MAX_FIELD_SIZE = gameState.MAX_FIELD_SIZE || 8;
            unlockedActionCards = gameState.unlockedActionCards || ['exploration-container'];
            currentTier = gameState.currentTier || 1;
            hasSeenInitialGlow = gameState.hasSeenInitialGlow || false;
            growthTimeMultiplier = gameState.growthTimeMultiplier || 1;
            totalPotatoesHarvested = gameState.totalPotatoesHarvested || 0;
            harvestHistory = gameState.harvestHistory || [];

            restoreUpgrades(gameState.upgrades);

            // Restore unlocked action cards
            if (gameState.unlockedActionCards) {
                unlockedActionCards = [...new Set([...unlockedActionCards, ...gameState.unlockedActionCards])];
            }

            // Ensure all unlocked features have their cards added
            if (isManualIceMeltingUnlocked) {
                unlockedActionCards.push('ice-melting-container');
            }
            if (isIceMeltingBasinUnlocked) {
                unlockedActionCards.push('ice-melting-basin-container');
            }
            if (isNuclearIceMelterUnlocked) {
                unlockedActionCards.push('nuclear-ice-melter-container');
            }
            if (isPolarCapMiningUnlocked) {
                unlockedActionCards.push('polar-cap-mining-container');
            }

            // Corrected variable names here
            if (gameState.isMartianPotatoColonizerUnlocked) {
                isMartianPotatoColonizerUnlocked = gameState.isMartianPotatoColonizerUnlocked;
                unlockedActionCards.push('martian-potato-colonizer-container');
            }

            if (gameState.colonizerCycle) {
                colonizerCycle = gameState.colonizerCycle;
            }

            if (gameState.areResourcesDepleted !== undefined) {
                areResourcesDepleted = gameState.areResourcesDepleted;
            }

            if (isMartianPotatoColonizerUnlocked) {
                initializeMartianPotatoColonizer();
            }

            if (gameState.isMartianPotatoColonizerActive && colonizerCycle < maxColonizerCycles) {
                isMartianPotatoColonizerActive = gameState.isMartianPotatoColonizerActive;
                startMartianPotatoColonizer();
            } else {
                isMartianPotatoColonizerActive = false;
                if (colonizerCycle >= maxColonizerCycles) {
                    const toggleSwitch = document.getElementById('martian-potato-colonizer-toggle');
                    if (toggleSwitch) {
                        toggleSwitch.disabled = true;
                    }
                }
            }

            // Remove duplicates
            unlockedActionCards = [...new Set(unlockedActionCards)];

            // Reinitialize game elements
            initializePotatoField();
            createTechTree();
        updateDisplay();
            updateIceMeltingProgress();
            updateIceMeltingBasinButton();

            // Ensure DOM is ready before updating action cards
            if (document.readyState === 'complete') {
                updateActionCards();
            } else {
                window.addEventListener('load', updateActionCards);
            }

            // Restart autoplanters and auto harvesters
            reinitializeAutoplanters();
            reinitializeAutoHarvesters();

            // Restart Nuclear Ice Melter if it was active
            if (isNuclearIceMelterActive) {
                startNuclearIceMelter();
            }

            // Handle initial glow on the plant button
            if (!hasSeenInitialGlow) {
                document.getElementById('plant-button').classList.add('glow');
            }

            // Re-initialize chart with loaded data
            initializeHarvestChart();
            updateHarvestChart();

            showToast('Game loaded successfully!', 'Your progress has been restored.', 'success');
        } else {
            // New game initialization
            gameStartTime = Date.now();
            hasSeenInitialGlow = false;
            document.getElementById('plant-button').classList.add('glow');
            unlockedActionCards = ['exploration-container'];
            updateActionCards();
            showToast('No saved game found', 'Starting a new game.', 'info');
        }
    } catch (error) {
        console.error('Error loading game:', error);
        gameStartTime = Date.now();
        unlockedActionCards = ['exploration-container'];
        updateActionCards();
        showToast('Error loading game', 'There was an error loading your saved game. Starting a new game.', 'error');
    }
}

function restoreUpgrades(savedUpgrades) {
    if (savedUpgrades && Array.isArray(savedUpgrades)) {
        upgrades.forEach(upgrade => {
            const savedUpgrade = savedUpgrades.find(u => u.name === upgrade.name);
            if (savedUpgrade) {
                upgrade.purchased = savedUpgrade.purchased || false;
                upgrade.count = savedUpgrade.count || 0;

                const isMilestoneUpgrade = upgrade.unlocksNextTier || false;

                if (!upgrade.repeatable && upgrade.purchased && upgrade.effect && !isMilestoneUpgrade) {
                    // For non-repeatable upgrades, apply the effect once
                    upgrade.effect();
                }
            }
        });
    }
}

// Function to update the visibility of action cards
function updateActionCards() {
    const allActionCards = document.querySelectorAll('.action-card');
    allActionCards.forEach(card => {
        if (unlockedActionCards.includes(card.id)) {
            card.style.display = 'block';

            // Handle depletions using the reusable function
            if (areResourcesDepleted && [
                'martian-potato-colonizer-container',
                'subsurface-aquifer-tapper-container',
                'bucket-wheel-excavator-container',
                'subterranean-tuber-tunneler-container',
                'polar-cap-mining-container'
            ].includes(card.id)) {
                updateDepletedActionCard(card.id, true, "Resources Depleted");
            } else {
                // For other action cards, ensure they are active unless individually depleted
                updateDepletedActionCard(card.id, false);
            }

        } else if (card.id !== 'exploration-container') {
            card.style.display = 'none';
        }
    });
}

function updateDepletedActionCard(actionCardId, isDepleted, message) {
    const card = document.getElementById(actionCardId);
    if (card) {
        const toggleContainer = card.querySelector('.toggle-switch-container');
        let depletedMessage = card.querySelector('.depleted-message');

        if (isDepleted) {
            // Hide the toggle switch
            if (toggleContainer) {
                toggleContainer.style.display = 'none';
            }
            // Display the depleted message
            if (!depletedMessage) {
                depletedMessage = document.createElement('p');
                depletedMessage.classList.add('depleted-message');
                depletedMessage.textContent = message;
                card.appendChild(depletedMessage);
            }
        } else {
            // Show the toggle switch
            if (toggleContainer) {
                toggleContainer.style.display = 'block';
            }
            // Remove the depleted message
            if (depletedMessage) {
                depletedMessage.remove();
            }
        }
    }
}

// Function to reset the game state
function resetGame() {
    if (confirm('Are you sure you want to reset the game? This will erase all your progress.')) {
        localStorage.removeItem('martianPotatoSave');
        location.reload();
    }
}

// Initialize the game
let gameInitialized = false;
function initGame() {
    if (!gameInitialized) {
        loadGame();
        requestAnimationFrame(gameLoop);
        gameInitialized = true;
        
        // Ensure action cards are updated after the DOM is fully loaded
        if (document.readyState === 'complete') {
            updateActionCards();
        } else {
            window.addEventListener('load', updateActionCards);
        }
    }
}

// Call initGame when the window loads
window.addEventListener('load', initGame);

// Check and restart any stopped auto harvesters
function checkAndRestartAutoHarvesters() {
    autoHarvesters.forEach(autoHarvester => {
        if (!autoHarvester.interval) {
            startAutoHarvester(autoHarvester);
        }
    });
}

function reinitializeAutoplanters() {
    autoplanters.forEach(autoplanter => {
        // Restart the interval
        startAutoplanter(autoplanter);
    });
}

function reinitializeAutoHarvesters() {
    autoHarvesters.forEach(autoHarvester => {
        // Restart the interval
        startAutoHarvester(autoHarvester);
    });
}

function unlockPolarCapMining() {
    isPolarCapMiningUnlocked = true;
    const miningContainer = document.getElementById('polar-cap-mining-container');
    if (miningContainer) {
        miningContainer.style.display = 'block';
    }
}

function togglePolarCapMining() {
    if (!isPolarCapMiningUnlocked) return;

    isPolarCapMiningActive = !isPolarCapMiningActive;
    const toggleSwitch = document.getElementById('polar-cap-mining-toggle');
    if (toggleSwitch) {
        toggleSwitch.checked = isPolarCapMiningActive;
    }

    if (isPolarCapMiningActive) {
        startPolarCapMining();
    } else {
        stopPolarCapMining();
    }
}

function startPolarCapMining() {
    polarCapMiningInterval = setInterval(() => {
        if (potatoCount >= 2) {
            potatoCount -= 2;
            ice += 2;
            updateDisplay();
        } else {
            showToast("Resource Shortage", "Not enough potatoes to run Polar Cap Mining!", 'setback');
            togglePolarCapMining(); // Turn off if resources are insufficient
        }
    }, 1000); // Runs every second
}

function stopPolarCapMining() {
    clearInterval(polarCapMiningInterval);
}

// Function to get the playtime
function getPlaytime() {
    const playtimeMillis = Date.now() - gameStartTime;
    const playtimeSeconds = Math.floor((playtimeMillis / 1000) % 60);
    const playtimeMinutes = Math.floor((playtimeMillis / (1000 * 60)) % 60);
    const playtimeHours = Math.floor(playtimeMillis / (1000 * 60 * 60));
    return `${playtimeHours}h ${playtimeMinutes}m ${playtimeSeconds}s`;
}

// Function to aggregate harvest history data
function aggregateHarvestHistory() {
    const maxDataPoints = 200;
    if (harvestHistory.length > maxDataPoints) {
        const aggregatedHistory = [];
        for (let i = 0; i < harvestHistory.length; i += 2) {
            const first = harvestHistory[i];
            const second = harvestHistory[i + 1];
            const aggregatedEntry = {
                timestamp: second ? Math.floor((first.timestamp + second.timestamp) / 2) : first.timestamp,
                totalPotatoes: second ? Math.floor((first.totalPotatoes + second.totalPotatoes) / 2) : first.totalPotatoes
            };
            aggregatedHistory.push(aggregatedEntry);
        }
        harvestHistory = aggregatedHistory;
    }
}

// Initialize the harvest chart
let harvestChart;

function initializeHarvestChart() {
    if (harvestChart) {
        harvestChart.destroy();
    }
    const ctx = document.getElementById('harvestChart').getContext('2d');
    harvestChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Potatoes Harvested',
                data: [],
                borderColor: '#C2A378', // Potato color
                borderWidth: 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'MMM d, h:mm:ss a'
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Potatoes Harvested'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Remove the legend
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Total Potatoes: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

// Update the harvest chart data
function updateHarvestChart() {
    if (!harvestChart) return;

    // Map harvestHistory to chart data
    const timestamps = harvestHistory.map(entry => new Date(entry.timestamp));
    const totals = harvestHistory.map(entry => entry.totalPotatoes);

    harvestChart.data.labels = timestamps;
    harvestChart.data.datasets[0].data = totals;
    harvestChart.update();

    // Update the total potatoes count in the subtitle
    const totalPotatoesCount = document.getElementById('total-potatoes-count');
    if (totalPotatoesCount) {
        totalPotatoesCount.textContent = totalPotatoesHarvested;
    }

    // Update the elapsed mission time using Martian time
    const missionTimeValue = document.getElementById('mission-time-value');
    if (missionTimeValue) {
        missionTimeValue.textContent = getElapsedMartianTime();
    }
}

function getElapsedMartianTime() {
    const elapsedMillis = Date.now() - gameStartTime;
    const elapsedEarthSeconds = elapsedMillis / 1000;
    const martianSeconds = elapsedEarthSeconds / 1.02749;
    
    const martianHours = Math.floor(martianSeconds / 3698.958);
    const remainingSeconds = martianSeconds % 3698.958;
    const martianMinutes = Math.floor(remainingSeconds / 61.6493);
    const finalMartianSeconds = Math.floor(remainingSeconds % 61.6493);
    
    return `${martianHours.toString().padStart(2, '0')}:${martianMinutes.toString().padStart(2, '0')}:${finalMartianSeconds.toString().padStart(2, '0')} MTC`;
}

// Add event listeners for the chart modal within the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the chart variables
    let harvestChartInitialized = false;
    
    const chartButton = document.getElementById('chart-button');
    const chartModal = document.getElementById('chart-modal');
    const closeChartModal = document.querySelector('.close-chart-modal');
    
    if (chartButton && chartModal && closeChartModal) {
        chartButton.addEventListener('click', () => {
            chartModal.style.display = 'flex';
            // Initialize the chart if necessary
            if (!harvestChartInitialized) {
                initializeHarvestChart();
                harvestChartInitialized = true;
            }
            updateHarvestChart();
        });
        
        closeChartModal.addEventListener('click', () => {
            chartModal.style.display = 'none';
        });
        
        // Close modal when clicking outside of modal-content
        chartModal.addEventListener('click', (event) => {
            if (event.target === chartModal) {
                chartModal.style.display = 'none';
            }
        });
    }
});