import {CommonValidators} from "./common_validators.js";
import {
    AutoProcessor,
    AutoTokenizer
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3/dist/transformers.min.js';
// import {AutoProcessor, AutoTokenizer} from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@3.3.3';
// import {AutoProcessor, AutoTokenizer} from "./transformers.js";

export class TransformersJSProcessorLoader {

    static loadedProcessorsInstances = {};
    static loadedTokenizers = {};

    constructor(props) {
        throw new Error("Cannot instantiate this class. It has purely static methods, " +
            "please call them using class-name scope,such as `TransformersJSProcessorLoader.getProcessorById(param)` etc.");
    }

    static async getProcessorById(processorId) {
        if (!CommonValidators.isNonEmptyString(processorId)) {
            return null;
        }
        if (!(processorId in TransformersJSProcessorLoader.loadedProcessorsInstances)) {
            TransformersJSProcessorLoader.loadedProcessorsInstances[processorId] = await AutoProcessor.from_pretrained(processorId);

        }
        return TransformersJSProcessorLoader.loadedProcessorsInstances[processorId];
    }

    static async getTokenizerById(tokenizerId) {
        if (!CommonValidators.isNonEmptyString(tokenizerId)) {
            return null;
        }
        if (!(tokenizerId in TransformersJSProcessorLoader.loadedTokenizers)) {
            TransformersJSProcessorLoader.loadedTokenizers[tokenizerId] = await AutoTokenizer.from_pretrained(tokenizerId);
        }
        return TransformersJSProcessorLoader.loadedTokenizers[tokenizerId];
    }
}