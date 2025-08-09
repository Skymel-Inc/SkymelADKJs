import {CommonValidators} from "./common_validators.js";

import {SkymelECGraphNodeUtils} from "./skymel_ec_graph_node_utils.js";
import {SkymelECGraphNodeForDataProcessing} from "./skymel_ec_graph_node_for_data_processing.js";

import {TransformersJSProcessorLoader} from "./transformersjs_processor_loader.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";

// const reformatInputsAsTensors = SkymelECGraphNodeUtils.reformatDictionaryOfFlatArrayInputsToModelRunnerCompatibleTensorsDict;
const replaceKeysAcrossDict = SkymelECGraphNodeUtils.renameKeysInDictionary;
const makeDictFromArray = SkymelECGraphNodeUtils.makeDictFromArrayOfValuesUsingArrayOfKeyNames;


const extractTokenizerInput = function (feedDict, inputKeyName) {
    let output;
    if (CommonValidators.isDict(feedDict)) {
        if (CommonValidators.isNonEmptyString(inputKeyName)) {
            output = CommonValidators.isNotEmptyDictAndHasKey(feedDict, inputKeyName) ? feedDict[inputKeyName] : null;
        } else if (Object.keys(feedDict).length === 1) {
            // Only one content.
            const keyName = Object.keys(feedDict)[0];
            output = feedDict[keyName];
        }
    } else if (CommonValidators.isArray(feedDict)) {
        if (CommonValidators.isNumber(inputKeyName)) {
            const inputIndex = Math.floor(inputKeyName);
            output = (feedDict.length > inputIndex) ? feedDict[inputIndex] : null;
        } else if (feedDict.length === 1) {
            // Again only one content.
            output = feedDict[0];
        }
    } else {
        output = feedDict;
    }
    return output;
}

const runTokenizerEncode = async function (tokenizer, feedDict, inputTextKey = 'inputTextString', outputTokenArrayKeyName = 'encodedTokens', extraArgumentsForTokenizer = null, nodeOutputNames = null) {
    if (CommonValidators.isEmpty(tokenizer) || CommonValidators.isEmpty(feedDict)) {
        return null;
    }
    let tokenizerEncodeInput = extractTokenizerInput(feedDict, inputTextKey);

    if (!CommonValidators.isString(tokenizerEncodeInput)) {
        return null;
    }
    const encodedOutput = (CommonValidators.isEmpty(extraArgumentsForTokenizer) || !CommonValidators.isDict(extraArgumentsForTokenizer)) ? tokenizer.encode(tokenizerEncodeInput) : tokenizer.encode(tokenizerEncodeInput, extraArgumentsForTokenizer);
    let output = null;
    if (CommonValidators.isNonEmptyString(outputTokenArrayKeyName)) {
        output = {};
        output[outputTokenArrayKeyName] = encodedOutput;
    } else {
        output = encodedOutput;
    }

    if (!CommonValidators.isEmpty(output) && !CommonValidators.isEmpty(nodeOutputNames) && CommonValidators.isArray(nodeOutputNames)) {
        if (CommonValidators.isArray(output) && CommonValidators.isNumber(output[0]) && nodeOutputNames.length === 1) {
            let tempOutput = {};
            tempOutput[nodeOutputNames[0]] = output;
            output = tempOutput;
        }
    }
    return output;
}


const runTokenizerEncodeAfterApplyingChatTemplate = async function (tokenizer, feedDict, inputMessagesListKey = 'inputMessagesList', outputTokenArrayKeyName = 'encodedTokens', extraArgumentsForTokenizer = null, nodeOutputNames = null) {
    if (CommonValidators.isEmpty(tokenizer) || CommonValidators.isEmpty(feedDict)) {
        return null;
    }
    let inputMessagesList = extractTokenizerInput(feedDict, inputMessagesListKey);
    const tokenize = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(extraArgumentsForTokenizer, 'tokenize', true);
    const addGenerationPrompt = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(extraArgumentsForTokenizer, 'addGenerationPrompt', true);
    const encodedOutput = tokenizer.apply_chat_template(inputMessagesList, {
        tokenize: tokenize, add_generation_prompt: addGenerationPrompt, return_tensor: false,
    });

    let output;
    if (CommonValidators.isNonEmptyString(outputTokenArrayKeyName)) {
        output = {};
        output[outputTokenArrayKeyName] = encodedOutput;
    } else {
        output = encodedOutput;
    }

    if (!CommonValidators.isEmpty(output) && !CommonValidators.isEmpty(nodeOutputNames) && CommonValidators.isArray(nodeOutputNames)) {
        if (CommonValidators.isArray(output) && nodeOutputNames.length === 1) {
            let tempOutput = {};
            tempOutput[nodeOutputNames[0]] = output;
            output = tempOutput;
        }
    }
    return output;
}

