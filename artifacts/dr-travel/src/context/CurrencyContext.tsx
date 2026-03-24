import { createContext, useContext, useState } from "react";
import type { CurrencyCode } from "../data/currencies";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "EGP",
  setCurrency: () => {},
});

function detectInitialCurrency(): CurrencyCode {
  const saved = localStorage.getItem("drtravel-currency") as CurrencyCode | null;
  if (saved === "EGP" || saved === "USD" || saved === "SAR") return saved;
  return "EGP";
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => detectInitialCurrency());

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("drtravel-currency", c);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
