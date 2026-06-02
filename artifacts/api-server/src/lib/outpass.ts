export function generateOutpassCode(
  leaveId: number,
  studentId: number,
  yearSeq?: number
): { code: string; qrData: string; gatePassNumber: string } {
  const year = new Date().getFullYear();
  const seq = yearSeq ?? 1;
  const gatePassNumber = `GP-${year}-${seq.toString().padStart(4, "0")}`;

  const qrData = JSON.stringify({
    outpassCode: gatePassNumber,
    gatePassNumber,
    leaveId,
    studentId,
    generatedAt: new Date().toISOString(),
    type: "HOSTEL_OUTPASS",
  });

  return { code: gatePassNumber, qrData, gatePassNumber };
}
