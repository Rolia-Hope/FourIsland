function getPokemonWithEggs() {
	return pokemonDatabase.filter(pokemon => pokemon.egg_sprite);
}

let eggSource = 'shelter'; // Default to shelter

const LAST_ACTIVE_KEY = 'lastActiveTime';

function initializeEggSource() {
	const stored = localStorage.getItem('eggSource');
	if (stored === 'daycare' || stored === 'shelter') {
		eggSource = stored;
	} else {
		eggSource = 'shelter';
		localStorage.setItem('eggSource', 'shelter');
	}
}

function saveEggSource(source) {
	if (source === 'daycare' || source === 'shelter') {
		eggSource = source;
		localStorage.setItem('eggSource', source);
	}
}

function recordLastActiveTime() {
	localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

function getAverageStepsPerTick() {
	if (typeof getEggStepsPerTick === 'function') {
		const range = getEggStepsPerTick();
		return Math.floor((range.min + range.max) / 2);
	}
	return Math.floor((BALANCE.EGG_STEPS_PER_TICK_MIN + BALANCE.EGG_STEPS_PER_TICK_MAX) / 2);
}

function getWeightedRandomPokemon() {
	const pokemonWithEggs = getPokemonWithEggs();

	// Filter to only Pokemon with defined rarities in RARITY_WEIGHTS
	const validPokemon = pokemonWithEggs.filter(pokemon => 
		pokemon.rarity in BALANCE.RARITY_WEIGHTS
	);

	if (validPokemon.length === 0) {
		return null; // No valid Pokemon available
	}

	// Calculate total weight
	let totalWeight = 0;
	validPokemon.forEach(pokemon => {
		totalWeight += BALANCE.RARITY_WEIGHTS[pokemon.rarity];
	});

	// Select a random Pokemon based on weight
	let random = Math.random() * totalWeight;
	for (let pokemon of validPokemon) {
		random -= BALANCE.RARITY_WEIGHTS[pokemon.rarity];
		if (random <= 0) {
			return pokemon;
		}
	}

	// Fallback to first valid Pokemon
	return validPokemon[0];
}

function addEggToIncubator() {
	const incubatorEggs = getIncubatorEggs();

	// If incubator is full (6 eggs), don't add more
	if (incubatorEggs.length >= 6) {
		return false;
	}

	// Check which source to use
	if (eggSource === 'daycare') {
		// Get egg from daycare
		const daycareEggs = getDaycareEggs();
		if (!daycareEggs || daycareEggs.length === 0) {
			alert('No eggs available in the daycare!');
			return false;
		}

		// Move the first egg from daycare to incubator
		const egg = daycareEggs[0];
		// Create a copy of the egg and reset steps for incubator
		const incubatorEgg = {
			id: egg.id,
			steps: 0,
			isShiny: egg.isShiny,
			isAlpha: egg.isAlpha,
			ivs: egg.ivs,
			nature: egg.nature,
			gender: egg.gender,
			retro: egg.retro
		};
		incubatorEggs.push(incubatorEgg);
		removeDaycareEgg(0);
		saveGameData();
		renderIncubator();
		return true;
	} else if (eggSource === 'shelter') {
		// Generate random egg from shelter (original behavior)
		const randomPokemon = getWeightedRandomPokemon();
		
		if (!randomPokemon) {
			return false;
		}
		
		// Create egg object with all genetics pre-determined
		const eggObject = {
			id: randomPokemon.id,
			steps: 0,
			isShiny: generateShiny(),
			isAlpha: generateAlpha(),
			ivs: generateIVs(),
			nature: generateNature(),
			gender: generateGender(randomPokemon.gender_rate),
			retro: selectRetroSprite(randomPokemon.gen)
		};
		
		incubatorEggs.push(eggObject);
		saveGameData();
		renderIncubator();
		
		return true;
	}

	return false;
}

function fillIncubator() {
	const pokemonWithEggs = getPokemonWithEggs();
	const incubatorEggs = getIncubatorEggs();
	incubatorEggs.length = 0; // Clear array

	// Select 6 random unique Pokemon with eggs
	const selectedIndices = new Set();
	while (selectedIndices.size < 6) {
		selectedIndices.add(Math.floor(Math.random() * pokemonWithEggs.length));
	}

	// Extract their IDs and create egg objects with genetics
	selectedIndices.forEach(index => {
		const pokemon = pokemonWithEggs[index];
		incubatorEggs.push({
			id: pokemon.id,
			steps: 0,
			isShiny: generateShiny(),
			isAlpha: generateAlpha(),
			ivs: generateIVs(),
			nature: generateNature(),
			gender: generateGender(pokemon.gender_rate),
			retro: selectRetroSprite(pokemon.gen)
		});
	});

	// Save to local storage
	saveGameData();
	renderIncubator();

	return incubatorEggs;
}

function getPokemonById(pokemonId) {
	return pokemonDatabase.find(p => p.id === pokemonId);
}

function getEggSpriteById(pokemonId) {
	const pokemon = getPokemonById(pokemonId);
	return pokemon ? pokemon.egg_sprite : null;
}

function getEggStepsById(pokemonId) {
	const pokemon = getPokemonById(pokemonId);
	return pokemon ? pokemon.egg_steps : null;
}

function getRandomStepsPerTick() {
	// Check if store functions are available (they might not be on index.html)
	if (typeof getEggStepsPerTick === 'function') {
		const range = getEggStepsPerTick();
		return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
	}
	// Fallback to base values
	return Math.floor(Math.random() * (BALANCE.EGG_STEPS_PER_TICK_MAX - BALANCE.EGG_STEPS_PER_TICK_MIN + 1)) + BALANCE.EGG_STEPS_PER_TICK_MIN;
}

function addStepsToEgg(eggIndex, steps) {
	if (steps === undefined) {
		steps = getRandomStepsPerTick();
	}
	const incubatorEggs = getIncubatorEggs();

	if (eggIndex >= incubatorEggs.length) {
		return null;
	}

	const egg = incubatorEggs[eggIndex];
	const pokemon = getPokemonById(egg.id);

	if (!pokemon) {
		return null;
	}

	// Add steps
	egg.steps += steps;

	// Check if egg should hatch
	if (egg.steps >= pokemon.egg_steps) {
		return hatchEgg(eggIndex);
	}

	// Save updated incubator
	saveGameData();
	renderIncubator();

	return egg;
}

function hatchEggSilent(eggIndex) {
	const incubatorEggs = getIncubatorEggs();

	if (eggIndex >= incubatorEggs.length) {
		return null;
	}

	const egg = incubatorEggs[eggIndex];
	const basePokemon = getPokemonById(egg.id);

	if (!basePokemon) {
		return null;
	}

	const hatchedPokemon = createHatchedPokemon(egg);
	if (typeof recordEggHatchedBulk === 'function') {
		recordEggHatchedBulk(1, hatchedPokemon && hatchedPokemon.isShiny ? 1 : 0);
	} else if (typeof recordEggHatched === 'function') {
		recordEggHatched(!!(hatchedPokemon && hatchedPokemon.isShiny));
	}

	const matchesFilters = typeof checkPokemonAgainstFilters !== 'undefined' ? checkPokemonAgainstFilters(hatchedPokemon) : true;
	if (matchesFilters) {
		addPokemonToPC(hatchedPokemon);
	}

	if (Math.floor(Math.random() * BALANCE.RARE_CANDY_CHANCE) === 0) {
		addRareCandy(1);
	}

	addPokedollars(1);

	incubatorEggs.splice(eggIndex, 1);

	return hatchedPokemon;
}

function addStepsToEggSilent(eggIndex, steps) {
	const incubatorEggs = getIncubatorEggs();

	if (eggIndex >= incubatorEggs.length) {
		return null;
	}

	const egg = incubatorEggs[eggIndex];
	const pokemon = getPokemonById(egg.id);

	if (!pokemon) {
		return null;
	}

	egg.steps += steps;

	if (egg.steps >= pokemon.egg_steps) {
		return hatchEggSilent(eggIndex);
	}

	return egg;
}

function applyOfflineEggProgress() {
	if (typeof isPaused === 'function' && isPaused()) {
		return;
	}

	const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY), 10);
	if (!lastActive) {
		return;
	}

	const elapsedMs = Date.now() - lastActive;
	if (elapsedMs <= 0) {
		return;
	}

	const interval = typeof getTickInterval === 'function' ? getTickInterval() : BALANCE.TICK_INTERVAL;
	const ticks = Math.floor(elapsedMs / interval);
	if (ticks <= 0) {
		return;
	}

	const totalSteps = getAverageStepsPerTick() * ticks;
	const incubatorEggs = getIncubatorEggs();

	for (let i = incubatorEggs.length - 1; i >= 0; i--) {
		addStepsToEggSilent(i, totalSteps);
	}

	saveGameData();
	renderIncubator();
}


