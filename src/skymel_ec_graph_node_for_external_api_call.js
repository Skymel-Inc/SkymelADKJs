import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphNodeUtils} from "./skymel_ec_graph_node_utils.js";
import {SkymelECGraphNodeForDataProcessing} from "./skymel_ec_graph_node_for_data_processing.js";
import {RemoteApiCaller} from "./remote_api_caller.js";


const addNodePrivateAttributesToFeedDict = function (feedDict, nodePrivateAttributeNamesToValuesMap) {
    if (CommonValidators.isEmpty(nodePrivateAttributeNamesToValuesMap) || !CommonValidators.isDict(nodePrivateAttributeNamesToValuesMap)) {
        return feedDict;
    }
    for (const keyName in nodePrivateAttributeNamesToValuesMap) {
        if (keyName in feedDict) {
            continue;
        }
        feedDict[keyName] = nodePrivateAttributeNamesToValuesMap[keyName];
    }
    return feedDict;
}

const renameNodeInputNameToBackendInputName = function (feedDict, nodeInputNameToBackendInputNameMap) {
    if (CommonValidators.isEmpty(feedDict) || !CommonValidators.isDict(feedDict)) {
        return null;
    }
    if (CommonValidators.isEmpty(nodeInputNameToBackendInputNameMap) || !CommonValidators.isDict(nodeInputNameToBackendInputNameMap)) {
        return feedDict;
    }
    let outputDict = {};
    for (const keyName in feedDict) {
        if (keyName in nodeInputNameToBackendInputNameMap) {
            outputDict[nodeInputNameToBackendInputNameMap[keyName]] = feedDict[keyName];
        } else {
            outputDict[keyName] = feedDict[keyName];
        }
    }
    return outputDict;
}

const renameBackendOutputNameToNodeOutputName = function (feedDict, backendOutputNameToNodeOutputNameMap) {
    return renameNodeInputNameToBackendInputName(feedDict, backendOutputNameToNodeOutputNameMap);
}

const updateNodePrivateAttributesFromExternalApiResponse = function (responseDict, nodeReference) {
    const nodePrivateAttributesAndValuesMap = nodeReference.getAllNodePrivateAttributesAndValuesMap();
    if (CommonValidators.isEmpty(nodePrivateAttributesAndValuesMap) || !CommonValidators.isDict(nodePrivateAttributesAndValuesMap)) {
        return;
    }
    if (CommonValidators.isEmpty(responseDict) || !CommonValidators.isDict(responseDict)) {
        return;
    }
    for (const keyName in nodePrivateAttributesAndValuesMap) {
        if (keyName in responseDict) {
            console.log("Updating node private attribute '" + keyName + "' to value '" + responseDict[keyName] + "'");
            nodeReference.setNodePrivateAttributeValue(keyName, responseDict[keyName]);
        }
    }
}

const callRemoteApiEndpoint = async function (graphReference, inputNodeResultsDict, nodeReference) {
    const nodeInputNames = nodeReference.getInputNames();
    const keyNamesToDefaultValuesMap = nodeReference.getInputNamesToDefaultValueMap();

    // Filter the node inputs to create the feedDict
    let feedDict = SkymelECGraphNodeUtils.getFilteredNameToValuesDict(inputNodeResultsDict, nodeInputNames, keyNamesToDefaultValuesMap, /*errorIfKeyNameIsMissing=*/true);
    console.log("Feed dict:", feedDict);
    let nodePrivateAttributes = nodeReference.getAllNodePrivateAttributesAndValuesMap();
    // Now add all the node private attributes to the feed dict
    feedDict = addNodePrivateAttributesToFeedDict(feedDict, nodePrivateAttributes);

    let nodeInputNameToBackendInputNameMap = nodeReference.getNodeInputNameToBackendInputNameMap();
    feedDict = renameNodeInputNameToBackendInputName(feedDict, nodeInputNameToBackendInputNameMap);

    const remoteApiCaller = nodeReference.getRemoteApiCaller();
    let remoteApiCallResult = await remoteApiCaller.callExternalApiEndpointUrl(feedDict);
    if (CommonValidators.isEmpty(remoteApiCallResult)) {
        return null;
    }
    console.log("Remote API call result:", remoteApiCallResult);
    let remoteApiCallResultAsDict = SkymelECGraphNodeUtils.convertInferenceResponseProtoToDict(remoteApiCallResult, true);
    console.log("Remote API call result as dict:", remoteApiCallResultAsDict);
    let backendOutputNameToNodeOutputNameMap = nodeReference.getBackendOutputNameToNodeOutputNameMap();
    remoteApiCallResultAsDict = renameBackendOutputNameToNodeOutputName(remoteApiCallResultAsDict, backendOutputNameToNodeOutputNameMap);

    if (!CommonValidators.isEmpty(remoteApiCallResultAsDict)) {
        updateNodePrivateAttributesFromExternalApiResponse(remoteApiCallResultAsDict, nodeReference);
    }
    console.log("Remote API call result as dict after renaming:", remoteApiCallResultAsDict);
    return remoteApiCallResultAsDict;
}

