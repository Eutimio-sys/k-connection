import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, LogIn, LogOut, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

const Attendance = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayAttendanceList, setTodayAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile) setUserRole(profile.role);

      // Fetch projects for location selection
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      setProjects(projectsData || []);

      // Fetch all today's attendance records
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from("attendance")
        .select(`
          *,
          project:projects(name)
        `)
        .eq("user_id", user.id)
        .eq("work_date", today)
        .order("check_in_time", { ascending: false });

      setTodayAttendanceList(todayData || []);

      // Fetch attendance history
      const query = supabase
        .from("attendance")
        .select(`
          *,
          user:profiles(full_name, position, department),
          project:projects(name)
        `)
        .order("work_date", { ascending: false })
        .order("check_in_time", { ascending: false })
        .limit(30);

      // Only show own attendance for workers
      if (profile?.role === 'worker') {
        query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("เกิดข้อผิดพลาด");
      } else {
        setAttendance(data || []);
      }
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!selectedProject) {
      toast.error("กรุณาเลือกสถานที่ทำงาน");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("attendance")
        .insert({
          user_id: user.id,
          work_date: new Date().toISOString().split('T')[0],
          project_id: selectedProject,
        });

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("เช็คอินสำเร็จ");
        setSelectedProject("");
        fetchData();
      }
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    const { error } = await supabase
      .from("attendance")
      .update({ check_out_time: new Date().toISOString() })
      .eq("id", attendanceId);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("เช็คเอาท์สำเร็จ");
      fetchData();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateWorkHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "-";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ชม. ${minutes} นาที`;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          เช็คอิน/เช็คเอาท์
        </h1>
        <p className="text-muted-foreground text-lg">บันทึกเวลาเข้า-ออกงาน</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            เช็คอินวันนี้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Form for new check-in */}
            <div className="space-y-2">
              <Label htmlFor="project">สถานที่ทำงาน *</Label>
              <div className="flex gap-2">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="เลือกโครงการ/สถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleCheckIn} size="default" className="gap-2">
                  <LogIn size={20} />
                  เช็คอินรอบใหม่
                </Button>
              </div>
            </div>

            {/* Today's attendance list */}
            {todayAttendanceList.length > 0 ? (
              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-medium text-muted-foreground">การเช็คอินวันนี้ ({todayAttendanceList.length} รอบ)</h3>
                {todayAttendanceList.map((record, index) => (
                  <div key={record.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-muted-foreground" />
                          <span className="font-medium">{record.project?.name}</span>
                          <span className="text-xs text-muted-foreground">รอบที่ {todayAttendanceList.length - index}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <LogIn className="text-primary" size={16} />
                            <span className="text-sm text-muted-foreground">เช็คอิน:</span>
                            <span className="font-semibold">{formatTime(record.check_in_time)}</span>
                          </div>
                          {record.check_out_time && (
                            <>
                              <div className="flex items-center gap-2">
                                <LogOut className="text-accent" size={16} />
                                <span className="text-sm text-muted-foreground">เช็คเอาท์:</span>
                                <span className="font-semibold">{formatTime(record.check_out_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="text-muted-foreground" size={16} />
                                <span className="font-semibold">
                                  {calculateWorkHours(record.check_in_time, record.check_out_time)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {!record.check_out_time && (
                        <Button 
                          onClick={() => handleCheckOut(record.id)} 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                        >
                          <LogOut size={16} />
                          เช็คเอาท์
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">ยังไม่ได้เช็คอินวันนี้</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            ประวัติการเช็คอิน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">กำลังโหลด...</p>
          ) : attendance.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ยังไม่มีประวัติการเช็คอิน</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  {userRole !== 'worker' && <TableHead>พนักงาน</TableHead>}
                  <TableHead>สถานที่ทำงาน</TableHead>
                  <TableHead>เช็คอิน</TableHead>
                  <TableHead>เช็คเอาท์</TableHead>
                  <TableHead>เวลาทำงาน</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {new Date(record.work_date).toLocaleDateString("th-TH")}
                    </TableCell>
                    {userRole !== 'worker' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.user?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.user?.position} • {record.user?.department}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground" />
                        {record.project?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(record.check_in_time)}</TableCell>
                    <TableCell>
                      {record.check_out_time ? formatTime(record.check_out_time) : "-"}
                    </TableCell>
                    <TableCell>
                      {calculateWorkHours(record.check_in_time, record.check_out_time)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;