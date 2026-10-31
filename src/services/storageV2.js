import { DEFAULT_DATABASE } from "../data/defaultDatabase.js";
import { validateDatabase } from "./packingOptimizer.js";
const key = "mb_logisynthetix_v2";
export function initialDatabase() {
  return structuredClone(DEFAULT_DATABASE);
}
export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (
        data.version !== 2 ||
        validateDatabase(data.database).length ||
        !Array.isArray(data.history)
      )
        throw Error("Format data tidak valid");
      return { ...data, error: null };
    }
    const legacy = localStorage.getItem("mb_logisynthetix_database");
    const database = legacy ? JSON.parse(legacy) : initialDatabase();
    if (validateDatabase(database).length)
      throw Error("Database lama belum valid; data asli tetap tersimpan");
    return {
      database,
      history: [],
      legacyAvailable: !!localStorage.getItem("mb_logisynthetix_quotations"),
      error: null,
    };
  } catch (e) {
    return {
      database: initialDatabase(),
      history: [],
      error: `Data tersimpan gagal dibaca: ${e.message}. Ekspor cadangan sebelum menyimpan perubahan.`,
    };
  }
}
export function saveWorkspace(database, history) {
  const errors = validateDatabase(database);
  if (errors.length) throw Error(errors.join(" "));
  localStorage.setItem(key, JSON.stringify({ version: 2, database, history }));
}
export function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportBackup(database, history) {
  downloadJson("logisynthetix-backup.json", {
    version: 2,
    database,
    history,
    legacyDatabase: localStorage.getItem("mb_logisynthetix_database"),
    legacyHistory: localStorage.getItem("mb_logisynthetix_quotations"),
  });
}
