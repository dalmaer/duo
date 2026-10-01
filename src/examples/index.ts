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
import { translatorExample } from "./translator.ts";
import { virtualPetExample } from "./virtual-pet.ts";
import { instantCameraExample } from "./instant-camera.ts";
import { teleprompterExample } from "./teleprompter.ts";
import { subjectPreviewExample } from "./subject-preview.ts";
import { quizBuzzersExample } from "./quiz-buzzers.ts";
import { pinballExample } from "./pinball.ts";
import { pokerExample } from "./poker.ts";
import { popupBookExample } from "./popup-book.ts";
import { splitFlapExample } from "./split-flap.ts";
import { accordionExample } from "./accordion.ts";
import { musicBoxExample } from "./music-box.ts";

export const EXAMPLES: Example[] = [
  cajonExample,
  samplerExample,
  accordionExample,
  musicBoxExample,
  battleshipsExample,
  hingeGuessExample,
  pinballExample,
  pokerExample,
  pocketConsoleExample,
  duoManExample,
  critterdexExample,
  splitFlapExample,
  virtualPetExample,
  instantCameraExample,
  readerExample,
  sketchbookExample,
  translatorExample,
  teleprompterExample,
  flashcardsExample,
  popupBookExample,
  quizBuzzersExample,
  mailExample,
  videoExample,
  subjectPreviewExample,
];

export function byId(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
