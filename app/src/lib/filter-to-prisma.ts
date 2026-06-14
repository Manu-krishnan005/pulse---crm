import {
  FilterGroup,
  FilterCondition,
  FilterableField,
  FilterOperator,
  isFilterGroup,
} from './filter-schema';
import { Prisma } from '@prisma/client';

// Map filter field + op to Prisma where condition
function conditionToWhere(condition: FilterCondition): Prisma.CustomerWhereInput {
  const { field, op, value } = condition;

  switch (field) {
    case 'totalSpend':
      return buildNumericFilter('totalSpend', op, value as number);

    case 'lastOrderDate':
      return buildDateFilter('lastOrderDate', op, value as string);

    case 'daysSinceLastOrder': {
      const days = Number(value);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      if (op === 'gte') return { lastOrderDate: { lte: cutoff } };
      if (op === 'lte') return { lastOrderDate: { gte: cutoff } };
      if (op === 'gt') return { lastOrderDate: { lt: cutoff } };
      if (op === 'lt') return { lastOrderDate: { gt: cutoff } };
      return {};
    }

    case 'tags': {
      const tagValue = String(value);
      if (op === 'contains') return { tags: { has: tagValue } };
      if (op === 'not_contains') return { NOT: { tags: { has: tagValue } } };
      if (op === 'in') return { tags: { hasSome: Array.isArray(value) ? (value as string[]) : [tagValue] } };
      return {};
    }

    case 'orderCount': {
      // Prisma supports filtering on relation _count via where
      // Use a supported approximation for each op
      if (op === 'gte' && Number(value) <= 1) return { orders: { some: {} } };
      if (op === 'eq' && Number(value) === 0) return { orders: { none: {} } };
      if (op === 'eq' && Number(value) >= 1) return { orders: { some: {} } };
      if (op === 'gt') return { orders: { some: {} } };
      // For complex count filters we fall back to "has some orders"
      return { orders: { some: {} } };
    }

    case 'name': {
      const str = String(value);
      if (op === 'contains') return { name: { contains: str, mode: 'insensitive' } };
      if (op === 'eq') return { name: { equals: str, mode: 'insensitive' } };
      return {};
    }

    case 'email': {
      const str = String(value);
      if (op === 'contains') return { email: { contains: str, mode: 'insensitive' } };
      if (op === 'eq') return { email: { equals: str, mode: 'insensitive' } };
      return {};
    }

    default:
      return {};
  }
}

function buildNumericFilter(
  field: string,
  op: FilterOperator,
  value: number | unknown,
): Prisma.CustomerWhereInput {
  const num = Number(value);
  const map: Partial<Record<FilterOperator, Prisma.FloatFilter>> = {
    gt: { gt: num },
    lt: { lt: num },
    gte: { gte: num },
    lte: { lte: num },
    eq: { equals: num },
    neq: { not: num },
  };
  if (op === 'between' && Array.isArray(value)) {
    return { [field]: { gte: Number(value[0]), lte: Number(value[1]) } };
  }
  if (op === 'is_null') return { [field]: { equals: null } } as Prisma.CustomerWhereInput;
  if (op === 'is_not_null') return { [field]: { not: null } } as Prisma.CustomerWhereInput;
  return { [field]: map[op] ?? {} };
}

function buildDateFilter(
  field: string,
  op: FilterOperator,
  value: string | unknown,
): Prisma.CustomerWhereInput {
  const date = new Date(String(value));
  const map: Partial<Record<FilterOperator, object>> = {
    gt: { gt: date },
    lt: { lt: date },
    gte: { gte: date },
    lte: { lte: date },
    eq: { equals: date },
  };
  if (op === 'is_null') return { [field]: null };
  if (op === 'is_not_null') return { [field]: { not: null } };
  return { [field]: map[op] ?? {} };
}

// Convert a FilterGroup to Prisma CustomerWhereInput
export function filterGroupToPrismaWhere(
  group: FilterGroup,
): Prisma.CustomerWhereInput {
  const conditions = group.conditions.map((condition) => {
    if (isFilterGroup(condition)) {
      return filterGroupToPrismaWhere(condition);
    }
    return conditionToWhere(condition);
  });

  if (group.operator === 'AND') {
    return { AND: conditions };
  } else {
    return { OR: conditions };
  }
}
