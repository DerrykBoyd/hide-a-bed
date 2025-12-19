import type { SimpleViewOptions } from '../schema/query.mts'

/**
 * A builder class for constructing CouchDB view query options.
 * Provides a fluent API for setting various query parameters.
 * @example
 * const queryOptions = new QueryBuilder()
 *   .limit(10)
 *   .include_docs()
 *   .startKey('someKey')
 *   .build();
 * @see SimpleViewOptions for the full list of options.
 * 
 * @remarks
 * Each method corresponds to a CouchDB view option and returns the builder instance for chaining.
 * 
 * @returns The constructed SimpleViewOptions object.
 */
export class QueryBuilder {
  #options: SimpleViewOptions = {}

  descending(descending = true): this {
    this.#options.descending = descending
    return this
  }

  endkey_docid(endkeyDocId: NonNullable<SimpleViewOptions['endkey_docid']>): this {
    this.#options.endkey_docid = endkeyDocId
    return this
  }

  /**
   * Alias for endkey_docid
   */
  end_key_doc_id(endkeyDocId: NonNullable<SimpleViewOptions['endkey_docid']>): this {
    this.#options.endkey_docid = endkeyDocId
    return this
  }

  endkey(endkey: SimpleViewOptions['endkey']): this {
    this.#options.endkey = endkey
    return this
  }

  /**
   * Alias for endkey
   */
  endKey(endkey: SimpleViewOptions['endkey']): this {
    this.#options.endkey = endkey
    return this
  }

  /**
   * Alias for endkey
   */
  end_key(endkey: SimpleViewOptions['endkey']): this {
    this.#options.endkey = endkey
    return this
  }

  group(group = true): this {
    this.#options.group = group
    return this
  }

  group_level(level: NonNullable<SimpleViewOptions['group_level']>): this {
    this.#options.group_level = level
    return this
  }

  include_docs(includeDocs = true): this {
    this.#options.include_docs = includeDocs
    return this
  }

  inclusive_end(inclusiveEnd = true): this {
    this.#options.inclusive_end = inclusiveEnd
    return this
  }

  key(key: SimpleViewOptions['key']): this {
    this.#options.key = key
    return this
  }

  keys(keys: NonNullable<SimpleViewOptions['keys']>): this {
    this.#options.keys = keys
    return this
  }

  limit(limit: NonNullable<SimpleViewOptions['limit']>): this {
    this.#options.limit = limit
    return this
  }

  reduce(reduce = true): this {
    this.#options.reduce = reduce
    return this
  }

  skip(skip: NonNullable<SimpleViewOptions['skip']>): this {
    this.#options.skip = skip
    return this
  }

  sorted(sorted = true): this {
    this.#options.sorted = sorted
    return this
  }

  stable(stable = true): this {
    this.#options.stable = stable
    return this
  }

  startkey(startkey: SimpleViewOptions['startkey']): this {
    this.#options.startkey = startkey
    return this
  }

  /**
   * Alias for startkey
   */
  startKey(startkey: SimpleViewOptions['startkey']): this {
    this.#options.startkey = startkey
    return this
  }

  /**
   * Alias for startkey
   */
  start_key(startkey: SimpleViewOptions['startkey']): this {
    this.#options.startkey = startkey
    return this
  }

  startkey_docid(startkeyDocId: NonNullable<SimpleViewOptions['startkey_docid']>): this {
    this.#options.startkey_docid = startkeyDocId
    return this
  }

  /**
   * Alias for startkey_docid
   */
  start_key_doc_id(startkeyDocId: NonNullable<SimpleViewOptions['startkey_docid']>): this {
    this.#options.startkey_docid = startkeyDocId
    return this
  }

  update(update: NonNullable<SimpleViewOptions['update']>): this {
    this.#options.update = update
    return this
  }

  update_seq(updateSeq = true): this {
    this.#options.update_seq = updateSeq
    return this
  }

  /**
   * Builds and returns the SimpleViewOptions object.
   */
  build(): SimpleViewOptions {
    return { ...this.#options }
  }
}

type AssertSimpleViewOptionsCovered = Exclude<keyof SimpleViewOptions, keyof QueryBuilder> extends never ? true : never
const _assertSimpleViewOptionsCovered: AssertSimpleViewOptionsCovered = true

export const createQuery = (): QueryBuilder => new QueryBuilder()

