import {SkymelECGraphForSplitInference} from "./skymel_ec_graph_for_split_inference.js";
import {SkymelECGraphForAutoregressiveInference} from "./skymel_ec_graph_for_autoregressive_inference.js";
import {SkymelECGraph} from "./skymel_execution_control_graph.js";
import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphNode} from "./skymel_execution_control_graph_node.js";
import {SkymelECGraphNodeForLocalInference} from "./skymel_ec_graph_node_for_local_inference.js";
import {SkymelECGraphNodeForRemoteInference} from "./skymel_ec_graph_node_for_remote_inference.js";
import {SkymelECGraphNodeForTransformerJSProcessing} from "./skymel_ec_graph_node_for_transformerjs_processing.js";
import {SkymelECGraphNodeForLLMInputPrep} from "./skymel_ec_graph_node_for_llm_input_prep.js";
import {SkymelECGraphNodeForLLMLogitsGreedySearch} from "./skymel_ec_graph_node_for_llm_logits_greedy_search.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";
import {SkymelECGraphNodeForExternalApiCall} from "./skymel_ec_graph_node_for_external_api_call.js";

export class SkymelExecutionGraphLoader {

    constructor() {
        throw new Error("Cannot instantiate this class. It has purely static methods, please call them using class-name " +
            "scope,such as `SkymelExecutionGraphLoader.staticMethod(param1, param2)` etc.");
    }

    /**
     *
     * @param jsonFileUrl {string}
     * @returns {Promise<SkymelECGraph|null>}
     */
    static async loadGraphFromJsonFile(jsonFileUrl) {
        if (!CommonValidators.isNonEmptyString(jsonFileUrl)) {
            return null;
        }
        try {
            const jsonObject = await (await fetch(jsonFileUrl)).json();
            if (!CommonValidators.isEmpty(jsonObject)) {
                return SkymelExecutionGraphLoader.loadGraphFromJsonObject(jsonObject);
            }
        } catch (error) {
            console.log(error);
        }
        return null;
    }

    static loadGraphFromJsonObject(jsonObject) {
        if (CommonValidators.isEmpty(jsonObject)) {
            return null;
        }
        return SkymelExecutionGraphLoader.getLoadedGraphAndChildrenNodesFromDict(jsonObject);
    }

    static getLoadedGraphAndChildrenNodesFromDict(graphAndChildrenNodesDetails) {
        if (CommonValidators.isEmpty(graphAndChildrenNodesDetails)) {
            return null;
        }
        const graphType = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(graphAndChildrenNodesDetails, 'graphType', null);
        const graphInitializationConfig = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(graphAndChildrenNodesDetails, 'graphInitializationConfig', null);
        if (CommonValidators.isEmpty(graphType) || CommonValidators.isEmpty(graphInitializationConfig)) {
            return null;
        }
        let currentGraph = SkymelExecutionGraphLoader.loadAndReturnGraphObject(graphType, graphInitializationConfig);
        if (CommonValidators.isEmpty(currentGraph)) {
            return null;
        }
        const currentGraphChildren = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(graphAndChildrenNodesDetails, 'children', null);
        if (CommonValidators.isEmpty(currentGraphChildren) || !CommonValidators.isArray(currentGraphChildren)) {
            return currentGraph;
        }
        for (let i = 0; i < currentGraphChildren.length; ++i) {
            const currentChildDetails = currentGraphChildren[i];
            if (CommonValidators.isNotEmptyDictAndHasKey(currentChildDetails, 'nodeType')) {
                const nodeType = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(currentChildDetails, 'nodeType', null);
                const nodeConfig = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(currentChildDetails, 'nodeInitializationConfig', null);
                if (CommonValidators.isNonEmptyString(nodeType) && !CommonValidators.isEmpty(nodeConfig)) {
                    const nodeObject = SkymelExecutionGraphLoader.loadAndReturnNodeObject(nodeType, nodeConfig);
                    currentGraph.addNode(nodeObject);
                }
            }
            if (CommonValidators.isNotEmptyDictAndHasKey(currentChildDetails, 'graphType')) {
                const subGraph = SkymelExecutionGraphLoader.getLoadedGraphAndChildrenNodesFromDict(currentChildDetails);
                if (!CommonValidators.isEmpty(subGraph)) {
                    currentGraph.addNode(subGraph);
                }
            }
        }
        return currentGraph;
    }

    static loadAndReturnGraphObject(graphType, graphInitializationConfig) {
        if (CommonValidators.isEmpty(graphInitializationConfig) || CommonValidators.isEmpty(graphType)) {
            return null;
        }
        switch (graphType) {
            case SkymelECGraphUtils.GRAPH_TYPE_SPLIT_INFERENCE_RUNNER:
                return new SkymelECGraphForSplitInference(graphInitializationConfig);

            case SkymelECGraphUtils.GRAPH_TYPE_AUTOREGRESSIVE_INFERENCE_RUNNER:
                return new SkymelECGraphForAutoregressiveInference(graphInitializationConfig);

            case SkymelECGraphUtils.GRAPH_TYPE_BASE:
                return new SkymelECGraph(graphInitializationConfig);

            default:
                return null;
        }
    }


    static loadAndReturnNodeObject(nodeType, nodeInitializationConfig) {
        if (CommonValidators.isEmpty(nodeType) || CommonValidators.isEmpty(nodeInitializationConfig)) {
            return null;
        }
        switch (nodeType) {
            case SkymelECGraphUtils.NODE_TYPE_LOCAL_INFERENCE_RUNNER:
                return new SkymelECGraphNodeForLocalInference(nodeInitializationConfig);

            case SkymelECGraphUtils.NODE_TYPE_REMOTE_INFERENCE_RUNNER:
                return new SkymelECGraphNodeForRemoteInference(nodeInitializationConfig);

            case SkymelECGraphUtils.NODE_TYPE_EXTERNAL_API_CALLER:
                return new SkymelECGraphNodeForExternalApiCall(nodeInitializationConfig);

            case SkymelECGraphUtils.NODE_TYPE_TRANSFORMERJS_PROCESSOR:
                return new SkymelECGraphNodeForTransformerJSProcessing(nodeInitializationConfig);

            case SkymelECGraphUtils.NODE_TYPE_LLM_INPUT_PREPARER:
                return new SkymelECGraphNodeForLLMInputPrep(nodeInitializationConfig);

            case SkymelECGraphUtils.NODE_TYPE_LLM_OUTPUT_LOGITS_TO_TOKEN_ID_GREEDY_SEARCHER:
                return new SkymelECGraphNodeForLLMLogitsGreedySearch(nodeInitializationConfig);

            case SkymelECGraphUtils.NODE_TYPE_BASE:
                return new SkymelECGraphNode(nodeInitializationConfig);

            default:
                return null;
        }
    }
}