const runTokenizerDecode = async function (tokenizer, feedDict, inputTokensArrayKey = 'inputTokensArray', outputDecodedStringKeyName = 'decodedTextString', extraArgumentsForTokenizer = null, nodeOutputNames = null) {
    if (CommonValidators.isEmpty(tokenizer)) {
        return null;
    }
    let tokenizerDecodeInput = null;
    if (CommonValidators.isDict(feedDict)) {
        if (CommonValidators.isNonEmptyString(inputTokensArrayKey)) {
            tokenizerDecodeInput = CommonValidators.isNotEmptyDictAndHasKey(feedDict, inputTokensArrayKey) ? feedDict[inputTokensArrayKey] : null;
        } else if (Object.keys(feedDict).length === 1) {
            // Only one content.
            const keyName = Object.keys(feedDict)[0];
            tokenizerDecodeInput = feedDict[keyName];
        }
    } else if (CommonValidators.isArray(feedDict)) {
        if (CommonValidators.isNumber(inputTokensArrayKey)) {
            const inputIndex = Math.floor(inputTokensArrayKey);
            tokenizerDecodeInput = (feedDict.length > inputIndex) ? feedDict[inputIndex] : null;
        } else if (feedDict.length === 1) {
            // Again only one content.
            tokenizerDecodeInput = feedDict[0];
        }
    } else {
        tokenizerDecodeInput = feedDict;
    }
    if (!CommonValidators.isArray(tokenizerDecodeInput)) {
        return null;
    }
    if (!CommonValidators.isEmpty(tokenizerDecodeInput) && !CommonValidators.isNumber(tokenizerDecodeInput[0])) {
        return null;
    }
    const decodeOutput = (CommonValidators.isEmpty(extraArgumentsForTokenizer) || !CommonValidators.isDict(extraArgumentsForTokenizer)) ? tokenizer.decode(tokenizerDecodeInput) : tokenizer.decode(tokenizerDecodeInput, extraArgumentsForTokenizer);

    let output = null;
    if (CommonValidators.isNonEmptyString(outputDecodedStringKeyName)) {
        output = {};
        output[outputDecodedStringKeyName] = decodeOutput;
    } else {
        output = decodeOutput;
    }
    if (!CommonValidators.isEmpty(output) && !CommonValidators.isEmpty(nodeOutputNames) && CommonValidators.isArray(nodeOutputNames)) {
        if (CommonValidators.isString(output) && nodeOutputNames.length === 1) {
            let tempOutput = {};
            tempOutput[nodeOutputNames[0]] = output;
            output = tempOutput;
        }
    }
    return output;
}

const runProcessorTransform = async function (processor, feedDict, inputKeyName = null, outputKeyName = null, extraArgumentsForProcessor = null, nodeOutputNames = null) {
    if (CommonValidators.isEmpty(processor)) {
        return null;
    }
    let processorInput = null;
    if (CommonValidators.isDict(feedDict)) {
        if (CommonValidators.isNonEmptyString(inputKeyName)) {
            processorInput = CommonValidators.isNotEmptyDictAndHasKey(feedDict, inputKeyName) ? feedDict[inputKeyName] : null;
        } else if (Object.keys(feedDict).length === 1) {
            // Only one entry.
            const keyName = Object.keys(feedDict)[0];
            processorInput = feedDict[keyName];
        }
    } else if (CommonValidators.isArray(feedDict)) {
        if (CommonValidators.isNumber(inputKeyName)) {
            const inputIndex = Math.floor(inputKeyName);
            processorInput = (feedDict.length > inputIndex) ? feedDict[inputIndex] : null;
        } else if (feedDict.length === 1) {
            // Only one entry.
            const keyName = Object.keys(feedDict)[0];
            processorInput = feedDict[keyName];
        }
    } else {
        processorInput = feedDict;
    }
    const transformedOutput = await processor(processorInput);
    let output = null;
    if (CommonValidators.isNonEmptyString(outputKeyName)) {
        output = {};
        output[outputKeyName] = transformedOutput;
    } else {
        output = transformedOutput;
    }
    return output;
}

