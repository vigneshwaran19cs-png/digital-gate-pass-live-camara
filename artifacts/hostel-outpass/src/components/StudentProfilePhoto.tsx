import React from "react";
import { ImageOff } from "lucide-react";

interface StudentProfilePhotoProps {
  photoUrl?: string | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function StudentProfilePhoto({
  photoUrl,
  name = "Student",
  className = "",
  imageClassName = "",
  size = "md",
}: StudentProfilePhotoProps) {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    sm: "w-10 h-10 text-xs",
    md: "w-16 h-16 text-xs",
    lg: "w-24 h-24 text-sm",
    xl: "w-32 h-32 text-base",
  };

  const hasPhoto = !!photoUrl && !imageError;

  if (!hasPhoto) {
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
        src={photoUrl!}
        alt={name || "Student Photo"}
        className={`w-full h-full object-cover rounded-xl ${imageClassName}`}
        onError={() => setImageError(true)}
      />
    </div>
  );
}