// Generate IVs (6 stats: HP, ATK, DEF, SP.ATK, SP.DEF, SPD)
function generateIVs() {
	return {
		hp: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		atk: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		def: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		spAtk: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		spDef: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		spd: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
	};
}

// Generate random nature
function generateNature() {
	return BALANCE.NATURES[Math.floor(Math.random() * BALANCE.NATURES.length)];
}

// Determine gender based on gender_rate
function generateGender(genderRate) {
	if (genderRate === "-") return "-";
	if (genderRate === 0) return "Female";
	if (genderRate === 100) return "Male";
	
	const random = Math.random() * 100;
	return random < genderRate ? "Male" : "Female";
}

// Check if Pokemon is shiny
function generateShiny() {
	return Math.floor(Math.random() * BALANCE.SHINY_ODDS) === 0;
}

// Check if Pokemon is alpha
function generateAlpha() {
	return Math.floor(Math.random() * BALANCE.ALPHA_ODDS) === 0;
}

// Create a hatched Pokemon with all stats
function createHatchedPokemon(egg) {
	const basePokemon = getPokemonById(egg.id);
	
	if (!basePokemon) return null;

	// Determine Square Shiny: 1/16 chance for shiny eggs
	const isSquareShiny = egg.isShiny && Math.floor(Math.random() * 16) === 0;

	// Use genetics stored in the egg - only store essential data
	const hatchedPokemon = {
		id: basePokemon.id,
		isShiny: egg.isShiny,
		isSquareShiny: isSquareShiny,
		isAlpha: egg.isAlpha,
		ivs: egg.ivs,
		nature: egg.nature,
		gender: egg.gender,
		retro: egg.retro || 'base',
		captureTime: new Date().toISOString(),
	};

	return hatchedPokemon;
}

