import type { Locale } from '@/lib/i18n/config';

/**
 * Messages sent over WhatsApp. They live here rather than in the UI
 * translations because they are produced server-side, outside any request from
 * the browser, and they need to stay short enough for a chat bubble.
 */

export interface ReminderContext {
  firstName: string;
  when: string;
  professional: string;
  location: string | null;
}

type Template = (context: ReminderContext) => string;

const REMINDER_24H: Record<Locale, Template> = {
  en: ({ firstName, when, professional }) =>
    `Hi ${firstName}! A reminder of your appointment${professional ? ` with ${professional}` : ''} tomorrow at ${when}. Reply YES to confirm, NO to cancel, or CHANGE to reschedule.`,
  es: ({ firstName, when, professional }) =>
    `¡Hola ${firstName}! Te recordamos tu cita${professional ? ` con ${professional}` : ''} mañana a las ${when}. Responde SÍ para confirmar, NO para cancelar o CAMBIAR para reprogramar.`,
  pt: ({ firstName, when, professional }) =>
    `Oi ${firstName}! Lembrete da sua consulta${professional ? ` com ${professional}` : ''} amanhã às ${when}. Responda SIM para confirmar, NÃO para cancelar ou REMARCAR para mudar o horário.`,
};

const REMINDER_2H: Record<Locale, Template> = {
  en: ({ when, location }) =>
    `Your appointment is today at ${when}${location ? `, at ${location}` : ''}. See you soon! Reply NO if you can no longer make it.`,
  es: ({ when, location }) =>
    `Tu cita es hoy a las ${when}${location ? `, en ${location}` : ''}. ¡Te esperamos! Responde NO si ya no puedes asistir.`,
  pt: ({ when, location }) =>
    `Sua consulta é hoje às ${when}${location ? `, em ${location}` : ''}. Até logo! Responda NÃO se não puder mais comparecer.`,
};

const FOLLOW_UP: Record<Locale, Template> = {
  en: ({ firstName }) =>
    `Hi ${firstName}, we missed you at your appointment. Would you like to book another time? Reply CHANGE and we will find a new slot.`,
  es: ({ firstName }) =>
    `Hola ${firstName}, te extrañamos en tu cita. ¿Quieres agendar otro horario? Responde CAMBIAR y buscamos uno nuevo.`,
  pt: ({ firstName }) =>
    `Oi ${firstName}, sentimos sua falta na consulta. Quer marcar outro horário? Responda REMARCAR que encontramos uma nova data.`,
};

export function reminderMessage(kind: '24h' | '2h' | 'follow_up', locale: Locale, context: ReminderContext): string {
  const templates = kind === '24h' ? REMINDER_24H : kind === '2h' ? REMINDER_2H : FOLLOW_UP;
  return templates[locale](context);
}

/** What the bot replies once it has understood an inbound message. */
export const REPLIES: Record<Locale, Record<'confirmed' | 'cancelled' | 'reschedule' | 'none' | 'unknown', string>> = {
  en: {
    confirmed: 'Thank you, your appointment is confirmed. See you then!',
    cancelled: 'Your appointment has been cancelled. Reply CHANGE whenever you want to book a new one.',
    reschedule: 'No problem. Our team will contact you shortly to find a new time.',
    none: 'You have no upcoming appointments right now.',
    unknown: 'Sorry, I did not understand. Reply YES to confirm, NO to cancel, or CHANGE to reschedule.',
  },
  es: {
    confirmed: 'Gracias, tu cita está confirmada. ¡Nos vemos!',
    cancelled: 'Tu cita fue cancelada. Responde CAMBIAR cuando quieras agendar otra.',
    reschedule: 'Sin problema. Nuestro equipo te contactará en breve para buscar un nuevo horario.',
    none: 'Por ahora no tienes citas próximas.',
    unknown: 'Perdón, no entendí. Responde SÍ para confirmar, NO para cancelar o CAMBIAR para reprogramar.',
  },
  pt: {
    confirmed: 'Obrigado, sua consulta está confirmada. Até lá!',
    cancelled: 'Sua consulta foi cancelada. Responda REMARCAR quando quiser agendar outra.',
    reschedule: 'Sem problema. Nossa equipe entra em contato em breve para encontrar um novo horário.',
    none: 'Você não tem consultas marcadas no momento.',
    unknown: 'Desculpe, não entendi. Responda SIM para confirmar, NÃO para cancelar ou REMARCAR para mudar o horário.',
  },
};

export type Intent = 'confirm' | 'cancel' | 'reschedule' | 'unknown';

const CONFIRM_WORDS = ['yes', 'y', 'confirm', 'confirmed', 'ok', 'okay', 'sí', 'si', 'confirmar', 'confirmo', 'sim'];
const CANCEL_WORDS = ['no', 'n', 'cancel', 'cancelar', 'cancelo', 'não', 'nao'];
const RESCHEDULE_WORDS = ['change', 'reschedule', 'cambiar', 'reprogramar', 'remarcar', 'mudar', 'trocar'];

/** Maps a free-text WhatsApp reply to an intent, in any of the three languages. */
export function detectIntent(text: string): Intent {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  const strip = (list: string[]) => list.map((w) => w.normalize('NFD').replace(/[̀-ͯ]/g, ''));

  // Reschedule first: "no, I want to change" is a reschedule, not a cancel.
  if (words.some((word) => strip(RESCHEDULE_WORDS).includes(word))) return 'reschedule';
  if (words.some((word) => strip(CONFIRM_WORDS).includes(word))) return 'confirm';
  if (words.some((word) => strip(CANCEL_WORDS).includes(word))) return 'cancel';
  return 'unknown';
}
