import fs from 'fs';
import path from 'path';
import { ResearchProject, Source, Evidence, Report } from '../types.js';

const DB_FILE = path.join(process.cwd(), 'database.json');

export interface DatabaseSchema {
  research_projects: ResearchProject[];
  sources: Source[];
  evidence: Evidence[];
  reports: Report[];
}

const defaultData: DatabaseSchema = {
  research_projects: [],
  sources: [],
  evidence: [],
  reports: [],
};

class JSONDatabase {
  data: DatabaseSchema;

  constructor() {
    this.data = defaultData;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = { ...defaultData, ...JSON.parse(fileContent) };
      }
    } catch (error) {
      console.error('Failed to load database:', error);
      this.data = defaultData;
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }
}

export const db = new JSONDatabase();
