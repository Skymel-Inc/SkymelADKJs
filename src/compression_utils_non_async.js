import * as SkymelCompressionModule from "./compression.js";


export class CompressionUtilsNonAsync {
    static INSTANCE = null;

    static async createInstance() {
        if (CompressionUtilsNonAsync.INSTANCE === null) {
            CompressionUtilsNonAsync.INSTANCE = await SkymelCompressionModule.default();
        }
        if (CompressionUtilsNonAsync.INSTANCE === null) {
            throw new Error("Could not initialize SkymelCompressionModule instance.");
        }
    }

    static getInstance() {
        if (CompressionUtilsNonAsync.INSTANCE === null) {
            throw new Error("SkymelCompressionModule instance is not initialized. Please run await CompressionUtilsNonAsyncNonAsync.loadInstance()");
        }
        return CompressionUtilsNonAsync.INSTANCE;
    }

    static copyArrayToEmsHeap(data) {
        const instance = CompressionUtilsNonAsync.getInstance();
        let nDataBytes = data.length * data.BYTES_PER_ELEMENT;
        let dataPtr = instance._malloc(nDataBytes);

        // Copy data to Emscripten heap (directly accessed from instance.HEAPU8)
        let dataHeap = new Uint8Array(instance.HEAPU8.buffer, dataPtr, nDataBytes);
        dataHeap.set(new Uint8Array(data.buffer).slice(0, nDataBytes));
        // dataHeap.set(data.buffer, 0);
        return dataHeap;
    }

    static createBytesArrayOnEmsHeap(bytesArraySize) {
        const instance = CompressionUtilsNonAsync.getInstance();
        let dataPtr = instance._malloc(bytesArraySize);
        return new Uint8Array(instance.HEAPU8.buffer, dataPtr, bytesArraySize);
    }

    static getNormalizedArrayShapesForZfp(shape) {
        let x = 0;
        let y = 0;
        let z = 0;
        let w = 0;

        if (Array.isArray(shape)) {
            x = (shape.length >= 1) ? shape[0] : 0;
            y = (shape.length >= 2) ? shape[1] : 0;
            z = (shape.length >= 3) ? shape[2] : 0;
            w = (shape.length >= 4) ? shape[3] : 0;

            return [x, y, z, w];
        }

        x = ('x' in shape) ? shape['x'] : 0;
        y = ('y' in shape) ? shape['y'] : 0;
        z = ('z' in shape) ? shape['z'] : 0;
        w = ('w' in shape) ? shape['w'] : 0;
        return [x, y, z, w];
    }


    /**
     * Returns a dictionary with  keys:
     * `compressedByteArray` : An Uint8Array containing the compressed matrix contents.
     * `compressedContentSizeBytes` :  A number indicating the size of the compressed contents. If there is a failure,
     * this number is -1.
     *
     * @param inputArray The Float32Array object, which is a flat array.
     * @param arrayShape The shape array describing the matrix in up to 4 dimensions. Unused dimensions need not be
     * specified. For example : [100], or [1,12,3,4], or [21,22]
     * @param compressionConfig Specifies parameters for the Zfp compression under keys: `tolerance`,`rate`, `precision`
     * @param generateDebugLogs Whether to log debug information in the console or not.
     * @returns {compressedByteArray: Uint8Array, compressedContentSizeBytes: Number}
     */
    static skymelZfpCompressFloat32Array(inputArray, arrayShape, compressionConfig = {}, generateDebugLogs = false) {
        const normalizedShape = CompressionUtilsNonAsync.getNormalizedArrayShapesForZfp(arrayShape);
        const instance = CompressionUtilsNonAsync.getInstance();
        const x = normalizedShape[0];
        const y = normalizedShape[1];
        const z = normalizedShape[2];
        const w = normalizedShape[3];
        let dataHeap = CompressionUtilsNonAsync.copyArrayToEmsHeap(inputArray);
        let originalDataSize = inputArray.length * inputArray.BYTES_PER_ELEMENT;
        let compressedBufferBytesSize = Math.round(originalDataSize * 1.5);
        let compressedDataBuffer = CompressionUtilsNonAsync.createBytesArrayOnEmsHeap(compressedBufferBytesSize);

        const tolerance = ('tolerance' in compressionConfig) ? compressionConfig['tolerance'] : 0;
        const rate = ('rate' in compressionConfig) ? compressionConfig['rate'] : 0;
        const precision = ('precision' in compressionConfig) ? compressionConfig['precision'] : 0;


        for (let i = 0; i < compressedDataBuffer.length; ++i) {
            compressedDataBuffer[i] = 0;
        }

        /*inputDataTypeInt=3 Indicates the float32 type */
        const outputSizeBytes = instance.SkymelZfpCompress(
            dataHeap.byteOffset, /*inputDataTypeInt=*/ 3, x, y, z, w,
            compressedDataBuffer.byteOffset, compressedBufferBytesSize, tolerance, rate, precision);

        const compressionRatio =
            Math.round((100 * outputSizeBytes) / originalDataSize);
        if (generateDebugLogs) {
            console.log("Compressed size : " + outputSizeBytes);
            console.log("Compression ratio : " + compressionRatio + " %");
            console.log("Compressed data buffer:");
            console.log(compressedDataBuffer);
        }

        instance._free(dataHeap.byteOffset);
        const validOutputSizeBytes = Math.min(outputSizeBytes, compressedBufferBytesSize);
        let outputArray = new Uint8Array(compressedDataBuffer.slice(0, validOutputSizeBytes));
        instance._free(compressedDataBuffer.byteOffset);
        return {
            'compressedByteArray': outputArray,
            'compressedContentSizeBytes': outputSizeBytes
        };
    }

