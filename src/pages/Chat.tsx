import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import ProjectChat from "@/components/ProjectChat";

interface Project { id: string; name: string; }

export default function Chat() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    document.title = "แชทรวม | ระบบบริหารงาน";
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name").order("name");
    if (data) setProjects(data);
  };

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-4xl font-bold">แชทรวม</h1>
      </header>

      <section className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>เลือกโครงการ</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-background max-w-md">
                <SelectValue placeholder="เลือกโครงการเพื่อเริ่มแชท" />
              </SelectTrigger>
              <SelectContent className="bg-background max-h-80">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {projectId ? (
          <ProjectChat projectId={projectId} />
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              กรุณาเลือกโครงการเพื่อเริ่มแชท
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
