import { parse } from 'csv-parse/sync';

export function parseCsv<T extends Record<string, string>>(content: string): T[] {
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
    }) as T[];
}

/** For SoFIFA CSVs where some rows have unquoted commas in trailing columns. */
export function parseCsvRelaxed<T extends Record<string, string>>(content: string): T[] {
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
    }) as T[];
}
