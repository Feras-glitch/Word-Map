// الرحلات مربوطة ببيانات التطبيق (المنطق في journeys-core.js)
import { states, byId, continents, contEmoji, contOrder, pool } from './data.js';
import { buildJourneys, stateOf } from './journeys-core.js';

const D = { states, byId, continents, contEmoji, contOrder, pool };
export const journeys = (level = 3) => buildJourneys(D, level);
export const journeyState = (p) => stateOf(journeys(p.level), p);
