/**
 * Every desk query must include this. An empty id is refused so a missing
 * session can never turn into "all businesses".
 */
export function tenantWhere(businessId: string): { businessId: string } {
  if (!businessId) {
    throw new Error("Refusing a query that is not scoped to a business.");
  }
  return { businessId };
}

export function recordsForBusiness<T extends { businessId: string }>(
  records: T[],
  businessId: string,
): T[] {
  const scope = tenantWhere(businessId);
  return records.filter((record) => record.businessId === scope.businessId);
}
