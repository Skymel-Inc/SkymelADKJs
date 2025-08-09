import {SkymelECGraphNode} from "./skymel_execution_control_graph_node.js";
import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";

const getRepeatedElementsArray = function (element, numberOfRepeats) {
    let output = [];
    for (let i = 0; i < numberOfRepeats; ++i) {
        output.push(element);
    }
    return output;
}

const getIncreasingElementsArray = function (start, numberOfIncrements) {
    let output = [];
    for (let i = 0; i < numberOfIncrements; ++i) {
        output.push(start + i);
    }
    return output;
}

const getKeyValueTensorDescription = function (flatArrayInputOrTensorDict, numAttentionHeads, embeddingPerAttentionHeadCount, dtype = null, batchSize = 1) {
    let lengthOfFlatArray = SkymelECGraphUtils.getElementLengthFromArrayOrTensorDict(flatArrayInputOrTensorDict);
    if (CommonValidators.isEmpty(lengthOfFlatArray)) {
        lengthOfFlatArray = 0;
    }
    let sequenceLength = lengthOfFlatArray / (batchSize * numAttentionHeads * embeddingPerAttentionHeadCount);
    if (CommonValidators.isEmpty(dtype)) {
        dtype = SkymelECGraphUtils.getElementDtypeFromArrayOrTensorDict(flatArrayInputOrTensorDict);
    }
    return SkymelECGraphUtils.getTensorDescription(dtype, [batchSize, numAttentionHeads, sequenceLength, embeddingPerAttentionHeadCount]);
}

const maybeAddPastKeyValueEntriesToOutput = function (nodeReference, inputNodeResultsDict, returnWhetherPastKeyValuesAreNonEmpty = true, keyNameForWhetherPastKeyValuesAreNonEmpty = 'containsNonEmptyPastKeyValue') {

    const pastKeyValueInputKeyNames = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getListOfPastKeyValueKeyNames() : null;
    const pastKeyValueInputValueNames = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getListOfPastKeyValueValueNames() : null;
    const pastKeyValueInputNamesNodeIdPrefix = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getPastKeyValueInputNamesNodeIdPrefix() : null;
    const pastKeyValueInputNamesInNodeInputToOutputNamesMap = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getGeneratedPastKeyValueOutputNamesMap() : null;
    let containsNonEmptyPastKeyValue = false;

    let output = {};
    if (!CommonValidators.isEmpty(pastKeyValueInputValueNames) && !CommonValidators.isEmpty(pastKeyValueInputKeyNames) && pastKeyValueInputKeyNames.length === pastKeyValueInputValueNames.length) {
        for (let i = 0; i < pastKeyValueInputValueNames.length; ++i) {
            const currentKeyInputName = (pastKeyValueInputNamesNodeIdPrefix !== null) ? pastKeyValueInputNamesNodeIdPrefix + pastKeyValueInputKeyNames[i] : pastKeyValueInputKeyNames[i];
            const currentKeyOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(pastKeyValueInputNamesInNodeInputToOutputNamesMap, currentKeyInputName, null);

            const currentValueInputName = (pastKeyValueInputNamesNodeIdPrefix !== null) ? pastKeyValueInputNamesNodeIdPrefix + pastKeyValueInputValueNames[i] : pastKeyValueInputValueNames[i];
            const currentValueOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(pastKeyValueInputNamesInNodeInputToOutputNamesMap, currentValueInputName, null);

            if (CommonValidators.isEmpty(currentKeyOutputName) || CommonValidators.isEmpty(currentValueOutputName)) {
                continue;
            }

            output[currentKeyOutputName] = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(inputNodeResultsDict, currentKeyInputName, []);
            output[currentValueOutputName] = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(inputNodeResultsDict, currentValueInputName, []);
            if (!CommonValidators.isEmpty(output[currentKeyOutputName]) || !CommonValidators.isEmpty(output[currentValueOutputName])) {
                containsNonEmptyPastKeyValue = true;
            }
        }
    }
    if (returnWhetherPastKeyValuesAreNonEmpty && CommonValidators.isNonEmptyString(keyNameForWhetherPastKeyValuesAreNonEmpty)) {
        output[keyNameForWhetherPastKeyValuesAreNonEmpty] = containsNonEmptyPastKeyValue;
    }
    return output;
}

