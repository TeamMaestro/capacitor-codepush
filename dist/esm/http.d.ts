import { Callback } from "./callbackUtil";
export declare const enum Verb {
    GET = 0,
    HEAD = 1,
    POST = 2,
    PUT = 3,
    DELETE = 4,
    TRACE = 5,
    OPTIONS = 6,
    CONNECT = 7,
    PATCH = 8
}
export interface Response {
    statusCode: number;
    body?: string;
}
export interface Requester {
    request(verb: Verb, url: string, callback: Callback<Response>): void;
    request(verb: Verb, url: string, requestBody: string, callback: Callback<Response>): void;
}
import { Directory } from "@capacitor/filesystem";
declare type HttpResponseType = "arraybuffer" | "blob" | "json" | "text" | "document";
export interface HttpParams {
    [key: string]: string | string[];
}
export interface HttpHeaders {
    [key: string]: string;
}
export interface HttpDownloadFileResult {
    path?: string;
    blob?: Blob;
}
export interface HttpOptions {
    url: string;
    method?: string;
    params?: HttpParams;
    data?: any;
    headers?: HttpHeaders;
    /**
     * How long to wait to read additional data. Resets each time new
     * data is received
     */
    readTimeout?: number;
    /**
     * How long to wait for the initial connection.
     */
    connectTimeout?: number;
    /**
     * Sets whether automatic HTTP redirects should be disabled
     */
    disableRedirects?: boolean;
    /**
     * Extra arguments for fetch when running on the web
     */
    webFetchExtra?: RequestInit;
    /**
     * This is used to parse the response appropriately before returning it to
     * the requestee. If the response content-type is "json", this value is ignored.
     */
    responseType?: HttpResponseType;
    /**
     * Use this option if you need to keep the URL unencoded in certain cases
     * (already encoded, azure/firebase testing, etc.). The default is _true_.
     */
    shouldEncodeUrlParams?: boolean;
}
export interface HttpDownloadFileOptions extends HttpOptions {
    /**
     * The path the downloaded file should be moved to
     */
    filePath: string;
    /**
     * Optionally, the directory to put the file in
     *
     * If this option is used, filePath can be a relative path rather than absolute
     */
    fileDirectory?: Directory;
    /**
     * Optionally, the switch that enables notifying listeners about downloaded progress
     *
     * If this option is used, progress event should be dispatched on every chunk received
     */
    progress?: Boolean;
}
export {};
