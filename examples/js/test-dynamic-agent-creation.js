import { SkymelExecutionGraphLoader } from "./skymel_execution_graph_loader.js";
import { SkymelECGraphUtils } from "./skymel_ec_graph_utils.js";
import { workflowOrchestrator } from "./workflow_orchestrator.js";


class DynamicAgentTestInterface {
    constructor() {
        this.attachedFiles = [];
        this.currentAgent = null;
        this.executionGraph = null;
        this.initializeEventListeners();
        this.initializeTabs();
        this.initializeFileUpload();
        this.updateStatus('Ready');
    }

    initializeEventListeners() {
        // Main action buttons
        document.getElementById('create-agent').addEventListener('click', () => this.createAgent());
        document.getElementById('execute-agent').addEventListener('click', () => this.executeAgent());
        document.getElementById('clear-results').addEventListener('click', () => this.clearResults());

        // MCP tools toggle
        document.getElementById('enable-mcp').addEventListener('change', (e) => {
            const mcpConfig = document.getElementById('mcp-config');
            mcpConfig.style.display = e.target.checked ? 'block' : 'none';
        });

        // Input type checkboxes
        document.getElementById('input-image').addEventListener('change', () => this.updateInputAvailability());
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    initializeFileUpload() {
        const fileUpload = document.getElementById('file-upload');
        const fileInput = document.getElementById('file-input');

        fileUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));

