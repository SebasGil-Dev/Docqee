import { ROUTES } from '@/constants/routes';

import type { AuthContent } from './types';

export const authContent: AuthContent = {
  forgotPassword: {
    description:
      'La recuperación de contraseña quedará conectada en la siguiente fase de autenticación, sin rehacer esta experiencia visual.',
    blockedMessagePrefix: 'Demasiados intentos fallidos. Inténtalo nuevamente en',
    changePasswordLabel: 'Cambiar contraseña',
    changePasswordSubmittingLabel: 'Cambiando contraseña...',
    codeExpiredMessage: 'El código expiró. Solicita uno nuevo para continuar.',
    codeField: {
      invalidMessage: 'Ingresa un código válido de 6 dígitos.',
      label: 'Código de verificación',
      placeholder: '•',
      requiredMessage: 'Debes ingresar el código de 6 dígitos.',
    },
    codeInstructionsPrefix: 'Ingresa el código de seis dígitos enviado a',
    codeValidatedMessage: 'Código validado. Ya puedes definir una nueva contraseña.',
    cooldownMessage: 'Podrás solicitar un nuevo código en',
    emailField: {
      invalidMessage: 'Ingresa un correo electrónico válido',
      label: 'Correo electrónico',
      placeholder: 'nombre@correo.com',
      requiredMessage: 'El correo electrónico es obligatorio',
    },
    emailStepSuccessMessage:
      'Se procesó la solicitud y, si aplica, se envió un código de recuperación.',
    expiryMessagePrefix: 'El código vence en',
    invalidCodeMessage: 'El código ingresado no es correcto. Verifica e inténtalo nuevamente.',
    meta: {
      description:
        'Docqee prepara la recuperación de contraseña para futuras fases de autenticación.',
      title: 'Docqee | Recuperar contraseña',
    },
    primaryCta: {
      kind: 'internal',
      label: 'Volver a iniciar sesión',
      to: ROUTES.login,
    },
    secondaryCta: {
      kind: 'internal',
      label: 'Volver al inicio',
      to: ROUTES.home,
    },
    title: 'Recuperación de contraseña en preparación',
  },
  login: {
    email: {
      invalidMessage: 'Ingresa un correo válido',
      label: 'Correo electrónico',
      placeholder: 'nombre@gmail.com',
      requiredMessage: 'El correo es obligatorio',
    },
    forgotPasswordCta: {
      kind: 'internal',
      label: '¿Olvidó su contraseña?',
      to: ROUTES.forgotPassword,
    },
    generalErrorMessage: 'Usuario o contraseña incorrectos',
    meta: {
      description:
        'Accede a tu cuenta de Docqee para continuar con tu experiencia odontológica universitaria.',
      title: 'Docqee | Iniciar sesión',
    },
    password: {
      hidePasswordLabel: 'Ocultar contraseña',
      label: 'Contraseña',
      placeholder: '••••••••',
      requiredMessage: 'La contraseña es obligatoria',
      showPasswordLabel: 'Mostrar contraseña',
    },
    registerCta: {
      kind: 'internal',
      label: 'Crear cuenta',
      to: ROUTES.register,
    },
    registerPrompt: '¿Aún no tienes cuenta?',
    submitLabel: 'Iniciar sesión',
    subtitle: 'Accede a tu cuenta',
    title: 'Bienvenido',
  },
  register: {
    accountSection: {
      description:
        'Define un acceso seguro para continuar con tu vinculaci\u00F3n como paciente dentro de Docqee.',
      title: 'Contacto y acceso',
    },
    locationSection: {
      title: 'Ubicaci\u00F3n',
    },
    loginCta: {
      kind: 'internal',
      label: 'Iniciar sesi\u00F3n',
      to: ROUTES.login,
    },
    loginPrompt: '\u00BFYa tienes cuenta?',
    meta: {
      description:
        'Crea tu cuenta de paciente en Docqee para iniciar tu vinculaci\u00F3n con estudiantes de odontolog\u00EDa.',
      title: 'Docqee | Crear cuenta',
    },
    password: {
      confirmLabel: 'Confirmar contrase\u00F1a',
      confirmMismatchMessage: 'La confirmaci\u00F3n no coincide con la contrase\u00F1a',
      confirmPlaceholder: 'Repite tu contrase\u00F1a',
      confirmRequiredMessage: 'Debes confirmar la contrase\u00F1a',
      hidePasswordLabel: 'Ocultar contrase\u00F1a',
      label: 'Contrase\u00F1a',
      placeholder: 'Crea una contrase\u00F1a segura',
      requiredMessage: 'La contrase\u00F1a es obligatoria',
      requirements: [
        { key: 'minLength', label: 'M\u00EDnimo 8 caracteres.' },
        { key: 'uppercase', label: 'M\u00EDnimo una letra may\u00FAscula.' },
        { key: 'lowercase', label: 'M\u00EDnimo una letra min\u00FAscula.' },
        { key: 'number', label: 'M\u00EDnimo un n\u00FAmero.' },
        { key: 'special', label: 'M\u00EDnimo un car\u00E1cter especial.' },
      ],
      requirementsMessage: 'La contrase\u00F1a debe cumplir todos los requisitos',
      showPasswordLabel: 'Mostrar contrase\u00F1a',
    },
    patientFields: {
      birthDate: {
        futureDateMessage: 'La fecha de nacimiento no puede ser futura',
        invalidMessage: 'Ingresa una fecha válida en formato dd/mm/aaaa',
        label: 'Fecha de nacimiento',
        placeholder: 'dd/mm/aaaa',
        requiredMessage: 'La fecha de nacimiento es obligatoria',
      },
      city: {
        emptyMessage: 'No encontramos ciudades disponibles',
        errorMessage: 'No pudimos cargar las ciudades',
        label: 'Ciudad',
        loadingMessage: 'Cargando ciudades...',
        placeholder: 'Selecciona una ciudad',
        requiredMessage: 'La ciudad es obligatoria',
      },
      documentNumber: {
        label: 'N\u00FAmero de documento',
        placeholder: 'Ingresa tu n\u00FAmero de documento',
        requiredMessage: 'El n\u00FAmero de documento es obligatorio',
      },
      documentType: {
        emptyMessage: 'No encontramos tipos de documento disponibles',
        errorMessage: 'No pudimos cargar los tipos de documento',
        label: 'Tipo de documento',
        loadingMessage: 'Cargando tipos de documento...',
        placeholder: 'Selecciona un tipo de documento',
        requiredMessage: 'El tipo de documento es obligatorio',
      },
      email: {
        invalidMessage: 'Ingresa un correo electr\u00F3nico v\u00E1lido',
        label: 'Correo electr\u00F3nico',
        placeholder: 'nombre@correo.com',
        requiredMessage: 'El correo electr\u00F3nico es obligatorio',
      },
      firstName: {
        label: 'Nombres',
        placeholder: 'Ingresa tus nombres',
        requiredMessage: 'Los nombres son obligatorios',
      },
      lastName: {
        label: 'Apellidos',
        placeholder: 'Ingresa tus apellidos',
        requiredMessage: 'Los apellidos son obligatorios',
      },
      locality: {
        emptyMessage: 'No encontramos localidades disponibles',
        errorMessage: 'No pudimos cargar las localidades',
        label: 'Localidad',
        loadingMessage: 'Cargando localidades...',
        placeholder: 'Selecciona una localidad',
        placeholderWithoutCity: 'Selecciona una ciudad primero',
        requiredMessage: 'La localidad es obligatoria',
      },
      phone: {
        label: 'Celular',
        placeholder: 'Ingresa tu n\u00FAmero de celular',
        requiredMessage: 'El celular es obligatorio',
      },
      sex: {
        label: 'Sexo',
        options: ['FEMENINO', 'MASCULINO', 'OTRO'],
        requiredMessage: 'Debes seleccionar una opci\u00F3n de sexo',
      },
    },
    personalSection: {
      description:
        'Completa la informaci\u00F3n para iniciar el proceso de vinculaci\u00F3n.',
      title: 'Informaci\u00F3n personal',
    },
    privacyConsent: {
      label:
        'Autorizo el tratamiento de mis datos personales conforme a la Pol\u00EDtica de Privacidad de Docqee, para la gesti\u00F3n de mi vinculaci\u00F3n con estudiantes de odontolog\u00EDa y el uso de los servicios de la plataforma.',
      requiredMessage: 'Debes autorizar el tratamiento de datos personales',
    },
    submitLabel: 'Crear cuenta',
    subtitle:
      'Registra tus datos para comenzar tu vinculaci\u00F3n con estudiantes de odontolog\u00EDa.',
    termsConsent: {
      label: 'Acepto los T\u00E9rminos y Condiciones de uso de Docqee.',
      requiredMessage: 'Debes aceptar los t\u00E9rminos y condiciones',
    },
    title: 'Crear cuenta',
    tutorFields: {
      documentNumber: {
        label: 'N\u00FAmero de documento del tutor',
        placeholder: 'Ingresa el documento del tutor',
        requiredMessage: 'El documento del tutor es obligatorio',
      },
      documentType: {
        emptyMessage: 'No encontramos tipos de documento disponibles',
        errorMessage: 'No pudimos cargar los tipos de documento',
        label: 'Tipo de documento del tutor',
        loadingMessage: 'Cargando tipos de documento...',
        placeholder: 'Selecciona un tipo de documento',
        requiredMessage: 'El tipo de documento del tutor es obligatorio',
      },
      email: {
        invalidMessage: 'Ingresa un correo electr\u00F3nico v\u00E1lido para el tutor',
        label: 'Correo electr\u00F3nico del tutor',
        placeholder: 'tutor@correo.com',
        requiredMessage: 'El correo electr\u00F3nico del tutor es obligatorio',
      },
      firstName: {
        label: 'Nombres del tutor',
        placeholder: 'Ingresa los nombres del tutor',
        requiredMessage: 'Los nombres del tutor son obligatorios',
      },
      lastName: {
        label: 'Apellidos del tutor',
        placeholder: 'Ingresa los apellidos del tutor',
        requiredMessage: 'Los apellidos del tutor son obligatorios',
      },
      phone: {
        label: 'Celular del tutor',
        placeholder: 'Ingresa el celular del tutor',
        requiredMessage: 'El celular del tutor es obligatorio',
      },
    },
    tutorSection: {
      description:
        'Se requiere un tutor responsable ya que eres menor de edad.',
      title: 'Tutor responsable',
    },
  },
  verifyEmail: {
    backHomeCta: {
      kind: 'internal',
      label: 'Ir al inicio',
      to: ROUTES.home,
    },
    codeField: {
      invalidMessage: 'Ingresa un c\u00F3digo v\u00E1lido de 6 d\u00EDgitos.',
      label: 'C\u00F3digo de verificaci\u00F3n',
      placeholder: '\u2022',
      requiredMessage: 'Debes ingresar el c\u00F3digo de 6 d\u00EDgitos.',
    },
    cooldownMessage: 'Podr\u00E1s solicitar un nuevo c\u00F3digo en',
    description:
      'Ingresa el c\u00F3digo de seguridad de seis d\u00EDgitos que enviamos a tu correo para continuar con tu registro.',
    emailFallback: 'tu correo registrado',
    emailPrefix: 'Hemos enviado un c\u00F3digo de seguridad de seis d\u00EDgitos a',
    emailRequiredMessage:
      'No encontramos el correo a verificar. Vuelve al registro para solicitar un c\u00F3digo.',
    loginCta: {
      kind: 'internal',
      label: 'Iniciar sesi\u00F3n',
      to: ROUTES.login,
    },
    meta: {
      description:
        'Verifica tu correo en Docqee para completar tu registro como paciente.',
      title: 'Docqee | Verificaci\u00F3n de correo',
    },
    resendIdleLabel: 'Reenviar c\u00F3digo',
    resendSubmittingLabel: 'Reenviando...',
    resendSuccessMessage: 'Preparamos el reenv\u00EDo del c\u00F3digo a tu correo.',
    submitLabel: 'Verificar',
    submitSubmittingLabel: 'Verificando...',
    title: 'Verificaci\u00F3n de correo',
  },
};
