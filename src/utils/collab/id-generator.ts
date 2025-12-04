import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique ID with an optional prefix
 * @param prefix - Optional prefix for the ID
 * @returns A unique identifier string
 */
export const createId = (prefix?: string): string => {
  const id = uuidv4();
  return prefix ? `${prefix}-${id}` : id;
};
