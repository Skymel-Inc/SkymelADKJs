import {SkymelECGraphNode} from "./skymel_execution_control_graph_node.js";
import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphNodeUtils} from "./skymel_ec_graph_node_utils.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";


const reformatInputsAsTensors = SkymelECGraphNodeUtils.reformatDictionaryOfFlatArrayInputsToModelRunnerCompatibleTensorsDict;
const replaceKeysAcrossDict = SkymelECGraphNodeUtils.renameKeysInDictionary;
const makeDictFromArray = SkymelECGraphNodeUtils.makeDictFromArrayOfValuesUsingArrayOfKeyNames;

const runDataProcessing = async function (graphReference, inputNodeResultsDict, nodeReference) {
    const nodeInputNames = nodeReference.getInputNames();

    let feedDict = {};
    for (let i = 0; i < nodeInputNames.length; ++i) {
        const keyName = nodeInputNames[i];
        if (!CommonValidators.isNotEmptyDictAndHasKey(inputNodeResultsDict, keyName)) {
            throw new Error("Missing inputs for model run encountered.");
        }
        feedDict[keyName] = inputNodeResultsDict[keyName];
    }

    if (CommonValidators.isEmpty(modelExecutionResult)) {
        return null;
    }
    let inferenceResult = modelRunner.convertTensorsDictToJsonDataDict(modelExecutionResult);
    if (CommonValidators.isEmpty(inferenceResult)) {
        return inferenceResult;
    }
    if (CommonValidators.isArray(inferenceResult)) {
        const orderedKeyNamesForArrayToDictConversion = nodeReference.getModelRunnerOutputArrayToDictKeyNames();
        inferenceResult = makeDictFromArray(orderedKeyNamesForArrayToDictConversion, inferenceResult);
    }

    const modelRunnerOutputToGraphNodeOutputMap = nodeReference.getModelRunnerOutputToGraphNodeOutputMap();
    if (!CommonValidators.isEmpty(modelRunnerOutputToGraphNodeOutputMap)) {
        inferenceResult = replaceKeysAcrossDict(modelRunnerOutputToGraphNodeOutputMap, inferenceResult);
    }

    return inferenceResult;
}


export class SkymelECGraphNodeForDataProcessing extends SkymelECGraphNode {
    constructor(initializationOptions) {
        super(initializationOptions);
        this.modelInputsTensorFormattingDetails = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelInputsTensorFormattingDetails') ? initializationOptions['modelInputsTensorFormattingDetails'] : null;

        this.graphNodeOutputToModelRunnerInputMap = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'graphNodeOutputToModelRunnerInputMap') ? initializationOptions['graphNodeOutputToModelRunnerInputMap'] : null;

        this.modelRunnerOutputArrayToDictKeyNames = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelRunnerOutputArrayToDictKeyNames') ? initializationOptions['modelRunnerOutputArrayToDictKeyNames'] : null;

        this.modelRunnerOutputToGraphNodeOutputMap = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelRunnerOutputToGraphNodeOutputMap') ? initializationOptions['modelRunnerOutputToGraphNodeOutputMap'] : null;
    }

    getNodeType() {
        return SkymelECGraphUtils.NODE_TYPE_DATA_PROCESSOR;
    }

    getModelInputsTensorFormattingDetails(executionConfig = null) {
        const inputFormattingDetailsFromExecutionConfig = SkymelECGraphUtils.getNodeSpecificInfoInGraphExecutionConfig(executionConfig, this.nodeId, SkymelECGraphUtils.RUNTIME_MODEL_INPUT_INFO_TENSOR_FORMATTING_DETAILS);
        if (!CommonValidators.isEmpty(inputFormattingDetailsFromExecutionConfig)) {
            return inputFormattingDetailsFromExecutionConfig;
        }
        return this.modelInputsTensorFormattingDetails;
    }

    getGraphNodeOutputToModelRunnerInputMap() {
        return this.graphNodeOutputToModelRunnerInputMap;
    }

    getModelRunnerOutputArrayToDictKeyNames() {
        return this.modelRunnerOutputArrayToDictKeyNames;
    }

    getModelRunnerOutputToGraphNodeOutputMap() {
        return this.modelRunnerOutputToGraphNodeOutputMap;
    }
}