// Add Pokemon to PC in the first available null spot
function addPokemonToPC(pokemon) {
	if (!pokemon) return false;
	
	const pc = getPC();
	
	// Find first null spot
	const firstNullIndex = pc.findIndex(slot => slot === null);
	
	if (firstNullIndex === -1) {
		return false;
	}
	
	pc[firstNullIndex] = pokemon;
	saveGameData();
	
	return true;
}

// Hatch an egg and add the Pokemon to PC
function hatchEgg(eggIndex) {
	const incubatorEggs = getIncubatorEggs();

	if (eggIndex >= incubatorEggs.length) {
		return null;
	}

	const egg = incubatorEggs[eggIndex];
	const basePokemon = getPokemonById(egg.id);

	if (!basePokemon) {
		return null;
	}

	// Create the hatched Pokemon using the egg's stored genetics
	const hatchedPokemon = createHatchedPokemon(egg);
	if (typeof recordEggHatchedBulk === 'function') {
		recordEggHatchedBulk(1, hatchedPokemon && hatchedPokemon.isShiny ? 1 : 0);
	} else if (typeof recordEggHatched === 'function') {
		recordEggHatched(!!(hatchedPokemon && hatchedPokemon.isShiny));
	}
	
	// Check if Pokemon matches any active filters
	// Note: checkPokemonAgainstFilters is defined in filters.js
	const matchesFilters = typeof checkPokemonAgainstFilters !== 'undefined' ? checkPokemonAgainstFilters(hatchedPokemon) : true;

	// Add to PC only if it matches filters
	if (matchesFilters) {
		addPokemonToPC(hatchedPokemon);
	}

	// Award rare candy on hatch (chance-based, awarded regardless of filter)
	if (Math.floor(Math.random() * BALANCE.RARE_CANDY_CHANCE) === 0) {
		addRareCandy(1);
	}

	// Award pokedollars on hatch
	addPokedollars(1);

	// Remove egg from incubator
	incubatorEggs.splice(eggIndex, 1);
	saveGameData();

	renderIncubator();

	return hatchedPokemon;
}

// Egg tick - adds steps to all eggs
function eggTick() {
	const incubatorEggs = getIncubatorEggs();

	// Iterate backwards to safely remove hatched eggs
	for (let i = incubatorEggs.length - 1; i >= 0; i--) {
		addStepsToEgg(i, getRandomStepsPerTick());
	}
}

