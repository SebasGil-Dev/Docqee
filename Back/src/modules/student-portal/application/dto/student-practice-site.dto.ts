export class StudentPracticeSiteDto {
  id!: string;
  siteId!: string;
  name!: string;
  city!: string;
  locality!: string;
  address!: string;
  status!: 'active' | 'inactive';
}
