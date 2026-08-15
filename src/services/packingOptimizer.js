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

  // 2. Perform True 3D Multi-Tier Stacking Simulation
  // Sort rolls: Longer rolls first (7m -> 4m -> 2m), then larger diameter, then heavier
  // This guarantees heavy 7m rolls sit on the bottom tiers (Tier 1, Tier 2), and lighter 4m/2m rolls stack on top!
  const remainingRolls = [...rolls].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    if (b.diameter !== a.diameter) return b.diameter - a.diameter;
    return b.weight - a.weight;
  });

  const trucks = [];
  let truckIndex = 1;

  const truckL = targetFleet.cargo_dimensions.max_length_m;
  const truckW = targetFleet.cargo_dimensions.max_width_m;
  const truckH = targetFleet.cargo_dimensions.max_height_m;

  while (remainingRolls.length > 0) {
    const currentTruck = {
      truckNumber: truckIndex,
      fleet: targetFleet,
      loadedRolls: [],
      tiers: {}, // { 1: [rolls], 2: [rolls], 3: [rolls], ... }
      currentWeightKg: 0,
      maxTonnageKg: targetFleet.max_tonnage_kg,
      weightUtilizationPercent: 0,
      volumeUtilizationPercent: 0
    };

    let unplacedInThisTruck = [];

    // Stacking state per tier:
    // For each tier (1, 2, 3... up to max tier possible for truck height):
    // We track longitudinal lanes/bays.
    // A bay on tier T is: { startX: 0, length: 7.0, maxCols: 3, rolls: [roll1, roll2, roll3] }
    const tierBays = {}; // tier -> array of bays

    for (let r = 0; r < remainingRolls.length; r++) {
      const roll = remainingRolls[r];

      // Check truck weight limit
      if (currentTruck.currentWeightKg + roll.weight > targetFleet.max_tonnage_kg) {
        unplacedInThisTruck.push(roll);
        continue;
      }

      // Max columns that fit side-by-side across width for this roll's diameter
      const rollColsCapacity = Math.max(1, Math.floor(truckW / roll.diameter));
      // Max tier height limit based on truck height and roll logistics rule
      const maxAllowedTier = Math.min(roll.maxTier, Math.max(1, Math.floor(truckH / roll.diameter)));

      let placed = false;

      // Find lowest available tier (Tier 1, Tier 2, Tier 3...)
      for (let tier = 1; tier <= maxAllowedTier; tier++) {
        if (!tierBays[tier]) {
          tierBays[tier] = [];
        }

        const baysOnTier = tierBays[tier];

        // 1. Check if roll can fit in an existing bay on this tier with same roll length
        for (const bay of baysOnTier) {
          if (Math.abs(bay.length - roll.length) < 0.1 && bay.rolls.length < bay.maxCols) {
            const col = bay.rolls.length + 1;
            const placedRoll = {
              ...roll,
              tier: tier,
              col: col,
              maxColsOnTier: bay.maxCols,
              startX: bay.startX,
              endX: bay.startX + roll.length,
              truckNumber: truckIndex
            };
            bay.rolls.push(placedRoll);
            currentTruck.loadedRolls.push(placedRoll);
            currentTruck.currentWeightKg += roll.weight;
            placed = true;
            break;
          }
        }

        if (placed) break;

        // 2. If no existing matching bay on this tier has space, check if we can start a new bay on this tier along the truck length!
        const usedLengthOnTier = baysOnTier.reduce((sum, b) => sum + b.length, 0);
        if (usedLengthOnTier + roll.length <= truckL + 0.05) {
          const newBay = {
            startX: Math.round(usedLengthOnTier * 100) / 100,
            length: roll.length,
            maxCols: rollColsCapacity,
            rolls: []
          };

          const placedRoll = {
            ...roll,
            tier: tier,
            col: 1,
            maxColsOnTier: rollColsCapacity,
            startX: newBay.startX,
            endX: newBay.startX + roll.length,
            truckNumber: truckIndex
          };

          newBay.rolls.push(placedRoll);
          baysOnTier.push(newBay);
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

    // Group loaded rolls by tier
    const tiersMap = {};
    currentTruck.loadedRolls.forEach(r => {
      if (!tiersMap[r.tier]) tiersMap[r.tier] = [];
      tiersMap[r.tier].push(r);
    });
    currentTruck.tiers = tiersMap;

    // Calculate utilizations
    currentTruck.weightUtilizationPercent = Math.round((currentTruck.currentWeightKg / targetFleet.max_tonnage_kg) * 1000) / 10;
    
    const truckVolumeM3 = truckL * truckW * truckH;
    const cargoVolumeM3 = currentTruck.loadedRolls.reduce((sum, r) => {
      const radius = r.diameter / 2;
      return sum + (Math.PI * radius * radius * r.length);
    }, 0);
    currentTruck.volumeUtilizationPercent = Math.round((cargoVolumeM3 / truckVolumeM3) * 1000) / 10;

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
