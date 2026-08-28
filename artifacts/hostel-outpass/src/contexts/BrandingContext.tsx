import React, { createContext, useContext, useState, useEffect } from "react";

export interface BrandingSettings {
  collegeName: string;
  collegeShortName: string;
  tagline: string;
  erpTitle: string;
  logoUrl: string;
  bannerUrl: string;
  fontSize: "sm" | "md" | "lg" | "xl";
  fontFamily: "Inter" | "Poppins" | "Roboto" | "Outfit";
  themeAccent: "blue" | "emerald" | "violet" | "rose" | "amber" | "slate";
  cornerRadius: "sharp" | "sm" | "md" | "lg";
  isGlassmorphism: boolean;
}

const DEFAULT_BRANDING: BrandingSettings = {
  collegeName: "JKKM Educational Institutions",
  collegeShortName: "JKKM",
  tagline: "Autonomous Institution · Approved by AICTE, Affiliated to Anna University",
  erpTitle: "OutPass Pro",
  logoUrl: "/jkkm_campus.png",
  bannerUrl: "/jkkm_campus.png",
  fontSize: "md",
  fontFamily: "Inter",
  themeAccent: "blue",
  cornerRadius: "md",
  isGlassmorphism: true,
};

interface BrandingContextType {
  branding: BrandingSettings;
  updateBranding: (settings: Partial<BrandingSettings>) => void;
  resetDefaults: () => void;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(() => {
    try {
      const saved = localStorage.getItem("system_branding_settings");
      if (saved) return { ...DEFAULT_BRANDING, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_BRANDING;
  });

  useEffect(() => {
    // Apply Font Size to HTML root
    const root = document.documentElement;
    if (branding.fontSize === "sm") root.style.fontSize = "14px";
    else if (branding.fontSize === "md") root.style.fontSize = "16px";
    else if (branding.fontSize === "lg") root.style.fontSize = "18px";
    else if (branding.fontSize === "xl") root.style.fontSize = "20px";

    // Apply Font Family
    document.body.style.fontFamily = `'${branding.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

    // Save to localStorage
    try {
      localStorage.setItem("system_branding_settings", JSON.stringify(branding));
    } catch (e) {}
  }, [branding]);

  const updateBranding = (settings: Partial<BrandingSettings>) => {
    setBranding((prev) => ({ ...prev, ...settings }));
  };

  const resetDefaults = () => {
    setBranding(DEFAULT_BRANDING);
    try {
      localStorage.removeItem("system_branding_settings");
    } catch (e) {}
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, resetDefaults }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error("useBranding must be used within a BrandingProvider");
  return context;
}
