/**
 * Workflow Orchestrator
 * Handles workflow execution, node processing, and ECGraph management
 */

import { SkymelExecutionGraphLoader } from "/src/skymel_execution_graph_loader.js";
import { CommonValidators } from "/src/common_validators.js";
import { SkymelECGraphUtils } from "/src/skymel_ec_graph_utils.js";
import { SkymelECGraphNodeForExternalApiCall } from "/src/skymel_ec_graph_node_for_external_api_call.js";


/**
 * Node completion tracker for monitoring workflow progress
 */
export class NodeCompletionTracker {
    constructor() {
        this.totalNodes = 0;
        this.completedNodes = new Set();
    }

    initialize(executionGraph) {
        this.completedNodes.clear();

        // Get total nodes from graph
        if (executionGraph && executionGraph._originalECGraphData && executionGraph._originalECGraphData.nodeIdToObject) {
            const nodeIds = Object.keys(executionGraph._originalECGraphData.nodeIdToObject).filter(id => id !== 'external');
            this.totalNodes = nodeIds.length;
        } else if (executionGraph && executionGraph.nodes) {
            this.totalNodes = executionGraph.nodes.length;
        } else if (executionGraph && executionGraph.listOfNodes) {
            this.totalNodes = executionGraph.listOfNodes.length;
        } else {
            this.totalNodes = 0;
        }

        console.log(`Initialized node completion tracker with ${this.totalNodes} total nodes`);
    }

    markCompleted(nodeId) {
        this.completedNodes.add(nodeId);
        console.log(`Node ${nodeId} completed (${this.completedNodes.size}/${this.totalNodes})`);
        return this.isAllCompleted();
    }

    isAllCompleted() {
        return this.completedNodes.size >= this.totalNodes && this.totalNodes > 0;
    }

    reset() {
        this.totalNodes = 0;
        this.completedNodes.clear();
    }
}

/**
 * WorkflowOrchestrator class - Main orchestrator for workflow execution
 */
export class WorkflowOrchestrator {
    constructor() {
        this.nodeTracker = new NodeCompletionTracker();
        this.currentWorkflowSection = null;
        this.currentExecutionGraph = null;
    }

    /**
     * Creates JSON configuration object for loading ECGraph
     * @param {File[]} attachments - Array of file attachments
     * @returns {Object} JSON configuration for graph loading
     */
    makeJsonConfigObjectToLoadGraph(attachments = [], contextId='') {
        // Start with the base external input for text
        let externalInputNames = ["external.text"];
        let inputMappings = {"external.text": "textInput"};

        // Add file inputs if there are attachments
        if (attachments && attachments.length > 0) {
            // Add each file as an external input with enumerated names
            attachments.forEach((file, index) => {
                const inputName = `external.file${index + 1}`;
                externalInputNames.push(inputName);

                // Map each file input to a backend input name
                inputMappings[inputName] = `fileInput${index + 1}`;
            });
        }

        // Create the graph description
        let graphDescriptionJson = {
            graphType: SkymelECGraphUtils.GRAPH_TYPE_BASE,
            graphInitializationConfig: {
                graphId: 'dynamic_graph',
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
                nodePrivateAttributesAndValues: {contextId: contextId, createNewContextIfContextIsNull: true},
                endpointUrl: "https://skymel.com/websocket-dynamic-pipeline-generation-infer",
                nodeInputNameToBackendInputNameMap: inputMappings,
                backendOutputNameToNodeOutputNameMap: {"textOutputs": "dynamicWorkflowCallerNode.outputText"},
                isEndpointWebSocketUrl: true
            }
        };

        graphDescriptionJson.children.push(node1ConfigObject);
        return graphDescriptionJson;
    }

