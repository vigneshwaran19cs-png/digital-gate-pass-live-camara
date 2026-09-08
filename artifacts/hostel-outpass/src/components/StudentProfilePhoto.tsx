import React, { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface StudentProfilePhotoProps {
  photoUrl?: string | null;
  name?: string | null;
  registerNumber?: string | null;
  barcode?: string | null;
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
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

  // Generate ordered list of photo candidates
  const slug = nameToSlug(name);
  const cleanReg = (registerNumber || "").trim();
  const cleanBar = (barcode || "").trim();

  const candidates: string[] = [];

  // 1. Explicitly provided photoUrl
  if (photoUrl && typeof photoUrl === "string" && photoUrl.trim() && !photoUrl.includes("unsplash")) {
    candidates.push(photoUrl.trim());
  }

  // 2. Register Number candidate
  if (cleanReg) {
    candidates.push(`/students/${cleanReg}.jpg`);
    candidates.push(`/students/${cleanReg.toUpperCase()}.jpg`);
    candidates.push(`/students/${cleanReg.toLowerCase()}.jpg`);
    candidates.push(`/uploads/students/${cleanReg}.jpg`);
  }

  // 3. Barcode candidate
  if (cleanBar && cleanBar !== cleanReg) {
    candidates.push(`/students/${cleanBar}.jpg`);
    candidates.push(`/students/${cleanBar.toUpperCase()}.jpg`);
  }

  // 4. Name Slug candidate
  if (slug) {
    candidates.push(`/students/${slug}.jpg`);
  }

  // Deduplicate candidates preserving order
  const uniqueCandidates = Array.from(new Set(candidates));

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
    sm: "w-10 h-10 text-xs",
    md: "w-16 h-16 text-xs",
    lg: "w-24 h-24 text-sm",
    xl: "w-32 h-32 text-base",
  };

  if (allFailed || !currentSrc) {
    return (
      <div
        className={`bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-2 text-center select-none font-medium ${sizeClasses[size]} ${className}`}
        title="Profile Photo Not Available"
      >
        <ImageOff className="w-5 h-5 mb-1 text-slate-400 shrink-0" />
        <span className="text-[10px] leading-tight font-semibold text-slate-600 dark:text-slate-400">
          Profile Photo Not Available
        </span>
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
