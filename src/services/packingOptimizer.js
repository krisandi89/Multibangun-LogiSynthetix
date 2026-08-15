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

  // 2. Perform Bin-Packing simulation across 1 or more trucks of targetFleet
  const trucks = [];
  // Sort rolls: heavier/larger first (Geomembrane -> Geotextile -> Geogrid)
  const remainingRolls = [...rolls].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    if (b.diameter !== a.diameter) return b.diameter - a.diameter;
    return b.weight - a.weight;
  });

  let truckIndex = 1;

  while (remainingRolls.length > 0) {
    const currentTruck = {
      truckNumber: truckIndex,
      fleet: targetFleet,
      loadedRolls: [],
      bays: [], // longitudinal segments along truck length
      currentWeightKg: 0,
      maxTonnageKg: targetFleet.max_tonnage_kg,
      weightUtilizationPercent: 0,
      volumeUtilizationPercent: 0,
      crossSectionLayout: []
    };

    const truckL = targetFleet.cargo_dimensions.max_length_m;
    const truckW = targetFleet.cargo_dimensions.max_width_m;
    const truckH = targetFleet.cargo_dimensions.max_height_m;

    let unplacedInThisTruck = [];

    // Track occupied bays along length [ { startX: 0, length: 7.0, rolls: [...] } ]
    let currentX = 0;

    for (let r = 0; r < remainingRolls.length; r++) {
      const roll = remainingRolls[r];

      // Check weight limit
      if (currentTruck.currentWeightKg + roll.weight > targetFleet.max_tonnage_kg) {
        unplacedInThisTruck.push(roll);
        continue;
      }

      // Check spatial packing inside truck
      // Find existing bay with same roll length or create new bay along truck length
      let placed = false;

      // Check if roll can fit in any existing bay
      for (const bay of currentTruck.bays) {
        if (bay.rollLength >= roll.length) {
          // Check if bay has space across width & height
          const maxPerRow = Math.floor(truckW / roll.diameter);
          const maxTiers = Math.min(roll.maxTier, Math.floor(truckH / roll.diameter));
          const maxBayCapacity = maxPerRow * maxTiers;

          if (bay.rolls.length < maxBayCapacity) {
            // Determine tier and column position
            const rollIdx = bay.rolls.length;
            const tierIndex = Math.floor(rollIdx / maxPerRow);
            const colIndex = rollIdx % maxPerRow;

            bay.rolls.push({
              ...roll,
              bayIndex: bay.bayIndex,
              tierIndex: tierIndex + 1,
              colIndex: colIndex + 1,
              posX: bay.startX,
              posY: colIndex * roll.diameter,
              posZ: tierIndex * roll.diameter
            });

            currentTruck.loadedRolls.push(bay.rolls[bay.rolls.length - 1]);
            currentTruck.currentWeightKg += roll.weight;
            placed = true;
            break;
          }
        }
      }

      // If not placed in existing bay, try to create a new bay if truck length permits
      if (!placed) {
        const usedLength = currentTruck.bays.reduce((sum, b) => sum + b.rollLength, 0);
        if (usedLength + roll.length <= truckL + 0.1) { // 10cm tolerance
          const newBayIndex = currentTruck.bays.length;
          const maxPerRow = Math.floor(truckW / roll.diameter);
          const maxTiers = Math.min(roll.maxTier, Math.floor(truckH / roll.diameter));

          const newBay = {
            bayIndex: newBayIndex + 1,
            startX: usedLength,
            rollLength: roll.length,
            maxPerRow,
            maxTiers,
            rolls: []
          };

          newBay.rolls.push({
            ...roll,
            bayIndex: newBay.bayIndex,
            tierIndex: 1,
            colIndex: 1,
            posX: usedLength,
            posY: 0,
            posZ: 0
          });

          currentTruck.bays.push(newBay);
          currentTruck.loadedRolls.push(newBay.rolls[0]);
          currentTruck.currentWeightKg += roll.weight;
          placed = true;
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
