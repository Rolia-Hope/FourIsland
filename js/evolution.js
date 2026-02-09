function checkEvolutionConditions(pokemon, evolution) {
	if (!evolution.method) return false;

	// Check if retro sprite can cover the evolved Pokemon's generation
	const evolvedPokemon = pokemonDatabase.find(p => p.name === evolution.evolves_to);
	if (evolvedPokemon && pokemon.retro) {
		if (!canRetroSpriteCoverGen(pokemon.retro, evolvedPokemon.gen)) {
			return false;
		}
	}

	for (const method of evolution.method) {
		switch (method) {
			case 'level':
				if (getRareCandy() < evolution.value) {
					return false;
				}
				break;

			case 'gender':
				if (pokemon.gender !== evolution.value_2) {
					return false;
				}
				break;

			case 'item':
				// Items not implemented yet
				return false;

			default:
				return false;
		}
	}

	return true;
}

function getEvolutionBlockReason(pokemon, evolution) {
	if (!evolution.method) return 'Unknown condition';

	// Check retro sprite compatibility first
	const evolvedPokemon = pokemonDatabase.find(p => p.name === evolution.evolves_to);
	if (evolvedPokemon && pokemon.retro) {
		if (!canRetroSpriteCoverGen(pokemon.retro, evolvedPokemon.gen)) {
			const retroDisplayName = getRetroDisplayName(pokemon.retro);
			return `${retroDisplayName} sprite doesn't cover Gen ${evolvedPokemon.gen}`;
		}
	}

	const reasons = [];

	for (const method of evolution.method) {
		switch (method) {
			case 'level':
				if (getRareCandy() < evolution.value) {
					reasons.push(`Level ${evolution.value} (Have ${getRareCandy()} candies)`);
				}
				break;

			case 'gender':
				if (pokemon.gender !== evolution.value_2) {
					const genderMap = { 'M': 'Male', 'F': 'Female', '-': 'Genderless' };
					const currentGender = genderMap[pokemon.gender] || pokemon.gender;
					reasons.push(`Female only (You have ${currentGender})`);
				}
				break;

			case 'item':
				reasons.push('Requires item (not implemented)');
				break;
		}
	}

	return reasons.length > 0 ? reasons.join(', ') : 'Unknown';
}

function getPossibleEvolutions(pokemon) {
	const basePokemon = pokemonDatabase.find(p => p.id === pokemon.id);
	if (!basePokemon || !basePokemon.evolutions || basePokemon.evolutions.length === 0) {
		return [];
	}

	const possibleEvolutions = [];

	for (const evolution of basePokemon.evolutions) {
		// Check all conditions for this evolution
		if (checkEvolutionConditions(pokemon, evolution)) {
			possibleEvolutions.push(evolution);
		}
	}

	return possibleEvolutions;
}

function canEvolve(pokemon) {
	return getPossibleEvolutions(pokemon).length > 0;
}

function getRareCandiesNeeded(pokemon) {
	const basePokemon = pokemonDatabase.find(p => p.id === pokemon.id);
	if (!basePokemon || !basePokemon.evolutions || basePokemon.evolutions.length === 0) {
		return null;
	}

	for (const evolution of basePokemon.evolutions) {
		if (evolution.method && evolution.method.includes('level')) {
			return evolution.value;
		}
	}

	return null;
}

function evolvePokemon(pokemonIndex, evolutionName) {
	const pc = getPC();
	const pokemon = pc[pokemonIndex];

	if (!pokemon) {
		return false;
	}

	const basePokemon = pokemonDatabase.find(p => p.id === pokemon.id);
	if (!basePokemon || !basePokemon.evolutions) {
		return false;
	}

	// Find the evolution
	const evolution = basePokemon.evolutions.find(e => e.evolves_to === evolutionName);
	if (!evolution) {
		return false;
	}

	// Check rare candies
	if (!useRareCandy(evolution.value)) {
		return false;
	}

	// Find evolved Pokemon in database
	const evolvedPokemon = pokemonDatabase.find(p => p.name === evolutionName);
	if (!evolvedPokemon) {
		// Refund the candy if something goes wrong
		addRareCandy(evolution.value);
		return false;
	}

	// Update Pokemon data - only ID needs to change
	pokemon.id = evolvedPokemon.id;

	// Save changes
	saveGameData();
	return true;
}

function showEvolutionChoiceModal(pokemonIndex, pokemon, possibleEvolutions) {
	const modal = document.getElementById('evolutionModal');
	if (!modal) {
		return;
	}

	const modalContent = modal.querySelector('.evolution-options');
	modalContent.innerHTML = '<h3>Choose Evolution:</h3>';

	possibleEvolutions.forEach((evolution) => {
		const button = document.createElement('button');
		button.className = 'btn btn-primary evolution-choice-btn';
		button.textContent = evolution.evolves_to;
		button.addEventListener('click', () => {
			if (evolvePokemon(pokemonIndex, evolution.evolves_to)) {
				// Close evolution modal
				modal.style.display = 'none';
				
				// Close Pokemon details modal
				const pokemonModal = document.getElementById('pokemonModal');
				if (pokemonModal) {
					pokemonModal.style.display = 'none';
				}
				
				// Refresh PC display
				if (typeof renderPCGrid === 'function') {
					renderPCGrid();
				}
			}
		});
		modalContent.appendChild(button);
	});

	// Add cancel button
	const cancelBtn = document.createElement('button');
	cancelBtn.className = 'btn btn-secondary evolution-cancel-btn';
	cancelBtn.textContent = 'Cancel';
	cancelBtn.addEventListener('click', () => {
		modal.style.display = 'none';
	});
	modalContent.appendChild(cancelBtn);

	modal.style.display = 'block';
}

function performSingleEvolution(pokemonIndex, pokemon) {
	const possibleEvolutions = getPossibleEvolutions(pokemon);

	if (possibleEvolutions.length === 0) {
		alert('This Pokemon cannot evolve right now. Not enough rare candies.');
		return false;
	}

	// Single evolution path
	if (possibleEvolutions.length === 1) {
		if (evolvePokemon(pokemonIndex, possibleEvolutions[0].evolves_to)) {
			// Close Pokemon details modal
			const pokemonModal = document.getElementById('pokemonModal');
			if (pokemonModal) {
				pokemonModal.style.display = 'none';
			}
			
			// Refresh PC display
			if (typeof renderPCGrid === 'function') {
				renderPCGrid();
			}
			return true;
		}
		return false;
	}

	// Multiple evolutions - show choice modal
	showEvolutionChoiceModal(pokemonIndex, pokemon, possibleEvolutions);
	return true;
}
