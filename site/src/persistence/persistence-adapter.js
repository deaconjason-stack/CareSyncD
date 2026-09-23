export class PersistenceUnavailableError extends Error { constructor(message='Persistent storage is unavailable'){super(message);this.name='PersistenceUnavailableError';} }
export const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
