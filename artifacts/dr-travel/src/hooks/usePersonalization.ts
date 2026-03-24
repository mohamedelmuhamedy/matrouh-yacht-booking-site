import { useState, useCallback } from "react";

const STORAGE_KEY = "drtravel-personalization";

interface PersonalizationData {
  viewedPackages: number[];
  lastCategory: string | null;
  visitCount: number;
  lastVisit: number | null;
}

function loadData(): PersonalizationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { viewedPackages: [], lastCategory: null, visitCount: 0, lastVisit: null };
}

function saveData(data: PersonalizationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function usePersonalization() {
  const [data, setData] = useState<PersonalizationData>(() => {
    const d = loadData();
    const updated = { ...d, visitCount: d.visitCount + 1, lastVisit: Date.now() };
    saveData(updated);
    return updated;
  });

  const trackView = useCallback((packageId: number, category: string) => {
    setData(prev => {
      const viewed = [packageId, ...prev.viewedPackages.filter(id => id !== packageId)].slice(0, 5);
      const updated = { ...prev, viewedPackages: viewed, lastCategory: category };
      saveData(updated);
      return updated;
    });
  }, []);

  const isFirstVisit = data.visitCount === 1;
  const isReturnVisit = data.visitCount > 1;
  const hasViewedPackages = data.viewedPackages.length > 0;

  return { data, trackView, isFirstVisit, isReturnVisit, hasViewedPackages };
}
