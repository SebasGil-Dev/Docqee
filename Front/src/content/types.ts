export type CtaTarget =
  | {
      kind: 'internal';
      label: string;
      to: `/${string}` | '#top' | `#${string}`;
    }
  | {
      href: string;
      kind: 'external';
      label: string;
      newTab?: boolean;
    };

export type NavigationItem = {
  href: '#top' | `#${string}`;
  label: string;
};

export type HeroHighlight = {
  description: string;
  title: string;
};

export type HeroImage = {
  alt: string;
  height: number;
  src: string;
  width: number;
};

export type StepItem = {
  ctaLabel: string;
  description: string;
  icon: 'account' | 'clipboard' | 'search';
  title: string;
};

export type UniversityItem = {
  icon: 'book' | 'graduation' | 'landmark' | 'shield';
  label: string;
  supportText: string;
};

export type LandingContent = {
  footer: {
    blurb: string;
    links: NavigationItem[];
    legalNote: string;
  };
  hero: {
    badge: string;
    description: string;
    highlights: HeroHighlight[];
    image: HeroImage;
    primaryCta: CtaTarget;
    secondaryCta: CtaTarget;
    titleAccent: string;
    titleEnd: string;
    titleStart: string;
  };
  meta: {
    description: string;
    imagePath: string;
    title: string;
  };
  navigation: {
    items: NavigationItem[];
    login: CtaTarget;
    register: CtaTarget;
  };
  steps: StepItem[];
  universities: UniversityItem[];
};

export type AuthMeta = {
  description: string;
  title: string;
};

export type PatientSex = 'FEMENINO' | 'MASCULINO' | 'OTRO';

export type DocumentTypeOption = {
  code: string;
  id: string;
  label: string;
};

export type CityOption = {
  id: string;
  label: string;
};

export type LocalityOption = {
  cityId: string;
  id: string;
  label: string;
};

export type PatientRegisterCatalogDataSource = {
  getCities: () => Promise<CityOption[]> | CityOption[];
  getDocumentTypes: () => Promise<DocumentTypeOption[]> | DocumentTypeOption[];
  getLocalitiesByCity: (cityId: string) => Promise<LocalityOption[]> | LocalityOption[];
  loadCities?: () => Promise<CityOption[]>;
  loadDocumentTypes?: () => Promise<DocumentTypeOption[]>;
  loadLocalitiesByCity?: (cityId: string) => Promise<LocalityOption[]>;
};

export type AsyncCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AsyncCatalogState<T> = {
  error: string | null;
  options: T[];
  status: AsyncCatalogStatus;
};

export type LoginFieldCopy = {
  label: string;
  placeholder: string;
};

export type RegisterFieldCopy = {
  label: string;
  placeholder: string;
  requiredMessage: string;
};

export type RegisterEmailFieldCopy = RegisterFieldCopy & {
  invalidMessage: string;
};

export type RegisterDateFieldCopy = RegisterFieldCopy & {
  futureDateMessage: string;
};

export type RegisterSelectFieldCopy = {
  emptyMessage: string;
  errorMessage: string;
  label: string;
  loadingMessage: string;
  placeholder: string;
  requiredMessage: string;
};

export type RegisterPasswordRuleKey =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'special';

export type RegisterPasswordRuleCopy = {
  key: RegisterPasswordRuleKey;
  label: string;
};

export type RegisterPasswordFieldCopy = RegisterFieldCopy & {
  confirmLabel: string;
  confirmMismatchMessage: string;
  confirmPlaceholder: string;
  confirmRequiredMessage: string;
  hidePasswordLabel: string;
  requirements: RegisterPasswordRuleCopy[];
  requirementsMessage: string;
  showPasswordLabel: string;
};

export type RegisterCheckboxCopy = {
  label: string;
  requiredMessage: string;
};

export type RegisterSectionCopy = {
  description?: string;
  title: string;
};

