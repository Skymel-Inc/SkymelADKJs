import {CommonValidators} from "./common_validators.js";

export class TFJSWebWorkerModelRunner {
    constructor(config, numberOfWorkers = 3) {
        this.config = config;
        this.workers = [];

        this.awaitingResponseFromWorkerIndices = new Set();


        this.selectedWorkerIndex = 0;

        for (let i = 0; i < numberOfWorkers; ++i) {
            this.workers.push(new Worker(new URL('./tfjs_web_worker_model_runner_worker.js', import.meta.url), {type: 'module'}));
        }
        //, {type: 'module'});
    }

    getCountOfCurrentlyIdleWorkers() {
        return this.workers.length - this.awaitingResponseFromWorkerIndices.size;
    }

    isReadyToAcceptInferenceTask() {
        return this.getCountOfCurrentlyIdleWorkers() > 0;
    }

    sendMessageToWorker(message, workerIndex = 0) {
        const selectedWorker = this.workers[workerIndex];
        this.awaitingResponseFromWorkerIndices.add(workerIndex);
        const currentObject = this;
        return new Promise((resolve, reject) => {
            selectedWorker.onmessage = (event) => {
                resolve(currentObject.parseResponseFromWorker(event.data));
            };

            selectedWorker.onerror = (error) => {
                reject(error);
            };

            selectedWorker.postMessage(message);
        });
    }

    parseResponseFromWorker(responseObject) {
        const respondingWorkerIndex = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(responseObject, 'workerIndex', -1);
        this.awaitingResponseFromWorkerIndices.delete(respondingWorkerIndex);
        return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(responseObject, 'responseData', null);
    }

    __getPotentiallyFreeWorkerIndex() {
        let workerIndex = ++this.selectedWorkerIndex % this.workers.length;
        if (this.getCountOfCurrentlyIdleWorkers() === 0) {
            return workerIndex;
        }
        while (this.awaitingResponseFromWorkerIndices.has(workerIndex)) {
            workerIndex = ++this.selectedWorkerIndex % this.workers.length;
        }
        return workerIndex;
    }

    getSelectedWorkerIndex() {
        // return (++this.selectedWorkerIndex % this.workers.length);
        return this.__getPotentiallyFreeWorkerIndex();
    }

    ___makeFloat32Tensor(flatArray, shape) {
        let totalLength = 1;
        for (let i = 0; i < shape.length; ++i) {
            totalLength *= shape[i];
        }
        if (flatArray.length !== totalLength) {
            throw new Error("Provided flatArray length doesn't equal expected tensor length");
        }
        return {
            data: flatArray, shape: shape, dtype: 'float32'
        };
        // return tf.tensor(flatArray, shape, "float32");
    }

    ___makeInt64Tensor(flatArray, shape) {
        let totalLength = 1;
        for (let i = 0; i < shape.length; ++i) {
            totalLength *= shape[i];
        }
        if (flatArray.length !== totalLength) {
            throw new Error("Provided flatArray length doesn't equal expected tensor length");
        }
        return {
            data: flatArray, shape: shape, dtype: 'int32'
        };
        // return tf.tensor(flatArray, shape, "int32");
    }

    __disposeTensor(inputTensor) {
        // Just a placeholder.
        // inputTensor.dispose();
    }

    async load() {
        try {
            for (let i = 0; i < this.workers.length; ++i) {
                await this.sendMessageToWorker({command: 'create', config: this.config, workerIndex: i}, i);
                await this.sendMessageToWorker({command: 'load'}, i);
            }

        } catch (error) {
            console.log(`Encountered error while loadig TensorFlowJS Model : ${error}`);
            console.log(error);
            console.log(error.stack);
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


    async runInference(feedDict) {
        if (this.workers.length === 0) {
            return null;
        }
        try {
            return await this.sendMessageToWorker({
                command: 'predict',
                feedDict: feedDict
            }, this.getSelectedWorkerIndex());
        } catch (error) {
            console.log(`Encountered error while running inference on TensorFlowJS Model : ${error}`);
        }
        return null;
    }

    async dispose() {
        if (CommonValidators.isEmpty(this.workers)) {
            return;
        }
        for (let i = 0; i < this.workers.length; ++i) {
            await this.sendMessageToWorker({command: 'disposeLoadedModel'}, i);
        }
    }
}

// exports.default = TFLiteModelRunner;