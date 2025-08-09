import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphNodeUtils} from "./skymel_ec_graph_node_utils.js";
import {RemoteModelRunner} from "./remote_model_runner.js";
import {SkymelECGraphNodeForDataProcessing} from "./skymel_ec_graph_node_for_data_processing.js";

const reformatInputsAsTensors = SkymelECGraphNodeUtils.reformatDictionaryOfFlatArrayInputsToModelRunnerCompatibleTensorsDict;
const replaceKeysAcrossDict = SkymelECGraphNodeUtils.renameKeysInDictionary;
const makeDictFromArray = SkymelECGraphNodeUtils.makeDictFromArrayOfValuesUsingArrayOfKeyNames;
const convertInferenceResponseProtoToDict = SkymelECGraphNodeUtils.convertInferenceResponseProtoToDict;

const runRemoteModel = async function (graphReference, inputNodeResultsDict, nodeReference) {
    const modelRunner = await nodeReference.getModelRunner();

    const nodeInputNames = nodeReference.getInputNames();

    // let feedDict = {};
    // for (let i = 0; i < nodeInputNames.length; ++i) {
    //     const keyName = nodeInputNames[i];
    //     if (!CommonValidators.isNotEmptyDictAndHasKey(inputNodeResultsDict, keyName)) {
    //         throw new Error("Missing inputs for model run encountered.");
    //     }
    //     feedDict[keyName] = inputNodeResultsDict[keyName];
    // }
    const keyNamesToDefaultValuesMap = nodeReference.getInputNamesToDefaultValueMap();
    let feedDict = SkymelECGraphNodeUtils.getFilteredNameToValuesDict(inputNodeResultsDict, nodeInputNames, keyNamesToDefaultValuesMap, /*errorIfKeyNameIsMissing=*/true);
    const executionConfig = graphReference.getGraphExecutionConfig();
    const modelInputsTensorFormattingDetails = nodeReference.getModelInputsTensorFormattingDetails(executionConfig);

    if (!CommonValidators.isEmpty(modelInputsTensorFormattingDetails)) {
        feedDict = reformatInputsAsTensors(modelInputsTensorFormattingDetails, feedDict, modelRunner);
    }

    const graphNodeOutputToModelRunnerInputMap = nodeReference.getGraphNodeOutputToModelRunnerInputMap();
    if (!CommonValidators.isEmpty(graphNodeOutputToModelRunnerInputMap)) {
        feedDict = replaceKeysAcrossDict(graphNodeOutputToModelRunnerInputMap, feedDict);
    }


    let inferenceResultResponseProto = await modelRunner.runInference(feedDict);
    let inferenceResult = convertInferenceResponseProtoToDict(inferenceResultResponseProto);


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

export class SkymelECGraphNodeForRemoteInference extends SkymelECGraphNodeForDataProcessing {

    static isValidInitializationOptions(initializationOptions) {
        if (CommonValidators.isEmpty(initializationOptions) || !CommonValidators.isDict(initializationOptions)) {
            return false;
        }

        if (!('modelUrl' in initializationOptions)) {
            return false;
        }
        return 'modelRunnerConfig' in initializationOptions;
    }

    constructor(initializationOptions) {
        if (!SkymelECGraphNodeForRemoteInference.isValidInitializationOptions(initializationOptions)) {
            throw new Error(
                "Invalid initialization options for SkymelECGraphNodeForRemoteInference. " +
                "Expected initializationOptions to be a dict with keys 'modelUrl' and 'modelRunnerConfig'." +
                "Got initializationOptions = " + JSON.stringify(initializationOptions)
            );
        }

        initializationOptions['nodeSubroutine'] = runRemoteModel;
        super(initializationOptions);
        this.modelRunner = SkymelECGraphNodeUtils.REMOTE_RUNNER;
        this.modelUrl = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelUrl') ? initializationOptions['modelUrl'] : null;
        this.modelRunnerConfig = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelRunnerConfig') ? initializationOptions['modelRunnerConfig'] : null;

        if (CommonValidators.isEmpty(this.modelUrl) || CommonValidators.isEmpty(this.modelRunnerConfig)) {
            throw new Error("Missing critical information regarding model inference endpoint location and config.");
        }
        this.modelRunnerObject = null;
    }

    async getModelRunner() {
        if (!CommonValidators.isEmpty(this.modelRunnerObject)) {
            return this.modelRunnerObject;
        }
        this.modelRunnerObject = new RemoteModelRunner(this.modelRunnerConfig);
        if (CommonValidators.isEmpty(this.modelRunnerObject)) {
            throw new Error("Cannot load model : " + this.modelUrl);
        }
        await this.modelRunnerObject.load();
        return this.modelRunnerObject;
    }

    async disposeModelRunner() {
        this.modelRunnerObject = null;
    }
}