// Store system for upgrades and items

// Upgrade configurations
const UPGRADES = {
	eggStepsBoost: {
		name: 'Egg Steps Boost',
		description: 'Increases egg steps gained per tick',
		baseCost: 150,
		costMultiplier: 1.8,
		effectPerLevel: 3, // Adds 3 to both min and max per level (reduced from 5)
		maxLevel: null // Unlimited
	},
	tickSpeedBoost: {
		name: 'Tick Speed Boost',
		description: 'Reduces time between ticks',
		baseCost: 200,
		costMultiplier: 1.9,
		effectPerLevel: 25, // Reduces tick interval by 25ms per level (reduced from 50)
		maxLevel: null // Unlimited
	},
	eggSpeedBoost: {
		name: 'Breeding Speed',
		description: 'Make eggs generate faster',
		baseCost: 250,
		costMultiplier: 1.85,
		effectPerLevel: 0.98, // Multiplier (0.98x = 2% faster per level, much slower progression)
		maxLevel: null // Unlimited
	},
	eggCapacityBoost: {
		name: 'Egg Capacity',
		description: 'Increase max eggs in daycare storage',
		baseCost: 300,
		costMultiplier: 1.75,
		effectPerLevel: 1, // Adds 1 slot per level
		maxLevel: null // Unlimited
	}
};

// Calculate cost for next upgrade level
function getUpgradeCost(upgradeType) {
	const upgrade = UPGRADES[upgradeType];
	const currentLevel = getUpgradeLevel(upgradeType);
	
	if (upgrade.maxLevel !== null && currentLevel >= upgrade.maxLevel) {
		return null; // Max level reached
	}
	
	return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

// Get current bonus from upgrade
function getUpgradeBonus(upgradeType) {
	const upgrade = UPGRADES[upgradeType];
	const currentLevel = getUpgradeLevel(upgradeType);
	return currentLevel * upgrade.effectPerLevel;
}

// Get egg steps per tick with upgrades applied
function getEggStepsPerTick() {
	const boost = getUpgradeBonus('eggStepsBoost');
	return {
		min: BALANCE.EGG_STEPS_PER_TICK_MIN + boost,
		max: BALANCE.EGG_STEPS_PER_TICK_MAX + boost
	};
}

// Get tick interval with upgrades applied
function getTickInterval() {
	const reduction = getUpgradeBonus('tickSpeedBoost');
	return Math.max(250, BALANCE.TICK_INTERVAL - reduction); // Min 250ms
}

// Buy an upgrade
function buyUpgrade(upgradeType) {
	const cost = getUpgradeCost(upgradeType);
	
	if (cost === null) {
		return { success: false, message: 'Max level reached!' };
	}
	
	if (getPokedollars() < cost) {
		return { success: false, message: 'Not enough Pokedollars!' };
	}
	
	spendPokedollars(cost);
	purchaseUpgrade(upgradeType);
	
	return { success: true, message: 'Upgrade purchased!' };
}

// Render store UI
function renderStore() {
	const pokedollarsDisplay = document.getElementById('pokedollarsDisplay');
	if (pokedollarsDisplay) {
		pokedollarsDisplay.textContent = getPokedollars().toLocaleString();
	}
	
	// Render each upgrade
	Object.keys(UPGRADES).forEach(upgradeType => {
		renderUpgrade(upgradeType);
	});
}

// Render a single upgrade
function renderUpgrade(upgradeType) {
	const container = document.getElementById(`upgrade-${upgradeType}`);
	if (!container) return;
	
	const upgrade = UPGRADES[upgradeType];
	const currentLevel = getUpgradeLevel(upgradeType);
	const cost = getUpgradeCost(upgradeType);
	const bonus = getUpgradeBonus(upgradeType);
	
	// Update level display
	const levelDisplay = container.querySelector('.upgrade-level');
	if (levelDisplay) {
		levelDisplay.textContent = `Level ${currentLevel}${currentLevel >= upgrade.maxLevel ? ' (MAX)' : ''}`;
	}
	
	// Update bonus display
	const bonusDisplay = container.querySelector('.upgrade-bonus');
	if (bonusDisplay) {
		if (upgradeType === 'eggStepsBoost') {
			bonusDisplay.textContent = `+${bonus} egg steps per tick`;
		} else if (upgradeType === 'tickSpeedBoost') {
			bonusDisplay.textContent = `-${bonus}ms tick interval`;
		} else if (upgradeType === 'eggSpeedBoost') {
			const percentage = Math.round((1 - bonus) * 100);
			bonusDisplay.textContent = `${percentage}% faster`;
		} else if (upgradeType === 'eggCapacityBoost') {
			bonusDisplay.textContent = `+${bonus} slots`;
		}
	}
	
	// Update buy button
	const buyButton = container.querySelector('.buy-button');
	if (buyButton) {
		if (cost === null) {
			buyButton.disabled = true;
			buyButton.textContent = 'MAX LEVEL';
		} else {
			buyButton.disabled = getPokedollars() < cost;
			buyButton.textContent = `Buy (${cost.toLocaleString()} ₽)`;
			buyButton.onclick = () => {
				const result = buyUpgrade(upgradeType);
				if (result.success) {
					renderStore();
				} else {
					alert(result.message);
				}
			};
		}
	}
}

// Initialize store page
document.addEventListener('DOMContentLoaded', () => {
	renderStore();
	
	// Update display every second
	setInterval(renderStore, 1000);
});
