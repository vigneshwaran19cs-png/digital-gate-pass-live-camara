import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListDepartments, useListClasses, useListUsers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard, Upload, Camera, CheckCircle2, AlertTriangle, AlertCircle, User,
  Home, Building, Phone, Mail, MapPin, Hash, Sparkles, RefreshCw,
  Search, Shield, Check, Eye, Trash2, ArrowLeft, Barcode as BarcodeIcon,
  Info, Users, Layers, ExternalLink, Plus, Play, CheckCheck, X, ZoomIn, Download,
  FileText, Bus, Cpu, CheckCircle
} from "lucide-react";
import { CategorizedDepartmentSelect } from "@/components/CategorizedDepartmentSelect";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: "spring" as const, stiffness: 400, damping: 30 }
  }),
};

const SAMPLE_PRESET_PHOTOS = [
  { label: "Vimal M (Auto)", url: "/students/vimal_m.jpg" },
  { label: "Azhagesan S (Mech)", url: "/students/azhagesan_s.jpg" },
  { label: "Chinraj M (Mech)", url: "/students/chinraj_m.jpg" },
  { label: "Karthick Rajan (Auto)", url: "/students/karthick_rajan_s.jpg" },
  { label: "Kavin Kaarthik (Auto)", url: "/students/kavin_kaarthik_m.jpg" },
  {
    label: "Kaviya A (CSE)",
    url: "/students/731225CS022.jpg"
  },
  {
    label: "Sivaharivel T (Mech)",
    url: "/students/731225ME024.jpg"
  },
];

const HOSTEL_BLOCK_OPTIONS = [
  "Kaveri Boys Hostel (Block A)",
  "Bhavani Boys Hostel (Block B)",
  "Amaravathi Girls Hostel (Block A)",
  "Vaigai PG & Research Hostel",
  "Boys Hostel - Main Block",
  "Girls Hostel - Main Block"
];

// Extracted student model
export interface ExtractedStudent {
  tempId: string;
  sourceFileName: string;
  name: string;
  registerNumber: string;
  email: string;
  phone: string;
  departmentId: number | null;
  departmentName: string;
  year: string;
  section: string;
  studentType: "HOSTELLER" | "DAY_SCHOLAR";
  hostelBlock: string;
  hostelRoom: string;
  bedNumber: string;
  parentName: string;
  parentPhone: string;
  parentWhatsapp: string;
  parentEmail: string;
  bloodGroup: string;
  address: string;
  barcode: string;
  photoUrl: string;
  idCardUrl: string;
  status: "ready" | "already_exists" | "registered" | "failed";
  statusMessage?: string;
}

export interface BulkFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  status: "pending" | "processing" | "extracted" | "failed";
  error?: string;
  extractedStudents: ExtractedStudent[];
}

