// dbEvents.js
export const dbEvents = new BroadcastChannel("db-events");

export const DB_EVENTS = {
  PHOTO_ADDED: "PHOTO_ADDED",
  PHOTO_UPDATED: "PHOTO_UPDATED",
  PHOTO_DELETED: "PHOTO_DELETED",
};