export type RegisterContent = {
  accountSection: RegisterSectionCopy;
  locationSection: RegisterSectionCopy;
  loginCta: CtaTarget;
  loginPrompt: string;
  meta: AuthMeta;
  password: RegisterPasswordFieldCopy;
  patientFields: {
    birthDate: RegisterDateFieldCopy;
    city: RegisterSelectFieldCopy;
    documentNumber: RegisterFieldCopy;
    documentType: RegisterSelectFieldCopy;
    email: RegisterEmailFieldCopy;
    firstName: RegisterFieldCopy;
    lastName: RegisterFieldCopy;
    locality: RegisterSelectFieldCopy & {
      placeholderWithoutCity: string;
    };
    phone: RegisterFieldCopy;
    sex: {
      label: string;
      options: readonly PatientSex[];
      requiredMessage: string;
    };
  };
  personalSection: RegisterSectionCopy;
  privacyConsent: RegisterCheckboxCopy;
  submitLabel: string;
  subtitle: string;
  termsConsent: RegisterCheckboxCopy;
  title: string;
  tutorFields: {
    documentNumber: RegisterFieldCopy;
    documentType: RegisterSelectFieldCopy;
    email: RegisterEmailFieldCopy;
    firstName: RegisterFieldCopy;
    lastName: RegisterFieldCopy;
    phone: RegisterFieldCopy;
  };
  tutorSection: RegisterSectionCopy;
};

export type LoginContent = {
  email: LoginFieldCopy & {
    invalidMessage: string;
    requiredMessage: string;
  };
  forgotPasswordCta: CtaTarget;
  generalErrorMessage: string;
  meta: AuthMeta;
  password: LoginFieldCopy & {
    hidePasswordLabel: string;
    requiredMessage: string;
    showPasswordLabel: string;
  };
  registerCta: CtaTarget;
  registerPrompt: string;
  submitLabel: string;
  subtitle: string;
  title: string;
};

export type AuthPlaceholderContent = {
  description: string;
  eyebrow: string;
  meta: AuthMeta;
  primaryCta: CtaTarget;
  secondaryCta: CtaTarget;
  title: string;
};

export type AuthActionStatus = 'error' | 'idle' | 'submitting' | 'success';

export type ForgotPasswordFlowStep = 'code' | 'email' | 'password';

export type ForgotPasswordRequestCodeFailureReason = 'rate_limited' | 'unexpected';

export type ForgotPasswordVerifyCodeFailureReason =
  | 'attempts_exceeded'
  | 'blocked'
  | 'expired'
  | 'invalid'
  | 'invalid_format'
  | 'unexpected';

export type ForgotPasswordResetPasswordFailureReason =
  | 'code_expired'
  | 'code_invalid'
  | 'password_invalid'
  | 'session_invalid'
  | 'unexpected';

export type ForgotPasswordRequestCodeInput = {
  email: string;
};

export type ForgotPasswordVerifyCodeInput = {
  code: string;
  email: string;
};

export type ForgotPasswordResetPasswordInput = {
  code: string;
  email: string;
  password: string;
};

export type ForgotPasswordRequestCodeResult =
  | {
      cooldownSeconds: number;
      expiresAt: number;
      ok: true;
    }
  | {
      cooldownSeconds?: number;
      ok: false;
      reason: ForgotPasswordRequestCodeFailureReason;
    };

export type ForgotPasswordVerifyCodeResult =
  | {
      ok: true;
    }
  | {
      blockedSeconds?: number;
      ok: false;
      reason: ForgotPasswordVerifyCodeFailureReason;
    };

export type ForgotPasswordResetPasswordResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: ForgotPasswordResetPasswordFailureReason;
    };

export type ForgotPasswordService = {
  requestResetCode:
    (input: ForgotPasswordRequestCodeInput) =>
      Promise<ForgotPasswordRequestCodeResult> | ForgotPasswordRequestCodeResult;
  resendResetCode:
    (input: ForgotPasswordRequestCodeInput) =>
      Promise<ForgotPasswordRequestCodeResult> | ForgotPasswordRequestCodeResult;
  resetPassword:
    (input: ForgotPasswordResetPasswordInput) =>
      Promise<ForgotPasswordResetPasswordResult> | ForgotPasswordResetPasswordResult;
  verifyResetCode:
    (input: ForgotPasswordVerifyCodeInput) =>
      Promise<ForgotPasswordVerifyCodeResult> | ForgotPasswordVerifyCodeResult;
};

