import type { HabllaHttpClient } from '../core/http-client';

/** Base class for every SDK resource; receives the HTTP client by injection. */
export abstract class Resource {
    constructor(protected readonly http: HabllaHttpClient) {}
}
