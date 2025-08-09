import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/+esm";
import {CommonValidators} from "./common_validators.js";

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
ort.env.wasm.simd = true;

// import * as ort from "../javascript/ort.all.min.js";
//
// ort.env.wasm.wasmPaths = "../javascript/";
// ort.env.wasm.simd = true;

export class OnnxModelRunner {
    constructor(config) {
        this.sessionConfig = ('sessionConfig' in config) ? config['sessionConfig'] : null;
        this.onnxModelUrl = ('onnxModelUrl' in config) ? config['onnxModelUrl'] : null;
        this.loadedOnnxSession = null;
        this.isReadyToRunInferenceTask = false;
    }

    isReadyToAcceptInferenceTask() {
        return this.isReadyToRunInferenceTask;
    }

    ___makeFloat32Tensor(flatArray, shape) {
        let totalLength = 1;
        for (let i = 0; i < shape.length; ++i) {
            totalLength *= shape[i];
        }
        if (flatArray.length !== totalLength) {
            throw new Error("Provided flatArray length doesn't equal expected tensor length");
        }
        return new ort.Tensor('float32', flatArray, shape);
    }

    ___makeInt64Tensor(flatArray, shape) {
        let totalLength = 1;
        for (let i = 0; i < shape.length; ++i) {
            totalLength *= shape[i];
        }
        if (flatArray.length !== totalLength) {
            throw new Error("Provided flatArray length doesn't equal expected tensor length");
        }
        return new ort.Tensor('int64', flatArray, shape);
    }

    __disposeTensor(inputTensor) {
        inputTensor.dispose();
    }

    async load() {
        try {
            this.loadedOnnxSession = (this.sessionConfig === null) ? await ort.InferenceSession.create(this.onnxModelUrl) : await ort.InferenceSession.create(this.onnxModelUrl, this.sessionConfig);
            this.isReadyToRunInferenceTask = true;
        } catch (error) {
            console.log(`Encountered error while creating Onnx session : ${error}`);
            this.isReadyToRunInferenceTask = false;
            this.loadedOnnxSession = null;
        }
    }

    makeInputTensorFromFlatFloat32Array(flatArray, shape) {
        return this.___makeFloat32Tensor(flatArray, shape);
    }

    makeInputTensorFromFlatInt64Array(flatArray, shape) {
        return this.___makeInt64Tensor(flatArray, shape);
    }

    async runInference(feedDict) {
        if (this.loadedOnnxSession === null) {
            return null;
        }
        this.isReadyToRunInferenceTask = false;
        try {
            const predictedResult = await this.loadedOnnxSession.run(feedDict);
            this.isReadyToRunInferenceTask = true;
            return predictedResult;
        } catch (error) {
            console.log(`Encountered error while running inference in Onnx session : ${error}`);
            console.log(error.stack);
            this.isReadyToRunInferenceTask = false;
            return null;
        }
    }

    async convertTensorsDictToJsonDataDict(modelRunnerExecutionResultsDict) {
        let output = {};
        if (CommonValidators.isDict(modelRunnerExecutionResultsDict)) {
            for (let x in modelRunnerExecutionResultsDict) {
                output[x] = {
                    'data': modelRunnerExecutionResultsDict[x].data,
                    'shape': modelRunnerExecutionResultsDict[x].dims,
                    'type': modelRunnerExecutionResultsDict[x].type
                }
                modelRunnerExecutionResultsDict[x].dispose();
            }
        }
        const outputPrefix = "modelOutput_";
        if (CommonValidators.isArray(modelRunnerExecutionResultsDict)) {
            for (let i = 0; i < modelRunnerExecutionResultsDict.length; ++i) {
                const keyName = outputPrefix + i;
                output[keyName] = {
                    'data': modelRunnerExecutionResultsDict[i].data,
                    'shape': modelRunnerExecutionResultsDict[i].dims,
                    'type': modelRunnerExecutionResultsDict[i].type
                }
                modelRunnerExecutionResultsDict[i].dispose();
            }
        }
        return output;
    }
}

// exports.default = OnnxModelRunner;