import {GraphUtils} from "./graph_utils.js";


export class RemoteModelRunner {
    constructor(config) {
        this.remoteModelInferenceUrl = ('remoteModelInferenceUrl' in config) ? config['remoteModelInferenceUrl'] : null;
        // this.compressData = ('compressData' in config) ? config['compressData'] : false;
        this.defaultCompressionSettings = ('defaultCompressionSettings' in config) ? config['defaultCompressionSettings'] : this.___getDefaultCompressionSettings();
        this.apiKey = ('apiKey' in config) ? config['apiKey'] : 'TESTER_API_KEY';
        this.inferenceRequestTimeoutMilliseconds = ('inferenceRequestTimeoutMilliseconds' in config) ? config['inferenceRequestTimeoutMilliseconds'] : 5000;

    }

    ___getDefaultCompressionSettings() {
        return {
            compressionType: 'zfp',
            compressionAlgorithmParameters: {
                'tolerance': -1,
                'rate': -1,
                'precision': 32
            }
        };
    }

    ___makeSkymelModelIoCompressedGraphNodeFromFloatArray(nodeName, floatArray, shape, compressionSettings) {
        if (typeof compressionSettings === "undefined" || compressionSettings === null) {
            return null;
        }

        if (compressionSettings.compressionType === 'zfp') {
            return GraphUtils.getCompressedBytesGraphOutputFromFloatingPointArray(nodeName, floatArray, shape, compressionSettings['compressionAlgorithmParameters']);
        }
        if (compressionSettings.compressionType === 'float32Tofloat16Conversion') {
            return GraphUtils.getHalfPrecisionGraphOutputFromFloatingPointArray(nodeName, floatArray, shape);
        }
    }

    ___makeSkymelModelIoGraphNodeFromFloatArray(nodeName, floatArray, shape, compressionSettings = null) {
        if (compressionSettings !== null && typeof compressionSettings == "object") {
            return this.___makeSkymelModelIoCompressedGraphNodeFromFloatArray(nodeName, floatArray, shape, compressionSettings);
        }
        return GraphUtils.getGraphOutputFromFloatingPointArray(nodeName, floatArray, shape);
    }

    ___makeSkymelModelIoGraphNodeFromInt64Array(nodeName, floatArray, shape, compressionSettings = null) {
        return GraphUtils.getGraphOutputFromIntArray(nodeName, floatArray, shape);
    }

    ___addPaddingInformationToNodeObject(nodeObject, paddedArrayShape, paddingGenerator) {
        let tempCopy = nodeObject;
        for (let k in tempCopy) {
            tempCopy[k][0].arrayPaddingParameters = {
                paddedArrayShape: paddedArrayShape,
                paddingGenerator: paddingGenerator
            };
        }

        return tempCopy;
    }

    getSkymelModelIoInferenceRequestProto(feedDict, compressionSettings = null) {
        let graphOutput = [];
        for (let keyName in feedDict) {
            if (!('type' in feedDict[keyName])) {
                continue;
            }
            let tempNode = null;

            if (feedDict[keyName]['type'] === 'float32') {
                tempNode = this.___makeSkymelModelIoGraphNodeFromFloatArray(keyName, feedDict[keyName]['data'], feedDict[keyName]['shape'], compressionSettings);
                // console.log("LZMA compressed stuff");
                // const compressibleBuffer = new Uint8Array(feedDict[keyName]['data'].buffer);
                // console.log(LZMA.compress(compressibleBuffer));
                // console.log(compressibleBuffer);
                // console.log("Converting FP32 to FP16");
                // console.log(this.__convertFloat32ToFloat16Array(feedDict[keyName]['data']));
                // console.log(feedDict[keyName]['data']);
            }
            if (feedDict[keyName]['type'] === 'int64') {
                tempNode = this.___makeSkymelModelIoGraphNodeFromInt64Array(keyName, feedDict[keyName]['data'], feedDict[keyName]['shape'], compressionSettings);
            }
            if (tempNode === null) {
                continue;
            }
            if (feedDict[keyName].hasOwnProperty('paddingGenerator') && feedDict[keyName].hasOwnProperty('paddedArrayShape')) {
                tempNode = this.___addPaddingInformationToNodeObject(tempNode, feedDict[keyName].paddedArrayShape, feedDict[keyName].paddingGenerator);
            }
            graphOutput.push(tempNode);
        }
        return skymel.skymel.modelio.InferenceRequest.create({
            apiKey: this.apiKey, graphOutput: graphOutput
        });
    }


    makeInputTensorFromFlatFloat32Array(flatArray, shape, paddedArrayShape = null, paddingGenerator = null) {
        let output = {'data': flatArray, 'shape': shape, 'type': 'float32'};
        if (paddedArrayShape !== null) {
            output['paddedArrayShape'] = paddedArrayShape;
        }
        if (paddingGenerator !== null) {
            output['paddingGenerator'] = paddingGenerator;
        }
        return output;

    }

    makeInputTensorFromFlatInt64Array(flatArray, shape, paddedArrayShape = null, paddingGenerator = null) {
        let output = {'data': flatArray, 'shape': shape, 'type': 'int64'};
        if (paddedArrayShape !== null) {
            output['paddedArrayShape'] = paddedArrayShape;
        }
        if (paddingGenerator !== null) {
            output['paddingGenerator'] = paddingGenerator;
        }
        return output;
    }

    disposeInputTensor(inputTensor) {
        return;
    }

    async runInference(feedDict, compressInferenceRequest = false, compressionSettings = null) {
        if (this.remoteModelInferenceUrl === null) {
            return null;
        }

        if (compressInferenceRequest && compressionSettings === null) {
            compressionSettings = this.defaultCompressionSettings;
        }

        try {
            console.log("Starting remote inference pipeline.");
            const inferenceRequest = this.getSkymelModelIoInferenceRequestProto(feedDict, compressionSettings);
            console.log("Inference request proto:");
            console.log(inferenceRequest);
            const encodedPayload = skymel.skymel.modelio.InferenceRequest.encode(inferenceRequest).finish();
            // console.log("Encoded payload:");
            // console.log(encodedPayload);
            // console.log("Decoded payload:");
            // const decodedPayload = skymel.skymel.modelio.InferenceRequest.decode(encodedPayload);
            // console.log(decodedPayload);
            let response = null;
            let networkLatency = null;
            const requestTimeout = this.inferenceRequestTimeoutMilliseconds;
            const fetchOptions = {
                method: "POST",
                body: encodedPayload,
                headers: {
                    "Content-Type": "application/octet-stream",
                },
                responseType: "arraybuffer",
                signal: AbortSignal.timeout(requestTimeout),
            };

            response = await fetch(this.remoteModelInferenceUrl, fetchOptions);

            if ('ok' in response && response.ok) {
                const arrayBufferResponse = await response.arrayBuffer();
                if (!common.skymelUtils.isEmpty(arrayBufferResponse)) {
                    const inferenceResponseProto = skymel.skymel.modelio.InferenceResponse.decode(new Uint8Array(arrayBufferResponse));
                    // console.log(inferenceResponseProto);
                    if (inferenceResponseProto.status.status !== skymel.skymel.modelio.StatusReport.StatusCode.SUCCESS) {
                        alert(inferenceResponseProto.status.message);
                        return null;
                    }

                    return inferenceResponseProto;
                }
            }

        } catch (error) {
            console.log(`Encountered error while running remote inference : ${error}`);
        }
        return null;
    }
}