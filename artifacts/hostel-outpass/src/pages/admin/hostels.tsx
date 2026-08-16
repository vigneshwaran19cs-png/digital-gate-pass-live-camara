import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, ArrowLeft, Users, Home, BedDouble, ShieldCheck, Trash2, Edit } from "lucide-react";

export default function AdminHostelsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState([
    { id: 1, name: "Kaveri Boys Hostel (Block A)", code: "BH-A", gender: "Boys", rooms: 60, capacity: 240, occupied: 180, warden: "Mr. Warden" },
    { id: 2, name: "Bhavani Boys Hostel (Block B)", code: "BH-B", gender: "Boys", rooms: 50, capacity: 200, occupied: 140, warden: "Mr. Warden" },
    { id: 3, name: "Amaravathi Girls Hostel (Block A)", code: "GH-A", gender: "Girls", rooms: 80, capacity: 320, occupied: 290, warden: "Mrs. Warden" },
    { id: 4, name: "Vaigai PG & Research Hostel", code: "PG-H", gender: "Co-ed", rooms: 40, capacity: 120, occupied: 95, warden: "Super Admin" },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [newBlockCode, setNewBlockCode] = useState("");
  const [newGender, setNewGender] = useState("Boys");

  const handleAddBlock = () => {
    if (!newBlockName || !newBlockCode) return;
    const newB = {
      id: Date.now(),
      name: newBlockName,
      code: newBlockCode,
      gender: newGender,
      rooms: 50,
      capacity: 200,
      occupied: 0,
      warden: "Unassigned",
    };
    setBlocks([...blocks, newB]);
    setIsAddOpen(false);
    setNewBlockName("");
    setNewBlockCode("");
    toast({ title: "✅ Hostel Block Created", description: `${newBlockName} added successfully!` });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Hostel Management System</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Hostel Blocks & Room Allocations</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage hostel blocks, capacity, warden assignments, and room availability</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4" /> Add Hostel Block
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Hostel Block</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Hostel Name</label>
                <Input placeholder="e.g. Siruvani PG Hostel" value={newBlockName} onChange={(e) => setNewBlockName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Block Code</label>
                <Input placeholder="e.g. PG-C" value={newBlockCode} onChange={(e) => setNewBlockCode(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Hostel Type</label>
                <Select value={newGender} onValueChange={setNewGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boys">Boys Hostel</SelectItem>
                    <SelectItem value="Girls">Girls Hostel</SelectItem>
                    <SelectItem value="Co-ed">Co-Ed / Staff Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddBlock} className="w-full bg-indigo-600 text-white">
                Create Block
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {blocks.map((block) => {
          const occupancyRate = Math.round((block.occupied / block.capacity) * 100);
          return (
            <motion.div key={block.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50/50 border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={block.gender === "Boys" ? "default" : block.gender === "Girls" ? "secondary" : "outline"}>
                          {block.gender}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-muted-foreground">{block.code}</span>
                      </div>
                      <CardTitle className="text-lg mt-1">{block.name}</CardTitle>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Occupancy</div>
                      <div className="text-sm font-bold text-indigo-600">{occupancyRate}%</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center p-3 bg-muted/30 rounded-xl">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Rooms</div>
                      <div className="font-bold text-slate-800 text-base">{block.rooms}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Capacity</div>
                      <div className="font-bold text-slate-800 text-base">{block.capacity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Occupied</div>
                      <div className="font-bold text-emerald-600 text-base">{block.occupied}</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Warden: {block.warden}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600" onClick={() => setBlocks(blocks.filter(b => b.id !== block.id))}>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
