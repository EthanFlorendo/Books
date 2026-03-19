import { USERS } from './config.js';

export const state = {
  sb: null,
  db: Object.fromEntries(USERS.map(user => [user, []])),
  editCtx: null,
  session: null,
  user: null,
  access: null,
  authCleanup: null,
  searchTimers: {},
  selectedCover: {},
  sorts: Object.fromEntries(USERS.map(user => [user, 'date'])),
};
