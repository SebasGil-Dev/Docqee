export class PatientTutorDto {
  email!: string;
  firstName!: string;
  lastName!: string;
  phone!: string;
}

export class PatientProfileDto {
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
  tutor!: PatientTutorDto | null;
}
