Module['onRuntimeInitialized'] = function () {

    window.copyArrayToEmsHeap =
        function (data) {
            let nDataBytes = data.length * data.BYTES_PER_ELEMENT;
            let dataPtr = Module._malloc(nDataBytes);

            // Copy data to Emscripten heap (directly accessed from Module.HEAPU8)
            let dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
            dataHeap.set(new Uint8Array(data.buffer).slice(0, nDataBytes));
            // dataHeap.set(data.buffer, 0);
            return dataHeap;
        }

    window.createBytesArrayOnEmsHeap = function (bytesArraySize) {
        let dataPtr = Module._malloc(bytesArraySize);
        return new Uint8Array(Module.HEAPU8.buffer, dataPtr, bytesArraySize);
    }

    window.getCopyOfArrayOnEmsHeap =
        function (heapArray) {

        }

    window.getNormalizedArrayShapesForZfp =
        function (shape) {
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

    window.skymelZfpCompressFloat32Array = function (inputArray, arrayShape, compressionConfig = {}) {
        const normalizedShape = getNormalizedArrayShapesForZfp(arrayShape);
        const x = normalizedShape[0];
        const y = normalizedShape[1];
        const z = normalizedShape[2];
        const w = normalizedShape[3];
        let dataHeap = copyArrayToEmsHeap(inputArray);
        let originalDataSize = inputArray.length * inputArray.BYTES_PER_ELEMENT;
        let compressedBufferBytesSize = Math.round(originalDataSize * 1.5);
        let compressedDataBuffer = createBytesArrayOnEmsHeap(compressedBufferBytesSize);

        const tolerance = ('tolerance' in compressionConfig) ? compressionConfig['tolerance'] : -1;
        const rate = ('rate' in compressionConfig) ? compressionConfig['rate'] : -1;
        const precision = ('precision' in compressionConfig) ? compressionConfig['precision'] : -1;

        for (let i = 0; i < compressedDataBuffer.length; ++i) {
            compressedDataBuffer[i] = 0;
        }

        const outputSizeBytes = Module.SkymelZfpCompress(
            dataHeap.byteOffset, /*inputDataTypeInt=*/ 3, x, y, z, w,
            compressedDataBuffer.byteOffset, compressedBufferBytesSize, tolerance, rate, precision);
        console.log("Compressed size : " + outputSizeBytes);
        const compressionRatio =
            Math.round((100 * outputSizeBytes) / originalDataSize);
        console.log("Compression ratio : " + compressionRatio + " %");
        console.log(compressedDataBuffer);
        Module._free(dataHeap.byteOffset);
        const validOutputSizeBytes = Math.min(outputSizeBytes, compressedBufferBytesSize);
        let outputArray = new Uint8Array(compressedDataBuffer.slice(0, validOutputSizeBytes));
        Module._free(compressedDataBuffer.byteOffset);
        return {
            'compressedByteArray': outputArray,
            'compressedContentSizeBytes': outputSizeBytes
        };
    }

    window.skymelZfpDeCompressToFloat32Array = function (inputBytes, originalDataBytesSize, originalArrayShape, compressionConfig = {}) {
        const normalizedShape = getNormalizedArrayShapesForZfp(originalArrayShape);
        const x = normalizedShape[0];
        const y = normalizedShape[1];
        const z = normalizedShape[2];
        const w = normalizedShape[3];
        let dataHeap = copyArrayToEmsHeap(inputBytes);
        let compressedDataBytesSize = inputBytes.length * inputBytes.BYTES_PER_ELEMENT;
        let decompressedBufferBytesSize = originalDataBytesSize;
        let decompressedDataBuffer = createBytesArrayOnEmsHeap(decompressedBufferBytesSize);


        const tolerance = ('tolerance' in compressionConfig) ? compressionConfig['tolerance'] : 0;
        const rate = ('rate' in compressionConfig) ? compressionConfig['rate'] : 0;
        const precision = ('precision' in compressionConfig) ? compressionConfig['precision'] : 0;


        for (let i = 0; i < decompressedDataBuffer.length; ++i) {
            decompressedDataBuffer[i] = 0;
        }

        const processedBytes = Module.SkymelZfpDecompress(
            dataHeap.byteOffset, compressedDataBytesSize, /*outputDataTypeInt=*/ 3, x, y, z, w,
            decompressedDataBuffer.byteOffset, decompressedBufferBytesSize, tolerance, rate, precision);
        console.log("Processed bytes : " + processedBytes);

        console.log(decompressedDataBuffer);
        Module._free(dataHeap.byteOffset);
        let outputArray = new Float32Array(decompressedDataBuffer.slice(0, originalDataBytesSize).buffer);
        Module._free(decompressedDataBuffer.byteOffset);
        return {
            'deCompressedByteArray': outputArray,
            'deCompressedContentSizeBytes': originalDataBytesSize
        };
    }

    const skymelZfpCompressionLoaded = new Event('skymelZfpCompressionLoaded');
    window.dispatchEvent(skymelZfpCompressionLoaded);
}