const runProcessingAction = async function (processorOrTokenizer, feedDict, processorOrTokenizerType = SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER, processorOrTokenizerActionType = SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER_ENCODE, runTimeArgumentsForProcessorOrTokenizer = null, nodeOutputNames = null, defaultExtraArgumentsForProcessorOrTokenizer = null) {

    switch (processorOrTokenizerType) {
        case SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER:
            if (processorOrTokenizerActionType === SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER_ENCODE) {
                const tokenizerInputTextKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'tokenizerInputTextKey', null);
                const tokenizerOutputTokenIdsArrayKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'tokenizerOutputTokenIdsArrayKey', null);
                let extraArgumentsForTokenizer = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'extraArgumentsForTokenizer', null);
                if (CommonValidators.isEmpty(extraArgumentsForTokenizer) && !CommonValidators.isEmpty(defaultExtraArgumentsForProcessorOrTokenizer)) {
                    extraArgumentsForTokenizer = defaultExtraArgumentsForProcessorOrTokenizer;
                }
                return await runTokenizerEncode(processorOrTokenizer, feedDict, tokenizerInputTextKey, tokenizerOutputTokenIdsArrayKey, extraArgumentsForTokenizer, nodeOutputNames);
            } else if (processorOrTokenizerActionType === SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER_APPLY_CHAT_TEMPLATE_AND_ENCODE) {
                const tokenizerInputMessagesListKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'tokenizerInputMessagesListKey', null);
                const tokenizerOutputTokenIdsArrayKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'tokenizerOutputTokenIdsArrayKey', null);
                let extraArgumentsForTokenizer = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'extraArgumentsForTokenizer', null);
                if (CommonValidators.isEmpty(extraArgumentsForTokenizer) && !CommonValidators.isEmpty(defaultExtraArgumentsForProcessorOrTokenizer)) {
                    extraArgumentsForTokenizer = defaultExtraArgumentsForProcessorOrTokenizer;
                }
                return await runTokenizerEncodeAfterApplyingChatTemplate(processorOrTokenizer, feedDict, tokenizerInputMessagesListKey, tokenizerOutputTokenIdsArrayKey, extraArgumentsForTokenizer, nodeOutputNames);
            } else if (processorOrTokenizerActionType === SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER_DECODE) {
                const tokenizerInputTokenIdsArrayKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'tokenizerInputTextStringKey', null);
                const tokenizerOutputTextKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'tokenizerOutputTextKey', null);
                let extraArgumentsForTokenizer = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'extraArgumentsForTokenizer', null);
                if (CommonValidators.isEmpty(extraArgumentsForTokenizer) && !CommonValidators.isEmpty(defaultExtraArgumentsForProcessorOrTokenizer)) {
                    extraArgumentsForTokenizer = defaultExtraArgumentsForProcessorOrTokenizer;
                }
                return await runTokenizerDecode(processorOrTokenizer, feedDict, tokenizerInputTokenIdsArrayKey, tokenizerOutputTextKey, extraArgumentsForTokenizer, nodeOutputNames);
            }
            return null;

        case SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_PROCESSOR:
            const processorInputKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'processorInputKey', null);
            const processorOutputKey = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'processorOutputKey', null);
            let extraArgumentsForProcessor = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(runTimeArgumentsForProcessorOrTokenizer, 'extraArgumentsForProcessor', null);
            if (CommonValidators.isEmpty(extraArgumentsForProcessor) && !CommonValidators.isEmpty(defaultExtraArgumentsForProcessorOrTokenizer)) {
                extraArgumentsForProcessor = defaultExtraArgumentsForProcessorOrTokenizer;
            }
            return await runProcessorTransform(processorOrTokenizer, feedDict, processorInputKey, processorOutputKey, extraArgumentsForProcessor, nodeOutputNames);

        default:
            return null;
    }
}

