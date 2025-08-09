import {CommonValidators} from "./common_validators.js";

export class OnnxWebWorkerModelRunnerMain {
    constructor(config, numberOfWorkers = 2) {
        this.config = config;
        this.workers = [];
        this.selectedWorkerIndex = 0;

        for (let i = 0; i < numberOfWorkers; ++i) {
            this.workers.push(new Worker(new URL('./onnx_web_worker_model_runner_worker.js', import.meta.url)));
        }
    }

    sendMessageToWorker(message, workerIndex = 0) {
        const selectedWorker = this.workers[workerIndex];
        return new Promise((resolve, reject) => {
            selectedWorker.onmessage = (event) => {
                resolve(event.data);
            };

            selectedWorker.onerror = (error) => {
                reject(error);
            };

            selectedWorker.postMessage(message);
        });
    }

    getSelectedWorkerIndex() {
        return (++this.selectedWorkerIndex % this.workers.length);
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
    }

    __disposeTensor(inputTensor) {
        // Just a placeholder.
        // inputTensor.dispose();
    }

    async load() {
        try {
            for (let i = 0; i < this.workers.length; ++i) {
                await this.sendMessageToWorker({command: 'create', config: this.config}, i);
                await this.sendMessageToWorker({command: 'load'}, i);
            }

        } catch (error) {
            console.log(`Encountered error while loadig ONNX Model : ${error}`);
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
            console.log(`Encountered error while running inference on ONNX Model : ${error}`);
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