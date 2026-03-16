import { USERS } from './config.js';

export const state = {
  sb: null,
  db: Object.fromEntries(USERS.map(user => [user, []])),
  syncTimer: null,
  editCtx: null,
  searchTimers: {},
  selectedCover: {},
};
