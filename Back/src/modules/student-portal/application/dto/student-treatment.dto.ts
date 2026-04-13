export class StudentTreatmentDto {
  id!: string;
  treatmentTypeId!: string;
  name!: string;
  description!: string;
  status!: 'active' | 'inactive';
}
