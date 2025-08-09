import {CommonValidators} from "./common_validators.js";

export class CommonHashUtils {
    constructor() {
        throw new Error("Cannot instantiate this class. It has purely static methods, " +
            "please call them using class-name scope,such as `CommonValidators.isMethod(param)` etc.");
    }

    static getUuidV4() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    static generateUniqueId(idPrefix = null, idSuffix = null) {
        let uniqueId = CommonHashUtils.getUuidV4();
        uniqueId = uniqueId.replaceAll('-', '');
        if (CommonValidators.isNonEmptyString(idPrefix)) {
            uniqueId = idPrefix + uniqueId;
        }
        if (CommonValidators.isNonEmptyString(idSuffix)) {
            uniqueId = uniqueId + idSuffix;
        }
        return uniqueId;
    }
}