export interface Policy {
  name: string;
  table_name: string;
  command: string;
  definition: string;
}

export interface Function {
  name: string;
  schema: string;
  definition: string;
  language: string;
  arguments: string;
}

export interface ExtractedData {
  policies: Policy[];
  functions: Function[];
}