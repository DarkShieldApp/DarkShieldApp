import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_ERROR_CODES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MAX_FILES,
  EVIDENCE_SIGNATURE_BYTES,
  type EvidenceCandidate,
  validateEvidenceBatch,
  validateEvidenceFile,
} from '../src/lib/evidences/rules';

// Las cabeceras se construyen en memoria: no se versionan binarios reales.
function withPadding(signature: number[]): Uint8Array {
  const bytes = new Uint8Array(EVIDENCE_SIGNATURE_BYTES);
  bytes.set(signature);
  return bytes;
}

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));

const png = () => withPadding([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = () => withPadding([0xff, 0xd8, 0xff, 0xe0]);
const webp = () =>
  withPadding([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBP')]);
const pdf = () => withPadding(ascii('%PDF-1.7'));

function candidate(
  overrides: Partial<EvidenceCandidate> = {},
): EvidenceCandidate {
  return {
    name: 'captura.png',
    type: 'image/png',
    size: 2048,
    head: png(),
    ...overrides,
  };
}

function expectRejected(input: EvidenceCandidate, code: string) {
  expect(validateEvidenceFile(input)).toEqual({ ok: false, code });
}

describe('contrato de reglas de evidencias', () => {
  it('expone códigos de error estables', () => {
    expect(EVIDENCE_ERROR_CODES).toEqual({
      NAME_INVALID: 'EVIDENCE_NAME_INVALID',
      EMPTY: 'EVIDENCE_EMPTY',
      TOO_LARGE: 'EVIDENCE_TOO_LARGE',
      TYPE_NOT_ALLOWED: 'EVIDENCE_TYPE_NOT_ALLOWED',
      CONTENT_MISMATCH: 'EVIDENCE_CONTENT_MISMATCH',
      TOO_MANY: 'EVIDENCE_TOO_MANY',
    });
  });

  it('propone 10 MiB por archivo, cinco archivos y 12 bytes de firma', () => {
    expect(EVIDENCE_MAX_FILE_BYTES).toBe(10_485_760);
    expect(EVIDENCE_MAX_FILES).toBe(5);
    expect(EVIDENCE_SIGNATURE_BYTES).toBe(12);
  });
});

describe('archivos de evidencia válidos', () => {
  it.each([
    ['captura.png', 'image/png', png(), 'png', 'png'],
    ['foto.jpg', 'image/jpeg', jpeg(), 'jpeg', 'jpg'],
    ['foto.jpeg', 'image/jpeg', jpeg(), 'jpeg', 'jpeg'],
    ['pantalla.webp', 'image/webp', webp(), 'webp', 'webp'],
    ['factura.pdf', 'application/pdf', pdf(), 'pdf', 'pdf'],
  ] as const)('acepta %s (%s)', (name, type, head, kind, extension) => {
    expect(validateEvidenceFile({ name, type, size: 2048, head })).toEqual({
      ok: true,
      evidence: { name, kind, mimeType: type, extension, size: 2048 },
    });
  });

  it('normaliza mayúsculas y espacios de la extensión y el MIME', () => {
    expect(
      validateEvidenceFile(
        candidate({ name: 'FOTO.PNG', type: ' IMAGE/PNG ' }),
      ),
    ).toEqual({
      ok: true,
      evidence: {
        name: 'FOTO.PNG',
        kind: 'png',
        mimeType: 'image/png',
        extension: 'png',
        size: 2048,
      },
    });
  });

  it.each(['captura 2026.11.13.png', 'informe.final.png', 'v1.2.png'])(
    'acepta puntos inocuos en el nombre: %s',
    (name) => {
      expect(validateEvidenceFile(candidate({ name })).ok).toBe(true);
    },
  );

  it('acepta una cabecera más larga que la firma', () => {
    const head = new Uint8Array(64);
    head.set(png());
    expect(validateEvidenceFile(candidate({ head })).ok).toBe(true);
  });
});

describe('límites de tamaño', () => {
  it('acepta exactamente el tamaño máximo', () => {
    expect(
      validateEvidenceFile(candidate({ size: EVIDENCE_MAX_FILE_BYTES })).ok,
    ).toBe(true);
  });

  it('rechaza el tamaño máximo más un byte', () => {
    expectRejected(
      candidate({ size: EVIDENCE_MAX_FILE_BYTES + 1 }),
      'EVIDENCE_TOO_LARGE',
    );
  });

  it('acepta un archivo de un byte', () => {
    expect(validateEvidenceFile(candidate({ size: 1 })).ok).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza como vacío un tamaño %s',
    (size) => {
      expectRejected(candidate({ size }), 'EVIDENCE_EMPTY');
    },
  );
});

describe('nombres no permitidos', () => {
  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['ruta relativa', '../captura.png'],
    ['directorio', 'dir/captura.png'],
    ['ruta de Windows', 'C:\\captura.png'],
    ['punto', '.'],
    ['doble punto', '..'],
    ['oculto', '.png'],
    ['punto final', 'captura.png.'],
    ['espacio final', 'captura.png '],
    ['carácter nulo', 'cap\u0000tura.png'],
    ['salto de línea', 'cap\ntura.png'],
    ['DEL', 'cap\u007ftura.png'],
    ['control C1', 'cap\u0085tura.png'],
    ['inversión bidireccional', 'factura\u202Egnp.exe'],
    ['aislamiento bidireccional', 'factura\u2066.png'],
    ['más de 255 caracteres', `${'a'.repeat(252)}.png`],
  ])('rechaza un nombre con %s', (_case, name) => {
    expectRejected(candidate({ name }), 'EVIDENCE_NAME_INVALID');
  });

  it('acepta un nombre de 255 caracteres', () => {
    const name = `${'a'.repeat(251)}.png`;
    expect(validateEvidenceFile(candidate({ name })).ok).toBe(true);
  });
});

describe('tipos no permitidos', () => {
  it.each([
    ['ejecutable', 'programa.exe', 'application/octet-stream'],
    ['SVG', 'dibujo.svg', 'image/svg+xml'],
    ['GIF', 'animacion.gif', 'image/gif'],
    ['sin extensión', 'captura', 'image/png'],
    ['HTML', 'pagina.html', 'text/html'],
  ])('rechaza la extensión de un %s', (_case, name, type) => {
    expectRejected(candidate({ name, type }), 'EVIDENCE_TYPE_NOT_ALLOWED');
  });

  it.each(['', '   ', 'image/svg+xml', 'application/octet-stream'])(
    'rechaza el MIME declarado "%s"',
    (type) => {
      expectRejected(candidate({ type }), 'EVIDENCE_TYPE_NOT_ALLOWED');
    },
  );

  it.each([
    ['factura.pdf.exe', 'application/pdf', pdf()],
    ['foto.exe.png', 'image/png', png()],
    ['informe.pdf.png', 'image/png', png()],
    ['script.JS.jpg', 'image/jpeg', jpeg()],
  ])('rechaza la doble extensión %s', (name, type, head) => {
    expectRejected(
      { name, type, size: 2048, head },
      'EVIDENCE_TYPE_NOT_ALLOWED',
    );
  });
});

describe('contenido que no coincide con lo declarado', () => {
  it.each([
    ['extensión PNG con MIME PDF', 'captura.png', 'application/pdf', pdf()],
    ['extensión PDF con MIME JPEG', 'factura.pdf', 'image/jpeg', jpeg()],
    ['PNG declarado con bytes PDF', 'captura.png', 'image/png', pdf()],
    ['JPEG declarado con bytes PNG', 'foto.jpg', 'image/jpeg', png()],
    [
      'RIFF que no es WebP',
      'pantalla.webp',
      'image/webp',
      withPadding([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')]),
    ],
    [
      'PDF con contenido de texto',
      'factura.pdf',
      'application/pdf',
      new TextEncoder().encode('hola, mundo!'),
    ],
    ['cabecera truncada', 'captura.png', 'image/png', png().slice(0, 4)],
    ['cabecera vacía', 'captura.png', 'image/png', new Uint8Array(0)],
  ])('rechaza %s', (_case, name, type, head) => {
    expectRejected(
      { name, type, size: 2048, head },
      'EVIDENCE_CONTENT_MISMATCH',
    );
  });
});

describe('orden de comprobación', () => {
  it('informa del nombre antes que del tamaño o el tipo', () => {
    expectRejected(
      { name: '../x.exe', type: '', size: 0, head: new Uint8Array(0) },
      'EVIDENCE_NAME_INVALID',
    );
  });

  it('informa del tamaño antes que del tipo', () => {
    expectRejected(
      candidate({ name: 'x.exe', size: EVIDENCE_MAX_FILE_BYTES + 1 }),
      'EVIDENCE_TOO_LARGE',
    );
  });

  it('informa del tipo antes que del contenido', () => {
    expectRejected(
      candidate({ name: 'x.gif', head: pdf() }),
      'EVIDENCE_TYPE_NOT_ALLOWED',
    );
  });
});

describe('envíos con varias evidencias', () => {
  it('acepta un envío vacío', () => {
    expect(validateEvidenceBatch([])).toEqual({ ok: true, evidences: [] });
  });

  it('acepta exactamente el número máximo de archivos', () => {
    const files = Array.from({ length: EVIDENCE_MAX_FILES }, (_, i) =>
      candidate({ name: `captura-${i}.png` }),
    );
    const result = validateEvidenceBatch(files);
    expect(result.ok).toBe(true);
    expect(result.ok && result.evidences.map((e) => e.name)).toEqual(
      files.map((f) => f.name),
    );
  });

  it('rechaza el máximo más un archivo sin evaluar cada uno', () => {
    const files = Array.from({ length: EVIDENCE_MAX_FILES + 1 }, () =>
      candidate({ size: 0 }),
    );
    expect(validateEvidenceBatch(files)).toEqual({
      ok: false,
      errors: [{ index: null, code: 'EVIDENCE_TOO_MANY' }],
    });
  });

  it('devuelve todos los rechazos con su índice', () => {
    expect(
      validateEvidenceBatch([
        candidate(),
        candidate({ size: 0 }),
        candidate({
          name: 'factura.pdf',
          type: 'application/pdf',
          head: pdf(),
        }),
        candidate({ name: 'programa.exe' }),
      ]),
    ).toEqual({
      ok: false,
      errors: [
        { index: 1, code: 'EVIDENCE_EMPTY' },
        { index: 3, code: 'EVIDENCE_TYPE_NOT_ALLOWED' },
      ],
    });
  });
});
