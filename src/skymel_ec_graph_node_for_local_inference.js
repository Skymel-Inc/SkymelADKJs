import {CommonValidators} from "./common_validators.js";
import {OnnxModelRunner} from "./onnx_model_runner.js";
import {TFJSModelRunner} from "./tfjs_model_runner.js";
import {TFLiteModelRunner} from "./tf_lite_model_runner.js";
import {SkymelECGraphNodeUtils} from "./skymel_ec_graph_node_utils.js";
import {SkymelECGraphNodeForDataProcessing} from "./skymel_ec_graph_node_for_data_processing.js";

const reformatInputsAsTensors = SkymelECGraphNodeUtils.reformatDictionaryOfFlatArrayInputsToModelRunnerCompatibleTensorsDict;
const replaceKeysAcrossDict = SkymelECGraphNodeUtils.renameKeysInDictionary;
const makeDictFromArray = SkymelECGraphNodeUtils.makeDictFromArrayOfValuesUsingArrayOfKeyNames;

const runLocalModel = async function (graphReference, inputNodeResultsDict, nodeReference) {
    const modelRunner = await nodeReference.getModelRunner();

    const nodeInputNames = nodeReference.getInputNames();

    let feedDict = {};
    for (let i = 0; i < nodeInputNames.length; ++i) {
        const keyName = nodeInputNames[i];
        if (!CommonValidators.isNotEmptyDictAndHasKey(inputNodeResultsDict, keyName)) {
            throw new Error("Missing inputs for model run encountered.");
        }
        feedDict[keyName] = inputNodeResultsDict[keyName];
    }

    const executionConfig = graphReference.getGraphExecutionConfig();
    const modelInputsTensorFormattingDetails = nodeReference.getModelInputsTensorFormattingDetails(executionConfig);

    if (!CommonValidators.isEmpty(modelInputsTensorFormattingDetails)) {
        feedDict = reformatInputsAsTensors(modelInputsTensorFormattingDetails, feedDict, modelRunner);
    }

    const graphNodeOutputToModelRunnerInputMap = nodeReference.getGraphNodeOutputToModelRunnerInputMap();
    if (!CommonValidators.isEmpty(graphNodeOutputToModelRunnerInputMap)) {
        feedDict = replaceKeysAcrossDict(graphNodeOutputToModelRunnerInputMap, feedDict);
    }

    let modelExecutionResult = await modelRunner.runInference(feedDict);

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

export class SkymelECGraphNodeForLocalInference extends SkymelECGraphNodeForDataProcessing {
    static ONNX_RUNNER = SkymelECGraphNodeUtils.ONNX_RUNNER;
    static TENSORFLOWJS_RUNNER = SkymelECGraphNodeUtils.TENSORFLOWJS_RUNNER;
    static TENSORFLOWJS_WEBWORKER_RUNNER = SkymelECGraphNodeUtils.TENSORFLOWJS_WEBWORKER_RUNNER;
    static TENSORFLOWLITE_RUNNER = SkymelECGraphNodeUtils.TENSORFLOWLITE_RUNNER;

    static isValidInitializationOptions(initializationOptions) {
        if (CommonValidators.isEmpty(initializationOptions) || !CommonValidators.isDict(initializationOptions)) {
            return false;
        }
        if (!('modelRunner' in initializationOptions)) {
            return false;
        }
        if (!('modelUrl' in initializationOptions || 'modelIdInIndexedDb' in initializationOptions)) {
            return false;
        }
        if (!('modelRunnerConfig' in initializationOptions)) {
            return false;
        }
        return true;
    }

    constructor(initializationOptions) {
        if (!SkymelECGraphNodeForLocalInference.isValidInitializationOptions(initializationOptions)) {
            throw new Error(
                "Invalid initialization options for SkymelECGraphNodeForLocalInference. " +
                "Expected initializationOptions to be a dict with keys 'modelRunner', 'modelUrl', 'modelIdInIndexedDb' and 'modelRunnerConfig'." +
                "Got initializationOptions = " + JSON.stringify(initializationOptions)
            );
        }
        initializationOptions['nodeSubroutine'] = runLocalModel;
        super(initializationOptions);
        this.modelRunner = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelRunner') ? initializationOptions['modelRunner'] : SkymelECGraphNodeUtils.ONNX_RUNNER;
        this.modelUrl = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelUrl') ? initializationOptions['modelUrl'] : null;
        this.modelIdInIndexedDb = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelIdInIndexedDb') ? initializationOptions['modelIdInIndexedDb'] : null;
        this.modelRunnerConfig = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'modelRunnerConfig') ? initializationOptions['modelRunnerConfig'] : null;

        if (CommonValidators.isEmpty(this.modelUrl) && CommonValidators.isEmpty(this.modelIdInIndexedDb)) {
            throw new Error("Missing critical information regarding model binary location.");
        }
        this.modelRunnerObject = null;
    }

    isOnnxModel() {
        return this.modelRunner === SkymelECGraphNodeForLocalInference.ONNX_RUNNER;
    }

    isTensorFlowJSModel() {
        return this.modelRunner === SkymelECGraphNodeForLocalInference.TENSORFLOWJS_RUNNER;
    }

    isTensorFlowJSInWebWorkerModel() {
        return this.modelRunner === SkymelECGraphNodeForLocalInference.TENSORFLOWJS_WEBWORKER_RUNNER;
    }

    isTensorflowLiteModel() {
        return this.modelRunner === SkymelECGraphNodeForLocalInference.TENSORFLOWLITE_RUNNER;
    }

    async getModelRunner() {
        if (!CommonValidators.isEmpty(this.modelRunnerObject)) {
            return this.modelRunnerObject;
        }
        if (this.isOnnxModel()) {
            this.modelRunnerObject = new OnnxModelRunner(this.modelRunnerConfig);
        } else if (this.isTensorFlowJSModel()) {
            this.modelRunnerObject = new TFJSModelRunner(this.modelRunnerConfig);
        } else if (this.isTensorflowLiteModel()) {
            this.modelRunnerObject = new TFLiteModelRunner(this.modelRunnerConfig);
        } else if (this.isTensorFlowJSInWebWorkerModel()) {
            this.modelRunnerObject = new TFJSWebWorkerModelRunnerWorker(this.modelRunnerConfig);
        }
        if (CommonValidators.isEmpty(this.modelRunnerObject)) {
            throw new Error("Cannot load model : " + this.modelUrl);
        }
        await this.modelRunnerObject.load();
        return this.modelRunnerObject;
    }

    async disposeModelRunner() {
        this.modelRunnerObject = null;
    }

    async dispose() {
        await this.disposeModelRunner();
        return true;
    }

    getLastExecutionResult(forceMatchKeysToOutputNames = true) {
        const output = super.getLastExecutionResult(forceMatchKeysToOutputNames);
        console.log("Local inference runner stored last execution result : ", output);
        return output;
    }
}