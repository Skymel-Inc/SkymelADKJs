import {CommonValidators} from "./common_validators.js";
import {CommonHashUtils} from "./common_hash_utils.js";

export class SkymelECGraphUtils {

    static GRAPH_INITIALIZATION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS = 'externalInputNames';
    static GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT = 'externalInputNamesToValuesDict';
    static GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO = 'specificInfoForNodeId';

    static RUNTIME_MODEL_INPUT_INFO_BATCH_SIZE = 'inputBatchSize';
    static RUNTIME_MODEL_INPUT_INFO_LLM_INPUT_SEQUENCE_LENGTH = 'llmInputSequenceLength';
    static RUNTIME_MODEL_INPUT_INFO_TENSOR_FORMATTING_DETAILS = 'inputTensorFormattingDetails';
    static LOADED_TRANSFORMER_LLM_INFO_NUMBER_OF_HEADS = 'llmNumberOfHeads';
    static LOADED_TRANSFORMER_LLM_INFO_EMBEDDING_SIZE_PER_HEAD = 'llmEmbeddingSizePerHead';

    static TENSOR_TYPE_FLOAT32 = 'float32';
    static TENSOR_TYPE_INT64 = 'int64';
    static TENSOR_TYPE_INT32 = 'int32';
    static TENSOR_TYPE_STRING = 'string';
    static TENSOR_TYPE_BOOLEAN = 'boolean';

    static GRAPH_TYPE_BASE = 'graphTypeBase';
    static GRAPH_TYPE_SPLIT_INFERENCE_RUNNER = 'graphTypeSplitInferenceRunner';
    static GRAPH_TYPE_AUTOREGRESSIVE_INFERENCE_RUNNER = 'graphTypeAutoregressiveInferenceRunner';

    static NODE_TYPE_BASE = 'nodeTypeBase';
    static NODE_TYPE_LOCAL_INFERENCE_RUNNER = 'nodeTypeLocalInferenceRunner';
    static NODE_TYPE_REMOTE_INFERENCE_RUNNER = 'nodeTypeRemoteInferenceRunner';
    static NODE_TYPE_TRANSFORMERJS_PROCESSOR = 'nodeTypeTransformerJsProcessor';
    static NODE_TYPE_LLM_INPUT_PREPARER = 'nodeTypeLlmInputPreparer';
    static NODE_TYPE_LLM_OUTPUT_LOGITS_TO_TOKEN_ID_GREEDY_SEARCHER = 'nodeTypeLlmOutputLogitsToTokenIdGreedySearcher';
    static NODE_TYPE_DATA_PROCESSOR = 'nodeTypeDataProcessor';
    static NODE_TYPE_EXTERNAL_API_CALLER = 'nodeTypeExternalApiCaller';


    constructor() {
        throw new Error("Cannot instantiate this class. It has purely static methods, " + "please call them using class-name scope,such as `SkymelECGraphUtils.isMethod(param)` etc.");
    }


    static updateFieldValue(updateType, sourceValue, destinationValue) {
        const parts = updateType.split(" ");
        let updateValue = null;
        let updateAction = null;
        if (parts.length === 2) {
            updateValue = parts[1];
            updateAction = parts[0];
        } else {
            updateAction = parts[0];
        }
        let newDestinationValue = sourceValue;
        if (updateValue !== null) {
            switch (updateValue) {
                case 'count':
                case 'length':
                    newDestinationValue = sourceValue.length;
                    break;

                case 'lastElement':
                    newDestinationValue = sourceValue[sourceValue.length - 1];
                    break;

                default:
                    newDestinationValue = sourceValue;
                    break;
            }
        }

        if (updateAction !== null) {
            switch (updateAction) {
                case 'append':
                    destinationValue.push(newDestinationValue);
                    break;

                case 'replace':
                    destinationValue = newDestinationValue;

            }
        }

        return destinationValue;
    }

