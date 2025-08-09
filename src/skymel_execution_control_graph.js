import {SkymelECGraphNode} from "./skymel_execution_control_graph_node.js";
import {CommonGraphAlgorithms} from "./common_graph_algorithms.js";
import {CommonValidators} from "./common_validators.js";
import {CommonHashUtils} from "./common_hash_utils.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";

export class SkymelECGraph {

    constructor(initializationConfig) {
        this.nodeIdToObject = {};
        this.initializationConfig = initializationConfig;

        const graphId = CommonValidators.isNotEmptyDictAndHasKey(initializationConfig, 'graphId') && CommonValidators.isNonEmptyString(initializationConfig.graphId) ? initializationConfig.graphId : CommonHashUtils.generateUniqueId();

        this.externalInputNames = CommonValidators.isNotEmptyDictAndHasKey(initializationConfig, 'externalInputNames') && CommonValidators.isArray(initializationConfig.externalInputNames) ? new Set(initializationConfig.externalInputNames) : null;
        this.successCallback = CommonValidators.isNotEmptyDictAndHasKey(initializationConfig, 'successCallback') && CommonValidators.isMethod(initializationConfig.successCallback) ? initializationConfig.successCallback : null;
        this.errorCallback = CommonValidators.isNotEmptyDictAndHasKey(initializationConfig, 'errorCallback') && CommonValidators.isMethod(initializationConfig.errorCallback) ? initializationConfig.errorCallback : null;

        this.graphLastModifiedTimestamp = performance.now();
        this.setGraphId(graphId);
    }

    static isSkymelECGraphNodeInstance(inputObject) {
        return inputObject instanceof SkymelECGraphNode;
    }

    static isSkymelECGraphInstance(inputObject) {
        return inputObject instanceof SkymelECGraph;
    }

    setGraphId(graphId) {
        this.graphId = graphId.toString();
    }

    getGraphId() {
        return this.graphId;
    }

    getGraphType() {
        return SkymelECGraphUtils.GRAPH_TYPE_BASE;
    }

    getType() {
        return this.getGraphType();
    }

    getGraphLastModifiedTimestamp() {
        return this.graphLastModifiedTimestamp;
    }

    getInitializationConfig() {
        return this.initializationConfig;
    }


    /**
     * Adds a `SkymelECGraphNode` to the current `SkymelECGraph` and returns the `nodeId` string of the added node.
     * @param node Can be a fully formed `SkymelECGraphNode` object instance, or a dictionary object containing information required to initialize `SkymelECGraphNode`.
     * @returns {*}
     */
    addNode(node) {
        if (SkymelECGraph.isSkymelECGraphInstance(node)) {
            this.nodeIdToObject[node.getGraphId()] = node;
            return;
        }
        if (!SkymelECGraph.isSkymelECGraphNodeInstance(node)) {
            node = new SkymelECGraphNode(node);
        }
        this.nodeIdToObject[node.getNodeId()] = node;
        this.graphLastModifiedTimestamp = performance.now();
        return node.getNodeId();
    }

    getNodeById(nodeId) {
        if (CommonValidators.isNonEmptyString(nodeId)) {
            return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(this.nodeIdToObject, nodeId, null);
        }
        return null;
    }

    getListOfAllNodeIds() {
        return Object.keys(this.nodeIdToObject);
    }

    static isGraphIdPrefixForNodeId(nodeId) {
        return /^(([a-zA-Z0-9_]+)\.)([a-zA-Z0-9_]+)$/.test(nodeId);
    }

    static getGraphIdFromNodeIdWithGraphId(nodeIdWithGraphId) {
        let parts = nodeIdWithGraphId.split(".");
        return parts[0];
    }

    static getNodeIdFromNodeIdWithGraphId(nodeIdWithGraphId) {
        let parts = nodeIdWithGraphId.split(".");
        return parts[1];
    }

    static removeGraphIdFromOutputName(outputName) {
        let parts = outputName.split(".");
        return [parts[1], parts[2]].join(".");
    }