    /**
     * Returns a dictionary with the following keys:
     * `deCompressedFloat32Array`: The decompressed Float32Array
     * `deCompressedContentSizeBytes` : The bytes size of the decompressed array.
     *
     * @param inputBytes An Uint8Array of the compressed float array.
     * @param originalDataBytesSize The expected size of the original data in bytes. Please remember that a float32
     * number consists of 4 bytes. Please multiply the original float32 flat array size by 4 to get this parameter's
     * value.
     * @param originalArrayShape An array of integers specifying the shape of the original float32 matrix.
     * @param compressionConfig The exact parameters used during the Zfp compression with keys:
     * `tolerance`,`rate`, `precision`
     * @param generateDebugLogs Whether to log debug information in the console or not.
     * @returns {deCompressedFloat32Array: Float32Array, deCompressedContentSizeBytes: Number}
     */
    static skymelZfpDeCompressToFloat32Array(inputBytes, originalDataBytesSize, originalArrayShape, compressionConfig = {}, generateDebugLogs = false) {
        const normalizedShape = CompressionUtilsNonAsync.getNormalizedArrayShapesForZfp(originalArrayShape);
        const x = normalizedShape[0];
        const y = normalizedShape[1];
        const z = normalizedShape[2];
        const w = normalizedShape[3];
        let dataHeap = CompressionUtilsNonAsync.copyArrayToEmsHeap(inputBytes);
        let compressedDataBytesSize = inputBytes.length * inputBytes.BYTES_PER_ELEMENT;
        let decompressedBufferBytesSize = originalDataBytesSize;
        let decompressedDataBuffer = CompressionUtilsNonAsync.createBytesArrayOnEmsHeap(decompressedBufferBytesSize);


        const tolerance = ('tolerance' in compressionConfig) ? compressionConfig['tolerance'] : 0;
        const rate = ('rate' in compressionConfig) ? compressionConfig['rate'] : 0;
        const precision = ('precision' in compressionConfig) ? compressionConfig['precision'] : 0;


        for (let i = 0; i < decompressedDataBuffer.length; ++i) {
            decompressedDataBuffer[i] = 0;
        }

        const instance = CompressionUtilsNonAsync.getInstance();
        const processedBytes = instance.SkymelZfpDecompress(
            dataHeap.byteOffset, compressedDataBytesSize, /*outputDataTypeInt=*/ 3, x, y, z, w,
            decompressedDataBuffer.byteOffset, decompressedBufferBytesSize, tolerance, rate, precision);

        if (generateDebugLogs) {
            console.log("Processed bytes : " + processedBytes);
            console.log("Decompressed data buffer:");
            console.log(decompressedDataBuffer);
        }


        instance._free(dataHeap.byteOffset);
        let outputArray = new Float32Array(decompressedDataBuffer.slice(0, originalDataBytesSize).buffer);
        instance._free(decompressedDataBuffer.byteOffset);
        return {
            'deCompressedFloat32Array': outputArray,
            'deCompressedContentSizeBytes': originalDataBytesSize
        };
    }
}