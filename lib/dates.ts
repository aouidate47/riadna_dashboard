import { differenceInCalendarDays, format, parseISO } from "date-fns";

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const todayISO = () => toISODate(new Date());
export const nightsBetween = (checkIn: string, checkOut: string) =>
  differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));

/** Stays are [checkIn, checkOut): a guest leaving on the 12th and another arriving on the 12th do NOT overlap. */
export const datesOverlap = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn < bOut && aOut > bIn;