    containsNodeOutputNames(nodeOutputs) {
        if (!Array.isArray(nodeOutputs) || nodeOutputs.length === 0) {
            return false;
        }
        const externalInputsToGraph = CommonValidators.isEmpty(this.externalInputNames) ? new Set() : this.externalInputNames;
        for (let x = 0; x < nodeOutputs.length; ++x) {
            const nodeOutputName = nodeOutputs[x];
            if (externalInputsToGraph.has(nodeOutputName)) {
                continue;
            }
            const nodeId = SkymelECGraphNode.getNodeIdFromOutputName(nodeOutputName);
            if (SkymelECGraph.isGraphIdPrefixForNodeId(nodeId)) {
                const inputGraphId = SkymelECGraph.getGraphIdFromNodeIdWithGraphId(nodeId);
                if (!(inputGraphId in this.nodeIdToObject)) {
                    return false;
                }
                const externalGraphOutputName = SkymelECGraph.removeGraphIdFromOutputName(nodeOutputName);
                return this.nodeIdToObject[inputGraphId].containsNodeOutputNames([externalGraphOutputName]);
            }
            if (!(nodeId in this.nodeIdToObject)) {
                return false;
            }
            if (!this.nodeIdToObject[nodeId].containsNodeOutputName(nodeOutputName)) {
                return false;
            }
        }
        return true;
    }

    static isSet1SubSetOfSet2(set1, set2) {
        if (set1.size > set2.size) {
            return false;
        }
        for (let x of set1) {
            if (!set2.has(x)) {
                return false;
            }
        }
        return true;
    }

    getSetOfNodeIdsFromExternalInputNames() {
        if (CommonValidators.isEmpty(this.externalInputNames)) {
            return null;
        }
        let output = new Set();
        for (const value of this.externalInputNames) {
            const nodeId = SkymelECGraphNode.getNodeIdFromOutputName(value);
            output.add(nodeId);
        }
        return output;
    }

    async isGraphValid() {
        let setOfDependencies = new Set();
        for (let x in this.nodeIdToObject) {
            if (SkymelECGraph.isSkymelECGraphInstance(this.nodeIdToObject[x])) {
                const isExternalGraphValid = await this.nodeIdToObject[x].isGraphValid();
                if (!isExternalGraphValid) {
                    return false;
                }
                const externalGraphNodeIds = await this.nodeIdToObject[x].getOutputNodeIds();
                if (CommonValidators.isEmpty(externalGraphNodeIds)) {
                    continue;
                }
                const externalGraphId = this.nodeIdToObject[x].getGraphId();
                for (let i = 0; i < externalGraphNodeIds.length; ++i) {
                    setOfDependencies.add(externalGraphId + "." + externalGraphNodeIds[i]);
                }
                continue;
            }
            if (SkymelECGraph.isSkymelECGraphNodeInstance(this.nodeIdToObject[x]) && !this.nodeIdToObject[x].isNodeValid(this)) {
                return false;
            }
            const listOfDependentNodes = this.nodeIdToObject[x].getNodeIdsFromWhichThisNodeDerivesInputs();
            listOfDependentNodes.forEach(setOfDependencies.add, setOfDependencies);
        }
        let availableGraphNodeIds = new Set();
        for (let y in this.nodeIdToObject) {
            // console.log(y);
            // console.log(SkymelECGraph.isSkymelECGraphInstance(this.nodeIdToObject[y]));
            if (SkymelECGraph.isSkymelECGraphInstance(this.nodeIdToObject[y])) {
                const externalGraphNodeIds = await this.nodeIdToObject[y].getOutputNodeIds();
                if (CommonValidators.isEmpty(externalGraphNodeIds)) {
                    continue;
                }
                const externalGraphId = this.nodeIdToObject[y].getGraphId();
                for (let i = 0; i < externalGraphNodeIds.length; ++i) {
                    availableGraphNodeIds.add(externalGraphId + "." + externalGraphNodeIds[i]);
                }
                continue;
            }
            availableGraphNodeIds.add(y);
        }
        let externalNodeIds = this.getSetOfNodeIdsFromExternalInputNames();
        if (!CommonValidators.isEmpty(externalNodeIds)) {
            availableGraphNodeIds = new Set([...availableGraphNodeIds, ...externalNodeIds]);
        }
        if (!SkymelECGraph.isSet1SubSetOfSet2(setOfDependencies, availableGraphNodeIds)) {
            console.log("Set of dependencies:");
            console.log(setOfDependencies);
            console.log("Available node Ids:");
            console.log(availableGraphNodeIds);
        }


        return SkymelECGraph.isSet1SubSetOfSet2(setOfDependencies, availableGraphNodeIds);
    }

