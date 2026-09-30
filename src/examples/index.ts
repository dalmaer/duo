/**
 * Every example the explorer knows, in catalog order within each category.
 *
 * Adding one: write `src/examples/<id>.ts` exporting an `Example` (see
 * src/core/example.ts and cajon.ts, the reference), import it here, and add
 * it to the list. `index.test.ts` checks the rest.
 */

import type { Example } from "../core/example.ts";
import { cajonExample } from "./cajon.ts";
import { battleshipsExample } from "./battleships.ts";
import { hingeGuessExample } from "./hinge-guess.ts";
import { pocketConsoleExample } from "./pocket-console.ts";
import { duoManExample } from "./duo-man.ts";
import { critterdexExample } from "./critterdex.ts";
import { samplerExample } from "./sampler.ts";
import { readerExample } from "./reader.ts";
import { sketchbookExample } from "./sketchbook.ts";
import { flashcardsExample } from "./flashcards.ts";
import { mailExample } from "./mail.ts";
import { videoExample } from "./video.ts";

export const EXAMPLES: Example[] = [
  cajonExample,
  samplerExample,
  battleshipsExample,
  hingeGuessExample,
  pocketConsoleExample,
  duoManExample,
  critterdexExample,
  readerExample,
  sketchbookExample,
  flashcardsExample,
  mailExample,
  videoExample,
];

export function byId(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