export type ForgotPasswordContent = {
  blockedMessagePrefix: string;
  changePasswordLabel: string;
  changePasswordSubmittingLabel: string;
  codeExpiredMessage: string;
  codeField: VerifyEmailCodeFieldCopy;
  codeInstructionsPrefix: string;
  codeValidatedMessage: string;
  cooldownMessage: string;
  description: string;
  emailField: RegisterEmailFieldCopy;
  emailStepSuccessMessage: string;
  expiryMessagePrefix: string;
  invalidCodeMessage: string;
  loginCta: CtaTarget;
  meta: AuthMeta;
  password: RegisterPasswordFieldCopy;
  passwordResetUnexpectedMessage: string;
  resendCodeLabel: string;
  resendCodeSubmittingLabel: string;
  sendCodeLabel: string;
  sendCodeSubmittingLabel: string;
  sessionInvalidMessage: string;
  successFlashMessage: string;
  title: string;
  tooManyAttemptsMessagePrefix: string;
  unexpectedRequestMessage: string;
  unexpectedVerificationMessage: string;
  verifyCodeLabel: string;
  verifyCodeSubmittingLabel: string;
};

export type VerifyEmailCodeFieldCopy = {
  invalidMessage: string;
  label: string;
  placeholder: string;
  requiredMessage: string;
};

export type VerifyEmailResultStatus = 'error' | 'idle' | 'resending' | 'submitting' | 'success';

export type VerifyEmailVerificationFailureReason =
  | 'expired'
  | 'invalid'
  | 'invalid_format'
  | 'missing_email'
  | 'rate_limited';

export type VerifyEmailVerificationResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
      reason: VerifyEmailVerificationFailureReason;
    };

export type VerifyEmailResendResult =
  | {
      cooldownSeconds: number;
      message: string;
      ok: true;
    }
  | {
      cooldownSeconds?: number;
      message: string;
      ok: false;
      reason: Exclude<VerifyEmailVerificationFailureReason, 'invalid' | 'invalid_format' | 'expired'>;
    };

export type VerifyEmailServiceInput = {
  code: string;
  email: string;
};

export type VerifyEmailResendInput = {
  email: string;
};

export type VerifyEmailService = {
  resendCode:
    (input: VerifyEmailResendInput) => Promise<VerifyEmailResendResult> | VerifyEmailResendResult;
  verifyCode:
    (input: VerifyEmailServiceInput) =>
      Promise<VerifyEmailVerificationResult> | VerifyEmailVerificationResult;
};

export type VerifyEmailContent = {
  backHomeCta: CtaTarget;
  codeField: VerifyEmailCodeFieldCopy;
  cooldownMessage: string;
  description: string;
  emailFallback: string;
  emailPrefix: string;
  emailRequiredMessage: string;
  loginCta: CtaTarget;
  meta: AuthMeta;
  resendIdleLabel: string;
  resendSuccessMessage: string;
  resendSubmittingLabel: string;
  submitLabel: string;
  submitSubmittingLabel: string;
  title: string;
};

