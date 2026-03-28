export const LOW_INFO_NAME_DETAILS: Record<string, string> = {
  utils: "Catch-all dumping ground; violates single responsibility",
  helpers: "Vague semantics; becomes unmaintainable",
  misc: "Literally means 'uncategorized'",
  common: "Attracts unrelated shared code",
  shared: "Breaks architectural layers; grows uncontrollably",
  _shared: "Variant of shared with same problems",
  lib: "Too generic; doesn't describe contents",
  index: "Indistinguishable in IDE tabs; breaks Go to Definition",
  types: "Can become a dump for unrelated type definitions",
  constants: "Can become a dump for unrelated values",
  config: "Vague without domain context",
  base: "Abstract without inheritance context",
  core: "Too broad; doesn't narrow scope"
};
