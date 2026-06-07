import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmployeeManager } from "@/components/employees/employee-manager";
import { Card, CardContent } from "@/components/ui/card";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  openTickets: number;
};

export default async function EmployeesPage() {
  await requireCA();
  const token = await getToken();

  const employees = await apiGet<Employee[]>("/api/employees", token);

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage logins and roles for your team."
      />
      <Card>
        <CardContent className="pt-6">
          <EmployeeManager
            employees={employees.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role as "CA" | "EMPLOYEE",
              isActive: u.isActive,
              openTickets: u.openTickets,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
