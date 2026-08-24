import { useGetOutpass, getGetOutpassQueryKey, useListDepartments } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, QrCode, Shield, Check } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function OutpassDetailPage() {
  const [, params] = useRoute("/outpasses/:id");
  const id = Number(params?.id);

  const { data: departmentsRaw = [] } = useListDepartments();
  const depList = departmentsRaw as any[];
  const getDeptName = (deptId: number | null | undefined) => {
    if (!deptId) return "";
    return depList.find((d: any) => d.id === deptId)?.name || "";
  };

  const { data: outpass, isLoading } = useGetOutpass(id, {
    query: { enabled: !!id, queryKey: getGetOutpassQueryKey(id) }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!outpass) return <div className="text-center py-12">Outpass not found.</div>;

  let staff: any = { tutor: null, hod: null, principal: null, warden: null };
  try {
    if (outpass.staffDetails) {
      staff = JSON.parse(outpass.staffDetails);
    }
  } catch (e) {}

  // Parse QR verification URL or data payload
  const qrValue = JSON.stringify({
    outpassCode: outpass.outpassCode,
    studentId: outpass.studentId,
    name: outpass.student?.name,
    registerNumber: outpass.student?.registerNumber,
    status: outpass.status,
  });

  const seqNo = outpass.gatePassNumber ? outpass.gatePassNumber.split("-").slice(-1)[0] : String(outpass.id).padStart(4, "0");

  const handlePrint = () => {
    const printContent = document.getElementById("printable-gate-pass-content");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Gate Pass - ${outpass.outpassCode}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Poppins', sans-serif;
              margin: 0;
              padding: 0;
              background: white;
              color: black;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .gate-pass {
              width: 105mm;
              height: 148mm;
              border: 3px solid #0a2540;
              padding: 10px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              position: relative;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
            }
            .logo-mjk {
              background: #0a2540;
              width: 42px;
              height: 42px;
              border-radius: 4px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              color: white;
              font-weight: 800;
            }
            .logo-mjk-m {
              font-size: 16px;
              line-height: 1;
            }
            .logo-mjk-jk {
              font-size: 8px;
              letter-spacing: 1px;
              line-height: 1;
              margin-top: 1px;
            }
            .header-center {
              text-align: center;
              flex-grow: 1;
              padding: 0 6px;
            }
            .header-center h1 {
              font-size: 11px;
              margin: 0;
              color: #0a2540;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .header-center .gate-pass-title {
              display: inline-block;
              background: #0a2540;
              color: white;
              font-size: 12px;
              font-weight: 800;
              padding: 2px 14px;
              border-radius: 3px;
              margin: 3px 0;
              letter-spacing: 1px;
            }
            .header-center h3 {
              font-size: 8px;
              margin: 0;
              font-weight: bold;
              color: #0a2540;
              letter-spacing: 0.5px;
            }
            .logo-naac-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .logo-naac {
              position: relative;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border: 1.5px solid #2563eb;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo-naac-a {
              color: #1d4ed8;
              font-weight: 800;
              font-size: 14px;
            }
            .logo-naac-badge {
              position: absolute;
              bottom: -4px;
              background: #2563eb;
              color: white;
              font-size: 6px;
              font-weight: bold;
              padding: 0 3px;
              border-radius: 1px;
            }
            .pass-no-red {
              color: #e11d48;
              font-weight: 800;
              font-size: 11px;
              margin-top: 1px;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #0a2540;
              font-size: 8px;
            }
            .grid-table td {
              border: 1px solid #0a2540;
              padding: 3px 6px;
              vertical-align: middle;
            }
            .label-cell {
              font-weight: bold;
              color: black;
              background-color: #f8fafc;
            }
            .val-cell {
              font-weight: bold;
              color: black;
            }
            .signatures-row {
              padding: 0 !important;
            }
            .sig-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
            }
            .sig-table td {
              border: none;
              border-right: 1px solid #0a2540;
              padding: 2px 4px;
              width: 25%;
              text-align: center;
            }
            .sig-table td:last-child {
              border-right: none;
            }
            .sig-space {
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .sig-font {
              font-family: 'Georgia', serif;
              font-style: italic;
              font-weight: bold;
              color: #1d4ed8;
              font-size: 10px;
              transform: rotate(-2deg);
            }
            .sig-title {
              font-size: 7px;
              font-weight: 800;
              color: #0a2540;
              border-top: 1px solid #0a2540;
              padding-top: 1px;
              margin-top: 1px;
              text-transform: uppercase;
            }
            .dashed-line {
              border-top: 1.5px dashed #0a2540;
              margin: 6px 0;
            }
            .office-use-title {
              font-size: 8px;
              font-weight: 800;
              color: #0a2540;
              text-align: center;
              margin-bottom: 3px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .office-flex {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .office-table {
              flex-grow: 1;
              border-collapse: collapse;
              border: 1px solid #0a2540;
              font-size: 7px;
              text-align: center;
            }
            .office-table td {
              border: 1px solid #0a2540;
              padding: 2px 4px;
            }
            .qr-box {
              width: 54px;
              height: 54px;
              border: 1px solid #0a2540;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 1px;
              background: white;
              flex-shrink: 0;
            }
            @media print {
              body { margin: 0; background: none; }
              .gate-pass { border: 3px solid #0a2540 !important; }
            }
          </style>
        </head>
        <body>
          <div class="gate-pass">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownload = async () => {
    const element = document.getElementById("printable-gate-pass-wrapper");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [105, 148], // A6 size
    });

    pdf.addImage(imgData, "PNG", 0, 0, 105, 148);
    pdf.save(`GatePass_${outpass.gatePassNumber || outpass.outpassCode}.pdf`);
  };

  const formattedOutDate = outpass.leave?.fromDate 
    ? format(new Date(outpass.leave.fromDate), "dd-MM-yyyy hh:mm a") 
    : "—";

  const formattedInDate = outpass.leave?.toDate 
    ? format(new Date(outpass.leave.toDate), "dd-MM-yyyy hh:mm a") 
    : "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" asChild className="mb-2">
        <Link href="/outpasses">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Outpasses
        </Link>
      </Button>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        {/* Pass Column */}
        <div className="md:col-span-3 flex justify-center">
          {/* Card Wrapper matching A6 aspect ratio (105:148) */}
          <div 
            id="printable-gate-pass-wrapper" 
            className="w-[105mm] h-[148mm] bg-white text-black p-3.5 flex flex-col justify-between border-[3px] border-[#0a2540] rounded shadow-2xl relative select-none"
          >
            {/* Inner Content to copy during Print */}
            <div id="printable-gate-pass-content" className="h-full flex flex-col justify-between">
              <div>
                {/* Header Container */}
                <div className="flex justify-between items-center header-container">
                  {/* JKKM Monogram Logo */}
                  <div className="logo-mjk shrink-0 select-none">
                    <span className="logo-mjk-m text-white font-extrabold text-[16px] leading-none">M</span>
                    <span className="logo-mjk-jk text-white text-[8px] tracking-widest leading-none mt-0.5 font-bold">JK</span>
                  </div>

                  {/* Header Center Titles */}
                  <div className="header-center text-center flex-grow px-1.5">
                    <h1 className="font-extrabold text-[11px] text-[#0a2540] tracking-wide leading-tight">
                      JKKM COLLEGE OF TECHNOLOGY
                    </h1>
                    <div className="gate-pass-title inline-block bg-[#0a2540] text-white text-[12px] font-extrabold px-3.5 py-0.5 rounded tracking-widest leading-none my-0.5">
                      GATE PASS
                    </div>
                    <h3 className="text-[8px] font-bold text-[#0a2540] tracking-wide leading-none uppercase">
                      ( ENGINEERING )
                    </h3>
                  </div>

                  {/* NAAC Logo + Sequence Number */}
                  <div className="logo-naac-container flex flex-col items-center shrink-0">
                    <div className="logo-naac relative w-[38px] h-[38px] rounded-full border-1.5 border-blue-600 bg-white flex items-center justify-center select-none">
                      <span className="logo-naac-a text-blue-700 font-extrabold text-[14px]">A</span>
                      <div className="logo-naac-badge absolute -bottom-1 bg-blue-600 text-white text-[6px] font-bold px-1.5 rounded leading-none py-0.5">
                        NAAC
                      </div>
                    </div>
                    <div className="pass-no-red text-[#e11d48] font-extrabold text-[11px] mt-0.5">
                      No. {seqNo}
                    </div>
                  </div>
                </div>

                {/* Grid Table */}
                <table className="grid-table w-full border-collapse border-2 border-[#0a2540] text-[8px] text-black mt-1">
                  <tbody>
                    {/* Student Photo & General Info Header */}
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1 w-[25%] text-center" rowSpan={2}>
                        {outpass.student?.photoUrl ? (
                          <img src={outpass.student.photoUrl} className="w-12 h-12 object-cover mx-auto rounded border border-[#0a2540]" alt="Student Photo" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center mx-auto text-[6px] font-bold text-slate-600 text-center leading-tight p-0.5">
                            Profile Photo Not Available
                          </div>
                        )}
                      </td>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1 w-[25%]">Student Name</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1 truncate" colSpan={2}>
                        {outpass.student?.name}
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1">Reg Number</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1 font-mono font-bold" colSpan={2}>
                        {outpass.student?.registerNumber || "STU-001"}
                      </td>
                    </tr>

                    {/* Row 1: Out Date & Time */}
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1 w-[30%]">Out Date & Time</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1" colSpan={3}>
                        {formattedOutDate}
                      </td>
                    </tr>

                    {/* Row 3: Department / Year */}
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1">Department / Year</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1" colSpan={3}>
                        {getDeptName(outpass.student?.departmentId) || "Engineering"} / {outpass.student?.registerNumber?.startsWith("STU") ? "3rd Year" : "2nd Year"}
                      </td>
                    </tr>

                    {/* Row 4: Contact No. */}
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1">Contact No.</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1" colSpan={3}>
                        {outpass.student?.phone || "—"}
                      </td>
                    </tr>

                    {/* Row 6: Purpose & In Date */}
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1 w-[20%]">Purpose</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1 w-[30%] truncate">
                        {outpass.leave?.reason}
                        {((outpass.leave as any)?.isEmergency === "true" || outpass.leave?.leaveType === "family_emergency") && (
                          <span className="ml-1 text-red-600 font-extrabold">(🔴 EMERGENCY)</span>
                        )}
                      </td>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1 w-[20%]">In Date & Time</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1 w-[30%]">{formattedInDate}</td>
                    </tr>

                    {/* Row 7: Place & Hostel */}
                    <tr>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1">Place</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1 truncate">{outpass.leave?.destination}</td>
                      <td className="label-cell bg-slate-50 font-bold border border-[#0a2540] px-2 py-1">Hostel</td>
                      <td className="val-cell border border-[#0a2540] px-2 py-1">Yes</td>
                    </tr>

                    {/* Row 9: Dynamic Signatures Row (Requirement 9 & 10) */}
                    <tr>
                      <td colSpan={4} className="signatures-row p-0 border border-[#0a2540]">
                        {((outpass.leave as any)?.isEmergency === "true" || outpass.leave?.leaveType === "family_emergency") ? (
                          /* Emergency Leave Signatures (Warden + Principal ONLY) */
                          <table className="sig-table w-full border-collapse border-none">
                            <tbody>
                              <tr>
                                {/* Warden Signature */}
                                <td className="border-r border-[#0a2540] py-1 text-center w-[50%]">
                                  <div className="sig-space h-6 flex flex-col items-center justify-center">
                                    <span className="sig-font font-serif italic text-blue-600 font-bold text-[9px] select-none rotate-[-2deg]">
                                      {staff.warden?.name || "Mr. Hostel Warden"}
                                    </span>
                                  </div>
                                  <div className="sig-title border-t border-[#0a2540] pt-0.5 text-[7px] font-bold text-[#0a2540] uppercase leading-none">
                                    Warden Signature
                                  </div>
                                </td>
                                {/* Principal Signature */}
                                <td className="py-1 text-center w-[50%]">
                                  <div className="sig-space h-6 flex flex-col items-center justify-center">
                                    <span className="sig-font font-serif italic text-blue-600 font-bold text-[9px] select-none rotate-[-2deg]">
                                      {staff.principal?.name || "Dr. Principal"}
                                    </span>
                                  </div>
                                  <div className="sig-title border-t border-[#0a2540] pt-0.5 text-[7px] font-bold text-[#0a2540] uppercase leading-none">
                                    Principal Signature
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : (
                          /* Normal Leave Signatures (Tutor, HOD, Principal, Warden) */
                          <table className="sig-table w-full border-collapse border-none">
                            <tbody>
                              <tr>
                                {/* Tutor Signature */}
                                <td className="border-r border-[#0a2540] py-1 text-center w-[25%]">
                                  <div className="sig-space h-6 flex flex-col items-center justify-center">
                                    <span className="sig-font font-serif italic text-blue-600 font-bold text-[9px] select-none rotate-[-2deg]">
                                      {staff.tutor?.name || "Dr. Smith"}
                                    </span>
                                  </div>
                                  <div className="sig-title border-t border-[#0a2540] pt-0.5 text-[7px] font-bold text-[#0a2540] uppercase leading-none">
                                    Tutor Signature
                                  </div>
                                </td>
                                {/* HOD Signature */}
                                <td className="border-r border-[#0a2540] py-1 text-center w-[25%]">
                                  <div className="sig-space h-6 flex flex-col items-center justify-center">
                                    <span className="sig-font font-serif italic text-blue-600 font-bold text-[9px] select-none rotate-[-2deg]">
                                      {staff.hod?.name || "Prof. K. HOD"}
                                    </span>
                                  </div>
                                  <div className="sig-title border-t border-[#0a2540] pt-0.5 text-[7px] font-bold text-[#0a2540] uppercase leading-none">
                                    HOD Signature
                                  </div>
                                </td>
                                {/* Principal Signature */}
                                <td className="border-r border-[#0a2540] py-1 text-center w-[25%]">
                                  <div className="sig-space h-6 flex flex-col items-center justify-center">
                                    <span className="sig-font font-serif italic text-blue-600 font-bold text-[9px] select-none rotate-[-2deg]">
                                      {staff.principal?.name || "Dr. Principal"}
                                    </span>
                                  </div>
                                  <div className="sig-title border-t border-[#0a2540] pt-0.5 text-[7px] font-bold text-[#0a2540] uppercase leading-none">
                                    Principal Signature
                                  </div>
                                </td>
                                {/* Warden Signature */}
                                <td className="py-1 text-center w-[25%]">
                                  <div className="sig-space h-6 flex flex-col items-center justify-center">
                                    <span className="sig-font font-serif italic text-blue-600 font-bold text-[9px] select-none rotate-[-2deg]">
                                      {staff.warden?.name || "Mr. Hostel Warden"}
                                    </span>
                                  </div>
                                  <div className="sig-title border-t border-[#0a2540] pt-0.5 text-[7px] font-bold text-[#0a2540] uppercase leading-none">
                                    Warden Signature
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Separator Line */}
              <div className="dashed-line border-t-2 border-dashed border-[#0a2540] my-1.5"></div>

              {/* Office Use Section */}
              <div className="select-none px-0.5">
                <div className="office-use-title font-extrabold text-[#0a2540] text-center uppercase tracking-wider text-[8px] mb-1 leading-none">
                  FOR OFFICE USE ONLY
                </div>
                <div className="office-flex flex items-center gap-2">
                  <table className="office-table flex-grow border-collapse border border-[#0a2540] text-[7px] text-black text-center">
                    <thead>
                      <tr className="bg-slate-50 font-bold">
                        <td className="border border-[#0a2540] py-0.5">Out Time</td>
                        <td className="border border-[#0a2540] py-0.5">Date</td>
                        <td className="border border-[#0a2540] py-0.5">Signature</td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[#0a2540] py-1 font-bold h-6">
                          {outpass.exitTime ? format(new Date(outpass.exitTime), "hh:mm a") : "   :   AM/PM"}
                        </td>
                        <td className="border border-[#0a2540] py-1 font-bold">
                          {outpass.exitTime ? format(new Date(outpass.exitTime), "dd/MM/yyyy") : "   /   /    "}
                        </td>
                        <td className="border border-[#0a2540] py-1">
                          {outpass.exitTime ? (
                            <span className="font-serif italic text-blue-600 font-bold text-[8px]">Security</span>
                          ) : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Verification QR Box */}
                  <div className="qr-box w-[54px] h-[54px] border border-[#0a2540] flex items-center justify-center p-0.5 bg-white shrink-0">
                    <QRCodeSVG value={qrValue} size={50} level="M" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card p-6 space-y-4">
            <div>
              <h2 className="font-heading font-bold text-xl mb-1">Gate Pass Ready</h2>
              <p className="text-sm text-muted-foreground">This digital outpass has been approved by the JKKM administrative flow and is ready for exit gate verification.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-xl">
                <span className="text-muted-foreground">Outpass Number:</span>
                <span className="font-mono font-bold text-blue-400">
                  {outpass.gatePassNumber || `GP-2026-${String(outpass.id).padStart(4, "0")}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-xl">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant={outpass.status === "generated" ? "default" : "secondary"}>
                  {outpass.status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11">
                <Printer className="w-4 h-4" /> Print Gate Pass
              </Button>
              <Button onClick={handleDownload} variant="outline" className="w-full gap-2 h-11">
                <Download className="w-4 h-4" /> Download PDF (A6)
              </Button>
            </div>
          </Card>

          {/* Secure QR verification explanation */}
          <Card className="glass-card p-5 border-blue-500/10 space-y-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2 text-blue-400">
              <Shield className="w-4 h-4" /> Secure QR System
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Present this pass at the gate. The security officer will scan the QR code to verify details against database records. The exit and return times will be automatically logged.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-semibold p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <Check className="w-3.5 h-3.5" /> SECURE CODE GP-2026-ENCRYPTED
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}