        // Drag and drop functionality
        fileUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUpload.classList.add('dragover');
        });

        fileUpload.addEventListener('dragleave', () => {
            fileUpload.classList.remove('dragover');
        });

        fileUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUpload.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });
    }

    async handleFileSelection(files) {
        for (const file of files) {
            const processedFile = await this.processFileForSending(file);
            if (processedFile) {
                this.attachedFiles.push(processedFile);
                this.updateAttachedFilesDisplay();
            }
        }
    }

    async processFileForSending(file) {
        try {
            const base64Data = await this.fileToBase64(file);
            return {
                name: file.name,
                size: file.size,
                type: file.type,
                data: base64Data
            };
        } catch (error) {
            console.error('Error processing file:', error);
            return null;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    updateAttachedFilesDisplay() {
        const container = document.getElementById('attached-files');
        container.innerHTML = '';

        this.attachedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                📄 ${file.name} (${this.formatFileSize(file.size)})
                <span class="remove-file" data-index="${index}">✕</span>
            `;
            container.appendChild(fileItem);
        });

        // Add event listeners for file removal
        container.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.attachedFiles.splice(index, 1);
                this.updateAttachedFilesDisplay();
            });
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateInputAvailability() {
        const textEnabled = true; // Always enabled
        const imageEnabled = document.getElementById('input-image').checked;
        const files = this.attachedFiles;

        return {
            text: textEnabled,
            image: imageEnabled,
            file: files.map(f => f.name)
        };
    }

    updateStatus(status, type = 'ready') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = status;
        statusElement.className = `status-indicator status-${type}`;
    }

    makeJsonConfigObjectToCreateAgent() {
        const contextId = document.getElementById('context-id').value || '';

        // Use the same approach as app.js - create a dynamic graph using workflowOrchestrator
        const graphConfig = workflowOrchestrator.makeJsonConfigObjectToLoadGraph(this.attachedFiles, contextId);

        // Modify the endpoint URL for agent generation instead of regular workflow
        if (graphConfig.children && graphConfig.children[0]) {
            graphConfig.children[0].nodeInitializationConfig.endpointUrl = "./websocket-dynamic-agent-generation-infer";

            // Add additional agent-specific attributes
            const developerPrompt = document.getElementById('developer-prompt').value;
            const availableInputs = this.updateInputAvailability();

            graphConfig.children[0].nodeInitializationConfig.nodePrivateAttributesAndValues = {
                ...graphConfig.children[0].nodeInitializationConfig.nodePrivateAttributesAndValues,
                developerPrompt: developerPrompt,
                availableInputs: JSON.stringify(availableInputs),
                mcpEnabled: document.getElementById('enable-mcp').checked
            };
        }

        return graphConfig;
    }

    async createAgent() {
        try {
            this.updateStatus('Creating agent...', 'processing');
            document.getElementById('create-agent').disabled = true;

            const task = document.getElementById('agent-task').value.trim();
            if (!task) {
                throw new Error('Please provide an agent task description');
            }

            // Clear previous results
            this.clearOutputs();

            // Create the graph configuration for agent creation using workflowOrchestrator approach
            const graphConfig = this.makeJsonConfigObjectToCreateAgent();
            console.log('Agent creation graph config:', graphConfig);

            // Load and execute the graph
            const creationGraph = SkymelExecutionGraphLoader.loadGraphFromJsonObject(graphConfig);

            // Prepare external inputs using the same approach as app.js
            const externalInputs = {
                "external.text": task
            };

            // Process attached files like in app.js
            const processedFiles = await Promise.all(
                this.attachedFiles.map(async (file, index) => {
                    try {
                        return await workflowOrchestrator.processFileForSending(file);
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                        throw error;
                    }
                })
            );

            // Add file inputs to external inputs
            processedFiles.forEach((file, index) => {
                externalInputs[`external.file${index + 1}`] = file.content;
            });

            console.log('External inputs for agent creation:', externalInputs);

            // Execute the agent creation graph
            await creationGraph.executeGraph({'externalInputNamesToValuesDict': externalInputs});

            const result = creationGraph.getLastExecutionResult();
            console.log('Agent creation result:', result);

            const agentOutputKey = 'dynamic_graph.dynamicWorkflowCallerNode.outputText';
            if (result && result[agentOutputKey]) {
                const rawOutput = result[agentOutputKey];
                document.getElementById('raw-llm-output').textContent = rawOutput;

                try {
                    // Parse the agent JSON
                    const agentGraph = JSON.parse(rawOutput);
                    this.currentAgent = agentGraph;

                    // Display the agent JSON
                    document.getElementById('agent-json-output').textContent =
                        JSON.stringify(agentGraph, null, 2);

                    // Create workflow visualization
                    this.createWorkflowVisualization(agentGraph);

                    // Create DAG visualization
                    this.createDAGVisualization(agentGraph);

                    // Enable execute button
                    document.getElementById('execute-agent').disabled = false;

                    this.updateStatus('Agent created successfully!', 'success');

                } catch (parseError) {
                    console.error('Failed to parse agent JSON:', parseError);
                    document.getElementById('agent-json-output').textContent =
                        'Failed to parse agent JSON: ' + parseError.message;
                    this.updateStatus('Agent creation failed - invalid JSON', 'error');
                }

            } else {
                throw new Error('No agent output received from creation process');
            }

        } catch (error) {
            console.error('Error creating agent:', error);
            this.updateStatus('Agent creation failed: ' + error.message, 'error');
            document.getElementById('agent-json-output').textContent =
                'Error creating agent: ' + error.message;
        } finally {
            document.getElementById('create-agent').disabled = false;
        }
    }

    async executeAgent() {
        if (!this.currentAgent) {
            alert('No agent available to execute. Please create an agent first.');
            return;
        }

        try {
            this.updateStatus('Executing agent...', 'processing');
            document.getElementById('execute-agent').disabled = true;

            // Clear execution log
            document.getElementById('execution-log-output').textContent = '';

            // Load the agent graph
            this.executionGraph = SkymelExecutionGraphLoader.loadGraphFromJsonObject(this.currentAgent);

            // Prepare external inputs for agent execution using same approach as app.js
            const task = document.getElementById('agent-task').value.trim();
            const agentExternalInputs = {
                "external.text": task
            };

            // Process files for agent execution
            const processedFilesForExecution = await Promise.all(
                this.attachedFiles.map(async (file, index) => {
                    try {
                        return await workflowOrchestrator.processFileForSending(file);
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                        throw error;
                    }
                })
            );

            // Add file inputs to agent execution
            processedFilesForExecution.forEach((file, index) => {
                agentExternalInputs[`external.file${index + 1}`] = file.content;
            });

            console.log('Executing agent with inputs:', agentExternalInputs);

            // Validate the graph before execution (like simulateAIResponse does)
            const isValid = await this.executionGraph.isGraphValid();
            console.log('Graph validation result:', isValid);

            if (!isValid) {
                throw new Error('Generated agent graph is invalid and cannot be executed');
            }

            // Normalize input keys like simulateAIResponse does
            const normalizedInputs = this.normalizeInputKeys(agentExternalInputs);
            console.log('Normalized inputs:', normalizedInputs);

            // Execute the agent graph with normalized inputs
            await this.executionGraph.executeGraph({
                'externalInputNamesToValuesDict': normalizedInputs
            });

            const executionResult = this.executionGraph.getLastExecutionResult();
            console.log('Agent execution result:', executionResult);

            // Display execution results with better formatting
            this.displayFormattedExecutionLog(executionResult);

            // Display final output in the new tab
            this.displayFinalOutput(executionResult);

            this.updateStatus('Agent execution completed!', 'success');

        } catch (error) {
            console.error('Error executing agent:', error);
            this.updateStatus('Agent execution failed: ' + error.message, 'error');
            document.getElementById('execution-log-output').textContent =
                'Error executing agent: ' + error.message;
        } finally {
            document.getElementById('execute-agent').disabled = false;
        }
    }

    createWorkflowVisualization(agentGraph) {
        const container = document.getElementById('workflow-container');
        container.innerHTML = '';

        try {
            // Extract nodes from agent graph
            const nodes = agentGraph.children || [];

            if (nodes.length === 0) {
                container.innerHTML = '<p>No workflow nodes found in agent configuration.</p>';
                return;
            }

            let workflowHtml = '<div class="workflow-steps">';

            nodes.forEach((node, index) => {
                const config = node.nodeInitializationConfig || {};
                const privateAttrs = config.nodePrivateAttributesAndValues || {};
                const nodeId = config.nodeId || `node_${index}`;
                const nodeType = privateAttrs.nodeType || 'unknown';
                const modelName = privateAttrs.modelName || (privateAttrs.toolName ? `🔧 ${privateAttrs.toolName}` : 'Unknown Component');

                // Extract specialized attributes
                const temperature = privateAttrs.temperature;
                const maxTokens = privateAttrs.maxTokens;
                const systemPrompt = privateAttrs.systemPrompt;
                const instructions = privateAttrs.instructions;

                // Determine if this is a tool or LLM
                const isLLM = !privateAttrs.toolName && (modelName.includes('gpt') || modelName.includes('claude') || modelName.includes('gemini') || modelName.includes('llm'));
                const isTool = !!privateAttrs.toolName;

                workflowHtml += `
                    <div class="workflow-step">
                        <div class="step-header">
                            <h3 class="step-title">Step ${index + 1}: ${nodeId}</h3>
                            <span class="step-type">${nodeType}</span>
                        </div>
                        
                        <div class="model-info">
                            <div class="model-name">${modelName}</div>
                            ${isLLM && temperature !== undefined ? `
                                <div class="model-params">
                                    <span class="param-badge">Temperature: ${temperature}</span>
                                    ${maxTokens ? `<span class="param-badge">Max Tokens: ${maxTokens}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        ${(systemPrompt || instructions) ? `
                            <div class="instructions-box">
                                <div class="instructions-label">${isLLM ? 'System Instructions:' : 'Configuration:'}</div>
                                <div class="instructions-text">${systemPrompt || instructions || 'No specific instructions'}</div>
                            </div>
                        ` : ''}
                        
                        <div class="step-details">
                            <div class="detail-group">
                                <div class="detail-label">Endpoint</div>
                                <div class="detail-value">${config.endpointUrl || 'N/A'}</div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-label">Inputs</div>
                                <div class="detail-value">${config.nodeInputNames?.join(', ') || 'N/A'}</div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-label">Outputs</div>
                                <div class="detail-value">${config.nodeOutputNames?.join(', ') || 'N/A'}</div>
                            </div>
                            
                            ${Object.keys(privateAttrs).length > 0 ? `
                                <div class="detail-group">
                                    <div class="detail-label">Additional Attributes</div>
                                    <div class="detail-value">
                                        ${Object.entries(privateAttrs)
                    .filter(([key]) => !['nodeType', 'modelName', 'toolName', 'temperature', 'maxTokens', 'systemPrompt', 'instructions'].includes(key))
                    .map(([key, value]) => `<small><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</small>`)
                    .join('<br>')
                }
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            workflowHtml += '</div>';
            container.innerHTML = workflowHtml;

        } catch (error) {
            console.error('Error creating workflow visualization:', error);
            container.innerHTML = '<p>Error creating workflow visualization: ' + error.message + '</p>';
        }
    }

    createDAGVisualization(agentGraph) {
        console.log('Creating D3.js network visualization with graph:', agentGraph);
        const container = document.getElementById('dag-container');

        if (!container) {
            console.error('DAG container not found!');
            return;
        }

        try {
            const nodes = agentGraph.children || [];
            console.log('Found nodes for network graph:', nodes.length, nodes);

            if (nodes.length === 0) {
                document.getElementById('dag-placeholder').style.display = 'block';
                return;
            }

            // Hide placeholder
            const placeholder = document.getElementById('dag-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }

            // Clear any existing SVG
            d3.select(container).select('svg').remove();

            // Create the network data structure
            const { networkNodes, networkLinks } = this.parseNetworkData(nodes);
            console.log('Network data:', { nodes: networkNodes, links: networkLinks });

            // Create SVG
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 500;

            console.log('Container dimensions:', width, height);

            const svg = d3.select(container)
                .append('svg')
                .attr('class', 'network-graph')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`);

            // Define arrow markers
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 9)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .attr('markerUnits', 'strokeWidth')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#4a90e2')
                .attr('stroke', 'none');

            // Position nodes in a hierarchical layout instead of force simulation
            this.layoutNodes(networkNodes, networkLinks, width, height);

            // Create links
            const link = svg.append('g')
                .attr('class', 'links')
                .selectAll('path')
                .data(networkLinks)
                .enter().append('path')
                .attr('class', 'link');

            // Create nodes
            const node = svg.append('g')
                .attr('class', 'nodes')
                .selectAll('g')
                .data(networkNodes)
                .enter().append('g');

            // Add circles for nodes
            node.append('circle')
                .attr('class', d => `node ${d.type}`)
                .attr('r', 30);

            // Add labels
            node.append('text')
                .attr('class', 'node-label')
                .attr('dy', '-0.5em')
                .text(d => this.truncateText(d.label, 12));

            // Add type labels
            node.append('text')
                .attr('class', 'node-type')
                .attr('dy', '1em')
                .text(d => d.nodeType);

            // Add tooltips
            const tooltip = d3.select('#d3-tooltip');

            node.on('mouseover', (event, d) => {
                let tooltipContent = `
                    <strong>${d.label}</strong><br>
                    <em>Type:</em> ${d.nodeType}<br>
                    <em>Model:</em> ${d.model || 'N/A'}<br>
                    <em>Inputs:</em> ${d.inputs?.join(', ') || 'N/A'}<br>
                    <em>Outputs:</em> ${d.outputs?.join(', ') || 'N/A'}
                `;

                // Add instructions for LLM nodes or any node with instructions
                if (d.instructions) {
                    tooltipContent += `<br><br><em>Instructions:</em><br><div style="max-height: 150px; overflow-y: auto; font-size: 11px; line-height: 1.3; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 5px;">${d.instructions}</div>`;
                }

                // Add system prompt if different from instructions
                if (d.systemPrompt && d.systemPrompt !== d.instructions) {
                    tooltipContent += `<br><br><em>System Prompt:</em><br><div style="max-height: 100px; overflow-y: auto; font-size: 11px; line-height: 1.3; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 5px;">${d.systemPrompt}</div>`;
                }

                tooltip.html(tooltipContent)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .classed('visible', true);
            })
                .on('mouseout', () => {
                    tooltip.classed('visible', false);
                });

            // Position nodes and links statically
            this.renderStaticGraph(link, node);

            // Control functions (simplified since no simulation)
            document.getElementById('restart-simulation').onclick = () => {
                this.layoutNodes(networkNodes, networkLinks, width, height);
                this.renderStaticGraph(link, node);
            };

            document.getElementById('center-graph').onclick = () => {
                this.layoutNodes(networkNodes, networkLinks, width, height);
                this.renderStaticGraph(link, node);
            };

        } catch (error) {
            console.error('Error creating D3.js network visualization:', error);
            document.getElementById('dag-placeholder').textContent = 'Error creating network visualization: ' + error.message;
            document.getElementById('dag-placeholder').style.display = 'block';
        }
    }

    parseNetworkData(nodes) {
        const networkNodes = [];
        const networkLinks = [];
        const nodeMap = new Map();

        // Get external input and output definitions from the graph config
        const graphConfig = this.currentAgent?.graphInitializationConfig || {};
        const externalInputNames = new Set(graphConfig.externalInputNames || []);
        const externalOutputNames = new Set(graphConfig.externalOutputNames || []);

        console.log('External inputs:', externalInputNames);
        console.log('External outputs:', externalOutputNames);

        // First, create external input nodes
        const externalInputs = new Set();

        nodes.forEach((node, index) => {
            const config = node.nodeInitializationConfig || {};
            const privateAttrs = config.nodePrivateAttributesAndValues || {};
            const nodeId = config.nodeId || `node_${index}`;

            // Analyze inputs to find external ones
            const inputs = config.nodeInputNames || [];
            inputs.forEach(input => {
                if (input.startsWith('external.')) {
                    externalInputs.add(input);
                }
            });

            // Determine node type based on external outputs
            let nodeType = 'llm';
            if (privateAttrs.toolName) {
                nodeType = 'tool';
            } else {
                // Check if this node produces any external outputs
                const nodeOutputs = config.nodeOutputNames || [];
                const isOutputNode = nodeOutputs.some(output => {
                    const fullOutputName = `${nodeId}.${output}`;
                    return externalOutputNames.has(fullOutputName);
                });

                if (isOutputNode) {
                    nodeType = 'output';
                }
            }

            console.log(`Node ${nodeId}: outputs=${config.nodeOutputNames}, isOutput=${nodeType === 'output'}`);

            // Create node data
            const networkNode = {
                id: nodeId,
                label: nodeId,
                type: nodeType,
                nodeType: privateAttrs.nodeType || 'process',
                model: privateAttrs.modelName || privateAttrs.toolName,
                instructions: privateAttrs.instructions,
                systemPrompt: privateAttrs.systemPrompt,
                inputs: config.nodeInputNames || [],
                outputs: config.nodeOutputNames || [],
                originalNode: node
            };

            networkNodes.push(networkNode);
            nodeMap.set(nodeId, networkNode);
        });

        // Add external input nodes
        externalInputs.forEach(extInput => {
            networkNodes.push({
                id: extInput,
                label: extInput.replace('external.', ''),
                type: 'external',
                nodeType: 'input',
                model: 'External Input',
                inputs: [],
                outputs: [extInput]
            });
            nodeMap.set(extInput, networkNodes[networkNodes.length - 1]);
        });

        // Create links based on input/output connections
        nodes.forEach((node, index) => {
            const config = node.nodeInitializationConfig || {};
            const nodeId = config.nodeId || `node_${index}`;
            const inputs = config.nodeInputNames || [];

            inputs.forEach(input => {
                // Parse the input to find source node
                let sourceNodeId = null;

                if (input.includes('.')) {
                    // Split by first dot to get node name and output name
                    const dotIndex = input.indexOf('.');
                    const sourceNode = input.substring(0, dotIndex);
                    const outputName = input.substring(dotIndex + 1);

                    console.log(`Input "${input}" -> source: "${sourceNode}", output: "${outputName}"`);

                    if (sourceNode === 'external') {
                        // Create external input node if it doesn't exist
                        sourceNodeId = input; // Use full "external.inputText" as ID
                    } else {
                        // Look for the actual node (node1, node2, etc.)
                        sourceNodeId = sourceNode;
                    }
                } else {
                    // No dot, assume it's a direct node reference
                    sourceNodeId = input;
                }

                console.log(`Creating link from "${sourceNodeId}" to "${nodeId}" for input "${input}"`);

                if (sourceNodeId && sourceNodeId !== nodeId) {
                    // Verify source node exists
                    if (sourceNodeId.startsWith('external.') || nodeMap.has(sourceNodeId)) {
                        networkLinks.push({
                            source: sourceNodeId,
                            target: nodeId,
                            label: input
                        });
                    } else {
                        console.warn(`Source node "${sourceNodeId}" not found for input "${input}"`);
                    }
                }
            });
        });

        return { networkNodes, networkLinks };
    }

    layoutNodes(nodes, links, width, height) {
        console.log('Laying out nodes:', nodes.length, 'links:', links.length);
        console.log('Available space:', width, 'x', height);

        if (nodes.length === 0) return;

        // Create a proper flowchart layout
        const nodeMap = new Map();
        nodes.forEach(node => nodeMap.set(node.id, node));

        // Build dependency graph
        const dependencies = new Map();
        const dependents = new Map();

        nodes.forEach(node => {
            dependencies.set(node.id, []);
            dependents.set(node.id, []);
        });

        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            if (dependencies.has(targetId) && dependents.has(sourceId)) {
                dependencies.get(targetId).push(sourceId);
                dependents.get(sourceId).push(targetId);
            }
        });

        // Find levels (topological sort)
        const levels = [];
        const visited = new Set();
        const inDegree = new Map();

        // Calculate in-degrees
        nodes.forEach(node => {
            inDegree.set(node.id, dependencies.get(node.id).length);
        });

        // Start with nodes that have no dependencies (external inputs)
        let currentLevel = nodes.filter(node => inDegree.get(node.id) === 0);

        while (currentLevel.length > 0) {
            levels.push([...currentLevel]);
            currentLevel.forEach(node => visited.add(node.id));

            const nextLevel = [];
            currentLevel.forEach(node => {
                const deps = dependents.get(node.id) || [];
                deps.forEach(depId => {
                    if (!visited.has(depId)) {
                        const newInDegree = inDegree.get(depId) - 1;
                        inDegree.set(depId, newInDegree);

                        if (newInDegree === 0) {
                            const depNode = nodeMap.get(depId);
                            if (depNode && !nextLevel.includes(depNode)) {
                                nextLevel.push(depNode);
                            }
                        }
                    }
                });
            });

            currentLevel = nextLevel;
        }

        // Add any remaining nodes (shouldn't happen in a proper DAG)
        const remaining = nodes.filter(node => !visited.has(node.id));
        if (remaining.length > 0) {
            levels.push(remaining);
        }

        console.log('Levels:', levels.map(level => level.map(n => n.id)));

        // Position nodes by levels
        const margin = 80;
        const levelWidth = (width - 2 * margin) / Math.max(1, levels.length - 1);
        const nodeRadius = 30;

        levels.forEach((level, levelIndex) => {
            const x = margin + (levelIndex * levelWidth);
            const availableHeight = height - 2 * margin;
            const nodeSpacing = level.length > 1 ? availableHeight / (level.length + 1) : availableHeight / 2;

            level.forEach((node, nodeIndex) => {
                node.x = x;
                node.y = margin + ((nodeIndex + 1) * nodeSpacing);

                // Ensure nodes stay within bounds
                node.x = Math.max(nodeRadius + 10, Math.min(width - nodeRadius - 10, node.x));
                node.y = Math.max(nodeRadius + 10, Math.min(height - nodeRadius - 10, node.y));

                console.log(`Node ${node.id} (level ${levelIndex}): positioned at (${node.x}, ${node.y})`);
            });
        });
    }

    renderStaticGraph(link, node) {
        console.log('Rendering static graph with nodes:', node.data());
        console.log('Rendering links:', link.data());

        // Update node positions first
        node.attr('transform', d => {
            console.log(`Positioning node ${d.id} at (${d.x}, ${d.y})`);
            return `translate(${d.x || 0},${d.y || 0})`;
        });

        // Update link positions with proper arrows
        link.attr('d', d => {
            // Get source and target positions
            let sourceX, sourceY, targetX, targetY;

            if (typeof d.source === 'object') {
                sourceX = d.source.x || 0;
                sourceY = d.source.y || 0;
            } else {
                // Find source node
                const sourceNode = node.data().find(n => n.id === d.source);
                sourceX = sourceNode ? sourceNode.x : 0;
                sourceY = sourceNode ? sourceNode.y : 0;
            }

            if (typeof d.target === 'object') {
                targetX = d.target.x || 0;
                targetY = d.target.y || 0;
            } else {
                // Find target node
                const targetNode = node.data().find(n => n.id === d.target);
                targetX = targetNode ? targetNode.x : 0;
                targetY = targetNode ? targetNode.y : 0;
            }

            console.log(`Link from ${d.source} (${sourceX}, ${sourceY}) to ${d.target} (${targetX}, ${targetY})`);

            // Calculate connection points on node circles (radius 30)
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) return '';

            const nodeRadius = 30;
            // Arrow marker adds about 6px, so we need to account for that
            const arrowLength = 6;
            const startX = sourceX + (dx / distance) * nodeRadius;
            const startY = sourceY + (dy / distance) * nodeRadius;
            const endX = targetX - (dx / distance) * (nodeRadius + arrowLength);
            const endY = targetY - (dy / distance) * (nodeRadius + arrowLength);

            // For shorter distances, use straight lines
            if (distance < 100) {
                return `M${startX},${startY}L${endX},${endY}`;
            }

            // For longer distances, use a gentle curve
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const curveOffset = Math.min(30, distance * 0.1);

            // Control point for curve (perpendicular to the line)
            const controlX = midX - (dy / distance) * curveOffset;
            const controlY = midY + (dx / distance) * curveOffset;

            return `M${startX},${startY}Q${controlX},${controlY} ${endX},${endY}`;
        });
    }

    truncateText(text, maxLength) {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }


    displayFormattedExecutionLog(executionResult) {
        const logContainer = document.getElementById('execution-log-output');

        try {
            let logHtml = `
                <div class="log-entry">
                    <div class="log-timestamp">${new Date().toISOString()}</div>
                    <span class="log-level success">SUCCESS</span>
                    <span class="log-message">Agent execution completed successfully</span>
                </div>
            `;

            if (executionResult && typeof executionResult === 'object') {
                // Process each key-value pair in the execution result
                Object.entries(executionResult).forEach(([key, value]) => {
                    let displayValue = value;
                    let logLevel = 'info';

                    // Format different types of values
                    if (typeof value === 'object') {
                        displayValue = JSON.stringify(value, null, 2);
                    } else if (typeof value === 'string' && value.length > 100) {
                        // Truncate very long strings for readability
                        displayValue = value.substring(0, 100) + '... (truncated)';
                    }

                    // Determine log level based on key name
                    if (key.toLowerCase().includes('error')) {
                        logLevel = 'error';
                    } else if (key.toLowerCase().includes('warning')) {
                        logLevel = 'warning';
                    } else if (key.toLowerCase().includes('output') || key.toLowerCase().includes('result')) {
                        logLevel = 'success';
                    }

                    logHtml += `
                        <div class="log-entry">
                            <div class="log-timestamp">${new Date().toISOString()}</div>
                            <span class="log-level ${logLevel}">RESULT</span>
                            <span class="log-message">
                                <strong>${key}:</strong><br>
                                <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 12px;">${displayValue}</pre>
                            </span>
                        </div>
                    `;
                });
            } else {
                logHtml += `
                    <div class="log-entry">
                        <div class="log-timestamp">${new Date().toISOString()}</div>
                        <span class="log-level info">INFO</span>
                        <span class="log-message">No detailed execution results available</span>
                    </div>
                `;
            }

            logContainer.innerHTML = logHtml;

        } catch (error) {
            logContainer.innerHTML = `
                <div class="log-entry">
                    <div class="log-timestamp">${new Date().toISOString()}</div>
                    <span class="log-level error">ERROR</span>
                    <span class="log-message">Failed to format execution log: ${error.message}</span>
                </div>
            `;
        }
    }

    displayFinalOutput(executionResult) {
        const outputContainer = document.getElementById('final-output-content');

        try {
            if (!executionResult || Object.keys(executionResult).length === 0) {
                outputContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No execution results available.</p>';
                return;
            }

            // Find the final output (usually from the last node)
            let finalOutput = null;
            let outputNodeKey = null;
            let metadata = {};

            // Look for common output patterns
            const outputKeys = Object.keys(executionResult).filter(key =>
                key.includes('outputText') ||
                key.includes('output') ||
                key.includes('result')
            );

            if (outputKeys.length > 0) {
                // Use the last output key (usually the final result)
                outputNodeKey = outputKeys[outputKeys.length - 1];
                finalOutput = executionResult[outputNodeKey];
            } else {
                // If no obvious output, use the last key
                const allKeys = Object.keys(executionResult);
                outputNodeKey = allKeys[allKeys.length - 1];
                finalOutput = executionResult[outputNodeKey];
            }

            // Collect metadata
            Object.entries(executionResult).forEach(([key, value]) => {
                if (key !== outputNodeKey) {
                    metadata[key] = value;
                }
            });

            // Format the output
            let formattedContent = '';

            // Add metadata section if we have it
            if (Object.keys(metadata).length > 0) {
                formattedContent += `
                    <div class="final-output-metadata">
                        <h4>Execution Metadata</h4>
                        ${Object.entries(metadata).map(([key, value]) => `
                            <div class="metadata-item">
                                <span class="metadata-label">${key}:</span>
                                <span class="metadata-value">${this.truncateText(String(value), 50)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // Add the main output
            if (finalOutput) {
                formattedContent += `<div class="final-output-content">`;

                if (outputNodeKey) {
                    formattedContent += `<h3>Final Result</h3>`;
                }

                // Format the output based on its type
                if (typeof finalOutput === 'string') {
                    // Try to detect if it's markdown or HTML
                    if (finalOutput.includes('\n#') || finalOutput.includes('**') || finalOutput.includes('*')) {
                        // Looks like markdown, convert basic formatting
                        formattedContent += this.formatMarkdownLike(finalOutput);
                    } else {
                        // Plain text with line breaks
                        formattedContent += `<div>${finalOutput.replace(/\n/g, '<br>')}</div>`;
                    }
                } else if (typeof finalOutput === 'object') {
                    // JSON object
                    formattedContent += `<pre>${JSON.stringify(finalOutput, null, 2)}</pre>`;
                } else {
                    // Other types
                    formattedContent += `<div>${String(finalOutput)}</div>`;
                }

                formattedContent += `</div>`;
            } else {
                formattedContent += '<p>No final output content found.</p>';
            }

            outputContainer.innerHTML = formattedContent;

        } catch (error) {
            console.error('Error displaying final output:', error);
            outputContainer.innerHTML = `<p style="color: #dc2626;">Error displaying final output: ${error.message}</p>`;
        }
    }

    formatMarkdownLike(text) {
        // Simple markdown-like formatting
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    }

    clearOutputs() {
        document.getElementById('agent-json-output').textContent = 'Agent JSON will appear here...';
        document.getElementById('execution-log-output').innerHTML = '<div style="color: #718096; text-align: center; padding: 20px;">Execution log will appear here...</div>';
        document.getElementById('raw-llm-output').textContent = 'Raw LLM output will appear here...';
        document.getElementById('workflow-container').innerHTML = '<p>Enhanced workflow visualization with instructions will appear here after agent creation...</p>';
        document.getElementById('final-output-content').innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">Final output will appear here after agent execution...</p>';

        // Clean up D3.js and reset DAG container
        d3.select('#dag-container').select('svg').remove();
        const placeholder = document.getElementById('dag-placeholder');
        if (placeholder) {
            placeholder.textContent = 'Network graph will appear here after agent creation...';
            placeholder.style.display = 'block';
        }
    }

    clearResults() {
        this.clearOutputs();
        this.currentAgent = null;
        this.executionGraph = null;
        this.attachedFiles = [];
        this.updateAttachedFilesDisplay();
        document.getElementById('execute-agent').disabled = true;
        this.updateStatus('Ready', 'ready');

        // Reset form fields
        document.getElementById('agent-task').value = 'Create a research agent that can search the web, analyze documents, and generate comprehensive reports with citations and visualizations.';
        document.getElementById('developer-prompt').value = 'You are a professional research assistant focused on accuracy and thoroughness. Always cite sources and provide structured outputs.';
        document.getElementById('context-id').value = '';
        document.getElementById('agent-name').value = '';

        // Switch back to first tab
        document.querySelector('.tab[data-tab="agent-json"]').click();
    }

    /**
     * Normalizes input keys for ECGraph execution (copied from workflow_orchestrator.js)
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
}

// Initialize the test interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dynamicAgentTestInterface = new DynamicAgentTestInterface();
});

console.log('Dynamic Agent Test Interface loaded successfully!');