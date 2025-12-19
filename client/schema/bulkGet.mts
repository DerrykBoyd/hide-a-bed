import type { SimpleViewQueryResponse, SimpleViewQueryResponseValidated } from "./query.mts";
import type { BulkGetOptions } from "../impl/bulkGet.mts";
import type z from "zod";

export type BoundBulkGet = {
  (ids: string[], options?: {
    includeDocs?: boolean,
  }): Promise<SimpleViewQueryResponse>;
  <DocSchema extends z.ZodType>(ids: string[], options?: BulkGetOptions<DocSchema>): Promise<SimpleViewQueryResponseValidated<DocSchema>>;
}