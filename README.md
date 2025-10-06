# Skymel Agent Development Kit (ADK)

> **Build reliable AI agents that don't hallucinate or break**  
> Multi-model reasoning • Natural language definitions • Self-healing execution

[![npm version](https://img.shields.io/npm/v/skymel-adk-js-beta.svg)](https://www.npmjs.com/package/skymel-adk-js-beta)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Skymel-Inc/SkymelADKJs?style=social)](https://github.com/Skymel-Inc/SkymelADKJs)

**⭐️ Star this repo if you build agents!**

```bash
npm install skymel-adk-js-beta
```

[📚 **Documentation**](http://skymel.com/docs.html) | [🚀 **Try Playground**](http://skymel.com/playground.html)

---

## Quick Example

```javascript
// Create and run an agent in 5 lines
import {SkymelAgent} from "skymel-adk-js-beta";

const agent = new SkymelAgent(apiKey, endpoint, true, 
  "Email Assistant", "Draft professional emails");
  
const result = await agent.run("Write a welcome email for new users");
```

## Why Skymel?

**Traditional AI agents fail because:**
- ❌ LLMs hallucinate and drift from goals
- ❌ Complex workflow coding for simple tasks
- ❌ No error recovery - one failure breaks everything

**Skymel agents work because:**
- ✅ Multi-model reasoning (LLMs + ML + causal models)
- ✅ Natural language definitions, no workflow coding
- ✅ Automatic error recovery and self-healing

## Overview

Skymel ADK is a complete agent development platform that replaces traditional LLM-only reasoning with a sophisticated multi-model brain. Unlike other frameworks that require complex workflow coding, Skymel agents are created from natural language descriptions and automatically generate specialized workflows for each task.

### Key Features

- **Multi-Model Reasoning Engine**: Combines LLMs, traditional ML models, causal optimization, and external memory for reliable decision-making
- **Dynamic Workflow Generation**: Creates specialized execution plans for each unique task
- **Automatic Error Recovery**: Self-healing execution with intelligent failure handling
- **Continuous Learning**: Execution feedback automatically improves model performance
- **Natural Language Interface**: Deploy agents using simple descriptions, no complex coding required

---

## Quick Start

### Installation

```bash
npm install skymel-adk-js-beta
```

Or import directly via CDN:

```javascript
import {SkymelAgent} from "https://cdn.jsdelivr.net/npm/skymel-adk-js-beta@1.0.0-beta.1/+esm";
```

### Basic Usage

```javascript
import {SkymelAgent} from "skymel-adk-js-beta";

const apiKey = "YOUR_API_KEY";
const agentCreationEndpointUrl = "https://skymel.com/YourApiEndpoint";
const agentCreationEndpointUrlIsWebSocketUrl = true;

// Create agent instance
const skymelAgent = new SkymelAgent(
    apiKey,
    agentCreationEndpointUrl,
    agentCreationEndpointUrlIsWebSocketUrl,
    "Binary Botwell", // Agent name
    "Process invoices, refunds, and update CRM with transaction status and amounts.", // Agent definition
    "Must confirm amounts greater than 10,000 dollars with a human admin.", // Restrictions
    "", // Extra developer configuration string (optional)
    false // Is MCP enabled?
);

// Generate specialized workflow for specific task
const taskDescription = "Process invoice INV-001 for Acme Corp from the attached file";
const invoiceFiles = await skymelAgent.getFileDataAndDetailsDictFromHtmlInputsForAgentGraphAttachment([htmlInputWithPdf]);
const workflowConfig = await skymelAgent.getAgenticWorkflowGraphJsonConfig(taskDescription, invoiceFiles);


// Execute the workflow
const result = await skymelAgent.runAgenticWorkflow(workflowConfig, invoiceFiles);
console.log("Task completed:", result);
```

---

## Core Concepts

### Agent Definition vs Task Specification

**Agent Definition** (`agentDefinitionString`): Describes ***what the agent is*** and its general capabilities

- Example: "Email marketing agent that creates and executes campaigns"

**Task Specification** (`agentTaskString`): Describes what you want the agent to ***do right now***

- Example: "Create welcome email sequence for new SaaS trial users"

The agent uses its definition to understand its role, then generates a specialized workflow for the specific task.

### Multi-Model Reasoning Engine

Unlike single-LLM agents, Skymel uses specialized components:

- **Language Models (LLMs)**: Handle natural language understanding and workflow parameter generation
- **Traditional ML Models**: Identify domain-specific data and make specialized tool-use decisions
- **Causal Models**: Prevent goal drift, and implement agent restrictions compliance
- **External Memory**: Maintain context across different workflow steps and memorize outcome patterns across workflow sessions

### Dynamic Workflow Generation

Each task generates a custom **Directed Acyclic Graph** (DAG) execution plan:

1. Agent analyzes the specific task requirements
2. Selects appropriate sub-task components and tools
3. Builds optimized execution sequence
4. Monitors execution and adapts to real-time outcomes as needed

---

## API Reference

### SkymelAgent Constructor

Creates a new Skymel Agent instance.

```javascript
new SkymelAgent(
    apiKey,
    agentCreationEndpointUrl, 
    agentCreationEndpointUrlIsWebSocketUrl,
    agentNameString,
    agentDefinitionString,
    agentRestrictionsString,
    developerConfigurationString,
    isMcpEnabled
)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | `string` | Public API key for Skymel backend access |
| `agentCreationEndpointUrl` | `string` | Endpoint URL for workflow generation |
| `agentCreationEndpointUrlIsWebSocketUrl` | `boolean` | Whether the endpoint is a WebSocket URL |
| `agentNameString` | `string` | Name of the agent (optional if specified in developerConfigurationString) |
| `agentDefinitionString` | `string` | Agent's purpose in natural language (optional if in developerConfigurationString) |
| `agentRestrictionsString` | `string` | Restrictions the agent must follow (optional if in developerConfigurationString) |
| `developerConfigurationString` | `string` | Complete agent configuration including name, purpose, and restrictions |
| `isMcpEnabled` | `boolean` | Does generated Workflow allow **Model Context Protocol** endpoints |

### Methods

#### getAgenticWorkflowGraphJsonConfig( *taskDescriptionString*,  *processedTaskFileAttachments* )

Generates a specialized workflow configuration for the given task.

```javascript
const workflowConfig = await skymelAgent.getAgenticWorkflowGraphJsonConfig(taskDescriptionString, processedTaskFileAttachments);
```

**Parameters:**

- `taskDescriptionString` (`string`): Natural language description of the task to perform
- `processedTaskFileAttachments` (`[object]`): A list of processed input files that can be obtained by passing a list of HTML input elements to the `getAgenticWorkflowGraphJsonConfig()` method

**Returns:** Promise resolving to workflow configuration JSON object

#### runAgenticWorkflow(dynamicWorkflowGraphJsonConfig)

Executes the generated workflow with monitoring and error recovery.

```javascript
const result = await skymelAgent.runAgenticWorkflow(dynamicWorkflowGraphJsonConfig, workflowInputsDict);
```

**Parameters:**

- `dynamicWorkflowGraphJsonConfig` (object): Workflow configuration from `getAgenticWorkflowGraphJsonConfig()`
- `workflowInputsDict` (object): A dictionary containing key and values where keys are the input names for the workflow config.

**Returns:** Promise resolving to execution results

---

## Examples

### Customer Support Agent

```javascript
const supportAgent = new SkymelAgent(
    process.env.SKYMEL_API_KEY,
    "wss://api.skymel.com/agent-creation",
    true,
    "Customer Support Agent",
    "Handle customer inquiries, resolve issues, and escalate complex problems to human agents",
    "Always be polite and helpful. Escalate billing issues over $500 to human agents",
    "",
    true
);

// Handle specific customer inquiry
const inquiry = "Customer asking about refund for order #12345 worth $250";
const workflow = await supportAgent.getAgenticWorkflowGraphJsonConfig(inquiry);
const response = await supportAgent.runAgenticWorkflow(workflow);
```

### Data Analysis Agent

```javascript
const analystAgent = new SkymelAgent(
    process.env.SKYMEL_API_KEY,
    "wss://api.skymel.com/agent-creation", 
    true,
    "Sales Data Analyst",
    "Analyze sales data, generate reports, and provide business insights",
    "Only access sales database. Always include data sources in reports",
    "",
    false
);

// Generate monthly sales report
const task = "Create Q4 2024 sales summary with top performing products and regional breakdown";
const workflow = await analystAgent.getAgenticWorkflowGraphJsonConfig(task);
const report = await analystAgent.runAgenticWorkflow(workflow);
```

### Content Marketing Agent

```javascript
const contentAgent = new SkymelAgent(
    process.env.SKYMEL_API_KEY,
    "wss://api.skymel.com/agent-creation",
    true,
    "", // Name in developerConfigurationString
    "", // Definition in developerConfigurationString  
    "", // Restrictions in developerConfigurationString
    `
    Agent Name: Content Marketing Specialist
    Purpose: Create blog posts, social media content, and email campaigns that align with brand voice
    Restrictions: All content must be reviewed before publishing. Follow brand guidelines strictly.
    Brand Voice: Professional but approachable, focus on practical solutions
    `,
    true
);

// Create specific content piece
const contentTask = "Write LinkedIn post about AI automation trends for small businesses, include call-to-action for our webinar";
const workflow = await contentAgent.getAgenticWorkflowGraphJsonConfig(contentTask);
const content = await contentAgent.runAgenticWorkflow(workflow);
```

---

## Architecture

### Multi-Model Reasoning Flow

1. **Task Input**: Natural language task description
2. **Context Analysis**: Agent definition and restrictions inform approach
3. **Workflow Planning**: Generate specialized DAG for this specific task
4. **Model Selection**: Choose appropriate reasoning components
5. **Execution**: Run workflow with real-time monitoring
6. **Recovery**: Automatic error handling and alternative approaches
7. **Feedback**: Results improve future model performance

### Execution Monitoring

Skymel continuously monitors:
- **Decision Quality**: Whether reasoning choices were effective
- **Cost Efficiency**: Token usage and API call optimization  
- **Success Rates**: Task completion and error patterns
- **Performance Trends**: Speed and accuracy over time

This monitoring data automatically retrains the specialized models for better future performance.

---

## Best Practices

### Agent Definition Tips

**Good agent definitions are:**
- Specific about capabilities and scope
- Clear about expected inputs and outputs  
- Explicit about limitations and boundaries

```javascript
// Good
"Process customer orders, validate payment information, and send confirmation emails"

// Too vague  
"Help with business tasks"
```

### Task Specification Guidelines

**Effective task descriptions:**
- Include relevant context and data
- Specify desired output format
- Mention any constraints or requirements

```javascript
// Good
"Analyze sales data from Q4 2024 CSV file, identify top 3 performing products, create executive summary"

// Too general
"Look at sales data"
```

### Error Handling

Skymel agents automatically handle most errors, but you can add additional handling:

```javascript
try {
    const result = await skymelAgent.runAgenticWorkflow(workflowConfig);
    console.log("Success:", result);
} catch (error) {
    console.error("Workflow failed after all recovery attempts:", error);
}
```

---

## Troubleshooting

### Common Issues

**Agent not responding**: Check API key and endpoint URL validity

**Workflow generation fails**: Ensure task description is clear and within agent's defined scope

**High costs**: Review agent restrictions and add cost limits

**Poor results**: Refine agent definition and provide more specific task descriptions

### Performance Optimization

- Use specific agent definitions to improve workflow generation
- Include relevant context in task descriptions
- Set appropriate restrictions to prevent scope creep
- Monitor execution results to identify improvement opportunities

---

## Support

- **Documentation**: [docs.skymel.com](https://skymel.com/docs)
- **API Reference**: [api.skymel.com](https://api.skymel.com)  
- **Community**: [github.com/skymel/community](https://github.com/skymel/community)
- **Support**: support@skymel.com

---

*Skymel ADK - Build agents that actually work in production*