import { useState, useMemo } from "react";
import { useListDepartments } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Search, X, Check, Building2, ChevronDown, Sparkles, Filter,
  GraduationCap, Cpu, Wrench, Stethoscope, Pill, Sprout, BookOpen
} from "lucide-react";

export const COLLEGE_CATEGORIES = [
  { id: "all", label: "All Colleges", icon: "🏢", match: "all" },
  { id: "engineering", label: "Engineering & Tech", icon: "🏗️", match: "Engineering & Technology" },
  { id: "pharmacy", label: "Pharmacy", icon: "💊", match: "Pharmacy Colleges" },
  { id: "allied_health", label: "Allied Health & Nursing", icon: "🩺", match: "Nursing & Paramedical" },
  { id: "agriculture", label: "Agriculture", icon: "🌾", match: "Agricultural Sciences" },
  { id: "arts_science", label: "Arts & Science", icon: "📚", match: "Arts & Science Colleges" },
  { id: "polytechnic", label: "Polytechnic / Diploma", icon: "🔧", match: "Polytechnic Colleges" },
];

export const TOP_ENGINEERING_QUICK_PICKS = [
  { code: "CSE", name: "Computer Science and Engineering" },
  { code: "AI & DS", name: "Artificial Intelligence and Data Science" },
  { code: "MECH", name: "Mechanical Engineering" },
  { code: "AUTO", name: "Automobile Engineering" },
  { code: "ECE", name: "Electronics and Communication" },
  { code: "EEE", name: "Electrical and Electronics" },
  { code: "CIVIL", name: "Civil Engineering" },
  { code: "IT", name: "Information Technology" },
];

// Helper to determine category from name or code
export function getDepartmentCategory(name: string, code?: string): string {
  const n = (name || "").toLowerCase();
  const c = (code || "").toUpperCase();

  if (n.includes("pharm") || c.includes("PHARM")) return "Pharmacy Colleges";
  if (n.includes("nurs") || n.includes("physio") || n.includes("mlt") || n.includes("radiology") || n.includes("anaesthesia") || n.includes("theatre")) {
    return "Nursing & Paramedical";
  }
  if (n.includes("agri") || n.includes("hort") || n.includes("food tech") || n.includes("forestry") || n.includes("seri")) {
    return "Agricultural Sciences";
  }
  if (n.startsWith("diploma") || c.startsWith("D-") || n.includes("tool & die")) {
    return "Polytechnic Colleges";
  }
  if (n.includes("commerce") || n.includes("b.com") || n.includes("bba") || n.includes("mba") || n.includes("bca") || n.includes("physics") || n.includes("chemistry") || n.includes("mathematics") || n.includes("english") || n.includes("nutrition")) {
    return "Arts & Science Colleges";
  }
  return "Engineering & Technology";
}

interface CategorizedDepartmentSelectProps {
  value: string; // departmentId as string
  onChange: (deptId: string) => void;
  label?: string;
  required?: boolean;
}

export function CategorizedDepartmentSelect({
  value,
  onChange,
  label = "Select College & Department",
  required = true,
}: CategorizedDepartmentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: departmentsRaw = [] } = useListDepartments();
  const departments = departmentsRaw as any[];

  // Enrich departments with category & code
  const enrichedDepartments = useMemo(() => {
    return departments.map(d => ({
      ...d,
      category: getDepartmentCategory(d.name, d.code),
    }));
  }, [departments]);

  // Selected Department object
  const selectedDept = enrichedDepartments.find(d => d.id?.toString() === value?.toString());

  // Filter departments based on category and search
  const filteredDepartments = useMemo(() => {
    return enrichedDepartments.filter(d => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q);

      let matchCategory = true;
      if (selectedCategory !== "all") {
        const catObj = COLLEGE_CATEGORIES.find(c => c.id === selectedCategory);
        if (catObj) {
          matchCategory = d.category === catObj.match;
        }
      }

      return matchSearch && matchCategory;
    });
  }, [enrichedDepartments, selectedCategory, searchQuery]);

  // Group by category
  const groupedDepartments = useMemo(() => {
    const map = new Map<string, typeof enrichedDepartments>();
    for (const d of filteredDepartments) {
      if (!map.has(d.category)) {
        map.set(d.category, []);
      }
      map.get(d.category)!.push(d);
    }
    return map;
  }, [filteredDepartments]);

  const handleSelect = (deptId: number | string) => {
    onChange(deptId.toString());
    setIsOpen(false);
  };

  const handleQuickPick = (deptNameOrCode: string) => {
    const found = enrichedDepartments.find(
      d => d.code?.toUpperCase() === deptNameOrCode.toUpperCase() ||
           d.name?.toLowerCase().includes(deptNameOrCode.toLowerCase())
    );
    if (found) {
      handleSelect(found.id);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          {label} {required && <span className="text-rose-500">*</span>}
        </Label>
        {selectedDept && (
          <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            {selectedDept.category}
          </span>
        )}
      </div>

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl border bg-white flex items-center justify-between cursor-pointer transition-all shadow-xs ${
          isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          {selectedDept ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md shrink-0">
                {selectedDept.code || "DEPT"}
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate">
                {selectedDept.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Click to select College & Department...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* One-Click Quick Engineering Pickers */}
      <div className="space-y-1 pt-1">
        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Quick Select (Top Engineering Departments):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOP_ENGINEERING_QUICK_PICKS.map(p => {
            const isSelected = selectedDept?.code?.toUpperCase() === p.code || selectedDept?.name === p.name;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => handleQuickPick(p.code)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all border ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200"
                }`}
              >
                {p.code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categorized Dropdown Modal Panel */}
      {isOpen && (
        <div className="p-3 bg-slate-50/90 border border-blue-200 rounded-2xl shadow-lg space-y-3 mt-2 animate-in fade-in-50 duration-150">
          {/* Category Tabs */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              1. Choose Institution / Stream:
            </div>
            <div className="flex flex-wrap gap-1">
              {COLLEGE_CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search department by name or code (e.g. Mech, CSE, AI, B.Pharm, Auto)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-white"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Departments List Grouped by Category */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl bg-white border border-slate-200 p-1">
            {filteredDepartments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No departments found matching "<strong>{searchQuery}</strong>".
              </div>
            ) : (
              Array.from(groupedDepartments.entries()).map(([categoryName, depts]) => (
                <div key={categoryName} className="py-2 first:pt-1 last:pb-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50/70 rounded-md mb-1 flex items-center justify-between">
                    <span>{categoryName}</span>
                    <span className="font-mono text-indigo-500 font-normal">{depts.length} branches</span>
                  </div>

                  <div className="grid grid-cols-1 gap-0.5">
                    {depts.map(d => {
                      const isSelected = selectedDept?.id === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => handleSelect(d.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? "bg-blue-50 text-blue-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold shrink-0">
                              {d.code || "DEPT"}
                            </span>
                            <span className="truncate">{d.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsOpen(false)}
            >
              Done Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
