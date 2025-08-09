import {SkymelECGraphNodeForDataProcessing} from "./skymel_ec_graph_node_for_data_processing.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";
import {CommonValidators} from "./common_validators.js";


const getMaxLogitsIndex = function (logits) {
    if (CommonValidators.isEmpty(logits)) {
        return null;
    }
    let maxValue = logits[0];
    let maxIndex = 0;

    for (let i = 1; i < logits.length; ++i) {
        if (logits[i] > maxValue) {
            maxValue = logits[i];
            maxIndex = i;
        }
    }
    return maxIndex;
}

const getLastGeneratedLogitsSliceFromTensorDict = function (logitsTensor) {
    const shape = logitsTensor.shape;
    const data = logitsTensor.data;
    let output = [];

    if (!CommonValidators.isEmpty(shape) && !CommonValidators.isEmpty(data)) {
        const sliceSize = shape[shape.length - 1];
        const sliceStartIndex = data.length - sliceSize;
        const sliceEndIndex = data.length;
        for (let i = sliceStartIndex; i < sliceEndIndex; ++i) {
            output.push(data[i]);
        }
    }
    return output;
}

const getLastGeneratedLogitsSliceAsFlatArray = function (logits) {
    if (SkymelECGraphUtils.isTensorDict(logits)) {
        return getLastGeneratedLogitsSliceFromTensorDict(logits);
    }
    return logits;
}

const runLogitsGreedySearch = async function (graphReference, inputNodeResultsDict, nodeReference) {
    // console.log("Input to logits search :");
    // console.log(inputNodeResultsDict);

    // console.log("Logits search node input names : ");
    // console.log(nodeReference.getInputNames());

    const logitsInputName = nodeReference.getInputNames()[0];
    const tokenIdsInputName = nodeReference.getInputNames()[1];
    const tokenIdsArrayOutputName = nodeReference.getOutputNames()[0];

    // console.log("Logit search node output names:");
    // console.log(nodeReference.getOutputNames());

    // console.log("Prior Generated tokenIds:");
    // console.log(inputNodeResultsDict[tokenIdsInputName]);

    const alreadyGeneratedTokenIds = [...inputNodeResultsDict[tokenIdsInputName]];
    const logitsToSearch = inputNodeResultsDict[logitsInputName];
    // console.log("Logits to search :");
    // console.log(logitsToSearch);
    const lastLogitsSlice = getLastGeneratedLogitsSliceAsFlatArray(logitsToSearch);
    console.log("Got logits slice with length : ", lastLogitsSlice.length);
    // console.log("Last logits slice:");
    // console.log(lastLogitsSlice);
    const maxLogitsIndex = getMaxLogitsIndex(lastLogitsSlice);
    console.log("Index of the winning token : ", maxLogitsIndex);
    alreadyGeneratedTokenIds.push(maxLogitsIndex);
    // console.log("New tokenIds:");
    // console.log(alreadyGeneratedTokenIds);
    let result = {};
    result[tokenIdsArrayOutputName] = alreadyGeneratedTokenIds;
    // console.log(result);
    return result;
}

export class SkymelECGraphNodeForLLMLogitsGreedySearch extends SkymelECGraphNodeForDataProcessing {

    constructor(initializationOptions) {
        initializationOptions['nodeSubroutine'] = runLogitsGreedySearch;
        super(initializationOptions);
    }

    getNodeType() {
        return SkymelECGraphUtils.NODE_TYPE_LLM_OUTPUT_LOGITS_TO_TOKEN_ID_GREEDY_SEARCHER;
    }
}