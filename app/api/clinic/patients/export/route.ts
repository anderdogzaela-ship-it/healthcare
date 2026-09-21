import { createClient, getUser } from '@/lib/supabase/server';
import { getClinicContext } from '@/lib/data/clinic';
import { getLocale } from '@/lib/i18n/get-locale';
import { messages } from '@/lib/i18n/messages';
import { logDbError } from '@/lib/supabase/log';

export const runtime = 'nodejs';

/**
 * Makes one CSV cell safe.
 *
 * Quotes and line breaks are escaped as RFC 4180 requires, and a value that
 * starts like a formula is prefixed with an apostrophe, so a spreadsheet
 * opening the file never runs something a patient typed into their name.
 */
function cell(value: string | null | undefined): string {
  let text = value ?? '';
  // A phone number such as +5511999990000 is only digits, so it cannot run.
  if (/^[=+\-@\t\r]/.test(text) && !/^\+\d+$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * GET /api/clinic/patients/export — the active clinic's patient list as CSV.
 *
 * Only the clinic owner may download it: it is the whole roster of personal
 * data in one file. Rows come from the owner's own session, so row level
 * security keeps them to this clinic.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const clinic = await getClinicContext(user.id);
  if (!clinic) return Response.json({ error: 'no_clinic' }, { status: 404 });
  if (clinic.role !== 'owner') return Response.json({ error: 'forbidden' }, { status: 403 });

  const { data: patients, error } = await createClient()
    .from('patients')
    .select('full_name, email, phone, status, date_of_birth, locale, last_visit_at, notes, created_at')
    .eq('clinic_id', clinic.id)
    .order('full_name', { ascending: true });

  logDbError('clinic.export', error);
  if (error) return Response.json({ error: 'failed' }, { status: 500 });

  const m = messages[getLocale()];
  const csv = m.clinic.csv;
  const header = [csv.name, csv.email, csv.phone, csv.status, csv.dateOfBirth, csv.language, csv.lastVisit, csv.notes, csv.createdAt];

  const rows = (patients ?? []).map((patient) => [
    patient.full_name,
    patient.email,
    patient.phone,
    m.clinic.statuses[patient.status],
    patient.date_of_birth,
    patient.locale,
    patient.last_visit_at?.slice(0, 10),
    patient.notes,
    patient.created_at.slice(0, 10),
  ]);

  // The byte-order mark makes Excel read accents correctly.
  const body = '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';

  const slug = clinic.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clinic';
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="patients-${slug}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