    /**
     * Adds the desired information to `graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO][nodeId]`.
     * If `nodeId` is not a valid string then it returns `graphExecutionConfig` unchanged.
     * @param graphExecutionConfig :dict Ideally a dictionary, can also be null.
     * @param nodeId :string A valid nodeId string
     * @param infoTypeIdString :string One of the information id strings specified as static constants of this class.
     * @param value :any Can be any value.
     * @returns {{}|*} Returns the modified `graphExecutionConfig` dict. In case `graphExecutionConfig` is null, an
     * empty dictionary is initialized before filling the required key-values.
     */
    static setNodeSpecificInfoInGraphExecutionConfig(graphExecutionConfig, nodeId, infoTypeIdString, value) {
        if (!CommonValidators.isNonEmptyString(nodeId)) {
            return graphExecutionConfig;
        }
        if (CommonValidators.isEmpty(graphExecutionConfig)) {
            graphExecutionConfig = {};
        }
        if (!CommonValidators.isNotEmptyDictAndHasKey(graphExecutionConfig, SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO)) {
            graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO] = {};
        }
        if (!CommonValidators.isNotEmptyDictAndHasKey(graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO], nodeId)) {
            graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO][nodeId] = {};
        }
        graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO][nodeId][infoTypeIdString] = value;
        return graphExecutionConfig;
    }

    static getNodeSpecificInfoInGraphExecutionConfig(graphExecutionConfig, nodeId, desiredInfoIdString) {
        if (CommonValidators.isEmpty(graphExecutionConfig) || !CommonValidators.isNonEmptyString(nodeId) || !CommonValidators.isNonEmptyString(desiredInfoIdString)) {
            return null;
        }
        if (!CommonValidators.isNotEmptyDictAndHasKey(graphExecutionConfig, SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO)) {
            return null;
        }
        const informationalEntries = graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_NODE_SPECIFIC_INFO];
        if (!CommonValidators.isNotEmptyDictAndHasKey(informationalEntries, nodeId)) {
            return null;
        }
        return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(informationalEntries[nodeId], desiredInfoIdString, null);
    }

    static getTensorDescription(type, shape) {
        return {type: type, shape: shape};
    }

    static addExternalInputNamesToGraphInitializationConfig(externalInputNames, graphInitializationConfig, replaceExistingEntry = true) {
        if (CommonValidators.isEmpty(externalInputNames) || !CommonValidators.isArray(externalInputNames)) {
            return graphInitializationConfig;
        }
        if (CommonValidators.isEmpty(graphInitializationConfig)) {
            graphInitializationConfig = {};
        }
        if (!CommonValidators.isNotEmptyDictAndHasKey(graphInitializationConfig, SkymelECGraphUtils.GRAPH_INITIALIZATION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS)) {
            graphInitializationConfig[SkymelECGraphUtils.GRAPH_INITIALIZATION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS] = [];
        }
        if (replaceExistingEntry) {
            graphInitializationConfig[SkymelECGraphUtils.GRAPH_INITIALIZATION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS] = externalInputNames;
        } else {
            graphInitializationConfig[SkymelECGraphUtils.GRAPH_INITIALIZATION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS].push(...externalInputNames);
        }
        return graphInitializationConfig;
    }

    static getExternalInputNamesFromGraphInitializationConfig(graphInitializationConfig) {
        return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(graphInitializationConfig, SkymelECGraphUtils.GRAPH_INITIALIZATION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS, null);
    }

    static addExternalInputNamesToValuesDictToGraphExecutionConfig(externalInputNamesToValuesDict, graphExecutionConfig, replaceExistingEntry = true) {
        if (CommonValidators.isEmpty(externalInputNamesToValuesDict) || !CommonValidators.isDict(externalInputNamesToValuesDict)) {
            return graphExecutionConfig;
        }
        if (CommonValidators.isEmpty(graphExecutionConfig)) {
            graphExecutionConfig = {};
        }
        if (!CommonValidators.isNotEmptyDictAndHasKey(graphExecutionConfig, SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT)) {
            graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT] = {};
        }
        if (replaceExistingEntry) {
            graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT] = externalInputNamesToValuesDict;
        } else {
            graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT] = Object.assign(graphExecutionConfig[SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT], externalInputNamesToValuesDict);
        }
        return graphExecutionConfig;
    }

    static getExternalInputNamesToValuesDictFromGraphExecutionConfig(graphExecutionConfig) {
        return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(graphExecutionConfig, SkymelECGraphUtils.GRAPH_EXECUTION_CONFIG_KEYNAME_FOR_EXTERNAL_INPUTS_TO_VALUES_DICT, null);
    }

    static isTensorDict(inputObject) {
        return CommonValidators.isNotEmptyDictAndHasKey(inputObject, 'data') && CommonValidators.isNotEmptyDictAndHasKey(inputObject, 'type') && CommonValidators.isNotEmptyDictAndHasKey(inputObject, 'shape');
    }

    static parseGraphComponentName(memberName, isOutputName = true, isNodeId = false) {
        if (!CommonValidators.isNonEmptyString(memberName)) {
            return null;
        }
        const regexPattern = /(([a-zA-Z0-9_]+)\.)?(([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)/;
        const validatedMemberNameParts = memberName.match(regexPattern);
        // console.log(validatedMemberNameParts);
        if (CommonValidators.isEmpty(validatedMemberNameParts)) {
            return null;
        }
        const validMemberName = validatedMemberNameParts[0];
        const validMemberNameParts = validMemberName.split(".");

        if (isOutputName) {
            switch (validMemberNameParts.length) {
                case 3:
                    return {
                        graphId: validMemberNameParts[0],
                        nodeId: validMemberNameParts[1],
                        outputName: validMemberNameParts[2]
                    };
                case 2:
                    return {
                        graphId: null, nodeId: validMemberNameParts[0], outputName: validMemberNameParts[1]
                    };
                case 1:
                    return {
                        graphId: null, nodeId: null, outputName: validMemberNameParts[0]
                    };
                default:
                    return null;
            }
        }
        if (isNodeId) {
            switch (validMemberNameParts.length) {
                case 2:
                    return {
                        graphId: validMemberNameParts[0], nodeId: validMemberNameParts[1], outputName: null
                    };
                case 1:
                    return {
                        graphId: null, nodeId: validMemberNameParts[0], outputName: null
                    };
                default:
                    return null;
            }
        }
        return null;
    }

    static reconstructGraphComponentNameFromParsedParts(parsedParts) {
        if (CommonValidators.isEmpty(parsedParts) || !CommonValidators.isDict(parsedParts)) {
            return null;
        }

        // console.log(parsedParts);
        let output = [];

        const graphId = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(parsedParts, 'graphId', null);
        if (CommonValidators.isNonEmptyString(graphId)) {
            output.push(graphId);
        }

        const nodeId = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(parsedParts, 'nodeId', null);
        if (CommonValidators.isNonEmptyString(nodeId)) {
            output.push(nodeId);
        }

        const outputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(parsedParts, 'outputName', null);
        if (CommonValidators.isNonEmptyString(outputName)) {
            output.push(outputName);
        }

        return output.join(".");
    }

    static getElementLengthFromArrayOrTensorDict(inputValue) {
        if (SkymelECGraphUtils.isTensorDict(inputValue)) {
            const elementsArray = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(inputValue, 'data', []);
            if (CommonValidators.isArray(elementsArray)) {
                return elementsArray.length;
            }
            return null;
        }
        if (CommonValidators.isArray(inputValue)) {
            return inputValue.length;
        }
        return null;
    }

    static getElementDtypeFromArrayOrTensorDict(inputValue) {
        if (SkymelECGraphUtils.isTensorDict(inputValue)) {
            return inputValue.type;
        }
        if (CommonValidators.isTypedArray(inputValue)) {
            if (inputValue instanceof Float32Array) {
                return SkymelECGraphUtils.TENSOR_TYPE_FLOAT32;
            }
            if (inputValue instanceof Int32Array) {
                return SkymelECGraphUtils.TENSOR_TYPE_INT32;
            }
            if (inputValue instanceof BigInt64Array) {
                return SkymelECGraphUtils.TENSOR_TYPE_INT64;
            }
            return null;
        }
        if (CommonValidators.isJavascriptArray(inputValue)) {
            return SkymelECGraphUtils.TENSOR_TYPE_FLOAT32;
        }
        return null;
    }


    static __insertTensorDictIntoInferenceRequestProtoDict(tensorDict, tensorName, inferenceRequestProtoDict) {
        const tensorType = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(tensorDict, 'type', null);
        if (CommonValidators.isEmpty(tensorType)) {
            return inferenceRequestProtoDict;
        }
        let graphOutput = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(inferenceRequestProtoDict, 'graphOutput', []);
        switch (tensorType) {
            case SkymelECGraphUtils.TENSOR_TYPE_FLOAT32:
                graphOutput.push({
                    floatOutputs: [{
                        nodeName: tensorName,
                        outputFlatArray: tensorDict['data'],
                        arrayShape: tensorDict['shape']
                    }]
                });
                break;
            case SkymelECGraphUtils.TENSOR_TYPE_INT64:
                graphOutput.push({
                    int64Outputs: [{
                        nodeName: tensorName,
                        outputFlatArray: tensorDict['data'],
                        arrayShape: tensorDict['shape']
                    }]
                });
                break;
            case SkymelECGraphUtils.TENSOR_TYPE_INT32:
                graphOutput.push({
                    int32Outputs: [{
                        nodeName: tensorName,
                        outputFlatArray: tensorDict['data'],
                        arrayShape: tensorDict['shape']
                    }]
                });
                break;

            case SkymelECGraphUtils.TENSOR_TYPE_BOOLEAN:
                graphOutput.push({
                    booleanOutputs: [{
                        nodeName: tensorName,
                        outputFlatArray: tensorDict['data'],
                        arrayShape: tensorDict['shape']
                    }]
                });
                break;

            case SkymelECGraphUtils.TENSOR_TYPE_STRING:
                graphOutput.push({
                    stringOutputs: [{
                        nodeName: tensorName,
                        outputStrings: tensorDict['data'],
                    }]
                });
                break;
            default:
                break;
        }
        inferenceRequestProtoDict['graphOutput'] = graphOutput;
        return inferenceRequestProtoDict;
    }

    static getSkymelInferenceRequestProtoDictFromFeedDict(feedDict, requestId = null, apiKey = null) {
        if (CommonValidators.isEmpty(feedDict) || !CommonValidators.isDict(feedDict)) {
            return null;
        }
        const requestIdToSend = CommonValidators.isNonEmptyString(requestId) ? requestId : CommonHashUtils.generateUniqueId();
        const apiKeyToSend = CommonValidators.isNonEmptyString(apiKey) ? apiKey : "";
        let inferenceRequestProtoDict = {requestId: requestIdToSend, apiKey: apiKeyToSend};
        for (let key in feedDict) {
            const currentEntry = feedDict[key];
            if (SkymelECGraphUtils.isTensorDict(currentEntry)) {
                inferenceRequestProtoDict = SkymelECGraphUtils.__insertTensorDictIntoInferenceRequestProtoDict(currentEntry, key, inferenceRequestProtoDict);
                continue;
            }
            if (CommonValidators.isNonEmptyString(currentEntry)) {
                const tempStringTensorDict = SkymelECGraphUtils.makeStringTensorDict(currentEntry);
                inferenceRequestProtoDict = SkymelECGraphUtils.__insertTensorDictIntoInferenceRequestProtoDict(tempStringTensorDict, key, inferenceRequestProtoDict);
                continue;
            }
            if (CommonValidators.isArray(currentEntry) && currentEntry.length === 1 && CommonValidators.isNonEmptyString(currentEntry[0])) {
                const tempStringTensorDict = SkymelECGraphUtils.makeStringTensorDict(currentEntry[0]);
                inferenceRequestProtoDict = SkymelECGraphUtils.__insertTensorDictIntoInferenceRequestProtoDict(tempStringTensorDict, key, inferenceRequestProtoDict);
                continue;
            }
            if (CommonValidators.isNumber(currentEntry)) {
                const tempFloat32TensorDict = SkymelECGraphUtils.makeFloat32TensorDict(new Float32Array([currentEntry]), [1]);
                inferenceRequestProtoDict = SkymelECGraphUtils.__insertTensorDictIntoInferenceRequestProtoDict(tempFloat32TensorDict, key, inferenceRequestProtoDict);
                continue;
            }
            if (CommonValidators.isBoolean(currentEntry)) {
                const tempBooleanTensorDict = SkymelECGraphUtils.makeBooleanTensorDict([currentEntry ? 1 : 0], [1]);
                inferenceRequestProtoDict = SkymelECGraphUtils.__insertTensorDictIntoInferenceRequestProtoDict(tempBooleanTensorDict, key, inferenceRequestProtoDict);
                continue;
            }
            if (CommonValidators.isArray(currentEntry) && currentEntry.length === 1 && CommonValidators.isImageType(currentEntry[0])) {
                const imageObject = currentEntry[0];
                let imageValue = imageObject.imageBase64 || imageObject.imageUrl || imageObject.imageBytes;
                const tempStringTensorDict = SkymelECGraphUtils.makeStringTensorDict(imageValue);
                inferenceRequestProtoDict = SkymelECGraphUtils.__insertTensorDictIntoInferenceRequestProtoDict(tempStringTensorDict, key, inferenceRequestProtoDict);
                continue;
            }
        }
        console.log("Inference request proto dict : ", inferenceRequestProtoDict);
        return inferenceRequestProtoDict;
    }

    static serializeInferenceRequestProtoDictIntoBinary(inputInferenceRequestProtoDict) {
        try {
            // const encodedPayload = skymelIo.skymel.modelio.InferenceRequest.encode(inputInferenceRequestProtoDict).finish();
            const encodedPayload = skymel.skymel.modelio.InferenceRequest.encode(inputInferenceRequestProtoDict).finish();
            if (CommonValidators.isEmpty(encodedPayload)) {
                return null;
            }
            return encodedPayload;
        } catch (e) {
            console.log(e);
            console.log(e.stack);
            return null;
        }
    }

    static deserializeInferenceRequestProtoDictFromBinary(inputEncodedPayload) {
        try {
            // const decodedPayload = skymelIo.skymel.modelio.InferenceRequest.decode(inputEncodedPayload);
            const decodedPayload = skymel.skymel.modelio.InferenceRequest.decode(inputEncodedPayload);
            if (CommonValidators.isEmpty(decodedPayload)) {
                return null;
            }
            return decodedPayload;
        } catch (e) {
            console.log(e);
            console.log(e.stack);
            return null;
        }
    }

    static deserializeInferenceResponseProtoDictFromBinary(inputEncodedPayload) {
        try {
            // const decodedPayload = skymelIo.skymel.modelio.InferenceResponse.decode(inputEncodedPayload);
            const decodedPayload = skymel.skymel.modelio.InferenceResponse.decode(inputEncodedPayload);
            if (CommonValidators.isEmpty(decodedPayload)) {
                return null;
            }
            return decodedPayload;
        } catch (e) {
            console.log(e);
            console.log(e.stack);
            return null;
        }
    }

    static makeStringTensorDict(inputString) {
        return {
            type: SkymelECGraphUtils.TENSOR_TYPE_STRING,
            shape: [],
            data: [inputString]
        };
    }

    static makeInt32TensorDict(inputInt32Array, shape) {
        return {
            type: SkymelECGraphUtils.TENSOR_TYPE_INT32,
            shape: shape,
            data: inputInt32Array
        };
    }

    static makeInt64TensorDict(inputInt64Array, shape) {
        return {
            type: SkymelECGraphUtils.TENSOR_TYPE_INT64,
            shape: shape,
            data: inputInt64Array
        };
    }

    static makeFloat32TensorDict(inputFloat32Array, shape) {
        return {
            type: SkymelECGraphUtils.TENSOR_TYPE_FLOAT32,
            shape: shape,
            data: inputFloat32Array
        };
    }

    static makeBooleanTensorDict(inputBooleanArray, shape) {
        return {
            type: SkymelECGraphUtils.TENSOR_TYPE_BOOLEAN,
            shape: shape,
            data: inputBooleanArray
        };
    }

    static extractTensorDescriptionFromTensorDict(inputValue) {
        if (!SkymelECGraphUtils.isTensorDict(inputValue)) {
            return null;
        }
        const type = inputValue.type;
        const shape = inputValue.shape;
        return SkymelECGraphUtils.getTensorDescription(type, shape);
    }

    static getFlatDataArrayIfTensorDictOrValidFlatArrayInput(flatArrayOrTensorDict) {
        if (SkymelECGraphUtils.isTensorDict(flatArrayOrTensorDict)) {
            return flatArrayOrTensorDict.data;
        }
        if (CommonValidators.isArray(flatArrayOrTensorDict)) {
            return flatArrayOrTensorDict;
        }
        return null;
    }

    static async getFileDataAndDetailsDictFromHtmlFileInputElement(inputFileElement) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (event) {
                const fileData = {
                    name: inputFileElement.name,
                    type: inputFileElement.type,
                    size: inputFileElement.size,
                    lastModified: inputFileElement.lastModified,
                    content: event.target.result // Base64 data for binary files
                };
                resolve(fileData);
            };

            reader.onerror = function (e) {
                reject(new Error('Error reading file: ' + inputFileElement.name));
            };

            // Read file as data URL (base64) which works for all file types
            reader.readAsDataURL(inputFileElement);
        });
    }
}