const runTransformerJSDataProcessing = async function (graphReference, inputNodeResultsDict, nodeReference) {
    const processorOrTokenizer = await nodeReference.getLoadedProcessorOrTokenizer();

    const nodeInputNames = nodeReference.getInputNames();

    let feedDict = {};
    for (let i = 0; i < nodeInputNames.length; ++i) {
        const keyName = nodeInputNames[i];
        if (!CommonValidators.isNotEmptyDictAndHasKey(inputNodeResultsDict, keyName)) {
            throw new Error("Missing inputs for model run encountered.");
        }
        feedDict[keyName] = inputNodeResultsDict[keyName];
    }

    const graphNodeOutputToModelRunnerInputMap = nodeReference.getGraphNodeOutputToModelRunnerInputMap();
    if (!CommonValidators.isEmpty(graphNodeOutputToModelRunnerInputMap)) {
        feedDict = replaceKeysAcrossDict(graphNodeOutputToModelRunnerInputMap, feedDict);
    }


    const nodeRuntimeConfig = SkymelECGraphNodeUtils.getNodeExecutionConfigFromGraphExecutionConfig(graphReference, nodeReference);

    const nodeOutputNames = nodeReference.getOutputNames();
    const defaultProcessorOrTokenizerExtraOptions = nodeReference.getDefaultProcessorOrTokenizerExtraOptions();

    let processorOrTokenizerOutput = await runProcessingAction(processorOrTokenizer, feedDict,
        nodeReference.getLoadedProcessorOrTokenizerType(), nodeReference.getProcessorOrTokenizerActionType(),
        nodeRuntimeConfig, nodeOutputNames, defaultProcessorOrTokenizerExtraOptions)

    if (CommonValidators.isEmpty(processorOrTokenizerOutput)) {
        return processorOrTokenizerOutput;
    }
    if (CommonValidators.isArray(processorOrTokenizerOutput)) {
        const orderedKeyNamesForArrayToDictConversion = nodeReference.getModelRunnerOutputArrayToDictKeyNames();
        processorOrTokenizerOutput = makeDictFromArray(orderedKeyNamesForArrayToDictConversion, processorOrTokenizerOutput);
    }

    const modelRunnerOutputToGraphNodeOutputMap = nodeReference.getModelRunnerOutputToGraphNodeOutputMap();
    if (!CommonValidators.isEmpty(modelRunnerOutputToGraphNodeOutputMap)) {
        processorOrTokenizerOutput = replaceKeysAcrossDict(modelRunnerOutputToGraphNodeOutputMap, processorOrTokenizerOutput);
    }

    return processorOrTokenizerOutput;
}

export class SkymelECGraphNodeForTransformerJSProcessing extends SkymelECGraphNodeForDataProcessing {
    static TRANSFORMERSJS_TOKENIZER = 1;
    static TRANSFORMERSJS_PROCESSOR = 2;

    static TRANSFORMERSJS_TOKENIZER_ENCODE = 1;
    static TRANSFORMERSJS_TOKENIZER_APPLY_CHAT_TEMPLATE_AND_ENCODE = 2;
    static TRANSFORMERSJS_TOKENIZER_DECODE = 3;
    static TRANSFORMERSJS_TOKENIZER_DECODE_AND_PARSE_CHAT_TEMPLATE = 4;
    static TRANSFORMERSJS_PROCESSOR_TRANSFORM = 5;

    constructor(initializationOptions) {
        initializationOptions['nodeSubroutine'] = runTransformerJSDataProcessing;
        super(initializationOptions);
        this.tokenizerId = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'tokenizerId', null);
        this.processorId = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'processorId', null);
        this.processorOrTokenizerActionType = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'processorOrTokenizerActionType', null);
        this.defaultProcessorOrTokenizerExtraOptions = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'defaultProcessorOrTokenizerExtraOptions', null);

        if (CommonValidators.isEmpty(this.processorOrTokenizerActionType)) {
            this.processorOrTokenizerActionType = CommonValidators.isEmpty(this.tokenizerId) ? SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_PROCESSOR_TRANSFORM : SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER_ENCODE;
        }

        this.loadedProcessor = null;
        this.loadedTokenizer = null;
    }

    getNodeType() {
        return SkymelECGraphUtils.NODE_TYPE_TRANSFORMERJS_PROCESSOR;
    }

    isValidProcessorId() {
        return CommonValidators.isNonEmptyString(this.processorId);
    }

    isValidTokenizerId() {
        return CommonValidators.isNonEmptyString(this.tokenizerId);
    }

    async getLoadedProcessor() {
        if (CommonValidators.isEmpty(this.loadedProcessor)) {
            this.loadedProcessor = await TransformersJSProcessorLoader.getProcessorById(this.processorId);
        }
        return this.loadedProcessor;
    }

    async getLoadedTokenizer() {
        if (CommonValidators.isEmpty(this.loadedTokenizer)) {
            this.loadedTokenizer = await TransformersJSProcessorLoader.getTokenizerById(this.tokenizerId);
        }
        return this.loadedTokenizer;
    }

    async getLoadedProcessorOrTokenizer() {
        if (this.isValidProcessorId()) {
            return await this.getLoadedProcessor();
        }
        if (this.isValidTokenizerId()) {
            return await this.getLoadedTokenizer();
        }
        return null;
    }

    getLoadedProcessorOrTokenizerType() {
        if (!CommonValidators.isEmpty(this.loadedProcessor)) {
            return SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_PROCESSOR;
        }
        if (!CommonValidators.isEmpty(this.loadedTokenizer)) {
            return SkymelECGraphNodeForTransformerJSProcessing.TRANSFORMERSJS_TOKENIZER;
        }
        return null;
    }

    getProcessorOrTokenizerActionType() {
        return this.processorOrTokenizerActionType;
    }

    getDefaultProcessorOrTokenizerExtraOptions() {
        return this.defaultProcessorOrTokenizerExtraOptions;
    }
}