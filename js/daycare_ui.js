// Daycare UI management

let selectedParent1 = null;
let selectedParent2 = null;
let isBreedingPaused = false; // Track pause state

// Export pause state for daycare.js to check
function isBreedingCurrentlyPaused() {
	return isBreedingPaused;
}

// Get pokemon sprite
function getDaycarePokemonSprite(pokemonId, isShiny, retro) {
	const species = pokemonDatabase.find(p => p.id === pokemonId);
	if (!species) return '../sprites/unknown.png';

	let basePath = isShiny ? species.shiny_sprite : species.sprite;
	basePath = getRetroSpritePath(basePath, retro);
	
	// Adjust path for src/ folder location
	if (basePath && !basePath.startsWith('../') && !basePath.startsWith('http')) {
		basePath = '../' + basePath;
	}
	
	return basePath;
}

// Get pokemon display name
function getDaycarePokemonName(pokemon) {
	const species = pokemonDatabase.find(p => p.id === pokemon.id);
	if (!species) return 'Unknown';

	let name = species.name;
	if (pokemon.isSquareShiny) {
		name = '⬛ ' + name;
	} else if (pokemon.isShiny) {
		name = '✨ ' + name;
	}
	if (pokemon.isAlpha) name = 'Ⓐ ' + name;

	return name;
}

// Update UI
function updateDaycareUI() {
	// Update daycare storage capacity
	document.getElementById('currentEggs').textContent = getCurrentDaycareEggCount();
	document.getElementById('maxEggs').textContent = getMaxDaycareEggs();

	// Update breeding status
	const daycare = getDaycare();
	const breedingStatusEl = document.getElementById('breedingStatus');
	
	if (daycare.breeders[0] !== null && daycare.eggTimer && !isBreedingPaused) {
		const timeRemaining = Math.max(0, daycare.eggTimer - Date.now());
		const secondsRemaining = Math.ceil(timeRemaining / 1000);
		
		if (secondsRemaining > 0) {
			breedingStatusEl.textContent = `Breeding... ${secondsRemaining}s remaining`;
			document.getElementById('breedingInfo').classList.remove('hidden');
		} else {
			breedingStatusEl.textContent = 'Egg ready to collect!';
		}
	} else if (isBreedingPaused) {
		const timeRemaining = Math.max(0, daycare.eggTimer - Date.now());
		const secondsRemaining = Math.ceil(timeRemaining / 1000);
		breedingStatusEl.textContent = `Paused... ${secondsRemaining}s remaining`;
		document.getElementById('breedingInfo').classList.remove('hidden');
	} else {
		breedingStatusEl.textContent = 'No active breeding';
		document.getElementById('breedingInfo').classList.add('hidden');
	}

	// Update time remaining
	if (daycare.eggTimer) {
		const timeRemaining = Math.max(0, daycare.eggTimer - Date.now());
		const secondsRemaining = Math.ceil(timeRemaining / 1000);
		document.getElementById('timeRemaining').textContent = `${secondsRemaining}s`;

		// Update breeding info details
		if (daycare.breeders[0] !== null && daycare.breeders[1] !== null) {
			const pokemon1 = gameData.pc[daycare.breeders[0]];
			const pokemon2 = gameData.pc[daycare.breeders[1]];

			if (pokemon1 && pokemon2) {
				// Determine female parent for egg species
				let femaleParent = pokemon1.gender === 'Female' ? pokemon1 : pokemon2;
				const femaleSpecies = pokemonDatabase.find(p => p.id === femaleParent.id);
				
				// Timer duration
				const timerDuration = getEggTimerDuration(pokemon1, pokemon2);
				document.getElementById('timerDuration').textContent = `${Math.round(timerDuration / 1000)}s`;

				// Egg species (from female parent)
				if (femaleSpecies) {
					document.getElementById('eggSpecies').textContent = femaleSpecies.name;
				}

				// Genetics preview
				const geneticsPreview = document.getElementById('geneticsPreview');
				geneticsPreview.innerHTML = `
					<li>Shiny: ${pokemon1.isShiny && pokemon2.isShiny ? '✓ Both' : pokemon1.isShiny || pokemon2.isShiny ? '◐ One' : '✗ None'}</li>
					<li>Alpha: ${pokemon1.isAlpha && pokemon2.isAlpha ? '✓ Both' : pokemon1.isAlpha || pokemon2.isAlpha ? '◐ One' : '✗ None'}</li>
					<li>Nature: ${pokemon1.nature === pokemon2.nature ? '✓ ' + pokemon1.nature : '◐ Mixed'}</li>
					<li>IVs: 3+ inherited</li>
				`;
			}
		}
	}

	// Update start breeding button
	const canStart = daycare.breeders[0] !== null && daycare.breeders[1] !== null;
	const startBtn = document.getElementById('startBreedingBtn');
	if (startBtn) {
		const isBreeding = daycare.eggTimer !== null && !isBreedingPaused;
		
		if (isBreeding) {
			// Show "Pause" button when breeding is active
			startBtn.textContent = 'Pause';
			startBtn.disabled = false;
			startBtn.className = 'action-btn pause';
		} else if (daycare.eggTimer !== null && isBreedingPaused) {
			// Show "Resume" button when paused
			startBtn.textContent = 'Resume';
			startBtn.disabled = false;
			startBtn.className = 'action-btn';
		} else {
			// Show "Start Breeding" button when not breeding
			startBtn.textContent = 'Start Breeding';
			startBtn.disabled = !canStart;
			startBtn.className = 'action-btn';
		}
	}

	// Display parent information
	displayParentInfo(1, daycare.breeders[0]);
	displayParentInfo(2, daycare.breeders[1]);

	// Update compatibility
	updateCompatibilityStatus();
}

