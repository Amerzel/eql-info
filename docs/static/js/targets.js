// Target Types reference page (#/targets).
//
// The wiki + this app follow the exact-match policy (2026-07-21): the
// displayed target string is the EXACT in-game "Target:" tooltip string.
// All 17 player-facing types were player-verified in game on 2026-07-21
// (eqlwiki/audit/ingame_target_strings.md). Display strings come from
// TARGET_TYPES in data.js; this page adds the enum names, counts, live
// example links, and the gotcha callouts.

import { query } from "./db.js";
import { MAX_LEVEL, TARGET_TYPES, targetName } from "./data.js";
import { escapeHtml } from "./text.js";

// EQEmu spdat.h SpellTargetType names (51/52 post-enum; 56 EQL-only).
const ENUM_NAMES = {
  1: "ST_TargetOptional", 2: "ST_AEClientV1", 3: "ST_GroupTeleport",
  4: "ST_AECaster", 5: "ST_Target", 6: "ST_Self", 8: "ST_AETarget",
  9: "ST_Animal", 10: "ST_Undead", 11: "ST_Summoned", 13: "ST_Tap",
  14: "ST_Pet", 15: "ST_Corpse", 16: "ST_Plant", 17: "ST_Giant",
  18: "ST_Dragon", 20: "ST_TargetAETap", 24: "ST_UndeadAE",
  25: "ST_SummonedAE", 32: "ST_AETargetHateList", 33: "ST_HateList",
  34: "ST_LDoNChest_Cursed", 35: "ST_Muramite", 36: "ST_AreaClientOnly",
  37: "ST_AreaNPCOnly", 38: "ST_SummonedPet", 39: "ST_GroupNoPets",
  40: "ST_AEBard", 41: "ST_Group", 42: "ST_Directional",
  43: "ST_GroupClientAndPet", 44: "ST_Beam", 45: "ST_Ring",
  46: "ST_TargetsTarget", 47: "ST_PetMaster",
  50: "ST_TargetAENoPlayersPets",
  51: "(post-enum)", 52: "(post-enum)", 56: "(EQL-only)",
};

// Player-facing types, in-game verified 2026-07-21. Everything else in
// the data is NPC/test-only and its label is a working name, not a
// confirmed tooltip string.
const VERIFIED = [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 41, 45, 51, 56];

const CALLOUTS = `
  <aside class="notice">
    <strong>3 and 41 both display “Group.”</strong> The client keeps two
    internal group types — classic caster-group spells (ports, Word heals)
    are 3; targetable group buffs and bard songs are 41 — but players see
    the identical Target string, so both render as “Group” everywhere.
  </aside>
  <aside class="notice">
    <strong>“Bolt” is the magician projectile type.</strong> Mage bolts
    (type 1) are travel-time projectiles; wizard Frost/Fire/Lightning Bolt
    are ordinary type-5 “Single” despite the names.
  </aside>
  <aside class="notice">
    <strong>“Construct/Elemental” is EQL's rename of Summoned.</strong>
    The Ward/Expulse Summoned line targets constructs and elementals.
  </aside>
  <aside class="notice">
    <strong>Type 56 is EQL-only.</strong> Introduced in the 2026-07-01
    open-beta patch, unifying 29 friendly-target spells (shaman HoT line,
    Scale of Wolf, Torpor, Call of the Hero…). Its tooltip string —
    “Target Group Member or Self” — also settles the semantics: single
    recipient, must be in the caster's group.
  </aside>`;

function exampleLinks(rows) {
  return rows.map(r =>
    `<a href="#/spell/${r.id}">${escapeHtml(r.name)}</a> ` +
    `<span class="muted">(${escapeHtml(r.class_name)} ${r.min_level})</span>`
  ).join(", ");
}

export async function renderTargetsPage() {
  // Wiki-scope counts + up-to-3 lowest-level examples per type, one query.
  const scoped = await query(
    `SELECT s.id, s.name, s.target_type AS tt, sc.class_name, sc.min_level
       FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE sc.verified = 1 AND sc.min_level <= ?
      ORDER BY s.target_type, sc.min_level, s.id`, [MAX_LEVEL]);
  const byType = new Map();
  const counted = new Map();  // tt -> Set of spell ids (distinct count)
  for (const r of scoped) {
    if (!counted.has(r.tt)) { counted.set(r.tt, new Set()); byType.set(r.tt, []); }
    const seen = counted.get(r.tt);
    if (!seen.has(r.id)) {
      seen.add(r.id);
      if (byType.get(r.tt).length < 3) byType.get(r.tt).push(r);
    }
  }

  const allCounts = new Map(
    (await query(
      "SELECT target_type AS tt, COUNT(*) AS n FROM spells GROUP BY target_type"
    )).map(r => [r.tt, r.n]));

  const verifiedRows = VERIFIED.map(tt => `
    <tr>
      <td class="num">${tt}</td>
      <td><strong>${escapeHtml(targetName(tt))}</strong></td>
      <td class="muted"><code>${ENUM_NAMES[tt]}</code></td>
      <td class="num">${(counted.get(tt) || new Set()).size}</td>
      <td>${exampleLinks(byType.get(tt) || [])}</td>
    </tr>`).join("");

  const npcTypes = [...allCounts.keys()]
    .filter(tt => !VERIFIED.includes(tt))
    .sort((a, b) => a - b);
  const npcRows = npcTypes.map(tt => `
    <tr>
      <td class="num">${tt}</td>
      <td>${TARGET_TYPES[tt] ? escapeHtml(TARGET_TYPES[tt]) : "—"}</td>
      <td class="muted"><code>${ENUM_NAMES[tt] || "(unknown)"}</code></td>
      <td class="num">${allCounts.get(tt)}</td>
    </tr>`).join("");

  return `
    <nav class="breadcrumb"><a href="#/">Classes</a> › <span>Target Types</span></nav>
    <h1>Spell Target Types</h1>
    <p class="lede">Master reference for the <code>target_type</code> field.
    Wiki policy (2026-07-21): spell pages show the <em>exact</em> string the
    in-game tooltip displays after “Target:”. All ${VERIFIED.length}
    player-facing types below were verified against live tooltips. Every
    spell of a type shows the same string, so one tooltip read per type
    covers all of them.</p>

    <h2>Player-facing types <span class="muted">(in-game verified)</span></h2>
    <table class="spell-table">
      <thead><tr><th>ID</th><th>In-game “Target:” string</th><th>EQEmu enum</th>
        <th>L1–${MAX_LEVEL}</th><th>Examples</th></tr></thead>
      <tbody>${verifiedRows}</tbody>
    </table>

    ${CALLOUTS}

    <h2>Other types in the data <span class="muted">(NPC / test only — labels unverified)</span></h2>
    <p class="muted">No verified L1–${MAX_LEVEL} player spell uses these.
    Labels are EQEmu-derived working names, <em>not</em> confirmed tooltip
    strings — if one ever appears on a player spell, read its tooltip in
    game before putting a string on the wiki.</p>
    <table class="spell-table">
      <thead><tr><th>ID</th><th>Working label</th><th>EQEmu enum</th><th>In data</th></tr></thead>
      <tbody>${npcRows}</tbody>
    </table>

    <p class="muted">Source: <code>spells_us.txt</code> + in-game tooltip
    verification (2026-07-21, <code>eqlwiki/audit/ingame_target_strings.md</code>);
    enum names from EQEmu <code>common/spdat.h</code>.</p>
  `;
}