const maybeAddPastKeyValueEntriesTensorFormattingDetails = function (nodeReference, currentNodeOutputNameToValuesDict) {

    const pastKeyValueInputKeyNames = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getListOfPastKeyValueKeyNames() : null;
    const pastKeyValueInputValueNames = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getListOfPastKeyValueValueNames() : null;
    const pastKeyValueInputNamesNodeIdPrefix = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getPastKeyValueInputNamesNodeIdPrefix() : null;
    const pastKeyValueInputNamesInNodeInputToOutputNamesMap = nodeReference.isGenerationOfPastKeyValuesRequired() ? nodeReference.getGeneratedPastKeyValueOutputNamesMap() : null;

    let output = {};

    if (!CommonValidators.isEmpty(pastKeyValueInputValueNames) && !CommonValidators.isEmpty(pastKeyValueInputKeyNames) && pastKeyValueInputKeyNames.length === pastKeyValueInputValueNames.length) {
        for (let j = 0; j < pastKeyValueInputKeyNames.length; ++j) {
            const currentKeyInputName = (pastKeyValueInputNamesNodeIdPrefix !== null) ? pastKeyValueInputNamesNodeIdPrefix + pastKeyValueInputKeyNames[j] : pastKeyValueInputKeyNames[j];
            const currentKeyOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(pastKeyValueInputNamesInNodeInputToOutputNamesMap, currentKeyInputName, null);

            const currentValueInputName = (pastKeyValueInputNamesNodeIdPrefix !== null) ? pastKeyValueInputNamesNodeIdPrefix + pastKeyValueInputValueNames[j] : pastKeyValueInputValueNames[j];
            const currentValueOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(pastKeyValueInputNamesInNodeInputToOutputNamesMap, currentValueInputName, null);
            if (currentKeyOutputName in currentNodeOutputNameToValuesDict) {
                if (SkymelECGraphUtils.isTensorDict(currentNodeOutputNameToValuesDict[currentKeyOutputName])) {
                    output[currentKeyOutputName] = SkymelECGraphUtils.extractTensorDescriptionFromTensorDict(currentNodeOutputNameToValuesDict[currentKeyOutputName]);
                } else {
                    output[currentKeyOutputName] = getKeyValueTensorDescription(currentNodeOutputNameToValuesDict[currentKeyOutputName], nodeReference.getNumberOfAttentionHeads(), nodeReference.getEmbeddingSizePerAttentionHead(), SkymelECGraphUtils.TENSOR_TYPE_FLOAT32);

                }
            }
            if (currentValueOutputName in currentNodeOutputNameToValuesDict) {
                if (SkymelECGraphUtils.isTensorDict(currentNodeOutputNameToValuesDict[currentValueOutputName])) {
                    output[currentValueOutputName] = SkymelECGraphUtils.extractTensorDescriptionFromTensorDict(currentNodeOutputNameToValuesDict[currentValueOutputName]);
                } else {
                    output[currentValueOutputName] = getKeyValueTensorDescription(currentNodeOutputNameToValuesDict[currentValueOutputName], nodeReference.getNumberOfAttentionHeads(), nodeReference.getEmbeddingSizePerAttentionHead(), SkymelECGraphUtils.TENSOR_TYPE_FLOAT32);
                }
            }
        }
    }
    return output;
}

const isTruncatedFieldGivenCurrentPastKeyValueEntries = function (fieldName, nodeReference, isNonEmptyPastKeyValuePresent) {
    const setOfTruncatedFields = nodeReference.getFieldsToTruncateOnNonEmptyPastKeyValues();
    if (CommonValidators.isEmpty(setOfTruncatedFields)) {
        return false;
    }
    return setOfTruncatedFields.has(fieldName) && isNonEmptyPastKeyValuePresent;
}

