import type { Locale } from '../config';
import en, { type Messages } from './en';
import es from './es';
import pt from './pt';

export type { Messages };

export const messages: Record<Locale, Messages> = { en, es, pt };
