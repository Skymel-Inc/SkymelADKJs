import {CommonValidators} from "./common_validators.js";
import {SkymelExecutionGraphLoader} from "./skymel_execution_graph_loader.js";
import {SkymelECGraphUtils} from "./skymel_ec_graph_utils.js";
import {SkymelECGraph} from "./skymel_execution_control_graph.js";

export class SkymelAgent {
    constructor(apiKey, agentCreationEndpointUrl = "/websocket-dynamic-agent-generation-infer",
                agentCreationEndpointUrlIsWebSocketUrl = true, agentNameString = "",
                agentDefinitionString = "",
                agentRestrictionsString = "", developerConfigurationString = "", isMcpEnabled = false,) {
        this.apiKey = apiKey;
        this.agentDeveloperConfigurationString = this.getDeveloperConfigurationString(developerConfigurationString,
            agentNameString, agentDefinitionString, agentRestrictionsString);
        this.agentCreationEndpointUrl = agentCreationEndpointUrl;
        this.agentCreationEndpointUrlIsWebSocketUrl = agentCreationEndpointUrlIsWebSocketUrl;
        this.isMcpEnabled = isMcpEnabled;

        this.agenticWorkflowIdToJsonConfig = {};
    }

    getAgentCreationEndpointUrl() {
        return this.agentCreationEndpointUrl;
    }

    getDeveloperConfigurationString(devConfig, agentName, agentDefinition, agentRestrictions) {
        let output = "";
        if (CommonValidators.isNonEmptyString(agentName)) {
            output += "Your name is " + agentName + ".\n";
        }
        if (CommonValidators.isNonEmptyString(agentDefinition)) {
            output += "Your purpose is as follows:\n" + agentDefinition + "\n";
        }
        if (CommonValidators.isNonEmptyString(agentRestrictions)) {
            output += "You have to make sure to abide by the following:\n" + agentRestrictions + "\n";
        }
        if (CommonValidators.isNonEmptyString(devConfig)) {
            output += devConfig;
        }
        return output;
    }

    /**
     *
     * @param {File[]} listOfHtmlFileInputs
     * @returns {Promise<Awaited<unknown>[]>}
     */
    async getFileDataAndDetailsDictFromHtmlInputsForAgentGraphAttachment(listOfHtmlFileInputs) {
        if (!CommonValidators.isArray(listOfHtmlFileInputs)) {
            return Promise.reject('listOfHtmlFileInputs is not an array.');
        }
        if (listOfHtmlFileInputs.length === 0) {
            return Promise.reject('listOfHtmlFileInputs is an empty array.');
        }

        return await Promise.all(
            listOfHtmlFileInputs.map(async (file, index) => {
                try {
                    return await SkymelECGraphUtils.getFileDataAndDetailsDictFromHtmlFileInputElement(file);
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    throw error;
                }
            })
        );
    }

    /**
     * Creates JSON configuration object that can be loaded into a SkymelECGraph instance.
     * @param {string} contextIdString A string used to group and uniquely identify the current SkymelECGraph's
     * context. This enables different nodes within the same graph to obtain available contents of related nodes.
     * @param {number} numberOfAttachedFileDataAndDetailsObjects
     * @returns {Object} A JSON Object from which a SkymelECGraph can be created/loaded.
     */
    makeJsonConfigObjectToLoadSkymelECGraph(contextIdString = '', numberOfAttachedFileDataAndDetailsObjects = 0) {
        // The following array contains the node variable names that are externally provided.
        let externalInputNames = ["external.text"];
        // The following dictionary maps SkymelECGraphNode variable names to names used by the external API backend.
        let inputMappings = {"external.text": "textInput"};


        if (numberOfAttachedFileDataAndDetailsObjects > 0) {
            for (let i = 0; i < numberOfAttachedFileDataAndDetailsObjects; ++i) {
                const inputName = `external.file${i + 1}`;
                externalInputNames.push(inputName);

                // Map each file input to a backend input name
                inputMappings[inputName] = `fileInput${i + 1}`;
            }
        }

        // Create the graph description
        let graphDescriptionJson = {
            graphType: SkymelECGraphUtils.GRAPH_TYPE_BASE,
            graphInitializationConfig: {
                graphId: 'agent_graph_generator',
                externalInputNames: externalInputNames,
            },
            children: [],
        };

        // Create the node configuration
        let node1ConfigObject = {
            nodeType: SkymelECGraphUtils.NODE_TYPE_EXTERNAL_API_CALLER,
            nodeInitializationConfig: {
                nodeId: 'dynamicWorkflowCallerNode',
                nodeInputNames: externalInputNames,
                nodeOutputNames: ["outputText"],
                nodePrivateAttributesAndValues: {contextId: contextIdString, createNewContextIfContextIsNull: true},
                endpointUrl: this.agentCreationEndpointUrl,
                apiKey: this.apiKey,
                nodeInputNameToBackendInputNameMap: inputMappings,
                backendOutputNameToNodeOutputNameMap: {"textOutputs": "dynamicWorkflowCallerNode.outputText"},
                isEndpointWebSocketUrl: this.agentCreationEndpointUrlIsWebSocketUrl
            }
        };

        graphDescriptionJson.children.push(node1ConfigObject);
        return graphDescriptionJson;
    }

