import {CommonValidators} from "./common_validators.js";

/**
 * A utility class containing common algorithms for graph manipulation and analysis.
 * This class contains only static methods and cannot be instantiated. The `graph` is a map of
 * `{nodeId:Set([immediateChildrenNodeIds])}`
 */
export class CommonGraphAlgorithms {
    constructor() {
        throw new Error('This is a class with static methods and cannot be instantiated.');
    }

    static getUnionOfSets(set1, set2) {
        let output = new Set(set1);
        for (let x of set2) {
            output.add(x);
        }
        return output;
    }

    static removeDuplicateNodeIdsFromList(listOfNodeIds) {
        if (typeof listOfNodeIds === 'undefined' || listOfNodeIds === null || listOfNodeIds.length === 0) return [];
        if (typeof listOfNodeIds === 'string' || typeof listOfNodeIds === 'number') {
            return [listOfNodeIds];
        }
        if (typeof listOfNodeIds === 'object' && Array.isArray(listOfNodeIds)) {
            return Array.from(new Set(listOfNodeIds));
        }
        if (typeof listOfNodeIds === 'object' && Object.keys(listOfNodeIds).length > 0) {
            return Array.from(Object.keys(listOfNodeIds));
        }
        if (typeof listOfNodeIds === 'object' && listOfNodeIds instanceof Set) {
            return Array.from(listOfNodeIds);
        }
        return [];
    }

    static isEmptyGraph(graph) {
        return typeof graph === 'undefined' || graph === null || Object.keys(graph).length === 0;
    }


    static isValidNodeId(nodeId) {
        return typeof nodeId === 'string' || typeof nodeId === 'number';
    }