    /**
     * Gets all nodes of interest from a graph
     * @param {Object} graph - The execution graph
     * @returns {Array} Array of nodes that are external API callers
     */
    getAllNodeOfInterestFromGraph(graph) {
        let allNodesOfInterest = [];
        const listOfAllNodeIds = graph.getListOfAllNodeIds();

        for (const nodeId of listOfAllNodeIds) {
            let currentNode = graph.getNodeById(nodeId);
            if (currentNode instanceof SkymelECGraphNodeForExternalApiCall) {
                allNodesOfInterest.push(currentNode);
            }
        }

        return allNodesOfInterest;
    }

    /**
     * Processes file data for sending to the backend
     * @param {File} file - The file to process
     * @returns {Promise<Object>} Object containing file data and metadata
     */
    async processFileForSending(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (e) {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: file.lastModified,
                    content: e.target.result // Base64 data for binary files
                };
                resolve(fileData);
            };

            reader.onerror = function (e) {
                reject(new Error('Error reading file: ' + file.name));
            };

            // Read file as data URL (base64) which works for all file types
            reader.readAsDataURL(file);
        });
    }

    /**
     * Converts ECGraph format to a format compatible with workflow visualization
     * @param {Object} ecgraphData - ECGraph data with nodeIdToObject structure
     * @param {Object} externalInputs - External inputs for the workflow
     * @returns {Object} Converted workflow structure
     */
    convertECGraphToWorkflowFormat(ecgraphData, externalInputs) {
        console.log('Converting ECGraph format to visualization format');

        if (!ecgraphData || !ecgraphData.nodeIdToObject) {
            console.error('Invalid ECGraph data format');
            return null;
        }

        // Check if we have initialization config with external output names
        const externalOutputNames = ecgraphData.initializationConfig?.externalOutputNames || [];

        // Find the output node ID from externalOutputNames
        let outputNodeId = null;
        if (externalOutputNames.length > 0) {
            const outputMatch = externalOutputNames[0].match(/^(node\d+)/);
            if (outputMatch) {
                outputNodeId = outputMatch[1];
            }
        }

        // If no output node was found in externalOutputNames, use the last node as output
        if (!outputNodeId) {
            const nodeIds = Object.keys(ecgraphData.nodeIdToObject).filter(id => id !== 'external');
            outputNodeId = nodeIds[nodeIds.length - 1];
        }

        // Extract nodes from nodeIdToObject
        const nodes = [];
        const nodeIds = Object.keys(ecgraphData.nodeIdToObject).filter(id => id !== 'external');

        nodeIds.forEach(nodeId => {
            const nodeData = ecgraphData.nodeIdToObject[nodeId];
            if (!nodeData) return;

            // Get model name and task information from node private attributes
            let modelName = nodeData.nodePrivateAttributesAndValues?.modelName || '';
            modelName = modelName.replace(/"/g, '');

            const taskCategory = nodeData.nodePrivateAttributesAndValues?.task_category || '';
            const instruction = nodeData.nodePrivateAttributesAndValues?.instruction || '';
            const performance = nodeData.nodePrivateAttributesAndValues?.performance_tier || 'Standard';
            const inputLabel = nodeData.nodePrivateAttributesAndValues?.inputContentLabel || '';

            // Get actual execution timing from the node data
            const executionTime = nodeData.executionTimingsMilliseconds && nodeData.executionTimingsMilliseconds.length > 0
                ? nodeData.executionTimingsMilliseconds[0]
                : 0;

            // Determine node type based on position in graph or externalOutputNames
            let nodeType = 'process';

            // First node is input
            if (nodeId === 'node1') nodeType = 'input';

            // Output node is determined by externalOutputNames
            if (nodeId === outputNodeId) nodeType = 'output';

            const node = {
                nodeId: nodeId,
                nodeType: nodeType,
                description: instruction,
                executionTime: executionTime,
                metadata: {
                    model: modelName,
                    task: taskCategory,
                    performance: performance,
                    inputLabel: inputLabel,
                    instruction: instruction
                }
            };

            nodes.push(node);
        });

        // Create edges based on node input connections
        const edges = [];
        nodeIds.forEach(nodeId => {
            const nodeData = ecgraphData.nodeIdToObject[nodeId];
            if (!nodeData || !nodeData.nodeInputNames) return;

            nodeData.nodeInputNames.forEach(inputName => {
                const sourceNodeMatch = inputName.match(/^(node\d+|external)/);
                if (sourceNodeMatch && sourceNodeMatch[1] !== nodeId) {
                    edges.push({
                        sourceNodeId: sourceNodeMatch[1] === 'external' ? 'node1' : sourceNodeMatch[1],
                        destinationNodeId: nodeId,
                        edgeType: 'data'
                    });
                }
            });
        });

        // Create the converted workflow structure
        return {
            workflowId: ecgraphData.graphId || "wf-" + Date.now(),
            listOfNodes: nodes,
            listOfEdges: edges,
            externalInputs: externalInputs,
            _originalECGraphData: ecgraphData
        };
    }

    /**
     * Creates a node visualization callback function
     * @param {Object} executionGraph - Graph object representing the workflow
     * @returns {Function} A callback function for node completion
     */
    makeNodeVisualizationCallback(executionGraph) {
        console.log('Creating enhanced node visualization callback');

        return async (node, graph, isFailure = false) => {
            if (!node || !node.nodeId) {
                console.error('Invalid node in callback');
                return;
            }

            const nodeId = node.nodeId;
            console.log(`Node processing: ${nodeId}, success: ${!isFailure}`);

            try {
                const nodes = executionGraph.nodes || executionGraph.listOfNodes || [];
                const isFirstNode = nodes.length > 0 && nodes[0].nodeId === nodeId;
                const isLastNode = nodes.length > 0 && nodes[nodes.length - 1].nodeId === nodeId;
                const nodeIndex = nodes.findIndex(n => n.nodeId === nodeId);
                const stepNumber = nodeIndex >= 0 ? nodeIndex + 1 : null;

                // Switch to appropriate tab based on processing stage
                if (isFirstNode) {
                    try {
                        console.log('First node processing - switching to steps tab for visibility');
                        const workflowSection = this.currentWorkflowSection;
                        if (workflowSection) {
                            switchToTab(workflowSection, 'steps');
                            this.updatePipelineStep(workflowSection, nodeId, 'processing');
                        }
                    } catch (err) {
                        console.error('Error switching to steps tab:', err);
                    }
                }

                // Get the workflow section
                let workflowSection = this.currentWorkflowSection;
                if (!workflowSection) {
                    workflowSection = document.querySelector('.skymel-workflow, .workflow-visualization, [data-workflow-id], .workflow-container');
                    if (!workflowSection) {
                        console.error('Could not find workflow section');
                        return;
                    }
                }

                // Extract node data
                const nodeData = this.extractNodeData(node);
                const outputData = this.extractOutputData(node, isFailure);

                // Update the UI
                this.updatePipelineStep(workflowSection, nodeId, isFailure ? 'error' : (outputData.isComplete ? 'complete' : 'processing'));

                // Find and update the model card
                const modelCard = this.findModelCard(workflowSection, nodeId);

                if (modelCard) {
                    this.updateModelCardStatus(modelCard, isFailure ? 'error' : (outputData.isComplete ? 'complete' : 'processing'), nodeData.processingTime);

                    if (outputData.outputContent) {
                        const outputHTML = this.createOutputHTML(outputData.outputContent, outputData.outputType, nodeId);

                        const resultPlaceholder = modelCard.querySelector('.result-placeholder');
                        if (resultPlaceholder) {
                            resultPlaceholder.outerHTML = outputHTML;
                        } else {
                            const contentInner = modelCard.querySelector('.skymel-step-content-inner');
                            if (contentInner) {
                                const existingOutput = contentInner.querySelector('.model-output-section');
                                if (existingOutput) {
                                    existingOutput.outerHTML = outputHTML;
                                } else {
                                    contentInner.insertAdjacentHTML('beforeend', outputHTML);
                                }
                            }
                        }

                        if (modelCard.classList.contains('collapsed')) {
                            const header = modelCard.querySelector('.model-card-header');
                            if (header) header.click();
                        }

                        const outputSection = modelCard.querySelector('.model-output-section');
                        if (outputSection) {
                            this.addOutputButtons(outputSection);
                        }
                    }
                } else {
                    console.log(`Model card for node ${nodeId} not found, using fallback method`);
                    const resultHtml = this.createLegacyResultHTML(node, nodeData, outputData, nodeId);
                    processWorkflowNode(workflowSection, nodeId, resultHtml, isLastNode);
                }

                const allCompleted = this.nodeTracker.markCompleted(nodeId);

                if (allCompleted) {
                    try {
                        console.log('All nodes completed - processing final result');
                        const workflowSection = this.currentWorkflowSection;
                        if (workflowSection) {
                            const finalResult = await getFinalResultFromECGraph(executionGraph._originalECGraphData);
                            await setWorkflowFinalResult(workflowSection, finalResult, executionGraph);
                            switchToTab(workflowSection, 'result');
                        }
                    } catch (err) {
                        console.error('Error processing final result:', err);
                    }
                }

            } catch (error) {
                console.error('Error in node visualization callback:', error);
            }
        };
    }

    /**
     * Extracts node data for display
     * @param {Object} node - The node object
     * @returns {Object} Extracted node data
     */
    extractNodeData(node) {
        let modelName = 'AI Model';
        if (node.nodePrivateAttributesAndValues && node.nodePrivateAttributesAndValues.modelName) {
            modelName = node.nodePrivateAttributesAndValues.modelName.replace(/"/g, '');
        }

        let taskType = 'Processing';
        if (node.nodePrivateAttributesAndValues && node.nodePrivateAttributesAndValues.task_category) {
            taskType = node.nodePrivateAttributesAndValues.task_category;
        }

        let instruction = '';
        if (node.nodePrivateAttributesAndValues && node.nodePrivateAttributesAndValues.instruction) {
            instruction = node.nodePrivateAttributesAndValues.instruction;
        }

        let performanceTier = '';
        if (node.nodePrivateAttributesAndValues && node.nodePrivateAttributesAndValues.performance_tier) {
            performanceTier = node.nodePrivateAttributesAndValues.performance_tier;
        }

        let processingTime = 'Processing...';
        if (node.executionTimingsMilliseconds && node.executionTimingsMilliseconds.length > 0) {
            const timeMs = Math.round(node.executionTimingsMilliseconds[0]);
            processingTime = timeMs < 1000 ?
                `${timeMs}ms` :
                `${(timeMs / 1000).toFixed(2)}s`;
        }

        return {
            modelName,
            taskType,
            instruction,
            performanceTier,
            processingTime
        };
    }

    /**
     * Extracts output data from node
     * @param {Object} node - The node object
     * @param {boolean} isFailure - Whether the node failed
     * @returns {Object} Extracted output data
     */
    extractOutputData(node, isFailure) {
        let outputContent = '';
        let outputType = 'text';
        let isComplete = false;

        if (!isFailure && node.executionSuccessfulRunStatuses &&
            node.executionSuccessfulRunStatuses[0] === true) {
            isComplete = true;

            if (node.lastExecutionResult) {
                const outputKey = Object.keys(node.lastExecutionResult)[0];
                if (outputKey && node.lastExecutionResult[outputKey] &&
                    Array.isArray(node.lastExecutionResult[outputKey]) &&
                    node.lastExecutionResult[outputKey].length > 0) {

                    const rawOutput = node.lastExecutionResult[outputKey][0];

                    if (typeof rawOutput === 'string') {
                        outputContent = formatLLMText(rawOutput);
                        outputType = 'text';
                    } else if (typeof rawOutput === 'object') {
                        if (outputKey.toLowerCase().includes('image')) {
                            outputType = 'image';
                            if (rawOutput.imageBase64) {
                                outputContent = rawOutput.imageBase64;
                            } else if (rawOutput.image && typeof rawOutput.image === 'string') {
                                outputContent = rawOutput.image;
                            } else {
                                console.log("Image object structure:", rawOutput);
                                outputContent = rawOutput;
                            }
                        } else {
                            outputType = 'data';
                            try {
                                outputContent = JSON.stringify(rawOutput, null, 2);
                            } catch {
                                outputContent = 'Complex data object';
                            }
                        }
                    } else if (rawOutput === null || rawOutput === undefined) {
                        outputContent = 'No content returned';
                        outputType = 'empty';
                    } else {
                        outputContent = String(rawOutput);
                        outputType = typeof rawOutput;
                    }
                }
            }
        }

        return {
            outputContent,
            outputType,
            isComplete
        };
    }

    /**
     * Normalizes input keys for ECGraph execution
     * @param {Object} externalInputs - External inputs object
     * @returns {Object} Normalized inputs
     */
    normalizeInputKeys(externalInputs) {
        const normalized = {};

        for (const key in externalInputs) {
            if (key.includes("input")) {
                normalized[key] = externalInputs[key];
                continue;
            }

            if (key.includes(".")) {
                const [prefix, suffix] = key.split(".", 2);
                normalized[`${prefix}.input${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`] = externalInputs[key];
            } else {
                normalized[key] = externalInputs[key];
            }
        }

        return normalized;
    }

    /**
     * Main function to simulate AI response with workflow visualization
     * @param {Object} externalInputs - External inputs for the workflow
     * @param {Object} workflowData - Workflow data from the API
     * @param {HTMLElement} messagesContainer - Container to add the workflow to
     * @returns {Promise<HTMLElement>} The workflow section element
     */
    async simulateAIResponse(externalInputs, workflowData = null, messagesContainer = null) {
        try {
            let executionGraph;

            if (workflowData.nodeIdToObject) {
                console.log('Detected ECGraph format');
                executionGraph = this.convertECGraphToWorkflowFormat(workflowData, externalInputs);
                executionGraph._originalECGraphData = workflowData;
            }

            console.log('Using execution graph:', executionGraph);

            this.nodeTracker.initialize(executionGraph);

            const loadingMessage = messagesContainer?.querySelector('.aria-loading-message');
            if (loadingMessage) {
                MessageUI.switchLoadingToExecution(loadingMessage);
                const loadingContainer = loadingMessage.querySelector('.aria-personal-loading');
                if (loadingContainer) {
                    loadingContainer.classList.remove('planning-phase');
                    loadingContainer.classList.add('execution-phase');
                }
            }

            const userMessage = externalInputs['external.text'];

            // Create workflow section
            const workflowSection = createPremiumWorkflowSection(executionGraph, userMessage, workflowData);
            this.currentWorkflowSection = workflowSection;
            this.currentExecutionGraph = executionGraph;

            // Store workflow ID
            const workflowId = executionGraph.workflow?.id || executionGraph.workflowId;

            // Add to messages container immediately after creation
            if (messagesContainer && workflowSection) {
                messagesContainer.appendChild(workflowSection);
                // Scroll down with extra offset so users notice new content
                setTimeout(() => {
                    const extraOffset = 100; // Extra pixels to scroll past the content
                    messagesContainer.scrollTop = messagesContainer.scrollHeight + extraOffset;

                    // Optional: Scroll back slightly after a moment to settle nicely
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight - 20;
                    }, 200);
                }, 150);
            }

            // Store references globally
            window.currentSkymelWorkflowSection = workflowSection;
            window.currentExecutionGraph = executionGraph;

            prepareWorkflowVisualization(executionGraph, workflowSection, userMessage);

            switchToTab(workflowSection, 'steps');

            // Set up callbacks for each node
            console.log('Setting up node callbacks for execution visualization');
            const nodes = this.getAllNodeOfInterestFromGraph(workflowData);

            nodes.forEach(node => {
                if (typeof node.setOnExecutionCompleteCallback === 'function') {
                    node.setOnExecutionCompleteCallback(this.makeNodeVisualizationCallback(executionGraph));
                }
            });

            console.log(await workflowData.isGraphValid());

            await workflowData.executeGraph({
                'externalInputNamesToValuesDict': this.normalizeInputKeys(executionGraph.externalInputs)
            });

            return workflowSection;

        } catch (error) {
            console.error('Error simulating AI response:', error);
            throw error;
        }
    }

    // UI Update Methods (these could be moved to a separate UI handler if needed)

    updatePipelineStep(workflowSection, nodeId, status) {
        const pipelineStep = workflowSection.querySelector(`.pipeline-step[data-node-id="${nodeId}"]`);
        if (!pipelineStep) return;

        pipelineStep.classList.remove('processing', 'complete', 'error');
        pipelineStep.classList.add(status);

        const stepCircle = pipelineStep.querySelector('.step-circle');
        if (stepCircle) {
            if (status === 'complete') {
                stepCircle.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="step-completion-icon">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <div class="step-number" style="display: none;"></div>
                `;
            } else if (status === 'error') {
                stepCircle.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="step-error-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div class="step-number" style="display: none;"></div>
                `;
            }
        }

        const connectors = pipelineStep.querySelectorAll('.step-connector');
        connectors.forEach(connector => {
            connector.classList.remove('processing', 'complete', 'error');
            connector.classList.add(status);
        });
    }

    findModelCard(workflowSection, nodeId) {
        const modelCard = workflowSection.querySelector(`#skymel-step-${nodeId}, .model-card[data-node-id="${nodeId}"]`);

        if (modelCard) return modelCard;

        const nodes = this.currentExecutionGraph?.nodes || this.currentExecutionGraph?.listOfNodes || [];
        const nodeIndex = nodes.findIndex(n => n.nodeId === nodeId);

        if (nodeIndex >= 0) {
            const stepNumber = nodeIndex + 1;
            return workflowSection.querySelector(`.model-card[data-step-number="${stepNumber}"]`);
        }

        return null;
    }

    updateModelCardStatus(modelCard, status, processingTime) {
        const statusText = modelCard.querySelector('.model-status');
        if (statusText) {
            statusText.textContent = status === 'processing' ? 'Processing' :
                status === 'complete' ? 'Complete' : 'Error';
            statusText.className = 'model-status ' + status;
        }

        const statusIndicator = modelCard.querySelector('.execution-status-indicator');
        if (statusIndicator) {
            const statusCircle = statusIndicator.querySelector('.status-circle');
            if (statusCircle) {
                statusCircle.className = 'status-circle ' + status;
            }

            const statusTextElement = statusIndicator.querySelector('.status-text');
            if (statusTextElement) {
                statusTextElement.textContent = status === 'processing' ? 'Processing...' :
                    status === 'complete' ? `Completed (${processingTime})` : 'Error occurred';
            }
        }

        const loader = modelCard.querySelector('.step-loader');
        if (loader) {
            if (status === 'complete' || status === 'error') {
                loader.style.display = 'none';
            } else {
                loader.style.display = 'flex';
                if (loader.children.length < 3) {
                    loader.innerHTML = `
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    `;
                }
            }
        }

        modelCard.classList.remove('processing', 'complete', 'error');
        modelCard.classList.add(status);
    }

    createOutputHTML(outputContent, outputType, nodeId) {
        let html = '<div class="model-output-section">';
        html += '<h4 class="output-section-title">Output:</h4>';

        if (outputType === 'text') {
            html += `<div class="output-content text-output">${outputContent}</div>`;
        } else if (outputType === 'image') {
            html += '<div class="output-content image-output">';
            const imageData = extractImageData(outputContent);

            if (imageData) {
                html += `
                    <div class="image-container">
                        <img src="${imageData}" alt="Generated image" class="output-image" onclick="openImageModal(this.src)">
                        <div class="image-controls">
                            <button class="download-image-btn" onclick="downloadImage('${imageData}', 'generated-image')">
                                Download Image
                            </button>
                            <button class="view-fullsize-btn" onclick="openImageModal('${imageData}')">
                                View Full Size
                            </button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="image-output-with-controls">
                        <div class="image-info">
                            <p>Image data available but requires processing</p>
                        </div>
                        <button class="process-image-btn" data-node-id="${nodeId}">Process Image Data</button>
                    </div>
                `;
            }
            html += '</div>';
        } else {
            html += `<div class="output-content data-output"><pre>${outputContent}</pre></div>`;
        }

        html += '</div>';
        return html;
    }

    createLegacyResultHTML(node, nodeData, outputData, nodeId) {
        const modelClass = this.getModelTypeClass(nodeData.modelName);

        let resultHtml = `
            <div class="node-execution-result">
                <div class="model-badge ${modelClass}">${nodeData.modelName}</div>
                <div class="node-execution-info">
                    <h4>${nodeData.taskType || 'Processing'}</h4>
                    <p><strong>Instruction:</strong> ${nodeData.instruction || 'Processing data'}</p>
                    ${nodeData.performanceTier ?
            `<p><strong>Performance:</strong> <span class="tier-badge ${nodeData.performanceTier.toLowerCase()}">${nodeData.performanceTier}</span></p>` :
            ''}
                    <p><strong>Processing time:</strong> ${nodeData.processingTime}</p>
                    <div class="execution-status ${outputData.isComplete ? 'complete' : 'processing'}">
                        <span class="status-indicator"></span>
                        ${outputData.isComplete ? 'Complete' : 'Processing...'}
                    </div>
                </div>
                ${outputData.outputContent ? `
                    <div class="node-execution-content">
                        <strong>Output:</strong>
                        <div class="content-preview ${outputData.outputType === 'text' ? 'text-output' : ''}">
                            ${outputData.outputContent}
                        </div>
                    </div>` : ''}
            </div>
        `;

        return resultHtml;
    }

    getModelTypeClass(modelName) {
        if (!modelName) return 'ai-model';

        if (modelName.toLowerCase().includes('gpt')) {
            return 'gpt';
        } else if (modelName.toLowerCase().includes('claude')) {
            return 'claude';
        } else if (modelName.toLowerCase().includes('sonar') ||
            modelName.toLowerCase().includes('perplexity')) {
            return 'perplexity';
        }

        return 'ai-model';
    }

    addOutputButtons(outputSection) {
        if (outputSection.querySelector('.output-buttons')) return;

        let title = outputSection.querySelector('.output-section-title');
        if (!title) {
            title = document.createElement('h4');
            title.className = 'output-section-title';
            title.textContent = 'Output:';
            outputSection.insertBefore(title, outputSection.firstChild);
        }

        const buttons = document.createElement('div');
        buttons.className = 'output-buttons';
        buttons.style.cssText = 'display:inline-flex;margin-left:10px;gap:5px;';

        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '📋 Copy';
        copyBtn.style.cssText = 'font-size:12px;padding:2px 6px;cursor:pointer;';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(outputSection.querySelector('.output-content').textContent);
            copyBtn.innerHTML = '✓ Copied!';
            setTimeout(() => copyBtn.innerHTML = '📋 Copy', 1500);
        };

        const dlBtn = document.createElement('button');
        dlBtn.innerHTML = '⬇️ Save';
        dlBtn.style.cssText = 'font-size:12px;padding:2px 6px;cursor:pointer;';
        dlBtn.onclick = () => {
            const text = outputSection.querySelector('.output-content').textContent;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([text], {type: 'text/plain'}));
            a.download = 'output.txt';
            a.click();
            dlBtn.innerHTML = '✓ Saved!';
            setTimeout(() => dlBtn.innerHTML = '⬇️ Save', 1500);
        };

        buttons.appendChild(copyBtn);
        buttons.appendChild(dlBtn);
        title.insertAdjacentElement('afterend', buttons);
    }
}

// Create a global instance
export const workflowOrchestrator = new WorkflowOrchestrator();