export type AuthContent = {
  forgotPassword: Partial<AuthPlaceholderContent> & Partial<ForgotPasswordContent>;
  login: LoginContent;
  register: RegisterContent;
  verifyEmail: VerifyEmailContent;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginFormErrors = Partial<Record<'email' | 'password', string>>;

export type LoginFormState = {
  errors: LoginFormErrors;
  generalError: string | null;
  values: LoginFormValues;
};

export type RegisterFormValues = {
  acceptPrivacyPolicy: boolean;
  acceptTerms: boolean;
  birthDate: string;
  cityId: string;
  confirmPassword: string;
  documentNumber: string;
  documentTypeId: string;
  email: string;
  firstName: string;
  lastName: string;
  localityId: string;
  password: string;
  phone: string;
  sex: PatientSex | '';
  tutorDocumentNumber: string;
  tutorDocumentTypeId: string;
  tutorEmail: string;
  tutorFirstName: string;
  tutorLastName: string;
  tutorPhone: string;
};

export type RegisterFormField = keyof RegisterFormValues;

export type RegisterFormErrors = Partial<Record<RegisterFormField, string>>;

export type RegisterFormState = {
  errors: RegisterFormErrors;
  values: RegisterFormValues;
};

export type NormalizedPatientRegisterPayload = {
  consents: {
    acceptPrivacyPolicy: boolean;
    acceptTerms: boolean;
  };
  patient: {
    birthDate: string;
    cityId: string;
    documentNumber: string;
    documentTypeId: string;
    email: string;
    firstName: string;
    lastName: string;
    localityId: string;
    password: string;
    phone: string;
    sex: PatientSex;
  };
  tutor:
    | {
        documentNumber: string;
        documentTypeId: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
      }
    | null;
};

export type VerifyEmailFormValues = {
  codeDigits: string[];
};

export type VerifyEmailFormErrors = Partial<Record<'code', string>>;

export type VerifyEmailFormState = {
  errors: VerifyEmailFormErrors;
  status: VerifyEmailResultStatus;
  statusMessage: string | null;
  values: VerifyEmailFormValues;
};

export type ForgotPasswordFormValues = {
  codeDigits: string[];
  confirmPassword: string;
  draftEmail: string;
  password: string;
};

export type ForgotPasswordFormErrors = Partial<
  Record<'code' | 'confirmPassword' | 'draftEmail' | 'password', string | undefined>
>;

export type ForgotPasswordFormState = {
  codeVerificationStatus: AuthActionStatus;
  email: string;
  emailRequestStatus: AuthActionStatus;
  errors: ForgotPasswordFormErrors;
  messages: {
    code: string | null;
    email: string | null;
    password: string | null;
  };
  passwordResetStatus: AuthActionStatus;
  step: ForgotPasswordFlowStep;
  values: ForgotPasswordFormValues;
};

export type UniversityStatus = 'active' | 'inactive' | 'pending';

export type CredentialDeliveryStatus = 'generated' | 'sent';

export type AdminUniversity = {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string | null;
  createdAt: string;
  credentialId: string | null;
  id: string;
  mainCity: string;
  mainCityId: string;
  mainLocality: string;
  mainLocalityId: string;
  name: string;
  status: UniversityStatus;
};

export type PendingCredential = {
  administratorEmail: string;
  administratorName: string;
  deliveryStatus: CredentialDeliveryStatus;
  id: string;
  lastSentAt: string | null;
  sentCount: number;
  universityId: string;
  universityName: string;
  universityStatus: UniversityStatus;
};

export type AdminModuleState = {
  credentials: PendingCredential[];
  universities: AdminUniversity[];
};

export type RegisterUniversityFormValues = {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  cityId: string;
  mainLocalityId: string;
  name: string;
};

export type RegisterUniversityFormField = keyof RegisterUniversityFormValues;

export type RegisterUniversityFormErrors = Partial<Record<RegisterUniversityFormField, string>>;

export type AdminShellNavigationIcon =
  | 'badge'
  | 'bell'
  | 'building2'
  | 'calendar-check-2'
  | 'calendar-days'
  | 'clipboard-list'
  | 'graduation-cap'
  | 'house'
  | 'key-round'
  | 'message-square-more'
  | 'presentation'
  | 'search'
  | 'stethoscope'
  | 'user-round'
  | 'upload';

export type AdminShellNavigationItem = {
  icon: AdminShellNavigationIcon;
  label: string;
  matchPrefix?: `/${string}`;
  to: `/${string}`;
};

export type PortalNotificationTone = 'danger' | 'info' | 'success' | 'warning';

export type PortalNotification = {
  createdAt: string;
  description: string;
  id: string;
  isRead: boolean;
  title: string;
  tone?: PortalNotificationTone;
  to?: string;
};

export type AdminShellContent = {
  adminUser: {
    firstName: string;
    lastName: string;
  };
  homePath?: `/${string}`;
  mobileTitle?: string;
  logoutCta: {
    label: string;
    to: `/${string}`;
  };
  navigation: readonly AdminShellNavigationItem[];
  title: string;
};

export type PersonOperationalStatus = 'active' | 'inactive';

export type UniversityInstitutionProfile = {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  campuses: UniversityCampus[];
  id: string;
  logoAlt: string;
  logoFileName: string | null;
  logoSrc: string | null;
  mainCity: string;
  mainCityId: string;
  mainLocality: string;
  mainLocalityId: string;
  name: string;
};

export type UniversityHomeInstitution = {
  adminFirstName: string;
  adminLastName: string;
  logoAlt: string;
  logoSrc: string | null;
  mainCity: string;
  mainLocality: string;
  name: string;
};

export type UniversityCampus = {
  address: string;
  city: string;
  cityId: string;
  id: string;
  locality: string;
  localityId: string;
  name: string;
  status: PersonOperationalStatus;
};

export type UniversityHomeCampus = Pick<
  UniversityCampus,
  'city' | 'id' | 'locality' | 'name' | 'status'
>;

export type UniversityStudent = {
  createdAt: string;
  credentialId: string | null;
  documentNumber: string;
  documentTypeCode: string;
  documentTypeId: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
  semester: string;
  status: PersonOperationalStatus;
};

export type UniversityHomeStudentStatus = PersonOperationalStatus | 'pending';

export type UniversityHomeStudent = Pick<
  UniversityStudent,
  | 'createdAt'
  | 'documentNumber'
  | 'documentTypeCode'
  | 'firstName'
  | 'id'
  | 'lastName'
  | 'semester'
> & {
  displayStatus: UniversityHomeStudentStatus;
};

export type UniversityTeacher = {
  createdAt: string;
  documentNumber: string;
  documentTypeCode: string;
  documentTypeId: string;
  firstName: string;
  id: string;
  lastName: string;
  status: PersonOperationalStatus;
};

export type UniversityHomeTeacher = Pick<
  UniversityTeacher,
  'createdAt' | 'documentNumber' | 'documentTypeCode' | 'firstName' | 'id' | 'lastName' | 'status'
>;

export type UniversityStudentCredential = {
  deliveryStatus: CredentialDeliveryStatus;
  id: string;
  lastSentAt: string | null;
  sentCount: number;
  studentId: string;
};

export type UniversityHomeStudentSummary = {
  active: number;
  inactive: number;
  pending: number;
  total: number;
};

export type UniversityHomeTeacherSummary = {
  active: number;
  inactive: number;
  total: number;
};

export type UniversityAdminOverview = {
  activeCampusesCount: number;
  institution: UniversityHomeInstitution;
  recentCampuses: UniversityHomeCampus[];
  recentStudents: UniversityHomeStudent[];
  recentTeachers: UniversityHomeTeacher[];
  studentSummary: UniversityHomeStudentSummary;
  teacherSummary: UniversityHomeTeacherSummary;
};

export type UniversityBulkTemplateType = 'students' | 'teachers';

export type BulkRowError = {
  row: number;
  column: string;
  message: string;
};

export type BulkStudentRow = {
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  correo: string;
  celular: string;
  semestre: number;
};

export type BulkTeacherRow = {
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
};

export type UniversityBulkUploadStatus =
  | 'file_selected'
  | 'idle'
  | 'invalid'
  | 'processed'
  | 'validated';

export type UniversityBulkUploadState = {
  errors: string[];
  fileName: string | null;
  status: UniversityBulkUploadStatus;
  templateType: UniversityBulkTemplateType;
};

export type UniversityAdminModuleState = {
  credentials: UniversityStudentCredential[];
  institutionProfile: UniversityInstitutionProfile;
  students: UniversityStudent[];
  teachers: UniversityTeacher[];
};

export type UniversityInstitutionFormValues = {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  campuses: UniversityCampus[];
  cityId: string;
  logoFileName: string | null;
  logoSrc: string | null;
  mainLocalityId: string;
  name: string;
};

export type UniversityInstitutionFormField = keyof UniversityInstitutionFormValues;

export type UniversityInstitutionFormErrors = Partial<
  Record<UniversityInstitutionFormField, string>
>;

export type UniversityPasswordFormValues = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

export type UniversityPasswordFormField = keyof UniversityPasswordFormValues;

export type UniversityPasswordFormErrors = Partial<Record<UniversityPasswordFormField, string>>;

export type RegisterStudentFormValues = {
  documentNumber: string;
  documentTypeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  semester: string;
};

export type RegisterStudentFormField = keyof RegisterStudentFormValues;

export type RegisterStudentFormErrors = Partial<Record<RegisterStudentFormField, string>>;

export type RegisterTeacherFormValues = {
  documentNumber: string;
  documentTypeId: string;
  firstName: string;
  lastName: string;
};

export type RegisterTeacherFormField = keyof RegisterTeacherFormValues;

export type RegisterTeacherFormErrors = Partial<Record<RegisterTeacherFormField, string>>;

export type StudentProfessionalLinkType =
  | 'RED_PROFESIONAL'
  | 'PORTAFOLIO'
  | 'HOJA_DE_VIDA'
  | 'OTRO';

export type StudentRequestStatus =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CERRADA'
  | 'CANCELADA';

export type StudentConversationStatus = 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';

export type StudentConversationMessageAuthor = 'ESTUDIANTE' | 'PACIENTE';

export type StudentScheduleBlockType = 'ESPECIFICO' | 'RECURRENTE';

export type StudentAgendaAppointmentStatus =
  | 'PROPUESTA'
  | 'ACEPTADA'
  | 'CANCELADA'
  | 'FINALIZADA'
  | 'REPROGRAMACION_PENDIENTE';

export type StudentProfessionalLink = {
  id: string;
  type: StudentProfessionalLinkType;
  url: string;
};

export type StudentProfile = {
  avatarAlt: string;
  avatarFileName: string | null;
  avatarSrc: string | null;
  availabilityGeneral: string;
  biography: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  links: StudentProfessionalLink[];
  semester: string;
  universityLogoAlt: string;
  universityLogoSrc: string | null;
  universityName: string;
};

export type StudentTreatment = {
  description: string;
  id: string;
  name: string;
  status: PersonOperationalStatus;
};

export type StudentPracticeSite = {
  address: string;
  city: string;
  id: string;
  locality: string;
  name: string;
  status: PersonOperationalStatus;
};

export type StudentSupervisor = {
  id: string;
  name: string;
  status: PersonOperationalStatus;
};

export type StudentAppointmentReview = {
  appointmentLabel: string;
  comment: string | null;
  createdAt: string;
  id: string;
  patientName: string;
  rating: number;
  siteName: string;
};

export type StudentAgendaAppointment = {
  additionalInfo: string | null;
  appointmentType: string;
  city: string;
  endAt: string;
  id: string;
  patientName: string;
  requestId: string;
  siteId: string;
  siteName: string;
  startAt: string;
  status: StudentAgendaAppointmentStatus;
  supervisorId: string;
  supervisorName: string;
  treatmentIds: string[];
  treatmentNames: string[];
};

export type StudentScheduleBlock = {
  dayOfWeek: number | null;
  endTime: string;
  id: string;
  reason: string | null;
  recurrenceEndDate: string | null;
  recurrenceStartDate: string | null;
  specificDate: string | null;
  startTime: string;
  status: PersonOperationalStatus;
  type: StudentScheduleBlockType;
};

export type StudentRequest = {
  appointmentsCount: number;
  conversationId: string | null;
  conversationEnabled: boolean;
  id: string;
  patientAge: number;
  patientCity: string;
  patientName: string;
  reason: string | null;
  responseAt: string | null;
  sentAt: string;
  status: StudentRequestStatus;
};

export type StudentConversationMessage = {
  author: StudentConversationMessageAuthor;
  authorName: string;
  content: string;
  id: string;
  sentAt: string;
};

export type StudentConversation = {
  id: string;
  messages: StudentConversationMessage[];
  patientAge: number;
  patientCity: string;
  patientName: string;
  reason: string | null;
  requestId: string;
  status: StudentConversationStatus;
  unreadCount: number;
};

export type StudentModuleState = {
  appointments: StudentAgendaAppointment[];
  conversations: StudentConversation[];
  practiceSites: StudentPracticeSite[];
  profile: StudentProfile;
  reviews: StudentAppointmentReview[];
  requests: StudentRequest[];
  scheduleBlocks: StudentScheduleBlock[];
  supervisors: StudentSupervisor[];
  treatments: StudentTreatment[];
};

export type StudentProfileFormValues = {
  avatarFileName: string | null;
  avatarSrc: string | null;
  availabilityGeneral: string;
  biography: string;
  links: StudentProfessionalLink[];
};

export type StudentProfileFormField = keyof StudentProfileFormValues;

export type StudentProfileFormErrors = Partial<Record<StudentProfileFormField, string>>;

export type StudentScheduleBlockFormValues = {
  dayOfWeek: string;
  endTime: string;
  reason: string;
  recurrenceEndDate: string;
  recurrenceStartDate: string;
  specificDate: string;
  startTime: string;
  type: StudentScheduleBlockType;
};

export type StudentScheduleBlockFormField = keyof StudentScheduleBlockFormValues;

export type StudentScheduleBlockFormErrors = Partial<
  Record<StudentScheduleBlockFormField, string>
>;

export type StudentAppointmentFormValues = {
  additionalInfo: string;
  endTime: string;
  requestId: string;
  siteId: string;
  startDate: string;
  startTime: string;
  supervisorId: string;
  treatmentIds: string[];
};

export type StudentAppointmentFormField = keyof StudentAppointmentFormValues;

export type StudentAppointmentFormErrors = Partial<
  Record<StudentAppointmentFormField, string>
>;

export type PatientDiscoveryAvailability = 'available' | 'limited';

export type PatientRequestStatus =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CERRADA'
  | 'CANCELADA';

export type PatientConversationStatus = 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';

export type PatientConversationMessageAuthor = 'PACIENTE' | 'ESTUDIANTE';

export type PatientAppointmentStatus =
  | 'PROPUESTA'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'FINALIZADA';

export type PatientTutorProfile = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type PatientProfile = {
  avatarAlt: string;
  avatarFileName: string | null;
  avatarSrc: string | null;
  birthDate: string;
  city: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  locality: string;
  phone: string;
  sex: PatientSex;
  tutor: PatientTutorProfile | null;
};

export type PatientStudentDirectoryItem = {
  avatarAlt: string;
  avatarSrc: string | null;
  availabilityGeneral: string;
  availabilityStatus: PatientDiscoveryAvailability;
  biography: string;
  city: string;
  id: string;
  lastName: string;
  locality: string;
  practiceSite: string;
  semester: string;
  firstName: string;
  treatments: string[];
  universityName: string;
};

export type PatientRequest = {
  appointmentsCount: number;
  conversationId: string | null;
  id: string;
  reason: string | null;
  responseAt: string | null;
  sentAt: string;
  status: PatientRequestStatus;
  studentId: string;
  studentName: string;
  universityName: string;
};

export type PatientConversationMessage = {
  author: PatientConversationMessageAuthor;
  authorName: string;
  content: string;
  id: string;
  sentAt: string;
};

export type PatientConversation = {
  id: string;
  messages: PatientConversationMessage[];
  reason: string | null;
  requestId: string;
  status: PatientConversationStatus;
  studentId: string;
  studentName: string;
  universityName: string;
  unreadCount: number;
};

export type PatientAppointment = {
  additionalInfo: string | null;
  appointmentType: string;
  city: string;
  endAt: string;
  id: string;
  siteName: string;
  startAt: string;
  status: PatientAppointmentStatus;
  studentName: string;
  teacherName: string;
  universityName: string;
};

export type PatientModuleState = {
  appointments: PatientAppointment[];
  conversations: PatientConversation[];
  profile: PatientProfile;
  requests: PatientRequest[];
  students: PatientStudentDirectoryItem[];
};

export type PatientProfileFormValues = {
  avatarFileName: string | null;
  avatarSrc: string | null;
  city: string;
  locality: string;
  phone: string;
};

export type PatientProfileFormField = keyof PatientProfileFormValues;

export type PatientProfileFormErrors = Partial<Record<PatientProfileFormField, string>>;
