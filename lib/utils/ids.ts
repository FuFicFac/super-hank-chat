import { customAlphabet } from "nanoid";

const id = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export function newSessionId() {
  return `sess_${id()}`;
}

export function newMessageId() {
  return `msg_${id()}`;
}

export function newEventId() {
  return `evt_${id()}`;
}
