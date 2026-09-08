/**
 * Backfills Order.scheduledAt from the Persian bookingDate + timeSlot strings.
 *
 * Orders created before the scheduling column exist only as display strings, so
 * conflict detection and the 24-hour contact release cannot see them. This
 * parses what is there. Rows it cannot parse are reported and left alone —
 * a wrong instant would release a phone number on the wrong day.
 *
 * Dry run by default. Pass --apply.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;
const BREAKS = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
function jalCal(jy) {
  const bl = BREAKS.length, gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jump = 0;
  if (jy < jp || jy >= BREAKS[bl-1]) throw new RangeError("out of range");
  for (let i = 1; i < bl; i++) { const jm = BREAKS[i]; jump = jm - jp; if (jy < jm) break;
    leapJ += div(jump,33)*8 + div(mod(jump,33),4); jp = jm; }
  const n = jy - jp;
  leapJ += div(n,33)*8 + div(mod(n,33)+3,4);
  if (mod(jump,33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy,4) - div((div(gy,100)+1)*3,4) - 150;
  return { gy, march: 20 + leapJ - leapG };
}
const g2d = (gy,gm,gd) => { let d = div((gy+div(gm-8,6)+100100)*1461,4) + div(153*mod(gm+9,12)+2,5) + gd - 34840408;
  return d - div(div(gy+100100+div(gm-8,6),100)*3,4) + 752; };
function d2g(jdn) { let j = 4*jdn + 139361631; j = j + div(div(4*jdn+183187720,146097)*3,4)*4 - 3908;
  const i = div(mod(j,1461),4)*5 + 308; return { gy: div(j,1461)-100100+div(8-(mod(div(i,153),12)+1),6),
  gm: mod(div(i,153),12)+1, gd: div(mod(i,153),5)+1 }; }
const en = (s) => s.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
function resolve(bookingDate, timeSlot) {
  if (!bookingDate) return null;
  const p = en(bookingDate).trim().split(/[\/\-]/);
  if (p.length !== 3) return null;
  const [jy,jm,jd] = p.map(x => parseInt(x,10));
  if (![jy,jm,jd].every(Number.isFinite) || jm<1||jm>12||jd<1||jd>31) return null;
  let g; try { const r = jalCal(jy); g = d2g(g2d(r.gy,3,r.march) + (jm-1)*31 - div(jm,7)*(jm-7) + jd - 1); } catch { return null; }
  const m = timeSlot ? en(timeSlot).match(/(\d{1,2})\s*:\s*\d{2}/) : null;
  const hour = m ? parseInt(m[1],10) : 0;
  return new Date(Date.UTC(g.gy, g.gm-1, g.gd, hour, 0, 0) - 3.5*3600000);
}

const rows = await prisma.order.findMany({
  where: { scheduledAt: null, bookingDate: { not: null } },
  select: { id: true, bookingDate: true, timeSlot: true, categoryTitle: true },
});
console.log(APPLY ? "MODE: apply" : "MODE: dry run — pass --apply to write");
console.log(`orders without scheduledAt: ${rows.length}\n`);
let okCount = 0, failed = [];
for (const r of rows) {
  const at = resolve(r.bookingDate, r.timeSlot);
  if (!at) { failed.push(r); continue; }
  const fa = new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(at);
  console.log(`  ${r.id.slice(0,8)}  ${r.bookingDate} ${(r.timeSlot||"").slice(0,14)} -> ${fa}`);
  if (APPLY) await prisma.order.update({ where: { id: r.id }, data: { scheduledAt: at } });
  okCount++;
}
if (failed.length) { console.log(`\nunparseable (left alone): ${failed.length}`);
  for (const r of failed) console.log(`  ${r.id.slice(0,8)}  ${JSON.stringify(r.bookingDate)}`); }
console.log(APPLY ? `\nBackfilled ${okCount}.` : `\nWould backfill ${okCount}. Nothing written.`);
await prisma.$disconnect();