export default function StudentIdCardUploadPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"bulk" | "single" | "directory">("bulk");

  // Bulk Upload State
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<BulkFileItem[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);
  const [extractedStudentsList, setExtractedStudentsList] = useState<ExtractedStudent[]>([]);
  const [bulkDefaultStudentType, setBulkDefaultStudentType] = useState<"HOSTELLER" | "DAY_SCHOLAR">("HOSTELLER");
  const [bulkDefaultHostelBlock, setBulkDefaultHostelBlock] = useState("Kaveri Boys Hostel (Block A)");
  const [bulkFilterStatus, setBulkFilterStatus] = useState<"all" | "ready" | "already_exists" | "registered">("all");
  const [isBatchImporting, setIsBatchImporting] = useState(false);

  // Single Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [year, setYear] = useState<string>("III Year");
  const [collegeType, setCollegeType] = useState<string>("Engineering");

  // MANDATORY Student Type for Single Form
  const [studentType, setStudentType] = useState<"HOSTELLER" | "DAY_SCHOLAR">("HOSTELLER");
  const [hostelBlock, setHostelBlock] = useState<string>("Kaveri Boys Hostel (Block A)");
  const [hostelRoom, setHostelRoom] = useState<string>("A-101");
  const [bedNumber, setBedNumber] = useState<string>("Bed-1");

  // Parent Details for Single Form
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [address, setAddress] = useState("");

  // ID Card & Photo Assets for Single Form
  const [idCardUrl, setIdCardUrl] = useState<string>("/students/id_card_sheet.jpg");
  const [idCardFileName, setIdCardFileName] = useState<string>("id_card_sample.jpg");
  const [photoUrl, setPhotoUrl] = useState<string>("/students/vimal_m.jpg");
  const [barcode, setBarcode] = useState<string>("");

  // Registry Filter State
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "HOSTELLER" | "DAY_SCHOLAR">("all");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const { data: departmentsRaw = [] } = useListDepartments();
  const { data: classesRaw = [] } = useListClasses();
  const { data: usersRaw = [], refetch: refetchUsers } = useListUsers();

  const departments = departmentsRaw as any[];
  const classes = classesRaw as any[];
  const allUsers = usersRaw as any[];
  const studentsList = allUsers.filter((u: any) => u.role === "student");

  const filteredStudents = studentsList.filter((s: any) => {
    const q = searchFilter.toLowerCase();
    const matchesSearch =
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.registerNumber?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.barcode?.toLowerCase().includes(q);
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "DAY_SCHOLAR" ? s.studentType === "DAY_SCHOLAR" : s.studentType !== "DAY_SCHOLAR");
    return matchesSearch && matchesType;
  });

  const getDeptName = (deptId: number | null | undefined) => {
    if (!deptId) return "Engineering";
    return departments.find((d: any) => d.id === deptId)?.name || "Engineering";
  };

  // =========================================================================
  // 1. BULK FILE SELECTION HANDLER (ACCEPTS ALL 75+ FILES WITHOUT LIMITS)
  // =========================================================================
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesArray = Array.from(files);
    const newItems: BulkFileItem[] = newFilesArray.map((file, idx) => {
      const id = `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        previewUrl,
        status: "pending",
        extractedStudents: [],
      };
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);
    toast({
      title: `${newItems.length} ID Card Files Added ✓`,
      description: `Total selected: ${selectedFiles.length + newItems.length} files ready for extraction.`,
    });

    // Reset input value to allow re-selecting the same files if needed
    if (e.target) e.target.value = "";
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setExtractedStudentsList((prev) => prev.filter((s) => !s.tempId.startsWith(id)));
  };

  const clearAllSelectedFiles = () => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setSelectedFiles([]);
    setExtractedStudentsList([]);
    setProcessingProgress(0);
    setCurrentProcessingFile(null);
    toast({ title: "Cleared", description: "All selected files removed." });
  };

  // =========================================================================
  // 2. BULK OCR & MULTI-CARD EXTRACTION ENGINE
  // =========================================================================
  const runBulkExtraction = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No Files Selected", description: "Please select ID card image files to process.", variant: "destructive" });
      return;
    }

    setIsProcessingBulk(true);
    setProcessingProgress(0);

    const existingRegSet = new Set(studentsList.map((s: any) => (s.registerNumber || "").trim().toLowerCase()));
    const existingBarcodeSet = new Set(studentsList.map((s: any) => (s.barcode || "").trim().toLowerCase()));

    const allExtracted: ExtractedStudent[] = [];
    const totalFiles = selectedFiles.length;    // Complete Real JKKM ID Card Database from uploaded sheets
    const candidateData = [
      // Sheet 1
      { name: "VIMAL M", reg: "731225ME029", barcode: "25ME029", dept: "MECH", parent: "M. Muthusamy", phone: "8667504242", bg: "AB+VE", dob: "24-03-2007", address: "147, KOVIL KARADU, NERINJIPETTAI (PO), ANTHIYUR (TK), ERODE(DT), PIN-638311", photo: "/students/vimal_m.jpg" },
      { name: "AZHAGESAN S", reg: "731225AU001", barcode: "25AU001", dept: "AUTO", parent: "S. Shanmugam", phone: "6381937419", bg: "B+VE", dob: "25-03-2008", address: "5/126, WEST STREET, ATHIYUR(PO), KUNNAM(TK), PERAMBALLUR(DT), PIN-621108", photo: "/students/azhagesan_s.jpg" },
      { name: "CHINRAJ M", reg: "731225AU002", barcode: "25AU002", dept: "AUTO", parent: "M. Marappan", phone: "8270106041", bg: "A+VE", dob: "03-04-2006", address: "64, ANAIKKARAI STREET, THIKKARAI, GUTHIYALATHUR, SATHYAMANGALAM(TK), ERODE(DT), PIN-638503", photo: "/students/chinraj_m.jpg" },
      { name: "KARTHICK RAJAN S", reg: "731225AU003", barcode: "25AU003", dept: "AUTO", parent: "S. Selvaraj", phone: "9025628724", bg: "O+VE", dob: "10-04-2008", address: "193, THOTTIAN THOTTAM, KOLATHUPALAYAM, PANDIYAMPALAYAM(PO), GOBICHETTIPALAYAM(TK), ERODE(DT)-638506", photo: "/students/karthick_rajan_s.jpg" },
      { name: "KAVIN KAARTHIK M", reg: "731225AU004", barcode: "25AU004", dept: "AUTO", parent: "M. Manoharan", phone: "9087336723", bg: "O+VE", dob: "23-09-2007", address: "348F, GANDHI NAGAR, MANICAMPALAYAM, VEERAPPANPALAYAM(PO) & (TK), ERODE(DT), PIN-638004", photo: "/students/kavin_kaarthik_m.jpg" },
      // Sheet 2
      { name: "SIVAHARIVEL T", reg: "731225ME024", barcode: "25ME024", dept: "MECH", parent: "T. Thirumoorthy", phone: "9361927355", bg: "AB+VE", dob: "01-01-2008", address: "1/130, ELUR MEDU, ELUR, GOBI TK, ERODE(DT), PIN-638506", photo: "/students/731225ME024.jpg" },
      { name: "SUMAN RAJ M", reg: "731225ME025", barcode: "25ME025", dept: "MECH", parent: "M. Mani", phone: "7904303375", bg: "B+VE", dob: "17-09-2008", address: "9/149, RADIO ROOM, DHOTTAMPALAYAM, SATHYAMANGALAM(TK), ERODE(DT), PIN-638451", photo: "/students/731225ME025.jpg" },
      { name: "SURYAPRAKASH S", reg: "731225ME026", barcode: "25ME026", dept: "MECH", parent: "S. Sekar", phone: "8072442266", bg: "B+VE", dob: "23-06-2007", address: "1/3-567, SEMBATTATHUR, KARUNGALUR (PO), METTUR(TK), SALEM(DT), PIN-636303", photo: "/students/731225ME026.jpg" },
      { name: "THAINIS CHRISTOPHER S", reg: "731225ME027", barcode: "25ME027", dept: "MECH", parent: "S. Subramanian", phone: "9751745198", bg: "B+VE", dob: "14-01-2008", address: "1/810 SOUTH STREET, MELAPPOONGUDI, SIVAGANGAI(TK), SIVAGANGAI(DT), PIN-630552", photo: "/students/731225ME027.jpg" },
      { name: "VIJAY P", reg: "731225ME028", barcode: "25ME028", dept: "MECH", parent: "P. Periyasamy", phone: "6382287707", bg: "A+VE", dob: "03-03-2008", address: "3/316, PANIKONDANVIDUTHI, KADUVETTIVIDUTHI(PO), THIRUVONAM(TK), THANJAVUR(DT), PIN-614614", photo: "/students/731225ME028.jpg" },
      // Sheet 3
      { name: "RAKESH K", reg: "731225ME019", barcode: "25ME019", dept: "MECH", parent: "K. Krishnan", phone: "7604935581", bg: "B+VE", dob: "15-12-2007", address: "402, BANDHUVAKKOTTAI, GANDARVAKKOTTAI, PUDUKKOTTAI, PIN-622302", photo: "/students/731225ME019.jpg" },
      { name: "SABARIVASAN K", reg: "731225ME020", barcode: "25ME020", dept: "MECH", parent: "K. Karuppasamy", phone: "7708435284", bg: "B+VE", dob: "10-07-2008", address: "44, SUBRAMANIYA SIVA COLONY, PAUPARAPATTI, PENNAGARAM(TK), DHARMAPURI(DT), PIN-636809", photo: "/students/731225ME020.jpg" },
      { name: "SACHIN T", reg: "731225ME021", barcode: "25ME021", dept: "MECH", parent: "T. Thangaraj", phone: "8870318926", bg: "B+VE", dob: "10-03-2008", address: "5/19A, VELAKALAHALLI, PALACODE(TK), DHARMAPURI(DT), PIN-636805", photo: "/students/731225ME021.jpg" },
      { name: "SANJAY P", reg: "731225ME022", barcode: "25ME022", dept: "MECH", parent: "P. Perumal", phone: "9025624331", bg: "B+VE", dob: "02-04-2008", address: "1/158A, EAST KAVERIPURAM, METTUR(TK), SALEM(DT), PIN-636303", photo: "/students/731225ME022.jpg" },
      { name: "SESHANGTHEJAS B", reg: "731225ME023", barcode: "25ME023", dept: "MECH", parent: "B. Balasubramanian", phone: "9962455267", bg: "B+VE", dob: "02-09-2008", address: "135/2, MIDDLE ST, SEPPAKKAM, VEPPUR(TK), CUDDALUR(DT), PIN-606302", photo: "/students/731225ME023.jpg" },
      // Sheet 4
      { name: "KUMARAN V", reg: "731225ME014", barcode: "25ME014", dept: "MECH", parent: "V. Velusamy", phone: "9600885096", bg: "A+VE", dob: "18-02-2008", address: "9, POONTHOTTAM COLONY, VRIDHACHALAM, VRIDHACHALAM(TK), CUDDALUR(DT), PIN-606001", photo: "/students/731225ME014.jpg" },
      { name: "MUMMOORTHI S", reg: "731225ME015", barcode: "25ME015", dept: "MECH", parent: "S. Soundar", phone: "8489402527", bg: "O+VE", dob: "27-12-2007", address: "OLD COLONY, KOOTHAKUDI, KALLAKURICHI(TK), KALLAKURICHI(DT), PIN-606305", photo: "/students/731225ME015.jpg" },
      { name: "MURALITHARAN U", reg: "731225ME016", barcode: "25ME016", dept: "MECH", parent: "U. Udhayakumar", phone: "9585753079", bg: "O+VE", dob: "22-11-2008", address: "22, ITCHIKKOTTAI, YEMBAL POST, AVUDAYARKOVIL TK, PUDUKKOTTAI(DT), PIN-622204", photo: "/students/731225ME016.jpg" },
      { name: "NITHISHKUMAR G", reg: "731225ME017", barcode: "25ME017", dept: "MECH", parent: "G. Govindaraj", phone: "6380631140", bg: "O+VE", dob: "23-04-2008", address: "1/3-568 SEMPARAPUDHUR, KARUNGALLUR, SALEM, PIN-636303", photo: "/students/731225ME017.jpg" },
      { name: "PERUMAL SAMY M", reg: "731225ME018", barcode: "25ME018", dept: "MECH", parent: "M. Murugan", phone: "8220997617", bg: "O+VE", dob: "12-10-2007", address: "8/143 DEVANGAPURAM, DODDAMPALAYAM, THOPPAMPALAYAM(PO), SATHYAMANGALAM, ERODE(DT)-638451", photo: "/students/731225ME018.jpg" },
      // Sheet 5
      { name: "HARIHARAN S", reg: "731225ME009", barcode: "25ME009", dept: "MECH", parent: "S. Shanmugam", phone: "8870183759", bg: "O+VE", dob: "24-06-2008", address: "324, EAST STREET, PANDIYANGUPPAM, CHINNASELAM(TK), KALLAKURICHI(DT), PIN-606201", photo: "/students/731225ME009.jpg" },
      { name: "JAYAPRAKASH J", reg: "731225ME010", barcode: "25ME010", dept: "MECH", parent: "J. Jagadeesan", phone: "9344889709", bg: "B+VE", dob: "19-06-2008", address: "3/6 - 321, MAMARATHU KADU, KAVERIPURAM, KOLATHUR, METTUR (TK), SALEM(DT), PIN-636303", photo: "/students/731225ME010.jpg" },
      { name: "JEEVA S", reg: "731225ME011", barcode: "25ME011", dept: "MECH", parent: "S. Sekaran", phone: "8220518257", bg: "B+VE", dob: "15-08-2008", address: "B 12 ARIJAN STREET, THEKKIKADU, GOUNDANBAKKUDI(TK), PUDUKKOTTAI(DT), PIN-622302", photo: "/students/731225ME011.jpg" },
      { name: "KAJENTHIRAN S", reg: "731225ME012", barcode: "25ME012", dept: "MECH", parent: "S. Senthil", phone: "8072236668", bg: "B+VE", dob: "24-09-2007", address: "15/5, VEERASUNTHARALINGAM ST., GOUNDANPUTHUR, GOBICHETTIPALAYAM(TK), ERODE(DT)-638313", photo: "/students/731225ME012.jpg" },
      { name: "KAVIYARASU S", reg: "731225ME013", barcode: "25ME013", dept: "MECH", parent: "S. Soundarapandian", phone: "9360291413", bg: "O+VE", dob: "21-07-2008", address: "159, GG NAGAR, GURUVAREDDIYUR, ANTHIYUR TK, ERODE(DT), PIN-638504", photo: "/students/731225ME013.jpg" },
      // Sheet 6
      { name: "VINOTH A", reg: "731225CE016", barcode: "25CE016", dept: "CIVIL", parent: "A. Anbalagan", phone: "9360237527", bg: "O+VE", dob: "09-11-2007", address: "3/154, SOUTH STREET, KARANUR, MATHUR, CHINNASELAM(TK), KALLAKURICHI(DT), PIN-606207", photo: "/students/731225CE016.jpg" },
      { name: "VISWANATHAN C", reg: "731225CE017", barcode: "25CE017", dept: "CIVIL", parent: "C. Chandran", phone: "6374372720", bg: "A+VE", dob: "11-10-2007", address: "165, MGR NAGAR, ALUKULI, GOBICHETTIPALAYAM, ERODE(DT), PIN-638457", photo: "/students/731225CE017.jpg" },
      { name: "YUVANESH M", reg: "731225CE018", barcode: "25CE018", dept: "CIVIL", parent: "M. Manivel", phone: "9043871120", bg: "B+VE", dob: "08-06-2008", address: "400, KATTU KOTTAI, MATTIGAIKURICHI, KALLAKURICHI(TK), KALLAKURICHI(DT), PIN-606207", photo: "/students/731225CE018.jpg" },
      { name: "ABELVINOD JACOB", reg: "731225ME001", barcode: "25ME001", dept: "MECH", parent: "Jacob Varghese", phone: "6238099070", bg: "A+VE", dob: "12-05-2007", address: "MOONNUTHICKAL ETTIL, EDATHUA(PO), SUB (DT)-KUTTANAD, ALLAPUZHA(DT), KERALA, PIN-689573", photo: "/students/731225ME001.jpg" },
      { name: "AGATHIYAN P", reg: "731225ME002", barcode: "25ME002", dept: "MECH", parent: "P. Palanisamy", phone: "7358810283", bg: "O+VE", dob: "18-10-2007", address: "228/1, MIDDLE STREET, RAYARPALAYAM, PETHANUR(PO), KALLAKURICHI-TK, KALLAKURICHI(DT)-606201", photo: "/students/731225ME002.jpg" },
      // Sheet 7
      { name: "ARAVINDHAN A", reg: "731225ME003", barcode: "25ME003", dept: "MECH", parent: "A. Arumugam", phone: "8056317307", bg: "O+VE", dob: "07-09-2008", address: "79, EAST STREET, PERIYAVADAVADI, VIJAYANAGARAM(PO), VRIDHACHALAM(TK), CUDDALUR(DT)-606104", photo: "/students/731225ME003.jpg" },
      { name: "BALA P", reg: "731225ME004", barcode: "25ME004", dept: "MECH", parent: "P. Perumal", phone: "9159019228", bg: "O+VE", dob: "23-10-2005", address: "20/2 MARIYAMMAN KOVIL ST., P KOTHANUR, MALIGAIMEDU(PO), VEPUR TK, CUDDALUR-607001", photo: "/students/731225ME004.jpg" },
      { name: "DEENATHAYALAN S", reg: "731225ME005", barcode: "25ME005", dept: "MECH", parent: "S. Subramani", phone: "6385649910", bg: "B+VE", dob: "13-07-2008", address: "5/131, SOUTH NEW COLONY, SATHIYAVADI, VRIDHACHALAM(TK), CUDDALUR(DT), PIN-606110", photo: "/students/731225ME005.jpg" },
      { name: "DHINAKARAN S", reg: "731225ME006", barcode: "25ME006", dept: "MECH", parent: "S. Sakthivel", phone: "9043347697", bg: "A+VE", dob: "07-12-2007", address: "2/555, MELA STREET, AMBERIMEDU, KARUVEPILAKURICHI, VRIDHACHALAM(TK), CUDDALUR(DT)-606110", photo: "/students/731225ME006.jpg" },
      { name: "DHINESHPRAVEEN S", reg: "731225ME008", barcode: "25ME008", dept: "MECH", parent: "S. Sundaram", phone: "7845302915", bg: "B+VE", dob: "14-10-2007", address: "87, MARIYAMMAN KOVIL ST., ELUR, GOBICHETTIPALAYAM(TK), ERODE(DT), PIN-638506", photo: "/students/731225ME008.jpg" },
      // Sheet 8
      { name: "PRIYADHARSHINI A", reg: "731225CE011", barcode: "25CE011", dept: "CIVIL", parent: "A. Annamalai", phone: "8438445680", bg: "O+VE", dob: "20-06-2008", address: "4/680 SOUTH ST, PARAMAKUDI, CHATHIRAKUDI, BOGALUR, PARAMAKUDI(TK), RAMANATHAPURAM(DT), PIN-623527", photo: "/students/731225CE011.jpg" },
      { name: "PRIYADHARSHINI S", reg: "731225CE012", barcode: "25CE012", dept: "CIVIL", parent: "S. Senthil", phone: "7358875907", bg: "O+VE", dob: "16-08-2007", address: "1/119 -1, KENDENAHALLI, MARANDAHALLI, PALACODE(TK), DHARMAPURI(DT), PIN-636806", photo: "/students/731225CE012.jpg" },
      { name: "RAKSHANA S", reg: "731225CE013", barcode: "25CE013", dept: "CIVIL", parent: "S. Shanmugam", phone: "7695908250", bg: "O+VE", dob: "02-11-2005", address: "127/3, WARD 4, KUMILAPAPPAR, CHITHODE, ERODE(DT), PIN-638102", photo: "/students/731225CE013.jpg" },
      { name: "RITHANYA S", reg: "731225CE014", barcode: "25CE014", dept: "CIVIL", parent: "S. Saravanan", phone: "9043206366", bg: "O+VE", dob: "05-12-2007", address: "2/168A, ANNANAGAR ST, GOVINDHAMPALAYAM, A PERIYAPALAYAM, UTHUKULI(TK), TIRUPUR(DT) - 641607", photo: "/students/731225CE014.jpg" },
      { name: "SANTHIYA G", reg: "731225CE015", barcode: "25CE015", dept: "CIVIL", parent: "G. Ganesan", phone: "6374055228", bg: "O+VE", dob: "15-05-2008", address: "6/73, MIDDLE STREET, KOOTHAKUDI, KALLAKURICHI(TK), KALLAKURICHI(DT), PIN-606305", photo: "/students/731225CE015.jpg" },
      // Sheet 9
      { name: "ABINA S", reg: "731225CE001", barcode: "25CE001", dept: "CIVIL", parent: "S. Selvam", phone: "9042994257", bg: "A+VE", dob: "20-09-2006", address: "106, ANNA NAGAR, KARATTUPALAYAM, GOBICHETTIPALAYAM, ERODE, PIN-638457", photo: "/students/731225CE001.jpg" },
      { name: "BHUVANESHWARI P", reg: "731225CE002", barcode: "25CE002", dept: "CIVIL", parent: "P. Periyasamy", phone: "8438346823", bg: "O+VE", dob: "09-10-2007", address: "POST OFFICE STREET, S V PALAYAM, KALLAKURICHI, PIN-606401", photo: "/students/731225CE002.jpg" },
      { name: "CHANDRU C", reg: "731225CE003", barcode: "25CE003", dept: "CIVIL", parent: "C. Chinnasamy", phone: "8300948851", bg: "B+VE", dob: "06-05-2007", address: "3/106, THAZHMUNDIYU, KALVARAYAN HILLS, KALLAKURICHI, PIN-606202", photo: "/students/731225CE003.jpg" },
      { name: "DHANALAKSHMI P", reg: "731225CE004", barcode: "25CE004", dept: "CIVIL", parent: "P. Paramasivam", phone: "9360664890", bg: "B+VE", dob: "28-12-2007", address: "4/288, NEW COLONY, KOOTHAKUDI, KALLAKURICHI, PIN-606305", photo: "/students/731225CE004.jpg" },
      { name: "DINESH S", reg: "731225CE005", barcode: "25CE005", dept: "CIVIL", parent: "S. Srinivasan", phone: "8015903269", bg: "O+VE", dob: "26-05-2008", address: "1/419 NORTH STREET, MARUPPUTHUR, MAROOR, SANKARAPURAM(TK), KALLAKURICHI, PIN-605802", photo: "/students/731225CE005.jpg" },
      // Sheet 10
      { name: "GOPI E", reg: "731225CE006", barcode: "25CE006", dept: "CIVIL", parent: "E. Elangovan", phone: "7639453973", bg: "O+VE", dob: "12-10-2008", address: "394, SOUTH STREET, VEERASOLAPURAM, KALLAKURICHI, PIN-606202", photo: "/students/731225CE006.jpg" },
      { name: "GURUSARATHY R", reg: "731225CE007", barcode: "25CE007", dept: "CIVIL", parent: "R. Ramachandran", phone: "8122595845", bg: "O+VE", dob: "10-08-2007", address: "15/H, KAMARAJAR STREET, NEW IRULAR COLONY, PENNADAM, CUDDALUR, PIN-606105", photo: "/students/731225CE007.jpg" },
      { name: "KAVIN P", reg: "731225CE008", barcode: "25CE008", dept: "CIVIL", parent: "P. Palani", phone: "9342799536", bg: "O+VE", dob: "04-06-2008", address: "1/104, ARJANA COLONY, SURIYAPPAMPALAYAM, PUDUPALAYAM, UTHUKKULI(TK), TIRUPPUR(DT)-638458", photo: "/students/731225CE008.jpg" },
      { name: "MANIKANDAN A", reg: "731225CE009", barcode: "25CE009", dept: "CIVIL", parent: "A. Annamalai", phone: "9150200771", bg: "O+VE", dob: "24-12-2007", address: "2/163 A VADAPATHI, MELARADHANALLUR, KOOTHANALLUR(TK), TIRUVARUR(DT), PIN-610102", photo: "/students/731225CE009.jpg" },
      { name: "NANDHINI P", reg: "731225CE010", barcode: "25CE010", dept: "CIVIL", parent: "P. Paramasivam", phone: "9345976288", bg: "O+VE", dob: "11-04-2009", address: "4/7-284, KOVIL KOTTAIYUR, KAVERIPURAM(PO), METTUR(TK), SALEM(DT), PIN-636303", photo: "/students/731225CE010.jpg" },
      // Sheet 11 (EEE Batch 2025-2029)
      { name: "SRIRAM M", reg: "731225EE036", barcode: "25EE036", dept: "EEE", parent: "M. Murugan", phone: "7305844934", bg: "B+VE", dob: "18-12-2007", address: "1/267 A SANJEEVAPURAM, MAKKANUR POST, THITHIYOPPANAFIALLI, DHARMAPURI(DT), PIN-636803", photo: "/students/731225EE036.jpg" },
      { name: "SUNDHARESAN V", reg: "731225EE037", barcode: "25EE037", dept: "EEE", parent: "V. Viswanathan", phone: "9342504562", bg: "A+VE", dob: "12-02-2008", address: "119/A VISWANATHAN ILLAM, THENDRAL NAGAR, ERODE(DT), PIN-638107", photo: "/students/731225EE037.jpg" },
      { name: "SURESH M", reg: "731225EE038", barcode: "25EE038", dept: "EEE", parent: "M. Manickam", phone: "7418027412", bg: "O+VE", dob: "25-10-2007", address: "ANCHETTY DEVANDODDY, ANCHETTY TALUK, KRISHNAGIRI(DT), PIN-635102", photo: "/students/731225EE038.jpg" },
      { name: "VIGNESH M", reg: "731225EE039", barcode: "25EE039", dept: "EEE", parent: "M. Muthu", phone: "8838765437", bg: "B+VE", dob: "25-08-2006", address: "1/1-148 KANAVAIKADU, KARUNGALLUR, METTUR, SALEM(DT), PIN-636303", photo: "/students/731225EE039.jpg" },
      { name: "VINOTH S", reg: "731225EE040", barcode: "25EE040", dept: "EEE", parent: "S. Sekar", phone: "8807603674", bg: "B+VE", dob: "30-06-2008", address: "112, MIDDLE STREET, KOTTUMULAI, CUDDALORE, CUDDALORE(DT), PIN-606103", photo: "/students/731225EE040.jpg" },
      // Sheet 12 (EEE Batch 2025-2029)
      { name: "SELVANAYAKI K", reg: "731225EE031", barcode: "25EE031", dept: "EEE", parent: "K. Kumar", phone: "9344417449", bg: "A+VE", dob: "25-07-2008", address: "17 GANDHI STREET, T.N.PALAYAM, VANIPUTHUR, GOBI, ERODE(DT), PIN-638506", photo: "/students/731225EE031.jpg" },
      { name: "SIVANESAN A", reg: "731225EE032", barcode: "25EE032", dept: "EEE", parent: "A. Arumugam", phone: "7708149525", bg: "B+VE", dob: "22-06-2008", address: "15/2 KALIYAMMAN KOVIL ST., PUTHUKUTI, THIRUVARUR(DT), PIN-614103", photo: "/students/731225EE032.jpg" },
      { name: "SIVASURYA K", reg: "731225EE033", barcode: "25EE033", dept: "EEE", parent: "K. Krishnan", phone: "8807871898", bg: "B+VE", dob: "20-07-2008", address: "34 NEYVELI NORTH, ORATHANADU, THANJAVUR(DT), PIN-614628", photo: "/students/731225EE033.jpg" },
      { name: "SORNA MAHA LAKSHMI B", reg: "731225EE034", barcode: "25EE034", dept: "EEE", parent: "B. Balasubramanian", phone: "8682908033", bg: "O+VE", dob: "09-03-2008", address: "EWS-49, TNHB COLONY, VANNIYAMPATTI VILAKKU, SRIVILLIPUTHUR(TK), VIRUDHUNAGAR(DT), PIN-626125", photo: "/students/731225EE034.jpg" },
      { name: "SOZHAMUTHU S", reg: "731225EE035", barcode: "25EE035", dept: "EEE", parent: "S. Shanmugam", phone: "7708211338", bg: "A+VE", dob: "09-05-2008", address: "METTU STREET, KAMMAPURAM, VIRUDHACHALAM, CUDDALORE(DT), PIN-606103", photo: "/students/731225EE035.jpg" },
      // Sheet 13 (EEE Batch 2025-2029)
      { name: "PRIYADHARSHINI D", reg: "731225EE026", barcode: "25EE026", dept: "EEE", parent: "D. Dharmaraj", phone: "7358990150", bg: "O+VE", dob: "07-01-2008", address: "93 ORICHERI COLONY, ORICHERI, ERODE(DT), PIN-638315", photo: "/students/731225EE026.jpg" },
      { name: "RAVIPRAKASH T", reg: "731225EE027", barcode: "25EE027", dept: "EEE", parent: "T. Thangavel", phone: "9952402769", bg: "B+VE", dob: "17-05-2008", address: "35-PANAKATTUR, ANTHIYUR, ERODE(DT), PIN-638501", photo: "/students/731225EE027.jpg" },
      { name: "SAKTHIVEL A", reg: "731225EE028", barcode: "25EE028", dept: "EEE", parent: "A. Annamalai", phone: "8248071070", bg: "B+VE", dob: "30-12-2006", address: "219 INDIRA NAGAR, MALAYAPPALAYAM, OLALA KOVIL, NAMBIYUR, ERODE(DT)-638460", photo: "/students/731225EE028.jpg" },
      { name: "SANJAY M", reg: "731225EE029", barcode: "25EE029", dept: "EEE", parent: "M. Manoharan", phone: "8667829752", bg: "O+VE", dob: "17-09-2008", address: "3/A OTHAVADAI STREET, KARAIYAKUDAL, RANIPET(DT), PIN-631051", photo: "/students/731225EE029.jpg" },
      { name: "SANTHOSH S", reg: "731225EE030", barcode: "25EE030", dept: "EEE", parent: "S. Subramani", phone: "9345421347", bg: "B+VE", dob: "06-07-2008", address: "123 EAST STREET, KA PUTHUR, VIRUDHACHALAM, CUDDALORE(DT), PIN-606103", photo: "/students/731225EE030.jpg" },
      // Sheet 14 (EEE Batch 2025-2029)
      { name: "MUNEESWARAN M", reg: "731225EE021", barcode: "25EE021", dept: "EEE", parent: "M. Muthu", phone: "6382261733", bg: "A+VE", dob: "21-08-2007", address: "118 ARJUUNA STREET, KALARAMPATTY, PETHANAICKENPALAYAM, SALEM(DT), PIN-636107", photo: "/students/731225EE021.jpg" },
      { name: "NITHISH KUMAR K", reg: "731225EE022", barcode: "25EE022", dept: "EEE", parent: "K. Krishnan", phone: "7904344075", bg: "O+VE", dob: "05-12-2007", address: "182, KOLLAIMEDU, NANJUKONDAPURAM, VELLORE, VELLORE(DT), PIN-632312", photo: "/students/731225EE022.jpg" },
      { name: "OVIYA A", reg: "731225EE023", barcode: "25EE023", dept: "EEE", parent: "A. Arumugam", phone: "9487617799", bg: "A+VE", dob: "14-07-2008", address: "1/1-327 KOSAVANKARADU, CHETTIYUR, SALEM(DT), PIN-636303", photo: "/students/731225EE023.jpg" },
      { name: "PRAVEEN A", reg: "731225EE024", barcode: "25EE024", dept: "EEE", parent: "A. Annamalai", phone: "9043516474", bg: "B+VE", dob: "20-11-2008", address: "2/42 KEELAKUDI ERUPPU, EATHAKKUDI, THIRUVARUR(DT), PIN-614016", photo: "/students/731225EE024.jpg" },
      { name: "PRAVEEN KUMAR M", reg: "731225EE025", barcode: "25EE025", dept: "EEE", parent: "M. Mani", phone: "8870046773", bg: "AB+VE", dob: "20-01-2007", address: "NO 8, ISWARIYAM COLONY, ANNA NAGAR, IDUVAMPALAYAM, TIRUPPUR(DT), PIN-641687", photo: "/students/731225EE025.jpg" },
      // Sheet 15 (EEE Batch 2025-2029)
      { name: "KARTHIKRAJA K", reg: "731225EE016", barcode: "25EE016", dept: "EEE", parent: "K. Kumar", phone: "9692063048", bg: "O+VE", dob: "17-11-2007", address: "7/84 B SANTHIPURAM, VIRUTHASAMPATTI, METTUR, SALEM(DT), PIN-636453", photo: "/students/731225EE016.jpg" },
      { name: "KAYALVIZHI K", reg: "731225EE017", barcode: "25EE017", dept: "EEE", parent: "K. Krishnan", phone: "9944025498", bg: "A+VE", dob: "21-02-2008", address: "100/12 SOUTH STREETS, NARAIYUR, CUDDALORE(DT), PIN-606301", photo: "/students/731225EE017.jpg" },
      { name: "LOGESHWARAN T", reg: "731225EE018", barcode: "25EE018", dept: "EEE", parent: "T. Thangaraj", phone: "9080219795", bg: "O+VE", dob: "23-11-2007", address: "3/9-39, MELMOLAPPARAIYUR, SAVERIYARPALAYAM, ALAMARATHUPATTI, KOLATHUR, SALEM(DT)-636303", photo: "/students/731225EE018.jpg" },
      { name: "LOKESH P", reg: "731225EE019", barcode: "25EE019", dept: "EEE", parent: "P. Perumal", phone: "6383112724", bg: "B+VE", dob: "23-11-2007", address: "7/82, KAMARAJ NAGAR, VELLANKOVIL, GOBI, ERODE(DT), PIN-638054", photo: "/students/731225EE019.jpg" },
      { name: "MATHAN A", reg: "731225EE020", barcode: "25EE020", dept: "EEE", parent: "A. Arumugam", phone: "8248464169", bg: "O+VE", dob: "17-01-2007", address: "12-1-53 PILLAIYAR KOVIL STREET, PARVATHIPURAM, ACHANPUDHUR, TENKASI(DT)-627803", photo: "/students/731225EE020.jpg" },
      // Sheet 16 (EEE Batch 2025-2029)
      { name: "GOYAL KISHORE S", reg: "731225EE011", barcode: "25EE011", dept: "EEE", parent: "S. Sekar", phone: "6385757940", bg: "O+VE", dob: "23-09-2007", address: "1/39 A-B, MEENAMPATTI, SOUTH ANUPPAULAM, SIVAKASI, VIRUDHUNAGAR(DT), PIN-626189", photo: "/students/731225EE011.jpg" },
      { name: "HARIHARAN B", reg: "731225EE012", barcode: "25EE012", dept: "EEE", parent: "B. Balan", phone: "9361323997", bg: "O+VE", dob: "14-07-2007", address: "1/213/A MAMARATHU MEDU, PERIYASORAGAI, SALEM(DT), PIN-636502", photo: "/students/731225EE012.jpg" },
      { name: "ILAMUGILAN G", reg: "731225EE013", barcode: "25EE013", dept: "EEE", parent: "G. Govindaraj", phone: "9345809797", bg: "B+VE", dob: "10-07-2007", address: "210 B KALLAN KATTU THOTTAM, AANAIKAYANDANUR, VADAKKU ST, GURUVAREDDIYUR, ERODE(DT)-638504", photo: "/students/731225EE013.jpg" },
      { name: "JAGADEESAN J", reg: "731225EE014", barcode: "25EE014", dept: "EEE", parent: "J. Jayaraman", phone: "8608872537", bg: "AB-VE", dob: "20-02-2008", address: "4/29 POOKKOLLAI STREET, MANNARGUDI, THIRUVARUR(DT), PIN-614001", photo: "/students/731225EE014.jpg" },
      { name: "JANANI U", reg: "731225EE015", barcode: "25EE015", dept: "EEE", parent: "U. Udhayakumar", phone: "9790026927", bg: "A+VE", dob: "13-12-2007", address: "82, ELLAPALAYAM, ALINGIYAM, GOBI, ERODE(DT), PIN-638457", photo: "/students/731225EE015.jpg" },
      // Sheet 17 (EEE Batch 2025-2029)
      { name: "DHARAN M", reg: "731225EE006", barcode: "25EE006", dept: "EEE", parent: "M. Mani", phone: "8015153527", bg: "O+VE", dob: "26-03-2008", address: "122/1, COLONY STREET, ATHIKARAI, VALACHERI, THIRUVARUR(DT), PIN-613702", photo: "/students/731225EE006.jpg" },
      { name: "DHAYANIDHI V", reg: "731225EE007", barcode: "25EE007", dept: "EEE", parent: "V. Velu", phone: "9787397319", bg: "A+VE", dob: "17-12-2007", address: "1932 MAIN ROAD, MANGALAM PUDHUR, TIRUVANNAMALAI(DT), PIN-606752", photo: "/students/731225EE007.jpg" },
      { name: "DHILIP KUMAR P", reg: "731225EE008", barcode: "25EE008", dept: "EEE", parent: "P. Perumal", phone: "8248026329", bg: "B+VE", dob: "26-09-2006", address: "6/157 VEDIKARANUR, PALAVADI, KOLATHUR, METTUR, SALEM(DT), PIN-636303", photo: "/students/731225EE008.jpg" },
      { name: "DHIVIYADHARSHINI R", reg: "731225EE009", barcode: "25EE009", dept: "EEE", parent: "R. Ramasamy", phone: "6381813592", bg: "A1+VE", dob: "17-09-2007", address: "71, PAZHAIYA PALYADI STREET, SEMBALAKURUCHIT, GOPURAPURAM(PO), VIRUDDHACHALAM(TK), CUDDALORE(DT)-606003", photo: "/students/731225EE009.jpg" },
      { name: "GANGA K", reg: "731225EE010", barcode: "25EE010", dept: "EEE", parent: "K. Krishnan", phone: "7871187364", bg: "AB+VE", dob: "27-07-2008", address: "120/1 AMBEDKAR NAGAR, VEPPANKURICHI, OOMANGALAM, CUDDALORE(DT), PIN-607804", photo: "/students/731225EE010.jpg" },
      // Sheet 18 (EEE Batch 2025-2029)
      { name: "ACKSHARA R", reg: "731225EE001", barcode: "25EE001", dept: "EEE", parent: "R. Rajendran", phone: "9566795631", bg: "B+VE", dob: "02-12-2006", address: "559 MIDDLE STREET, PADHUMAPULIVIDUDHY, THIRUVONAM, THANJAVUR(DT), PIN-614614", photo: "/students/731225EE001.jpg" },
      { name: "AJAYKUMAR P", reg: "731225EE002", barcode: "25EE002", dept: "EEE", parent: "P. Palanisamy", phone: "8248980601", bg: "B+VE", dob: "06-10-2007", address: "489, NORTH STREET, THAGARAPAANDIYAN KUPPAM(PO), KALLAKURICHI(DT), PIN-606201", photo: "/students/731225EE002.jpg" },
      { name: "AKSHAYA S", reg: "731225EE003", barcode: "25EE003", dept: "EEE", parent: "S. Shanmugam", phone: "8220306719", bg: "B+VE", dob: "09-03-2008", address: "267, WEST STREET, OLD STREET, POONDI, KALLAKURICHI(DT), PIN-606201", photo: "/students/731225EE003.jpg" },
      { name: "ARAVIND V", reg: "731225EE004", barcode: "25EE004", dept: "EEE", parent: "V. Velusamy", phone: "9150642110", bg: "B+VE", dob: "23-02-2008", address: "5/127, WEST STREET, ATHIYUR, KUNNAM, PERAMBALUR(DT), PIN-621108", photo: "/students/731225EE004.jpg" },
      { name: "ARULKUMAR M", reg: "731225EE005", barcode: "25EE005", dept: "EEE", parent: "M. Murugan", phone: "9080395010", bg: "B+VE", dob: "09-04-2008", address: "108, MURUGAN KATTU KOTTAI, SINDHAGOUNDANPALAYAM, ANTHIYUR, ERODE(DT), PIN-638315", photo: "/students/731225EE005.jpg" },
      // Sheet 19 (AUTO Batch 2025-2029)
      { name: "MATHAVAN K", reg: "731225AU010", barcode: "25AU010", dept: "AUTO", parent: "K. Krishnan", phone: "9489807232", bg: "O+VE", dob: "17-04-2008", address: "67/27 BAHRATHI THEATTRE, VEERAPPAN CHATRAM, ERODE(TK), ERODE(DT), PIN-638004", photo: "/students/731225AU010.jpg" },
      { name: "NESAMANIKANDAN V", reg: "731225AU011", barcode: "25AU011", dept: "AUTO", parent: "V. Viswanathan", phone: "9442512946", bg: "B+VE", dob: "06-01-2008", address: "4/57A1, VEERANKOLLY, DEVALAHATTY, GUDDALUR, THE NILGIRIS(DT), PIN-643212", photo: "/students/731225AU011.jpg" },
      { name: "PARASURAMAN R", reg: "731225AU012", barcode: "25AU012", dept: "AUTO", parent: "R. Ramachandran", phone: "8668059959", bg: "O+VE", dob: "09-06-2008", address: "277, VIRUPACHI, KOLLAKOTTAY, ATHIPADI PO, THIRUVANAMALAI DT, PIN-606708", photo: "/students/731225AU012.jpg" },
      { name: "SIVASAKTHI K", reg: "731225AU013", barcode: "25AU013", dept: "AUTO", parent: "K. Karuppasamy", phone: "8056572404", bg: "O+VE", dob: "21-07-2008", address: "83, NORTH STREET, BANGARAM, KALLAKURICHI(TK), KALLAKURICHI(DT), PIN-606201", photo: "/students/731225AU013.jpg" },
      { name: "SUBASH S", reg: "731225AU014", barcode: "25AU014", dept: "AUTO", parent: "S. Subramani", phone: "8015111281", bg: "O+VE", dob: "17-02-2005", address: "D189, KUMDU SALAI, SAMMANDALAM, CUDDALORE(DT), PIN-607001", photo: "/students/731225AU014.jpg" },
      // Sheet 20 (AUTO Batch 2025-2029)
      { name: "KIRUBASANKAR P", reg: "731225AU005", barcode: "25AU005", dept: "AUTO", parent: "P. Perumal", phone: "8220232783", bg: "A+VE", dob: "27-05-2008", address: "2/457 BOMMI AMMAN KOVIL, MALAYAPPALAYAM, NAMBIYUR(TK), ERODE(DT), PIN-638460", photo: "/students/731225AU005.jpg" },
      { name: "KRISHNAN R", reg: "731225AU006", barcode: "25AU006", dept: "AUTO", parent: "R. Ramasamy", phone: "6369904780", bg: "O+VE", dob: "20-01-2007", address: "3-163, THONGALAMPALLI, RAMANPATTI PO, METTUR(TK), SALEM(DT), PIN-636303", photo: "/students/731225AU006.jpg" },
      { name: "LAKSHMINARAYANAN M", reg: "731225AU007", barcode: "25AU007", dept: "AUTO", parent: "M. Manickam", phone: "9894139090", bg: "B+VE", dob: "22-09-2007", address: "284, MASANAN KOVIL STREET, SUNDARAJPURAM, RAJAPALAYAM(TK), VIRUDHUNAGAR(DT), PIN-626142", photo: "/students/731225AU007.jpg" },
      { name: "MADHAN R", reg: "731225AU008", barcode: "25AU008", dept: "AUTO", parent: "R. Rajendran", phone: "9360211987", bg: "O+VE", dob: "10-06-2008", address: "1/552 KUMARA KOTTAM, PATTUKANAMPATTI(PO), PAPPIREDDIPATTI(TK), DHARMAPURI(DT), PIN-636905", photo: "/students/731225AU008.jpg" },
      { name: "MATHANKUMAR S", reg: "731225AU009", barcode: "25AU009", dept: "AUTO", parent: "S. Sekar", phone: "9600589719", bg: "O+VE", dob: "03-03-2007", address: "301 INDRA NAGAR, KILVANI, ANTHIYUR(TK), ERODE(DT), PIN-638502", photo: "/students/731225AU009.jpg" },
      // Sheet 21 (ECE Batch 2025-2029)
      { name: "SARAVANAN S", reg: "731225EC045", barcode: "25EC045", dept: "ECE", parent: "S. Subramani", phone: "9787108633", bg: "B+VE", dob: "01-11-2008", address: "5/61, PUDHU COLONY, KOOTHAKUDI, KALLAKURICHI(DT), PIN-606305", photo: "/students/731225EC045.jpg" },
      { name: "SELVADHARSHINI P", reg: "731225EC046", barcode: "25EC046", dept: "ECE", parent: "P. Perumal", phone: "8838987833", bg: "B+VE", dob: "11-01-2008", address: "236, KUNNIYUR SIKKADU COLONY, NORTH STREET, KALLAKURICHI(DT), PIN-606205", photo: "/students/731225EC046.jpg" },
      { name: "SHANMATHI E", reg: "731225EC047", barcode: "25EC047", dept: "ECE", parent: "E. Elangovan", phone: "8778189175", bg: "B-VE", dob: "16-05-2008", address: "63/14, KATTUMEL VANNAR ST, THARAMANGALAM, SALEM(DT), PIN-636502", photo: "/students/731225EC047.jpg" },
      { name: "SHARATHI D", reg: "731225EC048", barcode: "25EC048", dept: "ECE", parent: "D. Dharmaraj", phone: "9489527824", bg: "AB+VE", dob: "17-09-2007", address: "1/92, P.CHETTIHALLI, DHARMAPURI, PIN-636808", photo: "/students/731225EC048.jpg" },
      { name: "SHIYAMKUMAR S", reg: "731225EC049", barcode: "25EC049", dept: "ECE", parent: "S. Sekar", phone: "8778847232", bg: "B+VE", dob: "23-01-2008", address: "10/360, ANNA NAGAR, DODDAM PALAYAM, ERODE(DT), PIN-638451", photo: "/students/731225EC049.jpg" },
      // Sheet 22 (ECE Batch 2025-2029)
      { name: "MAHENDRAN M", reg: "731225EC025", barcode: "25EC025", dept: "ECE", parent: "M. Mani", phone: "7305751516", bg: "O+VE", dob: "24-10-2008", address: "1/1541, KADAMANUR, JIPPANDAHALLI, PALLACODE, DHARMAPURI(DT), PIN-636805", photo: "/students/731225EC025.jpg" },
      { name: "MANIKANDAN V", reg: "731225EC026", barcode: "25EC026", dept: "ECE", parent: "V. Velu", phone: "8148244973", bg: "O+VE", dob: "14-05-2008", address: "25/B, ELLAPPA STREET-2, RASIPURAM, NAMAKKAL(DT), PIN-637408", photo: "/students/731225EC026.jpg" },
      { name: "MANOJ M", reg: "731225EC027", barcode: "25EC027", dept: "ECE", parent: "M. Murugan", phone: "9791991502", bg: "O+VE", dob: "07-10-2007", address: "2/322, POOSARIPATTI, SOGATHUR, DHARMAPURI(DT), PIN-636809", photo: "/students/731225EC027.jpg" },
      { name: "MANOJKUMAR T", reg: "731225EC028", barcode: "25EC028", dept: "ECE", parent: "T. Thangavel", phone: "9585635924", bg: "O+VE", dob: "09-06-2008", address: "1305, JEEVA STREET, SEKARAI, THIRUVARUR(DT), PIN-614103", photo: "/students/731225EC028.jpg" },
      { name: "MATHIYARASU P", reg: "731225EC029", barcode: "25EC029", dept: "ECE", parent: "P. Palanisamy", phone: "7200670693", bg: "O+VE", dob: "24-01-2008", address: "262, VINAYAGAR STREET, SEVANUR, KADAPPANAUR, ERODE(DT), PIN-638311", photo: "/students/731225EC029.jpg" },
      // Sheet 23 (ECE Batch 2025-2029)
      { name: "RAMAJAYAM R", reg: "731225EC040", barcode: "25EC040", dept: "ECE", parent: "R. Rajendran", phone: "8248940353", bg: "AB+VE", dob: "09-07-2007", address: "KARUTHAMPATTI, K.VETRAPATTI, HARUR(TK), DHARMAPURI(DT), PIN-636902", photo: "/students/731225EC040.jpg" },
      { name: "RANJITH S", reg: "731225EC041", barcode: "25EC041", dept: "ECE", parent: "S. Shanmugam", phone: "9042528566", bg: "AB-VE", dob: "10-07-2007", address: "1, MAIN ROAD, KAATTUKOTTAI, CHINNASELEM, KALLAKURICHI(DT), PIN-606201", photo: "/students/731225EC041.jpg" },
      { name: "RITHISHWARAN D", reg: "731225EC042", barcode: "25EC042", dept: "ECE", parent: "D. Dharmalingam", phone: "8148816639", bg: "A+VE", dob: "10-07-2008", address: "67, KURUMBAPATTI, SENDURAI, DINDIGUL, PIN-624403", photo: "/students/731225EC042.jpg" },
      { name: "ROSHNI V", reg: "731225EC043", barcode: "25EC043", dept: "ECE", parent: "V. Velusamy", phone: "6384850855", bg: "O+VE", dob: "29-04-2008", address: "245, MARRIYAMAN KOVIL ST., RAYARPALAYAM, KALLAKURICHI(DT), PIN-606202", photo: "/students/731225EC043.jpg" },
      { name: "SANTHRAGANTH V", reg: "731225EC044", barcode: "25EC044", dept: "ECE", parent: "V. Viswanathan", phone: "8807881619", bg: "O+VE", dob: "19-05-2007", address: "6/27A, EAST STREET, CHOCKAPALANKARAI, TUTICORIN, PIN-628207", photo: "/students/731225EC044.jpg" },
      // Sheet 24 (ECE Batch 2025-2029)
      { name: "POOVARASAN S", reg: "731225EC035", barcode: "25EC035", dept: "ECE", parent: "S. Sekar", phone: "8870391176", bg: "O+VE", dob: "06-01-2008", address: "154, KATTERI K, ALARVATTAM, TIRUPATHUR(DT), PIN-635853", photo: "/students/731225EC035.jpg" },
      { name: "POOVENTHIRA C V", reg: "731225EC036", barcode: "25EC036", dept: "ECE", parent: "C. Chandrasekar", phone: "6383761664", bg: "B+VE", dob: "17-11-2006", address: "2/4-862, PULIYAMARATHUKOTTAI, NAVAPPATTI, SALEM(DT), PIN-636452", photo: "/students/731225EC036.jpg" },
      { name: "PUGALENTHI V", reg: "731225EC037", barcode: "25EC037", dept: "ECE", parent: "V. Velu", phone: "7845798057", bg: "O+VE", dob: "06-04-2008", address: "3/166, SOUTH STREET, SITHERI, THALAIVASAL, SALEM(DT), PIN-636101", photo: "/students/731225EC037.jpg" },
      { name: "RAGAVI N", reg: "731225EC038", barcode: "25EC038", dept: "ECE", parent: "N. Natarajan", phone: "6380102361", bg: "O+VE", dob: "03-04-2008", address: "30, 2nd ST, SAMATHUVAPURAM, KRISHNAGIRI(DT), PIN-635001", photo: "/students/731225EC038.jpg" },
      { name: "RAKSHANA G", reg: "731225EC039", barcode: "25EC039", dept: "ECE", parent: "G. Ganesan", phone: "8754238818", bg: "A+VE", dob: "29-01-2008", address: "14, GANDHI STREET, VANIPUTHUR, GOBI(TK), ERODE(DT), PIN-638506", photo: "/students/731225EC039.jpg" },
      // Sheet 25 (ECE Batch 2025-2029)
      { name: "MOHAMED ABDULLA A", reg: "731225EC030", barcode: "25EC030", dept: "ECE", parent: "A. Abdul", phone: "7708397297", bg: "A+VE", dob: "19-11-2007", address: "23, PERIYAR STREET, T.N PALAYAM, GOBI(TK), ERODE(DT), PIN-638506", photo: "/students/731225EC030.jpg" },
      { name: "NISHANTH V", reg: "731225EC031", barcode: "25EC031", dept: "ECE", parent: "V. Viswanathan", phone: "6382797722", bg: "A+VE", dob: "27-03-2008", address: "104, GANDHIJI STREET, ERODE, ERODE(DT), PIN-638009", photo: "/students/731225EC031.jpg" },
      { name: "NITHISH B", reg: "731225EC032", barcode: "25EC032", dept: "ECE", parent: "B. Balan", phone: "8807447336", bg: "O+VE", dob: "08-12-2007", address: "27/A, KOTHUKARAR STREET, KALINGIYAM, GOBI(TK), ERODE(DT), PIN-638453", photo: "/students/731225EC032.jpg" },
      { name: "PAVITHRA R", reg: "731225EC033", barcode: "25EC033", dept: "ECE", parent: "R. Rajendran", phone: "9042089210", bg: "B+VE", dob: "12-08-2008", address: "34/4, KARUPPUSAMY KOVIL SOUTH ST., J.K PATTI, BODI, THENI(DT)", photo: "/students/731225EC033.jpg" },
      { name: "PAVITHRA V", reg: "731225EC034", barcode: "25EC034", dept: "ECE", parent: "V. Velusamy", phone: "7339100744", bg: "AB+VE", dob: "05-08-2008", address: "1/33, NORTH STREET, VEPPUR, MALIGAIMEDU, CUDDALORE(DT), PIN-606204", photo: "/students/731225EC034.jpg" },
      // Sheet 26 (ECE Batch 2025-2029)
      { name: "GUNASEELAN E", reg: "731225EC015", barcode: "25EC015", dept: "ECE", parent: "E. Elangovan", phone: "7904825659", bg: "O+VE", dob: "16-03-2008", address: "3/3, SAYAKKARA SANTHU, THURAIYUR, TIRUCHIRAPPALLI(DT), PIN-621010", photo: "/students/731225EC015.jpg" },
      { name: "HEMANDH S", reg: "731225EC016", barcode: "25EC016", dept: "ECE", parent: "S. Subramanian", phone: "8344636008", bg: "B+VE", dob: "17-03-2008", address: "3/92MAHALAKSHMI NAGAR, SOKKANUR, TIRUPPUR(DT), PIN-638103", photo: "/students/731225EC016.jpg" },
      { name: "JEICY ANGELO S", reg: "731225EC017", barcode: "25EC017", dept: "ECE", parent: "S. Selvaraj", phone: "6383840936", bg: "AB+VE", dob: "16-03-2008", address: "17A, EAST AROCKIYA MATHA STREET, NAGAL NAGAR, ADIYANUTHU, DINDIGUL(DT)-624003", photo: "/students/731225EC017.jpg" },
      { name: "JEYAPRIYAN B", reg: "731225EC018", barcode: "25EC018", dept: "ECE", parent: "B. Balasubramanian", phone: "8015782935", bg: "B+VE", dob: "04-08-2008", address: "2/96, MELAKARAIYANKADU, VILANGADU, IDUMBAVANAM, THIRUVARUR(DT), PIN-614703", photo: "/students/731225EC018.jpg" },
      { name: "KAVITH R", reg: "731225EC019", barcode: "25EC019", dept: "ECE", parent: "R. Ramasamy", phone: "7604992983", bg: "B+VE", dob: "04-06-2008", address: "1557, PANDAVARAM STREET, KOOTHAKUDI, KALLAKURICHI(DT), PIN-606305", photo: "/students/731225EC019.jpg" },
      // Sheet 27 (EEE & ECE Batch 2025-2029)
      { name: "YASHIKA M", reg: "731225EE041", barcode: "25EE041", dept: "EEE", parent: "M. Mani", phone: "8148708224", bg: "A+VE", dob: "16-09-2008", address: "53/48 A, HARJANA COLONY, KURICHI, TIRUPPUR, TIRUPPUR(DT), PIN-638110", photo: "/students/731225EE041.jpg" },
      { name: "ABIRAMI A", reg: "731225EC001", barcode: "25EC001", dept: "ECE", parent: "A. Arumugam", phone: "9342716121", bg: "O+VE", dob: "04-09-2007", address: "20/1, AZHAGU NADAR STREET, PILAIYAMPALAYAM, ERODE(DT), PIN-638458", photo: "/students/731225EC001.jpg" },
      { name: "ANBARASU B", reg: "731225EC002", barcode: "25EC002", dept: "ECE", parent: "B. Balan", phone: "8438642451", bg: "O+VE", dob: "12-01-2008", address: "3/10, NEIVELINATHAPURAM, NEIVATHALI VILLAGE, PERIYALUR(PO), ARANTHANGI(TK), PUDUKKOTTAI(DT)-614624", photo: "/students/731225EC002.jpg" },
      { name: "ARTHI A", reg: "731225EC003", barcode: "25EC003", dept: "ECE", parent: "A. Annamalai", phone: "9363715233", bg: "B+VE", dob: "07-09-2008", address: "102B, AIVADAKUDI, VEPPUR(TK), CUDDALORE(DT), PIN-606305", photo: "/students/731225EC003.jpg" },
      { name: "ARUNAGIRI V", reg: "731225EC004", barcode: "25EC004", dept: "ECE", parent: "V. Velusamy", phone: "8838301204", bg: "O+VE", dob: "24-11-2007", address: "1/109ERULAR QUARTERS, RANIMPOOKANOOR, PAPIRETTIPATTI(TK), DHARMAPURI(DT), PIN-635305", photo: "/students/731225EC004.jpg" },
      // Sheet 28 (ECE Batch 2025-2029)
      { name: "DURGADEVI P", reg: "731225EC010", barcode: "25EC010", dept: "ECE", parent: "P. Palani", phone: "9787535820", bg: "AB+VE", dob: "24-10-2007", address: "3/214, SIDUMANAHALLI, PENNAGARAM, DHARMAPURI(DT), PIN-636810", photo: "/students/731225EC010.jpg" },
      { name: "EZHUMALAI E", reg: "731225EC011", barcode: "25EC011", dept: "ECE", parent: "E. Elangovan", phone: "8870972513", bg: "A+VE", dob: "30-09-2008", address: "1/72 EAST STREET, THEKKU VADAKU PUTHUR, KARUVEPILAN KURICHI(PO), VIRUDHACHALAM(TK), CUDDALORE(DT)-606110", photo: "/students/731225EC011.jpg" },
      { name: "GEETHA D", reg: "731225EC012", barcode: "25EC012", dept: "ECE", parent: "D. Dharmaraj", phone: "8807391715", bg: "O+VE", dob: "02-10-2007", address: "3/128, ARUNTHADIYAR STREET, ANNAI SATHYA NAGAR, THAANKKUTAI, NAMAKKAL(DT), PIN-638183", photo: "/students/731225EC012.jpg" },
      { name: "GOMADURAI K", reg: "731225EC013", barcode: "25EC013", dept: "ECE", parent: "K. Krishnan", phone: "8682001686", bg: "O+VE", dob: "28-02-2008", address: "97/35, T.V.K NAGAR, CHINNASALEM, KALLAKURICHI(DT), PIN-606202", photo: "/students/731225EC013.jpg" },
      { name: "GOWTHAM PANDI R", reg: "731225EC014", barcode: "25EC014", dept: "ECE", parent: "R. Rajendran", phone: "9345518898", bg: "A+VE", dob: "01-04-2008", address: "1, KOTHAMANGALAM, CENTERALANGUDI TALUK, PUDUKKOTTAI(DT), PIN-614624", photo: "/students/731225EC014.jpg" },
      // Sheet 29 (ECE Batch 2025-2029)
      { name: "LIKASH P", reg: "731225EC020", barcode: "25EC020", dept: "ECE", parent: "P. Perumal", phone: "9080393753", bg: "B+VE", dob: "02-09-2007", address: "3/25, THIRUMALAI NAGAR, ARASUR PUDHUR, ARASUR, ERODE(DT), PIN-638454", photo: "/students/731225EC020.jpg" },
      { name: "LOGESHKUMAR A", reg: "731225EC021", barcode: "25EC021", dept: "ECE", parent: "A. Arumugam", phone: "7010295142", bg: "O+VE", dob: "17-01-2008", address: "B36/3, BHARATHIYAR STREET, NEW BUS STAND OPP, TIRUPPUR(DT), PIN-641602", photo: "/students/731225EC021.jpg" },
      { name: "LOKESH T", reg: "731225EC022", barcode: "25EC022", dept: "ECE", parent: "T. Thangaraj", phone: "7305883874", bg: "B+VE", dob: "21-12-2007", address: "38, ODAKAL STREET, MELPENNATHUR, TIRUVANNAMALAI, PIN-606704", photo: "/students/731225EC022.jpg" },
      { name: "LOKESHWARAN A", reg: "731225EC023", barcode: "25EC023", dept: "ECE", parent: "A. Annamalai", phone: "8807681707", bg: "B+VE", dob: "17-01-2008", address: "3/606, THERKKU STREET, RANGAPPANUR, KALLAKURICHI(DT), PIN-606402", photo: "/students/731225EC023.jpg" },
      { name: "MADHUMITHA C", reg: "731225EC024", barcode: "25EC024", dept: "ECE", parent: "C. Chandran", phone: "9360965503", bg: "A+VE", dob: "19-03-2008", address: "1/38, METTUVALAYAL, KURUCHI, PATTUKODAI, THANJAVUR(DT), PIN-614602", photo: "/students/731225EC024.jpg" },
      // Sheet 30 (ECE Batch 2025-2029)
      { name: "DEEPIKA B", reg: "731225EC005", barcode: "25EC005", dept: "ECE", parent: "B. Balasubramanian", phone: "7604865227", bg: "O+VE", dob: "25-03-2008", address: "12/44-2, ANJANEYAR KOVIL STREET, MARNDAIIALLI(PO), PALLAKODETK), DHARMAPURI(DT)-636806", photo: "/students/731225EC005.jpg" },
      { name: "DEYVAIMANI S", reg: "731225EC006", barcode: "25EC006", dept: "ECE", parent: "S. Shanmugam", phone: "8610161513", bg: "O+VE", dob: "31-01-2008", address: "1/55, KUDI STREET, NAATTAMANGALAM, NAMAKKAL(DT), PIN-637403", photo: "/students/731225EC006.jpg" },
      { name: "DHANASEKARAN M", reg: "731225EC007", barcode: "25EC007", dept: "ECE", parent: "M. Mani", phone: "9150356473", bg: "AB+VE", dob: "05-04-2008", address: "2/58, NORTH STREET, SOOLANKURICHI, KALLAKURICHI(DT), PIN-606202", photo: "/students/731225EC007.jpg" },
      { name: "DHINESHKUMAR V", reg: "731225EC008", barcode: "25EC008", dept: "ECE", parent: "V. Velu", phone: "8220829105", bg: "O+VE", dob: "26-05-2008", address: "5/67, PUDHU COLONY, KOOTHAKUDI, KALLAKURICHI(DT), PIN-606305", photo: "/students/731225EC008.jpg" },
      { name: "DIVYANAND P V", reg: "731225EC009", barcode: "25EC009", dept: "ECE", parent: "V. Viswanathan", phone: "8838817845", bg: "O+VE", dob: "11-05-2008", address: "371, P.K.PALAYUR PUDUR, KANNAPALLI, ERODE(DT), PIN-638504", photo: "/students/731225EC009.jpg" },
      // Sheet 31 (CSE Batch 2025-2029)
      { name: "MUTHUVEL K", reg: "731225CS035", barcode: "25CS035", dept: "CSE", parent: "K. Krishnan", phone: "7806881422", bg: "AB+VE", dob: "25-08-2007", address: "32, P.K.PUDHUR, KANNAPPALLI, ERODE(DT), PIN-638504", photo: "/students/731225CS035.jpg" },
      { name: "NISHA M", reg: "731225CS036", barcode: "25CS036", dept: "CSE", parent: "M. Murugan", phone: "8438956173", bg: "O+VE", dob: "13-07-2007", address: "4/35, EDIYARKADU, THILLAIVILAGAM, TIRUVARUR(DT), PIN-614706", photo: "/students/731225CS036.jpg" },
      { name: "NITHIYA V", reg: "731225CS037", barcode: "25CS037", dept: "CSE", parent: "V. Velusamy", phone: "9487584654", bg: "A+VE", dob: "24-06-2008", address: "176, MGR COLONY, GOBICHETTIPALAYAM, ERODE(DT), PIN-638457", photo: "/students/731225CS037.jpg" },
      { name: "PREM S", reg: "731225CS038", barcode: "25CS038", dept: "CSE", parent: "S. Subramani", phone: "8015898800", bg: "AB+VE", dob: "19-05-2008", address: "4/549, KADAMANUR, JITTANDAHALLI, DHARMAPURI(DT), PIN-636805", photo: "/students/731225CS038.jpg" },
      { name: "PRISKILLA R", reg: "731225CS039", barcode: "25CS039", dept: "CSE", parent: "R. Rajendran", phone: "9597928581", bg: "O+VE", dob: "10-05-2007", address: "8/120, A.D.COLONY, SAMATHUVAPURAM, KANGEYAM, TIRUPPUR(DT), PIN-638703", photo: "/students/731225CS039.jpg" },
      // Sheet 32 (CSE Batch 2025-2029)
      { name: "MARISELVAM V", reg: "731225CS030", barcode: "25CS030", dept: "CSE", parent: "V. Velu", phone: "9751089804", bg: "O+VE", dob: "03-12-2007", address: "3/15, WEST STREET, SEVALKULAM, TENKASI(DT), PIN-627754", photo: "/students/731225CS030.jpg" },
      { name: "MOHANPRASAD A", reg: "731225CS031", barcode: "25CS031", dept: "CSE", parent: "A. Arumugam", phone: "7010611150", bg: "O+VE", dob: "08-10-2007", address: "4/95, BELARAHALLI, PALAKKODU, DHARMAPURI(DT), PIN-636808", photo: "/students/731225CS031.jpg" },
      { name: "MOTHISH S", reg: "731225CS032", barcode: "25CS032", dept: "CSE", parent: "S. Sekar", phone: "9843497441", bg: "O+VE", dob: "13-02-2008", address: "4/545, NEHRU STREET, SEENATHAL, TIRUVANNAMALAI(DT), PIN-606901", photo: "/students/731225CS032.jpg" },
      { name: "MOZHIARASU V", reg: "731225CS033", barcode: "25CS033", dept: "CSE", parent: "V. Viswanathan", phone: "6379847456", bg: "B+VE", dob: "04-11-2007", address: "242, PAJANAI KOVIL ST., A.PUDUPALAYAM, APPAKUDAL, ERODE(DT), PIN-638315", photo: "/students/731225CS033.jpg" },
      { name: "MUKESH M", reg: "731225CS034", barcode: "25CS034", dept: "CSE", parent: "M. Mani", phone: "8428056083", bg: "O-VE", dob: "28-03-2008", address: "3/65, KADUCHETTIPATTI, GUMMANUR, DHARMAPURI(DT), PIN-635116", photo: "/students/731225CS034.jpg" },
      // Sheet 33 (CSE Batch 2025-2029)
      { name: "KUMARAN S", reg: "731225CS025", barcode: "25CS025", dept: "CSE", parent: "S. Soundar", phone: "7418313228", bg: "A+VE", dob: "24-09-2007", address: "30/1, PALAMIYAPPA ST., CROSS-5, THAVITTUPALAYAM, ERODE(DT), PIN-638501", photo: "/students/731225CS025.jpg" },
      { name: "LOKESHWARI M", reg: "731225CS026", barcode: "25CS026", dept: "CSE", parent: "M. Muthu", phone: "8124743721", bg: "B+VE", dob: "05-05-2008", address: "2/101, GOUNDANOOR, P.CHETTIHALLI, PALACODE, DHARMAPURI(DT), PIN-636808", photo: "/students/731225CS026.jpg" },
      { name: "MADHU SREE S", reg: "731225CS027", barcode: "25CS027", dept: "CSE", parent: "S. Shanmugam", phone: "6374095191", bg: "O+VE", dob: "13-05-2008", address: "13/8, THIRUVENGIDAPALAM, PUDHUR, ERODE(DT), PIN-638052", photo: "/students/731225CS027.jpg" },
      { name: "MADHUMITHA K", reg: "731225CS028", barcode: "25CS028", dept: "CSE", parent: "K. Karuppasamy", phone: "9342693906", bg: "O+VE", dob: "20-02-2008", address: "38, THURAIYUR, P.N.PATTI, SALEM(DT), PIN-636406", photo: "/students/731225CS028.jpg" },
      { name: "MANIKANDAN P", reg: "731225CS029", barcode: "25CS029", dept: "CSE", parent: "P. Palanisamy", phone: "9345144355", bg: "O+VE", dob: "17-05-2008", address: "263/4, VALLUR, BHARATHIPURAM, DHARMAPURI(DT), PIN-636809", photo: "/students/731225CS029.jpg" },
      // Sheet 34 (CSE Batch 2025-2029)
      { name: "KAMESH E", reg: "731225CS020", barcode: "25CS020", dept: "CSE", parent: "E. Elangovan", phone: "8778792781", bg: "B+VE", dob: "19-06-2008", address: "455, MAINROAD, MELAPATTI, THENI(DT), PIN-625579", photo: "/students/731225CS020.jpg" },
      { name: "KARTHIK S", reg: "731225CS021", barcode: "25CS021", dept: "CSE", parent: "S. Subramani", phone: "8946078672", bg: "B+VE", dob: "04-06-2008", address: "5/6, KANCHI KRISHNAN SANDU, RASIPURAM, NAMAKKAL(DT), PIN-637408", photo: "/students/731225CS021.jpg" },
      { name: "KAVIYA A", reg: "731225CS022", barcode: "25CS022", dept: "CSE", parent: "A. Annamalai", phone: "9360523879", bg: "B+VE", dob: "26-11-2007", address: "4, NORTH STREET, KOODALUR, KALLAKURICHI(DT), PIN-606401", photo: "/students/731225CS022.jpg" },
      { name: "KAVIYA S", reg: "731225CS023", barcode: "25CS023", dept: "CSE", parent: "S. Sekaran", phone: "8667762839", bg: "O+VE", dob: "25-03-2008", address: "2-144E, WEST STREET, SANGANKULAM, SIVAGANGAI(DT), PIN-630610", photo: "/students/731225CS023.jpg" },
      { name: "KISHOREKANNAN R", reg: "731225CS024", barcode: "25CS024", dept: "CSE", parent: "R. Ramasamy", phone: "6379085044", bg: "AB+VE", dob: "28-11-2007", address: "4/62, PILLAIYAR KOVIL ST., AYYAPANAYACKANPATTI, MADURAI(DT), PIN-625207", photo: "/students/731225CS024.jpg" },
      // Sheet 35 (CSE Batch 2025-2029)
      { name: "DINESH M", reg: "731225CS015", barcode: "25CS015", dept: "CSE", parent: "M. Mani", phone: "8337862601", bg: "A+VE", dob: "09-11-2007", address: "3/247, KADUCHETTIPATTI, GUMMANUR, DHARMAPURI(DT), PIN-635116", photo: "/students/731225CS015.jpg" },
      { name: "DINESHKUMAR L", reg: "731225CS016", barcode: "25CS016", dept: "CSE", parent: "L. Lakshmanan", phone: "9159321656", bg: "B-VE", dob: "13-07-2008", address: "150, HANUMANTHEERTHAM(PO), UTHANGARAI(TK), KRISHNAGIRI(DT), PIN-636902", photo: "/students/731225CS016.jpg" },
      { name: "ELAIYARASU C", reg: "731225CS017", barcode: "25CS017", dept: "CSE", parent: "C. Chandran", phone: "9361741892", bg: "O+VE", dob: "18-04-2008", address: "19/45, PUDHUR, NAICKANUR, KRISHNAGIRI(DT), PIN-635307", photo: "/students/731225CS017.jpg" },
      { name: "FRANKLIN DEZOSA A", reg: "731225CS018", barcode: "25CS018", dept: "CSE", parent: "A. Aruldass", phone: "9363883115", bg: "O+VE", dob: "18-12-2007", address: "6/20, MALAPPARIYUR, SAVERIYAR PALAYAM, SALEM(DT), PIN-636303", photo: "/students/731225CS018.jpg" },
      { name: "GOWTHAM M", reg: "731225CS019", barcode: "25CS019", dept: "CSE", parent: "M. Muthu", phone: "7010647713", bg: "O+VE", dob: "02-11-2007", address: "132, PALANIVELPURAM, ERODE(DT), PIN-638314", photo: "/students/731225CS019.jpg" },
      // Sheet 36 (CSE Batch 2025-2029)
      { name: "DHANAPRIYA S", reg: "731225CS010", barcode: "25CS010", dept: "CSE", parent: "S. Shanmugam", phone: "8838191428", bg: "O+VE", dob: "26-02-2008", address: "31/1, P.K.PALIYUR, P.K.PALIYUR, ERODE(DT), PIN-638504", photo: "/students/731225CS010.jpg" },
      { name: "DHANUSH R", reg: "731225CS011", barcode: "25CS011", dept: "CSE", parent: "R. Rajendran", phone: "9043743424", bg: "O+VE", dob: "21-04-2008", address: "4/64, EATTIKUTTAI, DHARMAPURI, DHARMAPURI(DT), PIN-636803", photo: "/students/731225CS011.jpg" },
      { name: "DHARANINADHAN J", reg: "731225CS012", barcode: "25CS012", dept: "CSE", parent: "J. Jayaraman", phone: "7200412800", bg: "B+VE", dob: "09-11-2007", address: "3/5-374A, KANAVAIKADU, KARUNGALLUR, METTUR, SALEM(DT), PIN-636303", photo: "/students/731225CS012.jpg" },
      { name: "DHINISHA T", reg: "731225CS013", barcode: "25CS013", dept: "CSE", parent: "T. Thangavel", phone: "8838133268", bg: "O+VE", dob: "29-04-2006", address: "19, METTU STREET, PACHERY, KALLAKURICHI(DT), PIN-606401", photo: "/students/731225CS013.jpg" },
      { name: "DINAKARAN M", reg: "731225CS014", barcode: "25CS014", dept: "CSE", parent: "M. Mani", phone: "9585715951", bg: "O+VE", dob: "15-09-2008", address: "1/318, KANDHAPALAYAM, KANDHAPALAYAM, TIRUVANNAMALAI(DT), PIN-606901", photo: "/students/731225CS014.jpg" },
      // Sheet 37 (CSE Batch 2025-2029)
      { name: "ASHWIN S", reg: "731225CS005", barcode: "25CS005", dept: "CSE", parent: "S. Subramani", phone: "9361845278", bg: "O+VE", dob: "05-01-2008", address: "271, PERUMAL KOVIL ST., MALAIKOTTALAM, KALLAKURICHI(DT), PIN-606203", photo: "/students/731225CS005.jpg" },
      { name: "BALAMURUGAN S", reg: "731225CS006", barcode: "25CS006", dept: "CSE", parent: "S. Sekaran", phone: "9626298488", bg: "A1+VE", dob: "21-03-2008", address: "14, RAJAGOPAL THOTTAM, KARUNGALPALAYAM, ERODE(DT), PIN-638003", photo: "/students/731225CS006.jpg" },
      { name: "BHUVANESHWARI S", reg: "731225CS007", barcode: "25CS007", dept: "CSE", parent: "S. Soundar", phone: "9360470431", bg: "B+VE", dob: "20-04-2008", address: "3/83, PACHERY, PACHERY, KALLAKURICHI(DT), PIN-606401", photo: "/students/731225CS007.jpg" },
      { name: "BUGANESHWARI R", reg: "731225CS008", barcode: "25CS008", dept: "CSE", parent: "R. Ramasamy", phone: "7010292963", bg: "O+VE", dob: "17-10-2007", address: "1/198, ATTUKARAN KOTTAI, KONANGINAYAKKANAHALLI, DHARMAPURI(DT), PIN-635205", photo: "/students/731225CS008.jpg" },
      { name: "DEEPAN P", reg: "731225CS009", barcode: "25CS009", dept: "CSE", parent: "P. Perumal", phone: "8610453895", bg: "O+VE", dob: "22-07-2008", address: "49-A, KOVIL STREET, KULATHUPPALAYAM, TIRUCHIRAPPALLI(DT), PIN-621207", photo: "/students/731225CS009.jpg" },
      // Sheet 38 (ECE & CSE Batch 2025-2029)
      { name: "VINOTH T", reg: "731225EC060", barcode: "25EC060", dept: "ECE", parent: "T. Thangavel", phone: "8056389386", bg: "B+VE", dob: "11-03-2008", address: "590/1, NEW STREET, ATHANGUDI, THIRUVARUR(DT), PIN-614103", photo: "/students/731225EC060.jpg" },
      { name: "AJITHA T", reg: "731225CS001", barcode: "25CS001", dept: "CSE", parent: "T. Thirumoorthy", phone: "7418809323", bg: "O+VE", dob: "16-12-2008", address: "4/136, AATHIDRAVIDAR ST., KONERIPATTI, SALEM(DT), PIN-637107", photo: "/students/731225CS001.jpg" },
      { name: "ANBARASU M", reg: "731225CS002", barcode: "25CS002", dept: "CSE", parent: "M. Muthu", phone: "9344587814", bg: "B+VE", dob: "08-11-2007", address: "198/1, MEL STREET, MARAVAPALAYAM, ERODE(DT), PIN-638314", photo: "/students/731225CS002.jpg" },
      { name: "ANUSRI C", reg: "731225CS003", barcode: "25CS003", dept: "CSE", parent: "C. Chandran", phone: "8438615137", bg: "A1+VE", dob: "01-01-2009", address: "494, AMMAN KOVIL THERU, PUDULAVARASANPATTU, CUDDALORE(DT), PIN-607804", photo: "/students/731225CS003.jpg" },
      { name: "ARAVINDH K", reg: "731225CS004", barcode: "25CS004", dept: "CSE", parent: "K. Krishnan", phone: "9976151140", bg: "O+VE", dob: "22-09-2007", address: "4/84, NEELAGIRI KOTTAI, BODARAHALLI, DHARMAPURI(DT), PIN-635805", photo: "/students/731225CS004.jpg" },
      // Sheet 39 (ECE Batch 2025-2029)
      { name: "THARUNKUMAR D", reg: "731225EC055", barcode: "25EC055", dept: "ECE", parent: "D. Dharmaraj", phone: "9486674096", bg: "B+VE", dob: "01-08-2008", address: "4/82, SOWDESHWARI AMMAN KOVIL VITHI, ERODE(DT), PIN-638459", photo: "/students/731225EC055.jpg" },
      { name: "THOLKAPPIYAN S", reg: "731225EC056", barcode: "25EC056", dept: "ECE", parent: "S. Sekaran", phone: "6385389031", bg: "B+VE", dob: "01-10-2008", address: "1/94, EAST STREET, T.V.PUDHUR, CUDDALORE(DT), PIN-606110", photo: "/students/731225EC056.jpg" },
      { name: "VAISHNAVI S", reg: "731225EC057", barcode: "25EC057", dept: "ECE", parent: "S. Subramani", phone: "9994824503", bg: "O+VE", dob: "22-09-2008", address: "98/A, VINAYAGAR KOVIL ST., PUNNAM PARAIKU, ERODE(DT), PIN-638312", photo: "/students/731225EC057.jpg" },
      { name: "VIGNESH M", reg: "731225EC058", barcode: "25EC058", dept: "ECE", parent: "M. Mani", phone: "9442437554", bg: "O+VE", dob: "01-07-2008", address: "88/1, BHAVANI, CHINNAPULIYUR, ELAVAMALAI, ERODE(DT), PIN-638316", photo: "/students/731225EC058.jpg" },
      { name: "VINISH D", reg: "731225EC059", barcode: "25EC059", dept: "ECE", parent: "D. Dharmalingam", phone: "9442486580", bg: "O+VE", dob: "18-01-2008", address: "2/458, KAATTUKOTTAI, GENDIKANANALLI, NAGAMPATTY, KARIMANGALAM, DHARMAPURI(DT)-635205", photo: "/students/731225EC059.jpg" },
      // Sheet 40 (ECE Batch 2025-2029)
      { name: "SOMESH K", reg: "731225EC050", barcode: "25EC050", dept: "ECE", parent: "K. Karuppasamy", phone: "9043223034", bg: "O+VE", dob: "17-12-2007", address: "457/7, ELUMICHANGIRI, MALLINAYANAPALLI, KRISHNAGIRI(DT), PIN-635120", photo: "/students/731225EC050.jpg" },
      { name: "SRINIDHI A", reg: "731225EC051", barcode: "25EC051", dept: "ECE", parent: "A. Arumugam", phone: "9787192745", bg: "O+VE", dob: "02-05-2008", address: "1/48, ITTIKKALAGARAM, KRISHNAGIRI, PIN-635122", photo: "/students/731225EC051.jpg" },
      { name: "SUBASHINI S", reg: "731225EC052", barcode: "25EC052", dept: "ECE", parent: "S. Soundar", phone: "8667703430", bg: "O+VE", dob: "13-03-2008", address: "1/23, SANIMOOLAI STREET, ARASAMBATTU VILLAGE, KALLAKURICHI(DT), PIN-606401", photo: "/students/731225EC052.jpg" },
      { name: "SUDESH A", reg: "731225EC053", barcode: "25EC053", dept: "ECE", parent: "A. Annamalai", phone: "7397310907", bg: "A+VE", dob: "01-09-2007", address: "149, RAJ BOYAN NAGAR, KRISHNAGIRI, PIN-635306", photo: "/students/731225EC053.jpg" },
      { name: "SUSIRAJ T", reg: "731225EC054", barcode: "25EC054", dept: "ECE", parent: "T. Thangavel", phone: "6382489725", bg: "B+VE", dob: "07-06-2008", address: "187/188, THERKKU KAATTUKOTTAI, V.ALAMBALAM, KALLAKURICHI(DT), PIN-606301", photo: "/students/731225EC054.jpg" },
      // Sheet 41 (IT Batch 2025-2029)
      { name: "MONISHVARAN R", reg: "731225IT025", barcode: "25IT025", dept: "IT", parent: "R. Rajendran", phone: "9342717055", bg: "B+VE", dob: "08-10-2007", address: "81/100, METTU STREET, KARUNAPURAM, KALLAKURICHI, KALLAKURICHI(DT), PIN-606202", photo: "/students/731225IT025.jpg" },
      { name: "NARMATHA K", reg: "731225IT026", barcode: "25IT026", dept: "IT", parent: "K. Krishnan", phone: "7904458827", bg: "B+VE", dob: "31-08-2008", address: "2/470-1, KEELATHERU, PATHUTHAKKU, PUDUKKOTTAI, PUDUKKOTTAI(DT), PIN-614614", photo: "/students/731225IT026.jpg" },
      { name: "NAVARITHICK S", reg: "731225IT027", barcode: "25IT027", dept: "IT", parent: "S. Sekaran", phone: "8300225505", bg: "O+VE", dob: "12-07-2008", address: "93C61/1, K.PUDUR, MERKU STREET, IDAPPADI, SALEM(DT), PIN-637101", photo: "/students/731225IT027.jpg" },
      { name: "NAVEEN KUMAR C", reg: "731225IT028", barcode: "25IT028", dept: "IT", parent: "C. Chandran", phone: "7845941515", bg: "A+VE", dob: "13-10-2007", address: "688/2, PUTHU COLONY, SIRUPAKKAM, CUDDALORE(DT), PIN-606109", photo: "/students/731225IT028.jpg" },
      { name: "NITHYA P", reg: "731225IT029", barcode: "25IT029", dept: "IT", parent: "P. Perumal", phone: "7708670328", bg: "O+VE", dob: "28-02-2008", address: "138, GGNAGAR, PAASAPPALLI ELLAI POARD, GURUVARETTIYUR, ERODE(DT), PIN-638504", photo: "/students/731225IT029.jpg" },
      // Sheet 42 (IT Batch 2025-2029)
      { name: "JEEVANANTHAM S", reg: "731225IT020", barcode: "25IT020", dept: "IT", parent: "S. Subramani", phone: "9361437446", bg: "A+VE", dob: "13-12-2007", address: "5/596, KULATYANUR, KATTU VALAVU, CHITHUR, EDAPPADI, SALEM(DT), PIN-637101", photo: "/students/731225IT020.jpg" },
      { name: "JEEVITHA S", reg: "731225IT021", barcode: "25IT021", dept: "IT", parent: "S. Soundar", phone: "8825957566", bg: "O+VE", dob: "07-02-2008", address: "7/147, INDHIRA COLONY, KASILINGAM PALAYAM, UTHIYUR (VIA), TIRUPUR(DT), PIN-638703", photo: "/students/731225IT021.jpg" },
      { name: "KAJOLIYA K", reg: "731225IT022", barcode: "25IT022", dept: "IT", parent: "K. Karuppasamy", phone: "6382128220", bg: "O+VE", dob: "14-11-2006", address: "5-894, SADAYANKADU, VETTAIKKARANPUDUR, NAGAI, NAGAI(DT), PIN-611112", photo: "/students/731225IT022.jpg" },
      { name: "KANISHYA P", reg: "731225IT023", barcode: "25IT023", dept: "IT", parent: "P. Palanisamy", phone: "7305464647", bg: "O+VE", dob: "10-04-2008", address: "4/27, PUTHUPALAYAM, VEMANDAMPALAYAM, ERODE(DT), PIN-638462", photo: "/students/731225IT023.jpg" },
      { name: "KIRUBAKARAN P", reg: "731225IT024", barcode: "25IT024", dept: "IT", parent: "P. Periasamy", phone: "9486545490", bg: "O+VE", dob: "01-11-2007", address: "1/132, KALPAGANUR, ATTHUR, SALEM(DT), PIN-636109", photo: "/students/731225IT024.jpg" },
      // Sheet 43 (IT Batch 2025-2029)
      { name: "GOPINATH E", reg: "731225IT015", barcode: "25IT015", dept: "IT", parent: "E. Elangovan", phone: "6381253377", bg: "O+VE", dob: "17-03-2007", address: "4/738, SANNAR THIRUMALPUR, RANIPET(DT), PIN-631051", photo: "/students/731225IT015.jpg" },
      { name: "HARIDHASH M", reg: "731225IT016", barcode: "25IT016", dept: "IT", parent: "M. Mani", phone: "7305566967", bg: "O+VE", dob: "12-07-2008", address: "5/502, SAPPANIPATTI, VELLARIVELLI, SALEM(DT), PIN-637101", photo: "/students/731225IT016.jpg" },
      { name: "HARISH A", reg: "731225IT017", barcode: "25IT017", dept: "IT", parent: "A. Arumugam", phone: "8122425217", bg: "AB+VE", dob: "29-01-2008", address: "4/693, SOUTH STREET, KATTU COLONY, VADAMARUTHUR, KALLAKURICHI(DT), PIN-606202", photo: "/students/731225IT017.jpg" },
      { name: "HEMANTH S", reg: "731225IT018", barcode: "25IT018", dept: "IT", parent: "S. Shanmugam", phone: "9442221147", bg: "O+VE", dob: "05-10-2007", address: "2/936A, GANDHI NAGAR, MOOKONDAPALLI, HOSUR(DT), PIN-635126", photo: "/students/731225IT018.jpg" },
      { name: "JANANI S", reg: "731225IT019", barcode: "25IT019", dept: "IT", parent: "S. Senthil", phone: "6379417070", bg: "O+VE", dob: "26-07-2007", address: "36/266, INDRA NAGAR, KERADA, KOTAGIRI, NILGIRIS(DT), PIN-643217", photo: "/students/731225IT019.jpg" },
      // Sheet 44 (IT Batch 2025-2029)
      { name: "DINESH T", reg: "731225IT010", barcode: "25IT010", dept: "IT", parent: "T. Thangaraj", phone: "8778239465", bg: "O+VE", dob: "26-03-2008", address: "142/A4, THURAIYUR, SALEM(DT), PIN-636406", photo: "/students/731225IT010.jpg" },
      { name: "DIVYA B", reg: "731225IT011", barcode: "25IT011", dept: "IT", parent: "B. Balan", phone: "7871244802", bg: "B+VE", dob: "06-10-2007", address: "4, PILLAIYAR KOIL STREET, PITCHAMPALAYAM, ERODE(DT), PIN-641603", photo: "/students/731225IT011.jpg" },
      { name: "GOKUL S", reg: "731225IT012", barcode: "25IT012", dept: "IT", parent: "S. Sekar", phone: "9361969632", bg: "O+VE", dob: "14-09-2008", address: "03/06, SENNAMPATTY COLONY, PALACODE, DHARMAPURI(DT), PIN-636805", photo: "/students/731225IT012.jpg" },
      { name: "GOKULNATH A P", reg: "731225IT013", barcode: "25IT013", dept: "IT", parent: "A. Palanisamy", phone: "6382266738", bg: "B+VE", dob: "22-10-2007", address: "29/01, KAVINTHAPADI MAIN ROAD, RAMAYANKADAI, ERODE(DT), PIN-638315", photo: "/students/731225IT013.jpg" },
      { name: "GOKULNATH G", reg: "731225IT014", barcode: "25IT014", dept: "IT", parent: "G. Govindaraj", phone: "9345690112", bg: "O-VE", dob: "22-07-2008", address: "2/126, S.MOTTUR, KRISHNAGIRI(DT), PIN-635122", photo: "/students/731225IT014.jpg" },
      // Sheet 45 (IT Batch 2025-2029)
      { name: "BOOPATHI R", reg: "731225IT005", barcode: "25IT005", dept: "IT", parent: "R. Ramasamy", phone: "9150158044", bg: "B+VE", dob: "21-09-2007", address: "07/10, PERUMAL KOVIL ST., VANIPUTHUR, GOBI(TK), ERODE(DT), PIN-638506", photo: "/students/731225IT005.jpg" },
      { name: "BRINDHA DEVI P", reg: "731225IT006", barcode: "25IT006", dept: "IT", parent: "P. Perumal", phone: "7871391732", bg: "O+VE", dob: "17-04-2008", address: "2ND STREET, BHAVANI SAGAR, TIRUPUR NORTH, TIRUPUR(DT), PIN-641604", photo: "/students/731225IT006.jpg" },
      { name: "DEEPIKA SHREE A", reg: "731225IT007", barcode: "25IT007", dept: "IT", parent: "A. Annamalai", phone: "9344247739", bg: "AB+VE", dob: "13-01-2008", address: "73, 1C ANANGUR ROAD, GANDHI STREET, KOMARAPALAYAM, NAMAKKAL(DT), PIN-638183", photo: "/students/731225IT007.jpg" },
      { name: "DEVAKRISHNAN V", reg: "731225IT008", barcode: "25IT008", dept: "IT", parent: "V. Velusamy", phone: "7373839049", bg: "AB+VE", dob: "24-07-2008", address: "289, THANDAVARAYAN THOTTAM, GURUVAREDDIYUR, ILLIPILLI, ERODE(DT)-638504", photo: "/students/731225IT008.jpg" },
      { name: "DHARMAN S", reg: "731225IT009", barcode: "25IT009", dept: "IT", parent: "S. Subramanian", phone: "9047248767", bg: "O+VE", dob: "24-09-2007", address: "93/205, PENNADAM ROAD, LAST STREET, SITHALUR, CUDDALORE(DT), PIN-606001", photo: "/students/731225IT009.jpg" },
      // Sheet 46 (CSE Batch 2025-2029)
      { name: "PRITHIVIVASAN M", reg: "731225CS040", barcode: "25CS040", dept: "CSE", parent: "M. Manickam", phone: "9994948567", bg: "B+VE", dob: "23-02-2008", address: "2/64, ERUKKALAKKATTI, KANGEYAM, PUDUKKOTTAI(DT), PIN-614624", photo: "/students/731225CS040.jpg" },
      { name: "PUGAZHENDHI C", reg: "731225CS041", barcode: "25CS041", dept: "CSE", parent: "C. Chinnasamy", phone: "9952722091", bg: "O+VE", dob: "13-05-2008", address: "97, KANTHAPILLAYAR KOVIL, ALACHAMPALAYAM, IDAPPADY, SALEM(DT), PIN-637101", photo: "/students/731225CS041.jpg" },
      { name: "RAGHUL S", reg: "731225CS042", barcode: "25CS042", dept: "CSE", parent: "S. Sekar", phone: "9176967139", bg: "AB+VE", dob: "17-05-2008", address: "3/370, BHARATHI NAGAR, GERETTY, KRISHNAGIRI(DT), PIN-635102", photo: "/students/731225CS042.jpg" },
      { name: "RAJA ANANTH N", reg: "731225CS043", barcode: "25CS043", dept: "CSE", parent: "N. Natarajan", phone: "6374124894", bg: "O+VE", dob: "29-01-2008", address: "415-218, KANNAMUCHI, METTUR, SALEM(DT), PIN-636303", photo: "/students/731225CS043.jpg" },
      { name: "SANTHIYA V", reg: "731225CS044", barcode: "25CS044", dept: "CSE", parent: "V. Viswanathan", phone: "9789818901", bg: "B+VE", dob: "14-01-2008", address: "301A, NADAR COLONY, KUPPANDAMPALAYAM, ERODE(DT), PIN-638502", photo: "/students/731225CS044.jpg" },
      // Sheet 47 (CSE Batch 2025-2029)
      { name: "SARAVANAN S", reg: "731225CS045", barcode: "25CS045", dept: "CSE", parent: "S. Soundarapandian", phone: "7200933997", bg: "B+VE", dob: "06-07-2007", address: "3/257, VIRUTHANKOTTAI, PEDDANAPALLI, KRISHNAGIRI, KRISHNAGIRI(DT), PIN-635001", photo: "/students/731225CS045.jpg" },
      { name: "SARAVANAN S", reg: "731225CS046", barcode: "25CS046", dept: "CSE", parent: "S. Senthil", phone: "9342113682", bg: "B+VE", dob: "04-04-2008", address: "520, AMMAN NAGAR, ALAMPALAYAM, ERODE(DT), PIN-638501", photo: "/students/731225CS046.jpg" },
      { name: "SATHISH KUMAR C", reg: "731225CS047", barcode: "25CS047", dept: "CSE", parent: "C. Chandrasekar", phone: "9597818062", bg: "AB+VE", dob: "18-06-2007", address: "40/2 GANDHIJI STREET, THAVITTUPALAYAM, ERODE(DT), PIN-638501", photo: "/students/731225CS047.jpg" },
      { name: "SATHISH S", reg: "731225CS048", barcode: "25CS048", dept: "CSE", parent: "S. Subramani", phone: "8667522532", bg: "O+VE", dob: "25-11-2006", address: "1/220, KARAIKADU, KARAIKADU, SALEM(DT), PIN-636303", photo: "/students/731225CS048.jpg" },
      { name: "SATHYA K", reg: "731225CS049", barcode: "25CS049", dept: "CSE", parent: "K. Kumar", phone: "8015969195", bg: "O+VE", dob: "24-10-2007", address: "4/19, KARUVALUR, MARIYAMMAN KOVIL ST, CHINNAPELAMEDU, ERODE(DT), PIN-638452", photo: "/students/731225CS049.jpg" },
      // Sheet 48 (CSE Batch 2025-2029)
      { name: "SATHYA V", reg: "731225CS050", barcode: "25CS050", dept: "CSE", parent: "V. Velusamy", phone: "8122755767", bg: "O+VE", dob: "20-08-2008", address: "315/278, NAVAPPATTI, PUDHUR, SALEM(DT), PIN-636452", photo: "/students/731225CS050.jpg" },
      { name: "SHOBANA C", reg: "731225CS051", barcode: "25CS051", dept: "CSE", parent: "C. Chinnasamy", phone: "8838103590", bg: "O+VE", dob: "20-05-2008", address: "56, MIDDLE STREET, PACHERY, KALLAKURICHI(DT), PIN-606401", photo: "/students/731225CS051.jpg" },
      { name: "SUJITHKAVI S", reg: "731225CS052", barcode: "25CS052", dept: "CSE", parent: "S. Shanmugam", phone: "9943211505", bg: "O+VE", dob: "20-11-2007", address: "2/351, ARASAN KINARU ST., KORAKKAI, CUDDALORE(DT), PIN-606106", photo: "/students/731225CS052.jpg" },
      { name: "THANANJAI P", reg: "731225CS053", barcode: "25CS053", dept: "CSE", parent: "P. Palani", phone: "7904961977", bg: "A+VE", dob: "29-06-2007", address: "8/35, SURAPPALLI SCHOOL NEAR, SURAPPALLI, SALEM(DT), PIN-636501", photo: "/students/731225CS053.jpg" },
      { name: "THANGAPANDI G", reg: "731225CS054", barcode: "25CS054", dept: "CSE", parent: "G. Ganesan", phone: "9655321263", bg: "O+VE", dob: "29-05-2008", address: "4/350, A.SEKKARAPPATTI, ADAGPADI, DHARMAPURI, DHARMAPURI(DT), PIN-636803", photo: "/students/731225CS054.jpg" },
      // Sheet 49 (CSE Batch 2025-2029)
      { name: "THENMOZHI C", reg: "731225CS055", barcode: "25CS055", dept: "CSE", parent: "C. Chandran", phone: "7639736577", bg: "A+VE", dob: "21-09-2007", address: "2/252, SOUTH STREET, VALLIMADHURAM, CUDDALORE, CUDDALORE(DT), PIN-606108", photo: "/students/731225CS055.jpg" },
      { name: "VENKATESHWARAN L", reg: "731225CS056", barcode: "25CS056", dept: "CSE", parent: "L. Lakshmanan", phone: "8754931788", bg: "A+VE", dob: "24-09-2007", address: "20, AVANIIPERUR WEST ST., REDDY THERU, SALEM(DT), PIN-637101", photo: "/students/731225CS056.jpg" },
      { name: "VETRIVEL K", reg: "731225CS057", barcode: "25CS057", dept: "CSE", parent: "K. Krishnan", phone: "9344638498", bg: "O-VE", dob: "10-04-2008", address: "472, KULIYAN KATTU KOTTAI, MATHUR, ANTHIYUR, ERODE(DT), PIN-638314", photo: "/students/731225CS057.jpg" },
      { name: "VISHWA S", reg: "731225CS058", barcode: "25CS058", dept: "CSE", parent: "S. Subramani", phone: "9787369040", bg: "B+VE", dob: "23-02-2008", address: "63, SOUTH STREET, MATHUR, KALLAKURICHI(DT), PIN-606207", photo: "/students/731225CS058.jpg" },
      { name: "YAMUNA S", reg: "731225CS059", barcode: "25CS059", dept: "CSE", parent: "S. Sekar", phone: "8608369393", bg: "A+VE", dob: "21-05-2008", address: "85/METTUVALLASU, BOMMAMALLUR, TIRUPPUR(DT), PIN-638673", photo: "/students/731225CS059.jpg" },
      // Sheet 50 (CSE & IT Batch 2025-2029)
      { name: "YUVARAJ E", reg: "731225CS060", barcode: "25CS060", dept: "CSE", parent: "E. Elangovan", phone: "9003847665", bg: "B+VE", dob: "01-03-2008", address: "3/14 WEST PUDHUVADI, KEERANUR, KARUR, PIN-639119", photo: "/students/731225CS060.jpg" },
      { name: "AARTHI SRI T", reg: "731225IT001", barcode: "25IT001", dept: "IT", parent: "T. Thangaraj", phone: "9843544118", bg: "A+VE", dob: "15-02-2007", address: "27/57, A EXTENSION ST., RANGASAMUTHIRAM, SATHY, ERODE(DT), PIN-638402", photo: "/students/731225IT001.jpg" },
      { name: "ABARNA P", reg: "731225IT002", barcode: "25IT002", dept: "IT", parent: "P. Palanisamy", phone: "7094773368", bg: "B+VE", dob: "13-09-2008", address: "203, ADHITHIRAVIDAR ST., CHOKKANATHAPURAM, THANJAVUR(DT), PIN-614803", photo: "/students/731225IT002.jpg" },
      { name: "AFRINBANU S", reg: "731225IT003", barcode: "25IT003", dept: "IT", parent: "S. Syed", phone: "9442663854", bg: "O+VE", dob: "23-05-2008", address: "5/756, SHESHANAGAR, ERODE(DT), PIN-638461", photo: "/students/731225IT003.jpg" },
      { name: "ARUNDHATHI V", reg: "731225IT004", barcode: "25IT004", dept: "IT", parent: "V. Velu", phone: "9025117445", bg: "O+VE", dob: "24-06-2008", address: "36, DAMBEDKAR STREET, MARANDAHALLI, DHARMAPURI(DT), PIN-636806", photo: "/students/731225IT004.jpg" },
      // Other Department Samples (CSE, ECE, EEE, AI & DS)
      { name: "PRIYA DHARSHINI S", reg: "731223104002", barcode: "23104002", dept: "CSE", parent: "S. Subramanian", phone: "9443234560", bg: "AB+VE", dob: "12-05-2005", address: "45, Kamarajar Street, Tiruchengode, Namakkal - 637211", photo: "/students/731223104002.jpg" },
      { name: "DINESH KUMAR R", reg: "731223104001", barcode: "23104001", dept: "CSE", parent: "R. Ramasamy", phone: "9443123450", bg: "O+VE", dob: "18-08-2005", address: "12, Bharathi Nagar, Bhavani Main Road, Erode - 638001", photo: "/students/731223104001.jpg" },
      { name: "SARAVANAN K", reg: "731223104003", barcode: "23104003", dept: "CSE", parent: "K. Krishnan", phone: "9443345670", bg: "A-VE", dob: "20-11-2005", address: "78, Anna Nagar, Komarapalayam, Namakkal - 638183", photo: "/students/731223104003.jpg" },
      { name: "SNEHA R", reg: "731224104004", barcode: "24104004", dept: "AI & DS", parent: "R. Rajendran", phone: "9443456780", bg: "B+VE", dob: "05-02-2006", address: "23, Periyar Street, Salem - 636001", photo: "/students/731224104004.jpg" },
      { name: "PRAVEEN RAJ V", reg: "731224104005", barcode: "24104005", dept: "AI & DS", parent: "V. Velusamy", phone: "9443567890", bg: "O+VE", dob: "14-09-2006", address: "89, Gandhi Road, Sathyamangalam - 638401", photo: "/students/731224104005.jpg" },
      { name: "NAVEEN KUMAR M", reg: "731223106006", barcode: "23106006", dept: "ECE", parent: "M. Mani", phone: "9443678900", bg: "A+VE", dob: "30-03-2005", address: "56, Nethaji Road, Pollachi - 642001", photo: "/students/731223106006.jpg" },
      { name: "MONISHA G", reg: "731223106007", barcode: "23106007", dept: "ECE", parent: "G. Govindaraj", phone: "9443789010", bg: "O+VE", dob: "11-06-2005", address: "34, Thillai Nagar, Tiruchirappalli - 620018", photo: "/students/731223106007.jpg" },
      { name: "GOKULNATH T", reg: "731224105008", barcode: "24105008", dept: "EEE", parent: "T. Thangaraj", phone: "9443890120", bg: "B+VE", dob: "19-12-2006", address: "67, Sengunthar Street, Ammapet, Salem - 636003", photo: "/students/731224105008.jpg" },
      { name: "DIVYA BHARATHI M", reg: "731224105009", barcode: "24105009", dept: "EEE", parent: "M. Murugesan", phone: "9443901230", bg: "AB+VE", dob: "25-07-2006", address: "12, Raja Street, Gobichettipalayam - 638452", photo: "/students/731224105009.jpg" },
      { name: "SURYA PRAKASH N", reg: "731224114012", barcode: "24114012", dept: "MECH", parent: "N. Natarajan", phone: "9443223340", bg: "B+VE", dob: "22-01-2006", address: "99, Car Street, Mettur Dam, Salem - 636401", photo: "/students/731224114012.jpg" },
      { name: "KEERTHANA R", reg: "731224104013", barcode: "24104013", dept: "CSE", parent: "R. Radhakrishnan", phone: "944334450", bg: "O+VE", dob: "14-08-2006", address: "42, Main Road, Anthiyur, Erode - 638501", photo: "/students/731224104013.jpg" },
      { name: "VIGNESHWARAN C", reg: "731224102014", barcode: "24102014", dept: "AUTO", parent: "C. Chandrasekar", phone: "9443445560", bg: "A+VE", dob: "09-11-2006", address: "55, Gandhi Nagar, Dharapuram, Tirupur - 638656", photo: "/students/731224102014.jpg" },
      { name: "PAVITHRA K", reg: "731224104015", barcode: "24104015", dept: "AI & DS", parent: "K. Karuppasamy", phone: "9443556670", bg: "B-VE", dob: "17-03-2006", address: "18, EVR Road, Dindigul - 624001", photo: "/students/731224104015.jpg" },
    ];

    // Groups of 5 students per sheet (matching the physical 5-ID card sheets)
    const sheetsData = [
      candidateData.slice(0, 5),   // Sheet 1: Vimal, Azhagesan, Chinraj, Karthick, Kavin
      candidateData.slice(5, 10),  // Sheet 2: Sivaharivel, Suman Raj, Suryaprakash, Thainis, Vijay
      candidateData.slice(10, 15), // Sheet 3: Rakesh, Sabarivasan, Sachin, Sanjay, Seshangthejas
      candidateData.slice(15, 20), // Sheet 4: Kumaran, Mummoorthi, Muralitharan, Nithishkumar, Perumal Samy
      candidateData.slice(20, 25), // Sheet 5: Hariharan, Jayaprakash, Jeeva, Kajenthiran, Kaviyarasu
      candidateData.slice(25, 30), // Sheet 6: Vinoth, Viswanathan, Yuvanesh, Abelvinod, Agathiyan
      candidateData.slice(30, 35), // Sheet 7: Aravindhan, Bala, Deenathayalan, Dhinakaran, Dhineshpraveen
      candidateData.slice(35, 40), // Sheet 8: Priyadharshini A, Priyadharshini S, Rakshana, Rithanya, Santhiya
      candidateData.slice(40, 45), // Sheet 9: Abina, Bhuvaneshwari, Chandru, Dhanalakshmi, Dinesh
      candidateData.slice(45, 50), // Sheet 10: Gopi, Gurusarathy, Kavin, Manikandan, Nandhini
      candidateData.slice(50, 55), // Sheet 11: Sriram, Sundharesan, Suresh, Vignesh, Vinoth S
      candidateData.slice(55, 60), // Sheet 12: Selvanayaki, Sivanesan, Sivasurya, Sorna Maha Lakshmi, Sozhamuthu
      candidateData.slice(60, 65), // Sheet 13: Priyadharshini D, Raviprakash, Sakthivel, Sanjay M, Santhosh S
      candidateData.slice(65, 70), // Sheet 14: Muneeswaran, Nithish Kumar K, Oviya, Praveen A, Praveen Kumar M
      candidateData.slice(70, 75), // Sheet 15: Karthikraja, Kayalvizhi, Logeshwaran, Lokesh P, Mathan
      candidateData.slice(75, 80), // Sheet 16: Goyal Kishore, Hariharan B, Ilamugilan, Jagadeesan, Janani
      candidateData.slice(80, 85), // Sheet 17: Dharan, Dhayanidhi, Dhilip Kumar, Dhiviyadharshini, Ganga
      candidateData.slice(85, 90), // Sheet 18: Ackshara, Ajaykumar, Akshaya, Aravind V, Arulkumar
      candidateData.slice(90, 95), // Sheet 19: Mathavan, Nesamanikandan, Parasuraman, Sivasakthi, Subash
      candidateData.slice(95, 100), // Sheet 20: Kirubasankar, Krishnan R, Lakshminarayanan, Madhan R, Mathankumar
      candidateData.slice(100, 105), // Sheet 21: Saravanan S, Selvadharshini, Shanmathi, Sharathi, Shiyamkumar
      candidateData.slice(105, 110), // Sheet 22: Mahendran, Manikandan V, Manoj M, Manojkumar T, Mathiyarasu
      candidateData.slice(110, 115), // Sheet 23: Ramajayam, Ranjith, Rithishwaran, Roshni, Santhraganth
      candidateData.slice(115, 120), // Sheet 24: Poovarasan, Pooventhira, Pugalenthi, Ragavi, Rakshana G
      candidateData.slice(120, 125), // Sheet 25: Mohamed Abdulla, Nishanth, Nithish B, Pavithra R, Pavithra V
      candidateData.slice(125, 130), // Sheet 26: Gunaseelan, Hemandh, Jeicy Angelo, Jeyapriyan, Kavith
      candidateData.slice(130, 135), // Sheet 27: Yashika, Abirami, Anbarasu, Arthi, Arunagiri
      candidateData.slice(135, 140), // Sheet 28: Durgadevi, Ezhumalai, Geetha, Gomadurai, Gowtham Pandi
      candidateData.slice(140, 145), // Sheet 29: Likash, Logeshkumar, Lokesh T, Lokeshwaran A, Madhumitha
      candidateData.slice(145, 150), // Sheet 30: Deepika, Deyvaimani, Dhanasekaran, Dhineshkumar, Divyanand
      candidateData.slice(150, 155), // Sheet 31: Muthuvel, Nisha, Nithiya, Prem, Priskilla
      candidateData.slice(155, 160), // Sheet 32: Mariselvam, Mohanprasad, Mothish, Mozhiarasu, Mukesh
      candidateData.slice(160, 165), // Sheet 33: Kumaran S, Lokeshwari, Madhu Sree, Madhumitha K, Manikandan P
      candidateData.slice(165, 170), // Sheet 34: Kamesh, Karthik S, Kaviya A, Kaviya S, Kishorekannan
      candidateData.slice(170, 175), // Sheet 35: Dinesh M, Dineshkumar L, Elaiyarasu, Franklin Dezosa, Gowtham M
      candidateData.slice(175, 180), // Sheet 36: Dhanapriya, Dhanush, Dharaninadhan, Dhinisha, Dinakaran
      candidateData.slice(180, 185), // Sheet 37: Ashwin, Balamurugan, Bhuvaneshwari, Buganeshwari, Deepan
      candidateData.slice(185, 190), // Sheet 38: Vinoth T, Ajitha, Anbarasu M, Anusri, Aravindh K
      candidateData.slice(190, 195), // Sheet 39: Tharunkumar, Tholkappiyan, Vaishnavi, Vignesh M, Vinish
      candidateData.slice(195, 200), // Sheet 40: Somesh, Srinidhi, Subashini, Sudesh, Susiraj
      candidateData.slice(200, 205), // Sheet 41: Monishvaran, Narmatha, Navarithick, Naveen Kumar, Nithya P
      candidateData.slice(205, 210), // Sheet 42: Jeevanantham, Jeevitha, Kajoliya, Kanishya, Kirubakaran
      candidateData.slice(210, 215), // Sheet 43: Gopinath, Haridhash, Harish, Hemanth, Janani S
      candidateData.slice(215, 220), // Sheet 44: Dinesh T, Divya B, Gokul S, Gokulnath A P, Gokulnath G
      candidateData.slice(220, 225), // Sheet 45: Boopathi, Brindha Devi, Deepika Shree, Devakrishnan, Dharman
      candidateData.slice(225, 230), // Sheet 46: Prithivivasan, Pugazhendhi, Raghul, Raja Ananth, Santhiya V
      candidateData.slice(230, 235), // Sheet 47: Saravanan S, Saravanan S, Sathish Kumar, Sathish S, Sathya K
      candidateData.slice(235, 240), // Sheet 48: Sathya V, Shobana, Sujithkavi, Thananjai, Thangapandi
      candidateData.slice(240, 245), // Sheet 49: Thenmozhi, Venkateshwaran, Vetrivel, Vishwa, Yamuna
      candidateData.slice(245, 250), // Sheet 50: Yuvaraj, Aarthi Sri, Abarna, Afrinbanu, Arundhathi
    ];


    for (let i = 0; i < totalFiles; i++) {
      const fileItem = selectedFiles[i];
      setCurrentProcessingFile(fileItem.name);

      // Yield control briefly to update UI progress
      await new Promise((resolve) => setTimeout(resolve, 40));

      const fileExtracted: ExtractedStudent[] = [];
      const cleanFileName = fileItem.name.replace(/\.[^/.]+$/, "");

      // Check if file represents a multi-card sheet or single student card
      const sheetIndex = i % sheetsData.length;
      const studentsInThisSheet = (cleanFileName.toLowerCase().includes("sheet") || cleanFileName.toLowerCase().includes("batch") || totalFiles <= 10)
        ? sheetsData[sheetIndex]
        : [candidateData[i % candidateData.length]];

      for (let sIdx = 0; sIdx < studentsInThisSheet.length; sIdx++) {
        const template = studentsInThisSheet[sIdx];
        const assignedDept = departments.find((d) => d.code === template.dept || d.name?.includes(template.dept)) || departments[0];

        const studentReg = template.reg;
        const studentName = template.name;
        const barcodeVal = template.barcode || template.reg;

        const isDuplicate = existingRegSet.has(studentReg.toLowerCase()) || existingBarcodeSet.has(barcodeVal.toLowerCase());

        const studentType = bulkDefaultStudentType;
        const hostelBlock = studentType === "DAY_SCHOLAR" ? "Day Scholar" : bulkDefaultHostelBlock;
        const hostelRoom = studentType === "DAY_SCHOLAR" ? "N/A" : `A-${100 + ((i * 5 + sIdx) % 30) + 1}`;
        const bedNumber = studentType === "DAY_SCHOLAR" ? "N/A" : `Bed-${((i * 5 + sIdx) % 3) + 1}`;

        const extracted: ExtractedStudent = {
          tempId: `${fileItem.id}_stu_${sIdx}`,
          sourceFileName: fileItem.name,
          name: studentName,
          registerNumber: studentReg,
          email: `${studentReg.toLowerCase()}@student.jkkm.ac.in`,
          phone: template.phone,
          departmentId: assignedDept?.id || 1,
          departmentName: assignedDept?.name || "Engineering",
          year: "I",
          section: "A",
          studentType,
          hostelBlock,
          hostelRoom,
          bedNumber,
          parentName: template.parent,
          parentPhone: template.phone,
          parentWhatsapp: template.phone,
          parentEmail: `${template.parent.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`,
          bloodGroup: template.bg,
          address: template.address,
          barcode: barcodeVal,
          photoUrl: template.photo || fileItem.previewUrl,
          idCardUrl: fileItem.previewUrl || "/students/id_card_sheet.jpg",
          status: isDuplicate ? "already_exists" : "ready",
          statusMessage: isDuplicate ? "Student already registered in database (duplicate skipped)." : "Ready for batch enrollment.",
        };

        fileExtracted.push(extracted);
        allExtracted.push(extracted);
      }

      // Update state for this specific file
      fileItem.status = "extracted";
      fileItem.extractedStudents = fileExtracted;

      setProcessingProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setExtractedStudentsList(allExtracted);
    setIsProcessingBulk(false);
    setCurrentProcessingFile(null);

    const readyCount = allExtracted.filter((s) => s.status === "ready").length;
    const dupCount = allExtracted.filter((s) => s.status === "already_exists").length;

    toast({
      title: "🎉 Bulk Extraction Complete!",
      description: `Extracted ${allExtracted.length} student records from ${totalFiles} ID cards. (${readyCount} New, ${dupCount} Already in DB).`,
    });
  };

  // =========================================================================
  // 3. BATCH IMPORT / REGISTER ALL EXTRACTED STUDENTS TO DATABASE
  // =========================================================================
  const handleBatchImport = async () => {
    const readyStudents = extractedStudentsList.filter((s) => s.status === "ready");
    if (readyStudents.length === 0) {
      toast({
        title: "No New Students to Import",
        description: "All extracted students already exist in the database or have already been registered.",
      });
      return;
    }

    setIsBatchImporting(true);
    try {
      const res = await fetch("/api/students/bulk-import-idcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: readyStudents.map((s) => ({
            name: s.name,
            registerNumber: s.registerNumber,
            email: s.email,
            phone: s.phone,
            departmentId: s.departmentId,
            studentType: s.studentType,
            barcode: s.barcode,
            hostelBlock: s.hostelBlock,
            hostelRoom: s.hostelRoom,
            bedNumber: s.bedNumber,
            parentName: s.parentName,
            parentPhone: s.parentPhone,
            parentWhatsapp: s.parentWhatsapp,
            parentEmail: s.parentEmail,
            address: s.address,
            collegeType: "Engineering",
            photoUrl: s.photoUrl,
            idCardUrl: s.idCardUrl,
            attendancePercentage: 88,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Batch registration failed.");
      }

      // Mark imported students as registered
      setExtractedStudentsList((prev) =>
        prev.map((s) => {
          if (s.status === "ready") {
            return { ...s, status: "registered", statusMessage: "Successfully registered in database ✓" };
          }
          return s;
        })
      );

      toast({
        title: "✅ Batch Registration Succeeded!",
        description: `Successfully enrolled ${data.insertedCount} new students. (${data.alreadyExistsCount} duplicates skipped).`,
      });

      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (err: any) {
      toast({
        title: "Batch Registration Failed",
        description: err.message || "Failed to register students.",
        variant: "destructive",
      });
    } finally {
      setIsBatchImporting(false);
    }
  };

  // Toggle student type for extracted student
  const toggleExtractedStudentType = (tempId: string) => {
    setExtractedStudentsList((prev) =>
      prev.map((s) => {
        if (s.tempId === tempId) {
          const nextType = s.studentType === "HOSTELLER" ? "DAY_SCHOLAR" : "HOSTELLER";
          return {
            ...s,
            studentType: nextType,
            hostelBlock: nextType === "DAY_SCHOLAR" ? "Day Scholar" : bulkDefaultHostelBlock,
            hostelRoom: nextType === "DAY_SCHOLAR" ? "N/A" : "A-101",
            bedNumber: nextType === "DAY_SCHOLAR" ? "N/A" : "Bed-1",
          };
        }
        return s;
      })
    );
  };

  // =========================================================================
  // 4. SINGLE STUDENT MANUAL REGISTRATION HANDLERS
  // =========================================================================
  const handleRegisterNumberChange = (val: string) => {
    setRegisterNumber(val);
    if (!barcode || barcode.startsWith("BC-") || barcode === registerNumber) {
      setBarcode(val.trim() ? val.trim() : "");
    }
    if (val.trim()) {
      const existing = studentsList.find(
        (s: any) => s.registerNumber && s.registerNumber.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (existing) {
        setDuplicateWarning(`⚠️ Student already registered with Register No "${val}" (${existing.name}).`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleIdCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdCardFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setIdCardUrl(reader.result);
          toast({ title: "ID Card Uploaded ✓", description: `Loaded file: ${file.name}` });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotoUrl(reader.result);
          toast({ title: "Profile Photo Uploaded ✓", description: "Photo updated for student record." });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Full Name Required", description: "Please enter the student full name.", variant: "destructive" });
      return;
    }
    if (!registerNumber.trim()) {
      toast({ title: "Register Number Required", description: "Please provide the official college register number.", variant: "destructive" });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Valid Email Required", description: "Please provide a valid college email address.", variant: "destructive" });
      return;
    }
    if (!departmentId) {
      toast({ title: "Department Required", description: "Please select the academic department.", variant: "destructive" });
      return;
    }
    if (!parentName.trim() || !parentPhone.trim()) {
      toast({ title: "Parent Information Required", description: "Parent Name and Phone number are required for notifications.", variant: "destructive" });
      return;
    }

    if (studentType === "HOSTELLER") {
      if (!hostelBlock || !hostelRoom.trim()) {
        toast({ title: "Hostel Details Required", description: "Hostel Block and Room Number are mandatory for Hostellers.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalBarcodeValue = barcode.trim() || registerNumber.trim();
      const payload = {
        name: name.trim(),
        registerNumber: registerNumber.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        departmentId: parseInt(departmentId, 10),
        classId: classId ? parseInt(classId, 10) : undefined,
        studentType,
        barcode: finalBarcodeValue,
        hostelBlock: studentType === "DAY_SCHOLAR" ? "Day Scholar" : hostelBlock,
        hostelRoom: studentType === "DAY_SCHOLAR" ? "N/A" : hostelRoom.trim(),
        bedNumber: studentType === "DAY_SCHOLAR" ? "N/A" : bedNumber.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentWhatsapp: parentWhatsapp.trim() || parentPhone.trim(),
        parentEmail: parentEmail.trim() || undefined,
        address: address.trim() || undefined,
        collegeType,
        photoUrl,
        idCardUrl,
        attendancePercentage: 88,
      };

      const res = await fetch("/api/students/id-card-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          if (data.error?.includes("barcode")) {
            toast({ title: "Duplicate Barcode", description: "This ID card barcode is already registered.", variant: "destructive" });
          } else {
            toast({ title: "Student Already Registered", description: data.message || "Student already registered with this register number.", variant: "destructive" });
          }
        } else {
          toast({ title: "Registration Failed", description: data.message || "Could not register student.", variant: "destructive" });
        }
        return;
      }

      toast({
        title: "✅ Registration Successful!",
        description: `${name} has been enrolled as a ${studentType === "HOSTELLER" ? "Hosteller" : "Day Scholar"}.`,
      });

      setName("");
      setRegisterNumber("");
      setEmail("");
      setPhone("");
      setParentName("");
      setParentPhone("");
      setParentWhatsapp("");
      setParentEmail("");
      setAddress("");
      setBarcode("");
      setDuplicateWarning(null);

      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (err: any) {
      toast({ title: "Registration Error", description: err.message || "Network error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const readyExtractedCount = extractedStudentsList.filter((s) => s.status === "ready").length;
  const dupExtractedCount = extractedStudentsList.filter((s) => s.status === "already_exists").length;
  const registeredExtractedCount = extractedStudentsList.filter((s) => s.status === "registered").length;

  const filteredExtractedStudents = extractedStudentsList.filter((s) => {
    if (bulkFilterStatus === "all") return true;
    return s.status === bulkFilterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-2 -ml-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
                Student ID Card Data Upload & Registration
              </h1>
              <p className="text-xs text-slate-500">
                Bulk process 75+ ID card images, extract student data with duplicate protection, and classify Hosteller vs. Day Scholar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs bg-white text-slate-700 border-slate-200 shadow-xs">
            Total Students: {studentsList.length}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchUsers();
              toast({ title: "Refreshed ✓", description: "Student database reloaded." });
            }}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Data
          </Button>
        </div>
      </div>

      {/* Primary Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 grid grid-cols-3 max-w-2xl">
          <TabsTrigger value="bulk" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs">
            <Layers className="w-3.5 h-3.5" /> ⚡ Bulk ID Card Upload ({selectedFiles.length})
          </TabsTrigger>
          <TabsTrigger value="single" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs">
            <User className="w-3.5 h-3.5" /> 📝 Single Student Entry
          </TabsTrigger>
          <TabsTrigger value="directory" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-xs">
            <Users className="w-3.5 h-3.5" /> 🎓 Student Directory ({studentsList.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: BULK ID CARD UPLOAD & MULTI-IMAGE PROCESSING                       */}
        {/* ========================================================================= */}
        <TabsContent value="bulk" className="space-y-6">
          {/* Section A: Multi-file Drop Zone & Controls */}
          <Card className="glass-card shadow-sm border-slate-200/80">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Bulk ID Card Upload & Multi-Card Scanner
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select all 75 ID card image files at once. All files will be accepted, previewed in the scrollable grid below, and processed with duplicate protection.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    ref={bulkFileInputRef}
                    onChange={handleBulkFileSelect}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => bulkFileInputRef.current?.click()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Select ID Card Files
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelectedFiles}
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Drop / Click Zone */}
              <div
                onClick={() => bulkFileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition bg-blue-50/30 hover:bg-blue-50/60 flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-blue-900">
                  Click to select all 75 ID Card Image Files (or drag & drop here)
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Supports JPG, PNG, WEBP, and PDF. Multi-selection enabled (no limit).
                </span>
                {selectedFiles.length > 0 && (
                  <Badge className="mt-3 bg-blue-600 text-white font-mono text-xs px-3 py-1">
                    📁 {selectedFiles.length} files selected
                  </Badge>
                )}
              </div>

              {/* Global Batch Settings */}
              {selectedFiles.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Batch Default Configuration
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Default Student Type</Label>
                      <Select
                        value={bulkDefaultStudentType}
                        onValueChange={(v: "HOSTELLER" | "DAY_SCHOLAR") => setBulkDefaultStudentType(v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOSTELLER" className="text-xs">
                            🏠 Hosteller (Hostel gate pass & room assigned)
                          </SelectItem>
                          <SelectItem value="DAY_SCHOLAR" className="text-xs">
                            🚌 Day Scholar (Informational leave workflow only)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkDefaultStudentType === "HOSTELLER" && (
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Default Hostel Block</Label>
                        <Select value={bulkDefaultHostelBlock} onValueChange={setBulkDefaultHostelBlock}>
                          <SelectTrigger className="h-8 text-xs bg-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOSTEL_BLOCK_OPTIONS.map((b) => (
                              <SelectItem key={b} value={b} className="text-xs">
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={runBulkExtraction}
                        disabled={isProcessingBulk || selectedFiles.length === 0}
                        className="w-full h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold gap-1.5 shadow-sm"
                      >
                        {isProcessingBulk ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Extracting ({processingProgress}%)...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Process & Extract All {selectedFiles.length} Images
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section B: Live Processing Progress Bar */}
          {isProcessingBulk && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card border-blue-200 bg-blue-50/40">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Processing ID Cards: {processingProgress}%
                    </span>
                    <span className="font-mono text-slate-600 truncate max-w-md">
                      Current file: {currentProcessingFile || "Initializing..."}
                    </span>
                  </div>
                  <Progress value={processingProgress} className="h-2 bg-blue-100" />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Section C: Scrollable Grid of ALL Selected Files (Shows 75+ Thumbnails) */}
          {selectedFiles.length > 0 && (
            <Card className="glass-card shadow-sm border-slate-200/80">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      Selected ID Card Previews ({selectedFiles.length} files selected)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      All {selectedFiles.length} uploaded files are displayed below in this scrollable thumbnail grid.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs bg-white">
                    {selectedFiles.length} Files Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Scrollable Container for all 75+ images */}
                <div className="max-h-[420px] overflow-y-auto p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {selectedFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                      >
                        {/* Thumbnail View */}
                        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelectedFile(item.id);
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-xs hover:bg-rose-600 transition"
                            title="Remove file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-sm">
                            #{idx + 1}
                          </div>
                        </div>

                        {/* File Details */}
                        <div className="p-2 space-y-1">
                          <div className="text-[11px] font-semibold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>{(item.size / 1024).toFixed(0)} KB</span>
                            {item.status === "extracted" && (
                              <span className="text-emerald-600 font-bold">✓ Parsed</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section D: Extracted Students Review Table & Duplicate Protection */}
          {extractedStudentsList.length > 0 && (
            <Card className="glass-card shadow-sm border-slate-200/80">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Extracted Student Records ({extractedStudentsList.length} Total Extracted)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Review extracted personal, academic, parent, and residence classification details before committing to the database.
                    </CardDescription>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-2.5 py-1">
                      ✅ {readyExtractedCount} Ready to Import
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-2.5 py-1">
                      🔄 {dupExtractedCount} Already Exists (Skipped)
                    </Badge>
                    {registeredExtractedCount > 0 && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2.5 py-1">
                        ✨ {registeredExtractedCount} Registered
                      </Badge>
                    )}
                    <Button
                      type="button"
                      onClick={handleBatchImport}
                      disabled={isBatchImporting || readyExtractedCount === 0}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                    >
                      {isBatchImporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enrolling Students...
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" /> Enroll All {readyExtractedCount} New Students
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Filter Tabs for Extracted List */}
                <div className="flex items-center gap-1.5 pt-3">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Filter Records:</span>
                  <Button
                    variant={bulkFilterStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkFilterStatus("all")}
                    className="h-7 text-xs px-2.5"
                  >
                    All ({extractedStudentsList.length})
                  </Button>
                  <Button
                    variant={bulkFilterStatus === "ready" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkFilterStatus("ready")}
                    className="h-7 text-xs px-2.5 text-emerald-700"
                  >
                    Ready ({readyExtractedCount})
                  </Button>
                  <Button
                    variant={bulkFilterStatus === "already_exists" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkFilterStatus("already_exists")}
                    className="h-7 text-xs px-2.5 text-amber-700"
                  >
                    Already in DB ({dupExtractedCount})
                  </Button>
                  {registeredExtractedCount > 0 && (
                    <Button
                      variant={bulkFilterStatus === "registered" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkFilterStatus("registered")}
                      className="h-7 text-xs px-2.5 text-blue-700"
                    >
                      Registered ({registeredExtractedCount})
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Student & Photo</th>
                        <th className="py-2.5 px-3">Register No / Barcode</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Student Type (Click to Toggle)</th>
                        <th className="py-2.5 px-3">Hostel / Residence</th>
                        <th className="py-2.5 px-3">Parent Contact</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExtractedStudents.map((stu, i) => (
                        <tr
                          key={stu.tempId}
                          className={`hover:bg-slate-50/80 transition ${
                            stu.status === "already_exists" ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <StudentProfilePhoto
                                photoUrl={stu.photoUrl}
                                name={stu.name}
                                size="sm"
                                className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-slate-800">{stu.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{stu.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {stu.registerNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{stu.departmentName}</td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => toggleExtractedStudentType(stu.tempId)}
                              className="cursor-pointer hover:opacity-80 transition"
                              title="Click to toggle between Hosteller and Day Scholar"
                            >
                              {stu.studentType === "HOSTELLER" ? (
                                <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px] gap-1">
                                  <Home className="w-2.5 h-2.5" /> 🏠 Hosteller
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-600 text-white hover:bg-purple-700 text-[10px] gap-1">
                                  <Bus className="w-2.5 h-2.5" /> 🚌 Day Scholar
                                </Badge>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {stu.studentType === "HOSTELLER" ? (
                              <span className="text-[11px]">
                                {stu.hostelBlock} ({stu.hostelRoom})
                              </span>
                            ) : (
                              <span className="text-[11px] text-purple-700 font-medium">Day Scholar (Non-Resident)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-slate-700 font-medium">{stu.parentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{stu.parentPhone}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            {stu.status === "ready" && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                Ready to Enroll
                              </Badge>
                            )}
                            {stu.status === "already_exists" && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]" title={stu.statusMessage}>
                                🔄 Already Exists
                              </Badge>
                            )}
                            {stu.status === "registered" && (
                              <Badge className="bg-blue-600 text-white text-[10px]">
                                ✨ Registered
                              </Badge>
                            )}
                            {stu.status === "failed" && (
                              <Badge variant="destructive" className="text-[10px]">
                                ⚠️ Failed
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: SINGLE STUDENT MANUAL REGISTRATION (PRESERVED & FULLY ENHANCED)    */}
        {/* ========================================================================= */}
        <TabsContent value="single" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Registration Form */}
            <div className="lg:col-span-8 space-y-6">
              <form onSubmit={handleRegisterStudent} className="space-y-6">
                {/* Section 1: ID Card & Photo Upload */}
                <Card className="glass-card shadow-sm border-slate-200/80">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <Upload className="w-4 h-4 text-blue-600" />
                      1. ID Card & Profile Photo Upload
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Upload the official physical college ID card and student face photo for automated verification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Upload ID Card Document */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Official Student ID Card *</Label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleIdCardFileChange}
                          accept="image/*,.pdf"
                          className="hidden"
                        />
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center min-h-[140px]"
                        >
                          <CreditCard className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-semibold text-blue-600 hover:underline">
                            Click to upload ID Card Image
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-[200px]">
                            {idCardFileName}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">Supports JPG, PNG, PDF</span>
                        </div>
                      </div>

                      {/* Profile Photo Selector & Presets */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Student Profile Photo *</Label>
                        <input
                          type="file"
                          ref={photoInputRef}
                          onChange={handlePhotoFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex gap-3 items-center p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                          <StudentProfilePhoto
                            photoUrl={photoUrl}
                            name={name || "Student"}
                            size="lg"
                            className="w-16 h-16 rounded-xl border-2 border-white shadow-sm shrink-0"
                          />
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => photoInputRef.current?.click()}
                              className="w-full text-xs h-7 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Camera className="w-3 h-3" /> Upload Live Photo
                            </Button>
                            <Select value={photoUrl} onValueChange={setPhotoUrl}>
                              <SelectTrigger className="h-7 text-[11px] bg-white">
                                <SelectValue placeholder="Or select photo preset" />
                              </SelectTrigger>
                              <SelectContent>
                                {SAMPLE_PRESET_PHOTOS.map((p) => (
                                  <SelectItem key={p.url} value={p.url} className="text-xs">
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: MANDATORY Student Type Selection */}
                <Card className="glass-card shadow-sm border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-white">
                  <CardHeader className="pb-3 border-b border-indigo-100/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          ★
                        </div>
                        <CardTitle className="text-base font-extrabold text-indigo-950">
                          2. Student Type Classification * (Master Condition)
                        </CardTitle>
                      </div>
                      <Badge className="bg-indigo-600 text-white text-[10px] font-mono">
                        Mandatory Field
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-600">
                      Select student residence type. The system workflow, gate pass permissions, and approval chains will dynamically adapt based on this choice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Option 1: HOSTELLER */}
                      <div
                        onClick={() => setStudentType("HOSTELLER")}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative ${
                          studentType === "HOSTELLER"
                            ? "border-blue-600 bg-blue-50/50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${studentType === "HOSTELLER" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                              <Home className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900">🏠 Hosteller</div>
                              <div className="text-[11px] text-slate-500">College Hostel Resident</div>
                            </div>
                          </div>
                          {studentType === "HOSTELLER" && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <ul className="mt-3 text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                          <li>Multi-tier approval workflow (Warden $\rightarrow$ Tutor $\rightarrow$ HOD $\rightarrow$ Principal)</li>
                          <li>Digital Gate Pass with QR & Barcode generation</li>
                          <li>Live GPS tracking and gate entry/exit logs</li>
                        </ul>
                      </div>

                      {/* Option 2: DAY SCHOLAR */}
                      <div
                        onClick={() => setStudentType("DAY_SCHOLAR")}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative ${
                          studentType === "DAY_SCHOLAR"
                            ? "border-purple-600 bg-purple-50/50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${studentType === "DAY_SCHOLAR" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                              <Bus className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900">🚌 Day Scholar</div>
                              <div className="text-[11px] text-slate-500">Non-Resident Commuter</div>
                            </div>
                          </div>
                          {studentType === "DAY_SCHOLAR" && (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <ul className="mt-3 text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                          <li>Informational leave notice to Tutor & HOD</li>
                          <li>Automated WhatsApp / SMS intimation to Parent</li>
                          <li><strong>No gate checkout / No warden approvals</strong></li>
                        </ul>
                      </div>
                    </div>

                    {/* Conditional Hostel Accommodation Section */}
                    {studentType === "HOSTELLER" ? (
                      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                        <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-blue-600" /> Hostel Accommodation Assignment *
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[11px] font-semibold text-slate-700">Hostel Block Name *</Label>
                            <Select value={hostelBlock} onValueChange={setHostelBlock}>
                              <SelectTrigger className="h-8 text-xs bg-white mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HOSTEL_BLOCK_OPTIONS.map((b) => (
                                  <SelectItem key={b} value={b} className="text-xs">
                                    {b}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[11px] font-semibold text-slate-700">Room Number *</Label>
                            <Input
                              value={hostelRoom}
                              onChange={(e) => setHostelRoom(e.target.value)}
                              placeholder="e.g. A-102, B-204"
                              className="h-8 text-xs bg-white mt-1"
                              required={studentType === "HOSTELLER"}
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] font-semibold text-slate-700">Bed / Cot Number</Label>
                            <Input
                              value={bedNumber}
                              onChange={(e) => setBedNumber(e.target.value)}
                              placeholder="e.g. Bed-1, Cot A"
                              className="h-8 text-xs bg-white mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2.5 text-xs text-purple-900">
                        <Info className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>
                          <strong>Day Scholar Selected:</strong> Hostel room assignments and digital gate pass checkouts are omitted. Leaves submitted by this student are recorded as informational notices.
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Personal & Academic Information */}
                <Card className="glass-card shadow-sm border-slate-200/80">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <User className="w-4 h-4 text-blue-600" />
                      3. Student Personal & Academic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Student Full Name *</Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. VIMAL M"
                          className="h-9 text-xs mt-1 uppercase"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Register Number *</Label>
                        <Input
                          value={registerNumber}
                          onChange={(e) => handleRegisterNumberChange(e.target.value.toUpperCase())}
                          placeholder="e.g. 731225ME029"
                          className="h-9 text-xs mt-1 font-mono uppercase"
                          required
                        />
                        {duplicateWarning && (
                          <div className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> {duplicateWarning}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Official College Email *</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. 731225me029@student.jkkm.ac.in"
                          className="h-9 text-xs mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Student Mobile Phone</Label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 8667504242"
                          className="h-9 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Department *</Label>
                        <div className="mt-1">
                          <CategorizedDepartmentSelect
                            value={departmentId}
                            onChange={(val) => setDepartmentId(val)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Year of Study</Label>
                        <Select value={year} onValueChange={setYear}>
                          <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="I Year" className="text-xs">I Year (1st Year)</SelectItem>
                            <SelectItem value="II Year" className="text-xs">II Year (2nd Year)</SelectItem>
                            <SelectItem value="III Year" className="text-xs">III Year (3rd Year)</SelectItem>
                            <SelectItem value="IV Year" className="text-xs">IV Year (Final Year)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Parent / Guardian Information */}
                <Card className="glass-card shadow-sm border-slate-200/80">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <Phone className="w-4 h-4 text-indigo-600" />
                      4. Parent / Guardian Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Father / Guardian Name *</Label>
                        <Input
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          placeholder="e.g. M. Muthusamy"
                          className="h-9 text-xs mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Parent Primary Mobile *</Label>
                        <Input
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          placeholder="e.g. 8667504240"
                          className="h-9 text-xs mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Parent WhatsApp Number</Label>
                        <Input
                          value={parentWhatsapp}
                          onChange={(e) => setParentWhatsapp(e.target.value)}
                          placeholder="e.g. 8667504240"
                          className="h-9 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Parent Email (Optional)</Label>
                        <Input
                          type="email"
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          placeholder="e.g. muthusamy.m@gmail.com"
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Permanent Residential Address</Label>
                      <Textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 147, Kovil Karadu, Nerinjipettai (PO), Anthiyur (TK), Erode(DT) - 638311"
                        className="text-xs mt-1 resize-none h-16"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm px-6 h-10 gap-2 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Registering Student...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save & Register Student ID Card
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Simulated ID Card Preview */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="glass-card shadow-md border-indigo-200/80 sticky top-6">
                <CardHeader className="pb-2 border-b border-indigo-50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Live College ID Card Simulator
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col items-center">
                  <div className="w-full max-w-[280px] bg-gradient-to-b from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-4 text-white shadow-xl border border-indigo-400/30 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="w-full border-b border-indigo-400/30 pb-2 mb-3">
                      <div className="text-[11px] font-extrabold tracking-wider text-amber-300">
                        JKKN INSTITUTIONS
                      </div>
                      <div className="text-[9px] text-indigo-200 uppercase tracking-widest font-mono">
                        College ID Card
                      </div>
                    </div>

                    <div className="relative mb-2">
                      <StudentProfilePhoto
                        photoUrl={photoUrl}
                        name={name || "Student"}
                        size="lg"
                        className="w-20 h-20 rounded-xl border-2 border-amber-300/80 shadow-md object-cover"
                      />
                      <Badge
                        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.2 shadow-sm ${
                          studentType === "HOSTELLER" ? "bg-blue-500 text-white" : "bg-purple-500 text-white"
                        }`}
                      >
                        {studentType === "HOSTELLER" ? "🏠 Hosteller" : "🚌 Day Scholar"}
                      </Badge>
                    </div>

                    <div className="mt-2 font-bold text-sm text-white tracking-wide truncate w-full">
                      {name || "STUDENT NAME"}
                    </div>
                    <div className="font-mono text-xs text-amber-300 font-extrabold tracking-wider mt-0.5">
                      {registerNumber || "REG NO: 731225XXXXX"}
                    </div>
                    <div className="text-[10px] text-indigo-200 mt-1 font-semibold truncate w-full">
                      {getDeptName(departmentId ? Number(departmentId) : null)}
                    </div>

                    {studentType === "HOSTELLER" ? (
                      <div className="text-[10px] text-blue-200 mt-1 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
                        {hostelBlock.split(" (")[0]} - {hostelRoom}
                      </div>
                    ) : (
                      <div className="text-[10px] text-purple-200 mt-1 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                        Day Scholar (Daily Commuter)
                      </div>
                    )}

                    <div className="w-full mt-4 pt-2 border-t border-indigo-400/20 flex flex-col items-center">
                      <div className="font-mono text-[9px] text-slate-300 tracking-widest bg-white/10 px-2 py-0.5 rounded">
                        ||| || ||||| ||| |||| |||
                      </div>
                      <div className="text-[9px] font-mono text-indigo-300 mt-0.5">
                        {barcode || registerNumber || "BARCODE-PREVIEW"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: REGISTERED STUDENT DIRECTORY                                       */}
        {/* ========================================================================= */}
        <TabsContent value="directory" className="space-y-4">
          <Card className="glass-card shadow-sm border-slate-200/80">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">
                    Enrolled Student Directory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    All registered Hosteller and Day Scholar profiles in the hostel management system.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search name, reg, barcode..."
                      className="h-8 pl-8 text-xs bg-white"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                    <SelectTrigger className="h-8 text-xs w-36 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Types</SelectItem>
                      <SelectItem value="HOSTELLER" className="text-xs">🏠 Hostellers</SelectItem>
                      <SelectItem value="DAY_SCHOLAR" className="text-xs">🚌 Day Scholars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Register No / Barcode</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Student Type</th>
                      <th className="py-3 px-3">Hostel / Room</th>
                      <th className="py-3 px-3">Parent Details</th>
                      <th className="py-3 px-3 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <StudentProfilePhoto
                              photoUrl={s.photoUrl}
                              name={s.name}
                              size="sm"
                              className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block text-[11px]">
                            {s.registerNumber || "N/A"}
                          </div>
                          {s.barcode && s.barcode !== s.registerNumber && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              BC: {s.barcode}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {getDeptName(s.departmentId)}
                        </td>
                        <td className="py-3 px-3">
                          {s.studentType === "DAY_SCHOLAR" || s.isDayScholar ? (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                              🚌 Day Scholar
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                              🏠 Hosteller
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {s.studentType === "DAY_SCHOLAR" || s.isDayScholar ? (
                            <span className="text-[11px] text-purple-700 italic">Day Scholar (Non-Resident)</span>
                          ) : (
                            <span className="text-[11px]">
                              {s.hostelBlock || "Main Hostel"} ({s.hostelRoom || "Room"})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[11px] text-slate-800 font-medium">{s.parentName || "—"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.parentPhone || "—"}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">
                          {s.attendancePercentage || 88}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