    static isNodeInGraph(graph, nodeId) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph) || !CommonGraphAlgorithms.isValidNodeId(nodeId)) {
            return false;
        }
        return nodeId in graph;
    }

    static isParentNode(graph, potentialParentNodeId, potentialChildNodeId) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph) || CommonGraphAlgorithms.isNodeInGraph(graph, potentialParentNodeId) === false || CommonGraphAlgorithms.isNodeInGraph(graph, potentialChildNodeId) === false) {
            return false;
        }
        if (graph[potentialParentNodeId] === null) {
            return false;
        }
        return graph[potentialParentNodeId].has(potentialChildNodeId);
    }

    static isChildNode(graph, potentialChildNodeId, potentialParentNodeId) {
        return CommonGraphAlgorithms.isParentNode(graph, potentialParentNodeId, potentialChildNodeId);
    }

    static getListOfNodesInGraph(graph) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return [];
        }
        return Object.keys(graph);
    }

    static getListOfChildrenOfNode(graph, nodeId) {
        if (!CommonGraphAlgorithms.isNodeInGraph(graph, nodeId)) {
            return [];
        }
        if (graph[nodeId] === null) {
            return [];
        }
        return CommonGraphAlgorithms.removeDuplicateNodeIdsFromList(graph[nodeId]);
    }

    static getListOfParentsOfNode(graph, nodeId) {
        if (!CommonGraphAlgorithms.isNodeInGraph(graph, nodeId)) {
            return [];
        }
        let output = new Set();
        for (let nodeId2 in graph) {
            if (graph[nodeId2] === null) {
                continue;
            }
            if (graph[nodeId2].has(nodeId)) {
                output.add(nodeId2);
            }
        }
        return Array.from(output);
    }

    static getListOfSiblingsOfNode(graph, nodeId) {
        if (!CommonGraphAlgorithms.isNodeInGraph(graph, nodeId)) {
            return [];
        }
        let parentNodeIds = CommonGraphAlgorithms.getListOfParentsOfNode(graph, nodeId);
        if (parentNodeIds.length === 0) {
            return [];
        }
        let output = new Set();
        for (let i = 0; i < parentNodeIds.length; ++i) {
            let parentNodeId = parentNodeIds[i];
            let childrenOfParentNode = new Set(CommonGraphAlgorithms.getListOfChildrenOfNode(graph, parentNodeId));
            output = CommonGraphAlgorithms.getUnionOfSets(output, childrenOfParentNode);
        }
        output.delete(nodeId);
        return Array.from(output);
    }

    static getListOfRootNodes(graph) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return [];
        }
        let output = [];
        for (let nodeId in graph) {
            if (CommonGraphAlgorithms.getListOfParentsOfNode(graph, nodeId).length === 0) {
                output.push(nodeId);
            }
        }
        return CommonGraphAlgorithms.removeDuplicateNodeIdsFromList(output);
    }

    static getListOfLeafNodes(graph) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return [];
        }
        let output = [];
        for (let nodeId in graph) {
            if (CommonGraphAlgorithms.getListOfChildrenOfNode(graph, nodeId).length === 0) {
                output.push(nodeId);
            }
        }
        return CommonGraphAlgorithms.removeDuplicateNodeIdsFromList(output);
    }

    /**
     * An implementation of Depth-First Search the method continues until `stopSearchCriteria` evaluates to true.
     * @param graph The `graph` is a map of `{nodeId:Set([immediateChildrenNodeIds])}`
     * @param startNodeIds A list of node-ids to start the Depth-First Search. If null, we find the roots of the current
     * graph and use them as startNodeIds.
     * @param stopSearchCriteria it's a method that takes as inputs: `currentNodeId, currentNodeVisitationDepth,
     * visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath`. The method must return true or
     * false. If true is returned, the entire search is stopped.
     * @param stopSearchingChildrenCriteria it's a method that takes as inputs: `currentNodeId, currentNodeVisitationDepth,
     * visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath`. The method must return true or
     * false. If true is returned, the children of the `currentNodeId` are not added to the search stack.
     * @param finalResulCallback An `async` method to compute the final result on stop criteria being met. It's provided
     * the following inputs : `stopSearchNode, stopSearchNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap,
     * toVisitNodesAndVisitationDepthStackArray, currentVisitationPath`
     * @returns {Promise<void>} Returns the result of `finalResulCallback` if it is not null. Else it returns nothing.
     */
    static async depthFirstSearch(graph, startNodeIds = null, stopSearchCriteria = null, stopSearchingChildrenCriteria = null, finalResulCallback = null) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return;
        }
        if (startNodeIds === null) {
            startNodeIds = CommonGraphAlgorithms.getListOfRootNodes(graph);
        }
        if (startNodeIds.length === 0) {
            // No start/root nodes found.
            return;
        }
        let visitedNodeIdToFirstVisitDepthMap = {};
        let toVisitNodesAndVisitationDepthStackArray = [];
        for (let i = 0; i < startNodeIds.length; ++i) {
            let currentNodeId = startNodeIds[i];
            if (!CommonGraphAlgorithms.isNodeInGraph(graph, currentNodeId)) {
                continue;
            }
            toVisitNodesAndVisitationDepthStackArray.push([currentNodeId, 0]);
        }
        let currentVisitationPath = [];
        let currentVisitationPathDepths = [];
        while (toVisitNodesAndVisitationDepthStackArray.length > 0) {
            let currentEntry = toVisitNodesAndVisitationDepthStackArray.pop();
            let currentNodeId = currentEntry[0];
            let currentNodeVisitationDepth = currentEntry[1];
            if (currentNodeVisitationDepth === 0) {
                currentVisitationPath = [currentNodeId];
                currentVisitationPathDepths = [0];
            } else {
                while (currentVisitationPathDepths[currentVisitationPathDepths.length - 1] >= currentNodeVisitationDepth) {
                    currentVisitationPathDepths.pop();
                    currentVisitationPath.pop();
                }
                currentVisitationPath.push(currentNodeId);
                currentVisitationPathDepths.push(currentNodeVisitationDepth);
            }
            if (stopSearchCriteria !== null && typeof stopSearchCriteria === 'function' &&
                stopSearchCriteria(currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath)) {
                if (finalResulCallback !== null) {
                    return await finalResulCallback(currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath);
                }
                return;
            }
            if (currentNodeId in visitedNodeIdToFirstVisitDepthMap) {
                continue;
            }

            visitedNodeIdToFirstVisitDepthMap[currentNodeId] = currentNodeVisitationDepth;
            if (stopSearchingChildrenCriteria !== null && typeof stopSearchingChildrenCriteria === 'function' &&
                stopSearchingChildrenCriteria(currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath)) {
                continue;
            }
            let childrenOfCurrentNode = CommonGraphAlgorithms.getListOfChildrenOfNode(graph, currentNodeId);
            for (let i = 0; i < childrenOfCurrentNode.length; ++i) {
                let childNodeId = childrenOfCurrentNode[i];
                toVisitNodesAndVisitationDepthStackArray.push([childNodeId, currentNodeVisitationDepth + 1]);
            }
        }
        if (finalResulCallback !== null) {
            return await finalResulCallback(null, null, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath);
        }
    }

    /**
     * An implementation of Breadth-First Search the method continues until `stopSearchCriteria` evaluates to true.
     * @param graph The `graph` is a map of `{nodeId:Set([immediateChildrenNodeIds])}`
     * @param startNodeIds A list of node-ids to start the Breadth-First Search. If null, we find the roots of the current
     * graph and use them as startNodeIds.
     * @param stopSearchCriteria it's a method that takes as inputs: `currentNodeId, currentNodeVisitationDepth,
     * visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray`. The method must return true or
     * false. If true is returned, the entire search is stopped.
     * @param stopSearchingChildrenCriteria it's a method that takes as inputs: `currentNodeId, currentNodeVisitationDepth,
     * visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray`. The method must return true or
     * false. If true is returned, the children of the `currentNodeId` are not added to the search stack.
     * @param finalResulCallback An `async` method to compute the final result on stop criteria being met. It's provided
     * the following inputs : `stopSearchNode, stopSearchNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap,
     * toVisitNodesAndVisitationDepthQueueArray`
     * @returns {Promise<void>} Returns the result of `finalResulCallback` if it is not null. Else it returns nothing.
     */
    static async breadthFirstSearch(graph, startNodeIds = null, stopSearchCriteria = null, stopSearchingChildrenCriteria = null, finalResulCallback = null) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return;
        }
        if (startNodeIds === null) {
            startNodeIds = CommonGraphAlgorithms.getListOfRootNodes(graph);
        }
        if (startNodeIds.length === 0) {
            // No start/root nodes found.
            return;
        }
        let visitedNodeIdToFirstVisitDepthMap = {};
        let toVisitNodesAndVisitationDepthQueueArray = [];
        for (let i = 0; i < startNodeIds.length; ++i) {
            let currentNodeId = startNodeIds[i];
            if (!CommonGraphAlgorithms.isNodeInGraph(graph, currentNodeId)) {
                continue;
            }
            toVisitNodesAndVisitationDepthQueueArray.push([currentNodeId, 0]);
        }
        while (toVisitNodesAndVisitationDepthQueueArray.length > 0) {
            let currentEntry = toVisitNodesAndVisitationDepthQueueArray.shift();
            let currentNodeId = currentEntry[0];
            let currentNodeVisitationDepth = currentEntry[1];
            if (stopSearchCriteria !== null && typeof stopSearchCriteria === 'function' && stopSearchCriteria(currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray)) {
                if (finalResulCallback !== null) {
                    return await finalResulCallback(currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray);
                }
                return;
            }
            if (currentNodeId in visitedNodeIdToFirstVisitDepthMap) {
                continue;
            }

            visitedNodeIdToFirstVisitDepthMap[currentNodeId] = currentNodeVisitationDepth;
            if (stopSearchingChildrenCriteria !== null && typeof stopSearchingChildrenCriteria === 'function' && stopSearchingChildrenCriteria(currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray)) {
                continue;
            }
            let childrenOfCurrentNode = CommonGraphAlgorithms.getListOfChildrenOfNode(graph, currentNodeId);
            for (let i = 0; i < childrenOfCurrentNode.length; ++i) {
                let childNodeId = childrenOfCurrentNode[i];
                toVisitNodesAndVisitationDepthQueueArray.push([childNodeId, currentNodeVisitationDepth + 1]);
            }
        }
        if (finalResulCallback !== null) {
            return await finalResulCallback(null, null, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray);
        }
    }

    /**
     * Checks whether the graph contains cycles
     * @param graph
     * @returns {Promise<boolean>}
     */
    static async containsCyclicGraph(graph) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return false;
        }
        const stopSearchCriterion = function (currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath) {
            if (!(currentNodeId in visitedNodeIdToFirstVisitDepthMap)) {
                return false;
            }
            for (let i = 0; i < currentVisitationPath.length - 1; ++i) {
                if (currentNodeId === currentVisitationPath[i]) {
                    return true;
                }
            }
            return false;
        }
        const finalResultCallback = async function (stopSearchNode, stopSearchNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath) {
            if (!(stopSearchNode in visitedNodeIdToFirstVisitDepthMap)) {
                return false;
            }
            for (let i = 0; i < currentVisitationPath.length - 1; ++i) {
                if (stopSearchNode === currentVisitationPath[i]) {
                    return true;
                }
            }
            return false;
        }
        return await CommonGraphAlgorithms.depthFirstSearch(graph, null, stopSearchCriterion, null, finalResultCallback);
    }

    static getListOfAllEdgesInGraph(graph) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return [];
        }
        let output = [];
        for (let nodeId in graph) {
            let childrenOfCurrentNode = CommonGraphAlgorithms.getListOfChildrenOfNode(graph, nodeId);
            for (let i = 0; i < childrenOfCurrentNode.length; ++i) {
                output.push([nodeId, childrenOfCurrentNode[i]]);
            }
        }
        return output;
    }

    static hasInboundEdgesToNodeInEdgeList(edgeList, nodeId) {
        let foundIndex = edgeList.findIndex(x => x[1] === nodeId);
        return foundIndex !== -1;
    }

    static hasOutboundEdgesFromNodeInEdgeList(edgeList, nodeId) {
        let foundIndex = edgeList.findIndex(x => x[0] === nodeId);
        return foundIndex !== -1;
    }

    static async topologicalSort(graph) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return null;
        }
        const containsCyclicGraph = await CommonGraphAlgorithms.containsCyclicGraph(graph);
        if (containsCyclicGraph) {
            return null;
        }
        let listOfAllEdgesInGraph = CommonGraphAlgorithms.getListOfAllEdgesInGraph(graph);
        let sortedNodes = [];
        let toVisitNodes = CommonGraphAlgorithms.getListOfRootNodes(graph);
        while (toVisitNodes.length > 0) {
            let currentNodeId = toVisitNodes.pop();
            sortedNodes.push(currentNodeId);
            let childrenOfCurrentNode = CommonGraphAlgorithms.getListOfChildrenOfNode(graph, currentNodeId);
            for (let i = 0; i < childrenOfCurrentNode.length; ++i) {
                let childNodeId = childrenOfCurrentNode[i];
                let indexOfChildNodeInGraph = listOfAllEdgesInGraph.findIndex(x => x[1] === childNodeId && x[0] === currentNodeId);
                if (indexOfChildNodeInGraph !== -1) {
                    listOfAllEdgesInGraph.splice(indexOfChildNodeInGraph, /*deleteCount=*/1);
                }
                if (!CommonGraphAlgorithms.hasInboundEdgesToNodeInEdgeList(listOfAllEdgesInGraph, childNodeId)) {
                    toVisitNodes.push(childNodeId);
                }
            }
        }
        return sortedNodes;
    }

    static async getAllNodesEncounteredWhileTraversingDirectedAcyclicGraph(graph, sourceNodeId, destinationNodeId, includeSourceNodeId = true, includeDestinationNodeId = true) {
        if (CommonGraphAlgorithms.isEmptyGraph(graph)) {
            return null;
        }
        const containsCyclicGraph = await CommonGraphAlgorithms.containsCyclicGraph(graph);
        if (containsCyclicGraph) {
            return null;
        }

        if (sourceNodeId === destinationNodeId && CommonGraphAlgorithms.isNodeInGraph(graph, sourceNodeId)) {
            if (includeSourceNodeId && includeDestinationNodeId) {
                return [sourceNodeId];
            }
            return [];
        }

        let allEncounteredNodes = new Set();
        let nodesEncounteredOnConnectedPaths = new Set();
        let stopRepeatingDFS = false;
        let lastVisitationPath = [];

        const areArraysEqual = function (arr1, arr2) {
            if (arr1.length !== arr2.length) {
                return false;
            }
            for (let i = 0; i < arr1.length; ++i) {
                if (arr1[i] !== arr2[i]) {
                    return false;
                }
            }
            return true;
        }

        const stopSearchCriteria = function (currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray) {
            return currentNodeId === destinationNodeId;
        }

        const stopSearchingChildrenCriteria = function (currentNodeId, currentNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthQueueArray) {
            return allEncounteredNodes.has(currentNodeId);
        }

        const finalResulCallback = async function (stopSearchNode, stopSearchNodeVisitationDepth, visitedNodeIdToFirstVisitDepthMap, toVisitNodesAndVisitationDepthStackArray, currentVisitationPath) {
            if (stopSearchNode === null || areArraysEqual(currentVisitationPath, lastVisitationPath)) {
                stopRepeatingDFS = true;
            }
            if (stopSearchNode === destinationNodeId) {
                lastVisitationPath = currentVisitationPath;
                for (let x = 0; x < currentVisitationPath.length; ++x) {
                    const currentOnPathNodeId = currentVisitationPath[x];
                    if (currentOnPathNodeId === sourceNodeId && !includeSourceNodeId) {
                        continue;
                    }
                    if (currentOnPathNodeId === destinationNodeId && !includeDestinationNodeId) {
                        continue;
                    }
                    nodesEncounteredOnConnectedPaths.add(currentOnPathNodeId);
                }
            }
            for (let nodeId in visitedNodeIdToFirstVisitDepthMap) {
                if (nodeId === destinationNodeId || nodeId === sourceNodeId) {
                    continue;
                }
                allEncounteredNodes.add(nodeId);
            }
        }

        while (!stopRepeatingDFS) {
            await CommonGraphAlgorithms.depthFirstSearch(graph, [sourceNodeId], stopSearchCriteria, stopSearchingChildrenCriteria, finalResulCallback);
        }

        const result = [...nodesEncounteredOnConnectedPaths];

        if (CommonValidators.isEmpty(result)) {
            return null;
        }
        return result.sort();
    }

    static async getSubGraphNodeIds(graph, sourceNodeIds, destinationNodeIds, includeSourceNodeIds = true, includeDestinationNodeIds = true) {
        let subGraphNodes = new Set();
        for (let i = 0; i < sourceNodeIds.length; ++i) {
            const sourceNodeId = sourceNodeIds[i];
            for (let j = 0; j < destinationNodeIds.length; ++j) {
                const destinationNodeId = destinationNodeIds[j];
                const result = await CommonGraphAlgorithms.getAllNodesEncounteredWhileTraversingDirectedAcyclicGraph(graph, sourceNodeId, destinationNodeId, includeSourceNodeIds, includeDestinationNodeIds);
                if (CommonValidators.isEmpty(result)) {
                    continue;
                }
                result.forEach(nodeId => subGraphNodes.add(nodeId));
            }
        }
        let result = [...subGraphNodes];
        if (CommonValidators.isEmpty(result)) {
            return null;
        }
        return result.sort();
    }

    static getAllDownStreamNodeIds(graph, sourceNodeIds, addSourceNodeIdsToReturnedList = true) {
        if (CommonValidators.isEmpty(graph) || CommonValidators.isEmpty(sourceNodeIds)) {
            return null;
        }
        let allDownStreamNodes = new Set();
        let toExploreNodeIds = [...sourceNodeIds];
        let alreadyExploredNodeIds = new Set();
        let sourceNodeIdsSet = new Set(sourceNodeIds);
        while (toExploreNodeIds.length > 0) {
            const currentNodeId = toExploreNodeIds.shift();
            if (alreadyExploredNodeIds.has(currentNodeId)) {
                continue;
            }
            alreadyExploredNodeIds.add(currentNodeId);
            const currentChildren = CommonGraphAlgorithms.getListOfChildrenOfNode(graph, currentNodeId);
            if (!CommonValidators.isEmpty(currentChildren)) {
                for (let i = 0; i < currentChildren.length; ++i) {
                    if (alreadyExploredNodeIds.has(currentChildren[i])) {
                        continue;
                    }
                    toExploreNodeIds.push(currentChildren[i]);
                }
            }
            if (sourceNodeIdsSet.has(currentNodeId) && !addSourceNodeIdsToReturnedList) {
                continue;
            }
            allDownStreamNodes.add(currentNodeId);
        }
        let result = [...allDownStreamNodes];
        if (CommonValidators.isEmpty(result)) {
            return null;
        }
        return result.sort();
    }

}