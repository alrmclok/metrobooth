// Sale IDs are created when the cart starts (spec 17.2), so saving can't double up.
export const newId = (): string => crypto.randomUUID()