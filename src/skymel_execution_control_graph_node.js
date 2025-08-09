import {CommonValidators} from "./common_validators.js";
import {CommonHashUtils} from "./common_hash_utils.js";

export class SkymelECGraphNode {
    constructor(initializationOptions) {

        //nodeId, nodeInputs = null, nodeSubroutine = null, nodeOutputs = null
        const nodeId = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeId", SkymelECGraphNode.generateNodeId());
        this.setNodeId(nodeId);
        const nodeInputNames = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeInputNames", null);
        this.setInputNames(nodeInputNames);

        const nodeInputNamesToDefaultValueMap = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeInputNamesToDefaultValueMap", null);
        this.setInputNamesToDefaultValueMap(nodeInputNamesToDefaultValueMap);

        const nodeSubroutine = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeSubroutine", null);
        if (!CommonValidators.isEmpty(nodeSubroutine) && CommonValidators.isMethod(nodeSubroutine)) {
            this.setSubroutine(nodeSubroutine);
        } else {
            const errorString = CommonValidators.isEmpty(nodeSubroutine) ? "Empty value provided for nodeSubroutine in node : " + this.getNodeId() : !CommonValidators.isMethod(nodeSubroutine) ? "Non-function value or variable provided for nodeSubroutine in node : " + this.getNodeId() : "Error in nodeSubroutine specified  for  : " + this.getNodeId();
            throw new Error(errorString);
        }
        const nodeOutputNames = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeOutputNames", ['defaultOutput']);
        this.setOutputNames(nodeOutputNames);

        this.nodeLogErrors = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, "nodeLogErrors", false);

        this.executionTimingsMilliseconds = [];
        this.executionSuccessfulRunStatuses = [];
        this.lastExecutionResult = null;
        this.loggedErrors = [];

