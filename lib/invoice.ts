import type { Booking, Riad, Room } from "@/types";
import { formatDate, formatMoney } from "@/lib/format";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

// Morocco: lodging is usually 10%, other services 20%. Confirm with your accountant.
const ROOM_VAT_RATE = 0.1;
const EXPERIENCE_VAT_RATE = 0.2;

// Tourist tax: fixed 25 MAD per person per night (not subject to VAT).
const TOURIST_TAX_RATE = 25;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Splits a VAT-inclusive (TTC) amount into HT and TVA. */
const splitTtc = (ttc: number, rate: number) => {
  const ht = round2(ttc / (1 + rate));
  return { ht, vat: round2(ttc - ht) };
};

/** Number of nights between two dates (YYYY-MM-DD). */
const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.max(
    0,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    ),
  );

/** Tourist tax = rate per person per night x guests x nights. Not subject to VAT. */
const calcTouristTax = (
  ratePerPersonPerNight: number,
  guests: number,
  nights: number,
) => round2(ratePerPersonPerNight * guests * nights);

/** Opens a print-ready invoice in a new window (demo: no PDF backend). */
export function printInvoice({
  booking,
  room,
  riad,
}: {
  booking: Booking;
  room?: Room;
  riad?: Riad | null;
}): boolean {
  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) return false;

  const experiencesTtc = booking.experiencesTotal ?? 0;
  const storedTouristTax = booking.touristTax ?? 0;
  const roomTtc =
    booking.roomTotal ?? booking.total - experiencesTtc - storedTouristTax;

  // Tourist tax: always calculated with the fixed rate above.
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const guests = booking.guests ?? 1;
  const touristTax = calcTouristTax(TOURIST_TAX_RATE, guests, nights);
  const touristTaxLabel = `Tourist tax (${formatMoney(TOURIST_TAX_RATE)} × ${guests} guest${guests > 1 ? "s" : ""} × ${nights} night${nights > 1 ? "s" : ""}, not subject to VAT)`;

  // Total TTC is recomputed from the lines so it always adds up.
  const totalTtc = round2(roomTtc + experiencesTtc + touristTax);
  const balance = round2(totalTtc - booking.paid);

  const roomSplit = splitTtc(roomTtc, ROOM_VAT_RATE);
  const expSplit = splitTtc(experiencesTtc, EXPERIENCE_VAT_RATE);

  const totalHt = round2(roomSplit.ht + expSplit.ht);
  const vatLines = [
    { rate: ROOM_VAT_RATE, amount: roomSplit.vat },
    ...(experiencesTtc > 0
      ? [{ rate: EXPERIENCE_VAT_RATE, amount: expSplit.vat }]
      : []),
  ];

  const lines = [
    `<tr><td>${escapeHtml(room?.name ?? "Room")} · ${escapeHtml(formatDate(booking.checkIn))} → ${escapeHtml(
      formatDate(booking.checkOut),
    )}</td><td class="right">${escapeHtml(formatMoney(roomSplit.ht))}</td><td class="right">${ROOM_VAT_RATE * 100}%</td><td class="right">${escapeHtml(formatMoney(roomTtc))}</td></tr>`,
  ];

  if (experiencesTtc > 0) {
    lines.push(
      `<tr><td>Experiences</td><td class="right">${escapeHtml(formatMoney(expSplit.ht))}</td><td class="right">${EXPERIENCE_VAT_RATE * 100}%</td><td class="right">${escapeHtml(formatMoney(experiencesTtc))}</td></tr>`,
    );
  }
  if (touristTax > 0) {
    lines.push(
      `<tr><td>${escapeHtml(touristTaxLabel)}</td><td class="right">${escapeHtml(formatMoney(touristTax))}</td><td class="right">–</td><td class="right">${escapeHtml(formatMoney(touristTax))}</td></tr>`,
    );
  }

  win.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(booking.code)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #241c17; margin: 0; padding: 48px; background: #f8f5f0; }
      .sheet { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e3dbd0; border-radius: 12px; padding: 40px; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7c2d12; padding-bottom: 20px; }
      .brand { font-size: 22px; font-weight: 700; color: #7c2d12; }
      .muted { color: #6b5d52; font-size: 13px; line-height: 1.6; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
      th, td { padding: 10px 0; border-bottom: 1px solid #e3dbd0; text-align: left; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #6b5d52; }
      .right { text-align: right; }
      .totals { margin-top: 24px; margin-left: auto; width: 55%; font-size: 14px; }
      .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
      .grand { border-top: 2px solid #7c2d12; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 16px; }
      .foot { margin-top: 36px; font-size: 12px; color: #6b5d52; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="top">
        <div>
          <div class="brand">${escapeHtml(riad?.name ?? "Riadna")}</div>
          <div class="muted">${escapeHtml(riad?.address ?? "")}</div>
          <div class="muted">${escapeHtml(riad?.phone ?? "")}</div>
        </div>
        <div class="right">
          <h1>Invoice</h1>
          <div class="muted">${escapeHtml(booking.code)}</div>
          <div class="muted">${escapeHtml(formatDate(booking.createdAt.slice(0, 10)))}</div>
        </div>
      </div>

      <div style="margin-top:24px" class="muted">
        <strong style="color:#241c17">${escapeHtml(booking.guestName)}</strong><br />
        ${escapeHtml(booking.email)}${booking.phone ? `<br />${escapeHtml(booking.phone)}` : ""}
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">HT</th>
            <th class="right">TVA</th>
            <th class="right">TTC</th>
          </tr>
        </thead>
        <tbody>${lines.join("")}</tbody>
      </table>

      <div class="totals">
        <div><span>Total HT</span><span>${escapeHtml(formatMoney(totalHt))}</span></div>
        ${vatLines
          .map(
            (v) =>
              `<div><span>TVA ${v.rate * 100}%</span><span>${escapeHtml(formatMoney(v.amount))}</span></div>`,
          )
          .join("")}
        ${
          touristTax > 0
            ? `<div><span>Tourist tax</span><span>${escapeHtml(formatMoney(touristTax))}</span></div>`
            : ""
        }
        <div><span><strong>Total TTC</strong></span><span><strong>${escapeHtml(formatMoney(totalTtc))}</strong></span></div>
        <div><span>Paid</span><span>${escapeHtml(formatMoney(booking.paid))}</span></div>
        <div class="grand"><span>Balance due</span><span>${escapeHtml(formatMoney(balance))}</span></div>
      </div>

      <p class="foot">Thank you for staying with us. This invoice was generated by Riadna.</p>
    </div>
    <script>window.onload = function () { window.print(); };</script>
  </body>
</html>`);
  win.document.close();
  return true;
}