    /**
     *
     * @param listOfDesiredGraphNodeOutputNames The list of fully-qualified graph node output names whose values are
     * required as a dict.
     * @param setOfExecutedNodes The set of currently executed graph nodes. Only fully-qualified graph node output names
     * which are generated as outputs of these nodes can be returned.
     * @returns {{}} a dictionary of key values with fully-qualified graph node output names as keys
     */
    getExecutedGraphNodeOutputs(listOfDesiredGraphNodeOutputNames, setOfExecutedNodes) {
        let output = {};
        for (let i = 0; i < listOfDesiredGraphNodeOutputNames.length; ++i) {
            const desiredOutputName = listOfDesiredGraphNodeOutputNames[i];
            const nodeId = SkymelECGraphNode.getNodeIdFromOutputName(desiredOutputName);
            if (!(setOfExecutedNodes.has(nodeId))) {
                throw new Error("Node " + nodeId + " is not in the set of executed nodes.");
            }
            if (!CommonValidators.isEmpty(this.externalInputNamesToValuesDict) && desiredOutputName in this.externalInputNamesToValuesDict) {
                output[desiredOutputName] = this.externalInputNamesToValuesDict[desiredOutputName];
                continue;
            }
            let lastNodeExecutionResult = null;
            if (SkymelECGraph.isGraphIdPrefixForNodeId(nodeId)) {
                const externalGraphId = SkymelECGraph.getGraphIdFromNodeIdWithGraphId(nodeId);
                const externalGraphOutputName = SkymelECGraph.removeGraphIdFromOutputName(desiredOutputName);
                const externalGraphNodeId = SkymelECGraph.getNodeIdFromNodeIdWithGraphId(nodeId);
                const externalExecutionResult = this.nodeIdToObject[externalGraphId].getLastExecutionResultFromNode(externalGraphNodeId);
                if (externalExecutionResult === null) {
                    throw new Error("Result " + externalGraphOutputName + " could not be obtained.");
                }
                if (!(externalGraphOutputName in externalExecutionResult)) {
                    throw new Error("Node " + nodeId + " has not produced the output " + desiredOutputName + ".");
                }
                output[desiredOutputName] = externalExecutionResult[externalGraphOutputName];

            } else {

                console.log(nodeId, this.nodeIdToObject);
                const lastNodeExecutionResult = this.nodeIdToObject[nodeId].getLastExecutionResult();


                if (lastNodeExecutionResult === null) {
                    throw new Error("Node " + nodeId + " has not been executed yet.");
                }
                if (!(desiredOutputName in lastNodeExecutionResult)) {
                    throw new Error("Node " + nodeId + " has not produced the output " + desiredOutputName + ".");
                }
                output[desiredOutputName] = lastNodeExecutionResult[desiredOutputName];
            }
        }
        return output;
    }


    /**
     * Cleans up the execution dependency graph by setting nodes with no children to null. The parents in this scenario
     * provide inputs to the children.
     * @param inputExecutionDependencyGraph
     * @returns {*}
     */
    cleanExecutionDependencyGraph(inputExecutionDependencyGraph) {
        for (let x in inputExecutionDependencyGraph) {
            if (inputExecutionDependencyGraph[x].size === 0) {
                inputExecutionDependencyGraph[x] = null;
            }
        }
        return inputExecutionDependencyGraph;
    }

    getExecutionDependencyGraph() {
        let dependencyGraph = {};
        for (let x in this.nodeIdToObject) {
            const nodeObject = this.nodeIdToObject[x];
            if (SkymelECGraph.isSkymelECGraphInstance(nodeObject)) {
                continue;
            }
            const dependencies = nodeObject.getNodeIdsFromWhichThisNodeDerivesInputs();
            for (let i = 0; i < dependencies.length; ++i) {
                const parentNodeId = dependencies[i];
                if (!(parentNodeId in dependencyGraph)) {
                    dependencyGraph[parentNodeId] = new Set();
                }
                dependencyGraph[parentNodeId].add(x);
            }
            if (!(x in dependencyGraph)) {
                dependencyGraph[x] = new Set();
            }
        }
        return this.cleanExecutionDependencyGraph(dependencyGraph);
    }

    async getGraphNodeExecutionOrder(storeLastExecutedGraphOfNodes = false) {
        let executionDependencyGraph = this.getExecutionDependencyGraph();
        if (storeLastExecutedGraphOfNodes) {
            this.storeLastExecutedGraphOfNodes(executionDependencyGraph);
        }
        return await CommonGraphAlgorithms.topologicalSort(executionDependencyGraph);
    }

