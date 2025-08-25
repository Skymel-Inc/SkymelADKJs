import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";
import * as skymel from './skymel_modelio_proto.standalone.js';

export class SkymelECGraphNodeUtils {
    constructor() {
        throw new Error("Cannot instantiate this class. It has purely static methods, " + "please call them using class-name scope,such as `SkymelECGraphNodeUtils.isMethod(param)` etc.");
    }

    /**
     * Model runner identifying strings go below:
     */
    static ONNX_RUNNER = 'onnx';
    static TENSORFLOWJS_RUNNER = 'TfJS';
    static TENSORFLOWJS_WEBWORKER_RUNNER = 'TfJSWebWorker';
    static TENSORFLOWLITE_RUNNER = 'TfLite';
    static REMOTE_RUNNER = 'remote';


    static formatFlatArrayAsModelRunnerCompatibleTensor(modelRunner, flatArray, tensorDetails) {
        if (CommonValidators.isEmpty(flatArray)) {
            flatArray = [];
        }
        if (tensorDetails['type'] === 'float32') {
            return modelRunner.makeInputTensorFromFlatFloat32Array(flatArray, tensorDetails['shape']);
        }
        if (tensorDetails['type'] === 'int64') {
            return modelRunner.makeInputTensorFromFlatInt64Array(flatArray, tensorDetails['shape']);
        }
        return flatArray;
    }

    static reformatDictionaryOfFlatArrayInputsToModelRunnerCompatibleTensorsDict(inputNamesToTensorDetails, inputsDict, modelRunner) {
        let output = {};
        for (let inputName in inputNamesToTensorDetails) {
            const tensorDetails = inputNamesToTensorDetails[inputName];
            const flatDataArray = SkymelECGraphUtils.getFlatDataArrayIfTensorDictOrValidFlatArrayInput(inputsDict[inputName]);

            output[inputName] = SkymelECGraphNodeUtils.formatFlatArrayAsModelRunnerCompatibleTensor(modelRunner, flatDataArray, tensorDetails);
        }
        return output;
    }

    static renameKeysInDictionary(sourceKeyNamesToDestinationKeyNameDict, inputDict) {
        let output = {};
        for (let x in sourceKeyNamesToDestinationKeyNameDict) {
            const replacementName = sourceKeyNamesToDestinationKeyNameDict[x];
            if (!(x in inputDict)) {
                continue;
            }
            output[replacementName] = inputDict[x];
        }
        return output;
    }

    static makeDictFromArrayOfValuesUsingArrayOfKeyNames(listOfKeyNamesInOrder, inputArray) {
        let output = {};
        for (let i = 0; i < inputArray.length; ++i) {
            output[listOfKeyNamesInOrder[i]] = inputArray[i];
        }
        return output;
    }

    static getTypeFromNodeOutputEntryName(entryName) {
        switch (entryName) {
            case "int64Outputs":
                return SkymelECGraphUtils.TENSOR_TYPE_INT64;
            case "int32Outputs":
                return SkymelECGraphUtils.TENSOR_TYPE_INT32;
            case "floatOutputs":
                return SkymelECGraphUtils.TENSOR_TYPE_FLOAT32;
            case "doubleOutputs":
                return SkymelECGraphUtils.TENSOR_TYPE_FLOAT32;
            case "booleanOutputs":
                return SkymelECGraphUtils.TENSOR_TYPE_BOOLEAN;
            case "stringOutputs":
                return SkymelECGraphUtils.TENSOR_TYPE_STRING;
            default:
                return null;
        }
    }


    static expandNodeOutputProtos(nodeOutputProtos) {
        if (CommonValidators.isEmpty(nodeOutputProtos)) {
            return null;
        }
        let output = {};
        let numericEntries = new Set(["int64Outputs", "int32Outputs", "floatOutputs", "doubleOutputs", "booleanOutputs"]);
        for (let x in nodeOutputProtos) {
            if (CommonValidators.isEmpty(nodeOutputProtos[x])) {
                continue;
            }
            const currentOutputEntries = nodeOutputProtos[x];
            for (let i = 0; i < currentOutputEntries.length; ++i) {
                const currentOutputEntry = currentOutputEntries[i];
                const nodeIdOrName = CommonValidators.isNonEmptyString(currentOutputEntry.nodeName) ? currentOutputEntry.nodeName : currentOutputEntry.nodeId;
                if (numericEntries.has(x)) {
                    output[nodeIdOrName] = {
                        type: SkymelECGraphNodeUtils.getTypeFromNodeOutputEntryName(x),
                        data: currentOutputEntry.outputFlatArray,
                        shape: currentOutputEntry.arrayShape
                    };
                } else if (x === "stringOutputs") {
                    if (currentOutputEntry.outputStrings.length === 0) {
                        output[nodeIdOrName] = "";
                    } else if (currentOutputEntry.outputStrings.length === 1) {
                        output[nodeIdOrName] = currentOutputEntry.outputStrings[0];
                    } else {
                        output[nodeIdOrName] = currentOutputEntry.outputStrings;
                    }
                }
            }
        }
        return output;
    }

    static expandGraphOutput(graphOutput) {
        if (CommonValidators.isEmpty(graphOutput)) {
            return null;
        }

        let output = {};
        for (let i = 0; i < graphOutput.length; ++i) {
            if (CommonValidators.isEmpty(graphOutput[i])) {
                continue;
            }
            const currentOutputEntry = graphOutput[i];
            const tempOutputDict = SkymelECGraphNodeUtils.expandNodeOutputProtos(graphOutput[i]);
            if (CommonValidators.isEmpty(tempOutputDict)) {
                continue;
            }
            output = Object.assign({}, output, tempOutputDict);
        }
        return output;
    }

