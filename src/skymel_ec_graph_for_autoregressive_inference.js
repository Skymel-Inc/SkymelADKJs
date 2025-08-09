import {SkymelECGraph} from "./skymel_execution_control_graph.js";
import {CommonValidators} from "./common_validators.js";
import {CommonGraphAlgorithms} from "./common_graph_algorithms.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";

export class SkymelECGraphForAutoregressiveInference extends SkymelECGraph {

    constructor(initializationOptions) {
        super(initializationOptions);
        // These following values are used to identify the nodeIds where the autoregression starts and ends.
        this.autoregressionStartNodeIds = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'autoregressionStartNodeIds', null);
        this.autoregressionEndNodeIds = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'autoregressionEndNodeIds', null);


        /**
         * Is a dictionary containing a map of {sourceFullyQualifiedOutputName:{destinationFullyQualifiedOutputNameToUpdate:'append length'}}
         */
        this.coreAutoregressionGraphInputFeedbackDetails = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'coreAutoregressionGraphInputFeedbackDetails', null);

        this.autoregressiveSubgraph = null;
        this.autoregressiveSubgraphCreationTimestamp = null;


        this.postAutoregressionSubgraph = null;
        this.postAutoregressionSubgraphCreationTimestamp = null;
        /**
         * Is a dictionary containing a map of {fullyQualifiedOutputName:{'stopGenerationTokenId':11, 'maxAllowedTokens':200}}
         */
        this.autoregressionStopCriteria = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'autoregressionStopCriteria', null);
        this.externalInputNamesThatMaybeEmptyArrays = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationOptions, 'externalInputNamesThatMaybeEmptyArrays', null);

        this.lastExecutedGraphId = null;

        this.onMultipleAutoRegressionRoundsCompleteCallback = null;
        this.executeCallbackEveryNumberOfAutoregressiveRounds = null;
        this.numberOfAutoRegressionRoundsComplete = 0;
    }

    getGraphType() {
        return SkymelECGraphUtils.GRAPH_TYPE_AUTOREGRESSIVE_INFERENCE_RUNNER;
    }

    hasStopGenerationTokenIdAsLastTokenId(result, stopGenerationTokenId) {
        if (CommonValidators.isArray(result) && CommonValidators.isNumber(stopGenerationTokenId) && !CommonValidators.isEmpty(result)) {
            return result[result.length - 1] === stopGenerationTokenId;
        }
        return false;
    }

    hasReachedMaxAllowedTokensLength(result, maxAllowedTokensLength) {
        if (CommonValidators.isArray(result) && CommonValidators.isNumber(maxAllowedTokensLength) && !CommonValidators.isEmpty(result)) {
            return result.length >= maxAllowedTokensLength;
        }
        return false;
    }

    isStopCriteriaMet(executionResult, lastExecutedGraphId) {
        // console.log("Evaluating stop criteria.");
        if (CommonValidators.isEmpty(this.autoregressionStopCriteria) || !CommonValidators.isDict(this.autoregressionStopCriteria)) {
            return true;
        }
        for (let x in this.autoregressionStopCriteria) {
            // console.log("Evaluating stop criteria for : " + x);
            let outputNameParsedParts = SkymelECGraphUtils.parseGraphComponentName(x, /*isOutputName=*/true, /*isNodeId=*/false);
            if (CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(outputNameParsedParts, 'graphId', null) === null) {
                outputNameParsedParts['graphId'] = lastExecutedGraphId;
            }
            const fullyQualifiedOutputName = SkymelECGraphUtils.reconstructGraphComponentNameFromParsedParts(outputNameParsedParts);
            if (!(fullyQualifiedOutputName in executionResult)) {
                continue;
            }
            const stopConditionsForCurrentOutput = this.autoregressionStopCriteria[x];
            // console.log(stopConditionsForCurrentOutput);
            const currentOutput = executionResult[fullyQualifiedOutputName];
            // console.log(currentOutput);
            if (CommonValidators.isNotEmptyDictAndHasKey(stopConditionsForCurrentOutput, 'maxAllowedTokens') && this.hasReachedMaxAllowedTokensLength(currentOutput, stopConditionsForCurrentOutput['maxAllowedTokens'])) {
                return true;
            }
            if (CommonValidators.isNotEmptyDictAndHasKey(stopConditionsForCurrentOutput, 'stopGenerationTokenId') && this.hasStopGenerationTokenIdAsLastTokenId(currentOutput, stopConditionsForCurrentOutput['stopGenerationTokenId'])) {
                return true;
            }
        }
        return false;
    }

    createSubGraphFromListOfNodes(listOfNodeIds, subGraphId) {
        let graphInitializationConfig = {graphId: subGraphId};
        // graphInitializationConfig['externalInputNames'] = externalInputNames;
        // graphInitializationConfig = SkymelECGraphUtils.addExternalInputNamesToGraphInitializationConfig(
        //     externalInputNames, graphInitializationConfig,/*replaceExistingEntry=*/true);
        let subGraph = new SkymelECGraph(graphInitializationConfig);
        if (CommonValidators.isEmpty(listOfNodeIds)) {
            return subGraph;
        }
        for (let i = 0; i < listOfNodeIds.length; ++i) {
            const nodeId = listOfNodeIds[i];
            subGraph.addNode(this.getNodeById(nodeId));
        }
        return subGraph;
    }

    createAutoregressiveSubgraphFromNodeIds(listOfNodeIds) {
        let subGraphId = this.getGraphId() + '_autoregressive_subgraph';
        this.autoregressiveSubgraph = this.createSubGraphFromListOfNodes(listOfNodeIds, subGraphId);
        this.autoregressiveSubgraphCreationTimestamp = this.getGraphLastModifiedTimestamp();
    }

    async maybeCreateAndReturnAutoregressiveSubgraph() {
        if (this.autoregressiveSubgraphCreationTimestamp === this.getGraphLastModifiedTimestamp()) {
            return this.autoregressiveSubgraph;
        }
        const executionDependencyGraph = this.getExecutionDependencyGraph();
        const autoregressiveSubgraphNodeIds = await CommonGraphAlgorithms.getSubGraphNodeIds(executionDependencyGraph, this.autoregressionStartNodeIds, this.autoregressionEndNodeIds);

        this.createAutoregressiveSubgraphFromNodeIds(autoregressiveSubgraphNodeIds);
        if (!CommonValidators.isEmpty(this.autoregressiveSubgraph)) {
            const computedAutoRegressiveSubgraphExternalInputNames = this.autoregressiveSubgraph.computeExternalInputNames();
            if (!CommonValidators.isEmpty(computedAutoRegressiveSubgraphExternalInputNames)) {
                this.autoregressiveSubgraph.setExternalInputNames(computedAutoRegressiveSubgraphExternalInputNames);
            }
        }
        return this.autoregressiveSubgraph;
    }


    createPostAutoregressionSubgraphFromNodeIds(listOfNodeIds) {
        let subGraphId = this.getGraphId() + '_post_autoregression_subgraph';
        this.postAutoregressionSubgraph = this.createSubGraphFromListOfNodes(listOfNodeIds, subGraphId);
        this.postAutoregressionSubgraphCreationTimestamp = this.getGraphLastModifiedTimestamp();
    }

    maybeCreateAndReturnPostAutoregressionSubgraph() {
        if (this.postAutoregressionSubgraphCreationTimestamp === this.getGraphLastModifiedTimestamp()) {
            return this.postAutoregressionSubgraph;
        }
        const executionDependencyGraph = this.getExecutionDependencyGraph();
        const postAutoregressionSubgraphNodeIds = CommonGraphAlgorithms.getAllDownStreamNodeIds(executionDependencyGraph, this.autoregressionEndNodeIds, /*addSourceNodeIdsToReturnedList=*/false);

        this.createPostAutoregressionSubgraphFromNodeIds(postAutoregressionSubgraphNodeIds);
        if (!CommonValidators.isEmpty(this.postAutoregressionSubgraph)) {
            const postAutoRegressionSubgraphExternalInputNames = this.postAutoregressionSubgraph.computeExternalInputNames();
            if (!CommonValidators.isEmpty(postAutoRegressionSubgraphExternalInputNames)) {
                this.postAutoregressionSubgraph.setExternalInputNames(postAutoRegressionSubgraphExternalInputNames);
            }
        }
        return this.postAutoregressionSubgraph;
    }


    getFullyQualifiedOutputName(outputName, graphId) {
        const parsedNameParts = SkymelECGraphUtils.parseGraphComponentName(outputName, true, false);
        if (CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(parsedNameParts, 'graphId', null) === null) {
            parsedNameParts['graphId'] = graphId;
        }
        return SkymelECGraphUtils.reconstructGraphComponentNameFromParsedParts(parsedNameParts);
    }

    updateGraphExecutionConfigUsingLastExecutionResults(lastGraphExecutionConfig, lastExecutionResults, lastExecutedGraphId = null) {
        if (lastExecutedGraphId === null) {
            lastExecutedGraphId = this.getGraphId();
        }
        // console.log("Updating graphExecutionConfig using lastExecutionResults.");
        // console.log("lastGraphExecutionConfig:");
        // console.log(lastGraphExecutionConfig);
        // console.log("lastExecutionResults:");
        // console.log(lastExecutionResults);
        // console.log("autoregressionOutputsUpdateMap:");
        // console.log(this.coreAutoregressionGraphInputFeedbackDetails);
        if (CommonValidators.isEmpty(this.coreAutoregressionGraphInputFeedbackDetails) || CommonValidators.isEmpty(lastExecutionResults)) {
            return;
        }
        const externalInputNamesToValuesDict = SkymelECGraphUtils.getExternalInputNamesToValuesDictFromGraphExecutionConfig(lastGraphExecutionConfig);
        let verbosityFlag = false;
        let affectedFQON = [];
        for (let x in this.coreAutoregressionGraphInputFeedbackDetails) {
            // console.log("Looking for :" + x);
            const fullyQualifiedOutputName = this.getFullyQualifiedOutputName(x, lastExecutedGraphId);
            // console.log("Now looking for :" + fullyQualifiedOutputName);
            if (!(fullyQualifiedOutputName in lastExecutionResults)) {
                continue;
            }
            for (let y in this.coreAutoregressionGraphInputFeedbackDetails[x]) {
                const fullyQualifiedTargetOutputName = this.getFullyQualifiedOutputName(y, lastExecutedGraphId);
                const updateType = this.coreAutoregressionGraphInputFeedbackDetails[x][y];
                // console.log("Update for :" + y);
                // console.log(updateType);
                let destinationValue = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(externalInputNamesToValuesDict, y, null);
                if (destinationValue === null) {
                    destinationValue = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(lastExecutionResults, fullyQualifiedTargetOutputName, []);
                }
                // console.log(destinationValue)
                // console.log("Updating external input  : ", y, " with value : ", lastExecutionResults[fullyQualifiedOutputName], " it had prior value : ", destinationValue);
                if (CommonValidators.isEmpty(lastExecutionResults[fullyQualifiedOutputName]) && !CommonValidators.isEmpty(destinationValue)) {
                    verbosityFlag = true;
                    affectedFQON.push(fullyQualifiedOutputName);
                }
                externalInputNamesToValuesDict[y] = SkymelECGraphUtils.updateFieldValue(updateType, lastExecutionResults[fullyQualifiedOutputName], destinationValue);
            }
        }
        if (verbosityFlag) {
            console.log("Encountered a situation where prior values are not null, however current values are");
            console.log("Affected fully-qualified output names : ", affectedFQON);
            console.log("Received lastExecutionResults : ", lastExecutionResults);
            console.log("Received lastExecutedGraphId : ", lastExecutedGraphId);
            console.log("Received lastGraphExecutionConfig : ", lastGraphExecutionConfig);
            console.log("Created externalInputNamesToValuesDict", externalInputNamesToValuesDict);
        }
        // console.log("Updated externalInputNamesToValuesDict:");
        // console.log(externalInputNamesToValuesDict);

        lastGraphExecutionConfig = SkymelECGraphUtils.addExternalInputNamesToValuesDictToGraphExecutionConfig(externalInputNamesToValuesDict, lastGraphExecutionConfig, true);

        return lastGraphExecutionConfig;
    }

    addExternalInputValuesFromExecutionResultsToExecutionConfig(graphExecutionConfig, externalInputNames, lastExecutionResults, lastExecutedGraphId = null) {
        if (lastExecutedGraphId === null) {
            lastExecutedGraphId = this.getGraphId();
        }
        if (CommonValidators.isEmpty(graphExecutionConfig)) {
            graphExecutionConfig = {};
        }
        if (CommonValidators.isEmpty(lastExecutionResults) || CommonValidators.isEmpty(externalInputNames)) {
            return graphExecutionConfig;
        }

        const externalInputNamesToValuesDict = SkymelECGraphUtils.getExternalInputNamesToValuesDictFromGraphExecutionConfig(graphExecutionConfig);
        for (let i = 0; i < externalInputNames.length; ++i) {
            const inputName = externalInputNames[i];
            // console.log("Looking for :" + inputName);
            const fullyQualifiedInputName = this.getFullyQualifiedOutputName(inputName, lastExecutedGraphId);
            // console.log("Now looking for :" + fullyQualifiedInputName);
            if (!(fullyQualifiedInputName in lastExecutionResults)) {
                continue;
            }
            externalInputNamesToValuesDict[inputName] = lastExecutionResults[fullyQualifiedInputName];
        }
        SkymelECGraphUtils.addExternalInputNamesToValuesDictToGraphExecutionConfig(externalInputNamesToValuesDict, graphExecutionConfig, true);
        return graphExecutionConfig;
    }

    async executeAutoregressiveGraph(graphExecutionConfig, measureExecutionTime, lastExecutionResult) {
        const autoRegressiveGraph = await this.maybeCreateAndReturnAutoregressiveSubgraph();
        // console.log("Autoregressive core graph:");
        // console.log(autoRegressiveGraph);

        let currentGraphExecutionConfig = CommonValidators.isEmpty(autoRegressiveGraph.getGraphExecutionConfig()) ? {} : autoRegressiveGraph.getGraphExecutionConfig();
        if (!CommonValidators.isEmpty(graphExecutionConfig) && CommonValidators.isDict(graphExecutionConfig)) {
            Object.assign(currentGraphExecutionConfig, graphExecutionConfig);
        }
        let lastExecutedGraphId = this.getGraphId();
        while (!this.isStopCriteriaMet(lastExecutionResult, lastExecutedGraphId)) {
            currentGraphExecutionConfig = this.updateGraphExecutionConfigUsingLastExecutionResults(currentGraphExecutionConfig, lastExecutionResult, lastExecutedGraphId);
            // console.log("Executing autoRegressive graph with config:");
            // console.log(currentGraphExecutionConfig);
            const executionStatus = await autoRegressiveGraph.executeGraph(currentGraphExecutionConfig, measureExecutionTime);

            // console.log(executionStatus);
            if (!executionStatus) {
                return executionStatus;
            }
            this.lastExecutedGraphId = autoRegressiveGraph.getGraphId();
            lastExecutedGraphId = autoRegressiveGraph.getGraphId();
            lastExecutionResult = autoRegressiveGraph.getLastExecutionResult(true);

            await this.maybeExecuteOnMultipleAutoRegressionRoundsCompleteCallback(currentGraphExecutionConfig, measureExecutionTime);
        }
        return true;
    }


    async executePostAutoRegressionOutputProcessing(graphExecutionConfig, measureExecutionTime,
                                                    autoRegressionExecutionResult, lastExecutedAutoregressionGraphId) {
        const postAutoregressionSubgraph = this.maybeCreateAndReturnPostAutoregressionSubgraph();
        // console.log("Post autoregression subgraph:");
        // console.log(postAutoregressionSubgraph);
        let currentGraphExecutionConfig = (CommonValidators.isDict(graphExecutionConfig) && !CommonValidators.isEmpty(graphExecutionConfig)) ? graphExecutionConfig : {};
        let subgraphExternalInputNames = CommonValidators.isEmpty(postAutoregressionSubgraph.getExternalInputNames()) ? [] : postAutoregressionSubgraph.getExternalInputNames();
        currentGraphExecutionConfig = this.addExternalInputValuesFromExecutionResultsToExecutionConfig(currentGraphExecutionConfig, subgraphExternalInputNames, autoRegressionExecutionResult, lastExecutedAutoregressionGraphId);
        // console.log("Modified graph config for Post AR Subgraph : ");
        // console.log(currentGraphExecutionConfig);
        const executionStatus = await postAutoregressionSubgraph.executeGraph(currentGraphExecutionConfig, measureExecutionTime);
        if (!executionStatus) {
            return executionStatus;
        }
        return true;
    }

    async executeGraph(graphExecutionConfig = null, measureExecutionTime = true) {
        let externalInputNamesToValues = SkymelECGraphUtils.getExternalInputNamesToValuesDictFromGraphExecutionConfig(graphExecutionConfig);
        let currentGraphExecutionConfig = CommonValidators.isEmpty(this.getGraphExecutionConfig()) ? {} : this.getGraphExecutionConfig();
        if (!CommonValidators.isEmpty(graphExecutionConfig) && CommonValidators.isDict(graphExecutionConfig)) {
            Object.assign(currentGraphExecutionConfig, graphExecutionConfig);
        }
        if (!CommonValidators.isEmpty(this.externalInputNamesThatMaybeEmptyArrays) && CommonValidators.isArray(this.externalInputNamesThatMaybeEmptyArrays)) {
            if (CommonValidators.isEmpty(externalInputNamesToValues)) {
                externalInputNamesToValues = {};
            }
            for (let i = 0; i < this.externalInputNamesThatMaybeEmptyArrays.length; ++i) {
                const inputName = this.externalInputNamesThatMaybeEmptyArrays[i];
                if (inputName in externalInputNamesToValues) {
                    continue;
                }
                externalInputNamesToValues[inputName] = [];
            }
            currentGraphExecutionConfig = SkymelECGraphUtils.addExternalInputNamesToValuesDictToGraphExecutionConfig(externalInputNamesToValues, currentGraphExecutionConfig, true);
            this.setGraphExecutionConfig(currentGraphExecutionConfig);
        }
        // First we execute the whole graph as if it were a non-autoregressive graph. This warms up any nodes that
        // need warm-up. Additionally, it notifies us of any potential failures/pit-falls.
        const executionStatus = await super.executeGraph(currentGraphExecutionConfig, measureExecutionTime);
        if (!executionStatus) {
            return executionStatus;
        }

        // If the whole graph execution is successful, we then start looping over the autoregressive bit, until the
        // autoregression stop criteria are met.
        const lastExecutionResult = this.getLastExecutionResult(true);
        const autoregressiveSubgraphExecutionStatus = await this.executeAutoregressiveGraph(graphExecutionConfig, measureExecutionTime, lastExecutionResult);
        if (CommonValidators.isEmpty(autoregressiveSubgraphExecutionStatus)) {
            return autoregressiveSubgraphExecutionStatus;
        }

        // After the autoregressive loop is done we execute the remainder of the graph and return the output.
        const autoregressiveSubgraphExecutionResult = this.autoregressiveSubgraph.getLastExecutionResult(true);
        return await this.executePostAutoRegressionOutputProcessing(graphExecutionConfig, measureExecutionTime, autoregressiveSubgraphExecutionResult, this.lastExecutedGraphId);
    }

    /**
     *
     * @param onMultipleRegressionRoundsComplete An async function that takes the generated result object of the
     * complete auto-regressive graph (including any non-looping nodes) as input.
     * @param executeCallbackEveryNumberOfAutoregressiveRounds Every this many number of rounds the
     * `onMultipleRegressionRoundsComplete` function is called.
     */
    addOnMultipleAutoRegressionRoundsCompleteCallback(onMultipleRegressionRoundsComplete,
                                                      executeCallbackEveryNumberOfAutoregressiveRounds = 1) {
        this.onMultipleAutoRegressionRoundsCompleteCallback = onMultipleRegressionRoundsComplete;
        this.executeCallbackEveryNumberOfAutoregressiveRounds = executeCallbackEveryNumberOfAutoregressiveRounds;
    }

    async maybeExecuteOnMultipleAutoRegressionRoundsCompleteCallback(graphExecutionConfig, measureExecutionTime) {
        ++this.numberOfAutoRegressionRoundsComplete;
        if (CommonValidators.isEmpty(this.executeCallbackEveryNumberOfAutoregressiveRounds) ||
            this.numberOfAutoRegressionRoundsComplete % this.executeCallbackEveryNumberOfAutoregressiveRounds !== 0) {
            return;
        }
        if (CommonValidators.isEmpty(this.onMultipleAutoRegressionRoundsCompleteCallback) ||
            !CommonValidators.isMethod(this.onMultipleAutoRegressionRoundsCompleteCallback)) {
            return;
        }
        const autoregressiveSubgraphExecutionResult = this.autoregressiveSubgraph.getLastExecutionResult(true);
        const executionStatus = await this.executePostAutoRegressionOutputProcessing(graphExecutionConfig, measureExecutionTime,
            autoregressiveSubgraphExecutionResult, this.lastExecutedGraphId);
        if(!executionStatus){
            return;
        }
        const result = this.getLastExecutionResult();
        return await this.onMultipleAutoRegressionRoundsCompleteCallback(result);
    }
}