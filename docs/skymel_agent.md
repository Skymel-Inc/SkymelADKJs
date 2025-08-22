# Skymel JavaScript Agent Development Kit

## Quick Start Tutorial

First import the *SkymelAgent* class from `skymel_agent.js`

```javascript
import {SkymelAgent} from "/../../src/skymel_agent.js";
```

Next instantiate a *SkymelAgent* object a follows:

```javascript
const skymelAgent = new SkymelAgent(
    apiKey,
    agentCreationEndpointUrl,
    agentCreationEndpointUrlIsWebSocketUrl,
    agentNameString,
    agentDefinitionString,
    agentRestrictionsString,
    developerConfigurationString,
    isMcpEnabled
);
```

Here the various parameters are:

* apiKey - A string which grants access to Skymel backend. Please note that you should only use the *Public API Key* \
  string here, and not the (secret) base API Key.
* agentCreationEndpointUrl - The url of the WebSocket endpoint which generates the dynamic workflow.
* agentNameString - A string specifying the name of the agent. Can be left empty if `developerConfigurationString`
  includes agent's name.
* agentDefinitionString - A string that specifies the purpose of the agent in natural language. Can be left empty if
  `developerConfigurationString` includes agent purpose specification
* agentRestrictionsString - A string that specifies any restrictions the agent has to abide by in natural language. As
  above, this field can be left empty if `developerConfigurationString` specifies the restrictions.
* developerConfigurationString - A string that specifies what the agent's name is, the agent's purpose is, and what if
  any, restrictions the agent has to abide by. Those apart, any extra information, the developer wishes to inform the
  agent, may be provided here. This field may be left empty if `agentNameString`, `agentDefinitionString`,
  `agentRestrictionsString` are non-empty.
* isMcpEnabled - A boolean value which enables the agent to use MCP endpoints.

This instance of `SkymelAgent` can now be called upon to generate a dynamic workflow as follows:

```javascript
const dynamicWorkflowGraphJsonConfig = await skymelAgent.getAgenticWorkflowGraphJsonConfig(agentTaskString);
const workflowResult = await skymelAgent.runAgenticWorkflow(dynamicWorkflowGraphJsonConfig);
```
