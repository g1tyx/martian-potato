// Upgrade system will be implemented here
console.log("Upgrades system loaded");

const upgrades = [
    { 
        name: "Hand Trowel", 
        cost: 0, 
        effect: () => { plantingDelay = 4000; },
        icon: "🖐️",
        description: "The simplest tool for planting potatoes.",
        metaMessage: "Manual labor. The game begins with the simplest form of interaction, making future efficiencies feel like significant advancements.",
        weight: 1,
        category: "planting"
    },
    { 
        name: "Manual Ice Melting", 
        cost: 0, 
        effect: () => { 
            unlockManualIceMelting();
            showToast("Upgrade Unlocked", "You can now manually melt ice for water!", 'achievement');
        },
        icon: "🧊",
        description: "Collect water by manually melting Martian ice, 1 unit per 5 clicks.",
        metaMessage: "The grind begins. By starting with a low-yield, high-effort method, the game establishes a baseline against which all future upgrades will feel like progress, even if they simply shift the type of effort required.",
        assetName: "manual_ice_melting.webp",
        weight: 2,
        category: "harvesting"
    },
    { 
        name: "Watering Can", 
        cost: 1, 
        effect: () => { plantingDelay = 3000; },
        icon: "🚿",
        description: "Speeds up the planting process by efficiently watering the soil.",
        metaMessage: "Integrating water delivery. This upgrade speeds up the planting process, giving you a sense of progress while subtly introducing the concept of resource management.",
        weight: 3,
        category: "planting"
    },
    { 
        name: "Automated Planter", 
        cost: 5, 
        effect: () => { addAutoplanter(); }, 
        count: 0,
        icon: "🤖",
        description: "Automatically plants potatoes, reducing manual labor.",
        metaMessage: "Automation's allure. This upgrade significantly reduces active playtime, giving you a sense of progress and control, while quietly introducing a new constraint: power.",
        weight: 4,
        category: "planting"
    },
    { 
        name: "Auto Harvester", 
        cost: 100, 
        effect: () => { addAutoHarvester(); }, 
        count: 0,
        icon: "🤖",
        description: "Automatically harvests mature potatoes.",
        metaMessage: "Your first step towards full automation. The game is reducing your direct involvement, shifting your focus to management and strategy.",
        weight: 5,
        category: "harvesting"
    },
    { 
        name: "Quantum Spud Spawner", 
        cost: 1000, 
        effect: () => { plantingDelay = 500; },
        icon: "⚛️",
        description: "Utilizes quantum technology for near-instant potato planting.",
        metaMessage: "The ultimate efficiency. The game offers peak performance, yet at a steep resource cost. This reflects the paradox of progress: as you achieve perfection, your burden increases.",
        weight: 6,
        category: "planting"
    }
];

let currentPlantingUpgrade = 0;

// Add these variables at the top of the file
let lastTechTreeUpdate = 0;
const TECH_TREE_UPDATE_INTERVAL = 1000; // Update every second

// Modify the updateTechTree function
function updateTechTree() {
    const currentTime = Date.now();
    if (currentTime - lastTechTreeUpdate < TECH_TREE_UPDATE_INTERVAL) {
        return; // Exit if not enough time has passed since the last update
    }
    lastTechTreeUpdate = currentTime;

    const techCards = document.querySelectorAll('.tech-card');
    
    techCards.forEach((card) => {
        const index = parseInt(card.dataset.index);
        const upgrade = upgrades[index];
        
        if (upgrade) {
            const upgradeCost = getUpgradeCost(upgrade);
            const isPurchasable = potatoCount >= upgradeCost;

            // Only update classes if there's a change
            if (isPurchasable && !card.classList.contains('purchasable')) {
                card.classList.add('purchasable');
            } else if (!isPurchasable && card.classList.contains('purchasable')) {
                card.classList.remove('purchasable');
            }

            // Update cost display if needed
            const costElement = card.querySelector('.tech-card-cost');
            if (costElement) {
                const newCostText = `Cost: ${upgradeCost} potatoes`;
                if (costElement.textContent !== newCostText) {
                    costElement.textContent = newCostText;
                }
            }
        }
    });
}

