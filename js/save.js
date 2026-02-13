// Global game state - loads from and saves to localStorage

// When true, we are in the middle of an import and
// must NOT let any automatic saves overwrite the
// freshly imported data in localStorage.
let importInProgress = false;

let gameData = {
	incubator: [],
	pc: [],
    filters: [],
	eggHatched: 0,
	shinyHatched: 0,
	rareCandy: 0,
	paused: false,
	pokedollars: 0,
	upgrades: {
		eggStepsBoost: 0,
		tickSpeedBoost: 0,
		eggSpeedBoost: 0,
		eggCapacityBoost: 0
	},
	daycare: {
		breeders: [null, null], // Parent pokemon indices from PC
		eggTimer: null,         // When the current breeding will complete
		remainingTime: null,    // Remaining time when manually paused
		eggs: []                // Separate egg storage for daycare
	}
};

// Load all data from localStorage
function loadGameData() {
	const incubatorData = localStorage.getItem('incubator');
	const pcData = localStorage.getItem('pc');
	const filtersData = localStorage.getItem('filters');
	const eggHatchedData = localStorage.getItem('eggHatched');
	const shinyHatchedData = localStorage.getItem('shinyHatched');

	if (incubatorData) {
		try {
			gameData.incubator = JSON.parse(incubatorData);
		} catch (e) {
			console.error('Error loading incubator:', e);
			gameData.incubator = [];
		}
	} else {
		gameData.incubator = [];
	}

	if (pcData) {
		try {
			gameData.pc = JSON.parse(pcData);
			// Ensure PC is the right size
			if (gameData.pc.length < BALANCE.PC_CAPACITY) {
				gameData.pc.push(...Array(BALANCE.PC_CAPACITY - gameData.pc.length).fill(null));
			}
		} catch (e) {
			console.error('Error loading PC:', e);
			gameData.pc = Array(BALANCE.PC_CAPACITY).fill(null);
		}
	} else {
		// Initialize PC if it doesn't exist
		gameData.pc = Array(BALANCE.PC_CAPACITY).fill(null);
	}

	if (filtersData) {
		try {
			gameData.filters = JSON.parse(filtersData);
		} catch (e) {
			console.error('Error loading filters:', e);
			gameData.filters = [];
		}
	} else {
		gameData.filters = [];
	}

	if (eggHatchedData) {
		const parsed = parseInt(eggHatchedData, 10);
		gameData.eggHatched = Number.isFinite(parsed) ? parsed : 0;
	} else {
		gameData.eggHatched = 0;
	}

	if (shinyHatchedData) {
		const parsed = parseInt(shinyHatchedData, 10);
		gameData.shinyHatched = Number.isFinite(parsed) ? parsed : 0;
	} else {
		gameData.shinyHatched = 0;
	}

	const rareCandyData = localStorage.getItem('rareCandy');
	if (rareCandyData) {
		try {
			gameData.rareCandy = parseInt(rareCandyData);
		} catch (e) {
			console.error('Error loading rare candy:', e);
			gameData.rareCandy = 0;
		}
	} else {
		gameData.rareCandy = 0;
	}

	const pausedData = localStorage.getItem('paused');
	if (pausedData) {
		try {
			gameData.paused = pausedData === 'true';
		} catch (e) {
			console.error('Error loading paused state:', e);
			gameData.paused = false;
		}
	} else {
		gameData.paused = false;
	}

	const pokedollarsData = localStorage.getItem('pokedollars');
	if (pokedollarsData) {
		try {
			gameData.pokedollars = parseInt(pokedollarsData);
		} catch (e) {
			console.error('Error loading pokedollars:', e);
			gameData.pokedollars = 0;
		}
	} else {
		gameData.pokedollars = 0;
	}

	const upgradesData = localStorage.getItem('upgrades');
	if (upgradesData) {
		try {
			gameData.upgrades = JSON.parse(upgradesData);
		} catch (e) {
			console.error('Error loading upgrades:', e);
			gameData.upgrades = { eggStepsBoost: 0, tickSpeedBoost: 0, eggSpeedBoost: 0, eggCapacityBoost: 0 };
		}
	} else {
		gameData.upgrades = { eggStepsBoost: 0, tickSpeedBoost: 0, eggSpeedBoost: 0, eggCapacityBoost: 0 };
	}

	const daycareData = localStorage.getItem('daycare');
	if (daycareData) {
		try {
			gameData.daycare = JSON.parse(daycareData);
			// Backwards compatibility: ensure new fields exist
			if (typeof gameData.daycare.remainingTime === 'undefined') {
				gameData.daycare.remainingTime = null;
			}
		} catch (e) {
			console.error('Error loading daycare:', e);
			gameData.daycare = { breeders: [null, null], eggTimer: null, remainingTime: null, eggs: [] };
		}
	} else {
		gameData.daycare = { breeders: [null, null], eggTimer: null, remainingTime: null, eggs: [] };
	}
}

