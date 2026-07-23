import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { TLRecord } from '@tldraw/tlschema';
import { open as openZip, type Entry, type ZipFile as ReadZipFile } from 'yauzl';
import { ZipFile } from 'yazl';
import { readDocumentDatabase, writeDocumentDatabase } from './database';

const ARCHIVE_DATE = new Date('1980-01-01T00:00:00.000Z');

export interface TldrawArchiveMetadata {
  formatVersion: 1;
  displayName: string;
  createdWith: '@codegraphy-dev/tldraw';
  documentClock: number;
  script: {
    sha256: string;
    description: string;
  };
}

export interface TldrawArchive {
  assetFiles: Record<string, Buffer>;
  metadata: TldrawArchiveMetadata;
  records: TLRecord[];
  scriptFiles: Record<string, Buffer>;
}

export interface WriteTldrawArchiveInput {
  assetFiles?: Readonly<Record<string, Buffer>>;
  displayName: string;
  records: readonly TLRecord[];
  scriptFiles: Readonly<Record<string, Buffer | string>>;
  targetPath: string;
}

function archiveFiles(
  entries: ReadonlyMap<string, Buffer>,
  directory: 'assets' | 'script',
): Record<string, Buffer> {
  const prefix = `${directory}/`;
  return Object.fromEntries(
    [...entries.entries()]
      .filter(([entryPath]) => entryPath.startsWith(prefix) && entryPath !== prefix)
      .map(([entryPath, content]) => [entryPath.slice(prefix.length), content]),
  ) satisfies Record<string, Buffer>;
}

function isArchiveScriptMetadata(
  script: TldrawArchiveMetadata['script'] | undefined,
): script is TldrawArchiveMetadata['script'] {
  return typeof script?.sha256 === 'string' && typeof script.description === 'string';
}

function parseArchiveMetadata(bytes: Buffer, archivePath: string): TldrawArchiveMetadata {
  const metadata = JSON.parse(bytes.toString('utf8')) as Partial<TldrawArchiveMetadata>;
  if (metadata.formatVersion !== 1 || metadata.createdWith !== '@codegraphy-dev/tldraw') {
    throw new Error(`Unsupported tldraw document: ${archivePath}`);
  }
  if (typeof metadata.displayName !== 'string'
    || typeof metadata.documentClock !== 'number'
    || !isArchiveScriptMetadata(metadata.script)) {
    throw new Error(`Invalid CodeGraphy tldraw metadata: ${archivePath}`);
  }
  return metadata as TldrawArchiveMetadata;
}

function scriptDigest(files: Readonly<Record<string, Buffer>>): string {
  const digest = createHash('sha256');
  for (const filePath of Object.keys(files).sort()) {
    const contentDigest = createHash('sha256').update(files[filePath]).digest('hex');
    digest.update(`${filePath}\0${contentDigest}\n`);
  }
  return digest.digest('hex');
}

function finishZip(zip: ZipFile, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(targetPath);
    output.on('close', resolve);
    output.on('error', reject);
    zip.outputStream.on('error', reject).pipe(output);
    zip.end();
  });
}

function openArchive(archivePath: string): Promise<ReadZipFile> {
  return new Promise((resolve, reject) => {
    openZip(archivePath, { lazyEntries: true }, (error, zip) => {
      if (error) reject(error);
      else if (!zip) reject(new Error(`Unable to open tldraw archive: ${archivePath}`));
      else resolve(zip);
    });
  });
}

function readEntry(zip: ReadZipFile, entry: Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }
      if (!stream) {
        reject(new Error(`Unable to read tldraw archive entry: ${entry.fileName}`));
        return;
      }
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  });
}

async function readArchiveEntries(archivePath: string): Promise<Map<string, Buffer>> {
  const zip = await openArchive(archivePath);
  return new Promise((resolve, reject) => {
    const entries = new Map<string, Buffer>();
    zip.on('error', reject);
    zip.on('entry', (entry: Entry) => {
      if (entry.fileName.endsWith('/')) {
        zip.readEntry();
        return;
      }
      void readEntry(zip, entry)
        .then(buffer => {
          entries.set(entry.fileName, buffer);
          zip.readEntry();
        })
        .catch(reject);
    });
    zip.on('end', () => {
      zip.close();
      resolve(entries);
    });
    zip.readEntry();
  });
}

export async function writeTldrawArchive(input: WriteTldrawArchiveInput): Promise<void> {
  const workingDirectory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-write-'));
  try {
    const databasePath = path.join(workingDirectory, 'db.sqlite');
    await writeDocumentDatabase(databasePath, input.records);
    const scriptFiles = Object.fromEntries(
      Object.entries(input.scriptFiles).map(([filePath, content]) => [
        filePath,
        Buffer.isBuffer(content) ? content : Buffer.from(content),
      ]),
    ) satisfies Record<string, Buffer>;
    const metadata = {
      formatVersion: 1,
      displayName: input.displayName,
      createdWith: '@codegraphy-dev/tldraw',
      documentClock: Math.max(0, input.records.length - 1),
      script: {
        sha256: scriptDigest(scriptFiles),
        description: 'CodeGraphy force-directed workspace graph',
      },
    } satisfies TldrawArchiveMetadata;
    const zip = new ZipFile();
    zip.addFile(databasePath, 'db.sqlite', { mtime: ARCHIVE_DATE, compress: false });
    zip.addBuffer(Buffer.from(JSON.stringify(metadata)), 'metadata.json', {
      mtime: ARCHIVE_DATE,
      compress: false,
    });
    zip.addEmptyDirectory('assets/', { mtime: ARCHIVE_DATE });
    zip.addEmptyDirectory('script/', { mtime: ARCHIVE_DATE });
    for (const [filePath, content] of Object.entries(input.assetFiles ?? {})) {
      zip.addBuffer(content, `assets/${filePath}`, { mtime: ARCHIVE_DATE });
    }
    for (const [filePath, content] of Object.entries(scriptFiles)) {
      zip.addBuffer(content, `script/${filePath}`, { mtime: ARCHIVE_DATE });
    }
    await mkdir(path.dirname(input.targetPath), { recursive: true });
    const temporaryTarget = path.join(
      path.dirname(input.targetPath),
      `.${path.basename(input.targetPath)}.${randomUUID()}.tmp`,
    );
    await finishZip(zip, temporaryTarget);
    await rename(temporaryTarget, input.targetPath);
  } finally {
    await rm(workingDirectory, { force: true, recursive: true });
  }
}

export async function readTldrawArchive(archivePath: string): Promise<TldrawArchive> {
  const entries = await readArchiveEntries(archivePath);
  const databaseBytes = entries.get('db.sqlite');
  const metadataBytes = entries.get('metadata.json');
  if (!databaseBytes || !metadataBytes) {
    throw new Error(`Invalid tldraw archive: ${archivePath}`);
  }
  const workingDirectory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-read-'));
  try {
    const databasePath = path.join(workingDirectory, 'db.sqlite');
    await writeFile(databasePath, databaseBytes);
    const database = await readDocumentDatabase(databasePath);
    return {
      assetFiles: archiveFiles(entries, 'assets'),
      metadata: parseArchiveMetadata(metadataBytes, archivePath),
      records: database.records,
      scriptFiles: archiveFiles(entries, 'script'),
    };
  } finally {
    await rm(workingDirectory, { force: true, recursive: true });
  }
}
