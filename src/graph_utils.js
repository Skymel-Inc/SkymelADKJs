import * as petaMorikenFloat16 from './float16.js';
import {CompressionUtilsNonAsync} from "./compression_utils_non_async.js";
import * as skymelIo from './skymel_modelio_proto.standalone.js';

export class GraphUtils {
    constructor() {
        throw new Error("Cannot instantiate this class. It has purely static methods, please call them using " +
            "class-name scope,such as `GraphUtils.isMethod(param)` etc.");
    }

     static async createResourceInstances() {
        await CompressionUtilsNonAsync.createInstance();
    }

    static getGraphOutputFromFloatingPointArray(nodeName, outputFlatArray, arrayShape) {
        let graphOutput = {floatOutputs: []};

        graphOutput.floatOutputs.push({
            nodeName: nodeName, outputFlatArray: outputFlatArray, arrayShape: arrayShape
        });
        return graphOutput;
    }

    static getGraphOutputFromIntArray(nodeName, outputFlatArray, arrayShape) {
        let graphOutput = {int32Outputs: []};

        graphOutput.int32Outputs.push({
            nodeName: nodeName, outputFlatArray: outputFlatArray, arrayShape: arrayShape
        });
        return graphOutput;
    }

    static getNonTrivialArrayDimensionMeasures(inputArrayShape) {
        let i = 0;
        while (i < inputArrayShape.length && inputArrayShape[i] === 1) {
            ++i;
        }
        let j = inputArrayShape.length - 1;
        while (j > 0 && inputArrayShape[j] === 1) {
            --j;
        }
        if (i > j) {
            return null;
        }
        let output = [];
        for (let k = i; k <= j; ++k) {
            output.push(inputArrayShape[k]);
        }
        return output;
    }


    static convertFloat32ArrayToFloat16Array(inputFloat32Array, returnAsBytes = true) {
        if (typeof inputFloat32Array == "undefined" || inputFloat32Array.length === 0) {
            return null;
        }

        let outputFloat16Array = new petaMorikenFloat16.Float16Array(inputFloat32Array.length);
        for (let i = 0; i < outputFloat16Array.length; ++i) {
            outputFloat16Array[i] = inputFloat32Array[i];
        }
        return returnAsBytes ? outputFloat16Array.buffer : outputFloat16Array;
    }

    static getHalfPrecisionGraphOutputFromFloatingPointArray(nodeName, outputFlatArray, arrayShape) {
        const float16Array = GraphUtils.convertFloat32ArrayToFloat16Array(outputFlatArray, false);
        let graphOutput = {compressedBytesOutputs: []};//, floatOutputs: []};

        graphOutput.compressedBytesOutputs.push({
            nodeName: nodeName,
            outputFlatArray: new Uint8Array(float16Array.buffer),
            arrayShape: arrayShape,
            uncompressedDataType: skymelIo.skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType.FLOAT32,
            compressionAlgorithm: skymelIo.skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm.FLOAT32_TO_FLOAT16_CONVERSION,
        });

        return graphOutput;
    }

    static getCompressedBytesGraphOutputFromFloatingPointArray(compressionUtilStaticInstance, nodeName, outputFlatArray, arrayShape, compressionParameters) {
        const nonTrivialArrayShape = GraphUtils.getNonTrivialArrayDimensionMeasures(arrayShape);

        console.log("Non-trivial array shape:");
        console.log(nonTrivialArrayShape);
        const compressionResult = CompressionUtilsNonAsync.skymelZfpCompressFloat32Array(outputFlatArray, nonTrivialArrayShape, compressionParameters);
        // These are being written to the transmitted InferenceRequest proto (for decompression at Server's end).
        let zfpParameters = {
            tolerance: compressionParameters['tolerance'],
            rate: compressionParameters['rate'],
            precision: compressionParameters['precision'],
            dataType: skymelIo.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.ZfpDataType.ZFP_TYPE_FLOAT,
            nx: nonTrivialArrayShape.length > 0 ? nonTrivialArrayShape[0] : 0,
            ny: nonTrivialArrayShape.length > 1 ? nonTrivialArrayShape[1] : 0,
            nz: nonTrivialArrayShape.length > 2 ? nonTrivialArrayShape[2] : 0,
            nw: nonTrivialArrayShape.length > 3 ? nonTrivialArrayShape[3] : 0,
            uncompressedDataSizeBytes: outputFlatArray.length * outputFlatArray.BYTES_PER_ELEMENT
        };

        let graphOutput = {compressedBytesOutputs: []};//, floatOutputs: []};

        graphOutput.compressedBytesOutputs.push({
            nodeName: nodeName,
            outputFlatArray: compressionResult['compressedByteArray'],
            arrayShape: arrayShape,
            uncompressedDataType: skymelIo.skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType.FLOAT32,
            compressionAlgorithm: skymelIo.skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm.ZFP,
            zfpParameters: zfpParameters
        });

        return graphOutput;
    }
}