    storeLastExecutedGraphOfNodes(graphOfNodes) {
        this.executionGraphOfNodes = graphOfNodes;
    }

    getLastExecutedGraphOfNodes() {
        if (typeof this.executionGraphOfNodes === 'undefined' || this.executionGraphOfNodes === null) {
            return null;
        }
        return this.executionGraphOfNodes;
    }

    getLastExecutionResultFromNode(nodeId) {
        if (!CommonValidators.isNonEmptyString(nodeId)) {
            return null;
        }
        if (!(nodeId in this.nodeIdToObject)) {
            return null;
        }
        return this.nodeIdToObject[nodeId].getLastExecutionResult();
    }

    /**
     *
     * @param getResultsFromAllNodes if true, returns the outputs from all nodes in the executed graph. If false
     * (the default value), it returns the combined output dict from only the leaf nodes.
     * @returns {{}|null}
     */

    getLastExecutionResult(getResultsFromAllNodes = false) {
        const lastExecutedGraphOfNodes = this.getLastExecutedGraphOfNodes();
        if (lastExecutedGraphOfNodes === null) {
            return null;
        }
        const leafNodesList = CommonGraphAlgorithms.getListOfLeafNodes(lastExecutedGraphOfNodes);
        if (leafNodesList === null || leafNodesList.length === 0) {
            return null;
        }
        let output = {};
        const nodesToGetResultsFrom = getResultsFromAllNodes ? Object.keys(this.nodeIdToObject) : leafNodesList;
        for (let i = 0; i < nodesToGetResultsFrom.length; ++i) {
            const x = nodesToGetResultsFrom[i];
            if (!(x in this.nodeIdToObject)) {
                return null;
            }
            const nodeObject = this.nodeIdToObject[x];
            const lastNodeExecutionResult = nodeObject.getLastExecutionResult(/*forceMatchKeysToOutputNames=*/true);
            if (lastNodeExecutionResult !== null) {
                for (let y in lastNodeExecutionResult) {
                    const keyName = this.getGraphId() + "." + y;
                    output[keyName] = lastNodeExecutionResult[y];
                }
            }
        }
        return output;
    }

    getAverageExecutionTimeMilliseconds(maxNumberOfLastExecutionsToAverageOver = 5) {
        const lastExecutedGraphOfNodes = this.getLastExecutedGraphOfNodes();
        if (lastExecutedGraphOfNodes === null) {
            return null;
        }
        let output = {};
        for (let x in this.nodeIdToObject) {
            if (!SkymelECGraph.isSkymelECGraphNodeInstance(this.nodeIdToObject[x])) {
                return null;
            }
            output[x] = this.nodeIdToObject[x].getAverageExecutionTimeMilliseconds(/*maxCountOfLastExecutionToAverageOver=*/maxNumberOfLastExecutionsToAverageOver);
        }
        return output;
    }

    getLastMeasuredExecutionTimeMilliseconds() {
        const lastExecutedGraphOfNodes = this.getLastExecutedGraphOfNodes();
        if (lastExecutedGraphOfNodes === null) {
            return null;
        }
        let output = {};
        for (let x in this.nodeIdToObject) {
            if (SkymelECGraph.isSkymelECGraphNodeInstance(this.nodeIdToObject[x])) {
                output[x] = this.nodeIdToObject[x].getLastMeasuredExecutionTimeMilliseconds();
                continue;
            }
            if (SkymelECGraph.isSkymelECGraphInstance(this.nodeIdToObject[x])) {
                const graphId = this.nodeIdToObject[x].getGraphId();
                let tempOutput = this.nodeIdToObject[x].getLastMeasuredExecutionTimeMilliseconds();
                if (CommonValidators.isEmpty(tempOutput)) {
                    continue;
                }
                for (let i in tempOutput) {
                    output[graphId + "." + i] = tempOutput[i];
                }
                continue;
            }
            return null;
        }
        return output;
    }

    setGraphExecutionConfig(graphExecutionConfig) {
        this.graphExecutionConfig = graphExecutionConfig;
    }

    getGraphExecutionConfig() {
        if (this.hasOwnProperty('graphExecutionConfig')) {
            return this.graphExecutionConfig;
        }
        return null;
    }

