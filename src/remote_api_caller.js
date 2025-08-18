// import {GraphUtils} from "./graph_utils.js";
import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";


async function readBlobAsync(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = () => {
            reject(new Error('Failed to read blob.'));
        };
        reader.readAsArrayBuffer(blob); // Or other read method based on need
    });
}

export class RemoteApiCaller {
    static COMPRESS_ZFP = 'zfp';
    static COMPRESS_FP32TO16 = 'float16';

    constructor(config) {
        this.endpointUrl = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(config, 'endpointUrl', null);
        this.defaultCompressionSettings = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(config, 'defaultCompressionSettings', this.___getDefaultCompressionSettings());
        this.apiKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(config, 'apiKey', 'TESTER_API_KEY');
        this.responseWaitTimeoutMilliseconds = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(config, 'responseWaitTimeoutMilliseconds', 600000);
        this.isEndpointWebSocketUrl = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(config, 'isEndpointWebSocketUrl', false);
    }

    getApiKey() {
        return this.apiKey;
    }

    setApiKey(apiKey) {
        if (CommonValidators.isNonEmptyString(apiKey)) {
            this.apiKey = apiKey;
        }
    }

    getEndpointUrl() {
        return this.endpointUrl;
    }

    setEndpointUrl(endpointUrl) {
        if (CommonValidators.isNonEmptyString(endpointUrl)) {
            this.endpointUrl = endpointUrl;
        }
    }

    getIsEndpointWebSocketUrl() {
        return this.isEndpointWebSocketUrl;
    }

    setIsEndpointWebSocketUrl(isEndpointWebSocketUrl) {
        if (CommonValidators.isBoolean(isEndpointWebSocketUrl)) {
            this.isEndpointWebSocketUrl = isEndpointWebSocketUrl;
        }
    }

    ___getDefaultCompressionSettings() {
        return {
            compressionType: RemoteApiCaller.COMPRESS_ZFP, compressionAlgorithmParameters: {
                'tolerance': -1, 'rate': -1, 'precision': 32
            }
        };
    }

    async loadInferenceResponseProtoFromArrayBuffer(arrayBufferResponse) {
        if (!CommonValidators.isEmpty(arrayBufferResponse)) {
            const inferenceResponseProto = SkymelECGraphUtils.deserializeInferenceResponseProtoDictFromBinary(new Uint8Array(arrayBufferResponse));
            if (CommonValidators.isEmpty(inferenceResponseProto)) {
                return null;
            }
            if (!CommonValidators.isNotEmptyObjectAndHasMember(inferenceResponseProto, 'status') && !CommonValidators.isEmpty(inferenceResponseProto.status)) {
                return inferenceResponseProto;
            }
            console.log(inferenceResponseProto, JSON.stringify(inferenceResponseProto, null, 2))
            if (inferenceResponseProto.status.status !== skymel.skymel.modelio.StatusReport.StatusCode.SUCCESS) {
                alert(inferenceResponseProto.status.message);
            }
            return inferenceResponseProto;
        }
        return null;
    }


