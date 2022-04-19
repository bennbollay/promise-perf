import fs from 'fs';
import path from 'path';

import { IHookRecord } from './';

const getSourceFileName = (src: string): string => path.normalize(src);

export interface IAnnotateOptions {
  pathFilter: (path: string) => boolean;
}

export interface IAnnotatedHookRecord extends IHookRecord {
  filteredStack?: NodeJS.CallSite[];
}

export type IAnnotatedHookRecords = { [id: number | string]: IAnnotatedHookRecord };

export interface IAnnotation {
  duration: number;
  column: number;
  type: string;
}

export type IAnnotatedLine = { str: string; annotation: IAnnotation[] };
export type IAnnotatedFile = IAnnotatedLine[];
export type IAnnotatedFiles = Record<string, IAnnotatedFile>;

export const annotateSource = async (
  allRecords: IAnnotatedHookRecords,
  options: IAnnotateOptions
): Promise<IAnnotatedFiles> => {
  try {
    require('source-map');
  } catch (err) {
    throw new Error("Unsupported: make sure 'source-map' is included in your dependencies");
  }

  const { SourceMapConsumer } = require('source-map');

  const records = Object.values(allRecords)
    .filter((r) => r.stack && Number(r.duration) > 0)
    .sort((a, b) => Number(a.entered) - Number(b.entered));

  const mappers: Record<string, any> = {};
  const targetFiles: Record<string, IAnnotatedLine[]> = {};

  await Promise.all(
    records.map(async (r) => {
      if (!r.stack) {
        return;
      }

      const filteredStack = (r.filteredStack = r.stack.filter((frame) =>
        options.pathFilter ? options.pathFilter(frame.getFileName() || '') : true
      ));

      const top = filteredStack ? filteredStack[0] : undefined;
      if (!top) {
        return;
      }

      const path = top.getFileName();
      if (!path || mappers[path]) {
        return;
      }

      let mapFile: string;
      try {
        mapFile = fs.readFileSync(path + '.map', 'utf8');
      } catch (err) {
        // No mapfile present, just use the file as is.
        targetFiles[path] = fs
          .readFileSync(path, 'utf8')
          .split('\n')
          .map((ln) => ({ str: ln, annotation: [] }));

        // Create a mock mapper that just returns as-is.
        mappers[path] = {
          originalPositionFor: (query: { line: number; column: number }) => ({
            source: path,
            ...query,
          }),
        };
        return;
      }

      // Optimistically attempt to load a .map file
      const mapper = await new SourceMapConsumer(mapFile);
      mapper.sources.forEach((src: string) => {
        const sourceFileName = getSourceFileName(src);
        if (targetFiles[sourceFileName]) {
          return;
        }
        targetFiles[sourceFileName] = fs
          .readFileSync(sourceFileName, 'utf8')
          .split('\n')
          .map((ln) => ({ str: ln, annotation: [] }));
      });

      mappers[path] = mapper;
    })
  );

  records.forEach((record) => {
    const top = record.filteredStack ? record.filteredStack[0] : undefined;
    if (!top) {
      return;
    }

    const path = top.getFileName() as string;
    const line = top.getLineNumber();
    const column = top.getColumnNumber() as number;
    const duration = Math.floor(Number(record.duration) / 1000000);

    const mappedLocation = mappers[path].originalPositionFor({ line, column });

    const ln = targetFiles[getSourceFileName(mappedLocation.source)][mappedLocation.line - 1];
    ln.annotation.push({ duration, column, type: record.type });
  });

  return targetFiles;
};

export const fileToString = (file: IAnnotatedFile) =>
  (file || [])
    .map((ln) => {
      const str = ln.str;
      if (ln.annotation.length == 0) {
        return `${''.padStart(5)}|${str}`;
      }

      const duration = ln.annotation.reduce((prev, cur) => (prev += cur.duration), 0);
      return `${duration} `.padStart(5) + `|${str}`;
    })
    .join('\n');