// Display parent pokemon info
function displayParentInfo(parentNumber, pcIndex) {
	const displayEl = document.getElementById(`parent${parentNumber}Display`);
	const emptyEl = document.getElementById(`parent${parentNumber}Empty`);
	
	if (pcIndex === null || !gameData.pc[pcIndex]) {
		displayEl.classList.add('hidden');
		if (emptyEl) emptyEl.classList.remove('hidden');
		return;
	}

	const pokemon = gameData.pc[pcIndex];
	const spriteEl = document.getElementById(`parent${parentNumber}Sprite`);
	const nameEl = document.getElementById(`parent${parentNumber}Name`);

	spriteEl.src = getDaycarePokemonSprite(pokemon.id, pokemon.isShiny, pokemon.retro);
	nameEl.textContent = getDaycarePokemonName(pokemon);
	
	// Apply visual effects for shiny/alpha
	displayEl.classList.toggle('shiny-parent', pokemon.isShiny);
	displayEl.classList.toggle('alpha-parent', pokemon.isAlpha);
	
	displayEl.classList.remove('hidden');
	if (emptyEl) emptyEl.classList.add('hidden');
}

// Export functions for PC page
function setDaycareParent1(pcIndex) {
	setDaycareBreeders(pcIndex, getDaycareBreeders()[1]);
	updateDaycareUI();
}

function setDaycareParent2(pcIndex) {
	setDaycareBreeders(getDaycareBreeders()[0], pcIndex);
	updateDaycareUI();
}

// Update compatibility status
function updateCompatibilityStatus() {
	const statusEl = document.getElementById('compatibilityStatus');
	const daycare = getDaycare();

	if (daycare.breeders[0] === null || daycare.breeders[1] === null) {
		statusEl.textContent = 'Select two pokemon to check compatibility';
		statusEl.className = 'status-text';
		return;
	}

	const pokemon1 = gameData.pc[daycare.breeders[0]];
	const pokemon2 = gameData.pc[daycare.breeders[1]];

	if (!pokemon1 || !pokemon2) {
		statusEl.textContent = 'Invalid selection';
		statusEl.className = 'status-text error';
		return;
	}

	const compatible = areCompatible(pokemon1, pokemon2);

	if (compatible) {
		statusEl.textContent = '✓ Pokemon are compatible!';
		statusEl.className = 'status-text success';
	} else {
		let reason = 'Not compatible: ';
		
		const species1 = pokemonDatabase.find(p => p.id === pokemon1.id);
		const species2 = pokemonDatabase.find(p => p.id === pokemon2.id);

		// Check egg groups
		if (!species1.egg_group || !species2.egg_group) {
			reason += 'Missing egg group data';
		} else if (!species1.egg_group.some(g => species2.egg_group.includes(g))) {
			reason += 'Different egg groups';
		} else if (pokemon1.gender === pokemon2.gender) {
			reason += 'Must be opposite genders';
		} else if (pokemon1.gender === 'Genderless' && species1.name !== 'Ditto') {
			reason += 'Only Ditto can breed with genderless pokemon';
		} else if (pokemon2.gender === 'Genderless' && species2.name !== 'Ditto') {
			reason += 'Only Ditto can breed with genderless pokemon';
		}

		statusEl.textContent = reason;
		statusEl.className = 'status-text error';
	}
}