    /**
     * This method connects to websocket URL, sends a message and waits until a response is received.
     * @param url The websocket URL to connect to.
     * @param messageToSend Can be string or Uint8Array. In case of Uint8Array, the backend receives the message as a
     * binary blob.
     * @param responseWaitTimeoutMilliseconds A number indicating the number of milliseconds to wait for a response
     * from the WebSocket server.
     * @returns {Promise<unknown>}
     */
    async maybeConnectToWebSocketUrlSendMessageAndAwaitResponse(url, messageToSend, responseWaitTimeoutMilliseconds = null) {
        if (CommonValidators.isEmpty(responseWaitTimeoutMilliseconds)) {
            responseWaitTimeoutMilliseconds = this.responseWaitTimeoutMilliseconds;
        }
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Timeout encountered on WebSocket receive response."));
                }, responseWaitTimeoutMilliseconds);
            });

            const webSocket = new WebSocket(url);
            await new Promise((resolve, reject) => {
                webSocket.onopen = resolve;
                webSocket.onerror = reject;
            });
            // console.log("Connected to WebSocket server");

            const receivedMessagePromise = new Promise((resolve) => {
                webSocket.onmessage = (event) => {
                    if (event.data instanceof Blob) {
                        readBlobAsync(event.data).then((data) => {
                            resolve(data);
                        });
                        return;
                    }
                    if (event.data) {
                        resolve(event.data);
                    }
                };
            });

            webSocket.send(messageToSend);
            console.log(`Sent message: ${messageToSend}`);

            const receivedMessage = await Promise.race([receivedMessagePromise, timeoutPromise]);
            // const receivedMessage = await receivedMessagePromise;
            console.log(`Received message: ${receivedMessage}`);
            webSocket.close();
            return receivedMessage;
        } catch (error) {
            console.log("Encountered error while fetching response from remote API WebSocket URL:", error);
            console.log(error.stack);
        }
        return null;
    }


    async maybeSendRequestAndFetchResponseFromEndpointUrl(url, requestProtoBinaryPayload, responseWaitTimeoutMilliseconds = null) {
        try {
            if (CommonValidators.isEmpty(responseWaitTimeoutMilliseconds)) {
                responseWaitTimeoutMilliseconds = this.responseWaitTimeoutMilliseconds;
            }
            let fetchOptions = {
                method: "POST", body: requestProtoBinaryPayload, headers: {
                    "Content-Type": "application/octet-stream",
                }, responseType: "arraybuffer", signal: AbortSignal.timeout(responseWaitTimeoutMilliseconds),
            };
            let response = await fetch(url, fetchOptions);
            if (CommonValidators.isEmpty(response)) {
                return null;
            }
            if (CommonValidators.isNotEmptyObjectAndHasMember(response, 'ok') && response.ok === true) {
                let arrayBufferResponse = await response.arrayBuffer();
                if (CommonValidators.isEmpty(arrayBufferResponse)) {
                    return null;
                }
                return arrayBufferResponse;
            }
        } catch (error) {
            console.log("Encountered error while fetching response from remote API URL:", error);
            console.log(error.stack);
        }
        return null;
    }

    async sendRequestToEndpointUrlAndFetchResponse(requestProtoBinaryPayload) {
        let result = null;
        if (this.isEndpointWebSocketUrl) {
            result = await this.maybeConnectToWebSocketUrlSendMessageAndAwaitResponse(this.endpointUrl, requestProtoBinaryPayload);
        }
        if (!this.isEndpointWebSocketUrl) {
            result = await this.maybeSendRequestAndFetchResponseFromEndpointUrl(this.endpointUrl, requestProtoBinaryPayload);
        }
        if (!CommonValidators.isEmpty(result)) {
            return result;
        }
        return null;
    }

    async callExternalApiEndpointUrl(feedDict, compressRequest = false, compressionSettings = null) {
        if (this.endpointUrl === null) {
            return null;
        }
        // await GraphUtils.createResourceInstances();
        const requestObjectDict = SkymelECGraphUtils.getSkymelInferenceRequestProtoDictFromFeedDict(feedDict, /*requestId=*/null, this.apiKey);
        const requestProtoBinaryPayload = SkymelECGraphUtils.serializeInferenceRequestProtoDictIntoBinary(requestObjectDict);
        try {
            const arrayBufferResponse = await this.sendRequestToEndpointUrlAndFetchResponse(requestProtoBinaryPayload);
            if (CommonValidators.isEmpty(arrayBufferResponse)) {
                return null;
            }
            return await this.loadInferenceResponseProtoFromArrayBuffer(arrayBufferResponse);
        } catch (error) {
            console.log("Encountered error while calling remote API:", error);
            console.log(error.stack);
        }
        return null;
    }
}