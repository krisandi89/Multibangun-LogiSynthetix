/**
 * 3D/2D Bin-Packing and Load Optimization for Cylindrical Geosynthetic Rolls
 */

export function optimizeCargoLoading(selectedItems, availableFleets, preferredFleetId = null) {
  // 1. Flatten all requested rolls into individual roll objects
  const rolls = [];
  selectedItems.forEach(item => {
    const qty = parseInt(item.quantity, 10) || 0;
    for (let i = 0; i < qty; i++) {
      rolls.push({
        id: `${item.sku}-${i + 1}`,
        sku: item.sku,
        category: item.category,
        specification: item.specification,
        length: item.shipping_dimensions?.cylinder_length_m || 4.0,
        diameter: item.shipping_dimensions?.cylinder_diameter_m || 0.5,
        weight: item.weight_kg || 100,
        stackable: item.logistics_rules?.stackable ?? true,
        maxTier: item.logistics_rules?.max_stack_tier || 3
      });
    }
  });

  if (rolls.length === 0) {
    return {
      success: false,
      message: "Tidak ada material yang dipilih.",
      trucks: [],
      summary: null
    };
  }

  // Calculate gross totals
  const totalWeightKg = rolls.reduce((sum, r) => sum + r.weight, 0);
  const maxRollLength = Math.max(...rolls.map(r => r.length));
  const maxRollDiameter = Math.max(...rolls.map(r => r.diameter));

  // Determine candidate fleets that can physically fit the longest roll
  const validFleets = availableFleets.filter(f => f.cargo_dimensions.max_length_m >= maxRollLength);

  if (validFleets.length === 0) {
    return {
      success: false,
      message: `Panjang gulungan terpanjang (${maxRollLength}m) melebihi kapasitas panjang semua jenis armada yang tersedia.`,
      trucks: [],
      summary: { totalWeightKg, totalRolls: rolls.length, maxRollLength }
    };
  }

  // Determine target fleet
  let targetFleet = null;
  if (preferredFleetId && preferredFleetId !== 'AUTO') {
    targetFleet = availableFleets.find(f => f.fleet_id === preferredFleetId);
    if (targetFleet && targetFleet.cargo_dimensions.max_length_m < maxRollLength) {
      return {
        success: false,
        message: `Truk pilihan (${targetFleet.truck_category}) memiliki panjang bak ${targetFleet.cargo_dimensions.max_length_m}m, tidak muat untuk gulungan ${maxRollLength}m. Silakan pilih armada yang lebih besar (misal: Fuso atau Tronton).`,
        trucks: [],
        summary: { totalWeightKg, totalRolls: rolls.length, maxRollLength }
      };
    }
  }

  // If AUTO, select optimal fleet based on weight and roll length
  if (!targetFleet) {
    // Sort valid fleets from smallest to largest tonnage
    const sorted = [...validFleets].sort((a, b) => a.max_tonnage_kg - b.max_tonnage_kg);
    // Find smallest single truck that can fit all by weight, or largest if multi-truck needed
    targetFleet = sorted.find(f => f.max_tonnage_kg >= totalWeightKg) || sorted[sorted.length - 1];
  }

  // 2. Perform Realistic 3D Cylinder Roll Stacking simulation
  // Sort rolls: Longer rolls first (7m -> 4m -> 2m), then larger diameter, then heavier
  const remainingRolls = [...rolls].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    if (b.diameter !== a.diameter) return b.diameter - a.diameter;
    return b.weight - a.weight;
  });

  const trucks = [];
  let truckIndex = 1;

  while (remainingRolls.length > 0) {
    const truckL = targetFleet.cargo_dimensions.max_length_m;
    const truckW = targetFleet.cargo_dimensions.max_width_m;
    const truckH = targetFleet.cargo_dimensions.max_height_m;

    const currentTruck = {
      truckNumber: truckIndex,
      fleet: targetFleet,
      loadedRolls: [],
      tiers: {}, // { 1: [rolls], 2: [rolls], 3: [rolls] }
      currentWeightKg: 0,
      maxTonnageKg: targetFleet.max_tonnage_kg,
      weightUtilizationPercent: 0,
      volumeUtilizationPercent: 0
    };

    let unplacedInThisTruck = [];

    // Stacking grid simulation:
    // We maintain positions in tiers (Tier 1 on floor, Tier 2 on top of Tier 1, etc.)
    // Along truck length, we can have longitudinal lanes (e.g. 7m roll takes 0m-7m; or two 4m rolls take 0-4m and 4-8m).
    
    // We will organize packing into longitudinal segments (bays) along the bed length
    // For each segment [startX, endX]:
    // - Calculate how many rolls fit across width W (maxCols = Math.floor(truckW / diameter))
    // - Calculate how many tiers fit across height H (maxTiers = Math.min(maxTierRule, Math.floor(truckH / diameter)))

    // Group rolls by length for systematic layer/bay placement
    for (let r = 0; r < remainingRolls.length; r++) {
      const roll = remainingRolls[r];

      // Check weight limit
      if (currentTruck.currentWeightKg + roll.weight > targetFleet.max_tonnage_kg) {
        unplacedInThisTruck.push(roll);
        continue;
      }

      // Check if this roll fits in the current truck bed
      // Determine max columns across truck width
      const maxCols = Math.max(1, Math.floor(truckW / roll.diameter));
      const maxTiers = Math.min(roll.maxTier, Math.max(1, Math.floor(truckH / roll.diameter)));

      // Find available slot (tier, column, startX)
      let placed = false;

      // Check tier by tier (Tier 1 first, then Tier 2, Tier 3...)
      for (let tier = 1; tier <= maxTiers; tier++) {
        if (placed) break;

        const rollsOnTier = currentTruck.loadedRolls.filter(lr => lr.tier === tier);
        
        // Find existing lane with same length or check space along bed length
        // Determine possible startX positions along truck length: 0, or after previous rolls on this tier
        let startX = 0;
        let col = 1;

        // Count how many rolls already exist on this tier at startX = 0
        const rollsAtFront = rollsOnTier.filter(lr => lr.startX === 0);
        if (rollsAtFront.length < maxCols) {
          // Can place at startX = 0 in next column!
          startX = 0;
          col = rollsAtFront.length + 1;
        } else {
          // If front is full, check if remaining bed length allows a 2nd longitudinal bay
          const maxFrontLength = Math.max(...rollsAtFront.map(lr => lr.length));
          const nextStartX = maxFrontLength + 0.1; // 10cm safety gap

          if (nextStartX + roll.length <= truckL + 0.05) {
            const rollsAtBack = rollsOnTier.filter(lr => lr.startX >= nextStartX - 0.2);
            if (rollsAtBack.length < maxCols) {
              startX = nextStartX;
              col = rollsAtBack.length + 1;
            }
          }
        }

        // If we found a valid slot on this tier
        if (col <= maxCols && startX + roll.length <= truckL + 0.05) {
          const placedRoll = {
            ...roll,
            tier: tier,
            col: col,
            maxColsOnTier: maxCols,
            startX: Math.round(startX * 100) / 100,
            endX: Math.round((startX + roll.length) * 100) / 100,
            truckNumber: truckIndex
          };

          currentTruck.loadedRolls.push(placedRoll);
          currentTruck.currentWeightKg += roll.weight;
          placed = true;
          break;
        }
      }

      if (!placed) {
        unplacedInThisTruck.push(roll);
      }
    }

    // Calculate utilizations
    currentTruck.weightUtilizationPercent = Math.round((currentTruck.currentWeightKg / targetFleet.max_tonnage_kg) * 1000) / 10;
    
    // Volume approx
    const truckVolumeM3 = truckL * truckW * truckH;
    const cargoVolumeM3 = currentTruck.loadedRolls.reduce((sum, r) => {
      const radius = r.diameter / 2;
      return sum + (Math.PI * radius * radius * r.length);
    }, 0);
    currentTruck.volumeUtilizationPercent = Math.round((cargoVolumeM3 / truckVolumeM3) * 1000) / 10;

    // Group loaded rolls by tier for fast visualization
    const tiersMap = {};
    currentTruck.loadedRolls.forEach(r => {
      if (!tiersMap[r.tier]) tiersMap[r.tier] = [];
      tiersMap[r.tier].push(r);
    });
    currentTruck.tiers = tiersMap;

    trucks.push(currentTruck);

    // If no rolls were placed in this pass, break to avoid infinite loop
    if (currentTruck.loadedRolls.length === 0) {
      console.error("Packing error: Unable to fit roll into fresh truck", remainingRolls[0]);
      break;
    }

    remainingRolls.length = 0;
    remainingRolls.push(...unplacedInThisTruck);
    truckIndex++;

    if (truckIndex > 50) break; // Safety cutoff
  }

  // Summary aggregation
  const totalTrucksCount = trucks.length;
  const skuBreakdown = {};
  rolls.forEach(r => {
    skuBreakdown[r.sku] = (skuBreakdown[r.sku] || 0) + 1;
  });

  return {
    success: true,
    targetFleet,
    totalTrucksCount,
    trucks,
    summary: {
      totalRolls: rolls.length,
      totalWeightKg,
      maxRollLength,
      skuBreakdown
    }
  };
}
