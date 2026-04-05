export class UniversityEntity {
  id!: string;
  name!: string;
  slug!: string;
  status!: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  cityId!: string;
  mainLocalityId!: string;
  logoUrl?: string;
}
