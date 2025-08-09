export class TFLiteModelRunner {
    constructor(config) {
        this.modelLoadConfig = ('modelLoadConfig' in config) ? config['modelLoadConfig'] : null;
        this.tfLiteModelUrl = ('tfLiteModelUrl' in config) ? config['tfLiteModelUrl'] : null;
        this.loadedTFLiteModel = null;
        this.isReadyToRunInferenceTask = false;
    }

    isReadyForInferenceTask() {
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
        return tf.tensor(flatArray, shape);
    }

    ___makeInt64Tensor(flatArray, shape) {
        let totalLength = 1;
        for (let i = 0; i < shape.length; ++i) {
            totalLength *= shape[i];
        }
        if (flatArray.length !== totalLength) {
            throw new Error("Provided flatArray length doesn't equal expected tensor length");
        }
        return tf.tensor(flatArray, shape);
    }

    __disposeTensor(inputTensor) {
        inputTensor.dispose();
    }

    async load() {
        try {
            this.loadedTFLiteModel = (this.modelLoadConfig === null) ? await tflite.loadTFLiteModel(this.tfLiteModelUrl) : await tflite.loadTFLiteModel(this.tfLiteModelUrl, this.modelLoadConfig);
            this.isReadyToRunInferenceTask = true;
        } catch (error) {
            console.log(`Encountered error while loadig TFLite Model : ${error}`);
            this.loadedTFLiteModel = null;
            this.isReadyToRunInferenceTask = false;
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
        if (this.loadedTFLiteModel === null) {
            return null;
        }
        this.isReadyToRunInferenceTask = false;
        try {
            const predictionResult = await this.loadedTFLiteModel.predict(feedDict);
            this.isReadyToRunInferenceTask = true;
            return predictionResult;
        } catch (error) {
            console.log(`Encountered error while running inference on TFLite Model : ${error}`);
            this.isReadyToRunInferenceTask = true;
            return null;
        }
    }
}

// exports.default = TFLiteModelRunner;