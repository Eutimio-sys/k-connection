import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("projects").select("*").then(({ data }) => setProjects(data || []));
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-4xl font-bold">จัดการโครงการ</h1><Button><Plus size={20} />สร้างโครงการ</Button></div>
      {projects.length === 0 ? <Card className="p-12 text-center"><p>ยังไม่มีโครงการ</p></Card> : <div className="grid gap-4">{projects.map(p => <Card key={p.id} className="p-4"><h3 className="font-bold">{p.name}</h3></Card>)}</div>}
    </div>
  );
};

export default Projects;