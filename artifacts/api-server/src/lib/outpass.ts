export function generateOutpassCode(leaveId: number, studentId: number): { code: string; qrData: string } {
  const timestamp = Date.now().toString(36).toUpperCase();
  const code = `OP-${studentId.toString().padStart(4, "0")}-${leaveId.toString().padStart(4, "0")}-${timestamp}`;
  const qrData = JSON.stringify({
    outpassCode: code,
    leaveId,
    studentId,
    generatedAt: new Date().toISOString(),
    type: "HOSTEL_OUTPASS",
  });
  return { code, qrData };
}
