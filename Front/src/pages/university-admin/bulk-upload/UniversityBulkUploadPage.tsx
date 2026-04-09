import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Rocket,
  XCircle,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { universityAdminContent } from '@/content/universityAdminContent';
import type {
  BulkRowError,
  BulkStudentRow,
  BulkTeacherRow,
  UniversityBulkTemplateType,
  UniversityBulkUploadState,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

const VALID_DOCUMENT_TYPES = ['CC', 'TI', 'CE', 'PP'];

const STUDENT_COLUMNS = ['nombres', 'apellidos', 'tipo_documento', 'numero_documento', 'correo', 'celular', 'semestre'];
const TEACHER_COLUMNS = ['nombres', 'apellidos', 'tipo_documento', 'numero_documento'];

function downloadTemplate(templateType: UniversityBulkTemplateType) {
  const wb = XLSX.utils.book_new();

  if (templateType === 'students') {
    const ws = XLSX.utils.aoa_to_sheet([STUDENT_COLUMNS]);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, 'plantilla-estudiantes.xlsx');
  } else {
    const ws = XLSX.utils.aoa_to_sheet([TEACHER_COLUMNS]);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Docentes');
    XLSX.writeFile(wb, 'plantilla-docentes.xlsx');
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function col(row: (string | number)[], idx: number): string {
  return String(row[idx] ?? '').trim();
}

function validateStudentRows(rows: (string | number)[][]): { errors: string[]; parsed: BulkStudentRow[] } {
  const errors: string[] = [];
  const parsed: BulkStudentRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i] ?? [];
    const nombres = col(row, 0);
    const apellidos = col(row, 1);
    const tipo_documento = col(row, 2);
    const numero_documento = col(row, 3);
    const correo = col(row, 4);
    const celular = col(row, 5);
    const semestre = col(row, 6);
    const rowErrors: string[] = [];

    if (!nombres) rowErrors.push(`Fila ${rowNum}, columna "nombres": campo obligatorio vacío.`);
    if (!apellidos) rowErrors.push(`Fila ${rowNum}, columna "apellidos": campo obligatorio vacío.`);

    if (!tipo_documento) {
      rowErrors.push(`Fila ${rowNum}, columna "tipo_documento": campo obligatorio vacío.`);
    } else if (!VALID_DOCUMENT_TYPES.includes(tipo_documento.toUpperCase())) {
      rowErrors.push(`Fila ${rowNum}, columna "tipo_documento": valor "${tipo_documento}" no válido. Use CC, TI, CE o PP.`);
    }

    if (!numero_documento) rowErrors.push(`Fila ${rowNum}, columna "numero_documento": campo obligatorio vacío.`);

    if (!correo) {
      rowErrors.push(`Fila ${rowNum}, columna "correo": campo obligatorio vacío.`);
    } else if (!isValidEmail(correo)) {
      rowErrors.push(`Fila ${rowNum}, columna "correo": "${correo}" no es un correo válido.`);
    }

    if (!celular) rowErrors.push(`Fila ${rowNum}, columna "celular": campo obligatorio vacío.`);

    const semestreNum = Number(semestre);
    if (!semestre) {
      rowErrors.push(`Fila ${rowNum}, columna "semestre": campo obligatorio vacío.`);
    } else if (!Number.isInteger(semestreNum) || semestreNum < 1 || semestreNum > 10) {
      rowErrors.push(`Fila ${rowNum}, columna "semestre": debe ser un número entero entre 1 y 10.`);
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      parsed.push({
        apellidos,
        celular,
        correo: correo.toLowerCase(),
        nombres,
        numero_documento,
        semestre: semestreNum,
        tipo_documento: tipo_documento.toUpperCase(),
      });
    }
  }

  return { errors, parsed };
}

function validateTeacherRows(rows: (string | number)[][]): { errors: string[]; parsed: BulkTeacherRow[] } {
  const errors: string[] = [];
  const parsed: BulkTeacherRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i] ?? [];
    const nombres = col(row, 0);
    const apellidos = col(row, 1);
    const tipo_documento = col(row, 2);
    const numero_documento = col(row, 3);
    const rowErrors: string[] = [];

    if (!nombres) rowErrors.push(`Fila ${rowNum}, columna "nombres": campo obligatorio vacío.`);
    if (!apellidos) rowErrors.push(`Fila ${rowNum}, columna "apellidos": campo obligatorio vacío.`);

    if (!tipo_documento) {
      rowErrors.push(`Fila ${rowNum}, columna "tipo_documento": campo obligatorio vacío.`);
    } else if (!VALID_DOCUMENT_TYPES.includes(tipo_documento.toUpperCase())) {
      rowErrors.push(`Fila ${rowNum}, columna "tipo_documento": valor "${tipo_documento}" no válido. Use CC, TI, CE o PP.`);
    }

    if (!numero_documento) rowErrors.push(`Fila ${rowNum}, columna "numero_documento": campo obligatorio vacío.`);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      parsed.push({ apellidos, nombres, numero_documento, tipo_documento: tipo_documento.toUpperCase() });
    }
  }

  return { errors, parsed };
}

