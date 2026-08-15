import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { InputModule } from './components/InputModule';
import { RoutingModule } from './components/RoutingModule';
import { CargoBuilder } from './components/CargoBuilder';
import { TruckSelector } from './components/TruckSelector';
import { LoadVisualizer } from './components/LoadVisualizer';
import { CostEstimationCard } from './components/CostEstimationCard';
import { QuotationModal } from './components/QuotationModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { DatabaseStudio } from './components/DatabaseStudio';
import { SettingsModal } from './components/SettingsModal';

import {
  getActiveDatabase,
  saveActiveDatabase,
  resetDatabaseToDefault,
  getSavedQuotations,
  saveQuotation,
  deleteQuotation,
  getUserSettings,
  saveUserSettings
} from './services/storageService';
import { optimizeCargoLoading } from './services/packingOptimizer';
import { calculateLogisticsWithGemini } from './services/geminiService';
import { FIXED_ORIGIN } from './data/defaultDatabase';
import { Sparkles, Calculator, Layers, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  // 1. Master Database & Settings State
  const [database, setDatabase] = useState(() => getActiveDatabase());
  const [settings, setSettings] = useState(() => getUserSettings());
  const [quotations, setQuotations] = useState(() => getSavedQuotations());

  // 2. Modals Visibility State
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [quotationModalData, setQuotationModalData] = useState(null);

  // 3. Form Input State
  const [companyName, setCompanyName] = useState('PT Waskita Karya (Persero) Tbk');
  const [projectName, setProjectName] = useState('Proyek Konstruksi Tol Trans-Jawa Seksi 4');
  const [notes, setNotes] = useState('Pengiriman bertahap dengan pelindung terpal kedap air.');
  const [destination, setDestination] = useState('Semarang, Jawa Tengah');
  const [routeResult, setRouteResult] = useState({
    source: 'OSRM Road Network Routing',
    distanceKm: 472,
    durationMinutes: 360,
    durationText: '6 jam 0 mnt',
    origin: FIXED_ORIGIN,
    destination: {
      name: 'Semarang',
      address: 'Semarang, Jawa Tengah',
      lat: -6.9667,
      lng: 110.4167
    },
    routePoints: [
      [-6.23072, 106.53695],
      [-6.9667, 110.4167]
    ]
  });

  // 4. Cargo Selection State (Default sample matching Geosynthetics database)
  const [selectedItems, setSelectedItems] = useState([
    {
      sku: "GM-HDPE-10-7M",
      category: "Geomembrane",
      specification: "HDPE 1.0mm",
      shipping_dimensions: { cylinder_length_m: 7.0, cylinder_diameter_m: 0.65 },
      weight_kg: 1350,
      logistics_rules: { stackable: true, max_stack_tier: 3 },
      quantity: 6
    },
    {
      sku: "GTX-NW-250-4M",
      category: "Geotextile Non-Woven",
      specification: "250 gram",
      shipping_dimensions: { cylinder_length_m: 4.0, cylinder_diameter_m: 0.55 },
      weight_kg: 100,
      logistics_rules: { stackable: true, max_stack_tier: 5 },
      quantity: 12
    },
    {
      sku: "GM-LDPE-05-2M",
      category: "Geomembrane",
      specification: "LDPE 0.5mm",
      shipping_dimensions: { cylinder_length_m: 2.0, cylinder_diameter_m: 0.40 },
      weight_kg: 150,
      logistics_rules: { stackable: true, max_stack_tier: 5 },
      quantity: 8
    }
  ]);

  const [selectedFleetId, setSelectedFleetId] = useState('AUTO');
  const [isCalculatingAi, setIsCalculatingAi] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [estimationResult, setEstimationResult] = useState(null);

  // Maximum roll length across selected items
  const maxRollLength = useMemo(() => {
    if (!selectedItems || selectedItems.length === 0) return 0;
    return Math.max(...selectedItems.map(i => i.shipping_dimensions?.cylinder_length_m || 0));
  }, [selectedItems]);

  // Real-time Bin Packing calculation
  const packingResult = useMemo(() => {
    if (!selectedItems || selectedItems.length === 0) return null;
    return optimizeCargoLoading(selectedItems, database.logistics_fleet, selectedFleetId);
  }, [selectedItems, database.logistics_fleet, selectedFleetId]);

  // Recalculate AI Pricing
  const handleCalculateAiPricing = useCallback(async () => {
    if (!packingResult || !packingResult.success || !routeResult) return;

    setIsCalculatingAi(true);
    setIsSaved(false);

    try {
      const result = await calculateLogisticsWithGemini({
        companyName,
        destination: routeResult.destination || { name: destination, address: destination },
        distanceKm: routeResult.distanceKm,
        durationText: routeResult.durationText,
        selectedItems,
        packingResult,
        selectedFleet: packingResult.targetFleet,
        apiKey: settings.geminiApiKey
      });
      setEstimationResult(result);
    } catch (err) {
      console.error("Pricing calculation error:", err);
    } finally {
      setIsCalculatingAi(false);
    }
  }, [packingResult, routeResult, companyName, destination, selectedItems, settings.geminiApiKey]);

  // Auto trigger initial calculation when packing & route are ready
  useEffect(() => {
    if (packingResult && packingResult.success && routeResult && !estimationResult) {
      handleCalculateAiPricing();
    }
  }, [packingResult, routeResult]);

  // Re-run price calculation when key parameters change
  useEffect(() => {
    setIsSaved(false);
    if (packingResult && packingResult.success && routeResult) {
      handleCalculateAiPricing();
    }
  }, [routeResult?.distanceKm, selectedFleetId, selectedItems]);

  // Handle OCR Document extraction
  const handleOcrExtracted = (ocrData) => {
    if (!ocrData) return;
    
    if (ocrData.destination) {
      setDestination(ocrData.destination);
    }

    if (ocrData.extracted_items && ocrData.extracted_items.length > 0) {
      const newItems = [];
      ocrData.extracted_items.forEach(extracted => {
        // Match with database SKU
        const matched = database.geosynthetics.find(m => 
          m.sku.toLowerCase() === (extracted.matched_sku || '').toLowerCase() ||
          m.sku.toLowerCase().includes((extracted.detected_name || '').toLowerCase())
        ) || database.geosynthetics[0];

        if (matched) {
          newItems.push({
            sku: matched.sku,
            category: matched.category,
            specification: matched.specification,
            shipping_dimensions: { ...matched.shipping_dimensions },
            weight_kg: matched.weight_kg,
            logistics_rules: { ...matched.logistics_rules },
            quantity: Math.max(1, parseInt(extracted.quantity, 10) || 5)
          });
        }
      });

      if (newItems.length > 0) {
        setSelectedItems(newItems);
      }
    }
  };

  // Save estimation to database
  const handleSaveEstimation = () => {
    if (!estimationResult || !packingResult) return;

    const savedEntry = saveQuotation({
      companyName,
      projectName,
      notes,
      destination,
      routeResult,
      selectedItems,
      selectedFleetId,
      packingResult,
      estimationResult
    });

    if (savedEntry) {
      setQuotations(getSavedQuotations());
      setIsSaved(true);
    }
  };

  // Load saved quotation from history
  const handleLoadQuotation = (quotation) => {
    if (!quotation) return;
    if (quotation.companyName) setCompanyName(quotation.companyName);
    if (quotation.projectName) setProjectName(quotation.projectName);
    if (quotation.notes) setNotes(quotation.notes);
    if (quotation.destination) setDestination(quotation.destination);
    if (quotation.routeResult) setRouteResult(quotation.routeResult);
    if (quotation.selectedItems) setSelectedItems(quotation.selectedItems);
    if (quotation.selectedFleetId) setSelectedFleetId(quotation.selectedFleetId);
    if (quotation.estimationResult) setEstimationResult(quotation.estimationResult);
    setIsSaved(true);
  };

  // Open Quotation Slip Preview
  const handleOpenQuotationSlip = (customData = null) => {
    setQuotationModalData(customData || {
      companyName,
      projectName,
      destination,
      routeResult,
      selectedItems,
      packingResult,
      estimationResult
    });
    setIsQuotationOpen(true);
  };

  // Delete saved quotation
  const handleDeleteQuotation = (id) => {
    const updated = deleteQuotation(id);
    setQuotations(updated);
  };

  // Database actions
  const handleSaveDatabase = (newDb) => {
    setDatabase(newDb);
    saveActiveDatabase(newDb);
  };

  const handleResetDatabase = () => {
    const def = resetDatabaseToDefault();
    setDatabase(def);
    return def;
  };

  // Settings actions
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        savedCount={quotations.length}
      />

      {/* Main 2-Column Responsive Workspace */}
      <main className="main-content">
        {/* LEFT COLUMN: Input, Routing, Cargo Builder, Truck Fleet Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Module 1: Client & OCR Input */}
          <InputModule
            companyName={companyName}
            setCompanyName={setCompanyName}
            projectName={projectName}
            setProjectName={setProjectName}
            notes={notes}
            setNotes={setNotes}
            onOcrExtracted={handleOcrExtracted}
            availableSkus={database.geosynthetics}
            apiKey={settings.geminiApiKey}
          />

          {/* Module 2: Routing & Google Maps Engine */}
          <RoutingModule
            destination={destination}
            setDestination={setDestination}
            routeResult={routeResult}
            setRouteResult={setRouteResult}
            googleMapsApiKey={settings.googleMapsApiKey}
          />

          {/* Module 3: Material Cargo Builder */}
          <CargoBuilder
            availableMaterials={database.geosynthetics}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />

          {/* Module 4: Truck Fleet Selector */}
          <TruckSelector
            availableFleets={database.logistics_fleet}
            selectedFleetId={selectedFleetId}
            setSelectedFleetId={setSelectedFleetId}
            maxRollLength={maxRollLength}
          />
        </div>

        {/* RIGHT COLUMN: 3D/2D Bin Packing Visualizer & AI Pricing Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Module 5: 3D/2D Bin Packing & Spatial Load Visualizer */}
          {packingResult && packingResult.success ? (
            <LoadVisualizer packingResult={packingResult} />
          ) : (
            <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <AlertCircle size={32} color="var(--accent-rose)" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>
                {packingResult?.message || 'Pilih material untuk memulai penataan muatan.'}
              </div>
            </div>
          )}

          {/* Module 6: Gemini AI Logistics Price & Cost Breakdown */}
          {estimationResult && packingResult && (
            <CostEstimationCard
              estimationResult={estimationResult}
              companyName={companyName}
              destination={destination}
              routeResult={routeResult}
              packingResult={packingResult}
              onSaveEstimation={handleSaveEstimation}
              onPrintQuotation={() => handleOpenQuotationSlip()}
              onRecalculate={handleCalculateAiPricing}
              isCalculating={isCalculatingAi}
              isSaved={isSaved}
            />
          )}
        </div>
      </main>

      {/* MODALS */}
      {/* 1. Official Quotation Slip Preview Modal */}
      <QuotationModal
        isOpen={isQuotationOpen}
        onClose={() => setIsQuotationOpen(false)}
        companyName={quotationModalData?.companyName || companyName}
        projectName={quotationModalData?.projectName || projectName}
        destination={quotationModalData?.destination || destination}
        routeResult={quotationModalData?.routeResult || routeResult}
        selectedItems={quotationModalData?.selectedItems || selectedItems}
        packingResult={quotationModalData?.packingResult || packingResult}
        estimationResult={quotationModalData?.estimationResult || estimationResult}
        quotationId={quotationModalData?.id}
      />

      {/* 2. Quotation History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        quotations={quotations}
        onLoadQuotation={handleLoadQuotation}
        onDeleteQuotation={handleDeleteQuotation}
        onPrintQuotation={(item) => handleOpenQuotationSlip(item)}
      />

      {/* 3. Database Studio (Material & Truck Master Editor) */}
      <DatabaseStudio
        isOpen={isDatabaseOpen}
        onClose={() => setIsDatabaseOpen(false)}
        database={database}
        onSaveDatabase={handleSaveDatabase}
        onResetDatabase={handleResetDatabase}
      />

      {/* 4. Settings & API Keys Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
