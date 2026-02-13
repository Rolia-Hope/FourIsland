// Debug utilities for manual testing in console

// Massive daycare egg simulation using current daycare parents.
// Does NOT modify gameData or timers – only uses the same
// generation logic as the live daycare system.
//
// Usage from browser console, once the game is loaded:
//   simulateDaycareEggs(1_000_000)
// or:
//   simulateDaycareEggs(); // defaults to 100000
//
// It will:
//   - use the parents currently set in daycare
//   - call createBreedingEgg() for each simulated egg
//   - count shinies and retros != 'base'
//   - log summary statistics to the console
function simulateDaycareEggs(count) {
	// Default to a large but reasonable number if not provided
	if (typeof count !== 'number' || !isFinite(count) || count <= 0) {
		count = 100000;
	}

	if (typeof getDaycare !== 'function' || typeof gameData === 'undefined' || !gameData) {
		console.error('[simulateDaycareEggs] Game not fully initialized.');
		return;
	}

	const daycare = getDaycare();
	const breederIndex1 = daycare.breeders && daycare.breeders[0];
	const breederIndex2 = daycare.breeders && daycare.breeders[1];

	if (breederIndex1 == null || breederIndex2 == null) {
		console.error('[simulateDaycareEggs] No parents currently in daycare.');
		return;
	}

	const parent1 = gameData.pc[breederIndex1];
	const parent2 = gameData.pc[breederIndex2];

	if (!parent1 || !parent2) {
		console.error('[simulateDaycareEggs] One or both parent slots are empty.');
		return;
	}

	if (typeof areCompatible === 'function' && !areCompatible(parent1, parent2)) {
		console.error('[simulateDaycareEggs] Current parents are not compatible for breeding.');
		return;
	}

	if (typeof createBreedingEgg !== 'function') {
		console.error('[simulateDaycareEggs] createBreedingEgg() is not available.');
		return;
	}

	let shinyCount = 0;
	let alphaCount = 0;
	let retroNonBaseCount = 0;
	let total = 0;

	// Track distribution of retro variants for information
	const retroCounts = {};

	const startTime = performance && performance.now ? performance.now() : Date.now();

	for (let i = 0; i < count; i++) {
		const egg = createBreedingEgg(parent1, parent2);
		if (!egg) {
			continue;
		}

		total++;

		if (egg.isShiny) {
			shinyCount++;
		}

		if (egg.isAlpha) {
			alphaCount++;
		}

		const retro = egg.retro || 'base';
		if (retro !== 'base') {
			retroNonBaseCount++;
			retroCounts[retro] = (retroCounts[retro] || 0) + 1;
		}
	}

	const endTime = performance && performance.now ? performance.now() : Date.now();
	const durationMs = endTime - startTime;

	if (total === 0) {
		console.warn('[simulateDaycareEggs] No eggs were generated.');
		return;
	}

	const shinyRate = shinyCount / total;
	const alphaRate = alphaCount / total;
	const retroRate = retroNonBaseCount / total;

	console.log('===== Daycare Egg Simulation =====');
	console.log('Simulated eggs        :', total);
	console.log('Parents indices       :', breederIndex1, breederIndex2);
	console.log('Parent 1 species id   :', parent1.id, 'shiny:', !!parent1.isShiny, 'retro:', parent1.retro || 'base');
	console.log('Parent 2 species id   :', parent2.id, 'shiny:', !!parent2.isShiny, 'retro:', parent2.retro || 'base');
	console.log('Duration (ms)         :', durationMs.toFixed(2));
	console.log('Shiny eggs            :', shinyCount, `(~1 in ${(shinyRate > 0 ? (1 / shinyRate).toFixed(1) : '∞')})`);
	console.log('Alpha eggs            :', alphaCount, `(~1 in ${(alphaRate > 0 ? (1 / alphaRate).toFixed(1) : '∞')})`);
	console.log('Retro != base eggs    :', retroNonBaseCount, `(~1 in ${(retroRate > 0 ? (1 / retroRate).toFixed(1) : '∞')})`);

	if (retroNonBaseCount > 0) {
		console.log('Retro distribution (non-base only):');
		Object.keys(retroCounts).sort().forEach(key => {
			const c = retroCounts[key];
			const r = c / total;
			console.log(`  ${key}: ${c} (~1 in ${(r > 0 ? (1 / r).toFixed(1) : '∞')})`);
		});
	}

	console.log('===================================');

	return {
		count: total,
		shinyCount,
		alphaCount,
		retroNonBaseCount,
		shinyRate,
		alphaRate,
		retroRate,
		retroCounts,
		durationMs
	};
}

// Expose on window for easier access from console tools, if possible
if (typeof window !== 'undefined') {
	window.simulateDaycareEggs = simulateDaycareEggs;
}

