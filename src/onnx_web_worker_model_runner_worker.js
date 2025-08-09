importScripts("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js");
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";

export class OnnxWebWorkerModelRunnerWorker {
    constructor(config) {
        this.onnxModelUrl = ('onnxModelUrl' in config) ? config['onnxModelUrl'] : null;
        this.sessionConfig = ('sessionConfig' in config) ? config['sessionConfig'] : null;
        this.saveAndLoadModelUsingIndexedDB = ('saveAndLoadModelUsingIndexedDB' in config) ? config['saveAndLoadModelUsingIndexedDB'] : true;
        this.loadedOnnxSession = null;

    }

    isOnnxRuntimeUsingWebGLBackend() {
        // If the WebGL backend is being used we will have to convert all int64 tensors to int32 (since Onnx WebGL
        // backend doesn't support int64 tensors).
        return this.sessionConfig !== null && this.sessionConfig['executionProviders'][0] === 'webgl';
    }

    async load() {
        try {
            this.loadedOnnxSession = (this.sessionConfig === null) ? await ort.InferenceSession.create(this.onnxModelUrl)
                : await ort.InferenceSession.create(this.onnxModelUrl, this.sessionConfig);
            return true;
        } catch (error) {
            console.log(`Encountered error while creating Onnx session : ${error}`);
            this.loadedOnnxSession = null;
            return false;
        }
    }


}