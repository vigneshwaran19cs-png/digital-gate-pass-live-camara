import React, { useState, useEffect } from "react";
import { STUDENT_CANDIDATE_MAP } from "@/lib/student_candidates";

interface StudentProfilePhotoProps {
  photoUrl?: string | null;
  name?: string | null;
  registerNumber?: string | null;
  barcode?: string | null;
  className?: string;
  imageClassName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

function nameToSlug(name?: string | null): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function StudentProfilePhoto({
  photoUrl,
  name = "Student",
  registerNumber,
  barcode,
  className = "",
  imageClassName = "",
  size = "md",
}: StudentProfilePhotoProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const cleanReg = (registerNumber || "").trim();
  const cleanBar = (barcode || "").trim();
  const slug = nameToSlug(name);

  const shortReg = cleanReg.replace(/^7312/, "");
  const fullReg = cleanReg.length <= 8 && cleanReg && !cleanReg.startsWith("7312") ? `7312${cleanReg}` : cleanReg;

  // Build strict, non-colliding candidate list based ONLY on this student's unique identifiers
  const candidates: string[] = [];

  // 1. Explicitly provided photoUrl
  if (photoUrl && typeof photoUrl === "string" && photoUrl.trim() && !photoUrl.includes("unsplash")) {
    const p = photoUrl.trim();
    candidates.push(p);
    if (!p.startsWith("http") && !p.startsWith("data:")) {
      candidates.push(`http://localhost:5000${p.startsWith("/") ? "" : "/"}${p}`);
    }
  }

  // 2. Candidate Map Lookup for THIS student's register number
  const candObj = (STUDENT_CANDIDATE_MAP as any)[shortReg] ||
    (STUDENT_CANDIDATE_MAP as any)[fullReg] ||
    (STUDENT_CANDIDATE_MAP as any)[cleanReg] ||
    (STUDENT_CANDIDATE_MAP as any)[cleanBar];

  if (candObj) {
    if (candObj.barcode) {
      candidates.push(`/students/${candObj.barcode}.jpg`);
      candidates.push(`/students/${candObj.barcode.toLowerCase()}.jpg`);
    }
    if (candObj.reg) {
      candidates.push(`/students/${candObj.reg}.jpg`);
      candidates.push(`/students/${candObj.reg.toLowerCase()}.jpg`);
    }
  }

  // 3. Register Number variations for THIS student
  if (cleanReg) {
    candidates.push(`/students/${cleanReg}.jpg`);
    candidates.push(`/students/${cleanReg.toUpperCase()}.jpg`);
    candidates.push(`/students/${cleanReg.toLowerCase()}.jpg`);
  }
  if (shortReg && shortReg !== cleanReg) {
    candidates.push(`/students/${shortReg}.jpg`);
    candidates.push(`/students/${shortReg.toUpperCase()}.jpg`);
    candidates.push(`/students/${shortReg.toLowerCase()}.jpg`);
  }
  if (fullReg && fullReg !== cleanReg) {
    candidates.push(`/students/${fullReg}.jpg`);
    candidates.push(`/students/${fullReg.toUpperCase()}.jpg`);
    candidates.push(`/students/${fullReg.toLowerCase()}.jpg`);
  }

  // 4. Barcode variations for THIS student
  if (cleanBar && cleanBar !== cleanReg) {
    candidates.push(`/students/${cleanBar}.jpg`);
    candidates.push(`/students/${cleanBar.toUpperCase()}.jpg`);
    candidates.push(`/students/${cleanBar.toLowerCase()}.jpg`);
  }

  // 5. EXACT Full Name Slug ONLY (e.g., "aravindhan_s.jpg" for ARAVINDHAN S)
  // NEVER use loose first-name prefix matching (e.g., "aravindhan_a.jpg" for ARAVINDHAN S)
  if (slug) {
    candidates.push(`/students/${slug}.jpg`);
  }

  // 6. ID Card image variations for THIS student
  if (cleanReg) {
    candidates.push(`/students/${cleanReg}_card.jpg`);
    candidates.push(`/students/${fullReg}_card.jpg`);
  }

  // Deduplicate preserving order
  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(uniqueCandidates.length === 0);
  }, [photoUrl, registerNumber, barcode, name]);

  const currentSrc = uniqueCandidates[candidateIndex];

  const handleImageError = () => {
    if (candidateIndex + 1 < uniqueCandidates.length) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  const sizeClasses = {
    xs: "w-8 h-8 text-[10px]",
    sm: "w-10 h-10 text-xs",
    md: "w-16 h-16 text-sm",
    lg: "w-20 h-20 text-base",
    xl: "w-28 h-28 text-xl",
  };

  if (allFailed || !currentSrc) {
    const initials = (name || cleanReg || "ST")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div
        className={`bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white border border-blue-400/40 rounded-xl flex items-center justify-center text-center select-none font-extrabold shadow-sm ${sizeClasses[size]} ${className}`}
        title={name || "Student Profile"}
      >
        <span className="tracking-wider">{initials || "ST"}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${sizeClasses[size]} ${className}`}>
      <img
        src={currentSrc}
        alt={name || "Student Photo"}
        className={`w-full h-full object-cover rounded-xl ${imageClassName}`}
        onError={handleImageError}
      />
    </div>
  );
}
