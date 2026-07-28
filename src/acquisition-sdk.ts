/*
 * Derived from the acquisition client in Microsoft CodePush 4.0.5.
 * The original project is MIT licensed.
 */

export namespace Http {
    export const enum Verb {
        GET,
        HEAD,
        POST,
        PUT,
        DELETE,
        TRACE,
        OPTIONS,
        CONNECT,
        PATCH,
    }

    export interface Response {
        statusCode: number;
        body?: string;
    }

    export interface Requester {
        request(verb: Verb, url: string, callback: Callback<Response>): void;
        request(verb: Verb, url: string, requestBody: string, callback: Callback<Response>): void;
    }
}

export interface Package {
    deploymentKey: string;
    description: string;
    label: string;
    appVersion: string;
    isMandatory: boolean;
    packageHash: string;
    packageSize: number;
}

export interface RemotePackage extends Package {
    downloadUrl: string;
}

export interface NativeUpdateNotification {
    updateAppVersion: boolean;
    appVersion: string;
}

export interface Configuration {
    appVersion: string;
    clientUniqueId: string;
    deploymentKey: string;
    serverUrl: string;
    ignoreAppVersion?: boolean;
}

export interface Callback<T> {
    (error: Error | null, parameter: T): void;
}

export class AcquisitionStatus {
    static DeploymentSucceeded = "DeploymentSucceeded";
    static DeploymentFailed = "DeploymentFailed";
}

export class AcquisitionManager {
    private readonly publicPrefixUrl = "v0.1/public/codepush/";
    private readonly httpRequester: Http.Requester;
    private readonly serverUrl: string;
    private readonly appVersion: string;
    private readonly clientUniqueId: string;
    private readonly deploymentKey: string;
    private readonly ignoreAppVersion?: boolean;

    constructor(httpRequester: Http.Requester, configuration: Configuration) {
        this.httpRequester = httpRequester;
        this.serverUrl = configuration.serverUrl.endsWith("/") ? configuration.serverUrl : `${configuration.serverUrl}/`;
        this.appVersion = configuration.appVersion;
        this.clientUniqueId = configuration.clientUniqueId;
        this.deploymentKey = configuration.deploymentKey;
        this.ignoreAppVersion = configuration.ignoreAppVersion;
    }

    queryUpdateWithCurrentPackage(currentPackage: Package, callback?: Callback<RemotePackage | NativeUpdateNotification>): void {
        if (!currentPackage || !currentPackage.appVersion) {
            throw new Error("Calling common acquisition SDK with incorrect package");
        }

        const updateRequest = {
            deployment_key: this.deploymentKey,
            app_version: currentPackage.appVersion,
            package_hash: currentPackage.packageHash,
            is_companion: this.ignoreAppVersion,
            label: currentPackage.label,
            client_unique_id: this.clientUniqueId,
        };
        const requestUrl = `${this.serverUrl}${this.publicPrefixUrl}update_check?${queryStringify(updateRequest)}`;

        this.httpRequester.request(Http.Verb.GET, requestUrl, (error, response) => {
            if (error) {
                callback?.(error, null);
                return;
            }

            if (response.statusCode !== 200) {
                const message = response.statusCode === 0
                    ? `Couldn't send request to ${requestUrl}, xhr.statusCode = 0 was returned. One of the possible reasons for that might be connection problems. Please, check your internet connection.`
                    : `${response.statusCode}: ${response.body}`;
                callback?.(new Error(message), null);
                return;
            }

            let updateInfo: any;
            try {
                updateInfo = JSON.parse(response.body).update_info;
            } catch (parseError) {
                callback?.(parseError as Error, null);
                return;
            }

            if (!updateInfo) {
                callback?.(null, null);
            } else if (updateInfo.update_app_version) {
                callback?.(null, {
                    updateAppVersion: true,
                    appVersion: updateInfo.target_binary_range,
                });
            } else if (!updateInfo.is_available) {
                callback?.(null, null);
            } else {
                callback?.(null, {
                    deploymentKey: this.deploymentKey,
                    description: updateInfo.description,
                    label: updateInfo.label,
                    appVersion: updateInfo.target_binary_range,
                    isMandatory: updateInfo.is_mandatory,
                    packageHash: updateInfo.package_hash,
                    packageSize: updateInfo.package_size,
                    downloadUrl: updateInfo.download_url,
                });
            }
        });
    }

    reportStatusDeploy(
        deployedPackage?: Package,
        status?: string,
        previousLabelOrAppVersion?: string,
        previousDeploymentKey?: string,
        callback?: Callback<void>,
    ): void {
        const url = `${this.serverUrl}${this.publicPrefixUrl}report_status/deploy`;
        const body: Record<string, any> = {
            app_version: this.appVersion,
            deployment_key: this.deploymentKey,
        };

        if (this.clientUniqueId) {
            body.client_unique_id = this.clientUniqueId;
        }

        if (deployedPackage) {
            body.label = deployedPackage.label;
            body.app_version = deployedPackage.appVersion;
            if (status !== AcquisitionStatus.DeploymentSucceeded && status !== AcquisitionStatus.DeploymentFailed) {
                callback?.(new Error(status ? `Unrecognized status "${status}".` : "Missing status argument."), null);
                return;
            }
            body.status = status;
        }

        if (previousLabelOrAppVersion) {
            body.previous_label_or_app_version = previousLabelOrAppVersion;
        }
        if (previousDeploymentKey) {
            body.previous_deployment_key = previousDeploymentKey;
        }

        this.httpRequester.request(Http.Verb.POST, url, JSON.stringify(body), (error, response) => {
            if (!callback) {
                return;
            }
            if (error) {
                callback(error, null);
            } else if (response.statusCode !== 200) {
                callback(new Error(`${response.statusCode}: ${response.body}`), null);
            } else {
                callback(null, null);
            }
        });
    }

    reportStatusDownload(downloadedPackage: Package, callback?: Callback<void>): void {
        const url = `${this.serverUrl}${this.publicPrefixUrl}report_status/download`;
        const body = {
            client_unique_id: this.clientUniqueId,
            deployment_key: this.deploymentKey,
            label: downloadedPackage.label,
        };

        this.httpRequester.request(Http.Verb.POST, url, JSON.stringify(body), (error, response) => {
            if (!callback) {
                return;
            }
            if (error) {
                callback(error, null);
            } else if (response.statusCode !== 200) {
                callback(new Error(`${response.statusCode}: ${response.body}`), null);
            } else {
                callback(null, null);
            }
        });
    }
}

function queryStringify(object: Record<string, any>): string {
    return Object.keys(object)
        .filter((property) => object[property] !== null && typeof object[property] !== "undefined")
        .map((property) => `${encodeURIComponent(property)}=${encodeURIComponent(object[property])}`)
        .join("&");
}
