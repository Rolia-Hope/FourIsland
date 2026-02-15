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

// ---------- Genetics odds helpers ----------

function formatOdds(probability) {
	if (!(probability > 0)) {
		return '—';
	}
	if (probability >= 1) {
		return '1 in 1 (100%)';
	}
	const denom = Math.round(1 / probability);
	return `1 in ${denom.toLocaleString()}`;
}

function computeShinyOddsText(parent1, parent2) {
	if (!BALANCE || !DAYCARE_BALANCE || !DAYCARE_BALANCE.GENETICS_MULTIPLIERS) return 'Shiny: —';

	let multiplier = 1;
	const shinyConfig = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.shiny;
	const baseOdds = BALANCE.SHINY_ODDS;

	if (shinyConfig && shinyConfig.enabled) {
		const shinyParents = (parent1.isShiny ? 1 : 0) + (parent2.isShiny ? 1 : 0);
		if (shinyParents === 1) {
			multiplier = shinyConfig.one || 1;
		} else if (shinyParents === 2) {
			multiplier = shinyConfig.two || 1;
		}
	}

	let p = (1 / baseOdds) * multiplier;
	if (p > 1) p = 1;
	const oddsStr = formatOdds(p);

	return `Shiny: ${oddsStr}`;
}

function computeAlphaOddsText(parent1, parent2) {
	if (!BALANCE || !DAYCARE_BALANCE || !DAYCARE_BALANCE.GENETICS_MULTIPLIERS) return 'Alpha: —';

	let multiplier = 1;
	const alphaConfig = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.alpha;
	const baseOdds = BALANCE.ALPHA_ODDS;

	if (alphaConfig && alphaConfig.enabled) {
		const alphaParents = (parent1.isAlpha ? 1 : 0) + (parent2.isAlpha ? 1 : 0);
		if (alphaParents === 1) {
			multiplier = alphaConfig.one || 1;
		} else if (alphaParents === 2) {
			multiplier = alphaConfig.two || 1;
		}
	}

	let p = (1 / baseOdds) * multiplier;
	if (p > 1) p = 1;
	const oddsStr = formatOdds(p);

	return `Alpha: ${oddsStr}`;
}

function computeNatureText(parent1, parent2) {
	const natureConfig = DAYCARE_BALANCE && DAYCARE_BALANCE.GENETICS_MULTIPLIERS && DAYCARE_BALANCE.GENETICS_MULTIPLIERS.nature;
	if (!natureConfig || !natureConfig.enabled) {
		return 'Nature: random';
	}

	if (parent1.nature && parent1.nature === parent2.nature) {
		const chance = natureConfig.matchChance;
		return `Nature: ${chance}% ${parent1.nature}, otherwise random`;
	}

	return 'Nature: random (mixed parents)';
}

// Compute retro odds for any retro sprites present on the parents.
// This uses the same multipliers as breeding logic but approximates
// the final probability as baseOdds * multiplier for that specific
// retro (which is very close in practice).
function computeRetroOddsLines(parent1, parent2, eggSpecies) {
	// RETRO_SPRITES is defined as a global const in retro.js, but
	// not attached to window. Use typeof check instead of window.*.
	if (typeof RETRO_SPRITES === 'undefined' || !eggSpecies) return [];

	const retroConfig = DAYCARE_BALANCE && DAYCARE_BALANCE.GENETICS_MULTIPLIERS && DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro;
	const enabled = !!(retroConfig && retroConfig.enabled);

	const parentRetros = new Set();
	if (parent1.retro && parent1.retro !== 'base') parentRetros.add(parent1.retro);
	if (parent2.retro && parent2.retro !== 'base') parentRetros.add(parent2.retro);

	const lines = [];

	if (parentRetros.size === 0) {
		// No parent retro; base odds still exist but not specific to these parents.
		lines.push('Retro: base odds (no parent retro)');
		return lines;
	}

	parentRetros.forEach(retroName => {
		const retro = RETRO_SPRITES[retroName];
		if (!retro) return;
		if (eggSpecies.gen > retro.maxGen) return;

		let multiplier = 1;
		if (enabled) {
			let count = 0;
			if (parent1.retro === retroName) count++;
			if (parent2.retro === retroName) count++;
			if (count === 1) {
				multiplier = retroConfig.one || 1;
			} else if (count === 2) {
				multiplier = retroConfig.two || 1;
			}
		}

		let p = (1 / retro.probability) * multiplier;
		if (p > 1) p = 1;
		const oddsStr = formatOdds(p);
		const displayName = getRetroDisplayName(retroName);
		lines.push(`Retro (${displayName}): ${oddsStr}`);
	});

	return lines;
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
				// Timer duration
				const timerDuration = getEggTimerDuration(pokemon1, pokemon2);
				document.getElementById('timerDuration').textContent = `${Math.round(timerDuration / 1000)}s`;

				// Egg species: reuse core breeding rule via helper
				const eggSpecies = typeof getEggSpeciesFromParents === 'function'
					? getEggSpeciesFromParents(pokemon1, pokemon2)
					: null;
				if (eggSpecies) {
					document.getElementById('eggSpecies').textContent = eggSpecies.name;
				}

				// Genetics preview with odds
				const geneticsPreview = document.getElementById('geneticsPreview');
				const shinyText = computeShinyOddsText(pokemon1, pokemon2);
				const alphaText = computeAlphaOddsText(pokemon1, pokemon2);
				const natureText = computeNatureText(pokemon1, pokemon2);
				const retroLines = computeRetroOddsLines(pokemon1, pokemon2, eggSpecies);

				let retroHtml = '';
				if (retroLines.length === 0) {
					retroHtml = '<li>Retro: —</li>';
				} else {
					retroHtml = retroLines.map(line => `<li>${line}</li>`).join('');
				}

				geneticsPreview.innerHTML = `
					<li>${shinyText}</li>
					<li>${alphaText}</li>
					<li>${natureText}</li>
					<li>IVs: 3+ inherited</li>
					${retroHtml}
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
