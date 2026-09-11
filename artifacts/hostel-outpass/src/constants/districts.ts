/**
 * Single source of truth for all 38 official districts of Tamil Nadu.
 */
export const TAMILNADU_DISTRICTS: string[] = [
  "Ariyalur",
  "Chengalpattu",
  "Chennai",
  "Coimbatore",
  "Cuddalore",
  "Dharmapuri",
  "Dindigul",
  "Erode",
  "Kallakurichi",
  "Kancheepuram",
  "Kanniyakumari",
  "Karur",
  "Krishnagiri",
  "Madurai",
  "Mayiladuthurai",
  "Nagapattinam",
  "Namakkal",
  "Nilgiris",
  "Perambalur",
  "Pudukkottai",
  "Ramanathapuram",
  "Ranipet",
  "Salem",
  "Sivaganga",
  "Tenkasi",
  "Thanjavur",
  "Theni",
  "Thoothukudi",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupathur",
  "Tiruppur",
  "Tiruvallur",
  "Tiruvannamalai",
  "Tiruvarur",
  "Vellore",
  "Viluppuram",
  "Virudhunagar",
];

/**
 * Detects a Tamil Nadu district name inside an address or location string.
 */
export function detectDistrict(locationText?: string | null): string | null {
  if (!locationText) return null;
  const lower = locationText.toLowerCase();

  // Try matching full district names
  for (const d of TAMILNADU_DISTRICTS) {
    const dLower = d.toLowerCase();
    if (lower.includes(dLower)) {
      return d;
    }
  }

  // Common aliases or abbreviations
  if (lower.includes("trichy") || lower.includes("tiruverumbur")) return "Tiruchirappalli";
  if (lower.includes("kovai")) return "Coimbatore";
  if (lower.includes("gobi") || lower.includes("gobichettipalayam") || lower.includes("komarapalayam") || lower.includes("bhavani") || lower.includes("sathyamangalam")) return "Erode";
  if (lower.includes("tuticorin")) return "Thoothukudi";
  if (lower.includes("tanjore")) return "Thanjavur";
  if (lower.includes("ooty") || lower.includes("coonoor")) return "Nilgiris";
  if (lower.includes("kanyakumari") || lower.includes("nagercoil")) return "Kanniyakumari";
  if (lower.includes("tirupur")) return "Tiruppur";
  if (lower.includes("tiruvannamalai")) return "Tiruvannamalai";
  if (lower.includes("villupuram")) return "Viluppuram";
  if (lower.includes("kanchipuram")) return "Kancheepuram";

  return null;
}