    async getInputNames() {
        const isGraphValid = await this.isGraphValid();
        if (!isGraphValid) {
            return null;
        }
        const executionGraph = await this.getGraphNodeExecutionOrder(true);
        const inputNodes = CommonGraphAlgorithms.getListOfRootNodes(executionGraph);
        let inputNames = [];
        for (let x = 0; x < inputNodes.length; ++x) {
            inputNames.push(...inputNodes[x].getInputNames());
        }
        return inputNames;
    }

    async getOutputNames() {
        const isGraphValid = await this.isGraphValid();
        if (!isGraphValid) {
            return null;
        }
        const executionGraph = await this.getGraphNodeExecutionOrder(true);
        const outputNodes = CommonGraphAlgorithms.getListOfLeafNodes(executionGraph);
        let outputNames = [];
        for (let x = 0; x < outputNodes.length; ++x) {
            outputNames.push(...outputNodes[x].getOutputNames());
        }
        return outputNames;
    }

    async getOutputNodeIds() {
        const isGraphValid = await this.isGraphValid();
        if (!isGraphValid) {
            console.log("Graph invalid");
            console.log(this);
            return null;
        }
        const executionGraph = this.getExecutionDependencyGraph();// await this.getGraphNodeExecutionOrder(true);
        const outputNodes = CommonGraphAlgorithms.getListOfLeafNodes(executionGraph);
        let outputNodeIds = [];
        for (let x = 0; x < outputNodes.length; ++x) {
            outputNodeIds.push(outputNodes[x]);
        }
        return outputNodeIds;
    }

    getSetOfAllNodeIdsFromExternalInputNames() {
        if (CommonValidators.isEmpty(this.externalInputNames)) {
            return null;
        }
        let output = new Set();
        for (let x of this.externalInputNames) {
            const nodeId = SkymelECGraphNode.getNodeIdFromOutputName(x);
            output.add(nodeId);
        }
        return output;
    }

    setValuesForExternalInputNamesAndReturnNodeIds(inputNamesToValuesDict) {
        this.externalInputNamesToValuesDict = {};

        if (CommonValidators.isEmpty(inputNamesToValuesDict)) {
            return null;
        }
        let output = new Set();
        for (let x in inputNamesToValuesDict) {
            if (!this.externalInputNames.has(x)) {
                continue;
            }
            const nodeId = SkymelECGraphNode.getNodeIdFromOutputName(x);
            output.add(nodeId);
            this.externalInputNamesToValuesDict[x] = inputNamesToValuesDict[x];
        }
        return output;
    }

    getExternalInputNames() {
        if (CommonValidators.isEmpty(this.externalInputNames)) {
            return null;
        }
        let output = [...this.externalInputNames];
        return output.sort();
    }

    setExternalInputNames(externalInputNames) {
        if (!CommonValidators.isEmpty(externalInputNames) && CommonValidators.isArray(externalInputNames)) {
            this.externalInputNames = new Set([...externalInputNames]);
        } else {
            this.externalInputNames = null;
        }
    }

    /**
     * Gets the specific `externalInputName` value from the current `GraphExecutionConfig`
     * @param externalInputName A string specifying the full name of the input (including all graph/node scopes).
     * For example:
     * `graphId1.NodeId1.InputName1`
     * @returns {*|null} The value of the specific `externalInputName` if found, else null.
     */
    getExternalInputValue(externalInputName) {
        if (!CommonValidators.isNonEmptyString(externalInputName)) {
            return null;
        }
        const currentGraphExecutionConfig = this.getGraphExecutionConfig();
        if (CommonValidators.isEmpty(currentGraphExecutionConfig) || !CommonValidators.isDict(currentGraphExecutionConfig)) {
            return null;
        }
        const externalInputNamesToValuesDict = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(currentGraphExecutionConfig, 'externalInputNamesToValuesDict', null);
        if (CommonValidators.isEmpty(externalInputNamesToValuesDict)) {
            return null;
        }
        return CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(externalInputNamesToValuesDict, externalInputName, null);
    }

