import { format, parseISO } from "date-fns";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) => money.format(value);

export const formatDate = (iso: string, pattern = "d MMM yyyy") => format(parseISO(iso), pattern);

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

/** "2 adults · 1 child", or "2 guests" when there are no children. */
export const formatParty = ({ guests, adults, children }: { guests: number; adults?: number; children?: number }) =>
  children && adults !== undefined
    ? `${pluralize(adults, "adult")} · ${pluralize(children, "child", "children")}`
    : pluralize(guests, "guest");