export class SkymelECGraphNodeForExternalApiCall extends SkymelECGraphNodeForDataProcessing {

    static isValidInitializationOptions(initializationOptions) {
        if (CommonValidators.isEmpty(initializationOptions) || !CommonValidators.isDict(initializationOptions)) {
            return false;
        }
        if (!('endpointUrl' in initializationOptions)) {
            return false;
        }
        return true;
    }

    constructor(initializationOptions) {
        if (!SkymelECGraphNodeForExternalApiCall.isValidInitializationOptions(initializationOptions)) {
            throw new Error(
                "Invalid initialization options for SkymelECGraphNodeForExternalApiCall. " +
                "Expected initializationOptions to be a dict with keys 'endpointUrl'." +
                "Got initializationOptions = " + JSON.stringify(initializationOptions)
            );
        }

        initializationOptions['nodeSubroutine'] = callRemoteApiEndpoint;
        super(initializationOptions);
        this.endpointUrl = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "endpointUrl", null);
        this.nodePrivateAttributesAndValues = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodePrivateAttributesAndValues", {});
        this.nodeInputNameToBackendInputNameMap = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeInputNameToBackendInputNameMap", {});
        this.backendOutputNameToNodeOutputNameMap = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "backendOutputNameToNodeOutputNameMap", {});
        this.isEndpointWebSocketUrl = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "isEndpointWebSocketUrl", false);
        this.remoteApiCaller = null;
    }

    getNodeInputNameToBackendInputNameMap() {
        return this.nodeInputNameToBackendInputNameMap;
    }

    getBackendOutputNameToNodeOutputNameMap() {
        return this.backendOutputNameToNodeOutputNameMap;
    }

    getRemoteApiCallEndpointUrl() {
        return this.endpointUrl;
    }

    getAllNodePrivateAttributesAndValuesMap() {
        return this.nodePrivateAttributesAndValues;
    }

    setAllNodePrivateAttributesAndValuesMap(nodePrivateAttributesAndValuesMap) {
        if (CommonValidators.isEmpty(nodePrivateAttributesAndValuesMap)) {
            return;
        }
        this.nodePrivateAttributesAndValues = nodePrivateAttributesAndValuesMap;
    }

    getNodePrivateAttributeValue(attributeName) {
        return CommonValidators.isNotEmptyDictAndHasKey(this.nodePrivateAttributesAndValues, attributeName, null);
    }

    setNodePrivateAttributeValue(attributeName, attributeValue) {
        this.nodePrivateAttributesAndValues[attributeName] = attributeValue;
    }

    removeNodePrivateAttributeByName(attributeName) {
        if (CommonValidators.isNotEmptyDictAndHasKey(this.nodePrivateAttributesAndValues, attributeName)) {
            delete this.nodePrivateAttributesAndValues[attributeName];
            return true;
        }
        return false;
    }

    getRemoteApiCaller() {
        if (CommonValidators.isEmpty(this.remoteApiCaller)) {
            this.remoteApiCaller = new RemoteApiCaller({
                endpointUrl: this.endpointUrl,
                isEndpointWebSocketUrl: this.isEndpointWebSocketUrl
            });
        }
        return this.remoteApiCaller;
    }
}