/** Photo catalog entry from GET /api/v0/photos. Keep in sync with server PhotoMetadata. */

export type Photo = {
  id: string
  /** ISO 8601 capture time with offset, e.g. 2012-08-27T14:40:25+02:00 */
  taken_at: string
  folder: string
}