async function parseAndValidateFile(
  file: File,
  templateType: UniversityBulkTemplateType,
): Promise<{ errors: string[]; parsed: BulkStudentRow[] | BulkTeacherRow[] }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0] ?? '';
  const ws = wb.Sheets[firstSheetName];

  if (!ws) {
    return { errors: ['El archivo no contiene hojas de datos.'], parsed: [] };
  }

  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as (string | number)[][];

  if (allRows.length < 2) {
    return { errors: ['El archivo no contiene filas de datos (solo el encabezado o está vacío).'], parsed: [] };
  }

  const expectedColumns = templateType === 'students' ? STUDENT_COLUMNS : TEACHER_COLUMNS;
  const header = (allRows[0] as (string | number)[]).map((h) => String(h).trim().toLowerCase());

  for (const col of expectedColumns) {
    if (!header.includes(col)) {
      return {
        errors: [`Columna obligatoria ausente: "${col}". Verifica que estés usando la plantilla correcta.`],
        parsed: [],
      };
    }
  }

  // Reorder columns to match expected order based on header
  const colIndexes = expectedColumns.map((col) => header.indexOf(col));
  const dataRows = allRows.slice(1).filter((row) =>
    (row as (string | number)[]).some((cell) => String(cell).trim() !== ''),
  ) as (string | number)[][];

  const reorderedRows = dataRows.map((row) => colIndexes.map((idx) => row[idx ?? 0] ?? ''));

  if (templateType === 'students') {
    return validateStudentRows(reorderedRows);
  }

  return validateTeacherRows(reorderedRows);
}

function formatServerErrors(errors: BulkRowError[]): string[] {
  return errors.map((e) => `Fila ${e.row}, columna "${e.column}": ${e.message}`);
}

function getInitialUploadState(templateType: UniversityBulkTemplateType): UniversityBulkUploadState {
  return { errors: [], fileName: null, status: 'idle', templateType };
}

