class OnnxRuntimeConfigMaker {
    /**
     *
     * @param deviceDetails Object containing current device details. This is obtained using a call to `await DeviceInfo.getDeviceInfo()`
     * @param modelOptions Expected to contain the following keys:
     *                      `modelDefaultBatchSize` : Defaults to 1.
     *                      `modelDeviceAffinity`  : Defaults to `"cpu"`, can be `"gpu"` or `"npu"`,
     *                      `externalModelWeightFilesInfo` : `[{"path":"file_name.onnx_data", "data":"url/file_name.onnx_data"}]`
     */
    constructor(deviceDetails, modelOptions) {
        this.deviceDetails = deviceDetails;
        this.modelOptions = modelOptions;

        this.preferredDevice = null;
        this.preferredBackend = null;
    }

    isWebGPuEnabledOnAGpu() {
        return this.deviceDetails.hasWebGPUEnabledGPU;
    }

    isWebGLEnabledOnAHighPerformanceGpu() {
        if (!this.deviceDetails.hasWebGLEnabled) {
            return false;
        }
        if (!("webGLEngineVendor" in this.deviceDetails && this.deviceDetails.webGLEngineVendor.length > 0)) {
            return false;
        }
        const vendor = this.deviceDetails.webGLEngineVendor.toLowerCase();
        const renderDevice = this.deviceDetails.webGLEngineRenderingDevice.length > 0 ? this.deviceDetails.webGLEngineRenderingDevice.toLowerCase() : "";

        if (vendor.includes("nvidia")) {
            return true;
        }
        return renderDevice.includes("apple m1") || renderDevice.includes("apple m2");
    }

    getBestDeviceForOnnxSession() {
        if ("modelDeviceAffinity" in this.modelOptions && this.modelOptions.modelDeviceAffinity === "cpu") {
            return "cpu";
        }
        if (this.isWebGPuEnabledOnAGpu()) {
            return "gpu";
        }
        if (this.isWebGLEnabledOnAHighPerformanceGpu()) {
            return "gpu";
        }
        if (this.deviceDetails.isSmallFormFactorMobileDevice) {
            return "cpu";
        }
        return "cpu";
    }

    getBestBackendForOnnxSession() {
        if (this.deviceDetails.hasWebGPUEnabledGPU && this.preferredDevice === "gpu") {
            return "webgpu";
        }
        return "wasm";
    }

    getConfigForOnnxWebGpuSession() {
        return {
            executionProviders: ['webgpu'],
            freeDimensionOverrides:
                {
                    batch_size: "modelDefaultBatchSize" in this.modelOptions ? this.modelOptions.modelDefaultBatchSize : 1,
                }
            ,
            // enableGraphCapture: true,
            // preferredOutputLocation: {
            //     'last_hidden_state': 'gpu-buffer'
            // },
            //
            // externalData: [
            //     {
            //         path: 'encoder_model.onnx_data',
            //         data: "models/whisper-large-v3/encoder_model.onnx_data"
            //     }]
        };
    }

    getConfigForOnnxWasmSession() {
        return {
            executionProviders: ['wasm'],
        };
    }

    addExternalDataFileToOnnxSessionsConfig(inputConfig) {
        if (!("externalModelWeightFilesInfo" in this.modelOptions && this.modelOptions.externalModelWeightFilesInfo.length > 0)) {
            return inputConfig;
        }
        if (!("externalData" in inputConfig)) {
            inputConfig["externalData"] = [];
        }
        for (let i = 0; i < this.modelOptions.externalModelWeightFilesInfo.length; ++i) {
            inputConfig["externalData"].push(this.modelOptions.externalModelWeightFilesInfo[i]);
        }
        return inputConfig;
    }

    getOnnxSessionConfig() {
        this.preferredDevice = this.getBestDeviceForOnnxSession();
        this.preferredBackend = this.getBestBackendForOnnxSession();

        let config = null;

        if (this.preferredDevice === "gpu") {
            if (this.preferredBackend === "webgpu") {
                config = this.getConfigForOnnxWebGpuSession();
            }
        }
        if (config === null) {
            config = this.getConfigForOnnxWasmSession();
        }
        return this.addExternalDataFileToOnnxSessionsConfig(config);
    }

}