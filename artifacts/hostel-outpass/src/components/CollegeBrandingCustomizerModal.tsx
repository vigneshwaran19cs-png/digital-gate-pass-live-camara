import { useState } from "react";
import { useBranding, BrandingSettings } from "@/contexts/BrandingContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Palette, Image as ImageIcon, Type, Sparkles, Building,
  CheckCircle2, RefreshCw, Eye, Sliders, Shield, Crown, Layout
} from "lucide-react";

interface CollegeBrandingCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_LOGOS = [
  { label: "JKKM Seal", url: "/jkkm_campus.png" },
  { label: "Tech Shield", url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200" },
  { label: "University Monogram", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200" },
];

const PRESET_BANNERS = [
  { label: "JKKM Campus Gate", url: "/jkkm_campus.png" },
  { label: "Modern Academic Campus", url: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200" },
  { label: "University Library & Tower", url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200" },
  { label: "Campus Green Courtyard", url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200" },
];

const THEME_ACCENTS = [
  { id: "blue", name: "JKKM Royal Blue", color: "#2563eb", bg: "bg-blue-600" },
  { id: "emerald", name: "Emerald Green", color: "#059669", bg: "bg-emerald-600" },
  { id: "violet", name: "Indigo Violet", color: "#7c3aed", bg: "bg-violet-600" },
  { id: "rose", name: "Crimson Red", color: "#e11d48", bg: "bg-rose-600" },
  { id: "amber", name: "Amber Gold", color: "#d97706", bg: "bg-amber-600" },
  { id: "slate", name: "Midnight Slate", color: "#334155", bg: "bg-slate-700" },
];

const FONT_FAMILIES = [
  { id: "Inter", label: "Inter (Modern Tech)" },
  { id: "Poppins", label: "Poppins (Friendly & Rounded)" },
  { id: "Roboto", label: "Roboto (Clean Standard)" },
  { id: "Outfit", label: "Outfit (Premium Modern)" },
];

export function CollegeBrandingCustomizerModal({ open, onOpenChange }: CollegeBrandingCustomizerModalProps) {
  const { branding, updateBranding, resetDefaults } = useBranding();
  const { toast } = useToast();

  const [form, setForm] = useState<BrandingSettings>({ ...branding });

  const handleChange = (field: keyof BrandingSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateBranding(form);
    toast({
      title: "🎨 Branding & Interface Saved!",
      description: "College name, logos, banner, font size, and themes have been updated globally.",
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    resetDefaults();
    setForm({ ...branding });
    toast({
      title: "Settings Reset",
      description: "Restored official default JKKM theme and typography.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 flex items-center justify-center font-bold">
              <Palette className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-700">Super Admin Control</span>
          </div>
          <DialogTitle className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            College Branding, Image & Font Customizer
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Customize the Institution Name, Logos, Campus Banners, Font Size scaling, and Accent Themes across the entire ERP system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Live Preview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Live Interface Preview
              </span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white font-mono">
                Font: {form.fontSize.toUpperCase()} ({form.fontFamily})
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
                  {form.collegeShortName || "JKKM"}
                </div>
              )}
              <div>
                <h3 className="font-heading font-bold text-base text-white">{form.collegeName || "Institution Name"}</h3>
                <p className="text-xs text-blue-200/90 line-clamp-1">{form.tagline || "Institution Tagline"}</p>
                <div className="text-[10px] text-blue-300 font-mono mt-0.5">ERP: {form.erpTitle}</div>
              </div>
            </div>
          </div>

          {/* Section 1: College Identity */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" /> 1. College Identity & Institution Names
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Full College / Institution Name</Label>
                <Input
                  className="mt-1 text-xs bg-white dark:bg-slate-800"
                  value={form.collegeName}
                  onChange={(e) => handleChange("collegeName", e.target.value)}
                  placeholder="e.g. JKKM Educational Institutions"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Short Name / Monogram</Label>
                <Input
                  className="mt-1 text-xs bg-white dark:bg-slate-800 font-mono uppercase"
                  value={form.collegeShortName}
                  onChange={(e) => handleChange("collegeShortName", e.target.value)}
                  placeholder="e.g. JKKM"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">ERP System Title</Label>
                <Input
                  className="mt-1 text-xs bg-white dark:bg-slate-800"
                  value={form.erpTitle}
                  onChange={(e) => handleChange("erpTitle", e.target.value)}
                  placeholder="e.g. OutPass Pro"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Affiliation & Accreditation Subtitle</Label>
                <Input
                  className="mt-1 text-xs bg-white dark:bg-slate-800"
                  value={form.tagline}
                  onChange={(e) => handleChange("tagline", e.target.value)}
                  placeholder="e.g. Autonomous Institution · Approved by AICTE, Affiliated to Anna University"
                />
              </div>
            </div>
          </div>

          {/* Section 2: College Images & Logos */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-600" /> 2. College Logo & Campus Banner Images
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">College Logo Image URL</Label>
                <Input
                  className="mt-1 text-xs bg-white dark:bg-slate-800"
                  value={form.logoUrl}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  placeholder="/jkkm_campus.png or web link"
                />
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {PRESET_LOGOS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleChange("logoUrl", p.url)}
                      className="text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 border rounded-md font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Campus Hero Banner URL (Login & Header Background)</Label>
                <Input
                  className="mt-1 text-xs bg-white dark:bg-slate-800"
                  value={form.bannerUrl}
                  onChange={(e) => handleChange("bannerUrl", e.target.value)}
                  placeholder="/jkkm_campus.png or web link"
                />
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {PRESET_BANNERS.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => handleChange("bannerUrl", b.url)}
                      className="text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 border rounded-md font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Typography & Font Size Controls */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Type className="w-4 h-4 text-indigo-600" /> 3. Typography & Global Font Size Scaling
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Font Size Scale</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleChange("fontSize", "sm")}
                    className={`p-2 rounded-xl border text-center text-xs transition-all ${
                      form.fontSize === "sm" ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="text-[13px] block font-semibold">14px Compact</span>
                    <span className="text-[9px] text-muted-foreground">More data on screen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("fontSize", "md")}
                    className={`p-2 rounded-xl border text-center text-xs transition-all ${
                      form.fontSize === "md" ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="text-[15px] block font-semibold">16px Standard</span>
                    <span className="text-[9px] text-muted-foreground">Default balanced</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("fontSize", "lg")}
                    className={`p-2 rounded-xl border text-center text-xs transition-all ${
                      form.fontSize === "lg" ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="text-[17px] block font-semibold">18px Large</span>
                    <span className="text-[9px] text-muted-foreground">Easy reading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("fontSize", "xl")}
                    className={`p-2 rounded-xl border text-center text-xs transition-all ${
                      form.fontSize === "xl" ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="text-[19px] block font-semibold">20px Accessible</span>
                    <span className="text-[9px] text-muted-foreground">High visibility</span>
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Font Family Style</Label>
                <div className="space-y-1.5 mt-1.5">
                  {FONT_FAMILIES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleChange("fontFamily", f.id)}
                      className={`w-full p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        form.fontFamily === f.id ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-bold" : "bg-white dark:bg-slate-800"
                      }`}
                    >
                      <span style={{ fontFamily: f.id }}>{f.label}</span>
                      {form.fontFamily === f.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Color Themes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-600" /> 4. Color Palette Accents
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_ACCENTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleChange("themeAccent", t.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
                    form.themeAccent === t.id ? "border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-xs" : "bg-white dark:bg-slate-800"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${t.bg} shrink-0`} />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Restore Default JKKM
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
              onClick={handleSave}
            >
              <CheckCircle2 className="w-4 h-4" /> Save & Apply Globally
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