export function UniversityBulkUploadPage() {
  const { errorMessage, isLoading, processBulkUpload } = useUniversityAdminModuleStore();
  const [uploadState, setUploadState] = useState<UniversityBulkUploadState>(getInitialUploadState('students'));
  const [processedSummary, setProcessedSummary] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const parsedRowsRef = useRef<BulkStudentRow[] | BulkTeacherRow[]>([]);
  const fileRef = useRef<File | null>(null);

  const handleTemplateChange = (templateType: UniversityBulkTemplateType) => {
    parsedRowsRef.current = [];
    fileRef.current = null;
    setUploadState(getInitialUploadState(templateType));
    setProcessedSummary(null);
  };

  const processFile = async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setUploadState({ errors: ['Solo se aceptan archivos .xlsx o .xls.'], fileName: file.name, status: 'invalid', templateType: uploadState.templateType });
      setProcessedSummary(null);
      return;
    }

    let detected: UniversityBulkTemplateType | null = null;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0] ?? ''];
      if (ws) {
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as (string | number)[][];
        const header = (rows[0] ?? []).map((h) => String(h).trim().toLowerCase());
        const studentSpecific = ['correo', 'celular', 'semestre'];
        if (studentSpecific.every((c) => header.includes(c))) {
          detected = 'students';
        } else if (TEACHER_COLUMNS.every((c) => header.includes(c))) {
          detected = 'teachers';
        }
      }
    } catch {
      // si falla la lectura, lo detectará el paso de validación
    }

    if (!detected) {
      setUploadState({
        errors: ['No se pudo detectar el tipo de plantilla. Verifica que estés usando la plantilla correcta (estudiantes o docentes).'],
        fileName: file.name,
        status: 'invalid',
        templateType: uploadState.templateType,
      });
      setProcessedSummary(null);
      return;
    }

    fileRef.current = file;
    parsedRowsRef.current = [];
    setUploadState({ errors: [], fileName: file.name, status: 'file_selected', templateType: detected });
    setProcessedSummary(null);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  };

  const handleValidate = async () => {
    if (!fileRef.current) {
      setUploadState((s) => ({ ...s, errors: ['Selecciona un archivo antes de validar.'], status: 'invalid' }));
      return;
    }

    setIsValidating(true);

    try {
      const { errors, parsed } = await parseAndValidateFile(fileRef.current, uploadState.templateType);

      if (errors.length > 0) {
        setUploadState((s) => ({ ...s, errors, status: 'invalid' }));
        parsedRowsRef.current = [];
      } else {
        parsedRowsRef.current = parsed;
        setUploadState((s) => ({ ...s, errors: [], status: 'validated' }));
      }
    } catch {
      setUploadState((s) => ({ ...s, errors: ['No se pudo leer el archivo. Verifica que no esté dañado.'], status: 'invalid' }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleProcess = () => {
    if (uploadState.status !== 'validated' || parsedRowsRef.current.length === 0) return;

    void (async () => {
      setIsProcessing(true);
      const result = await processBulkUpload(uploadState.templateType, parsedRowsRef.current);

      if (!result) {
        setIsProcessing(false);
        return;
      }

      const serverErrors = formatServerErrors(result.errors);

      if (serverErrors.length > 0) {
        setUploadState((s) => ({ ...s, errors: serverErrors, status: 'invalid' }));
        setProcessedSummary(null);
      } else {
        setUploadState((s) => ({ ...s, status: 'processed' }));
        setProcessedSummary(
          uploadState.templateType === 'students'
            ? `Carga completada. Se registraron ${result.createdStudents} estudiantes y ${result.createdCredentials} credenciales.`
            : `Carga completada. Se registraron ${result.createdTeachers} docentes.`,
        );
      }

      setIsProcessing(false);
    })();
  };

  const resetUpload = () => {
    parsedRowsRef.current = [];
    fileRef.current = null;
    setUploadState(getInitialUploadState(uploadState.templateType));
    setProcessedSummary(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <Seo
        description={universityAdminContent.bulkUploadPage.meta.description}
        noIndex
        title={universityAdminContent.bulkUploadPage.meta.title}
      />
      <AdminPageHeader
        description=""
        headingAlign="center"
        title={universityAdminContent.bulkUploadPage.title}
        titleClassName="text-center text-[1.7rem] sm:text-[2rem]"
      />
      {errorMessage ? (
        <SurfaceCard className="border border-rose-200 bg-rose-50/90 text-sm text-rose-800 shadow-none" paddingClassName="p-4">
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard className="flex-1 w-full" panelClassName="bg-[#f4f8ff]">
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-4 xl:px-6 xl:py-5 2xl:px-7">
          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(18rem,20rem)_minmax(0,1fr)] 2xl:grid-cols-1 2xl:gap-5">

            {/* Plantilla */}
            <SurfaceCard className="h-full border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4 lg:p-4.5 xl:p-5">
              <div className="space-y-3.5 lg:space-y-3">
                <div className="space-y-1">
                  <h2 className="font-headline text-[1.1rem] font-extrabold tracking-tight text-ink">Plantilla base</h2>
                  <p className="text-[0.82rem] leading-5 text-ink-muted">
                    {universityAdminContent.bulkUploadPage.templateDescription}
                  </p>
                </div>
                <div className="grid gap-2">
                  {universityAdminContent.bulkUploadPage.templateOptions.map((option) => {
                    const isSelected = uploadState.templateType === option.value;
                    return (
                      <button
                        key={option.value}
                        className={classNames(
                          'flex w-full items-start justify-between rounded-[1.2rem] border px-3.5 py-3 text-left transition duration-300',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 bg-slate-50 text-ink hover:border-primary/40 hover:bg-white',
                        )}
                        type="button"
                        onClick={() => handleTemplateChange(option.value)}
                      >
                        <div className="space-y-1">
                          <p className="text-[0.83rem] font-semibold">
                            {option.value === 'students' ? 'Estudiantes' : 'Docentes'}
                          </p>
                          <p className="text-[0.72rem] leading-5 text-ink-muted">{option.description}</p>
                        </div>
                        {isSelected ? <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                  type="button"
                  onClick={() => downloadTemplate(uploadState.templateType)}
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  <span>{universityAdminContent.bulkUploadPage.actionLabels.downloadTemplate}</span>
                </button>
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-[0.74rem] leading-5 text-ink-muted space-y-1">
                  <p className="font-semibold text-ink">Columnas requeridas</p>
                  {uploadState.templateType === 'students' ? (
                    <p>nombres · apellidos · tipo_documento · numero_documento · correo · celular · semestre</p>
                  ) : (
                    <p>nombres · apellidos · tipo_documento · numero_documento</p>
                  )}
                  <p className="pt-1">tipo_documento: <span className="font-medium text-ink">CC, TI, CE, PP</span></p>
                </div>
              </div>
            </SurfaceCard>

            {/* Subida */}
            <SurfaceCard className="h-full border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4 lg:p-4.5 xl:p-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-headline text-[1.1rem] font-extrabold tracking-tight text-ink">
                    {universityAdminContent.bulkUploadPage.uploadCardTitle}
                  </h2>
                  <p className="text-[0.82rem] leading-5 text-ink-muted">
                    {universityAdminContent.bulkUploadPage.subtitle}
                  </p>
                </div>

                <label
                  className={classNames(
                    'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[1.4rem] border-2 border-dashed px-5 py-6 text-center transition duration-300 lg:py-5',
                    isDragging
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-slate-300 bg-slate-50 hover:border-primary/50 hover:bg-white',
                  )}
                  htmlFor="bulk-upload-input"
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[1.2rem] bg-white text-primary ring-1 ring-slate-200">
                    <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-[0.83rem] font-semibold text-ink">Arrastra un archivo o selecciona uno desde tu equipo</p>
                    <p className="text-[0.78rem] text-ink-muted">Formatos soportados: .xlsx, .xls</p>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-1.75 text-[0.8rem] font-semibold text-white">
                    {universityAdminContent.bulkUploadPage.filePickerLabel}
                  </span>
                  <input accept=".xlsx,.xls" className="sr-only" id="bulk-upload-input" type="file" onChange={(e) => { void handleFileSelection(e); }} />
                </label>

                <div className="space-y-3">
                  {uploadState.fileName ? (
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="truncate text-[0.83rem] font-semibold text-ink">{uploadState.fileName}</p>
                          <p className="text-[0.72rem] text-ink-muted">
                            {uploadState.status === 'file_selected' && universityAdminContent.bulkUploadPage.readyToValidateMessage}
                            {uploadState.status === 'validated' && universityAdminContent.bulkUploadPage.validatedMessage}
                            {uploadState.status === 'processed' && processedSummary}
                            {uploadState.status === 'invalid' && 'Revisa los errores a continuación.'}
                          </p>
                        </div>
                        <button
                          className="inline-flex items-center justify-center rounded-full bg-white p-2 text-rose-600 ring-1 ring-slate-200 transition duration-300 hover:bg-rose-50"
                          type="button"
                          onClick={resetUpload}
                        >
                          <XCircle aria-hidden="true" className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {uploadState.errors.length > 0 ? (
                    <SurfaceCard className="border border-rose-200 bg-rose-50/90 text-[0.82rem] text-rose-800 shadow-none" paddingClassName="p-3.5">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold">Se encontraron {uploadState.errors.length} error{uploadState.errors.length !== 1 ? 'es' : ''}:</p>
                          <ul className="space-y-0.5 list-none">
                            {uploadState.errors.map((error, i) => (
                              <li key={i} className="leading-5">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </SurfaceCard>
                  ) : null}

                  {uploadState.status === 'validated' && uploadState.errors.length === 0 ? (
                    <SurfaceCard className="border border-emerald-200 bg-emerald-50/90 text-[0.82rem] text-emerald-800 shadow-none" paddingClassName="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
                        <p>{universityAdminContent.bulkUploadPage.validatedMessage} ({parsedRowsRef.current.length} filas listas para procesar)</p>
                      </div>
                    </SurfaceCard>
                  ) : null}

                  {uploadState.status === 'processed' && processedSummary ? (
                    <SurfaceCard className="border border-sky-200 bg-sky-50/90 text-[0.82rem] text-sky-900 shadow-none" paddingClassName="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <Rocket aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
                        <p>{processedSummary}</p>
                      </div>
                    </SurfaceCard>
                  ) : null}

                  <div className="flex flex-wrap justify-center gap-2.5">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-[0.82rem] font-semibold text-primary transition duration-300 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!uploadState.fileName || isValidating || uploadState.status === 'processed'}
                      type="button"
                      onClick={() => { void handleValidate(); }}
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      <span>{isValidating ? 'Validando...' : universityAdminContent.bulkUploadPage.actionLabels.validate}</span>
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={uploadState.status !== 'validated' || isLoading || isProcessing}
                      type="button"
                      onClick={handleProcess}
                    >
                      <Rocket aria-hidden="true" className="h-4 w-4" />
                      <span>{isProcessing ? 'Procesando...' : universityAdminContent.bulkUploadPage.actionLabels.process}</span>
                    </button>
                  </div>

                  {uploadState.status !== 'idle' && uploadState.fileName ? (
                    <p className="text-center text-[0.72rem] leading-5 text-ink-muted">
                      Tipo detectado:{' '}
                      <span className="font-semibold text-ink">
                        {uploadState.templateType === 'students' ? 'Estudiantes' : 'Docentes'}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