// Unified button handler - handles both start and pause
function handleBreedingButtonClick() {
	const daycare = getDaycare();
	const isBreeding = daycare.eggTimer !== null && !isBreedingPaused;
	
	if (isBreeding) {
		// Currently breeding - pause
		pauseDaycareBreeding();
	} else {
		// Not breeding or paused - start
		startDaycareBreeding();
	}
}

// Start breeding
function startDaycareBreeding() {
	const daycare = getDaycare();
	if (daycare.breeders[0] === null || daycare.breeders[1] === null) return;

	// Resume from pause or start new
	isBreedingPaused = false;

	// If we have a stored remaining time from a manual pause, use it
	if (daycare.remainingTime !== null && typeof daycare.remainingTime === 'number') {
		const newCompletionTime = Date.now() + Math.max(0, daycare.remainingTime);
		setDaycareEggTimer(newCompletionTime);
		daycare.remainingTime = null;
		saveGameData();
	} else if (daycare.eggTimer !== null) {
		// Legacy resume: recalculate remaining time from existing timer
		const timeRemaining = Math.max(0, daycare.eggTimer - Date.now());
		const newCompletionTime = Date.now() + timeRemaining;
		setDaycareEggTimer(newCompletionTime);
	} else {
		// Start new breeding
		const success = startBreeding(daycare.breeders[0], daycare.breeders[1]);
		if (!success) {
			alert('Could not start breeding. Check compatibility and daycare storage capacity.');
			return;
		}
	}

	updateDaycareUI();
}

// Pause breeding (preserves timer state)
function pauseDaycareBreeding() {
	const daycare = getDaycare();
	// Only compute remaining time if a timer is currently running
	if (daycare.eggTimer !== null) {
		daycare.remainingTime = Math.max(0, daycare.eggTimer - Date.now());
		// Clear the active timer so it no longer counts down
		setDaycareEggTimer(null);
	}
	isBreedingPaused = true;
	saveGameData();
	updateDaycareUI();
}

// Stop breeding (resets timer completely - called when removing a parent)
function stopDaycareBreeding() {
	isBreedingPaused = false;
	setDaycareEggTimer(null);
	const daycare = getDaycare();
	daycare.remainingTime = null;
	saveGameData();
	updateDaycareUI();
}

// Clear a parent
function clearDaycareParent(parentNumber) {
	const breeders = getDaycareBreeders();
	if (parentNumber === 1) {
		setDaycareBreeders(null, breeders[1]);
	} else {
		setDaycareBreeders(breeders[0], null);
	}
	// Stop breeding when removing a parent (resets timer)
	stopDaycareBreeding();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
	// Start/Pause breeding button - unified handler
	const startBtn = document.getElementById('startBreedingBtn');
	if (startBtn) {
		startBtn.addEventListener('click', handleBreedingButtonClick);
	}

	// Clear parent buttons
	const clearBtn1 = document.getElementById('clearParent1');
	if (clearBtn1) {
		clearBtn1.addEventListener('click', () => clearDaycareParent(1));
	}

	const clearBtn2 = document.getElementById('clearParent2');
	if (clearBtn2) {
		clearBtn2.addEventListener('click', () => clearDaycareParent(2));
	}

	// Initial UI update
	updateDaycareUI();

	// Update UI every second
	setInterval(updateDaycareUI, 1000);
});
