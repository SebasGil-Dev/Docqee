export class PatientProfileEntity {
  avatarAlt!: string;
  avatarFileName!: string | null;
  avatarSrc!: string | null;
  birthDate!: string;
  city!: string;
  email!: string;
  firstName!: string;
  id!: string;
  lastName!: string;
  locality!: string;
  phone!: string;
  sex!: 'FEMENINO' | 'MASCULINO' | 'OTRO';
}
