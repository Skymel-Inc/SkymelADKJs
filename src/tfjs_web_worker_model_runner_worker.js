import {CommonValidators} from "./common_validators.js";
import * as tf from "./tfjs+esm.js";
// const tf = require ("./tfjs.js");
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs");
// importScripts("./tfjs.js", "./common_validators.js");

class TFJSWebWorkerModelRunnerWorker {
    constructor(workerIndex, config) {
        this.tfJSModelUrl = ('tfJSModelUrl' in config) ? config['tfJSModelUrl'] : null;
        this.predictUsingExecuteAsync = ('predictUsingExecuteAsync' in config) ? config['predictUsingExecuteAsync'] : false;
        this.saveAndLoadModelUsingIndexedDB = ('saveAndLoadModelUsingIndexedDB' in config) ? config['saveAndLoadModelUsingIndexedDB'] : true;
        this.loadedTFJSModel = null;
        this.workerIndex = CommonValidators.isNumber(workerIndex) ? workerIndex : -1;
        console.log(tf);
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
            return true;
        } catch (error) {
            console.log(`Encountered error while loading TensorFlowJS Model from IndexedDB : ${error}`);
            console.log(error.stack);
            return false;
        }
    }

    async loadModelFromWebUrl(modelWebUrl) {
        try {
            this.loadedTFJSModel = await tf.loadGraphModel(modelWebUrl);
            return true;
        } catch (error) {
            console.log(`Encountered error while loading TensorFlowJS Model from Web: ${error}`);
            console.log(error.stack);
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

    convertInputToTensor(input) {
        return tf.tensor(input.data, input.shape, input.dtype);
    }


    convertDictionaryToTensorDict(dict) {
        let output = {};
        for (let name in dict) {
            output[name] = this.convertInputToTensor(dict[name]);
        }
        return output;
    }

    convertArrayToTensor(array) {
        let output = [];
        for (let x = 0; x < array.length; ++x) {
            output.push(this.convertInputToTensor(array[x]));
        }
        return output;
    }

    convertFeedDictToTensor(feedDict) {
        console.log(feedDict);
        if (Array.isArray(feedDict)) {
            return this.convertArrayToTensor(feedDict);
        }
        return this.convertDictionaryToTensorDict(feedDict);
    }

    async convertTensorToJSON(tensor) {
        // console.log("Received tensor: ", tensor);
        let output = {};
        output['data'] = await tensor.dataSync();
        output['shape'] = tensor.shape;
        output['dtype'] = tensor.dtype;
        return output;
    }

    isTensor(input) {
        return input.hasOwnProperty('dataId') && input.hasOwnProperty('shape') && input.hasOwnProperty('dtype');
    }

    async convertTensorArrayToJSON(tensorArray) {
        let output = [];
        for (let x = 0; x < tensorArray.length; ++x) {
            let tensorConvertedToJSON = await this.convertTensorToJSON(tensorArray[x]);
            output.push(tensorConvertedToJSON);
        }
        return output;
    }

    async convertTensorDictToJSON(tensorDict) {
        let output = {};
        for (let name in tensorDict) {
            output[name] = await this.convertTensorToJSON(tensorDict[name]);
        }
        return output;
    }

    async convertPredictionOutputToJSON(predictionOutput) {
        if (predictionOutput === null) {
            return null;
        }
        // console.log("Converting Prediction output: ");
        // console.log(predictionOutput);
        if (this.isTensor(predictionOutput)) {
            // console.log("Received tensor");
            return this.convertTensorToJSON(predictionOutput);
        }
        if (Array.isArray(predictionOutput)) {
            // console.log("Received array");
            return this.convertTensorArrayToJSON(predictionOutput);
        }
        // console.log("Received dict");
        return this.convertTensorDictToJSON(predictionOutput);
    }

    async predict(feedDict) {
        try {
            const feedDictConvertedToTensor = this.convertFeedDictToTensor(feedDict);
            console.log(feedDictConvertedToTensor);
            let predictionOutput = null;
            if (this.predictUsingExecuteAsync) {
                predictionOutput = await this.loadedTFJSModel.executeAsync(feedDictConvertedToTensor);
            } else {
                predictionOutput = await this.loadedTFJSModel.predict(feedDictConvertedToTensor);
            }
            // console.log("Prediction output: ");
            // console.log(predictionOutput);
            return await this.convertPredictionOutputToJSON(predictionOutput);
        } catch (error) {
            console.log(`Encountered error while predicting using loaded TensorFlowJS Model : ${error}`);
            return null;
        }
    }

    async disposeLoadedModel() {
        if (CommonValidators.isEmpty(this.loadedTFJSModel)) {
            return true;
        }
        try {
            this.loadedTFJSModel.layers.forEach(l => l.dispose());
            this.loadedTFJSModel = null;
        } catch (error) {
            console.log(`Error encountered while unloading TensorflowJS model : ${error}`);
            return false;
        }
        return true;
    }

    prepareResponseToMainScript(responseDataObject) {
        return {workerIndex: this.workerIndex, responseData: responseDataObject};
    }
}

let workerObject = null;

onmessage = async (event) => {
    switch (event.data.command) {
        case 'create':
            const workerConfig = event.data.config;
            const workerIndex = event.data.workerIndex;
            workerObject = new TFJSWebWorkerModelRunnerWorker(workerIndex, workerConfig);
            console.log('Worker created');
            console.log(workerObject);
            postMessage(workerObject.prepareResponseToMainScript(true));
            break;

        case 'load':
            await workerObject.load();
            postMessage(workerObject.prepareResponseToMainScript(true));
            break;

        case 'predict':
            // console.log('Worker predicting');
            let predictResult = await workerObject.predict(event.data.feedDict);
            // console.log(predictResult);
            postMessage(workerObject.prepareResponseToMainScript(predictResult));
            break;

        case 'disposeLoadedModel':
            console.log('Disposing loded model');
            let disposeModelResult = await workerObject.disposeLoadedModel();
            console.log(disposeModelResult);
            postMessage(workerObject.prepareResponseToMainScript(disposeModelResult));
            break;

        default:
            console.log("Unknown command sent to worker!");
            postMessage(workerObject.prepareResponseToMainScript(false));
            break;
    }
};