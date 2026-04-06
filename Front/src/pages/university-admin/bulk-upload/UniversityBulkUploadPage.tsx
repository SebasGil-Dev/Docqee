import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Rocket,
  XCircle,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { universityAdminContent } from '@/content/universityAdminContent';
import type { UniversityBulkTemplateType, UniversityBulkUploadState } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

function buildTemplateContent(templateType: UniversityBulkTemplateType) {
  if (templateType === 'students') {
    return [
      'nombres,apellidos,tipo_documento,numero_documento,correo,celular,semestre',
      'Lucia,Mejia,CC,1001234567,lucia.mejia@universidad.edu.co,3001234567,5',
    ].join('\n');
  }

  return [
    'nombres,apellidos,tipo_documento,numero_documento',
    'Adriana,Londono,CC,80124567',
  ].join('\n');
}

function getInitialUploadState(templateType: UniversityBulkTemplateType): UniversityBulkUploadState {
  return {
    errors: [],
    fileName: null,
    status: 'idle',
    templateType,
  };
}

function isSupportedFile(fileName: string) {
  return /\.(csv|xlsx|xls)$/i.test(fileName);
}

export function UniversityBulkUploadPage() {
  const { errorMessage, isLoading, processBulkUpload } = useUniversityAdminModuleStore();
  const [uploadState, setUploadState] = useState<UniversityBulkUploadState>(
    getInitialUploadState('students'),
  );
  const [processedSummary, setProcessedSummary] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const selectedTemplate = useMemo(
    () =>
      universityAdminContent.bulkUploadPage.templateOptions.find(
        (option) => option.value === uploadState.templateType,
      ),
    [uploadState.templateType],
  );

  const downloadTemplate = () => {
    const templateContent = buildTemplateContent(uploadState.templateType);
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download =
      uploadState.templateType === 'students'
        ? 'plantilla-estudiantes.csv'
        : 'plantilla-docentes.csv';
    anchor.click();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const resetUploadFeedback = (templateType: UniversityBulkTemplateType) => {
    setUploadState(getInitialUploadState(templateType));
    setProcessedSummary(null);
  };

  const handleTemplateChange = (templateType: UniversityBulkTemplateType) => {
    resetUploadFeedback(templateType);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!isSupportedFile(file.name)) {
      setUploadState({
        errors: [universityAdminContent.bulkUploadPage.invalidFileMessage],
        fileName: file.name,
        status: 'invalid',
        templateType: uploadState.templateType,
      });
      setProcessedSummary(null);
      return;
    }

    setUploadState({
      errors: [],
      fileName: file.name,
      status: 'file_selected',
      templateType: uploadState.templateType,
    });
    setProcessedSummary(null);
  };

  const handleValidate = () => {
    if (!uploadState.fileName) {
      setUploadState((currentState) => ({
        ...currentState,
        errors: ['Selecciona un archivo antes de validar.'],
        status: 'invalid',
      }));
      return;
    }

    if (/error|invalido/i.test(uploadState.fileName)) {
      setUploadState((currentState) => ({
        ...currentState,
        errors: [universityAdminContent.bulkUploadPage.invalidMockMessage],
        status: 'invalid',
      }));
      return;
    }

    setUploadState((currentState) => ({
      ...currentState,
      errors: [],
      status: 'validated',
    }));
  };

  const handleProcess = () => {
    if (uploadState.status !== 'validated') {
      return;
    }

    void (async () => {
      setIsProcessing(true);
      const result = await processBulkUpload(uploadState.templateType);

      if (!result) {
        setIsProcessing(false);
        return;
      }

      setUploadState((currentState) => ({
        ...currentState,
        status: 'processed',
      }));

      setProcessedSummary(
        uploadState.templateType === 'students'
          ? `${universityAdminContent.bulkUploadPage.processedStudentsMessage} Se agregaron ${result.createdStudents} estudiantes y ${result.createdCredentials} credenciales.`
          : `${universityAdminContent.bulkUploadPage.processedTeachersMessage} Se agregaron ${result.createdTeachers} docentes.`,
      );
      setIsProcessing(false);
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden sm:gap-5 lg:h-auto lg:min-h-fit lg:overflow-visible">
      <Seo
        description={universityAdminContent.bulkUploadPage.meta.description}
        noIndex
        title={universityAdminContent.bulkUploadPage.meta.title}
      />
      <AdminPageHeader description="" title={universityAdminContent.bulkUploadPage.title} />
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm text-rose-800 shadow-none"
          paddingClassName="p-4"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard
        className="flex-1 lg:w-full lg:flex-none lg:overflow-visible"
        panelClassName="bg-[#f4f8ff] lg:h-auto lg:overflow-visible"
      >
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 lg:min-h-fit lg:flex-none lg:overflow-visible lg:px-6 lg:py-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)]">
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5 lg:p-4.5 xl:p-5">
              <div className="space-y-4 lg:space-y-3.5">
                <div className="space-y-1">
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                    Plantilla base
                  </h2>
                  <p className="text-sm leading-6 text-ink-muted">
                    {universityAdminContent.bulkUploadPage.templateDescription}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {universityAdminContent.bulkUploadPage.templateOptions.map((option) => {
                    const isSelected = uploadState.templateType === option.value;

                    return (
                      <button
                        key={option.value}
                        className={classNames(
                          'flex w-full items-start justify-between rounded-[1.5rem] border px-4 py-3.5 text-left transition duration-300',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 bg-slate-50 text-ink hover:border-primary/40 hover:bg-white',
                        )}
                        type="button"
                        onClick={() => handleTemplateChange(option.value)}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {option.value === 'students' ? 'Estudiantes' : 'Docentes'}
                          </p>
                          <p className="text-xs leading-5 text-ink-muted">{option.description}</p>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                  type="button"
                  onClick={downloadTemplate}
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  <span>{universityAdminContent.bulkUploadPage.actionLabels.downloadTemplate}</span>
                </button>
              </div>
            </SurfaceCard>
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5 lg:p-4.5 xl:p-5">
              <div className="space-y-5 lg:space-y-4">
                <div className="space-y-1">
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                    {universityAdminContent.bulkUploadPage.uploadCardTitle}
                  </h2>
                  <p className="text-sm leading-6 text-ink-muted">
                    {universityAdminContent.bulkUploadPage.subtitle}
                  </p>
                </div>
                <label
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition duration-300 hover:border-primary/50 hover:bg-white lg:py-7"
                  htmlFor="bulk-upload-input"
                >
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white text-primary ring-1 ring-slate-200">
                    <FileSpreadsheet aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink">
                      Arrastra un archivo o selecciona uno desde tu equipo
                    </p>
                    <p className="text-sm text-ink-muted">
                      Formatos soportados: .csv, .xlsx, .xls
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    {universityAdminContent.bulkUploadPage.filePickerLabel}
                  </span>
                  <input
                    accept=".csv,.xlsx,.xls"
                    className="sr-only"
                    id="bulk-upload-input"
                    type="file"
                    onChange={handleFileSelection}
                  />
                </label>
                {uploadState.fileName ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{uploadState.fileName}</p>
                        <p className="text-xs text-ink-muted">
                          {uploadState.status === 'file_selected'
                            ? universityAdminContent.bulkUploadPage.readyToValidateMessage
                            : uploadState.status === 'validated'
                              ? universityAdminContent.bulkUploadPage.validatedMessage
                              : uploadState.status === 'processed'
                                ? processedSummary
                                : uploadState.errors[0]}
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-white p-2 text-rose-600 ring-1 ring-slate-200 transition duration-300 hover:bg-rose-50"
                        type="button"
                        onClick={() => resetUploadFeedback(uploadState.templateType)}
                      >
                        <XCircle aria-hidden="true" className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ) : null}
                {uploadState.errors.length > 0 ? (
                  <SurfaceCard
                    className="border border-rose-200 bg-rose-50/90 text-sm text-rose-800 shadow-none"
                    paddingClassName="p-4"
                  >
                    <div className="flex items-start gap-3">
                      <XCircle aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                      <div className="space-y-1">
                        {uploadState.errors.map((error) => (
                          <p key={error}>{error}</p>
                        ))}
                      </div>
                    </div>
                  </SurfaceCard>
                ) : null}
                {uploadState.status === 'validated' && !uploadState.errors.length ? (
                  <SurfaceCard
                    className="border border-emerald-200 bg-emerald-50/90 text-sm text-emerald-800 shadow-none"
                    paddingClassName="p-4"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                      <p>{universityAdminContent.bulkUploadPage.validatedMessage}</p>
                    </div>
                  </SurfaceCard>
                ) : null}
                {uploadState.status === 'processed' && processedSummary ? (
                  <SurfaceCard
                    className="border border-sky-200 bg-sky-50/90 text-sm text-sky-900 shadow-none"
                    paddingClassName="p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Rocket aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                      <p>{processedSummary}</p>
                    </div>
                  </SurfaceCard>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition duration-300 hover:bg-primary/15"
                    type="button"
                    onClick={handleValidate}
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    <span>{universityAdminContent.bulkUploadPage.actionLabels.validate}</span>
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={uploadState.status !== 'validated' || isLoading || isProcessing}
                    type="button"
                    onClick={handleProcess}
                  >
                    <Rocket aria-hidden="true" className="h-4 w-4" />
                    <span>
                      {isProcessing
                        ? 'Procesando...'
                        : universityAdminContent.bulkUploadPage.actionLabels.process}
                    </span>
                  </button>
                </div>
                <p className="text-xs leading-5 text-ink-muted">
                  Tipo seleccionado:{' '}
                  <span className="font-semibold text-ink">
                    {selectedTemplate?.value === 'students' ? 'Estudiantes' : 'Docentes'}
                  </span>
                </p>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