const runLLMInputGenerator = async function (graphReference, inputNodeResultsDict, nodeReference) {
    const tokenIdInputName = nodeReference.getNodeInputNameForTokenIds();
    if (!CommonValidators.isNotEmptyDictAndHasKey(inputNodeResultsDict, tokenIdInputName)) {
        return null;
    }
    const tokenIds = inputNodeResultsDict[tokenIdInputName];
    let output = {};

    let outputWithPossiblePastKeyValueEntries = maybeAddPastKeyValueEntriesToOutput(nodeReference, inputNodeResultsDict);
    let containsNonEmptyPastKeyValues = false;
    if (CommonValidators.isNotEmptyDictAndHasKey(outputWithPossiblePastKeyValueEntries, 'containsNonEmptyPastKeyValue')) {
        containsNonEmptyPastKeyValues = outputWithPossiblePastKeyValueEntries['containsNonEmptyPastKeyValue'];
        delete outputWithPossiblePastKeyValueEntries['containsNonEmptyPastKeyValue'];
    }
    if (!CommonValidators.isEmpty(outputWithPossiblePastKeyValueEntries)) {
        Object.assign(output, outputWithPossiblePastKeyValueEntries);
    }

    const tokenIdsOutputName = nodeReference.getGeneratedTokenIdsOutputName();
    if (CommonValidators.isNonEmptyString(tokenIdsOutputName)) {
        output[tokenIdsOutputName] = isTruncatedFieldGivenCurrentPastKeyValueEntries(tokenIdsOutputName, nodeReference, containsNonEmptyPastKeyValues) ? (CommonValidators.isEmpty(tokenIds) ? [] : [tokenIds.at(-1)]) : tokenIds;
    }

    const attentionMaskName = nodeReference.getGeneratedAttentionMaskOutputName();
    if (CommonValidators.isNonEmptyString(attentionMaskName)) {
        output[attentionMaskName] = isTruncatedFieldGivenCurrentPastKeyValueEntries(attentionMaskName, nodeReference, containsNonEmptyPastKeyValues) ? (CommonValidators.isEmpty(tokenIds) ? [] : [1]) : getRepeatedElementsArray(1, tokenIds.length);
    }
    const positionIdsName = nodeReference.getGeneratedPositionIdsOutputName();
    if (CommonValidators.isNonEmptyString(positionIdsName)) {
        output[positionIdsName] = isTruncatedFieldGivenCurrentPastKeyValueEntries(positionIdsName, nodeReference, containsNonEmptyPastKeyValues) ? (CommonValidators.isEmpty(tokenIds) ? [] : [tokenIds.length - 1]) : getIncreasingElementsArray(0, tokenIds.length);
    }

    const downstreamNodeIds = nodeReference.getNodeIdsToGenerateInputTensorFormattingDetailsFor();
    if (!CommonValidators.isEmpty(downstreamNodeIds)) {
        let executionConfig = graphReference.getGraphExecutionConfig();

        for (let i = 0; i < downstreamNodeIds.length; ++i) {
            const downstreamNodeId = downstreamNodeIds[i];
            let downstreamModelInputFormattingDetails = {};

            if (!CommonValidators.isEmpty(tokenIdsOutputName)) {
                downstreamModelInputFormattingDetails[tokenIdsOutputName] = SkymelECGraphUtils.getTensorDescription(SkymelECGraphUtils.TENSOR_TYPE_INT64, [1, output[tokenIdsOutputName].length]);
            }
            if (!CommonValidators.isEmpty(attentionMaskName)) {
                downstreamModelInputFormattingDetails[attentionMaskName] = SkymelECGraphUtils.getTensorDescription(SkymelECGraphUtils.TENSOR_TYPE_INT64, [1, output[attentionMaskName].length]);
            }
            if (!CommonValidators.isEmpty(positionIdsName)) {
                downstreamModelInputFormattingDetails[positionIdsName] = SkymelECGraphUtils.getTensorDescription(SkymelECGraphUtils.TENSOR_TYPE_INT64, [1, output[positionIdsName].length]);
            }
            const possibleTensorFormattingDetailsForPastKeyValues = maybeAddPastKeyValueEntriesTensorFormattingDetails(nodeReference, output);
            if (!CommonValidators.isEmpty(possibleTensorFormattingDetailsForPastKeyValues)) {
                Object.assign(downstreamModelInputFormattingDetails, possibleTensorFormattingDetailsForPastKeyValues);
            }

            executionConfig = SkymelECGraphUtils.setNodeSpecificInfoInGraphExecutionConfig(executionConfig, downstreamNodeId, SkymelECGraphUtils.RUNTIME_MODEL_INPUT_INFO_TENSOR_FORMATTING_DETAILS, downstreamModelInputFormattingDetails);
        }
        graphReference.setGraphExecutionConfig(executionConfig);
    }
    return output;
}