// Modify the gameLoop function in js/game.js
function gameLoop(currentTime) {
    if (currentTime - lastFrameTime >= FRAME_DELAY) {
        updatePlantButton();
        if (updateResources(currentTime)) {
            updateDisplay();
            checkAndRestartAutoplanters();
        }
        updatePotatoGrowth();
        updateTechTree(); // Call updateTechTree here, it will self-throttle
        lastFrameTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
}

// Remove the updateTechTree call from createTechTree
function createTechTree() {
    const techTree = document.getElementById('tech-tree');
    techTree.innerHTML = ''; // Clear existing content

    // Sort upgrades by weight
    const sortedUpgrades = upgrades.slice().sort((a, b) => a.weight - b.weight);

    sortedUpgrades.forEach((upgrade, index) => {
        if (!upgrade.purchased || (upgrade.count !== undefined && upgrade.count > 0)) {
            techTree.appendChild(createCard(upgrade, index));
        }
    });
    
    // Remove this line:
    // updateTechTree(); // Call this to set initial states
}

function createCard(upgrade, index) {
    const card = document.createElement('div');
    card.className = 'tech-card';
    card.dataset.index = index;

    const iconElement = document.createElement('div');
    iconElement.className = 'tech-card-icon';

    const imageName = upgrade.assetName || (upgrade.name.replace(/\s+/g, '_').toLowerCase() + '.webp');
    const imageUrl = `images/${imageName}`;

    const img = new Image();
    img.src = imageUrl;
    img.onerror = () => {
        iconElement.textContent = upgrade.icon;
        console.log(`Failed to load image: ${imageUrl}`);
    };
    img.onload = () => {
        iconElement.innerHTML = '';
        iconElement.appendChild(img);
    };

    iconElement.textContent = upgrade.icon; // Fallback content

    const detailsElement = document.createElement('div');
    detailsElement.className = 'tech-card-details';
    detailsElement.innerHTML = `
        <h3 class="tech-card-name" title="${upgrade.name}">${upgrade.name}</h3>
        <p class="tech-card-cost">Cost: ${getUpgradeCost(upgrade)} potatoes</p>
        <button class="details-button">Details</button>
    `;

    card.appendChild(iconElement);
    card.appendChild(detailsElement);

    card.querySelector('.details-button').addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent card click event
        showUpgradeModal(upgrade, index);
    });

    return card;
}

function getUpgradeCost(upgrade) {
    if (upgrade.count !== undefined) {
        return Math.floor(upgrade.cost * Math.pow(1.15, upgrade.count));
    }
    return upgrade.cost;
}

