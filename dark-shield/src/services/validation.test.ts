/**
 * Pruebas unitarias de validación de evidencias y dominios
 * Directamente alineado con:
 * HU-06, T6 — Crear pruebas de rechazo de archivos no permitidos (Ignacio José García García)
 *
 * Ejecutable vía: npx --yes tsx --test src/services/validation.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEvidenceFile,
  normalizeDomain,
  MAX_FILE_SIZE_BYTES,
} from './validation.ts';
import { calculateReportCredibility } from './credibility.ts';

test('Rechazo de archivo que excede el límite de 5MB', () => {
  const oversizedFile = {
    name: 'captura_pesada.png',
    size: MAX_FILE_SIZE_BYTES + 1024, // 5MB + 1KB
    type: 'image/png',
  };

  const result = validateEvidenceFile(oversizedFile);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /supera el tamaño máximo/i);
});

test('Rechazo de formatos ejecutables o no permitidos (.exe, .pdf, .svg)', () => {
  const executableFile = {
    name: 'malware.exe',
    size: 1024 * 50,
    type: 'application/x-msdownload',
  };

  const pdfFile = {
    name: 'documento.pdf',
    size: 1024 * 100,
    type: 'application/pdf',
  };

  const resExe = validateEvidenceFile(executableFile);
  assert.equal(resExe.valid, false);
  assert.match(resExe.error || '', /Formato no permitido/i);

  const resPdf = validateEvidenceFile(pdfFile);
  assert.equal(resPdf.valid, false);
});

test('Rechazo de archivos vacíos de 0 bytes', () => {
  const emptyFile = {
    name: 'captura_vacia.png',
    size: 0,
    type: 'image/png',
  };

  const result = validateEvidenceFile(emptyFile);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /vacío/i);
});

test('Aceptación de archivos válidos PNG, JPG y WEBP dentro del límite', () => {
  const validPng = {
    name: 'checkout_pattern.png',
    size: 1024 * 500, // 500 KB
    type: 'image/png',
  };

  const validJpg = {
    name: 'banner_urgencia.jpeg',
    size: 1024 * 800, // 800 KB
    type: 'image/jpeg',
  };

  const validWebp = {
    name: 'popup_descuento.webp',
    size: 1024 * 200, // 200 KB
    type: 'image/webp',
  };

  assert.equal(validateEvidenceFile(validPng).valid, true);
  assert.equal(validateEvidenceFile(validJpg).valid, true);
  assert.equal(validateEvidenceFile(validWebp).valid, true);
});

test('Normalización correcta de dominios web para Dark-Shield', () => {
  assert.equal(normalizeDomain('https://www.tienda-online.com/checkout').domain, 'tienda-online.com');
  assert.equal(normalizeDomain('http://vuelosbaratos.es/reservar/').domain, 'vuelosbaratos.es');
  assert.equal(normalizeDomain('subdominio.plataforma.io:8080').domain, 'subdominio.plataforma.io');
  assert.equal(normalizeDomain('invalido').valid, false);
});

test('Cálculo de credibilidad incrementa con nuevas evidencias y votos válidos (HU-06 T5)', () => {
  // Reporte sin evidencias ni votos de autor novato
  const initial = calculateReportCredibility({
    authorTrustScore: 30,
    evidences: [],
    validations: [],
  });

  // Al incorporar evidencias (tarea de Ignacio)
  const withEvidences = calculateReportCredibility({
    authorTrustScore: 30,
    evidences: [
      { id: '1', fileName: 'evidencia1.png', fileSize: 1000, mimeType: 'image/png', url: '', status: 'aprobada', hasSensitiveData: false, sanitized: true, uploadedBy: 'user1', createdAt: '' } as any,
      { id: '2', fileName: 'evidencia2.png', fileSize: 1000, mimeType: 'image/png', url: '', status: 'aprobada', hasSensitiveData: false, sanitized: true, uploadedBy: 'user1', createdAt: '' } as any,
    ],
    validations: [],
  });

  assert.ok(withEvidences > initial, 'La credibilidad debe aumentar al añadir evidencias válidas');
});
