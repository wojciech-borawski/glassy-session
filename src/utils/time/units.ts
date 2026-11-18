/** A point in time, in milliseconds since the Unix epoch. */
export type Moment = number

/** A length of time, in milliseconds. */
export type Duration = number

/** A stretch of time from one moment up to a later one. */
export type Span = Readonly<{ from: Moment, to: Moment }>