function showUpgradeModal(upgrade, index) {
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let content = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>${upgrade.name}</h2>
            <p>${upgrade.description}</p>
    `;

    const upgradeCost = getUpgradeCost(upgrade);
    if (!upgrade.purchased || (upgrade.count !== undefined)) {
        content += `
            <p class="tech-card-cost">Cost: ${upgradeCost} potatoes</p>
            <button class="buy-upgrade-button" ${potatoCount >= upgradeCost ? '' : 'disabled'}>Buy Upgrade</button>
        `;
    }
    
    content += `<p class="meta-message">${upgrade.metaMessage}</p>`;
    content += `</div>`;
    modal.innerHTML = content;

    if (!upgrade.purchased || (upgrade.count !== undefined)) {
        const buyButton = modal.querySelector('.buy-upgrade-button');
        buyButton.addEventListener('click', () => {
            buyUpgrade(index);
            modal.remove();
        });
    }

    const closeButton = modal.querySelector('.close-modal');
    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
}

function buyUpgrade(index) {
    const upgrade = upgrades[index];
    if (!upgrade) return; // Exit if the upgrade doesn't exist

    const cost = getUpgradeCost(upgrade);
    if (potatoCount >= cost) {
        potatoCount -= cost;
        upgrade.effect();
        upgrade.purchased = true;
        if (upgrade.count !== undefined) {
            upgrade.count++;
        }
        updateDisplay(); // Update other game elements
        createTechTree(); // Recreate the tech tree to remove purchased upgrades
        console.log("Upgrade purchased:", upgrade.name);
        console.log("New planting delay:", plantingDelay);
        showToast("Upgrade Purchased", `You have purchased the ${upgrade.name} upgrade!`, 'achievement');
        showToast("Meta Insight", upgrade.metaMessage, 'meta');
    } else {
        showToast("Not Enough Potatoes", "You don't have enough potatoes to purchase this upgrade.", 'setback');
    }
}

let autoplanters = [];

function addAutoplanter() {
    const autoplanter = {
        interval: null,
        cost: Math.floor(20 * Math.pow(1.15, upgrades.planting[3].count))
    };
    autoplanters.push(autoplanter);
    rawPotatoesPerSecond += 1; // Each autoplanter adds 1 potato per second
    startAutoplanter(autoplanter);
    updateDisplay();
}

function startAutoplanter(autoplanter) {
    autoplanter.interval = setInterval(() => {
        const emptySlotIndex = potatoField.findIndex(slot => slot === null);
        if (emptySlotIndex !== -1 && consumeResources()) {
            const currentTime = Date.now();
            const scaleX = 0.95 + Math.random() * 0.1;
            const scaleY = 0.95 + Math.random() * 0.1;
            const borderRadius = `${45 + Math.random() * 10}% ${55 + Math.random() * 10}% ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% / ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% ${55 + Math.random() * 10}% ${45 + Math.random() * 10}%`;
            const textureClass = `potato-texture-${Math.floor(Math.random() * 8) + 1}`;
            
            potatoField[emptySlotIndex] = {
                plantedAt: currentTime,
                growthStage: 0,
                scaleX,
                scaleY,
                borderRadius,
                textureClass
            };
            updateDisplay();
        }
    }, 2000); // Try to plant every 2 seconds
}

function checkAndRestartAutoplanters() {
    autoplanters.forEach(autoplanter => {
        if (!autoplanter.interval) {
            startAutoplanter(autoplanter);
        }
    });
}

let autoHarvesters = [];
const BASE_HARVEST_DELAY = 1000; // 1 second in milliseconds

function addAutoHarvester() {
    const autoHarvester = {
        cost: Math.floor(10 * Math.pow(1.15, upgrades.harvesting[1].count))
    };
    autoHarvesters.push(autoHarvester);
    updateAutoHarvesterDelay();
    updateDisplay();
}

function updateAutoHarvesterDelay() {
    const newDelay = BASE_HARVEST_DELAY / autoHarvesters.length;
    if (autoHarvesters.length === 1) {
        startAutoHarvester(newDelay);
    } else {
        clearInterval(autoHarvestInterval);
        startAutoHarvester(newDelay);
    }
}

let autoHarvestInterval;
let lastAutoHarvestTime = 0;

function startAutoHarvester(delay) {
    clearInterval(autoHarvestInterval);
    autoHarvestInterval = setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastAutoHarvestTime >= delay) {
            harvestOneReadyPotato();
            lastAutoHarvestTime = currentTime;
        }
    }, 100); // Check more frequently, but only harvest based on the delay
}

function harvestOneReadyPotato() {
    for (let i = 0; i < potatoField.length; i++) {
        if (potatoField[i] && potatoField[i].growthStage >= 100) {
            harvestPotatoAtIndex(i);
            break; // Only harvest one potato
        }
    }
}

// Initialize the tech tree
document.addEventListener('DOMContentLoaded', () => {
    createTechTree();

    const techTree = document.getElementById('tech-tree');
    const leftArrow = document.getElementById('tech-tree-left');
    const rightArrow = document.getElementById('tech-tree-right');

    const updateArrows = () => {
        leftArrow.style.display = techTree.scrollLeft > 0 ? 'block' : 'none';
        rightArrow.style.display = techTree.scrollWidth > techTree.clientWidth + techTree.scrollLeft ? 'block' : 'none';
    };

    leftArrow.addEventListener('click', () => {
        techTree.scrollBy({ left: -200, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        techTree.scrollBy({ left: 200, behavior: 'smooth' });
    });

    techTree.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);

    updateArrows(); // Initial check
});

// Remove or comment out this function as it's no longer needed
// function updateTechTreeAlignment() {
//     const techTree = document.getElementById('tech-tree');
//     const categories = techTree.querySelectorAll('.tech-category');
//     let maxHeight = 0;

//     categories.forEach(category => {
//         const height = category.offsetHeight;
//         if (height > maxHeight) {
//             maxHeight = height;
//         }
//     });

//     categories.forEach(category => {
//         category.style.height = `${maxHeight}px`;
//     });
// }

// Remove or comment out this event listener as it's no longer needed
// window.addEventListener('resize', updateTechTreeAlignment);
// document.addEventListener('DOMContentLoaded', () => {
//     createTechTree();
//     updateTechTreeAlignment();
// });

// Add this function to handle manual ice melting
function meltIce() {
    if (!isManualIceMeltingUnlocked) return;
    
    waterMeltingClicks++;
    if (waterMeltingClicks >= CLICKS_PER_WATER) {
        water++;
        waterMeltingClicks = 0;
        showToast("Water Collected", "You've melted ice and collected 1 unit of water!", 'achievement');
    }
    updateIceMeltingProgress();
    updateDisplay();
    updateLastAction("Melted ice");
}

// Add this function to unlock manual ice melting
function unlockManualIceMelting() {
    isManualIceMeltingUnlocked = true;
    const iceMeltingContainer = document.getElementById('ice-melting-container');
    if (iceMeltingContainer) {
        iceMeltingContainer.style.display = 'block';
    }
}

// Initialize the ice melting mechanism
document.addEventListener('DOMContentLoaded', () => {
    const iceMeltingContainer = document.getElementById('ice-melting-container');
    if (iceMeltingContainer) {
        iceMeltingContainer.style.display = 'none'; // Hide by default
    }

    const iceCube = document.getElementById('ice-cube');
    iceCube.addEventListener('click', meltIce);
});