import { tenantWhere } from "@/lib/tenancy";
import { getPrisma } from "@/server/prisma";

export async function sectionForWrite(businessId: string, jobId: string, requestedId?: string, typeKey?: string) {
  const prisma = getPrisma();
  if (requestedId) {
    const found = await prisma.jobSection.findFirst({
      where: { id: requestedId, jobId, ...tenantWhere(businessId) },
    });
    if (found) return found;
  }
  if (typeKey) {
    const typed = await prisma.jobSection.findFirst({
      where: { jobId, typeKey, ...tenantWhere(businessId) },
      orderBy: { sortOrder: "asc" },
    });
    if (typed) return typed;
    const blank = await prisma.jobSection.findFirst({
      where: { jobId, typeKey: "", ...tenantWhere(businessId) },
      orderBy: { sortOrder: "asc" },
    });
    if (blank) return blank;
    const last = await prisma.jobSection.findFirst({
      where: { jobId, ...tenantWhere(businessId) },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return prisma.jobSection.create({
      data: { businessId, jobId, title: "", typeKey: "", sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
  const first = await prisma.jobSection.findFirst({
    where: { jobId, ...tenantWhere(businessId) },
    orderBy: { sortOrder: "asc" },
  });
  if (first) return first;
  return prisma.jobSection.create({
    data: { businessId, jobId, title: "", typeKey: "", sortOrder: 0 },
  });
}