    static convertInferenceResponseProtoToDict(inferenceResponseProto, expandGraphOutput = false) {
        if (!CommonValidators.isNotEmptyObjectAndHasMember(inferenceResponseProto, 'status')) {
            return null;
        }
        if (inferenceResponseProto.status.status !== skymel.skymel.modelio.StatusReport.StatusCode.SUCCESS) {
            return null;
        }
        let output = {};
        for (let x in inferenceResponseProto) {
            if (x === 'status') {
                continue;
            }
            if (CommonValidators.isEmpty(inferenceResponseProto[x])) {
                continue;
            }
            output[x] = inferenceResponseProto[x];
        }

        if (expandGraphOutput && CommonValidators.isNotEmptyObjectAndHasMember(output, 'graphOutput')) {
            console.log("Expanding graph output");
            const graphOutputExpanded = SkymelECGraphNodeUtils.expandGraphOutput(output['graphOutput']);
            console.log("Graph output expanded", graphOutputExpanded);
            if (!CommonValidators.isEmpty(graphOutputExpanded)) {
                delete output['graphOutput'];
                output = Object.assign({}, output, graphOutputExpanded);
            }
        }
        return output;
    }

    static getHtmlElementFromDOMById(elementId) {
        if (!CommonValidators.isEmpty(document)) {
            return document.getElementById("myElement");
        }
        return null;
    }

    static getNodeExecutionConfigFromGraphExecutionConfig(graphReference, nodeReference) {
        const nodeId = nodeReference.getNodeId();
        if (CommonValidators.isEmpty(nodeId)) {
            return null;
        }
        const graphExecutionConfig = graphReference.getGraphExecutionConfig();
        if (CommonValidators.isEmpty(graphExecutionConfig)) {
            return null;
        }
        return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(graphExecutionConfig, nodeId, null);
    }

    static __generateAppropriateResponseForMissingKeyNamesDuringKeyNameBasedValueFiltering(errorIfKeyNameMissing, keyNamesMissing) {
        if (CommonValidators.isEmpty(keyNamesMissing)) {
            return;
        }
        if (CommonValidators.isBoolean(errorIfKeyNameMissing)) {
            if (!errorIfKeyNameMissing) {
                return;
            }
            const errorString = " Encountered missing key names : " + keyNamesMissing.join(",");
            throw new Error(errorString);
        }
        if (CommonValidators.isArray(errorIfKeyNameMissing)) {
            const setOfMissingKeyNames = new Set(keyNamesMissing);
            const setOfErrorDrivingMissingKeyNames = new Set(errorIfKeyNameMissing);
            const missingKeyNamesForWhichWeWillGenerateErrorString = setOfMissingKeyNames.intersection(setOfErrorDrivingMissingKeyNames);

            if (CommonValidators.isEmpty(missingKeyNamesForWhichWeWillGenerateErrorString)) {
                return;
            }
            const errorString = " Encountered missing key names : " + [...missingKeyNamesForWhichWeWillGenerateErrorString].join(",");
            throw new Error(errorString);
        }
    }

    /**
     * Returns a dict of keyName to Values composed of keys from `keyNamesToRetain` whose values are either found in
     * keyNamesToValueMap or keyNamesToDefaultValueMap. In case a key is (or multiple keys are) missing,
     * `errorIfKeyNameMissing` governs what sort of response is generated.
     * @param keyNamesToValueMap : {{string:any}}  A dictionary of input key names (string) to values (any type).
     * @param keyNamesToRetain : {string[]}  A list of input key names (string) to retain in the output.
     * @param keyNamesToDefaultValueMap : {{string:any}} A dictionary of input key names (string) to default values (any type).
     * This is used if the key name is not found in `keyNamesToValueMap`
     * @param errorIfKeyNameMissing  {boolean|string[]} This variable can be a boolean or a list. When a boolean is passed,
     * if true an error is thrown upon encountering any missing key name. On the other hand, if a list of
     * @returns {{}|*}
     */
    static getFilteredNameToValuesDict(keyNamesToValueMap, keyNamesToRetain, keyNamesToDefaultValueMap, errorIfKeyNameMissing) {

        const isValidKeyNamesToValueMap = !CommonValidators.isEmpty(keyNamesToValueMap) && CommonValidators.isDict(keyNamesToValueMap);
        const isValidKeyNamesToDefaultValueMap = !CommonValidators.isEmpty(keyNamesToDefaultValueMap) && CommonValidators.isDict(keyNamesToDefaultValueMap);


        if (!isValidKeyNamesToDefaultValueMap && !isValidKeyNamesToValueMap) {
            SkymelECGraphNodeUtils.__generateAppropriateResponseForMissingKeyNamesDuringKeyNameBasedValueFiltering(errorIfKeyNameMissing, [...keyNamesToRetain]);
            return {};
        }

        const keyNamesToDefaultValueDict = isValidKeyNamesToDefaultValueMap ? keyNamesToDefaultValueMap : {};
        let output = {};
        let missingKeyNames = [];
        for (let index = 0; index < keyNamesToRetain.length; ++index) {
            const keyName = keyNamesToRetain[index];
            if (keyName in keyNamesToValueMap) {
                output[keyName] = keyNamesToValueMap[keyName];
                continue;
            }
            if (keyName in keyNamesToDefaultValueDict) {
                output[keyName] = keyNamesToDefaultValueDict[keyName];
                continue;
            }
            missingKeyNames.push(keyName);
        }
        if (missingKeyNames.length > 0) {
            SkymelECGraphNodeUtils.__generateAppropriateResponseForMissingKeyNamesDuringKeyNameBasedValueFiltering(errorIfKeyNameMissing, missingKeyNames);
        }
        return output;
    }
}