    /**
     * @param graphExecutionConfig
     * @param measureExecutionTime
     * @returns {Promise<boolean>} Returns true if all the nodes succeeded in execution.
     */
    async executeGraph(graphExecutionConfig = null, measureExecutionTime = true) {

        this.setGraphExecutionConfig(graphExecutionConfig);
        const executionOrder = await this.getGraphNodeExecutionOrder(/*storeLastExecutedGraphOfNodes=*/true);
        let executedExternalGraphs = new Set();
        let executedNodes = new Set();
        let externalNodeIds = CommonValidators.isEmpty(this.externalInputNames) ? new Set() : this.getSetOfAllNodeIdsFromExternalInputNames();

        const externalInputNamesToValuesDict = SkymelECGraphUtils.getExternalInputNamesToValuesDictFromGraphExecutionConfig(graphExecutionConfig);
        if (!CommonValidators.isEmpty(externalInputNamesToValuesDict) && CommonValidators.isDict(externalInputNamesToValuesDict)) {
            const externalNodeIdsWhichHaveBeenAssignedValues = this.setValuesForExternalInputNamesAndReturnNodeIds(externalInputNamesToValuesDict);
            executedNodes = new Set([...externalNodeIdsWhichHaveBeenAssignedValues]);
        }

        const isGraphValid = await this.isGraphValid();
        if (!isGraphValid) {
            throw new Error("Graph is not valid. Most likely  due to missing dependencies.");
        }
        console.log("executionOrder", executionOrder)

        let overallExecutionSucceeded = true;
        for (let i = 0; i < executionOrder.length; ++i) {
            const currentNodeId = executionOrder[i];
            // console.log("Currently executing : " + currentNodeId);
            if (externalNodeIds.has(currentNodeId)) {
                continue;
            }

            if (SkymelECGraph.isGraphIdPrefixForNodeId(currentNodeId)) {
                const externalGraphId = SkymelECGraph.getGraphIdFromNodeIdWithGraphId(currentNodeId);
                if (!executedExternalGraphs.has(externalGraphId)) {
                    const executionStatusOfExternalGraph = await this.nodeIdToObject[externalGraphId].executeGraph(graphExecutionConfig, measureExecutionTime);
                    if (executionStatusOfExternalGraph) {
                        executedExternalGraphs.add(externalGraphId);
                    } else {
                        return false;
                    }
                }
                if (executedExternalGraphs.has(externalGraphId)) {
                    executedNodes.add(currentNodeId);
                }
                continue;
            }
            const node = this.nodeIdToObject[currentNodeId];
            const inputNames = node.getInputNames();
            let runStatus = null;
            if (inputNames === null || inputNames.length === 0) {
                runStatus = await node.execute(this, null, measureExecutionTime);
            } else {
                const graphNodeInputNames = node.getInputNames();
                const graphNodeInputValues = this.getExecutedGraphNodeOutputs(graphNodeInputNames, executedNodes);
                runStatus = await node.execute(this, graphNodeInputValues, measureExecutionTime);
            }
            if (runStatus === false) {
                overallExecutionSucceeded = false;
                break;
            }
            executedNodes.add(currentNodeId);
        }
        if (overallExecutionSucceeded && this.successCallback !== null) {
            const currentGraphInstance = this;
            await this.successCallback(currentGraphInstance);
        }
        if (!overallExecutionSucceeded && this.errorCallback !== null) {
            const currentGraphInstance = this;
            await this.errorCallback(currentGraphInstance);
        }
        return overallExecutionSucceeded;
    }

    computeExternalInputNames() {
        if (CommonValidators.isEmpty(this.nodeIdToObject)) {
            return [];
        }
        let allNodesInputNames = new Set();
        let allNodesOutputNames = new Set();
        for (let nodeId in this.nodeIdToObject) {
            const currentNode = this.nodeIdToObject[nodeId];
            const currenNodeInputNames = currentNode.getInputNames();
            if (!CommonValidators.isEmpty(currenNodeInputNames)) {
                currenNodeInputNames.forEach(allNodesInputNames.add, allNodesInputNames);
            }
            const currentNodeOutputNames = currentNode.getOutputNames();
            if (!CommonValidators.isEmpty(currentNodeOutputNames)) {
                currentNodeOutputNames.forEach(allNodesOutputNames.add, allNodesOutputNames);
            }
        }

        let output = [];
        for (const a of allNodesInputNames) {
            if (!allNodesOutputNames.has(a)) {
                output.push(a);
            }
        }
        return output;
    }

    async dispose() {
        if (CommonValidators.isEmpty(this.nodeIdToObject)) {
            return true;
        }
        for (let nodeId in this.nodeIdToObject) {
            const disposalResult = await this.nodeIdToObject[nodeId].dispose();
            if (disposalResult === true) {
                delete this.nodeIdToObject[nodeId];
            }
        }
        return true;
    }
}