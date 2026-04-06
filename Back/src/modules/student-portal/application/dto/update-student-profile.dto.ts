export class UpdateStudentProfileDto {
  avatarFileName!: string | null;
  avatarSrc!: string | null;
  availabilityGeneral!: string;
  biography!: string;
  links!: Array<{
    id: string;
    type: 'RED_PROFESIONAL' | 'PORTAFOLIO' | 'HOJA_DE_VIDA' | 'OTRO';
    url: string;
  }>;
}
