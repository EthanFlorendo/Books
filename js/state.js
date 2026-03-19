import { USERS } from './config.js';

export const state = {
  sb: null,
  db: Object.fromEntries(USERS.map(user => [user, []])),
  syncTimer: null,
  editCtx: null,
  isAdmin: false,
  searchTimers: {},
  selectedCover: {},
  sorts: Object.fromEntries(USERS.map(user => [user, 'date'])),
};
