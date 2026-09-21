import type { Locale } from '@/lib/i18n/config';
import { messages } from '@/lib/i18n/messages';
import type { WeeklyReport } from '@/lib/data/weekly-report';
import { fill, presentReport } from '@/lib/report/present';
import type { OutgoingEmail } from './send';

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The weekly report as an email, in the recipient's language.
 *
 * Tables and inline styles, because that is what email clients render
 * reliably. Every value is escaped: names and symptoms come from user input.
 */
export function weeklyReportEmail(
  report: WeeklyReport,
  { locale, name, to, reportUrl }: { locale: Locale; name: string; to: string; reportUrl: string }
): OutgoingEmail {
  const m = messages[locale];
  const r = m.report;
  const view = presentReport(report, m, locale);

  const subject = fill(r.email.subject, { from: view.from, to: view.to });
  // Callers fall back to the start of the address, so there is always a name.
  const greeting = fill(r.email.greeting, { name: name || to.split('@')[0] });

  const sectionHtml = view.sections
    .map(
      (section) => `
      <tr><td style="padding:20px 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#059669">${escape(section.title)}</td></tr>
      ${section.rows
        .map(
          (row) => `
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:14px;color:#475569">${escape(row.label)}</td>
          <td align="right" style="font-size:15px;font-weight:700;color:#0f172a">${escape(row.value)}</td>
        </tr>${
          row.previous
            ? `<tr><td></td><td align="right" style="font-size:12px;color:#94a3b8">${escape(row.previous)}</td></tr>`
            : ''
        }</table>
      </td></tr>`
        )
        .join('')}`
    )
    .join('');

  const symptomsHtml = `
      <tr><td style="padding:20px 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#059669">${escape(r.symptomsTitle)}</td></tr>
      <tr><td style="font-size:14px;color:#475569;line-height:1.6">${
        view.symptoms.length > 0 ? view.symptoms.map(escape).join('<br>') : escape(r.noSymptoms)
      }</td></tr>`;

  const html = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#059669;padding:24px 28px;color:#ffffff">
          <div style="font-size:20px;font-weight:800">HealthAI</div>
          <div style="font-size:14px;opacity:.9;margin-top:4px">${escape(r.title)} · ${escape(view.period)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px 8px">
          <p style="margin:0 0 8px;font-size:16px;color:#0f172a">${escape(greeting)}</p>
          <p style="margin:0;font-size:14px;color:#475569">${escape(r.email.intro)} ${escape(view.logged)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionHtml}${symptomsHtml}</table>
          <p style="margin:28px 0 8px;text-align:center">
            <a href="${escape(reportUrl)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">${escape(r.email.cta)}</a>
          </p>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.5">${escape(r.disclaimer)}</p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:11px;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9">${escape(r.email.footer)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    greeting,
    '',
    `${r.email.intro} ${view.logged}`,
    ...view.sections.flatMap((section) => [
      '',
      section.title.toUpperCase(),
      ...section.rows.map((row) => `- ${row.label}: ${row.value}${row.previous ? ` (${row.previous})` : ''}`),
    ]),
    '',
    r.symptomsTitle.toUpperCase(),
    ...(view.symptoms.length > 0 ? view.symptoms.map((line) => `- ${line}`) : [r.noSymptoms]),
    '',
    `${r.email.cta}: ${reportUrl}`,
    '',
    r.disclaimer,
    '',
    r.email.footer,
  ].join('\n');

  return { to, subject, html, text };
}