        this.onExecutionCompleteCallback = null;
    }

    static generateNodeId(nodeIdPrefix = null, nodeIdSuffix = null) {
        return CommonHashUtils.generateUniqueId(nodeIdPrefix, nodeIdSuffix);
    }

    static isValidNodeOutputName(outputName) {
        return typeof outputName === 'string' && outputName.length > 0 && /^(([a-zA-Z0-9_]+)\.)+([a-zA-Z0-9_]+)$/.test(outputName);
    }

    static getNodeIdFromOutputName(outputName) {
        if (!SkymelECGraphNode.isValidNodeOutputName(outputName)) {
            return null;
        }
        let parts = outputName.split('.');
        parts.pop();
        return parts.join(".");
    }


    getNodeId() {
        return this.nodeId;
    }

    setNodeId(nodeId) {
        this.nodeId = nodeId.toString();
    }

    getInputNames() {
        return this.nodeInputNames;
    }

    setInputNames(nodeInputs) {
        this.nodeInputNames = nodeInputs;
    }

    getInputNamesToDefaultValueMap() {
        return this.nodeInputNamesToDefaultValueMap;
    }

    setInputNamesToDefaultValueMap(inputNamesToDefaultValueMap) {
        this.nodeInputNamesToDefaultValueMap = inputNamesToDefaultValueMap;
    }

    isValidInputNames(inputNames, referenceToGraph = null) {
        if (!Array.isArray(inputNames) || inputNames.length === 0) {
            return false;
        }
        for (let x = 0; x < inputNames.length; ++x) {
            const nodeInputName = inputNames[x];
            if (!SkymelECGraphNode.isValidNodeOutputName(nodeInputName)) {
                return false;
            }
        }
        if (referenceToGraph !== null) {
            return referenceToGraph.containsNodeOutputNames(inputNames);
        }
        return true;
    }

    isValidOutputNames(outputNames, referenceToGraph = null) {
        if (!Array.isArray(outputNames) || outputNames.length === 0) {
            return false;
        }
        for (let x = 0; x < outputNames.length; ++x) {
            const nodeOutputName = outputNames[x];
            if (!SkymelECGraphNode.isValidNodeOutputName(nodeOutputName)) {
                return false;
            }
            if (this.getNodeId() !== SkymelECGraphNode.getNodeIdFromOutputName(nodeOutputName)) {
                return false;
            }
            if (!this.containsNodeOutputName(nodeOutputName)) {
                return false;
            }
        }

        if (referenceToGraph !== null) {
            return referenceToGraph.containsNodeOutputNames(outputNames);
        }
        return true;
    }

    getOutputNames() {
        return this.nodeOutputNames;
    }

    __makeOutputNamesFromArray(nodeOutputs) {
        let outputNames = [];
        for (let x = 0; x < nodeOutputs.length; ++x) {
            const outputName = this.getNodeId() + "." + nodeOutputs[x].toString();
            outputNames.push(outputName);
        }
        return outputNames;
    }

    __makeOutputNamesFromDict(nodeOutputs) {
        let outputNames = [];
        for (let x in nodeOutputs) {
            const outputName = this.getNodeId() + "." + x.toString();
        }
        return outputNames;
    }

    setOutputNames(nodeOutputNames) {
        let nodeOutputNamesArray = [];
        if (CommonValidators.isEmpty(nodeOutputNames)) {
            nodeOutputNamesArray.push(this.getNodeId() + ".defaultOutput");
        }
        if (Array.isArray(nodeOutputNames)) {
            nodeOutputNamesArray = this.__makeOutputNamesFromArray(nodeOutputNames);
        } else if (typeof nodeOutputNames === "object" && Object.keys(nodeOutputNames).length > 0) {
            nodeOutputNamesArray = this.__makeOutputNamesFromDict(nodeOutputNames);
        }
        this.nodeOutputNames = nodeOutputNamesArray;
    }

    getSubroutine() {
        return this.nodeSubroutine;
    }


    /**
     *
     * @param nodeSubroutine a method that takes as parameters `graphReference`, `inputNodeResultsDict`,
     * and `referenceToCurrentNode`
     */
    setSubroutine(nodeSubroutine) {
        this.nodeSubroutine = nodeSubroutine;
    }


    addExecutionTiming(executionTimeMilliseconds) {
        this.executionTimingsMilliseconds.push(executionTimeMilliseconds);
    }

    static __isDict(obj) {
        if (obj === null || typeof obj === 'undefined') {
            return false;
        }
        if (Array.isArray(obj)) {
            return false;
        }
        if (typeof obj === 'object' && Object.keys(obj).length > 0) {
            return true;
        }
        return false;
    }

    static __isArray(obj) {
        if (obj === null || typeof obj === 'undefined') {
            return false;
        }
        if (Array.isArray(obj)) {
            return true;
        }
        return false;
    }

    __matchArrayToOutputNamesAndMakeResultsDict(arrayResults, nodeOutputNames) {
        let outputDict = {};
        if (arrayResults.length !== nodeOutputNames.length) {
            for (let x = 0; x < nodeOutputNames.length; ++x) {
                outputDict[nodeOutputNames[x]] = (x === 0) ? arrayResults : null;
            }
        } else {
            for (let x = 0; x < nodeOutputNames.length; ++x) {
                outputDict[nodeOutputNames[x]] = arrayResults[x];
            }
        }
        return outputDict;
    }

    __makeNodeResultsOutputDict(nodeOutputResults) {
        if (SkymelECGraphNode.__isArray(nodeOutputResults)) {
            return this.__matchArrayToOutputNamesAndMakeResultsDict(nodeOutputResults, this.getOutputNames());
        }
        if (!SkymelECGraphNode.__isDict(nodeOutputResults)) {
            return this.__matchArrayToOutputNamesAndMakeResultsDict([nodeOutputResults], this.getOutputNames());
        }
        let nodeOutputDict = {};
        const nodeOutputNames = this.getOutputNames();
        for (let x = 0; x < nodeOutputNames.length; ++x) {
            const nodeOutputName = nodeOutputNames[x];
            if (!(nodeOutputName in nodeOutputResults)) {
                nodeOutputDict[nodeOutputName] = null;
                continue;
            }
            nodeOutputDict[nodeOutputName] = nodeOutputResults[nodeOutputName];
        }
        return nodeOutputDict;
    }

    __logError(errorObject) {
        this.loggedErrors.push(errorObject);
    }

    async dispose() {
        return true;
    }

    /**
     * Sets a callback method, which gets called upon successful and/or failed node execution (of this particular node).
     *
     * @param callback {function} The `callback` method takes as input parameters (in order) `graphReference`,
     * `nodeReference`, and `executionTerminatedWithError`. These parameters are described below:
     * 1. `graphReference` - Is the graph object that owns the node upon whose execution completion this method is being
     * called.
     * 2. `nodeReference` - Is the node object upon whose execution completion this method is being called.
     * 3. `executionTerminatedWithError` - Is a boolean which, if true, indicates that the node's execution failed.
     * Hence, the node's outputs may not be available.
     */
    setOnExecutionCompleteCallback(callback) {
        if (!CommonValidators.isMethod(callback)) {
            return;
        }
        this.onExecutionCompleteCallback = callback;
    }

    clearOnExecutionCompleteCallback() {
        this.onExecutionCompleteCallback = null;
    }

    hasOnExecutionCompleteCallback() {
        return !CommonValidators.isEmpty(this.onExecutionCompleteCallback) && CommonValidators.isMethod(this.onExecutionCompleteCallback);
    }

    async maybeRunOnExecutionCompleteCallback(graphReference, executionTerminatedWithError = false) {
        try {
            if (this.hasOnExecutionCompleteCallback()) {
                return await this.onExecutionCompleteCallback(this, graphReference, executionTerminatedWithError);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async execute(graphReference, nodeInputDict = null, measureExecutionTime = true) {
        const startTime = measureExecutionTime ? performance.now() : 0;
        try {
            const result = await this.getSubroutine()(graphReference, nodeInputDict, this);

            if (measureExecutionTime) {
                const endTime = performance.now();
                this.addExecutionTiming(endTime - startTime);
            }

            this.executionSuccessfulRunStatuses.push(true);
            this.lastExecutionResult = this.__makeNodeResultsOutputDict(result);

            await this.maybeRunOnExecutionCompleteCallback(graphReference, /*executionTerminatedWithError=*/false);
            return true;
        } catch (error) {
            console.log(error);
            console.log(error.stack);
            if (measureExecutionTime) {
                const endTime = performance.now();
                this.addExecutionTiming(endTime - startTime);
            }
            this.executionSuccessfulRunStatuses.push(false);
            this.lastExecutionResult = null;
            if (this.nodeLogErrors) {
                this.__logError(error);
            }
            await this.maybeRunOnExecutionCompleteCallback(graphReference, /*executionTerminatedWithError=*/true);
            return false;
        }
    }


    /**
     * In case the last execution succeeded and we have stored non-null `lastExecutionResult`, this method returns
     * either the raw result or a matched dict with entries matched to outputName(s) as keys.
     * @param forceMatchKeysToOutputNames if set to true, we try to find matching keys/values for all outputNames (as keys).
     * In case no matching key/value is found, we assign a null value to the outputName key. Default value is `true`
     * @returns a dictionary of results from the last execution
     */
    getLastExecutionResult(forceMatchKeysToOutputNames = true) {
        if (this.lastExecutionResult === null) {
            return null;
        }
        if (!forceMatchKeysToOutputNames) {
            return this.lastExecutionResult;
        }
        let output = {};
        const outputNames = this.getOutputNames();
        for (let x = 0; x < outputNames.length; ++x) {
            const outputName = outputNames[x];
            if (!(outputName in this.lastExecutionResult)) {
                output[outputName] = null;
                continue;
            }
            output[outputName] = this.lastExecutionResult[outputName];
        }
        return output;
    }


    getLastExecutionSuccessfulRunStatus() {
        if (this.executionSuccessfulRunStatuses.length === 0) {
            return null;
        }
        return this.executionSuccessfulRunStatuses[this.executionSuccessfulRunStatuses.length - 1];
    }

    getLastMeasuredExecutionTimeMilliseconds() {
        if (this.executionTimingsMilliseconds.length === 0) {
            return null;
        }
        return this.executionTimingsMilliseconds[this.executionTimingsMilliseconds.length - 1];
    }

    isNodeValid(referenceToGraph = null) {
        // A valid Node has to have a valid NodeId.
        // It may have a null nodeInputs
        // But it always must have a subroutine and nodeOutputs

        const nodeId = this.getNodeId();
        if (nodeId === null) {
            console.log("node not valid, nodeid",this );
            return false;
        }
        const nodeInputs = this.getInputNames();
        if (nodeInputs !== null && !this.isValidInputNames(nodeInputs, referenceToGraph)) {
            console.log("node not valid, input names",this );
            return false;
        }
        const nodeOutputs = this.getOutputNames();
        if (nodeOutputs === null || nodeOutputs.length === 0 || !this.isValidOutputNames(nodeOutputs, referenceToGraph)) {
            console.log("node not valid, output names",this )
            return false;
        }
        return this.nodeSubroutine !== null;
    }

    containsNodeOutputName(outputName) {
        return this.nodeOutputNames.includes(outputName);
    }

    containsNodeOutputNames(nodeOutputNames) {
        if (!Array.isArray(nodeOutputNames) || nodeOutputNames.length === 0) {
            return false;
        }
        const nodeOutputNamesSet = new Set(this.getOutputNames());
        for (let x = 0; x < nodeOutputNames.length; ++x) {
            const nodeOutputName = nodeOutputNames[x];
            if (!nodeOutputNamesSet.has(nodeOutputName)) {
                return false;
            }
        }
        return true;
    }

    getNodeIdsFromWhichThisNodeDerivesInputs() {
        if (this.getInputNames() === null) {
            return [];
        }
        let inputNodeIds = new Set();
        const inputNames = this.getInputNames();
        for (let i = 0; i < inputNames.length; ++i) {
            const nodeInputName = inputNames[i];
            inputNodeIds.add(SkymelECGraphNode.getNodeIdFromOutputName(nodeInputName));
        }
        return Array.from(inputNodeIds);
    }

    getAverageExecutionTimeMilliseconds(maxCountOfLastExecutionToAverageOver = 5) {
        if (this.executionTimingsMilliseconds.length === 0 || maxCountOfLastExecutionToAverageOver < 1) {
            return null;
        }
        let totalRunTimeMilliseconds = 0;
        let totalRunCount = 0;
        let x = this.executionTimingsMilliseconds.length - 1;

        while (x >= 0 && totalRunCount < maxCountOfLastExecutionToAverageOver) {
            ++totalRunCount;
            totalRunTimeMilliseconds += this.executionTimingsMilliseconds[x];
            --x;
        }
        if (totalRunCount === 0) {
            return null;
        }
        return totalRunTimeMilliseconds / totalRunCount;
    }
}