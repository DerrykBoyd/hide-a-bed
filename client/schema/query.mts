import type { StandardSchemaV1 } from '../types/standard-schema.ts';
import type { ViewOptions, ViewString } from './couch/couch.input.schema.ts'
import type { ViewQueryResponse, ViewQueryResponseValidated } from './couch/couch.output.schema.ts';

export type QueryBound = {
  (view: ViewString, options?: ViewOptions): Promise<ViewQueryResponse>;
  <DocSchema extends StandardSchemaV1, KeySchema extends StandardSchemaV1, ValueSchema extends StandardSchemaV1>(
    view: ViewString,
    options: ViewOptions & {
      include_docs: false;
      validate?: {
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<ViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
  <DocSchema extends StandardSchemaV1, KeySchema extends StandardSchemaV1, ValueSchema extends StandardSchemaV1>(
    view: ViewString,
    options: ViewOptions & {
      include_docs: true;
      validate?: {
        docSchema?: DocSchema;
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<ViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
};