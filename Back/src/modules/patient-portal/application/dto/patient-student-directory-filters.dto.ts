export class PatientStudentDirectoryFilterOptionDto {
  label!: string;
  value!: string;
}

export class PatientStudentDirectoryLocalityFilterDto extends PatientStudentDirectoryFilterOptionDto {
  cityValue!: string;
}

export class PatientStudentDirectoryFiltersDto {
  cities!: PatientStudentDirectoryFilterOptionDto[];
  localities!: PatientStudentDirectoryLocalityFilterDto[];
  treatments!: string[];
  universities!: string[];
}
