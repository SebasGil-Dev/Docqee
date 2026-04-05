export class TeacherEntity {
  id!: string;
  universityId!: string;
  firstName!: string;
  lastName!: string;
  documentType!: 'CC' | 'CE' | 'TI' | 'PASSPORT';
  documentNumber!: string;
  status!: 'ACTIVE' | 'INACTIVE';
}
