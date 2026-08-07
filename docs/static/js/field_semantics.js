// GENERATED FILE — DO NOT EDIT.
// Source of truth: src/eqltools/spells/tables/field_semantics.py
// Regenerate: python -m eqltools.spells.tables.field_semantics --emit-js
//   > web/static/js/field_semantics.js
// version=1 digest=efa579d6163b9ba202febdf04bc676028a342fc1838f7dbeed067c5c0523f3d7
// eqemu_reference_revision=b69fa9cbcd7517f5f9d909d93de4778164268f0d
export const FIELD_SEMANTICS_VERSION = 1;
export const FIELD_SEMANTICS_DIGEST = "efa579d6163b9ba202febdf04bc676028a342fc1838f7dbeed067c5c0523f3d7";
export const APPROVED_INVENTORY_DIGEST = "8844d7f8137177babd7604d20fd2710236859e1aa9595852da4605015ddbc403";
export const BOUND_RAW_CORPUS_DIGEST = "c28f2b0dd8751701fd55fa5c2e826b8600db29e18287d802bd45839df71b7178";
export const OBS_CITATION_SYNTAX = "^obs:OBS-\\d{4}-\\d{3}$";
export const CITATION_SOURCES = {
  "eqemu-effects": "https://github.com/EQEmu/Server/blob/b69fa9cbcd7517f5f9d909d93de4778164268f0d/zone/spell_effects.cpp",
  "eqemu-spdat": "https://github.com/EQEmu/Server/blob/b69fa9cbcd7517f5f9d909d93de4778164268f0d/common/spdat.h",
  "eqemu-value-formulas": "https://github.com/EQEmu/Server/blob/b69fa9cbcd7517f5f9d909d93de4778164268f0d/zone/spells.cpp",
  "eql-canonical-corpus": "Layer 1 raw_corpus.json at binds_raw_corpus_digest",
  "obs": "private observation record (spell-upgrades/field_observations.jsonl); locator = the claim id, exact syntax obs:OBS-YYYY-NNN"
};
export const FIELD_SEMANTICS = {
  "0": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-034",
        "evidence": "OBSERVED",
        "role": "magnitude"
      },
      "formula": {
        "citation": "obs:OBS-2026-041",
        "evidence": "OBSERVED",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "obs:OBS-2026-035",
        "evidence": "OBSERVED",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 0 SpellEffect::CurrentHP"
  },
  "1": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-025",
        "evidence": "OBSERVED",
        "role": "magnitude"
      },
      "formula": {
        "citation": "obs:OBS-2026-030",
        "evidence": "OBSERVED",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "obs:OBS-2026-031",
        "evidence": "OBSERVED",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 1 SpellEffect::ArmorClass"
  },
  "10": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 10 SpellEffect::CHA",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 10 SpellEffect::CHA"
  },
  "100": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 100 SpellEffect::HealOverTime",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 100 SpellEffect::HealOverTime"
  },
  "103": {
    "family": "pet",
    "fields": {
      "base": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "pet name via spell-level pet_template/teleport_zone; base hidden",
    "resolver_citation": "eql-canonical-corpus:SPA 103 signatures"
  },
  "104": {
    "family": "teleport",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::Translocate",
        "evidence": "REFERENCE",
        "role": "coord-component"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu implements slot-selected X/Y/Z/heading; zero is a valid coordinate; teleport_zone is spell-level EQL data",
    "resolver": "'Translocate target: <teleport_zone>'; labelled raw coordinates",
    "resolver_citation": "eql-canonical-corpus:SPA 104 signatures"
  },
  "106": {
    "family": "pet",
    "fields": {
      "base": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "pet name via spell-level pet_template/teleport_zone; base hidden",
    "resolver_citation": "eql-canonical-corpus:SPA 106 signatures"
  },
  "109": {
    "family": "item-ref",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 109 SpellEffect::SummonItemIntoBag",
        "evidence": "REFERENCE",
        "role": "item-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::SummonItemIntoBag",
        "evidence": "REFERENCE",
        "role": "charges/count"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "as SPA 32",
    "resolver_citation": "eqemu-spdat:SPA 109 SpellEffect::SummonItemIntoBag"
  },
  "11": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-028",
        "evidence": "OBSERVED",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 11 SpellEffect::AttackSpeed"
  },
  "111": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 111 SpellEffect::ResistAll",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 111 SpellEffect::ResistAll"
  },
  "112": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 112 SpellEffect::CastingLevel",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "casting-skill magnitude",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 112 SpellEffect::CastingLevel"
  },
  "114": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 114 SpellEffect::ChangeAggro",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "hate modifier",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 114 SpellEffect::ChangeAggro"
  },
  "115": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 115 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "Hunger",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 115 SpellEffect::Hunger"
  },
  "116": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 116 SpellEffect::CurseCounter",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 116 SpellEffect::CurseCounter"
  },
  "117": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 117 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "MagicWeapon",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 117 SpellEffect::MagicWeapon"
  },
  "118": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 118 SpellEffect::Amplification",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 118 SpellEffect::Amplification"
  },
  "12": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 12 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "Invisibility",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 12 SpellEffect::Invisibility"
  },
  "120": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 120 SpellEffect::HealRate",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 120 SpellEffect::HealRate",
        "evidence": "REFERENCE",
        "role": "effect-type-selector"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "base percent modifier; limit selects effect type",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 120 SpellEffect::HealRate"
  },
  "121": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 121 SpellEffect::ReverseDS",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 121 SpellEffect::ReverseDS"
  },
  "124": {
    "family": "focus-modifier",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 124 SpellEffect::ImprovedDamage",
        "evidence": "REFERENCE",
        "role": "modifier-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 124 SpellEffect::ImprovedDamage",
        "evidence": "REFERENCE",
        "role": "bound/selector"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 124 SpellEffect::ImprovedDamage",
        "evidence": "REFERENCE",
        "role": "selector-bound"
      }
    },
    "note": "FocusDamageMod",
    "resolver": "show qualified modifier plus predicate label",
    "resolver_citation": "eqemu-spdat:SPA 124 SpellEffect::ImprovedDamage"
  },
  "127": {
    "family": "focus-modifier",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 127 SpellEffect::IncreaseSpellHaste",
        "evidence": "REFERENCE",
        "role": "modifier-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 127 SpellEffect::IncreaseSpellHaste",
        "evidence": "REFERENCE",
        "role": "bound/selector"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 127 SpellEffect::IncreaseSpellHaste",
        "evidence": "REFERENCE",
        "role": "selector-bound"
      }
    },
    "note": "FocusCastTimeMod",
    "resolver": "show qualified modifier plus predicate label",
    "resolver_citation": "eqemu-spdat:SPA 127 SpellEffect::IncreaseSpellHaste"
  },
  "13": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 13 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "SeeInvis",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 13 SpellEffect::SeeInvis"
  },
  "134": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 134 SpellEffect::LimitMaxLevel",
        "evidence": "REFERENCE",
        "role": "level-bound"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusLevelMax",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 134 SpellEffect::LimitMaxLevel"
  },
  "136": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 136 SpellEffect::LimitTarget",
        "evidence": "REFERENCE",
        "role": "type-selector"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusTargetType",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 136 SpellEffect::LimitTarget"
  },
  "137": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 137 SpellEffect::LimitEffect",
        "evidence": "REFERENCE",
        "role": "spa-selector"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusWhichSpa",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 137 SpellEffect::LimitEffect"
  },
  "138": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 138 SpellEffect::LimitSpellType",
        "evidence": "REFERENCE",
        "role": "beneficial-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusBeneficial",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 138 SpellEffect::LimitSpellType"
  },
  "139": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 139 SpellEffect::LimitSpell",
        "evidence": "REFERENCE",
        "role": "spell-selector"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusWhichSpell",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 139 SpellEffect::LimitSpell"
  },
  "14": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "enable-level"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "canonical base values 1 and 2; exact distinction unknown",
    "resolver": "label only; raw value in labelled detail",
    "resolver_citation": "eqemu-spdat:SPA 14 SpellEffect::WaterBreathing"
  },
  "141": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 141 SpellEffect::LimitInstant",
        "evidence": "REFERENCE",
        "role": "instant-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusInstantOnly",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 141 SpellEffect::LimitInstant"
  },
  "143": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 143 SpellEffect::LimitCastTimeMin",
        "evidence": "REFERENCE",
        "role": "time-bound-ms"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusCasttimeMin",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 143 SpellEffect::LimitCastTimeMin"
  },
  "146": {
    "family": "teleport",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-037",
        "evidence": "OBSERVED",
        "role": "coord-component"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "OBSERVED 2026-08-05: the runtime landing point matches the slot coordinates (North Karana /loc, obs:OBS-2026-037); the EQEmu-unimplemented caveat is superseded; teleport_zone is spell-level EQL data",
    "resolver": "'PortalLocations target: <teleport_zone>'; labelled raw coordinates",
    "resolver_citation": "eql-canonical-corpus:SPA 146 signatures"
  },
  "148": {
    "family": "stacking",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 148 SpellEffect::StackingCommand_Block",
        "evidence": "REFERENCE",
        "role": "spa-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 148 SpellEffect::StackingCommand_Block",
        "evidence": "REFERENCE",
        "role": "slot"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 148 SpellEffect::StackingCommand_Block",
        "evidence": "REFERENCE",
        "role": "threshold"
      }
    },
    "note": "precise EQL inequality remains unobserved",
    "resolver": "'<SPA name(#base)> slot <limit> threshold <max>'",
    "resolver_citation": "eqemu-spdat:SPA 148 SpellEffect::StackingCommand_Block"
  },
  "149": {
    "family": "stacking",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 149 SpellEffect::StackingCommand_Overwrite",
        "evidence": "REFERENCE",
        "role": "spa-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 149 SpellEffect::StackingCommand_Overwrite",
        "evidence": "REFERENCE",
        "role": "slot"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 149 SpellEffect::StackingCommand_Overwrite",
        "evidence": "REFERENCE",
        "role": "threshold"
      }
    },
    "note": "precise EQL inequality remains unobserved",
    "resolver": "'<SPA name(#base)> slot <limit> threshold <max>'",
    "resolver_citation": "eqemu-spdat:SPA 149 SpellEffect::StackingCommand_Overwrite"
  },
  "15": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 15 SpellEffect::CurrentMana",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 15 SpellEffect::CurrentMana"
  },
  "158": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 158 SpellEffect::Reflect",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 158 SpellEffect::Reflect"
  },
  "161": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 161 SpellEffect::MitigateSpellDamage",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 161 SpellEffect::MitigateSpellDamage"
  },
  "162": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 162 SpellEffect::MitigateMeleeDamage",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 162 SpellEffect::MitigateMeleeDamage"
  },
  "163": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 163 SpellEffect::AbsorbHit",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 163 SpellEffect::AbsorbHit"
  },
  "18": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::Lull",
        "evidence": "REFERENCE",
        "role": "unconsumed-parameter"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu's Lull handler does not consume effect_value",
    "resolver": "'Lull' label only; do not publish the raw field as a magnitude",
    "resolver_citation": "eqemu-spdat:SPA 18 SpellEffect::Lull"
  },
  "184": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 184 SpellEffect::HitChance",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 184 SpellEffect::HitChance",
        "evidence": "REFERENCE",
        "role": "skill-qualifier"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "base amount; limit is skill id",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 184 SpellEffect::HitChance"
  },
  "189": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 189 SpellEffect::CurrentEndurance",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 189 SpellEffect::CurrentEndurance"
  },
  "19": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 19 SpellEffect::AddFaction",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 19 SpellEffect::AddFaction"
  },
  "192": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 192 SpellEffect::Hate",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 192 SpellEffect::Hate"
  },
  "2": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 2 SpellEffect::ATK",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 2 SpellEffect::ATK"
  },
  "20": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "signed-mode"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "canonical base values -1 and 1; exact distinction unknown",
    "resolver": "label only; raw value in labelled detail",
    "resolver_citation": "eqemu-spdat:SPA 20 SpellEffect::Blind"
  },
  "21": {
    "family": "stun",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-042",
        "evidence": "OBSERVED",
        "role": "duration-ms"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eql-canonical-corpus:SPA 21 limit is ms-shaped with the 5.25s PvP cap (5250 across all base durations); EQEmu handler never reads it",
        "evidence": "INFERRED",
        "role": "pvp-duration-ms"
      },
      "max": {
        "citation": "eqemu-effects:SpellEffect::Stun",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "",
    "resolver": "'<ms/1000>s stun'; max=0 means server-default cap",
    "resolver_citation": "eqemu-spdat:SPA 21 SpellEffect::Stun"
  },
  "22": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 22 SpellEffect::Charm",
        "evidence": "REFERENCE",
        "role": "control-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 22 SpellEffect::Charm",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "Charm",
    "resolver": "label; target cap only where the source defines it",
    "resolver_citation": "eqemu-spdat:SPA 22 SpellEffect::Charm"
  },
  "23": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 23 SpellEffect::Fear",
        "evidence": "REFERENCE",
        "role": "control-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 23 SpellEffect::Fear",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "Fear",
    "resolver": "label; target cap only where the source defines it",
    "resolver_citation": "eqemu-spdat:SPA 23 SpellEffect::Fear"
  },
  "24": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 24 SpellEffect::Stamina",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 24 SpellEffect::Stamina"
  },
  "25": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 25 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "BindAffinity",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 25 SpellEffect::BindAffinity"
  },
  "26": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::Gate",
        "evidence": "REFERENCE",
        "role": "chance-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::Gate",
        "evidence": "REFERENCE",
        "role": "bind-point-index"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'Gate <base>% \u2192 bind point <limit>' (visibly reference-qualified)",
    "resolver_citation": "eqemu-spdat:SPA 26 SpellEffect::Gate"
  },
  "27": {
    "family": "dispel",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 27 SpellEffect::CancelMagic",
        "evidence": "REFERENCE",
        "role": "dispel-count"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'Dispel <base>'",
    "resolver_citation": "eqemu-spdat:SPA 27 SpellEffect::CancelMagic"
  },
  "28": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 28 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "InvisVsUndead",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 28 SpellEffect::InvisVsUndead"
  },
  "289": {
    "family": "spell-ref",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 289 SpellEffect::CastOnFadeEffect",
        "evidence": "REFERENCE",
        "role": "spell-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "link on-fade spell",
    "resolver_citation": "eqemu-spdat:SPA 289 SpellEffect::CastOnFadeEffect"
  },
  "29": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 29 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "InvisVsAnimals",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 29 SpellEffect::InvisVsAnimals"
  },
  "298": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 298 SpellEffect::TinyCompanion",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 298 SpellEffect::TinyCompanion"
  },
  "3": {
    "family": "movement",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::MovementSpeed",
        "evidence": "REFERENCE",
        "role": "movement-magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "restored to a published magnitude by James's manual-review directive; prior INFERRED downgrade recorded in 5A.1",
    "resolver": "movement % via the value core (SoW 278 displays 34..55 == P99's 34-55%; reviewed upgrade 2026-07-27 \u2014 additive-vs-multiplicative client application stays an open \u00a76.3a note, the % value itself is corroborated)",
    "resolver_citation": "eqemu-effects:SpellEffect::MovementSpeed"
  },
  "30": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 30 SpellEffect::ChangeFrenzyRad",
        "evidence": "REFERENCE",
        "role": "control-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 30 SpellEffect::ChangeFrenzyRad",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "NPC aggro radius",
    "resolver": "label; target cap only where the source defines it",
    "resolver_citation": "eqemu-spdat:SPA 30 SpellEffect::ChangeFrenzyRad"
  },
  "31": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 31 SpellEffect::Mez",
        "evidence": "REFERENCE",
        "role": "control-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 31 SpellEffect::Mez",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "Mez/Enthrall",
    "resolver": "label; target cap only where the source defines it",
    "resolver_citation": "eqemu-spdat:SPA 31 SpellEffect::Mez"
  },
  "311": {
    "family": "focus-predicate",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 311 SpellEffect::LimitCombatSkills",
        "evidence": "REFERENCE",
        "role": "skill-selector"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "FocusCombatSkill",
    "resolver": "focus predicate label; selector values not published as magnitudes",
    "resolver_citation": "eqemu-spdat:SPA 311 SpellEffect::LimitCombatSkills"
  },
  "314": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 314 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "Invisibility2",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 314 SpellEffect::Invisibility2"
  },
  "315": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 315 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "InvisVsUndead2",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 315 SpellEffect::InvisVsUndead2"
  },
  "32": {
    "family": "item-ref",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 32 SpellEffect::SummonItem",
        "evidence": "REFERENCE",
        "role": "item-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::SummonItem",
        "evidence": "REFERENCE",
        "role": "charges/count"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'item #<base>' until an authenticated EQL item-name source exists",
    "resolver_citation": "eqemu-spdat:SPA 32 SpellEffect::SummonItem"
  },
  "323": {
    "family": "spell-ref",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 323 SpellEffect::DefensiveProc",
        "evidence": "REFERENCE",
        "role": "spell-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::DefensiveProc",
        "evidence": "REFERENCE",
        "role": "proc-rate-modifier"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "link defensive-proc spell; limit is a rate modifier, not a percent",
    "resolver_citation": "eqemu-spdat:SPA 323 SpellEffect::DefensiveProc"
  },
  "33": {
    "family": "pet",
    "fields": {
      "base": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "pet name via spell-level pet_template/teleport_zone; base hidden",
    "resolver_citation": "eql-canonical-corpus:SPA 33 signatures"
  },
  "334": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 334 SpellEffect::NoMoveHP",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 334 SpellEffect::NoMoveHP"
  },
  "340": {
    "family": "spell-limit",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 340 SpellEffect::ChanceSpell",
        "evidence": "REFERENCE",
        "role": "chance-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 340 SpellEffect::ChanceSpell",
        "evidence": "REFERENCE",
        "role": "spell-id"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'<base>% \u2192 linked limit spell'",
    "resolver_citation": "eqemu-spdat:SPA 340 SpellEffect::ChanceSpell"
  },
  "35": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 35 SpellEffect::DiseaseCounter",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 35 SpellEffect::DiseaseCounter"
  },
  "36": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 36 SpellEffect::PoisonCounter",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 36 SpellEffect::PoisonCounter"
  },
  "374": {
    "family": "spell-limit",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 374 SpellEffect::TriggerSpell",
        "evidence": "REFERENCE",
        "role": "chance-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 374 SpellEffect::TriggerSpell",
        "evidence": "REFERENCE",
        "role": "spell-id"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'<base>% \u2192 linked limit spell'",
    "resolver_citation": "eqemu-spdat:SPA 374 SpellEffect::TriggerSpell"
  },
  "382": {
    "family": "suppression",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 382 SpellEffect::NegateSpellEffect",
        "evidence": "REFERENCE",
        "role": "negate-mode-enum"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::NegateSpellEffect",
        "evidence": "REFERENCE",
        "role": "spa-id"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'Suppress <SPA name(#limit)>' qualified by base mode",
    "resolver_citation": "eqemu-spdat:SPA 382 SpellEffect::NegateSpellEffect"
  },
  "4": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 4 SpellEffect::STR",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 4 SpellEffect::STR"
  },
  "40": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 40 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "DivineAura",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 40 SpellEffect::DivineAura"
  },
  "42": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 42 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "ShadowStep",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 42 SpellEffect::ShadowStep"
  },
  "44": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-012",
        "evidence": "OBSERVED",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eql-canonical-corpus:SPA 44 max=0 on every row",
        "evidence": "EQL_DATA",
        "role": "unused"
      }
    },
    "note": "EQL repurposing of the promised-heal line OBSERVED 2026-08-05: a delayed heal fired at buff expiry; base = the heal amount (Budding Heal desc substitutes it via #3: 'and then healing for 18')",
    "resolver": "value core (number); render as the FINAL heal fired at buff expiry",
    "resolver_citation": "eqemu-spdat:SPA 44 SpellEffect::Lycanthropy"
  },
  "457": {
    "family": "resource-tap",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-029",
        "evidence": "OBSERVED",
        "role": "scale-permille"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::ResourceTap",
        "evidence": "REFERENCE",
        "role": "resource-selector"
      },
      "max": {
        "citation": "eqemu-effects:SpellEffect::ResourceTap",
        "evidence": "REFERENCE",
        "role": "cap-amount"
      }
    },
    "note": "",
    "resolver": "qualified reference: '<base/10>% of spell damage as resource selected by limit, capped at <max>/event'; prose unchanged",
    "resolver_citation": "eqemu-spdat:SPA 457 SpellEffect::ResourceTap"
  },
  "46": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 46 SpellEffect::ResistFire",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 46 SpellEffect::ResistFire"
  },
  "47": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 47 SpellEffect::ResistCold",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 47 SpellEffect::ResistCold"
  },
  "475": {
    "family": "spell-limit",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 475 SpellEffect::TriggerSpellNonItem",
        "evidence": "REFERENCE",
        "role": "chance-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-spdat:SPA 475 SpellEffect::TriggerSpellNonItem",
        "evidence": "REFERENCE",
        "role": "spell-id"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'<base>% \u2192 linked limit spell'",
    "resolver_citation": "eqemu-spdat:SPA 475 SpellEffect::TriggerSpellNonItem"
  },
  "48": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 48 SpellEffect::ResistPoison",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 48 SpellEffect::ResistPoison"
  },
  "49": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 49 SpellEffect::ResistDisease",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 49 SpellEffect::ResistDisease"
  },
  "5": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 5 SpellEffect::DEX",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 5 SpellEffect::DEX"
  },
  "50": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 50 SpellEffect::ResistMagic",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 50 SpellEffect::ResistMagic"
  },
  "52": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 52 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "SenseDead",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 52 SpellEffect::SenseDead"
  },
  "53": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 53 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "SenseSummoned",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 53 SpellEffect::SenseSummoned"
  },
  "537": {
    "family": "self-ref",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 537 signatures",
        "evidence": "EQL_DATA",
        "role": "self-reference-equality"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "suppress: base equals own spell id in EQL data; runtime role remains UNKNOWN",
    "resolver_citation": "eql-canonical-corpus:SPA 537 signatures"
  },
  "54": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 54 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "SenseAnimals",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 54 SpellEffect::SenseAnimals"
  },
  "55": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 55 SpellEffect::Rune",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 55 SpellEffect::Rune"
  },
  "56": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 56 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "TrueNorth",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 56 SpellEffect::TrueNorth"
  },
  "57": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::Levitate",
        "evidence": "REFERENCE",
        "role": "unused"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::Levitate",
        "evidence": "REFERENCE",
        "role": "flight-mode"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu branches on limit, not base; EQL runtime remains unobserved",
    "resolver": "'Levitation'; mode shown only in labelled raw detail",
    "resolver_citation": "eqemu-spdat:SPA 57 SpellEffect::Levitate"
  },
  "58": {
    "family": "race-ref",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 58 SpellEffect::Illusion",
        "evidence": "REFERENCE",
        "role": "race-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::Illusion",
        "evidence": "REFERENCE",
        "role": "gender/texture"
      },
      "max": {
        "citation": "eqemu-effects:SpellEffect::Illusion",
        "evidence": "REFERENCE",
        "role": "helm/variant"
      }
    },
    "note": "",
    "resolver": "race name via dbstr type 11; 'race #<base>' fallback",
    "resolver_citation": "eql-canonical-corpus:SPA 58 signatures"
  },
  "59": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 59 SpellEffect::DamageShield",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 59 SpellEffect::DamageShield"
  },
  "6": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 6 SpellEffect::AGI",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 6 SpellEffect::AGI"
  },
  "63": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 63 SpellEffect::WipeHateList",
        "evidence": "REFERENCE",
        "role": "chance-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'Memory blur <base>%'; EQL result remains unobserved",
    "resolver_citation": "eqemu-spdat:SPA 63 SpellEffect::WipeHateList"
  },
  "64": {
    "family": "stun",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::SpinTarget",
        "evidence": "REFERENCE",
        "role": "duration-ms"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eql-canonical-corpus:SPA 64 limit follows the SPA 21 PvP-duration pattern (7500/5250)",
        "evidence": "INFERRED",
        "role": "pvp-duration-ms"
      },
      "max": {
        "citation": "eqemu-effects:SpellEffect::SpinTarget",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "",
    "resolver": "as SPA 21",
    "resolver_citation": "eqemu-spdat:SPA 64 SpellEffect::SpinTarget"
  },
  "65": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 65 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "InfraVision",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 65 SpellEffect::InfraVision"
  },
  "66": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 66 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "UltraVision",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 66 SpellEffect::UltraVision"
  },
  "67": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 67 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EyeOfZomm",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 67 SpellEffect::EyeOfZomm"
  },
  "68": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 68 SpellEffect::ReclaimPet",
        "evidence": "REFERENCE",
        "role": "reclaim-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "was wholly unresolved; James's manual review flagged the regression vs the description's 75%",
    "resolver": "'<base>% reclaimed' \u2014 the spell's own description substitutes #1 as '75%' of the summon cost (client-data corroboration; reviewed upgrade 2026-07-27); exact fraction semantics still OBS-2026-013",
    "resolver_citation": "eqemu-spdat:SPA 68 SpellEffect::ReclaimPet"
  },
  "69": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-026",
        "evidence": "OBSERVED",
        "role": "magnitude"
      },
      "formula": {
        "citation": "obs:OBS-2026-032",
        "evidence": "OBSERVED",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "obs:OBS-2026-033",
        "evidence": "OBSERVED",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 69 SpellEffect::TotalHP"
  },
  "7": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 7 SpellEffect::STA",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 7 SpellEffect::STA"
  },
  "71": {
    "family": "pet",
    "fields": {
      "base": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "pet name via spell-level pet_template/teleport_zone; base hidden",
    "resolver_citation": "eql-canonical-corpus:SPA 71 signatures"
  },
  "73": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 73 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "BindSight",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 73 SpellEffect::BindSight"
  },
  "74": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::FeignDeath",
        "evidence": "REFERENCE",
        "role": "success-threshold"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu compares a 0..99 roll to base; exact EQL probability unobserved",
    "resolver": "'Feign death' plus a visibly reference-qualified success parameter",
    "resolver_citation": "eqemu-spdat:SPA 74 SpellEffect::FeignDeath"
  },
  "75": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 75 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "VoiceGraft",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 75 SpellEffect::VoiceGraft"
  },
  "76": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 76 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "Sentinel",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 76 SpellEffect::Sentinel"
  },
  "78": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 78 SpellEffect::AbsorbMagicAtt",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "SpellShield: base mitigation, max cap",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 78 SpellEffect::AbsorbMagicAtt"
  },
  "79": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 79 SpellEffect::CurrentHPOnce",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 79 SpellEffect::CurrentHPOnce"
  },
  "8": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 8 SpellEffect::INT",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 8 SpellEffect::INT"
  },
  "81": {
    "family": "resurrect",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 81 SpellEffect::Revive",
        "evidence": "REFERENCE",
        "role": "resurrect-pct"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "",
    "resolver": "'Resurrect <base>%'",
    "resolver_citation": "eqemu-spdat:SPA 81 SpellEffect::Revive"
  },
  "83": {
    "family": "teleport",
    "fields": {
      "base": {
        "citation": "obs:OBS-2026-036",
        "evidence": "OBSERVED",
        "role": "coord-component"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu implements slot-selected X/Y/Z/heading; zero is a valid coordinate; teleport_zone is spell-level EQL data",
    "resolver": "'Teleport target: <teleport_zone>'; labelled raw coordinates",
    "resolver_citation": "eql-canonical-corpus:SPA 83 signatures"
  },
  "84": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 84 SpellEffect::TossUp",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "HP magnitude, NPC-only variant in EQL",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 84 SpellEffect::TossUp"
  },
  "85": {
    "family": "spell-ref",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 85 SpellEffect::WeaponProc",
        "evidence": "REFERENCE",
        "role": "spell-id"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "eqemu-effects:SpellEffect::WeaponProc",
        "evidence": "REFERENCE",
        "role": "proc-rate-modifier"
      },
      "max": {
        "citation": "eqemu-effects:SpellEffect::WeaponProc",
        "evidence": "REFERENCE",
        "role": "proc-type"
      }
    },
    "note": "",
    "resolver": "link proc spell",
    "resolver_citation": "eqemu-spdat:SPA 85 SpellEffect::WeaponProc"
  },
  "86": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 86 SpellEffect::Harmony",
        "evidence": "REFERENCE",
        "role": "control-magnitude"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-spdat:SPA 86 SpellEffect::Harmony",
        "evidence": "REFERENCE",
        "role": "target-level-cap"
      }
    },
    "note": "NPC help radius",
    "resolver": "label; target cap only where the source defines it",
    "resolver_citation": "eqemu-spdat:SPA 86 SpellEffect::Harmony"
  },
  "87": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 87 SpellEffect::MagnifyVision",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 87 SpellEffect::MagnifyVision"
  },
  "88": {
    "family": "teleport",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::Succor",
        "evidence": "REFERENCE",
        "role": "coord-component"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu implements slot-selected X/Y/Z/heading; zero is a valid coordinate; teleport_zone is spell-level EQL data",
    "resolver": "'Evacuate target: <teleport_zone>'; labelled raw coordinates",
    "resolver_citation": "eql-canonical-corpus:SPA 88 signatures"
  },
  "89": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 89 SpellEffect::ModelSize",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "size/height magnitude",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 89 SpellEffect::ModelSize"
  },
  "9": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 9 SpellEffect::WIS",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 9 SpellEffect::WIS"
  },
  "92": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 92 SpellEffect::InstantHate",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 92 SpellEffect::InstantHate"
  },
  "94": {
    "family": "structural",
    "fields": {
      "base": {
        "citation": "eql-canonical-corpus:SPA 94 signatures",
        "evidence": "INFERRED",
        "role": "enable-flag"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "NegateIfCombat",
    "resolver": "label only; do not publish the raw activation value",
    "resolver_citation": "eqemu-spdat:SPA 94 SpellEffect::NegateIfCombat"
  },
  "97": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 97 SpellEffect::ManaPool",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 97 SpellEffect::ManaPool"
  },
  "98": {
    "family": "magnitude",
    "fields": {
      "base": {
        "citation": "eqemu-spdat:SPA 98 SpellEffect::AttackSpeed2",
        "evidence": "REFERENCE",
        "role": "magnitude"
      },
      "formula": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "scaling"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "eqemu-value-formulas:CalcSpellEffectValue_formula",
        "evidence": "REFERENCE",
        "role": "cap"
      }
    },
    "note": "bard haste magnitude",
    "resolver": "value core (number); numerical confidence remains the value core's independent axis",
    "resolver_citation": "eqemu-spdat:SPA 98 SpellEffect::AttackSpeed2"
  },
  "99": {
    "family": "control",
    "fields": {
      "base": {
        "citation": "eqemu-effects:SpellEffect::Root",
        "evidence": "REFERENCE",
        "role": "unconsumed-sentinel"
      },
      "formula": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "limit": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      },
      "max": {
        "citation": "",
        "evidence": "UNKNOWN",
        "role": "unresolved"
      }
    },
    "note": "EQEmu applies rooted=true without consuming effect_value",
    "resolver": "'Root' label only; do not publish the raw -10000 sentinel",
    "resolver_citation": "eqemu-spdat:SPA 99 SpellEffect::Root"
  }
};