    __updateAgentGraphCreationJsonConfigWithAgentCreationSpecificInformation(agentCreationGraphJson, developerPrompt = '', availableInputs = {}, isMcpEnabled = false) {
        if (agentCreationGraphJson.children && agentCreationGraphJson.children[0]) {
            agentCreationGraphJson.children[0].nodeInitializationConfig.nodePrivateAttributesAndValues = {
                ...agentCreationGraphJson.children[0].nodeInitializationConfig.nodePrivateAttributesAndValues,
                developerPrompt: developerPrompt,
                availableInputs: JSON.stringify(availableInputs),
                mcpEnabled: isMcpEnabled
            };
        }
        return agentCreationGraphJson;
    }

    __getAgentTaskOrPlaceholder(agentTaskString) {
        let temporaryTaskString = agentTaskString.trim();
        if (CommonValidators.isNonEmptyString(temporaryTaskString)) {
            return temporaryTaskString;
        }
        return "This is a placeholder for a potential user-centric input task. At the moment, please proceed assuming a default state for every choice required."
    }

    __getAgentCreationGraphExternalInputValues(agentTask, fileDataAndDetailsForSkymelECGraphAttachment) {
        let output = {};
        output["external.text"] = this.__getAgentTaskOrPlaceholder(agentTask);
        if (CommonValidators.isArray(fileDataAndDetailsForSkymelECGraphAttachment) && fileDataAndDetailsForSkymelECGraphAttachment.length > 0) {
            for (let i = 0; i < fileDataAndDetailsForSkymelECGraphAttachment.length; ++i) {
                if (!CommonValidators.isNotEmptyObjectAndHasMember(fileDataAndDetailsForSkymelECGraphAttachment[i], 'content')) {
                    continue;
                }
                output[`external.file${i + 1}`] = fileDataAndDetailsForSkymelECGraphAttachment[i].content;
            }
        }
        return output;
    }

    /**
     *
     * @param {string}  agentTask
     * @param fileDataAndDetailsForSkymelECGraphAttachment - Array of one or many file data and details
     * object(s), each of which contains the following properties/keys : name, type, size, lastModified, content. The
     * content is base64 encoded.
     * @param {string}  contextIdString
     * @returns {Promise<{}|null>}
     */
    async getAgenticWorkflowGraphJsonConfig(agentTask = '',
                                            fileDataAndDetailsForSkymelECGraphAttachment = [],
                                            contextIdString = '') {
        const numberOfAttachedFileDataAndDetailsObjects = CommonValidators.isArray(fileDataAndDetailsForSkymelECGraphAttachment) ? fileDataAndDetailsForSkymelECGraphAttachment.length : 0;
        let agentCreationGraphJson = this.makeJsonConfigObjectToLoadSkymelECGraph(contextIdString, numberOfAttachedFileDataAndDetailsObjects);
        agentCreationGraphJson = this.__updateAgentGraphCreationJsonConfigWithAgentCreationSpecificInformation(
            agentCreationGraphJson, this.agentDeveloperConfigurationString, {}, this.isMcpEnabled);
        const agentCreationGraph = SkymelExecutionGraphLoader.loadGraphFromJsonObject(agentCreationGraphJson);

        if (!(agentCreationGraph instanceof SkymelECGraph)) {
            return Promise.reject('Could not successfully create agent graph.');
        }
        const externalInputs = this.__getAgentCreationGraphExternalInputValues(agentTask, fileDataAndDetailsForSkymelECGraphAttachment);
        await agentCreationGraph.executeGraph({'externalInputNamesToValuesDict': externalInputs});
        const agentCreationGraphExecutionResult = agentCreationGraph.getLastExecutionResult();
        if (CommonValidators.isEmpty(agentCreationGraphExecutionResult)) {
            return Promise.reject("Got null value as a result of Agent Graph Creation.");
        }

        const agentOutputKey = 'agent_graph_generator.dynamicWorkflowCallerNode.outputText';
        if (!CommonValidators.isNotEmptyObjectAndHasMember(agentCreationGraphExecutionResult, agentOutputKey)) {
            return Promise.reject("Got invalid agent creation result.");
        }
        try {
            const agentJsonGraphObject = JSON.parse(agentCreationGraphExecutionResult[agentOutputKey]);
            this.agenticWorkflowIdToJsonConfig[contextIdString] = agentJsonGraphObject;
            return agentJsonGraphObject;
        } catch (parseError) {
            console.log("Encountered error while JSON parsing Agent Creation Graph response: ", parseError);
            return Promise.reject("Encountered error while JSON parsing Agent Creation Graph response.");
        }
    }

