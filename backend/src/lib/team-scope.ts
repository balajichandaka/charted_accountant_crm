import { prisma } from "./prisma";

export async function managedEmployeeIds(managerId: string): Promise<string[]> {
  const rows = await prisma.ticket.findMany({
    where: { managerId, assigneeId: { not: null } },
    select: { assigneeId: true },
    distinct: ["assigneeId"],
  });
  return rows.map((r) => r.assigneeId!).filter(Boolean);
}

export async function canViewEmployee(
  viewerRole: "CA" | "MANAGER" | "EMPLOYEE",
  viewerId: string,
  targetUserId: string
): Promise<boolean> {
  if (viewerId === targetUserId) return true;
  if (viewerRole === "CA") return true;
  if (viewerRole === "MANAGER") {
    const allowed = await managedEmployeeIds(viewerId);
    return allowed.includes(targetUserId);
  }
  return false;
}
