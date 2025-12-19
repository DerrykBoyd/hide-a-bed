import * as z4 from "zod/v4/core"
import type { SimpleViewQueryResponse, SimpleViewQueryResponseValidated } from "./query.mts";
import type { BulkGetOptions } from "../impl/bulkGet.mts";

export type BoundBulkGet = {
  (ids: string[], options?: {
    includeDocs?: boolean,
  }): Promise<SimpleViewQueryResponse>;
  <DocSchema extends z4.$ZodType>(ids: string[], options?: BulkGetOptions<DocSchema>): Promise<SimpleViewQueryResponseValidated<DocSchema>>;
}