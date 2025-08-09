import {SkymelECGraph} from "./skymel_execution_control_graph.js";
import {CommonValidators} from "./common_validators";

class SkymelECGraphRuntimeGraphSelectorAndLoader extends SkymelECGraph {

    constructor(initializationConfig) {
        super(initializationConfig);
        this.alternativeConfigurationIdToConfigJson = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationConfig, 'alternativeConfigurationIdToConfigJson', null);
        this.defaultConfugrationId = CommonValidators.getKeyValueFromDictIfKeyAbsentReturnDefault(initializationConfig, 'defaultConfugrationId', null);
        this.configurationIdToLoadedGraphs = {};
    }


    loadGraphForConfigurationId(configurationId) {
        if (CommonValidators.isNotEmptyDictAndHasKey(this.configurationIdToLoadedGraphs, configurationId)) {
            return this.configurationIdToLoadedGraphs[configurationId];
        }
    }

}