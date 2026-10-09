import { randomInt } from "node:crypto";

// No 0/O, 1/I/L: people read these aloud and retype them from an email.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP_LENGTH = 4;

export const CONTACT_REFERENCE_PATTERN = /^RM-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

function randomGroup(): string {
  let group = "";
  for (let index = 0; index < GROUP_LENGTH; index += 1) {
    group += ALPHABET[randomInt(ALPHABET.length)];
  }
  return group;
}

// e.g. RM-7K3P-9QXA. 31^8 (~850 billion) values; the unique index catches the rare clash.
export function createContactReference(): string {
  return `RM-${randomGroup()}-${randomGroup()}`;
}
