export class StudentProfileDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  universityName!: string;
  semester!: string;
  biography!: string;
  availabilityGeneral!: string;
  avatarSrc!: string | null;
  avatarFileName!: string | null;
  avatarAlt!: string;
  links!: StudentProfessionalLinkDto[];
}

export class StudentProfessionalLinkDto {
  id!: string;
  type!: 'RED_PROFESIONAL' | 'PORTAFOLIO' | 'HOJA_DE_VIDA' | 'OTRO';
  url!: string;
}