// Render the incubator with eggs
function renderIncubator() {
	const incubatorEggs = getIncubatorEggs();
	const eggSlots = document.querySelectorAll('.egg-slot');

	eggSlots.forEach((slot, index) => {
		slot.innerHTML = '';

		if (index < incubatorEggs.length) {
			const egg = incubatorEggs[index];
			const pokemon = getPokemonById(egg.id);

			if (pokemon) {
				const eggContainer = document.createElement('div');
				eggContainer.className = 'egg-container';

				const eggImage = document.createElement('img');
				eggImage.src = pokemon.egg_sprite;
				eggImage.alt = `${pokemon.name} egg`;
				eggImage.className = 'egg-image';

				const eggInfo = document.createElement('div');
				eggInfo.className = 'egg-info';

				// Calculate progress percentage
				const progressPercentage = Math.min((egg.steps / pokemon.egg_steps) * 100, 100);

				eggInfo.innerHTML = `
					<p class="pokemon-name">${pokemon.name}</p>
					<p class="egg-progress">${egg.steps} / ${pokemon.egg_steps} steps</p>
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${progressPercentage}%"></div>
					</div>
				`;

				eggContainer.appendChild(eggImage);
				eggContainer.appendChild(eggInfo);
				slot.appendChild(eggContainer);
			}
		} else {
			// Empty slot
			const emptySlot = document.createElement('div');
			emptySlot.className = 'empty-egg-slot';
			emptySlot.innerHTML = '<p>Empty</p>';
			slot.appendChild(emptySlot);
		}
	});
}

// Clear the incubator
function clearIncubator() {
	localStorage.removeItem('incubator');
	renderIncubator();
}

// Game state
let gameState = {
	isPaused: false,
	incubatorCheckInterval: null,
	eggTickInterval: null,
};

// Toggle pause/resume
function togglePause() {
	gameState.isPaused = !gameState.isPaused;
	const pauseButton = document.querySelector('.pause');

	if (gameState.isPaused) {
		// Pause the game
		clearInterval(gameState.incubatorCheckInterval);
		clearInterval(gameState.eggTickInterval);
		pauseButton.textContent = 'Resume';
		pauseButton.classList.add('paused');
	} else {
		// Resume the game
		startIncubatorCheck();
		startEggTicks();
		pauseButton.textContent = 'Pause';
		pauseButton.classList.remove('paused');
	}

	// Persist pause state
	setPaused(gameState.isPaused);
}

// Check for missing eggs and fill empty slots
function checkAndFillIncubator() {
	const incubatorEggs = getIncubatorEggs();

	// Only auto-fill in shelter mode
	if (eggSource === 'shelter') {
		// Fill all empty slots
		while (incubatorEggs.length < 6) {
			const success = addEggToIncubator();
			if (!success) {
				break;
			}
		}
	}
}

// Start the constant check for missing eggs
function startIncubatorCheck() {
	// Check every 1 second (1000ms)
	gameState.incubatorCheckInterval = setInterval(checkAndFillIncubator, 1000);
}

// Start the egg hatching ticks
function startEggTicks() {
	const interval = typeof getTickInterval === 'function' ? getTickInterval() : BALANCE.TICK_INTERVAL;
	gameState.eggTickInterval = setInterval(eggTick, interval);
}

// Initialize incubator on page load
document.addEventListener('DOMContentLoaded', () => {
	// Initialize egg source first
	initializeEggSource();

	// Apply offline progress before rendering
	if (typeof applyOfflineDaycareProgress === 'function') {
		applyOfflineDaycareProgress();
	}
	applyOfflineEggProgress();
	recordLastActiveTime();
	
	renderIncubator();

	// Restore pause state from localStorage
	if (isPaused()) {
		gameState.isPaused = true;
		const pauseButton = document.querySelector('.pause');
		pauseButton.textContent = 'Resume';
		pauseButton.classList.add('paused');
	} else {
		startIncubatorCheck();
		startEggTicks();
	}

	// Add pause button listener
	const pauseButton = document.querySelector('.pause');
	if (pauseButton) {
		pauseButton.addEventListener('click', togglePause);
	}

	// Add egg source selector listener
	const eggSourceSelector = document.getElementById('eggSource');
	if (eggSourceSelector) {
		// Restore saved egg source
		eggSourceSelector.value = eggSource;
		
		// Save when changed
		eggSourceSelector.addEventListener('change', (e) => {
			saveEggSource(e.target.value);
		});
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			recordLastActiveTime();
		} else {
			if (typeof applyOfflineDaycareProgress === 'function') {
				applyOfflineDaycareProgress();
			}
			applyOfflineEggProgress();
			recordLastActiveTime();
		}
	});

	window.addEventListener('beforeunload', recordLastActiveTime);
});
