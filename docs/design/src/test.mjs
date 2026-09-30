import { writeFileSync } from "node:fs";
import { POSES, EXAMPLES, device, fit, page_, glyph } from "./kit.mjs";
const body = `<div style="display:flex;flex-wrap:wrap;gap:30px;padding:30px;background:#e9e6df">
${POSES.map(p=>`<div>${fit(p.id, EXAMPLES[0], 300, 300)}<div>${glyph(p.id)} ${p.label}</div></div>`).join("")}
${EXAMPLES.slice(1).map(e=>`<div>${fit(e.best, e, 240, 240)}<div>${e.title}</div></div><div>${fit('closed', e, 160, 240)}</div>`).join("")}
</div>`;
writeFileSync(new URL("../_test.html", import.meta.url), page_("test", "", "", body));
