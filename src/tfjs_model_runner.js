import {CommonValidators} from "./common_validators.js";

export class TFJSModelRunner {
    constructor(config) {
        this.tfJSModelUrl = ('tfJSModelUrl' in config) ? config['tfJSModelUrl'] : null;
        this.predictUsingExecuteAsync = ('predictUsingExecuteAsync' in config) ? config['predictUsingExecuteAsync'] : false;
        this.saveAndLoadModelUsingIndexedDB = ('saveAndLoadModelUsingIndexedDB' in config) ? config['saveAndLoadModelUsingIndexedDB'] : true;
        this.loadedTFJSModel = null;
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
        return tf.tensor(flatArray, shape, "float32");
    }

    ___makeInt64Tensor(flatArray, shape) {
        let totalLength = 1;
        for (let i = 0; i < shape.length; ++i) {
            totalLength *= shape[i];
        }
        if (flatArray.length !== totalLength) {
            throw new Error("Provided flatArray length doesn't equal expected tensor length");
        }
        return tf.tensor(flatArray, shape, "int32");
    }

    __disposeTensor(inputTensor) {
        inputTensor.dispose();
    }

    async saveModelToIndexedDB(modelIndexedDbPath) {
        try {
            if (this.loadedTFJSModel === null) {
                return false;
            }
            await this.loadedTFJSModel.save(modelIndexedDbPath);
            return true;
        } catch (error) {
            console.log(`Encountered error while saving TensorFlowJS Model to IndexedDB : ${error}`);
            return false;
        }
    }

    async loadModelFromIndexedDB(modelIndexedDbPath) {
        try {
            this.loadedTFJSModel = await tf.loadGraphModel(modelIndexedDbPath);
            this.isReadyToRunInferenceTask = true;
            return true;
        } catch (error) {
            console.log(`Encountered error while loading TensorFlowJS Model from IndexedDB : ${error}`);
            this.isReadyToRunInferenceTask = false;
            return false;
        }
    }

    async loadModelFromWebUrl(modelWebUrl) {
        try {
            this.loadedTFJSModel = await tf.loadGraphModel(modelWebUrl);
            this.isReadyToRunInferenceTask = true;
            return true;
        } catch (error) {
            console.log(`Encountered error while loading TensorFlowJS Model from Web : ${error}`);
            this.isReadyToRunInferenceTask = false;
            return false;
        }
    }

    makeIndexedDbModelPathFromWebUrl(modelWebUrl) {
        return "indexeddb://" + modelWebUrl.replace("https://", "").replace("http://", "").replace("/", "_");
    }

    async load() {
        if (this.saveAndLoadModelUsingIndexedDB) {
            const modelIndexedDBUrl = this.makeIndexedDbModelPathFromWebUrl(this.tfJSModelUrl);
            console.log("Attempting to load model from IndexedDB");
            console.log(modelIndexedDBUrl);
            const didModelLoadFromIndexedDB = await this.loadModelFromIndexedDB(modelIndexedDBUrl);
            if (!didModelLoadFromIndexedDB) {
                console.log("Could not load model from IndexedDB. Trying to load from web url.")
                const didModelLoadFromWebUrl = await this.loadModelFromWebUrl(this.tfJSModelUrl);
                if (didModelLoadFromWebUrl) {
                    console.log("Model loaded from web url. Saving to IndexedDB.");
                    await this.saveModelToIndexedDB(modelIndexedDBUrl);
                }
            }
        } else {
            console.log("Attempting to load model from web url.");
            const didModelLoadFromWebUrl = await this.loadModelFromWebUrl(this.tfJSModelUrl);
            if (!didModelLoadFromWebUrl) {
                console.log("Could not load model from web url.");
            } else {
                console.log("Model loaded from web url.");
            }
        }
    }

    makeInputTensorFromFlatFloat32Array(flatArray, shape) {
        return this.___makeFloat32Tensor(flatArray, shape);
    }

    makeInputTensorFromFlatInt64Array(flatArray, shape) {
        return this.___makeInt64Tensor(flatArray, shape);
    }

    disposeInputTensor(inputTensor) {
        return this.__disposeTensor(inputTensor);
    }

    async ___predict(feedDict) {
        if (this.predictUsingExecuteAsync) {
            return await this.loadedTFJSModel.executeAsync(feedDict);
        }
        return await this.loadedTFJSModel.predict(feedDict);
    }

    async runInference(feedDict, performProfiling = false) {
        if (this.loadedTFJSModel === null) {
            return null;
        }
        this.isReadyToRunInferenceTask = false;
        try {
            if (performProfiling) {
                const currentObject = this;
                const profile = await tf.profile(async () => {
                    const prediction = await currentObject.___predict(feedDict);
                    prediction.dispose();
                });
                console.log(profile);
            }
            const predictedResult = await this.___predict(feedDict);
            this.isReadyToRunInferenceTask = true;
            return predictedResult;
        } catch (error) {
            this.isReadyToRunInferenceTask = true;
            console.log(`Encountered error while running inference on TensorFlowJS Model : ${error}`);
            return null;
        }
    }

    async dispose() {
        if (!CommonValidators.isEmpty(this.loadedTFJSModel)) {
            try {
                this.loadedTFJSModel.layers.forEach(l => l.dispose());
                this.loadedTFJSModel = null;
            } catch (error) {
                console.log(`Error encountered while unloading TensorflowJS model : ${error}`);
            }
        }
    }
}

// exports.default = TFLiteModelRunner;