export type RequestUser = {
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  role: 'PATIENT' | 'PLATFORM_ADMIN' | 'STUDENT' | 'UNIVERSITY_ADMIN';
  universityId?: number;
};
