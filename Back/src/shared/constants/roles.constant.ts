export const APP_ROLES = ['PLATFORM_ADMIN', 'UNIVERSITY_ADMIN'] as const;

export type AppRole = (typeof APP_ROLES)[number];
