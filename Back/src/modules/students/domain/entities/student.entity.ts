export class StudentEntity {
  id!: string;
  universityId!: string;
  firstName!: string;
  lastName!: string;
  documentType!: 'CC' | 'CE' | 'TI' | 'PASSPORT';
  documentNumber!: string;
  email!: string;
  phone?: string;
  semester!: number;
  status!: 'ACTIVE' | 'INACTIVE';
}
