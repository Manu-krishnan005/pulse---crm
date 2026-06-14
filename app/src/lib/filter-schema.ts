import { z } from 'zod';

// Supported filterable fields
export const FILTERABLE_FIELDS = [
  'totalSpend',
  'lastOrderDate',
  'daysSinceLastOrder',
  'tags',
  'orderCount',
  'name',
  'email',
] as const;

export type FilterableField = (typeof FILTERABLE_FIELDS)[number];

export const OPERATORS = [
  'gt', 'lt', 'gte', 'lte', 'eq', 'neq',
  'contains', 'not_contains', 'in', 'between',
  'is_null', 'is_not_null',
] as const;

export type FilterOperator = (typeof OPERATORS)[number];

// A single condition leaf
export const FilterConditionSchema: z.ZodType<FilterCondition> = z.object({
  field: z.enum(FILTERABLE_FIELDS),
  op: z.enum(OPERATORS),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
    z.null(),
  ]).optional(),
});

export type FilterCondition = {
  field: FilterableField;
  op: FilterOperator;
  value?: string | number | string[] | number[] | null;
};

// A group of conditions (recursive)
export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    operator: z.enum(['AND', 'OR']),
    conditions: z.array(
      z.union([FilterConditionSchema, FilterGroupSchema])
    ).min(1),
  })
);

export type FilterGroup = {
  operator: 'AND' | 'OR';
  conditions: Array<FilterCondition | FilterGroup>;
};

export function isFilterGroup(obj: FilterCondition | FilterGroup): obj is FilterGroup {
  return 'operator' in obj && 'conditions' in obj;
}

export function validateFilterGroup(raw: unknown): FilterGroup {
  return FilterGroupSchema.parse(raw);
}

export const FIELD_LABELS: Record<FilterableField, string> = {
  totalSpend: 'Total Spend (₹)',
  lastOrderDate: 'Last Order Date',
  daysSinceLastOrder: 'Days Since Last Order',
  tags: 'Tags',
  orderCount: 'Number of Orders',
  name: 'Customer Name',
  email: 'Email',
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  gt: 'is greater than',
  lt: 'is less than',
  gte: 'is at least',
  lte: 'is at most',
  eq: 'equals',
  neq: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  in: 'is one of',
  between: 'is between',
  is_null: 'has no value',
  is_not_null: 'has a value',
};