    async runAgenticWorkflow(agenticWorkflowGraphJsonConfig, inputNamesToValuesDict) {
        // Ensure all nodes have apiKey in their initialization config for external API calls
        const processedGraphConfig = this.__ensureApiKeyInNodeConfigs(agenticWorkflowGraphJsonConfig);
        
        const agenticWorkflowSkymelECGraph = SkymelExecutionGraphLoader.loadGraphFromJsonObject(processedGraphConfig);
        
        if (!(agenticWorkflowSkymelECGraph instanceof SkymelECGraph)) {
            return Promise.reject('Could not successfully load agentic workflow graph.');
        }

        const listOfExternalInputs = SkymelECGraphUtils.getExternalInputNamesFromGraphInitializationConfig(agenticWorkflowSkymelECGraph.getInitializationConfig());
        
        // Validate that the graph is valid before execution
        const isGraphValid = await agenticWorkflowSkymelECGraph.isGraphValid();
        if (!isGraphValid) {
            return Promise.reject('Generated agentic workflow graph is invalid and cannot be executed.');
        }

        // Normalize input keys to ensure compatibility with graph expectations
        const normalizedInputs = this.__normalizeInputKeys(inputNamesToValuesDict);
        
        // Execute the agentic workflow graph
        await agenticWorkflowSkymelECGraph.executeGraph({
            'externalInputNamesToValuesDict': normalizedInputs
        });

        const executionResult = agenticWorkflowSkymelECGraph.getLastExecutionResult();
        
        if (CommonValidators.isEmpty(executionResult)) {
            return Promise.reject("Got null value as a result of Agentic Workflow execution.");
        }

        return executionResult;
    }

    /**
     * Normalizes input keys for ECGraph execution to ensure compatibility
     * @param {Object} inputNamesToValuesDict - Input names to values dictionary
     * @returns {Object} Normalized inputs
     */
    __normalizeInputKeys(inputNamesToValuesDict) {
        if (!CommonValidators.isDict(inputNamesToValuesDict) || CommonValidators.isEmpty(inputNamesToValuesDict)) {
            return {};
        }

        const normalized = {};

        for (const key in inputNamesToValuesDict) {
            if (key.includes("input")) {
                normalized[key] = inputNamesToValuesDict[key];
                continue;
            }

            if (key.includes(".")) {
                const [prefix, suffix] = key.split(".", 2);
                normalized[`${prefix}.input${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`] = inputNamesToValuesDict[key];
            } else {
                normalized[key] = inputNamesToValuesDict[key];
            }
        }

        return normalized;
    }

    /**
     * Ensures all external API nodes have apiKey in their configuration
     * @param {Object} graphConfig - The graph configuration object
     * @returns {Object} Updated graph configuration with apiKey added where needed
     */
    __ensureApiKeyInNodeConfigs(graphConfig) {
        if (!graphConfig || !graphConfig.children) {
            return graphConfig;
        }

        // Deep clone to avoid modifying original
        const updatedConfig = JSON.parse(JSON.stringify(graphConfig));

        updatedConfig.children.forEach(node => {
            if (node.nodeType === SkymelECGraphUtils.NODE_TYPE_EXTERNAL_API_CALLER && 
                node.nodeInitializationConfig && 
                node.nodeInitializationConfig.endpointUrl &&
                !node.nodeInitializationConfig.apiKey) {
                // Add the apiKey to nodes that are missing it
                node.nodeInitializationConfig.apiKey = this.apiKey;
            }
        });

        return updatedConfig;
    }
}