// Save all data to localStorage
function saveGameData() {
	// During an import, other systems (incubator ticks,
	// daycare, PC, etc.) may still try to call saveGameData.
	// If we let them run, they could overwrite the freshly
	// imported localStorage with the old in-memory state
	// just before the page reloads. Guard against that.
	if (importInProgress) {
		return;
	}

	localStorage.setItem('incubator', JSON.stringify(gameData.incubator));
	localStorage.setItem('pc', JSON.stringify(gameData.pc));
	localStorage.setItem('filters', JSON.stringify(gameData.filters));
	localStorage.setItem('eggHatched', gameData.eggHatched.toString());
	localStorage.setItem('shinyHatched', gameData.shinyHatched.toString());
	localStorage.setItem('rareCandy', gameData.rareCandy.toString());
	localStorage.setItem('paused', gameData.paused.toString());
	localStorage.setItem('pokedollars', gameData.pokedollars.toString());
	localStorage.setItem('upgrades', JSON.stringify(gameData.upgrades));
	localStorage.setItem('daycare', JSON.stringify(gameData.daycare));
}

function getEggHatchedCount() {
	return gameData.eggHatched || 0;
}

function getShinyHatchedCount() {
	return gameData.shinyHatched || 0;
}

function updateHatchCountersUI() {
	const eggEl = document.getElementById('eggHatchedCount');
	if (eggEl) {
		eggEl.textContent = getEggHatchedCount().toString();
	}
	const shinyEl = document.getElementById('shinyHatchedCount');
	if (shinyEl) {
		shinyEl.textContent = getShinyHatchedCount().toString();
	}
}

let hatchCountersSaveTimer = null;
let hatchCountersUiTimer = null;
let suppressHatchCountersFlushOnUnload = false;

function saveHatchCountersNow() {
	localStorage.setItem('eggHatched', (gameData.eggHatched || 0).toString());
	localStorage.setItem('shinyHatched', (gameData.shinyHatched || 0).toString());
}

function scheduleHatchCountersSave() {
	if (hatchCountersSaveTimer) return;
	hatchCountersSaveTimer = setTimeout(() => {
		hatchCountersSaveTimer = null;
		saveHatchCountersNow();
	}, 500);
}

function scheduleHatchCountersUIUpdate() {
	if (hatchCountersUiTimer) return;
	hatchCountersUiTimer = requestAnimationFrame(() => {
		hatchCountersUiTimer = null;
		updateHatchCountersUI();
	});
}

function recordEggHatchedBulk(totalHatched, shinyHatched) {
	if (!Number.isFinite(totalHatched) || totalHatched <= 0) return;
	if (!Number.isFinite(shinyHatched) || shinyHatched < 0) shinyHatched = 0;
	if (shinyHatched > totalHatched) shinyHatched = totalHatched;

	gameData.eggHatched = (gameData.eggHatched || 0) + totalHatched;
	gameData.shinyHatched = (gameData.shinyHatched || 0) + shinyHatched;

	// Avoid spamming full saveGameData() writes; only persist counters.
	scheduleHatchCountersSave();
	scheduleHatchCountersUIUpdate();
}

function recordEggHatched(isShiny) {
	recordEggHatchedBulk(1, isShiny ? 1 : 0);
}

// Ensure counters are persisted even if the tab closes quickly
window.addEventListener('beforeunload', () => {
	try {
		if (suppressHatchCountersFlushOnUnload) {
			return;
		}
		if (hatchCountersSaveTimer) {
			clearTimeout(hatchCountersSaveTimer);
			hatchCountersSaveTimer = null;
		}
		saveHatchCountersNow();
	} catch (e) {
		// ignore
	}
});

// Get incubator
function getIncubatorEggs() {
	return gameData.incubator;
}

// Get PC
function getPC() {
	return gameData.pc;
}

// Get filters
function getFilters() {
	return gameData.filters;
}

// Get rare candy count
function getRareCandy() {
	return gameData.rareCandy;
}

// Add rare candy
function addRareCandy(amount = 1) {
	gameData.rareCandy += amount;
	saveGameData();
}

// Use rare candy for evolution
function useRareCandy(amount = 1) {
	if (gameData.rareCandy >= amount) {
		gameData.rareCandy -= amount;
		saveGameData();
		return true;
	}
	return false;
}

// Check if game is paused
function isPaused() {
	return gameData.paused;
}

// Set pause state
function setPaused(paused) {
	gameData.paused = paused;
	saveGameData();
}

// Get pokedollars
function getPokedollars() {
	return gameData.pokedollars;
}

