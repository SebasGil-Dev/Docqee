export class PatientStudentDirectoryLocationFilterDto {
  label!: string;
  value!: string;
}

export class PatientStudentDirectoryFiltersDto {
  locations!: PatientStudentDirectoryLocationFilterDto[];
  treatments!: string[];
  universities!: string[];
}