export class SkymelECGraphNodeForLLMInputPrep extends SkymelECGraphNode {
    constructor(initializationOptions) {
        initializationOptions['nodeSubroutine'] = runLLMInputGenerator;
        super(initializationOptions);

        this.nodeInputNameForTokenIds = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'nodeInputNameForTokenIds', null);

        this.generateTokenIdsAsOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'generateTokenIdsAsOutputName', null);
        this.generateAttentionMaskAsOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'generateAttentionMaskAsOutputName', null);
        this.generatePositionIdsAsOutputName = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'generatePositionIdsAsOutputName', null);
        this.generatePastKeyValuesAsOutputNames = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'generatePastKeyValuesAsOutputNames', null);

        this.generateInputTensorFormattingDetailsForNodeIds = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'generateInputTensorFormattingDetailsForNodeIds', null);

        this.numberOfAttentionHeads = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'numberOfAttentionHeads', null);
        this.embeddingSizePerAttentionHead = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'embeddingSizePerAttentionHead', null);

        this.generatePastKeyValues = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'generatePastKeyValues', null);
        this.numberOfPastKeyValues = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'numberOfPastKeyValues', null);
        this.pastKeyValueKeyNameGeneratorPrefix = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'pastKeyValueKeyNameGeneratorPrefix', 'pastKeyValueKey');
        this.pastKeyValueValueNameGeneratorPrefix = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'pastKeyValueValueNameGeneratorPrefix', 'pastKeyValueValue');
        this.pastKeyValueInputNamesNodeIdPrefix = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'pastKeyValueInputNamesNodeIdPrefix', '');

        this.fieldsToTruncateOnNonEmptyPastKeyValues = new Set(CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'fieldsToTruncateOnNonEmptyPastKeyValues', ''));
    }

    getNodeType() {
        return SkymelECGraphUtils.NODE_TYPE_LLM_INPUT_PREPARER;
    }

    getNodeInputNameForTokenIds() {
        return this.nodeInputNameForTokenIds;
    }

    getGeneratedTokenIdsOutputName() {
        return this.generateTokenIdsAsOutputName;
    }

    getGeneratedAttentionMaskOutputName() {
        return this.generateAttentionMaskAsOutputName;
    }

    getGeneratedPositionIdsOutputName() {
        return this.generatePositionIdsAsOutputName;
    }

    getNodeIdsToGenerateInputTensorFormattingDetailsFor() {
        return this.generateInputTensorFormattingDetailsForNodeIds;
    }

    isGenerationOfPastKeyValuesRequired() {
        return this.generatePastKeyValues;
    }

    getNumberOfPastKeyValues() {
        return this.numberOfPastKeyValues;
    }

    getNumberOfAttentionHeads() {
        return this.numberOfAttentionHeads;
    }

    getEmbeddingSizePerAttentionHead() {
        return this.embeddingSizePerAttentionHead;
    }

    getListOfPastKeyValueKeyNames() {
        const numKeys = this.getNumberOfPastKeyValues();
        if (CommonValidators.isEmpty(numKeys)) {
            return [];
        }
        let output = [];
        for (let i = 0; i < numKeys; ++i) {
            const currentEntry = this.pastKeyValueKeyNameGeneratorPrefix + i;
            output.push(currentEntry);
        }
        return output;
    }

    getListOfPastKeyValueValueNames() {
        const numKeys = this.getNumberOfPastKeyValues();
        if (CommonValidators.isEmpty(numKeys)) {
            return [];
        }
        let output = [];
        for (let i = 0; i < numKeys; ++i) {
            const currentEntry = this.pastKeyValueValueNameGeneratorPrefix + i;
            output.push(currentEntry);
        }
        return output;
    }

    getPastKeyValueInputNamesNodeIdPrefix() {
        return this.pastKeyValueInputNamesNodeIdPrefix;
    }

    getGeneratedPastKeyValueOutputNamesMap() {
        return this.generatePastKeyValuesAsOutputNames;
    }

    getFieldsToTruncateOnNonEmptyPastKeyValues() {
        return this.fieldsToTruncateOnNonEmptyPastKeyValues;
    }
}