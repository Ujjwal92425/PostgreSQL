import { schemaSql } from '@/lib/schema';

import { foundationsNotes } from './topics/foundations';
import { coreSqlNotes } from './topics/coreSql';
import { dataTypesNotes } from './topics/dataTypes';
import { joinsNotes } from './topics/joins';
import { subqueriesNotes } from './topics/subqueries';
import { functionsNotes } from './topics/functions';
import { indexingNotes } from './topics/indexing';
import { optimizationNotes } from './topics/optimization';
import { transactionsNotes } from './topics/transactions';
import { schemaDesignNotes } from './topics/schemaDesign';
import { scalingNotes } from './topics/scaling';
import { backupNotes } from './topics/backup';
import { securityNotes } from './topics/security';
import { extensionsNotes } from './topics/extensions';
import { awsRdsNotes } from './topics/awsRds';
import { monitoringNotes } from './topics/monitoring';
import { systemDesignNotes } from './topics/systemDesign';

export type NoteSection =
  | { type: 'paragraph'; title?: string; body: string[] }
  | { type: 'list'; title: string; items: string[] }
  | { type: 'code'; title: string; language: 'sql' | 'bash' | 'text'; code: string }
  | { type: 'table'; title: string; headers: string[]; rows: string[][] }
  | { type: 'callout'; title: string; body: string }
  | {
      type: 'interactive';
      title: string;
      visual:
        | 'seat-locking'
        | 'btree-index'
        | 'schema-map'
        | 'mvcc-visibility'
        | 'join-algorithms'
        | 'explain-analyze'
        | 'wal-pipeline'
        | 'vacuum-bloat';
    };

export type NotePage = {
  topicId: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  readingTime: string;
  sections: NoteSection[];
};

export const notePages: NotePage[] = [
  ...foundationsNotes,
  ...coreSqlNotes,
  ...dataTypesNotes,
  ...joinsNotes,
  ...subqueriesNotes,
  ...functionsNotes,
  ...indexingNotes,
  ...optimizationNotes,
  ...transactionsNotes,
  ...schemaDesignNotes,
  ...scalingNotes,
  ...backupNotes,
  ...securityNotes,
  ...extensionsNotes,
  ...awsRdsNotes,
  ...monitoringNotes,
  ...systemDesignNotes
];

export function getNotePage(topicId: string, slug: string) {
  return notePages.find((page) => page.topicId === topicId && page.slug === slug);
}
