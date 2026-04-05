export class BulkUploadJobEntity {
  id!: string;
  universityId!: string;
  entityType!: 'STUDENT' | 'TEACHER';
  status!: 'FILE_SELECTED' | 'INVALID' | 'VALIDATED' | 'PROCESSED';
  fileName!: string;
}
