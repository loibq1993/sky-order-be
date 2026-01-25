export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getRootDomain = (): string | null => {
  return process.env.APP_ROOT_DOMAIN || process.env.ROOT_DOMAIN || null;
};