// Add pokedollars
function addPokedollars(amount) {
	gameData.pokedollars += amount;
	saveGameData();
}

// Spend pokedollars
function spendPokedollars(amount) {
	if (gameData.pokedollars >= amount) {
		gameData.pokedollars -= amount;
		saveGameData();
		return true;
	}
	return false;
}

// Get upgrade level
function getUpgradeLevel(upgradeType) {
	return gameData.upgrades[upgradeType] || 0;
}

// Purchase upgrade
function purchaseUpgrade(upgradeType) {
	gameData.upgrades[upgradeType] = (gameData.upgrades[upgradeType] || 0) + 1;
	saveGameData();
}

// Daycare functions
function getDaycare() {
	return gameData.daycare;
}

function setDaycareBreeders(index1, index2) {
	gameData.daycare.breeders = [index1, index2];
	saveGameData();
}

function getDaycareBreeders() {
	return gameData.daycare.breeders;
}

function setDaycareEggTimer(timestamp) {
	gameData.daycare.eggTimer = timestamp;
	// When explicitly setting a new timer, clear any stored manual pause time
	if (timestamp !== null) {
		gameData.daycare.remainingTime = null;
	}
	saveGameData();
}

function getDaycareEggTimer() {
	return gameData.daycare.eggTimer;
}

function clearDaycareBreeders() {
	gameData.daycare.breeders = [null, null];
	gameData.daycare.eggTimer = null;
	gameData.daycare.remainingTime = null;
	saveGameData();
}

// Daycare egg management
function getDaycareEggs() {
	return gameData.daycare.eggs || [];
}

function addDaycareEgg(egg) {
	if (!gameData.daycare.eggs) {
		gameData.daycare.eggs = [];
	}
	gameData.daycare.eggs.push(egg);
	saveGameData();
}

function removeDaycareEgg(index) {
	if (gameData.daycare.eggs && gameData.daycare.eggs[index]) {
		gameData.daycare.eggs.splice(index, 1);
		saveGameData();
	}
}

function getDaycareEggCount() {
	return gameData.daycare.eggs ? gameData.daycare.eggs.length : 0;
}

// Export save as base64 encoded file
function exportSave() {
	try {
		const saveData = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			saveData[key] = localStorage.getItem(key);
		}
		
		const exportData = {
			version: '1.0',
			timestamp: Date.now(),
			data: saveData
		};
		
		const jsonString = JSON.stringify(exportData);
		const base64 = btoa(unescape(encodeURIComponent(jsonString)));
		
		const blob = new Blob([base64], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `fourisland_save_${Date.now()}.fis`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		
		alert('Save exported!');
	} catch (error) {
		console.error('Export error:', error);
		alert('Failed to export save.');
	}
}

// Import save from base64 file
async function importSave(file) {
	try {
		const text = await file.text();
		const jsonString = decodeURIComponent(escape(atob(text)));
		const importData = JSON.parse(jsonString);
		
		if (!importData.version || !importData.data) {
			throw new Error('Invalid save file');
		}
		
		if (!confirm('This will overwrite your current save. Continue?')) {
			return;
		}

		// From this point on, we are doing a full import.
		// Block any further automatic calls to saveGameData
		// so they cannot re-save the previous in-memory state
		// over the imported one.
		importInProgress = true;

		// Avoid clobbering imported egg/shiny counters on reload.
		// The beforeunload handler would otherwise rewrite them with the current
		// in-memory (new game) values, which are typically 0.
		suppressHatchCountersFlushOnUnload = true;
		
		localStorage.clear();
		for (const [key, value] of Object.entries(importData.data)) {
			localStorage.setItem(key, value);
		}
		
		alert('Save imported! Reloading...');
		location.reload();
	} catch (error) {
		console.error('Import error:', error);
		alert('Failed to import save.');
	}
}

// Setup import/export buttons
function setupImportExport() {
	const exportBtn = document.getElementById('exportSaveBtn');
	if (exportBtn) {
		exportBtn.addEventListener('click', (e) => {
			e.preventDefault();
			exportSave();
		});
	}
	
	const importBtn = document.getElementById('importSaveBtn');
	const importFileInput = document.getElementById('importSaveFile');
	
	if (importBtn && importFileInput) {
		importBtn.addEventListener('click', (e) => {
			e.preventDefault();
			importFileInput.click();
		});
		importFileInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (file) {
				importSave(file);
			}
			e.target.value = '';
		});
	}
}

// Load game data IMMEDIATELY (not on DOMContentLoaded)
loadGameData();

// Setup import/export when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		setupImportExport();
		updateHatchCountersUI();
	});
} else {
	setupImportExport();
	updateHatchCountersUI();
}