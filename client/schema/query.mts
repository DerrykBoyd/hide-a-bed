import { ZodType } from 'zod'
import type { ViewOptions, ViewString } from './couch/couch.input.schema.ts'
import type { ViewQueryResponse, ViewQueryResponseValidated } from './couch/couch.output.schema.ts';

export type QueryBound = {
  (view: ViewString, options?: ViewOptions): Promise<ViewQueryResponse>;
  <DocSchema extends ZodType, KeySchema extends ZodType, ValueSchema extends ZodType>(
    view: ViewString,
    options: ViewOptions & {
      include_docs: false;
      validate?: {
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<ViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
  <DocSchema extends ZodType, KeySchema extends ZodType, ValueSchema extends ZodType>(
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