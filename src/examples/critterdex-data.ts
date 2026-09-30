/**
 * The creatures in the Critterdex: all invented for this explorer, drawn as
 * small SVGs in a 100×100 box.
 */

export type CritterType = "Leaf" | "Ember" | "Tide" | "Spark" | "Stone" | "Gale" | "Frost" | "Dusk";

export const TYPE_COLOR: Record<CritterType, string> = {
  Leaf: "#4caf50",
  Ember: "#f26b3a",
  Tide: "#3fa7e0",
  Spark: "#e8b90c",
  Stone: "#9c8b6e",
  Gale: "#5fc4b3",
  Frost: "#7ccbe8",
  Dusk: "#7a5ca8",
};

export interface Critter {
  name: string;
  types: CritterType[];
  kind: string;
  height: string;
  weight: string;
  /** Vigor, Power, Guard, Speed, 0–100. */
  stats: [number, number, number, number];
  entry: string;
  art: string;
}

const O = `stroke="#1d1b24" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const eye = (x: number, y: number, r = 3.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1d1b24"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="#fff"/>`;

export const CRITTERS: Critter[] = [
  {
    name: "Puddlepup",
    types: ["Tide"],
    kind: "Rain Pup",
    height: "0.4 m",
    weight: "6.2 kg",
    stats: [45, 40, 50, 62],
    entry:
      "It follows rain clouds from town to town and naps in the deepest puddle it can find. When it shakes itself dry, a small rainbow often hangs in the air behind it.",
    art: `<g ${O}>
      <path d="M74 66 q18 -4 20 -22 q-9 8 -18 10z" fill="#4aa0d4"/>
      <ellipse cx="58" cy="68" rx="24" ry="15" fill="#5ab4e8"/>
      <rect x="42" y="74" width="9" height="14" rx="4.5" fill="#4aa0d4"/><rect x="64" y="74" width="9" height="14" rx="4.5" fill="#4aa0d4"/>
      <circle cx="38" cy="46" r="17" fill="#6cc0f0"/>
      <path d="M25 36 q-12 8 -7 26 q9 -3 11 -16z" fill="#3a8cc4"/>
      <path d="M50 35 q12 7 9 24 q-8 -3 -10 -13z" fill="#3a8cc4"/>
      <path d="M38 14 q-7 9 0 14 q7 -5 0 -14z" fill="#c4ebff"/>
      <ellipse cx="38" cy="55" rx="3.4" ry="2.4" fill="#17324a"/>
      <path d="M34 59 q4 3 8 0" fill="none"/>
    </g>${eye(32, 46)}${eye(44, 46)}
    <ellipse cx="58" cy="72" rx="12" ry="6" fill="#bfe6fb" opacity=".7"/>`,
  },
  {
    name: "Emberwick",
    types: ["Ember"],
    kind: "Candle Lizard",
    height: "0.3 m",
    weight: "2.1 kg",
    stats: [35, 62, 30, 72],
    entry:
      "A candle-sized salamander whose tail tip never goes out, even underwater. Travellers once carried them in lanterns to light the high mountain passes.",
    art: `<path d="M80 20 q-10 10 -4 20 q-8 -2 -8 -12 q-6 12 2 20 q12 2 14 -10 q2 -10 -4 -18z" fill="#ffcf3a" stroke="#1d1b24" stroke-width="2"/>
    <path d="M78 30 q-4 6 0 12 q4 -4 0 -12z" fill="#fff4b0"/>
    <g ${O}>
      <path d="M50 74 q20 4 26 -12 q2 -8 -2 -14 q-4 14 -22 14z" fill="#f26b3a"/>
      <ellipse cx="44" cy="68" rx="20" ry="13" fill="#f5874f"/>
      <path d="M30 78 l-4 10 h8z M52 78 l2 10 h8z" fill="#e05a2a"/>
      <circle cx="30" cy="50" r="15" fill="#f5874f"/>
      <path d="M22 60 q8 5 16 0" fill="none"/>
    </g>${eye(25, 48)}${eye(36, 48)}
    <ellipse cx="44" cy="72" rx="11" ry="5" fill="#ffd9b0" opacity=".8"/>`,
  },
  {
    name: "Mossback",
    types: ["Leaf", "Stone"],
    kind: "Meadow Shell",
    height: "1.1 m",
    weight: "88.0 kg",
    stats: [82, 45, 90, 14],
    entry:
      "It sleeps for months at a time, and whole meadows take root on its shell. Birds nest in its moss without ever noticing that it is alive.",
    art: `<g ${O}>
      <rect x="26" y="68" width="12" height="16" rx="5" fill="#8a8f96"/><rect x="60" y="68" width="12" height="16" rx="5" fill="#8a8f96"/>
      <path d="M74 66 q10 -2 14 -12 q2 -8 -6 -10 q-8 0 -10 8z" fill="#9aa0a8"/>
      <path d="M12 72 q2 -40 38 -42 q36 2 38 30 q-2 12 -76 12z" fill="#6b8f3a"/>
      <path d="M18 70 h64" fill="none"/>
      <circle cx="30" cy="46" r="7" fill="#8cc152"/><circle cx="48" cy="36" r="8" fill="#8cc152"/><circle cx="66" cy="46" r="7" fill="#8cc152"/><circle cx="46" cy="56" r="6" fill="#a0d468"/>
      <path d="M48 28 v-10" fill="none"/>
    </g>
    <circle cx="48" cy="15" r="5" fill="#ff8fb1" stroke="#1d1b24" stroke-width="2"/><circle cx="48" cy="15" r="1.8" fill="#ffe066"/>
    ${eye(82, 50, 2.6)}`,
  },
  {
    name: "Zapfinch",
    types: ["Spark", "Gale"],
    kind: "Static Finch",
    height: "0.2 m",
    weight: "0.4 kg",
    stats: [30, 55, 25, 96],
    entry:
      "It fluffs its feathers to gather static from the wind, then crackles when startled. Flocks of them make the power lines hum on summer evenings.",
    art: `<g ${O}>
      <path d="M40 22 l6 10 l4 -12 l5 12 l7 -8 l-2 14z" fill="#ffe066"/>
      <path d="M78 62 l14 -2 l-10 10 l12 4 l-16 2z" fill="#3b3f58"/>
      <circle cx="52" cy="56" r="26" fill="#ffd21f"/>
      <path d="M50 58 q18 -6 26 8 q-12 10 -26 2z" fill="#3b3f58"/>
      <path d="M26 54 l-12 4 l12 5z" fill="#ff9f1c"/>
      <path d="M44 82 v8 M58 82 v8" fill="none"/>
    </g>${eye(36, 50)}
    <circle cx="40" cy="62" r="4" fill="#ff8a65" opacity=".7"/>
    <path d="M12 30 l6 -4 l-2 6 l6 -3" fill="none" stroke="#e8b90c" stroke-width="2"/><path d="M84 28 l5 -5 l-1 6 l5 -4" fill="none" stroke="#e8b90c" stroke-width="2"/>`,
  },
  {
    name: "Glimmoth",
    types: ["Dusk", "Gale"],
    kind: "Lantern Moth",
    height: "0.6 m",
    weight: "1.3 kg",
    stats: [50, 48, 44, 70],
    entry:
      "The spots on its wings glow softly after sunset and fade at dawn. Lost hikers who follow a Glimmoth are said to always find their way home.",
    art: `<g ${O}>
      <path d="M50 44 q-30 -34 -42 -14 q-4 18 20 22 q-18 6 -10 24 q14 8 32 -20z" fill="#8a6cc4"/>
      <path d="M50 44 q30 -34 42 -14 q4 18 -20 22 q18 6 10 24 q-14 8 -32 -20z" fill="#8a6cc4"/>
      <ellipse cx="50" cy="54" rx="6" ry="20" fill="#4b3a6b"/>
      <path d="M47 36 q-6 -14 -14 -16 M53 36 q6 -14 14 -16" fill="none"/>
    </g>
    <circle cx="26" cy="32" r="7" fill="#ffe98a"/><circle cx="74" cy="32" r="7" fill="#ffe98a"/>
    <circle cx="26" cy="64" r="4.5" fill="#ffe98a"/><circle cx="74" cy="64" r="4.5" fill="#ffe98a"/>
    <circle cx="26" cy="32" r="12" fill="#ffe98a" opacity=".25"/><circle cx="74" cy="32" r="12" fill="#ffe98a" opacity=".25"/>
    ${eye(47, 40, 2)}${eye(53, 40, 2)}`,
  },
  {
    name: "Pebblit",
    types: ["Stone"],
    kind: "Riverbed",
    height: "0.3 m",
    weight: "24.0 kg",
    stats: [60, 55, 86, 18],
    entry:
      "It rolls downhill for fun and climbs back up very, very slowly. Riverbeds are full of them, pretending to be ordinary stones.",
    art: `<g ${O}>
      <ellipse cx="20" cy="66" rx="8" ry="6" fill="#a9a196"/><ellipse cx="82" cy="64" rx="8" ry="6" fill="#a9a196"/>
      <path d="M22 70 q-6 -36 26 -44 q30 -4 34 26 q4 24 -28 28 q-28 2 -32 -10z" fill="#b9b0a2"/>
      <path d="M58 32 l-6 10 l6 6 M30 60 l8 4" fill="none"/>
    </g>
    <ellipse cx="46" cy="40" rx="10" ry="5" fill="#fff" opacity=".35"/>
    ${eye(42, 56)}${eye(60, 56)}
    <path d="M47 66 q4 3 8 0" fill="none" stroke="#1d1b24" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="50" cy="92" rx="30" ry="3" fill="#1d1b24" opacity=".15"/>`,
  },
  {
    name: "Frostbun",
    types: ["Frost"],
    kind: "Snowdrift",
    height: "0.5 m",
    weight: "3.8 kg",
    stats: [55, 45, 50, 76],
    entry:
      "The icicles on the tips of its long ears chime when it hops. It hides in snowdrifts and breathes tiny clouds of frost to keep its burrow cold.",
    art: `<g ${O}>
      <path d="M36 40 q-10 -26 -2 -34 q10 6 8 34z" fill="#f4f8ff"/>
      <path d="M56 40 q6 -28 16 -32 q6 10 -8 34z" fill="#f4f8ff"/>
      <path d="M34 12 l-3 -8 l6 4z M68 14 l4 -8 l1 8z" fill="#9fe0ff"/>
      <ellipse cx="52" cy="72" rx="24" ry="18" fill="#f4f8ff"/>
      <circle cx="48" cy="50" r="17" fill="#ffffff"/>
      <circle cx="78" cy="78" r="7" fill="#dff3ff"/>
      <path d="M44 88 h10 M60 88 h10" fill="none"/>
    </g>
    <path d="M37 22 q3 -2 2 10 M66 22 q-3 0 -4 10" stroke="#9fe0ff" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eye(42, 48)}${eye(55, 48)}
    <circle cx="38" cy="56" r="3.5" fill="#ffb3c7"/><circle cx="59" cy="56" r="3.5" fill="#ffb3c7"/>
    <path d="M46 55 l2.5 2 l2.5 -2" fill="none" stroke="#1d1b24" stroke-width="1.6"/>`,
  },
  {
    name: "Thornfox",
    types: ["Leaf", "Dusk"],
    kind: "Bramble Fox",
    height: "0.9 m",
    weight: "14.0 kg",
    stats: [65, 82, 55, 80],
    entry:
      "Its bramble tail snags anything that chases it, then grows a fresh thorn by morning. It is shy by day but sings strange two-note songs at dusk.",
    art: `<g ${O}>
      <path d="M62 76 q30 4 30 -24 q-2 -18 -14 -22 q6 18 -4 28 q-6 8 -14 6z" fill="#3f7d3a"/>
      <path d="M86 40 l6 -4 M90 54 l7 0 M80 68 l5 5 M78 30 l2 -7" fill="none"/>
      <path d="M36 88 q-4 -30 14 -40 q18 6 16 40z" fill="#c8612b"/>
      <path d="M44 88 q0 -18 8 -24 q8 6 6 24z" fill="#f7e2c8"/>
      <path d="M28 20 l8 18 l-12 2z M62 20 l-6 18 l12 2z" fill="#c8612b"/>
      <path d="M24 38 q22 -10 44 0 q-2 16 -22 24 q-20 -8 -22 -24z" fill="#d9722f"/>
      <path d="M38 52 q8 6 16 0 l-8 10z" fill="#f7e2c8"/>
    </g>
    <path d="M30 24 l4 10 l-6 1z M60 24 l-3 10 l6 1z" fill="#5a2a14"/>
    ${eye(37, 44, 2.8)}${eye(55, 44, 2.8)}
    <circle cx="46" cy="58" r="2.4" fill="#1d1b24"/>`,
  },
];
