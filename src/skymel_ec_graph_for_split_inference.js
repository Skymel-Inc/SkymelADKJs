import {SkymelECGraph} from "./skymel_execution_control_graph.js";
import {CommonValidators} from "./common_validators.js";
import {SkymelECGraphNodeForLocalInference} from "./skymel_ec_graph_node_for_local_inference.js";
import {SkymelECGraphNodeForRemoteInference} from "./skymel_ec_graph_node_for_remote_inference.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";

export class SkymelECGraphForSplitInference extends SkymelECGraph {
    constructor(initializationOptions) {
        super(initializationOptions);
        this.localModelGraphNodeInitializationOptions = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'localModelGraphNodeInitializationOptions') ? initializationOptions['localModelGraphNodeInitializationOptions'] : null;
        this.remoteModelGraphNodeInitializationOptions = CommonValidators.isNotEmptyDictAndHasKey(initializationOptions,
            'remoteModelGraphNodeInitializationOptions') ? initializationOptions['remoteModelGraphNodeInitializationOptions'] : null;
        if (CommonValidators.isEmpty(this.localModelGraphNodeInitializationOptions) || !SkymelECGraphNodeForLocalInference.isValidInitializationOptions(this.localModelGraphNodeInitializationOptions)) {
            throw new Error("Invalid localModelGraphNodeInitializationOptions provided in constructor.");
        }
        if (CommonValidators.isEmpty(this.remoteModelGraphNodeInitializationOptions) || !SkymelECGraphNodeForRemoteInference.isValidInitializationOptions(this.remoteModelGraphNodeInitializationOptions)) {
            throw new Error("Invalid remoteModelGraphNodeInitializationOptions provided in constructor.");
        }

        this.localModelGraphNode = new SkymelECGraphNodeForLocalInference(this.localModelGraphNodeInitializationOptions);
        this.remoteModelGraphNode = new SkymelECGraphNodeForRemoteInference(this.remoteModelGraphNodeInitializationOptions);

        this.addNode(this.localModelGraphNode);
        this.addNode(this.remoteModelGraphNode);
    }

    getGraphType() {
        return SkymelECGraphUtils.GRAPH_TYPE_SPLIT_INFERENCE_RUNNER;
    }
}