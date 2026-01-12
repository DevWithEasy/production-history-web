// utils/storage.ts
export interface Period {
  year: number;
  month: number;
}

const KEY = "production-period";

export const getPeriod = (): Period => {
  if (typeof window === "undefined") {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  }

  const saved = localStorage.getItem(KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as Period;
    } catch {
      // corrupted data fallback
    }
  }

  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

export const setPeriod = (data: Period) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};
