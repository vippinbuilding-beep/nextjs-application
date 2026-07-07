/** Normaliza texto para slug de URL: junta palavras sem hífens (ex.: "João Silva" → "joaosilva"). */
export function slugify(desired: string, fallback: string): string {
  const base = desired
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return base || fallback;
}

export function slugWithNumericSuffix(base: string, suffix: number): string {
  return suffix <= 1 ? base : `${base}${suffix}`;
}
