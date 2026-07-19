export const INJECTION_MODELS = [
  "11",
  "15",
  "15D",
  "22",
  "22D",
  "37",
  "55",
  "75",
  "110",
  "150",
  "190",
  "225",
  "260",
  "300",
  "375",
  "450",
  "22V",
  "37V",
  "55V",
  "75V",
  "110V",
  "150V",
  "190V",
  "225V",
  "260V",
  "300V",
] as const;

export const OILFREE_MODELS = ["55F", "75F", "90F", "110F", "132F", "160F", "190F", "225F", "260F", "135F"]
  .flatMap((model) => ["A", "W"].flatMap((cooling) => ["-", "R", "S", "V"].map((version) => `${model}${cooling}${version}`)));

export const DEFAULT_EQUIPMENT_MODELS = ["37", "37", "37V", "", "", "", "", "", "", "", "", ""];

export function normalizeEquipmentModel(model?: string) {
  return String(model ?? "").trim().toUpperCase().replace(/^MICOS\s+/, "");
}

export function equipmentModelIsInverter(model?: string) {
  return normalizeEquipmentModel(model).endsWith("V");
}
