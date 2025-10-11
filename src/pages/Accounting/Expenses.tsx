import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Expenses() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ค่าใช้จ่าย</h1>
      <Card>
        <CardHeader>
          <CardTitle>รายการค่าใช้จ่าย</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">หน้านี้อยู่ระหว่างการพัฒนา</p>
        </CardContent>
      </Card>
    </div>
  );
}
