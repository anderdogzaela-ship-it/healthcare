import type { Locale } from '@/lib/i18n/config';

/**
 * Symptoms that need urgent care rather than a chat answer. Checked before the
 * message ever reaches the model: an assistant that "reassures" someone with
 * chest pain is the worst failure this product can have.
 */
const RED_FLAGS: Record<Locale, string[]> = {
  en: [
    'chest pain', 'chest pressure', 'can\'t breathe', 'cannot breathe', 'trouble breathing',
    'shortness of breath at rest', 'stroke', 'face drooping', 'slurred speech',
    'numb on one side', 'severe bleeding', 'coughing blood', 'suicide', 'kill myself',
    'end my life', 'overdose', 'unconscious', 'seizure', 'anaphylaxis',
  ],
  es: [
    'dolor en el pecho', 'presión en el pecho', 'no puedo respirar', 'dificultad para respirar',
    'derrame cerebral', 'ictus', 'cara caída', 'habla arrastrada', 'entumecido de un lado',
    'sangrado abundante', 'toser sangre', 'suicidio', 'quitarme la vida', 'matarme',
    'sobredosis', 'inconsciente', 'convulsión', 'anafilaxia',
  ],
  pt: [
    'dor no peito', 'aperto no peito', 'não consigo respirar', 'falta de ar',
    'dificuldade para respirar', 'avc', 'derrame', 'rosto caído', 'fala enrolada',
    'dormência de um lado', 'sangramento intenso', 'tossindo sangue', 'suicídio',
    'me matar', 'tirar minha vida', 'overdose', 'desmaiou', 'inconsciente',
    'convulsão', 'anafilaxia',
  ],
};

/** True when the message describes something that needs emergency care now. */
export function hasRedFlag(message: string): boolean {
  const text = message.toLowerCase();
  return Object.values(RED_FLAGS).some((phrases) => phrases.some((phrase) => text.includes(phrase)));
}

/** What the assistant replies instead of answering, in the user's language. */
export const EMERGENCY_REPLY: Record<Locale, string> = {
  en: 'What you describe can be a medical emergency. Please stop using this app and get help now: call your local emergency number or go to the nearest emergency department. I am not able to assess urgent symptoms, and waiting for an answer here could cost you time that matters.',
  es: 'Lo que describes puede ser una emergencia médica. Deja de usar esta aplicación y busca ayuda ahora mismo: llama al número de emergencias de tu país o acude al servicio de urgencias más cercano. No puedo evaluar síntomas urgentes y esperar una respuesta aquí puede costarte un tiempo valioso.',
  pt: 'O que você descreve pode ser uma emergência médica. Pare de usar este aplicativo e procure ajuda agora: ligue para o número de emergência da sua região (no Brasil, 192 para o SAMU) ou vá ao pronto-socorro mais próximo. Não consigo avaliar sintomas urgentes, e esperar uma resposta aqui pode custar um tempo precioso.',
};
